from typing import Dict, List, Tuple

try:
    import gurobipy as gp  # type: ignore
    from gurobipy import GRB  # type: ignore
except Exception:  # pragma: no cover - Gurobi may not be available in all environments
    gp = None  # type: ignore
    GRB = None  # type: ignore

from .models import Guest, Table, VenueConfig, Layout, ConstraintSummary


def _dummy_layout(guests: List[Guest], venue: VenueConfig) -> Tuple[Layout, ConstraintSummary]:
    """
    Fallback layout generator if Gurobi is not available.
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
    Uses Gurobi when available; otherwise falls back to a simple heuristic.
    """
    if gp is None or GRB is None:
        return _dummy_layout(guests, venue)

    # Basic ILP model: each guest assigned to exactly one table, respect capacities.
    model = gp.Model("seatharmony")
    model.Params.OutputFlag = 0

    tables: List[Table] = venue.tables
    guest_ids = [g.id for g in guests]
    table_ids = [t.id for t in tables]

    x = model.addVars(guest_ids, table_ids, vtype=GRB.BINARY, name="x")

    # Each guest sits at exactly one table
    for g in guest_ids:
        model.addConstr(gp.quicksum(x[g, t] for t in table_ids) == 1, name=f"guest_{g}")

    # Table capacity
    table_by_id = {t.id: t for t in tables}
    for t_id in table_ids:
        cap = table_by_id[t_id].capacity
        model.addConstr(
            gp.quicksum(x[g, t_id] for g in guest_ids) <= cap, name=f"cap_{t_id}"
        )

    # Simple group cohesion term
    group_weight = weights.get("group_cohesion", 0.0)
    conflict_weight = weights.get("conflict_avoidance", 0.0)
    vip_weight = weights.get("vip_preference", 0.0)

    guests_by_id = {g.id: g for g in guests}

    cohesion_expr = gp.LinExpr()
    conflict_expr = gp.LinExpr()
    vip_expr = gp.LinExpr()

    # Group cohesion: reward pairs of same group at same table
    for i, g1 in enumerate(guests):
        for g2 in guests[i + 1 :]:
            if g1.group_id and g1.group_id == g2.group_id:
                for t_id in table_ids:
                    cohesion_expr += x[g1.id, t_id] * x[g2.id, t_id]

    # Conflict avoidance: penalize must_not_sit_with pairs at same table
    for g in guests:
        for enemy_id in g.must_not_sit_with:
            if enemy_id not in guests_by_id:
                continue
            for t_id in table_ids:
                conflict_expr += x[g.id, t_id] * x[enemy_id, t_id]

    # VIP preference: simple example – prefer first table for important guests
    if table_ids:
        vip_table = table_ids[0]
        for g in guests:
            if g.importance > 0:
                vip_expr += g.importance * x[g.id, vip_table]

    model.setObjective(
        group_weight * cohesion_expr
        - conflict_weight * conflict_expr
        + vip_weight * vip_expr,
        GRB.MAXIMIZE,
    )

    model.optimize()

    assignments: Dict[str, str] = {}
    for g in guest_ids:
        for t_id in table_ids:
            if x[g, t_id].X > 0.5:
                assignments[g] = t_id
                break

    # For v1, we compute simple objective breakdowns numerically.
    obj_value = float(model.ObjVal)
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
            "group_cohesion": float(group_weight) if group_weight else 0.0,
            "conflict_avoidance": float(conflict_weight) if conflict_weight else 0.0,
            "vip_preference": float(vip_weight) if vip_weight else 0.0,
        },
        variant_label=None,
        variant_id=None,
        summary=summary,
    )

    return layout, summary


