from typing import Dict, List, Tuple, Optional
from pathlib import Path
import time
import os

import numpy as np
import gurobipy as gp
from gurobipy import GRB
from dotenv import load_dotenv

from models import Guest, Table, VenueConfig, Layout, ConstraintSummary
from logger import get_logger
from constants import (
    # Phase categories (used in _partition_guests_by_phase and _solve_phase)
    PHASE_1_CATEGORIES,
    PHASE_2_CATEGORIES,
    PHASE_3_CATEGORIES,
    GROOM_FAMILY_CATEGORIES,
    BRIDE_FAMILY_CATEGORIES,
    # Optimization weights
    TABLE_ORDER_PENALTY_WEIGHT,
    CROSS_SIDE_PENALTY_WEIGHT,
    BASE_REPULSION_WEIGHT,
    # Helper functions
    is_groom_side as _is_groom_side,
    is_bride_side as _is_bride_side,
    is_family_category as _is_family_category,
    is_social_group_category as _is_social_group_category,
)

# Load environment variables from .env file
# Try project root first, then backend folder
_project_root = Path(__file__).parent.parent
_env_file = _project_root / ".env"
if _env_file.exists():
    load_dotenv(_env_file)
elif (Path(__file__).parent / ".env").exists():
    load_dotenv(Path(__file__).parent / ".env")

# Initialize logger for this module
logger = get_logger("optimizer")


def _get_gurobi_env() -> gp.Env:
    """
    Create a Gurobi environment with WLS (Web License Service) if credentials are available.
    Falls back to default local license if WLS credentials are not set.

    Accepts both formats:
    - GRB_WLSACCESSID / GRB_WLSSECRET / GRB_LICENSEID (standard Gurobi env vars)
    - WLSACCESSID / WLSSECRET / LICENSEID (from gurobi.lic file)
    """
    wls_access_id = os.getenv("GRB_WLSACCESSID") or os.getenv("WLSACCESSID")
    wls_secret = os.getenv("GRB_WLSSECRET") or os.getenv("WLSSECRET")
    wls_license_id = os.getenv("GRB_LICENSEID") or os.getenv("LICENSEID")

    if wls_access_id and wls_secret:
        logger.info("Using Gurobi WLS (Web License Service)")
        env = gp.Env(empty=True)
        env.setParam("WLSACCESSID", wls_access_id)
        env.setParam("WLSSECRET", wls_secret)
        if wls_license_id:
            env.setParam("LICENSEID", int(wls_license_id))
        env.start()
        return env
    else:
        logger.info("Using local Gurobi license (WLS credentials not found)")
        return gp.Env()


def _extract_table_number(table_id: str) -> int:
    """
    Extract the numeric part from a table ID for sorting.

    Examples:
        "Table 1" -> 1
        "Table 12" -> 12
        "T5" -> 5
        "VIP" -> 0 (fallback for non-numeric IDs)
    """
    import re
    # Find all numbers in the string and take the last one
    numbers = re.findall(r'\d+', table_id)
    if numbers:
        return int(numbers[-1])
    return 0  # Fallback for tables without numbers


def _get_category(guest: Guest) -> Optional[str]:
    """Get the category/group_id of a guest."""
    return guest.group_id


# Note: _is_family_category, _is_social_group_category, _is_groom_side, _is_bride_side
# are now imported from constants.py


def _consolidate_to_lower_tables(
    assignments: Dict[str, str],
    table_ids: List[str]
) -> Dict[str, str]:
    """
    Reassign guests so they fill the lowest-numbered tables first.
    This ensures empty tables are grouped together at the highest table numbers.

    The function preserves guest groupings - guests who were seated together
    remain seated together, just at a potentially different (lower-numbered) table.

    Args:
        assignments: Dict mapping guest_id -> table_id
        table_ids: List of all table IDs

    Returns:
        New assignments dict with guests consolidated to lower-numbered tables

    Example:
        Before: {g1: "Table 3", g2: "Table 3", g3: "Table 5"} (Tables 1,2,4 empty)
        After:  {g1: "Table 1", g2: "Table 1", g3: "Table 2"} (Tables 3,4,5 empty)
    """
    if not assignments or not table_ids:
        return assignments

    # Sort tables by number (lowest first)
    sorted_tables = sorted(table_ids, key=_extract_table_number)

    # Group guests by their current table, preserving table groupings
    table_guests: Dict[str, List[str]] = {}
    for guest_id, table_id in assignments.items():
        if table_id not in table_guests:
            table_guests[table_id] = []
        table_guests[table_id].append(guest_id)

    # Get list of occupied tables in their original order
    # Sort by table number so we maintain relative ordering
    occupied_tables = sorted(
        [t for t in sorted_tables if t in table_guests],
        key=_extract_table_number
    )

    # Reassign: move each group of guests to the next available low-numbered table
    new_assignments: Dict[str, str] = {}
    target_table_idx = 0

    for source_table in occupied_tables:
        guests_to_move = table_guests[source_table]
        target_table = sorted_tables[target_table_idx]

        for guest_id in guests_to_move:
            new_assignments[guest_id] = target_table

        target_table_idx += 1

    logger.debug(
        f"Table consolidation complete | "
        f"occupied_tables={len(occupied_tables)} empty_tables={len(table_ids) - len(occupied_tables)}"
    )

    return new_assignments


def _greedy_initial_assignment(
    guests: List[Guest],
    tables: List[Table],
    weights: Dict[str, float],
    seed: Optional[int] = None
) -> Dict[str, str]:
    """
    Generate a greedy initial assignment to warm-start Gurobi.
    Groups guests by category and assigns them to tables.

    Args:
        seed: Optional seed for diversification. When provided, shuffles guest
              ordering within categories and varies starting table index.
    """
    import random
    from collections import defaultdict

    rng = random.Random(seed) if seed is not None else None

    # Group guests by category
    category_groups: Dict[str, List[Guest]] = defaultdict(list)
    for g in guests:
        cat = g.group_id or "Uncategorized"
        category_groups[cat].append(g)

    # Sort categories by size (largest first) to fill tables efficiently
    sorted_categories = sorted(category_groups.keys(), key=lambda c: len(category_groups[c]), reverse=True)

    # Diversification: shuffle category order and guests within categories
    if rng is not None:
        rng.shuffle(sorted_categories)
        for cat in category_groups:
            rng.shuffle(category_groups[cat])
    
    # Track table occupancy
    table_occupancy: Dict[str, int] = {t.id: 0 for t in tables}
    table_capacity: Dict[str, int] = {t.id: t.capacity for t in tables}
    table_ids = [t.id for t in tables]

    assignments: Dict[str, str] = {}

    # Assign guests category by category
    # Diversification: randomize starting table index
    current_table_idx = rng.randint(0, len(table_ids) - 1) if rng and table_ids else 0
    for cat in sorted_categories:
        cat_guests = category_groups[cat]
        
        for guest in cat_guests:
            # Find a table with capacity, starting from current_table_idx
            assigned = False
            for offset in range(len(table_ids)):
                t_idx = (current_table_idx + offset) % len(table_ids)
                t_id = table_ids[t_idx]
                
                if table_occupancy[t_id] < table_capacity[t_id]:
                    assignments[guest.id] = t_id
                    table_occupancy[t_id] += 1
                    assigned = True
                    break
            
            if not assigned:
                # Fallback: assign to first table (may exceed capacity)
                assignments[guest.id] = table_ids[0]
        
        # Move to next table for next category (encourages grouping)
        if cat_guests:
            current_table_idx = (current_table_idx + 1) % len(table_ids)
    
    logger.debug(f"Greedy assignment complete | assigned={len(assignments)} guests")
    return assignments


# =============================================================================
# HIERARCHICAL OPTIMIZATION HELPER FUNCTIONS
# =============================================================================


def _partition_guests_by_phase(guests: List[Guest]) -> Dict[int, List[Guest]]:
    """
    Partition guests into 4 priority phases for hierarchical optimization.

    Phase 1: VIPs/Family (Immediate + Extended Family)
    Phase 2: Close Friends (Groom's Friends, Bride's Friends, Mutual Friends)
    Phase 3: Colleagues & Uni (Work Colleagues, Uni Friends)
    Phase 4: Remaining (all other guests)

    Args:
        guests: List of all guests to partition

    Returns:
        Dict mapping phase number (1-4) to list of guests in that phase
    """
    phases: Dict[int, List[Guest]] = {1: [], 2: [], 3: [], 4: []}

    for g in guests:
        cat = _get_category(g)
        if cat in PHASE_1_CATEGORIES:
            phases[1].append(g)
        elif cat in PHASE_2_CATEGORIES:
            phases[2].append(g)
        elif cat in PHASE_3_CATEGORIES:
            phases[3].append(g)
        else:
            phases[4].append(g)

    logger.debug(
        f"Guest partitioning | phase1={len(phases[1])} phase2={len(phases[2])} "
        f"phase3={len(phases[3])} phase4={len(phases[4])}"
    )

    return phases


def _apply_perfect_fit_heuristic(
    phase_guests: List[Guest],
    current_capacity: Dict[str, int],
    assignments: Dict[str, str]
) -> Tuple[List[Guest], Dict[str, str], Dict[str, int]]:
    """
    If a group exactly fills a table's remaining capacity, assign immediately.

    This reduces the number of binary variables for the Gurobi solver by
    pre-assigning groups that have an exact capacity match.

    Args:
        phase_guests: Guests in the current phase to consider
        current_capacity: Dict mapping table_id to remaining capacity
        assignments: Current guest assignments (will be modified)

    Returns:
        Tuple of (remaining_guests, updated_assignments, updated_capacity)
    """
    from collections import defaultdict

    # Group guests by category
    groups: Dict[str, List[Guest]] = defaultdict(list)
    for g in phase_guests:
        cat = _get_category(g) or "Uncategorized"
        groups[cat].append(g)

    remaining: List[Guest] = []
    perfect_fit_count = 0

    for cat, group_guests in groups.items():
        group_size = len(group_guests)

        # Find table with exact capacity match
        matched_table = None
        for t_id, cap in current_capacity.items():
            if cap == group_size and cap > 0:
                matched_table = t_id
                break

        if matched_table:
            # Perfect fit - assign immediately
            for g in group_guests:
                assignments[g.id] = matched_table
            current_capacity[matched_table] = 0
            perfect_fit_count += len(group_guests)
            logger.debug(f"Perfect fit: {cat} ({group_size} guests) -> {matched_table}")
        else:
            remaining.extend(group_guests)

    if perfect_fit_count > 0:
        logger.debug(f"Perfect fit heuristic | assigned={perfect_fit_count} remaining={len(remaining)}")

    return remaining, assignments, current_capacity


def _calculate_global_metrics(
    assignments: Dict[str, str],
    guests: List[Guest],
    tables: List[Table]
) -> Dict[str, float]:
    """
    Calculate family_cohesion, social_group_cohesion, and side_mixing metrics
    from final assignments.

    This reuses the same logic as the original generate_layout_for_weights()
    to ensure metric consistency.

    Args:
        assignments: Final guest assignments (guest_id -> table_id)
        guests: List of all guests
        tables: List of all tables

    Returns:
        Dict with keys: family_cohesion, social_group_cohesion, side_mixing (percentages 0-100)
    """
    # Build pairs for cohesion calculation
    family_pairs = []
    social_group_pairs = []

    for i, g1 in enumerate(guests):
        cat1 = _get_category(g1)
        if _is_family_category(cat1):
            for g2 in guests[i + 1:]:
                cat2 = _get_category(g2)
                if cat1 == cat2 and _is_family_category(cat2):
                    family_pairs.append((g1.id, g2.id))

        if _is_social_group_category(cat1):
            for g2 in guests[i + 1:]:
                cat2 = _get_category(g2)
                if cat1 == cat2 and _is_social_group_category(cat2):
                    social_group_pairs.append((g1.id, g2.id))

    # Count satisfied family pairs
    family_satisfied = sum(
        1 for g1_id, g2_id in family_pairs
        if assignments.get(g1_id) == assignments.get(g2_id)
    )

    # Count satisfied social pairs
    social_satisfied = sum(
        1 for g1_id, g2_id in social_group_pairs
        if assignments.get(g1_id) == assignments.get(g2_id)
    )

    # Calculate side mixing balance
    table_by_id = {t.id: t for t in tables}
    total_diff = 0

    # Group guests by table for mixing calculation
    guests_by_table: Dict[str, List[str]] = {}
    for g_id, t_id in assignments.items():
        if t_id not in guests_by_table:
            guests_by_table[t_id] = []
        guests_by_table[t_id].append(g_id)

    guests_by_id = {g.id: g for g in guests}

    for t_id, guest_ids in guests_by_table.items():
        groom_count = sum(
            1 for g_id in guest_ids
            if _is_groom_side(_get_category(guests_by_id.get(g_id)))
        )
        bride_count = sum(
            1 for g_id in guest_ids
            if _is_bride_side(_get_category(guests_by_id.get(g_id)))
        )
        total_diff += abs(groom_count - bride_count)

    max_possible_diff = len(guests)

    # Calculate percentages
    family_pct = (family_satisfied / len(family_pairs) * 100) if family_pairs else 100.0
    social_pct = (social_satisfied / len(social_group_pairs) * 100) if social_group_pairs else 100.0
    mixing_pct = ((max_possible_diff - total_diff) / max_possible_diff * 100) if max_possible_diff > 0 else 100.0
    mixing_pct = max(0.0, min(100.0, mixing_pct))

    return {
        "family_cohesion": family_pct,
        "social_group_cohesion": social_pct,
        "side_mixing": mixing_pct,
    }


def _solve_phase(
    phase_num: int,
    phase_guests: List[Guest],
    current_capacity: Dict[str, int],
    existing_assignments: Dict[str, str],
    weights: Dict[str, float],
    diversity_seed: Optional[int],
    seen_assignments: Optional[List[Dict[str, str]]],
    tables: List[Table]
) -> Tuple[Dict[str, str], List[str]]:
    """
    Solve MIQP for a single phase.

    Phase-specific behavior:
    - Phase 1 (Family): HARD constraint - no Groom/Bride family mixing at same table
    - Phase 2 (Friends): Heavy penalty for Groom/Bride friend mixing (Mutual exempt)
    - Phase 3 (Colleagues): Heavy penalty for cross-side mixing
    - Phase 4 (Remaining): Free mixing allowed

    Args:
        phase_num: Phase number (1-4)
        phase_guests: Guests to seat in this phase
        current_capacity: Remaining capacity per table
        existing_assignments: Assignments from previous phases
        weights: Objective weights (family_cohesion, social_group_cohesion, side_mixing)
        diversity_seed: Optional seed for Gurobi randomization
        seen_assignments: Previous solutions to avoid (solution repulsion)
        tables: All tables in the venue

    Returns:
        Tuple of (phase_assignments, hard_violations)
    """
    import random

    phase_start_time = time.time()
    hard_violations: List[str] = []

    # Filter to tables with remaining capacity
    available_tables = [t_id for t_id, cap in current_capacity.items() if cap > 0]

    if not available_tables:
        logger.warning(f"Phase {phase_num}: No tables with remaining capacity")
        return {}, [f"Phase {phase_num}: No available tables"]

    if not phase_guests:
        return {}, []

    guest_ids = [g.id for g in phase_guests]
    table_by_id = {t.id: t for t in tables}
    guests_by_id = {g.id: g for g in phase_guests}

    # Get objective weights
    family_cohesion_weight = weights.get("family_cohesion", 0.0)
    social_group_cohesion_weight = weights.get("social_group_cohesion", 0.0)
    side_mixing_weight = weights.get("side_mixing", 0.0)

    # Time limits vary by phase (earlier phases get more time)
    time_limits = {1: 10, 2: 10, 3: 8, 4: 8}
    mip_gaps = {1: 0.10, 2: 0.10, 3: 0.15, 4: 0.15}

    try:
        env = _get_gurobi_env()
        model = gp.Model(f"SeatHarmony_Phase{phase_num}", env=env)
        model.setParam('OutputFlag', 0)
        model.setParam('MIPGap', mip_gaps.get(phase_num, 0.15))
        model.setParam('MIPFocus', 1)
        model.setParam('NonConvex', 2)
        model.setParam('TimeLimit', time_limits.get(phase_num, 10))
        model.setParam('Heuristics', 0.5)

        if diversity_seed is not None:
            gurobi_seed = diversity_seed % 2000000000
            model.setParam('Seed', gurobi_seed)

        # ===========================================
        # DECISION VARIABLES
        # ===========================================

        # x[g, t]: binary - guest g assigned to table t
        x = {}
        for g_id in guest_ids:
            for t_id in available_tables:
                x[g_id, t_id] = model.addVar(vtype=GRB.BINARY, name=f"x_{g_id}_{t_id}")

        model.update()

        # ===========================================
        # HARD CONSTRAINTS
        # ===========================================

        # Each guest sits at exactly one table
        for g_id in guest_ids:
            model.addConstr(
                gp.quicksum(x[g_id, t_id] for t_id in available_tables) == 1,
                name=f"assign_{g_id}"
            )

        # Table capacity (using current remaining capacity)
        for t_id in available_tables:
            cap = current_capacity[t_id]
            model.addConstr(
                gp.quicksum(x[g_id, t_id] for g_id in guest_ids) <= cap,
                name=f"cap_{t_id}"
            )

        # ===========================================
        # PHASE 1 SPECIFIC: HARD NO-MIXING CONSTRAINT
        # ===========================================

        if phase_num == 1:
            groom_fam_ids = [g.id for g in phase_guests if _get_category(g) in GROOM_FAMILY_CATEGORIES]
            bride_fam_ids = [g.id for g in phase_guests if _get_category(g) in BRIDE_FAMILY_CATEGORIES]

            if groom_fam_ids and bride_fam_ids:
                for t_id in available_tables:
                    # Binary indicators for family presence at table
                    groom_present = model.addVar(vtype=GRB.BINARY, name=f"groom_present_{t_id}")
                    bride_present = model.addVar(vtype=GRB.BINARY, name=f"bride_present_{t_id}")

                    # Link groom_present to actual assignments
                    M_groom = len(groom_fam_ids)
                    model.addConstr(
                        gp.quicksum(x[g_id, t_id] for g_id in groom_fam_ids) <= M_groom * groom_present,
                        name=f"groom_present_upper_{t_id}"
                    )
                    model.addConstr(
                        groom_present <= gp.quicksum(x[g_id, t_id] for g_id in groom_fam_ids),
                        name=f"groom_present_lower_{t_id}"
                    )

                    # Link bride_present to actual assignments
                    M_bride = len(bride_fam_ids)
                    model.addConstr(
                        gp.quicksum(x[g_id, t_id] for g_id in bride_fam_ids) <= M_bride * bride_present,
                        name=f"bride_present_upper_{t_id}"
                    )
                    model.addConstr(
                        bride_present <= gp.quicksum(x[g_id, t_id] for g_id in bride_fam_ids),
                        name=f"bride_present_lower_{t_id}"
                    )

                    # HARD: Cannot have both families at same table
                    model.addConstr(
                        groom_present + bride_present <= 1,
                        name=f"no_family_mixing_{t_id}"
                    )

        # ===========================================
        # OBJECTIVE FUNCTION
        # ===========================================

        obj = gp.QuadExpr()

        # Family cohesion (Phase 1 and 4)
        if phase_num in [1, 4]:
            for i, g1 in enumerate(phase_guests):
                cat1 = _get_category(g1)
                if not _is_family_category(cat1):
                    continue
                for g2 in phase_guests[i + 1:]:
                    cat2 = _get_category(g2)
                    if cat1 == cat2 and _is_family_category(cat2):
                        for t_id in available_tables:
                            obj += family_cohesion_weight * x[g1.id, t_id] * x[g2.id, t_id]

        # Social group cohesion (Phases 2, 3, 4)
        if phase_num in [2, 3, 4]:
            for i, g1 in enumerate(phase_guests):
                cat1 = _get_category(g1)
                if not _is_social_group_category(cat1):
                    continue
                for g2 in phase_guests[i + 1:]:
                    cat2 = _get_category(g2)
                    if cat1 == cat2 and _is_social_group_category(cat2):
                        for t_id in available_tables:
                            obj += social_group_cohesion_weight * x[g1.id, t_id] * x[g2.id, t_id]

        # Cross-side mixing penalty (Phases 2 and 3)
        # Use the side_mixing weight from strategy - higher weight = more penalty for mixing
        if phase_num in [2, 3]:
            groom_side_ids = [g.id for g in phase_guests if _is_groom_side(_get_category(g))]
            bride_side_ids = [g.id for g in phase_guests if _is_bride_side(_get_category(g))]

            # Use strategy weight: high side_mixing = separate sides (penalize mixing)
            # Scale the penalty based on strategy weight
            cross_side_penalty = side_mixing_weight * CROSS_SIDE_PENALTY_WEIGHT / 2.0

            for t_id in available_tables:
                for gf_id in groom_side_ids:
                    for bf_id in bride_side_ids:
                        obj -= cross_side_penalty * x[gf_id, t_id] * x[bf_id, t_id]

        # Side mixing balance (Phase 4 only - encourage balanced tables)
        if phase_num == 4:
            groom_side_ids = [g.id for g in phase_guests if _is_groom_side(_get_category(g))]
            bride_side_ids = [g.id for g in phase_guests if _is_bride_side(_get_category(g))]

            if groom_side_ids or bride_side_ids:
                for t_id in available_tables:
                    cap = table_by_id[t_id].capacity
                    groom_count = model.addVar(vtype=GRB.INTEGER, lb=0, ub=cap, name=f"groom_{t_id}")
                    bride_count = model.addVar(vtype=GRB.INTEGER, lb=0, ub=cap, name=f"bride_{t_id}")
                    diff = model.addVar(vtype=GRB.INTEGER, lb=0, ub=cap, name=f"diff_{t_id}")

                    if groom_side_ids:
                        model.addConstr(
                            groom_count == gp.quicksum(x[g_id, t_id] for g_id in groom_side_ids),
                            name=f"groom_count_{t_id}"
                        )
                    else:
                        model.addConstr(groom_count == 0, name=f"groom_count_{t_id}")

                    if bride_side_ids:
                        model.addConstr(
                            bride_count == gp.quicksum(x[g_id, t_id] for g_id in bride_side_ids),
                            name=f"bride_count_{t_id}"
                        )
                    else:
                        model.addConstr(bride_count == 0, name=f"bride_count_{t_id}")

                    model.addConstr(diff >= groom_count - bride_count, name=f"diff_pos_{t_id}")
                    model.addConstr(diff >= bride_count - groom_count, name=f"diff_neg_{t_id}")

                    obj -= side_mixing_weight * diff

        # Table order preference (prefer lower-numbered tables)
        sorted_tables = sorted(available_tables, key=_extract_table_number)
        table_order = {t_id: idx for idx, t_id in enumerate(sorted_tables)}

        for t_id in available_tables:
            for g_id in guest_ids:
                obj -= TABLE_ORDER_PENALTY_WEIGHT * table_order[t_id] * x[g_id, t_id]

        # Solution repulsion (only for phases 1-2)
        if seen_assignments and phase_num <= 2:
            for sol_idx, prev_assignment in enumerate(seen_assignments):
                weight = BASE_REPULSION_WEIGHT * (1 + sol_idx * 0.2)
                for g_id, t_id in prev_assignment.items():
                    if (g_id, t_id) in x:
                        obj -= weight * x[g_id, t_id]

        model.setObjective(obj, GRB.MAXIMIZE)

        # ===========================================
        # WARM START
        # ===========================================

        # Simple greedy warm start within available capacity
        warm_start: Dict[str, str] = {}
        temp_capacity = current_capacity.copy()
        rng = random.Random(diversity_seed) if diversity_seed else None

        shuffled_tables = available_tables.copy()
        if rng:
            rng.shuffle(shuffled_tables)

        table_idx = 0
        for g in phase_guests:
            for offset in range(len(shuffled_tables)):
                t_idx = (table_idx + offset) % len(shuffled_tables)
                t_id = shuffled_tables[t_idx]
                if temp_capacity[t_id] > 0:
                    warm_start[g.id] = t_id
                    temp_capacity[t_id] -= 1
                    break
            table_idx = (table_idx + 1) % len(shuffled_tables)

        for g_id, t_id in warm_start.items():
            if (g_id, t_id) in x:
                x[g_id, t_id].Start = 1.0

        # ===========================================
        # OPTIMIZE
        # ===========================================

        model.optimize()

        status_map = {
            GRB.OPTIMAL: "OPTIMAL",
            GRB.INFEASIBLE: "INFEASIBLE",
            GRB.TIME_LIMIT: "TIME_LIMIT",
            GRB.SUBOPTIMAL: "SUBOPTIMAL",
        }
        status_str = status_map.get(model.Status, f"STATUS_{model.Status}")

        if model.SolCount == 0:
            logger.warning(f"Phase {phase_num}: No solution found | status={status_str}")
            if phase_num == 1:
                hard_violations.append(f"Phase 1: Family separation constraint may be infeasible")
            # Return warm start as fallback
            return warm_start, hard_violations

        # ===========================================
        # EXTRACT SOLUTION
        # ===========================================

        phase_assignments: Dict[str, str] = {}
        for g_id in guest_ids:
            for t_id in available_tables:
                if x[g_id, t_id].x > 0.5:
                    phase_assignments[g_id] = t_id
                    break

        phase_duration_ms = (time.time() - phase_start_time) * 1000
        logger.info(
            f"Phase {phase_num} complete | status={status_str} | "
            f"assigned={len(phase_assignments)} | {phase_duration_ms:.0f}ms"
        )

        return phase_assignments, hard_violations

    except Exception as e:
        phase_duration_ms = (time.time() - phase_start_time) * 1000
        logger.error(f"Phase {phase_num} failed | error={type(e).__name__}: {e} | {phase_duration_ms:.0f}ms")
        import traceback
        logger.error(traceback.format_exc())
        hard_violations.append(f"Phase {phase_num}: Optimization error - {e}")
        return {}, hard_violations


def generate_hierarchical_layout(
    guests: List[Guest], venue: VenueConfig, weights: Dict[str, float],
    diversity_seed: Optional[int] = None,
    seen_assignments: Optional[List[Dict[str, str]]] = None
) -> Tuple[Layout, ConstraintSummary]:
    """
    Hierarchical seating optimization with 4 priority phases.

    This is a drop-in replacement for generate_layout_for_weights() that breaks
    the monolithic MIQP into 4 sequential phases based on guest priority:

    Phase 1: VIPs/Family - HARD constraint: no Groom/Bride family mixing
    Phase 2: Close Friends - Heavy penalty for cross-side mixing (Mutual exempt)
    Phase 3: Colleagues & Uni - Heavy penalty for cross-side mixing
    Phase 4: Remaining - Free mixing allowed to fill seats

    Benefits:
    - Reduces complexity from O(2^(N*T)) to sum of O(2^(n_k*T))
    - Solving 4 small MIQPs is exponentially faster than 1 large MIQP
    - Ensures VIPs get optimal placement before general guests

    Args:
        guests: List of all guests to seat
        venue: Venue configuration with tables
        weights: Objective weights (family_cohesion, social_group_cohesion, side_mixing)
        diversity_seed: Optional seed for Gurobi randomization
        seen_assignments: Previous solutions to avoid (solution repulsion)

    Returns:
        Tuple of (Layout, ConstraintSummary) - same format as generate_layout_for_weights()
    """
    opt_start_time = time.time()
    logger.info(
        f"Hierarchical optimizer starting | guests={len(guests)} tables={len(venue.tables)}"
    )
    logger.debug(
        f"Weights: family={weights.get('family_cohesion', 0):.2f} "
        f"social={weights.get('social_group_cohesion', 0):.2f} "
        f"mixing={weights.get('side_mixing', 0):.2f}"
    )

    # Edge case handling
    if not guests or not venue.tables:
        logger.error("Empty guests or tables - cannot generate layout")
        raise ValueError("Cannot generate layout: guests and tables are required")

    tables = venue.tables
    table_ids = [t.id for t in tables]

    # Initialize state
    final_assignments: Dict[str, str] = {}
    current_capacity = {t.id: t.capacity for t in tables}
    all_hard_violations: List[str] = []

    # Partition guests by phase
    phase_guests = _partition_guests_by_phase(guests)

    # Process phases 1-4
    for phase_num in [1, 2, 3, 4]:
        # Get unassigned guests for this phase
        guests_this_phase = [
            g for g in phase_guests[phase_num]
            if g.id not in final_assignments
        ]

        if not guests_this_phase:
            logger.debug(f"Phase {phase_num}: No guests, skipping")
            continue

        logger.info(f"Phase {phase_num} starting | guests={len(guests_this_phase)}")

        # Step 1: Apply perfect fit heuristic
        remaining, final_assignments, current_capacity = _apply_perfect_fit_heuristic(
            guests_this_phase, current_capacity, final_assignments
        )

        # Step 2: Solve MIQP for remaining guests
        if remaining:
            phase_assignments, phase_violations = _solve_phase(
                phase_num=phase_num,
                phase_guests=remaining,
                current_capacity=current_capacity,
                existing_assignments=final_assignments,
                weights=weights,
                diversity_seed=diversity_seed,
                seen_assignments=seen_assignments if phase_num <= 2 else None,
                tables=tables
            )

            # Update assignments and capacities
            for g_id, t_id in phase_assignments.items():
                final_assignments[g_id] = t_id
                current_capacity[t_id] -= 1

            all_hard_violations.extend(phase_violations)

    # Verify all guests assigned
    unassigned = [g.id for g in guests if g.id not in final_assignments]
    if unassigned:
        logger.warning(f"Unassigned guests: {len(unassigned)}")
        # Assign to any table with capacity as fallback
        for g_id in unassigned:
            for t_id, cap in current_capacity.items():
                if cap > 0:
                    final_assignments[g_id] = t_id
                    current_capacity[t_id] -= 1
                    break
            else:
                # No capacity left - assign to first table anyway
                final_assignments[g_id] = table_ids[0]
                all_hard_violations.append(f"Guest {g_id} assigned to over-capacity table")

    # Consolidate to lower tables
    final_assignments = _consolidate_to_lower_tables(final_assignments, table_ids)

    # Calculate final metrics
    metrics = _calculate_global_metrics(final_assignments, guests, tables)

    # Calculate normalized score
    total_weight = (
        weights.get("family_cohesion", 0) +
        weights.get("social_group_cohesion", 0) +
        weights.get("side_mixing", 0)
    )
    if total_weight > 0:
        normalized_score = (
            weights.get("family_cohesion", 0) * metrics["family_cohesion"] +
            weights.get("social_group_cohesion", 0) * metrics["social_group_cohesion"] +
            weights.get("side_mixing", 0) * metrics["side_mixing"]
        ) / total_weight
    else:
        normalized_score = sum(metrics.values()) / 3.0

    opt_duration_ms = (time.time() - opt_start_time) * 1000
    logger.info(
        f"Hierarchical optimization complete | score={normalized_score:.2f} | "
        f"family={metrics['family_cohesion']:.0f}% "
        f"social={metrics['social_group_cohesion']:.0f}% "
        f"mixing={metrics['side_mixing']:.0f}% | {opt_duration_ms:.0f}ms"
    )

    # Build result
    summary = ConstraintSummary(
        satisfied_soft={},
        violated_soft={},
        hard_violations=all_hard_violations,
    )

    layout = Layout(
        id="hierarchical",
        assignments=final_assignments,
        score=normalized_score,
        objective_breakdown=metrics,
        variant_label=None,
        variant_id=None,
        summary=summary,
    )

    return layout, summary


def generate_layout_for_weights(
    guests: List[Guest], venue: VenueConfig, weights: Dict[str, float],
    diversity_seed: Optional[int] = None,
    seen_assignments: Optional[List[Dict[str, str]]] = None
) -> Tuple[Layout, ConstraintSummary]:
    """
    Generate a single layout for a given set of objective weights.

    Uses Gurobi MIQP solver with optimized formulation:
    - Table-level balance for side mixing (O(T) instead of O(N²))
    - Quadratic expressions for cohesion (native MIQP)
    - Symmetry breaking to speed up search

    Args:
        diversity_seed: Optional seed for diversification. When provided, affects:
            - Gurobi's internal random seed (explores different MIP tree paths)
            - Warm start guest ordering (different initial solution)
            - Symmetry breaking constraint (fixes different guest-table pair)
        seen_assignments: List of previously found assignments to avoid (solution repulsion).
            Each assignment is a dict mapping guest_id -> table_id.
    """
    opt_start_time = time.time()
    logger.debug(f"Optimizer starting | guests={len(guests)} tables={len(venue.tables)}")
    logger.debug(f"Weights: family={weights.get('family_cohesion', 0):.2f} social={weights.get('social_group_cohesion', 0):.2f} mixing={weights.get('side_mixing', 0):.2f}")

    if not guests or not venue.tables:
        logger.error("Empty guests or tables - cannot generate layout")
        raise ValueError("Cannot generate layout: guests and tables are required")

    tables: List[Table] = venue.tables
    guest_ids = [g.id for g in guests]
    table_ids = [t.id for t in tables]
    n_guests = len(guest_ids)
    n_tables = len(table_ids)

    # Index mappings
    guests_by_id = {g.id: g for g in guests}
    table_by_id = {t.id: t for t in tables}

    # Get objective weights
    family_cohesion_weight = weights.get("family_cohesion", 0.0)
    social_group_cohesion_weight = weights.get("social_group_cohesion", 0.0)
    side_mixing_weight = weights.get("side_mixing", 0.0)

    # Identify guest groups for side mixing (table-level balance)
    groom_side_guests = [g.id for g in guests if _is_groom_side(_get_category(g))]
    bride_side_guests = [g.id for g in guests if _is_bride_side(_get_category(g))]
    
    # Identify pairs for cohesion (MIQP - quadratic terms)
    # Family cohesion pairs: guests from same family category
    family_pairs = []
    for i, g1 in enumerate(guests):
        cat1 = _get_category(g1)
        if not _is_family_category(cat1):
            continue
        for g2 in guests[i + 1:]:
            cat2 = _get_category(g2)
            if cat1 == cat2 and _is_family_category(cat2):
                family_pairs.append((g1.id, g2.id))

    # Social group cohesion pairs: same social group category
    social_group_pairs = []
    for i, g1 in enumerate(guests):
        cat1 = _get_category(g1)
        if not _is_social_group_category(cat1):
            continue
        for g2 in guests[i + 1:]:
            cat2 = _get_category(g2)
            if cat1 == cat2 and _is_social_group_category(cat2):
                social_group_pairs.append((g1.id, g2.id))

    logger.debug(f"Problem setup | groom_side={len(groom_side_guests)} bride_side={len(bride_side_guests)} family_pairs={len(family_pairs)} social_pairs={len(social_group_pairs)}")

    # Create Gurobi model with WLS environment if available
    try:
        model_start_time = time.time()
        logger.debug("Creating Gurobi MIQP model...")

        env = _get_gurobi_env()
        model = gp.Model("SeatHarmony", env=env)
        model.setParam('OutputFlag', 0)  # Suppress Gurobi output
        model.setParam('MIPGap', 0.15)  # Accept solutions within 15% of optimal (faster termination)
        model.setParam('MIPFocus', 1)    # Focus on finding good feasible solutions quickly
        model.setParam('NonConvex', 2)   # Allow non-convex quadratic (needed for x*x products)
        model.setParam('TimeLimit', 20)  # 20 seconds timeout (was 60s - still finds good solutions)
        model.setParam('Heuristics', 0.5)  # Spend more time on heuristics for faster feasible solutions

        # Diversification: Use different random seeds to explore different MIP tree paths
        if diversity_seed is not None:
            # Gurobi seed must be in [0, 2000000000]
            gurobi_seed = diversity_seed % 2000000000
            model.setParam('Seed', gurobi_seed)
            logger.debug(f"Diversification seed set | gurobi_seed={gurobi_seed}")
        
        # ===========================================
        # DECISION VARIABLES
        # ===========================================
        
        # x[g, t]: binary - guest g assigned to table t
        x = {}
        for g_id in guest_ids:
            for t_id in table_ids:
                x[g_id, t_id] = model.addVar(vtype=GRB.BINARY, name=f"x_{g_id}_{t_id}")
        
        # Table-level counting variables for side mixing
        # groom_count[t]: number of groom-side guests at table t
        groom_count = {}
        for t_id in table_ids:
            cap = table_by_id[t_id].capacity
            groom_count[t_id] = model.addVar(vtype=GRB.INTEGER, lb=0, ub=cap, name=f"groom_{t_id}")
        
        # bride_count[t]: number of bride-side guests at table t
        bride_count = {}
        for t_id in table_ids:
            cap = table_by_id[t_id].capacity
            bride_count[t_id] = model.addVar(vtype=GRB.INTEGER, lb=0, ub=cap, name=f"bride_{t_id}")
        
        # diff[t]: absolute difference |groom_count - bride_count| at table t
        diff = {}
        for t_id in table_ids:
            cap = table_by_id[t_id].capacity
            diff[t_id] = model.addVar(vtype=GRB.INTEGER, lb=0, ub=cap, name=f"diff_{t_id}")
        
        model.update()
        
        # ===========================================
        # HARD CONSTRAINTS
        # ===========================================
        
        # Constraint 1: Each guest sits at exactly one table
        for g_id in guest_ids:
            model.addConstr(
                gp.quicksum(x[g_id, t_id] for t_id in table_ids) == 1,
                name=f"assign_{g_id}"
            )
        
        # Constraint 2: Table capacity
        for t_id in table_ids:
            cap = table_by_id[t_id].capacity
            model.addConstr(
                gp.quicksum(x[g_id, t_id] for g_id in guest_ids) <= cap,
                name=f"cap_{t_id}"
            )
        
        # Constraint 3: Symmetry breaking - fix one guest to one table
        # This prevents the solver from exploring equivalent solutions
        # Diversification: use different guest-table pairs based on seed
        if guest_ids and table_ids:
            if diversity_seed is not None:
                import random
                sym_rng = random.Random(diversity_seed)
                fix_guest_idx = sym_rng.randint(0, len(guest_ids) - 1)
                fix_table_idx = sym_rng.randint(0, len(table_ids) - 1)
                fix_guest = guest_ids[fix_guest_idx]
                fix_table = table_ids[fix_table_idx]
                logger.debug(f"Symmetry breaking: guest[{fix_guest_idx}]={fix_guest} -> table[{fix_table_idx}]={fix_table}")
            else:
                fix_guest = guest_ids[0]
                fix_table = table_ids[0]
            model.addConstr(x[fix_guest, fix_table] == 1, name="symmetry_break")
        
        # ===========================================
        # TABLE-LEVEL BALANCE CONSTRAINTS (for mixing)
        # ===========================================
        
        # groom_count[t] = sum of x[g,t] for groom-side guests
        for t_id in table_ids:
            if groom_side_guests:
                model.addConstr(
                    groom_count[t_id] == gp.quicksum(x[g_id, t_id] for g_id in groom_side_guests),
                    name=f"groom_count_{t_id}"
                )
            else:
                model.addConstr(groom_count[t_id] == 0, name=f"groom_count_{t_id}")
        
        # bride_count[t] = sum of x[g,t] for bride-side guests
        for t_id in table_ids:
            if bride_side_guests:
                model.addConstr(
                    bride_count[t_id] == gp.quicksum(x[g_id, t_id] for g_id in bride_side_guests),
                    name=f"bride_count_{t_id}"
                )
            else:
                model.addConstr(bride_count[t_id] == 0, name=f"bride_count_{t_id}")
        
        # Linearize absolute value: diff[t] >= |groom_count[t] - bride_count[t]|
        for t_id in table_ids:
            model.addConstr(
                diff[t_id] >= groom_count[t_id] - bride_count[t_id],
                name=f"diff_pos_{t_id}"
            )
            model.addConstr(
                diff[t_id] >= bride_count[t_id] - groom_count[t_id],
                name=f"diff_neg_{t_id}"
            )
        
        # ===========================================
        # OBJECTIVE FUNCTION (MIQP)
        # ===========================================
        
        # Use QuadExpr for cohesion terms (x[g1,t] * x[g2,t])
        obj = gp.QuadExpr()
        
        # Family cohesion: reward pairs seated together (quadratic)
        # For each family pair, add weight * sum_t(x[g1,t] * x[g2,t])
        for g1_id, g2_id in family_pairs:
            for t_id in table_ids:
                obj += family_cohesion_weight * x[g1_id, t_id] * x[g2_id, t_id]
        
        # Social group cohesion: reward pairs seated together (quadratic)
        for g1_id, g2_id in social_group_pairs:
            for t_id in table_ids:
                obj += social_group_cohesion_weight * x[g1_id, t_id] * x[g2_id, t_id]
        
        # Side mixing: MINIMIZE imbalance (subtract penalty for diff)
        # Higher diff = worse mixing, so we penalize it
        # Scale by number of tables to normalize
        if n_tables > 0:
            for t_id in table_ids:
                obj -= side_mixing_weight * diff[t_id]

        # ===========================================
        # SOFT CONSTRAINT: Prefer lower-numbered tables
        # ===========================================
        # This encourages the optimizer to fill lower-numbered tables first,
        # which helps keep empty tables grouped at the highest numbers.
        # The weight is small (0.01) so it acts as a tiebreaker without
        # overriding the main cohesion/mixing objectives.

        # Create table order mapping (Table 1 -> 0, Table 2 -> 1, etc.)
        sorted_table_ids = sorted(table_ids, key=_extract_table_number)
        table_order = {t_id: idx for idx, t_id in enumerate(sorted_table_ids)}

        # Penalty for using higher-numbered tables
        # For each guest assigned to a table, add a small penalty based on table order
        table_usage_penalty = gp.quicksum(
            table_order[t_id] * x[g_id, t_id]
            for t_id in table_ids
            for g_id in guest_ids
        )

        # Subtract penalty from objective (we want to maximize, so penalty reduces score)
        obj -= TABLE_ORDER_PENALTY_WEIGHT * table_usage_penalty

        # ===========================================
        # SOLUTION REPULSION: Penalize previously seen assignments
        # ===========================================
        # For each previously seen solution, add a penalty proportional to
        # how many guest-table assignments match. This pushes the solver
        # toward unexplored regions of the solution space.
        # Base weight of 1.0 means matching 80/100 guests costs 80 points penalty
        # Weight increases with each seen solution to create stronger divergence
        # Note: BASE_REPULSION_WEIGHT is imported from constants.py
        if seen_assignments:
            for sol_idx, prev_assignment in enumerate(seen_assignments):
                # Increase penalty for more recent solutions to avoid cycling
                weight = BASE_REPULSION_WEIGHT * (1 + sol_idx * 0.2)
                for g_id, t_id in prev_assignment.items():
                    if (g_id, t_id) in x:
                        obj -= weight * x[g_id, t_id]
            logger.debug(f"Solution repulsion added | seen_solutions={len(seen_assignments)} base_weight={BASE_REPULSION_WEIGHT}")

        model.setObjective(obj, GRB.MAXIMIZE)
        
        # Count variables for logging
        n_vars = len(x) + len(groom_count) + len(bride_count) + len(diff)
        model_setup_ms = (time.time() - model_start_time) * 1000
        logger.debug(f"Model setup complete | variables={n_vars} (was ~{len(guest_ids)**2} with old approach) | {model_setup_ms:.0f}ms")

        # ===========================================
        # WARM START
        # ===========================================
        
        greedy_start_time = time.time()
        initial_assignment = _greedy_initial_assignment(guests, tables, weights, seed=diversity_seed)
        
        for g_id, t_id in initial_assignment.items():
            if (g_id, t_id) in x:
                x[g_id, t_id].Start = 1.0
        
        greedy_duration_ms = (time.time() - greedy_start_time) * 1000
        logger.debug(f"Warm start set | {greedy_duration_ms:.0f}ms")
        
        # ===========================================
        # OPTIMIZE
        # ===========================================
        
        logger.debug("Starting Gurobi optimization...")
        solve_start_time = time.time()
        model.optimize()
        solve_duration_ms = (time.time() - solve_start_time) * 1000

        # Map Gurobi status codes to human-readable strings
        status_map = {
            GRB.OPTIMAL: "OPTIMAL",
            GRB.INFEASIBLE: "INFEASIBLE",
            GRB.INF_OR_UNBD: "INF_OR_UNBD",
            GRB.UNBOUNDED: "UNBOUNDED",
            GRB.CUTOFF: "CUTOFF",
            GRB.ITERATION_LIMIT: "ITERATION_LIMIT",
            GRB.NODE_LIMIT: "NODE_LIMIT",
            GRB.TIME_LIMIT: "TIME_LIMIT",
            GRB.SOLUTION_LIMIT: "SOLUTION_LIMIT",
            GRB.INTERRUPTED: "INTERRUPTED",
            GRB.SUBOPTIMAL: "SUBOPTIMAL",
        }
        status_str = status_map.get(model.Status, f"STATUS_{model.Status}")
        logger.debug(f"Gurobi finished | status={status_str} solutions={model.SolCount} | {solve_duration_ms:.0f}ms")

        if model.SolCount == 0:
            logger.error(f"No solution found | status={status_str}")
            raise RuntimeError(f"Gurobi optimization failed: no solution found (status={status_str})")
        
        # ===========================================
        # EXTRACT SOLUTION
        # ===========================================

        assignments: Dict[str, str] = {}
        for g_id in guest_ids:
            for t_id in table_ids:
                if x[g_id, t_id].x > 0.5:
                    assignments[g_id] = t_id
                    break

        # ===========================================
        # CONSOLIDATE EMPTY TABLES
        # ===========================================
        # Move guests to lower-numbered tables so empty tables
        # are grouped together at the highest table numbers.
        # This preserves guest groupings (who sits with whom).
        assignments = _consolidate_to_lower_tables(assignments, table_ids)

        # ===========================================
        # CALCULATE METRICS
        # ===========================================
        
        # Count satisfied family pairs (both at same table)
        family_satisfied = 0
        for g1_id, g2_id in family_pairs:
            if assignments.get(g1_id) == assignments.get(g2_id):
                family_satisfied += 1
        
        # Count satisfied social pairs
        social_satisfied = 0
        for g1_id, g2_id in social_group_pairs:
            if assignments.get(g1_id) == assignments.get(g2_id):
                social_satisfied += 1
        
        # Calculate mixing balance (how well balanced are the tables)
        total_diff = sum(diff[t_id].x for t_id in table_ids)
        max_possible_diff = n_guests  # Worst case: all groom on one side
        
        # Calculate percentages
        family_pct = (family_satisfied / len(family_pairs) * 100) if family_pairs else 100.0
        social_pct = (social_satisfied / len(social_group_pairs) * 100) if social_group_pairs else 100.0
        # Mixing: 100% = perfect balance (diff=0), 0% = completely segregated
        mixing_pct = ((max_possible_diff - total_diff) / max_possible_diff * 100) if max_possible_diff > 0 else 100.0
        mixing_pct = max(0.0, min(100.0, mixing_pct))  # Clamp to [0, 100]
        
        # Calculate normalized score (0-100)
        # Weighted average of the three objectives
        total_weight = family_cohesion_weight + social_group_cohesion_weight + side_mixing_weight
        if total_weight > 0:
            normalized_score = (
                family_cohesion_weight * family_pct +
                social_group_cohesion_weight * social_pct +
                side_mixing_weight * mixing_pct
            ) / total_weight
        else:
            normalized_score = (family_pct + social_pct + mixing_pct) / 3.0
        
        opt_duration_ms = (time.time() - opt_start_time) * 1000
        logger.info(f"Optimization complete | score={normalized_score:.2f} | family={family_pct:.0f}% social={social_pct:.0f}% mixing={mixing_pct:.0f}% | {opt_duration_ms:.0f}ms")

    except Exception as e:
        opt_duration_ms = (time.time() - opt_start_time) * 1000
        logger.error(f"Optimization failed | error={type(e).__name__}: {e} | {opt_duration_ms:.0f}ms")
        import traceback
        logger.error(traceback.format_exc())
        raise RuntimeError(f"Gurobi optimization failed: {type(e).__name__}: {e}")

    summary = ConstraintSummary(
        satisfied_soft={},
        violated_soft={},
        hard_violations=[],
    )

    layout = Layout(
        id="opt",
        assignments=assignments,
        score=normalized_score,
        objective_breakdown={
            "family_cohesion": family_pct,
            "social_group_cohesion": social_pct,
            "side_mixing": mixing_pct,
        },
        variant_label=None,
        variant_id=None,
        summary=summary,
    )

    return layout, summary
