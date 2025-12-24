from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple

from tot.tasks.base import Task  # type: ignore

from .models import Guest, Table, VenueConfig, Layout, ConstraintSummary


@dataclass
class SeatHarmonyState:
    """ToT search state for SeatHarmony in Pattern A (macro-level objective variants)."""

    guests: List[Guest]
    venue: VenueConfig
    weights: Dict[str, float]
    layout: Optional[Layout] = None
    notes: str = ""


class SeatHarmonyTask(Task):
    """
    Initial SeatHarmony Task for Tree-of-Thoughts.

    Pattern A: each state represents a different configuration of objective weights.
    Applying a thought modifies weights and triggers a (re-)optimization to obtain a layout.
    """

    def __init__(self, base_weights: Optional[Dict[str, float]] = None):
        self.base_weights = base_weights or {
            "group_cohesion": 1.0,
            "conflict_avoidance": 1.0,
            "vip_preference": 1.0,
        }

    # ---- Required Task interface methods ----

    def get_initial_state(self, instance: Dict[str, Any]) -> SeatHarmonyState:
        guests = [Guest(**g) for g in instance.get("guests", [])]
        tables = [Table(**t) for t in instance.get("tables", [])]
        venue = VenueConfig(tables=tables, settings=instance.get("settings", {}))
        return SeatHarmonyState(guests=guests, venue=venue, weights=self.base_weights.copy())

    def generate_thoughts(self, state: SeatHarmonyState, n_generate: int) -> List[str]:
        """
        For v1, use a simple, fixed set of weight perturbations as 'thoughts'.
        A later version can delegate this to Gemini for more adaptive proposals.
        """
        thoughts: List[str] = []
        patterns = [
            "emphasize_group_cohesion",
            "emphasize_conflict_avoidance",
            "emphasize_vip_preference",
            "balance_all",
        ]
        for p in patterns:
            if len(thoughts) >= n_generate:
                break
            thoughts.append(p)
        return thoughts

    def apply_thought(self, state: SeatHarmonyState, thought: str) -> SeatHarmonyState:
        """
        Apply a weight modification pattern and recompute a layout.
        The actual optimization is delegated to a separate optimizer module.
        """
        new_weights = state.weights.copy()
        if thought == "emphasize_group_cohesion":
            new_weights["group_cohesion"] *= 1.5
        elif thought == "emphasize_conflict_avoidance":
            new_weights["conflict_avoidance"] *= 1.5
        elif thought == "emphasize_vip_preference":
            new_weights["vip_preference"] *= 1.5
        elif thought == "balance_all":
            avg = sum(new_weights.values()) / len(new_weights)
            for k in new_weights:
                new_weights[k] = avg

        # Lazy import to avoid circular deps
        from .optimizer import generate_layout_for_weights

        layout, summary = generate_layout_for_weights(
            guests=state.guests, venue=state.venue, weights=new_weights
        )
        updated_layout = layout
        updated_layout.summary = summary

        return SeatHarmonyState(
            guests=state.guests,
            venue=state.venue,
            weights=new_weights,
            layout=updated_layout,
            notes=thought,
        )

    def evaluate_states(
        self, states: List[SeatHarmonyState], n_evaluate: int
    ) -> List[Tuple[SeatHarmonyState, float]]:
        """
        Basic numeric evaluation: use layout score as value.
        Gemini-based evaluation can be added later to refine rankings.
        """
        evaluated: List[Tuple[SeatHarmonyState, float]] = []
        for s in states[:n_evaluate]:
            if s.layout is None:
                value = 0.0
            else:
                value = s.layout.score
            evaluated.append((s, value))
        return evaluated

    def is_terminal(self, state: SeatHarmonyState) -> bool:
        """Terminal if we already have a layout and there are no hard violations."""
        if state.layout is None or state.layout.summary is None:
            return False
        return len(state.layout.summary.hard_violations) == 0

    def get_answer(self, state: SeatHarmonyState) -> Dict[str, Any]:
        """Return a serializable layout answer."""
        if state.layout is None:
            return {}
        from .models import layout_to_dict

        return layout_to_dict(state.layout)


