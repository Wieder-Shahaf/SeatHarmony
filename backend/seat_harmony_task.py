from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple
import time

from tot.tasks.base import Task  # type: ignore

from .models import Guest, Table, VenueConfig, Layout, ConstraintSummary
from .logger import get_logger

# Initialize logger for this module
logger = get_logger("task")


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
        }
        self.value_cache = {}
        self.layout_cache: Dict[str, Tuple[Layout, ConstraintSummary]] = {}  # Cache for optimization results
        self.steps = 1  # Depth of ToT search
        self.stops = ['\n'] * 2
        self.cache_hits = 0
        self.cache_misses = 0

    # ---- Required Task interface methods ----

    def get_initial_state(self, instance: Dict[str, Any]) -> SeatHarmonyState:
        guests = [Guest(**g) for g in instance.get("guests", [])]
        tables = [Table(**t) for t in instance.get("tables", [])]
        venue = VenueConfig(tables=tables, settings=instance.get("settings", {}))
        logger.debug(f"Initial state created | guests={len(guests)} tables={len(tables)} base_weights={self.base_weights}")
        return SeatHarmonyState(guests=guests, venue=venue, weights=self.base_weights.copy())

    def generate_thoughts(self, state: SeatHarmonyState, n_generate: int) -> List[str]:
        """
        Generate weight modification thoughts for single-level ToT.
        6 distinct strategies covering different wedding styles.
        """
        thoughts: List[str] = []
        patterns = [
            "baseline",          # (0.5, 0.5, 0.5) - Balanced starting point
            "boost_family",      # (0.8, 0.5, 0.5) - Family priority
            "boost_social",      # (0.5, 0.8, 0.5) - Social groups priority
            "max_cohesion",      # (0.7, 0.7, 0.3) - Keep groups together
            "max_mingling",      # (0.3, 0.3, 0.9) - Encourage mixing
            "reduce_social",     # (0.5, 0.2, 0.5) - Deprioritize social groups
        ]
        for p in patterns:
            if len(thoughts) >= n_generate:
                break
            thoughts.append(p)
        logger.debug(f"Generated {len(thoughts)} thoughts: {thoughts}")
        return thoughts

    def apply_thought(self, state: SeatHarmonyState, thought: str) -> SeatHarmonyState:
        """
        Apply an INCREMENTAL weight modification and recompute layout.
        Weights are clamped to [0.0, 1.0] range.
        """
        apply_start_time = time.time()
        logger.debug(f"Applying thought: {thought} to weights: {state.weights}")

        new_weights = state.weights.copy()

        # Ensure all required keys exist
        for key in ["family_cohesion", "social_group_cohesion", "side_mixing"]:
            if key not in new_weights:
                new_weights[key] = 0.5

        # Incremental modifications (deltas from base 0.5, 0.5, 0.5)
        deltas = {
            "baseline":        {},  # No change - use base weights
            "boost_family":    {"family_cohesion": +0.3},
            "boost_social":    {"social_group_cohesion": +0.3},
            "reduce_social":   {"social_group_cohesion": -0.3},
            "max_cohesion":    {"family_cohesion": +0.2, "social_group_cohesion": +0.2, "side_mixing": -0.2},
            "max_mingling":    {"family_cohesion": -0.2, "social_group_cohesion": -0.2, "side_mixing": +0.4},
        }

        if thought in deltas:
            for key, delta in deltas[thought].items():
                new_weights[key] = max(0.0, min(1.0, new_weights[key] + delta))
        else:
            logger.warning(f"Unknown thought pattern: {thought}")

        logger.debug(f"Adjusted weights: family={new_weights['family_cohesion']:.2f} social={new_weights['social_group_cohesion']:.2f} mixing={new_weights['side_mixing']:.2f}")

        # Create cache key from guest IDs and weights
        guest_ids_key = tuple(sorted(g.id for g in state.guests))
        weights_key = tuple(sorted((k, round(v, 2)) for k, v in new_weights.items()))
        cache_key = (guest_ids_key, weights_key)
        
        # Check cache first
        if cache_key in self.layout_cache:
            layout, summary = self.layout_cache[cache_key]
            self.cache_hits += 1
            logger.info(f"📦 CACHE HIT | thought={thought} | weights=({new_weights['family_cohesion']:.2f}, {new_weights['social_group_cohesion']:.2f}, {new_weights['side_mixing']:.2f}) | score={layout.score:.2f} | ⚡ No optimization needed")
        else:
            self.cache_misses += 1
            logger.info(f"🔄 OPTIMIZATION CALL | thought={thought} | weights=({new_weights['family_cohesion']:.2f}, {new_weights['social_group_cohesion']:.2f}, {new_weights['side_mixing']:.2f}) | ⚙️ Calling Gurobi solver...")
            from .optimizer import generate_layout_for_weights
            layout, summary = generate_layout_for_weights(
                guests=state.guests, venue=state.venue, weights=new_weights
            )
            self.layout_cache[cache_key] = (layout, summary)
            logger.info(f"✅ OPTIMIZATION COMPLETE | thought={thought} | score={layout.score:.2f} | 💾 Cached for future use")
        
        updated_layout = layout
        updated_layout.summary = summary

        apply_duration_ms = (time.time() - apply_start_time) * 1000
        score = updated_layout.score if updated_layout else 0.0
        logger.debug(f"Thought '{thought}' applied | score={score:.2f} | {apply_duration_ms:.0f}ms")

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

        if evaluated:
            scores = [f"{v:.2f}" for _, v in evaluated]
            logger.debug(f"Evaluated {len(evaluated)} states | scores={scores}")

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


