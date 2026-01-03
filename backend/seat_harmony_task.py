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
            "family_cohesion": 0.5,
            "social_group_cohesion": 0.5,
            "side_mixing": 0.5,
            "relationship_priority": 0.5,
        }
        self.value_cache = {}
        self.steps = 2  # Depth of ToT search
        self.stops = ['\n'] * 2

    # ---- Required Task interface methods ----

    def get_initial_state(self, instance: Dict[str, Any]) -> SeatHarmonyState:
        guests = [Guest(**g) for g in instance.get("guests", [])]
        tables = [Table(**t) for t in instance.get("tables", [])]
        venue = VenueConfig(tables=tables, settings=instance.get("settings", {}))
        return SeatHarmonyState(guests=guests, venue=venue, weights=self.base_weights.copy())

    def generate_thoughts(self, state: SeatHarmonyState, n_generate: int) -> List[str]:
        """
        Generate thoughts (weight modifications) for the current state.
        Can use LLM-based proposals or fixed patterns.
        """
        # For now, use fixed patterns. Can be enhanced with LLM proposals.
        thoughts: List[str] = []
        patterns = [
            "emphasize_family_cohesion",
            "emphasize_social_group_cohesion",
            "emphasize_side_mixing",
            "emphasize_relationship_priority",
            "balance_all",
            "traditional_seating",  # High family, low mixing
            "modern_seating",  # More mixing, balanced priorities
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
        
        # Ensure all required hyperparameters exist
        required_keys = ["family_cohesion", "social_group_cohesion", "side_mixing", "relationship_priority"]
        for key in required_keys:
            if key not in new_weights:
                new_weights[key] = 0.5  # Default value
        
        if thought == "emphasize_family_cohesion":
            new_weights["family_cohesion"] = min(1.0, new_weights["family_cohesion"] * 1.5)
        elif thought == "emphasize_social_group_cohesion":
            new_weights["social_group_cohesion"] = min(1.0, new_weights["social_group_cohesion"] * 1.5)
        elif thought == "emphasize_side_mixing":
            new_weights["side_mixing"] = min(1.0, new_weights["side_mixing"] * 1.5)
        elif thought == "emphasize_relationship_priority":
            new_weights["relationship_priority"] = min(1.0, new_weights["relationship_priority"] * 1.5)
        elif thought == "balance_all":
            avg = sum(new_weights.values()) / len(new_weights)
            for k in new_weights:
                new_weights[k] = avg
        elif thought == "traditional_seating":
            # High family cohesion, low side mixing
            new_weights["family_cohesion"] = 0.9
            new_weights["social_group_cohesion"] = 0.7
            new_weights["side_mixing"] = 0.1
            new_weights["relationship_priority"] = 0.8
        elif thought == "modern_seating":
            # More mixing, balanced priorities
            new_weights["family_cohesion"] = 0.6
            new_weights["social_group_cohesion"] = 0.5
            new_weights["side_mixing"] = 0.7
            new_weights["relationship_priority"] = 0.6

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
    
    # ---- ToT prompt methods (required for LLM-based thought generation/evaluation) ----
    
    def __len__(self) -> int:
        """Return number of instances (not applicable for dynamic instances from UI)."""
        return 0
    
    def get_input(self, idx: int) -> str:
        """Not used for SeatHarmony (instances come from UI), but required by Task interface."""
        raise NotImplementedError("SeatHarmony uses dynamic instances from UI, not indexed data")
    
    def test_output(self, idx: int, output: str):
        """Not used for SeatHarmony, but required by Task interface."""
        raise NotImplementedError("SeatHarmony uses layout score for evaluation")
    
    @staticmethod
    def propose_prompt_wrap(x: str, y: str = '') -> str:
        """Wrap prompt for proposing weight modifications."""
        try:
            from tot.prompts.seat_harmony import propose_prompt
            # x is the current state description, y is previous thoughts
            return propose_prompt.format(current_weights=y if y else "initial", context=x)
        except ImportError:
            # Fallback if prompts not available
            return f"Propose weight modifications for wedding seating. Current: {y if y else 'initial'}. Context: {x}"
    
    @staticmethod
    def value_prompt_wrap(x: str, y: str) -> str:
        """Wrap prompt for evaluating a layout."""
        try:
            from tot.prompts.seat_harmony import value_prompt
            # x is the problem context, y is the layout description
            return value_prompt.format(context=x, layout=y)
        except ImportError:
            # Fallback if prompts not available
            return f"Evaluate this wedding seating layout. Context: {x}. Layout: {y}"
    
    @staticmethod
    def value_outputs_unwrap(x: str, y: str, value_outputs: list) -> float:
        """Extract numeric value from LLM evaluation outputs."""
        # For now, use layout score directly. Can enhance with LLM-based evaluation.
        # If we have value_outputs from LLM, parse them here
        if not value_outputs:
            return 0.0
        
        # Try to extract numeric scores from LLM outputs
        import re
        scores = []
        for output in value_outputs:
            # Look for numeric scores in the output
            numbers = re.findall(r'\d+\.?\d*', str(output))
            if numbers:
                try:
                    scores.append(float(numbers[0]))
                except ValueError:
                    pass
        
        if scores:
            return sum(scores) / len(scores)
        return 0.0


