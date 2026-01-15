from typing import Dict, List, Tuple, Optional
import time

import numpy as np
import gurobipy as gp
from gurobipy import GRB

from .models import Guest, Table, VenueConfig, Layout, ConstraintSummary
from .logger import get_logger

# Initialize logger for this module
logger = get_logger("optimizer")

# Category definitions for wedding seating optimization
IMMEDIATE_FAMILY_CATEGORIES = {"Groom's Family", "Bride's Family"}
EXTENDED_FAMILY_CATEGORIES = {"Groom's Extended Family", "Bride's Extended Family"}
FAMILY_CATEGORIES = IMMEDIATE_FAMILY_CATEGORIES | EXTENDED_FAMILY_CATEGORIES | {"Family Friends"}

FRIENDS_CATEGORIES = {"Groom's Friends", "Bride's Friends", "Mutual Friends", "Family Friends"}
PROFESSIONAL_CATEGORIES = {"Groom's Work Colleagues", "Bride's Work Colleagues"}
UNIVERSITY_CATEGORIES = {"Groom's Uni Friends", "Bride's Uni Friends"}
SOCIAL_GROUP_CATEGORIES = FRIENDS_CATEGORIES | PROFESSIONAL_CATEGORIES | UNIVERSITY_CATEGORIES

GROOM_SIDE_CATEGORIES = {
    "Groom's Family", "Groom's Extended Family", "Groom's Side",
    "Groom's Work Colleagues", "Groom's Uni Friends", "Groom's Friends"
}

BRIDE_SIDE_CATEGORIES = {
    "Bride's Family", "Bride's Extended Family", "Bride's Side",
    "Bride's Work Colleagues", "Bride's Uni Friends", "Bride's Friends"
}

NEUTRAL_CATEGORIES = {"Mutual Friends", "Family Friends"}


def _get_category(guest: Guest) -> Optional[str]:
    """Get the category/group_id of a guest."""
    return guest.group_id


def _is_family_category(category: Optional[str]) -> bool:
    """Check if category is a family category."""
    return category in FAMILY_CATEGORIES if category else False


def _is_social_group_category(category: Optional[str]) -> bool:
    """Check if category is a social group category (friends, work, uni)."""
    return category in SOCIAL_GROUP_CATEGORIES if category else False


def _is_groom_side(category: Optional[str]) -> bool:
    """Check if category belongs to groom's side."""
    return category in GROOM_SIDE_CATEGORIES if category else False


def _is_bride_side(category: Optional[str]) -> bool:
    """Check if category belongs to bride's side."""
    return category in BRIDE_SIDE_CATEGORIES if category else False


def _greedy_initial_assignment(
    guests: List[Guest],
    tables: List[Table],
    weights: Dict[str, float]
) -> Dict[str, str]:
    """
    Generate a greedy initial assignment to warm-start Gurobi.
    Groups guests by category and assigns them to tables.
    """
    from collections import defaultdict
    
    # Group guests by category
    category_groups: Dict[str, List[Guest]] = defaultdict(list)
    for g in guests:
        cat = g.group_id or "Uncategorized"
        category_groups[cat].append(g)
    
    # Sort categories by size (largest first) to fill tables efficiently
    sorted_categories = sorted(category_groups.keys(), key=lambda c: len(category_groups[c]), reverse=True)
    
    # Track table occupancy
    table_occupancy: Dict[str, int] = {t.id: 0 for t in tables}
    table_capacity: Dict[str, int] = {t.id: t.capacity for t in tables}
    table_ids = [t.id for t in tables]
    
    assignments: Dict[str, str] = {}
    
    # Assign guests category by category
    current_table_idx = 0
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


def _dummy_layout(guests: List[Guest], venue: VenueConfig) -> Tuple[Layout, ConstraintSummary]:
    """
    Fallback layout generator when optimization fails.
    Seats guests round-robin across tables without considering constraints.
    """
    logger.warning(f"Using dummy layout fallback | guests={len(guests)} tables={len(venue.tables)}")

    assignments: Dict[str, str] = {}
    table_ids = [t.id for t in venue.tables] or ["default"]
    for i, g in enumerate(guests):
        assignments[g.id] = table_ids[i % len(table_ids)]

    summary = ConstraintSummary(
        satisfied_soft={},
        violated_soft={},
        hard_violations=[],
    )
    layout = Layout(
        id="dummy",
        assignments=assignments,
        score=0.0,
        objective_breakdown={},
        variant_label=None,
        variant_id=None,
        summary=summary,
    )

    logger.debug(f"Dummy layout created | score=0.0")
    return layout, summary


def generate_layout_for_weights(
    guests: List[Guest], venue: VenueConfig, weights: Dict[str, float]
) -> Tuple[Layout, ConstraintSummary]:
    """
    Generate a single layout for a given set of objective weights.
    
    Uses Gurobi MIQP solver with optimized formulation:
    - Table-level balance for side mixing (O(T) instead of O(N²))
    - Quadratic expressions for cohesion (native MIQP)
    - Symmetry breaking to speed up search
    """
    opt_start_time = time.time()
    logger.debug(f"Optimizer starting | guests={len(guests)} tables={len(venue.tables)}")
    logger.debug(f"Weights: family={weights.get('family_cohesion', 0):.2f} social={weights.get('social_group_cohesion', 0):.2f} mixing={weights.get('side_mixing', 0):.2f}")

    if not guests or not venue.tables:
        logger.warning("Empty guests or tables - returning dummy layout")
        return _dummy_layout(guests, venue)

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

    # Create Gurobi model
    try:
        model_start_time = time.time()
        logger.debug("Creating Gurobi MIQP model...")

        model = gp.Model("SeatHarmony")
        model.setParam('OutputFlag', 0)  # Suppress Gurobi output
        model.setParam('MIPGap', 0.4)   # Accept solutions within 5% of optimal
        model.setParam('MIPFocus', 1)    # Focus on finding good feasible solutions quickly
        model.setParam('NonConvex', 2)   # Allow non-convex quadratic (needed for x*x products)
        model.setParam('TimeLimit', 60)  # 60 seconds timeout
        
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
        
        # Constraint 3: Symmetry breaking - fix first guest to first table
        # This prevents the solver from exploring equivalent solutions
        if guest_ids and table_ids:
            model.addConstr(x[guest_ids[0], table_ids[0]] == 1, name="symmetry_break")
        
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
        
        model.setObjective(obj, GRB.MAXIMIZE)
        
        # Count variables for logging
        n_vars = len(x) + len(groom_count) + len(bride_count) + len(diff)
        model_setup_ms = (time.time() - model_start_time) * 1000
        logger.debug(f"Model setup complete | variables={n_vars} (was ~{len(guest_ids)**2} with old approach) | {model_setup_ms:.0f}ms")

        # ===========================================
        # WARM START
        # ===========================================
        
        greedy_start_time = time.time()
        initial_assignment = _greedy_initial_assignment(guests, tables, weights)
        
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
            logger.warning(f"No solution found | status={status_str}")
            return _dummy_layout(guests, venue)
        
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
        return _dummy_layout(guests, venue)

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
