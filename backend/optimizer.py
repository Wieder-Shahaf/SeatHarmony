from typing import Dict, List, Tuple, Optional

import numpy as np
import gurobipy as gp
from gurobipy import GRB

from .models import Guest, Table, VenueConfig, Layout, ConstraintSummary

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

# Relationship closeness hierarchy (higher = closer to couple, better seating priority)
CLOSENESS_RANK: Dict[str, int] = {
    "Groom's Family": 5,
    "Bride's Family": 5,
    "Groom's Extended Family": 4,
    "Bride's Extended Family": 4,
    "Family Friends": 4,
    "Groom's Friends": 3,
    "Bride's Friends": 3,
    "Mutual Friends": 3,
    "Groom's Uni Friends": 2,
    "Bride's Uni Friends": 2,
    "Groom's Work Colleagues": 2,
    "Bride's Work Colleagues": 2,
    "Groom's Side": 1,
    "Bride's Side": 1,
}


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


def _get_closeness_rank(category: Optional[str]) -> int:
    """Get the closeness rank for a category (higher = closer to couple)."""
    return CLOSENESS_RANK.get(category, 0) if category else 0


def _dummy_layout(guests: List[Guest], venue: VenueConfig) -> Tuple[Layout, ConstraintSummary]:
    """
    Fallback layout generator when optimization fails.
    Seats guests round-robin across tables without considering constraints.
    """
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
    return layout, summary


def generate_layout_for_weights(
    guests: List[Guest], venue: VenueConfig, weights: Dict[str, float]
) -> Tuple[Layout, ConstraintSummary]:
    """
    Generate a single layout for a given set of objective weights.
    Uses Gurobi MILP solver for optimization.
    """
    if not guests or not venue.tables:
        return _dummy_layout(guests, venue)

    tables: List[Table] = venue.tables
    guest_ids = [g.id for g in guests]
    table_ids = [t.id for t in tables]
    n_guests = len(guest_ids)
    n_tables = len(table_ids)

    # Index mappings
    guest_idx = {g: i for i, g in enumerate(guest_ids)}
    table_idx = {t: i for i, t in enumerate(table_ids)}
    guests_by_id = {g.id: g for g in guests}
    table_by_id = {t.id: t for t in tables}

    # Get new wedding-specific hyperparameters
    family_cohesion_weight = weights.get("family_cohesion", 0.0)
    social_group_cohesion_weight = weights.get("social_group_cohesion", 0.0)
    side_mixing_weight = weights.get("side_mixing", 0.0)
    relationship_priority_weight = weights.get("relationship_priority", 0.0)

    # Identify pairs for linearization based on categories
    # Family cohesion pairs: guests from family categories at same table
    family_pairs = []
    for i, g1 in enumerate(guests):
        cat1 = _get_category(g1)
        if not _is_family_category(cat1):
            continue
        for g2 in guests[i + 1:]:
            cat2 = _get_category(g2)
            if cat1 == cat2 and _is_family_category(cat2):
                # Same family category (e.g., both "Groom's Family")
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
                # Same social group (e.g., both "Groom's Work Colleagues")
                social_group_pairs.append((g1.id, g2.id))

    # Side mixing pairs: guests from different sides (groom vs bride) at same table
    # This encourages mixing but we'll penalize separation, so we track cross-side pairs
    cross_side_pairs = []
    for i, g1 in enumerate(guests):
        cat1 = _get_category(g1)
        if cat1 in NEUTRAL_CATEGORIES:
            continue  # Neutral categories can mix with anyone
        for g2 in guests[i + 1:]:
            cat2 = _get_category(g2)
            if cat2 in NEUTRAL_CATEGORIES:
                continue
            # One from groom's side, one from bride's side
            if (_is_groom_side(cat1) and _is_bride_side(cat2)) or \
               (_is_bride_side(cat1) and _is_groom_side(cat2)):
                cross_side_pairs.append((g1.id, g2.id))

    # Conflict pairs: removed - not used in current implementation
    conflict_pairs = []

    # Create Gurobi model
    try:
        model = gp.Model("SeatHarmony")
        model.setParam('OutputFlag', 0)  # Suppress Gurobi output
        
        # Create binary variables
        # x[g, t]: guest g at table t
        x = {}
        for g_id in guest_ids:
            for t_id in table_ids:
                x[g_id, t_id] = model.addVar(vtype=GRB.BINARY, name=f"x_{g_id}_{t_id}")
        
        # f[p, t]: both guests of family pair p at table t
        f = {}
        for p_idx in range(len(family_pairs)):
            for t_id in table_ids:
                f[p_idx, t_id] = model.addVar(vtype=GRB.BINARY, name=f"f_{p_idx}_{t_id}")
        
        # s[p, t]: both guests of social group pair p at table t
        s = {}
        for p_idx in range(len(social_group_pairs)):
            for t_id in table_ids:
                s[p_idx, t_id] = model.addVar(vtype=GRB.BINARY, name=f"s_{p_idx}_{t_id}")
        
        # c[p, t]: both guests of cross-side pair p at table t
        c = {}
        for p_idx in range(len(cross_side_pairs)):
            for t_id in table_ids:
                c[p_idx, t_id] = model.addVar(vtype=GRB.BINARY, name=f"c_{p_idx}_{t_id}")
        
        # Conflict variables removed - not used in current implementation
        
        model.update()
        
        # Build objective: MAXIMIZE
        #   family_cohesion * sum(f) + social_group_cohesion * sum(s) + 
        #   side_mixing * sum(c) + relationship_priority * priority_expr - conflict_penalty * sum(w)
        obj = gp.LinExpr()
        
        # Family cohesion: reward f variables
        for p_idx in range(len(family_pairs)):
            for t_id in table_ids:
                obj += family_cohesion_weight * f[p_idx, t_id]
        
        # Social group cohesion: reward s variables
        for p_idx in range(len(social_group_pairs)):
            for t_id in table_ids:
                obj += social_group_cohesion_weight * s[p_idx, t_id]
        
        # Side mixing: reward c variables - encourages cross-side pairs
        for p_idx in range(len(cross_side_pairs)):
            for t_id in table_ids:
                obj += side_mixing_weight * c[p_idx, t_id]
        
        # Relationship priority: prefer guests with higher closeness rank at better tables
        if table_ids and relationship_priority_weight > 0:
            for t_idx, t_id in enumerate(table_ids):
                table_quality = 1.0 / (1.0 + t_idx)  # Higher quality for lower index
                for g in guests:
                    category = _get_category(g)
                    closeness = _get_closeness_rank(category)
                    if closeness > 0:
                        # Reward placing high-closeness guests at high-quality tables
                        obj += relationship_priority_weight * closeness * table_quality * x[g.id, t_id]
        
        # Conflict penalty removed - not used in current implementation
        
        model.setObjective(obj, GRB.MAXIMIZE)
        
        # Constraint 1: Each guest sits at exactly one table
        # sum_t x[g, t] = 1 for each guest g
        for g_id in guest_ids:
            model.addConstr(gp.quicksum(x[g_id, t_id] for t_id in table_ids) == 1, name=f"guest_{g_id}_assignment")
        
        # Constraint 2: Table capacity
        # sum_g x[g, t] <= capacity[t] for each table t
        for t_id in table_ids:
            cap = table_by_id[t_id].capacity
            model.addConstr(gp.quicksum(x[g_id, t_id] for g_id in guest_ids) <= cap, name=f"table_{t_id}_capacity")
        
        # Constraint 3: Linearization for family pairs
        # f[p, t] <= x[g1, t], f[p, t] <= x[g2, t], f[p, t] >= x[g1, t] + x[g2, t] - 1
        for p_idx, (g1_id, g2_id) in enumerate(family_pairs):
            for t_id in table_ids:
                model.addConstr(f[p_idx, t_id] <= x[g1_id, t_id], name=f"f_{p_idx}_{t_id}_leq_x1")
                model.addConstr(f[p_idx, t_id] <= x[g2_id, t_id], name=f"f_{p_idx}_{t_id}_leq_x2")
                model.addConstr(f[p_idx, t_id] >= x[g1_id, t_id] + x[g2_id, t_id] - 1, name=f"f_{p_idx}_{t_id}_geq_x1_x2")
        
        # Constraint 4: Linearization for social group pairs
        # s[p, t] <= x[g1, t], s[p, t] <= x[g2, t], s[p, t] >= x[g1, t] + x[g2, t] - 1
        for p_idx, (g1_id, g2_id) in enumerate(social_group_pairs):
            for t_id in table_ids:
                model.addConstr(s[p_idx, t_id] <= x[g1_id, t_id], name=f"s_{p_idx}_{t_id}_leq_x1")
                model.addConstr(s[p_idx, t_id] <= x[g2_id, t_id], name=f"s_{p_idx}_{t_id}_leq_x2")
                model.addConstr(s[p_idx, t_id] >= x[g1_id, t_id] + x[g2_id, t_id] - 1, name=f"s_{p_idx}_{t_id}_geq_x1_x2")
        
        # Constraint 5: Linearization for cross-side pairs
        # c[p, t] <= x[g1, t], c[p, t] <= x[g2, t], c[p, t] >= x[g1, t] + x[g2, t] - 1
        for p_idx, (g1_id, g2_id) in enumerate(cross_side_pairs):
            for t_id in table_ids:
                model.addConstr(c[p_idx, t_id] <= x[g1_id, t_id], name=f"c_{p_idx}_{t_id}_leq_x1")
                model.addConstr(c[p_idx, t_id] <= x[g2_id, t_id], name=f"c_{p_idx}_{t_id}_leq_x2")
                model.addConstr(c[p_idx, t_id] >= x[g1_id, t_id] + x[g2_id, t_id] - 1, name=f"c_{p_idx}_{t_id}_geq_x1_x2")
        
        # Optimize
        model.optimize()
        
        # Check if solution is optimal or feasible
        if model.status not in [GRB.OPTIMAL, GRB.SUBOPTIMAL]:
            return _dummy_layout(guests, venue)
        
        # Extract assignments from solution
        assignments: Dict[str, str] = {}
        for g_id in guest_ids:
            for t_id in table_ids:
                if x[g_id, t_id].x > 0.5:
                    assignments[g_id] = t_id
                    break
        
        # Get objective value
        obj_value = model.ObjVal
        
    except Exception as e:
        return _dummy_layout(guests, venue)

    summary = ConstraintSummary(
        satisfied_soft={},
        violated_soft={},
        hard_violations=[],
    )

    layout = Layout(
        id="opt",
        assignments=assignments,
        score=obj_value,
        objective_breakdown={
            "family_cohesion": float(family_cohesion_weight) if family_cohesion_weight else 0.0,
            "social_group_cohesion": float(social_group_cohesion_weight) if social_group_cohesion_weight else 0.0,
            "side_mixing": float(side_mixing_weight) if side_mixing_weight else 0.0,
            "relationship_priority": float(relationship_priority_weight) if relationship_priority_weight else 0.0,
        },
        variant_label=None,
        variant_id=None,
        summary=summary,
    )

    return layout, summary
