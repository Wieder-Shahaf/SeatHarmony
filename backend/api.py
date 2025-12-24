from typing import Any, Dict, List, Optional, Tuple

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, RootModel

from .seat_harmony_task import SeatHarmonyTask, SeatHarmonyState
from .models import layout_to_dict


class GuestIn(BaseModel):
    id: str
    name: str
    group_id: Optional[str] = None
    importance: int = 0
    tags: List[str] = []
    must_sit_with: List[str] = []
    must_not_sit_with: List[str] = []


class TableIn(BaseModel):
    id: str
    name: str
    capacity: int
    zone: Optional[str] = None
    constraints: Dict[str, Any] = {}


class SettingsIn(RootModel[Dict[str, Any]]):
    root: Dict[str, Any] = {}


class TotParams(BaseModel):
    depth: int = 2
    branching: int = 4
    n_generate: int = 4
    n_evaluate: int = 4
    top_k: int = 3


class LayoutRequest(BaseModel):
    guests: List[GuestIn]
    tables: List[TableIn]
    settings: Dict[str, Any] = {}
    tot: TotParams = TotParams()


class ExplainRequest(BaseModel):
    layout: Dict[str, Any]


app = FastAPI(title="SeatHarmony ToT API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _simple_tot_bfs(
    instance: Dict[str, Any],
    depth: int,
    branching: int,
    n_generate: int,
    n_evaluate: int,
) -> List[Tuple[SeatHarmonyState, float]]:
    """
    Server-side version of the lightweight Tree-of-Thoughts-style BFS.
    Returns a list of (state, value) pairs.
    """
    task = SeatHarmonyTask()
    root = task.get_initial_state(instance)

    frontier: List[SeatHarmonyState] = [root]
    scored_states: List[Tuple[SeatHarmonyState, float]] = []

    for _ in range(depth):
        new_frontier: List[SeatHarmonyState] = []

        for state in frontier:
            thoughts = task.generate_thoughts(state, n_generate)[:branching]
            children: List[SeatHarmonyState] = [
                task.apply_thought(state, t) for t in thoughts
            ]

            evaluated = task.evaluate_states(children, n_evaluate)
            scored_states.extend(evaluated)

            evaluated_sorted = sorted(evaluated, key=lambda x: x[1], reverse=True)
            new_frontier.extend([s for s, _ in evaluated_sorted[:branching]])

        frontier = new_frontier

    return scored_states


@app.post("/api/layouts/generate")
def generate_layouts(req: LayoutRequest) -> Dict[str, Any]:
    instance: Dict[str, Any] = {
        "guests": [g.dict() for g in req.guests],
        "tables": [t.dict() for t in req.tables],
        "settings": req.settings,
    }

    scored_states = _simple_tot_bfs(
        instance=instance,
        depth=req.tot.depth,
        branching=req.tot.branching,
        n_generate=req.tot.n_generate,
        n_evaluate=req.tot.n_evaluate,
    )

    # Sort by value and take top_k distinct layouts
    unique_layouts: List[Dict[str, Any]] = []
    seen_ids = set()

    for state, value in sorted(scored_states, key=lambda x: x[1], reverse=True):
        if state.layout is None:
            continue
        layout_dict = layout_to_dict(state.layout)
        layout_id = (layout_dict["id"], tuple(sorted(layout_dict["assignments"].items())))
        if layout_id in seen_ids:
            continue
        seen_ids.add(layout_id)
        unique_layouts.append(
            {
                "value": value,
                "weights": state.weights,
                "notes": state.notes,
                "layout": layout_dict,
            }
        )
        if len(unique_layouts) >= req.tot.top_k:
            break

    return {"layouts": unique_layouts}


@app.post("/api/layouts/explain")
def explain_layout(req: ExplainRequest) -> Dict[str, Any]:
    """
    Very simple textual explanation based on the numeric score and objective breakdown.
    This is a placeholder for a richer Gemini-backed explanation.
    """
    layout = req.layout
    score = layout.get("score", 0.0)
    breakdown = layout.get("objective_breakdown", {})

    parts: List[str] = []
    gc = breakdown.get("group_cohesion", 0.0)
    if gc:
        parts.append(
            f"Emphasizes keeping related guests together (group cohesion weight {gc:.2f})."
        )
    ca = breakdown.get("conflict_avoidance", 0.0)
    if ca:
        parts.append(
            f"Attempts to separate conflicting guests (conflict avoidance weight {ca:.2f})."
        )
    vip = breakdown.get("vip_preference", 0.0)
    if vip:
        parts.append(
            f"Prefers seating more important guests at the primary table (VIP weight {vip:.2f})."
        )

    if not parts:
        parts.append(
            "Uses a neutral objective; primarily ensures everyone is seated within table capacities."
        )

    explanation = (
        f"This layout has an overall objective score of {score:.2f}. "
        + " ".join(parts)
    )

    return {"explanation": explanation}



