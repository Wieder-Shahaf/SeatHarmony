from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple
import time

from tot.tasks.base import Task  # type: ignore

from .models import Guest, Table, VenueConfig, Layout, ConstraintSummary
from .optimizer import generate_hierarchical_layout
from .logger import get_logger

# Initialize logger for this module
logger = get_logger("task")


# =============================================================================
# STRATEGY DEFINITIONS
# =============================================================================
# Each strategy represents a distinct wedding seating philosophy.
# These map to specific weight configurations for the hierarchical optimizer.

STRATEGIES: Dict[str, Dict[str, Any]] = {
    "Strict Tradition": {
        "description": "Maximize side separation - keep groom's and bride's guests apart",
        "weights": {
            "family_cohesion": 1.0,
            "social_group_cohesion": 1.0,
            "side_mixing": 10.0,  # High penalty for mixing sides
        },
    },
    "Balanced Mixing": {
        "description": "Allow some friends to mix for better table fits",
        "weights": {
            "family_cohesion": 1.0,
            "social_group_cohesion": 1.5,
            "side_mixing": 2.0,  # Moderate penalty
        },
    },
    "High Density Party": {
        "description": "Prioritize keeping friend groups together over side separation",
        "weights": {
            "family_cohesion": 1.0,
            "social_group_cohesion": 5.0,  # Strong friend cohesion
            "side_mixing": 0.5,  # Low penalty - allow mixing
        },
    },
    "Family First": {
        "description": "Maximum focus on keeping families together",
        "weights": {
            "family_cohesion": 5.0,  # Strong family cohesion
            "social_group_cohesion": 1.0,
            "side_mixing": 1.0,
        },
    },
}

# Default strategy order for generation
STRATEGY_ORDER = [
    "Balanced Mixing",     # Good default - moderate approach
    "Family First",        # Common priority for traditional weddings
    "Strict Tradition",    # For couples who want clear separation
    "High Density Party",  # For casual/party weddings
]


@dataclass
class SeatHarmonyState:
    """
    ToT search state for SeatHarmony using Strategy-Based Search.

    Each state represents a distinct seating strategy (e.g., "Family First",
    "High Density Party") rather than just numeric weight configurations.
    """

    guests: List[Guest]
    venue: VenueConfig
    weights: Dict[str, float]
    strategy: str = ""  # Name of the strategy applied
    layout: Optional[Layout] = None
    notes: str = ""


class SeatHarmonyTask(Task):
    """
    SeatHarmony Task for Tree-of-Thoughts using Strategy-Based Search.

    Instead of exploring minor weight variations, this implementation explores
    qualitatively different seating strategies that align with the hierarchical
    optimizer's phase-based approach:

    - "Strict Tradition": Maximize side separation (traditional wedding)
    - "Balanced Mixing": Allow some mixing for better fits
    - "High Density Party": Keep friends together, allow mixing
    - "Family First": Maximum family cohesion priority

    The hierarchical optimizer is fast enough to explore all strategies,
    providing diverse seating plans for the couple to choose from.
    """

    def __init__(self, base_weights: Optional[Dict[str, float]] = None):
        # Base weights used when no strategy is applied (fallback)
        self.base_weights = base_weights or {
            "family_cohesion": 1.0,
            "social_group_cohesion": 1.0,
            "side_mixing": 1.0,
        }
        self.value_cache = {}
        self.layout_cache: Dict[str, Tuple[Layout, ConstraintSummary]] = {}
        self.seen_assignments: List[Dict[str, str]] = []
        self.steps = 1  # Single level of ToT search (one strategy per branch)
        self.stops = ['\n'] * 2
        self.cache_hits = 0
        self.cache_misses = 0
        self._assignment_metrics: Dict[int, Dict[str, float]] = {}

    def _get_metrics(self, assignments: Dict[str, str]) -> Dict[str, float]:
        """Get cached metrics for an assignment (used for deduplication)."""
        key = id(assignments)
        return self._assignment_metrics.get(key, {"family": 0, "social": 0, "mixing": 0})

    def _store_metrics(self, assignments: Dict[str, str], metrics: Dict[str, float]) -> None:
        """Store metrics for an assignment."""
        self._assignment_metrics[id(assignments)] = metrics

    # ---- Required Task interface methods ----

    def get_initial_state(self, instance: Dict[str, Any]) -> SeatHarmonyState:
        """Create initial state from guest/table data."""
        guests = [Guest(**g) for g in instance.get("guests", [])]
        tables = [Table(**t) for t in instance.get("tables", [])]
        venue = VenueConfig(tables=tables, settings=instance.get("settings", {}))
        logger.debug(f"Initial state created | guests={len(guests)} tables={len(tables)}")
        return SeatHarmonyState(
            guests=guests,
            venue=venue,
            weights=self.base_weights.copy(),
            strategy="",
        )

    def generate_thoughts(self, state: SeatHarmonyState, n_generate: int) -> List[str]:
        """
        Generate strategy-based thoughts for ToT search.

        Each thought is a distinct seating strategy name that will be mapped
        to specific weight configurations in apply_thought().

        Returns up to n_generate strategy names from STRATEGY_ORDER.
        """
        thoughts: List[str] = []
        for strategy in STRATEGY_ORDER:
            if len(thoughts) >= n_generate:
                break
            thoughts.append(strategy)

        logger.info(f"Generated {len(thoughts)} strategies: {thoughts}")
        return thoughts

    def apply_thought(self, state: SeatHarmonyState, thought: str) -> SeatHarmonyState:
        """
        Apply a seating strategy and compute the optimal layout.

        Maps the strategy name to specific weights and calls the hierarchical
        optimizer to generate a seating plan.

        Args:
            state: Current search state
            thought: Strategy name (e.g., "Family First", "High Density Party")

        Returns:
            New state with computed layout
        """
        apply_start_time = time.time()
        strategy_name = thought

        # Get strategy configuration
        if strategy_name in STRATEGIES:
            strategy_config = STRATEGIES[strategy_name]
            new_weights = strategy_config["weights"].copy()
            strategy_desc = strategy_config["description"]
            logger.info(f"🎯 STRATEGY: {strategy_name} | {strategy_desc}")
        else:
            # Fallback for unknown strategies
            logger.warning(f"Unknown strategy: {strategy_name}, using base weights")
            new_weights = self.base_weights.copy()
            strategy_desc = "Unknown strategy"

        logger.debug(
            f"Strategy weights: family={new_weights['family_cohesion']:.1f} "
            f"social={new_weights['social_group_cohesion']:.1f} "
            f"mixing={new_weights['side_mixing']:.1f}"
        )

        # Create cache key from guest IDs and strategy
        guest_ids_key = tuple(sorted(g.id for g in state.guests))
        strategy_key = strategy_name
        cache_key = (guest_ids_key, strategy_key)

        # Check cache first
        if cache_key in self.layout_cache:
            layout, summary = self.layout_cache[cache_key]
            self.cache_hits += 1
            logger.info(
                f"📦 CACHE HIT | strategy={strategy_name} | "
                f"score={layout.score:.2f} | No optimization needed"
            )
        else:
            self.cache_misses += 1
            logger.info(
                f"🔄 OPTIMIZING | strategy={strategy_name} | "
                f"Calling hierarchical optimizer..."
            )

            # Generate diversity seed from timestamp for slight variation
            # This ensures different runs can explore slightly different solutions
            diversity_seed = int(time.time() * 1000) & 0x7FFFFFFF

            # Call the hierarchical optimizer
            layout, summary = generate_hierarchical_layout(
                guests=state.guests,
                venue=state.venue,
                weights=new_weights,
                diversity_seed=diversity_seed,
                seen_assignments=self.seen_assignments,
            )
            self.layout_cache[cache_key] = (layout, summary)

            # Track this assignment for future repulsion
            if layout and layout.assignments and layout.objective_breakdown:
                metrics_key = (
                    round(layout.objective_breakdown.get("family_cohesion", 0)),
                    round(layout.objective_breakdown.get("social_group_cohesion", 0)),
                    round(layout.objective_breakdown.get("side_mixing", 0)),
                )

                # Store assignment with its metrics
                assignment_copy = layout.assignments.copy()
                self.seen_assignments.append(assignment_copy)
                self._store_metrics(assignment_copy, {
                    "family": layout.objective_breakdown.get("family_cohesion", 0),
                    "social": layout.objective_breakdown.get("social_group_cohesion", 0),
                    "mixing": layout.objective_breakdown.get("side_mixing", 0),
                })

                # Check for hard violations
                violations = len(summary.hard_violations) if summary else 0
                violation_str = f" | ⚠️ {violations} violations" if violations > 0 else ""

                logger.info(
                    f"✅ COMPLETE | strategy={strategy_name} | "
                    f"score={layout.score:.2f} | "
                    f"family={metrics_key[0]}% social={metrics_key[1]}% mixing={metrics_key[2]}%"
                    f"{violation_str}"
                )

        # Update layout with summary
        updated_layout = layout
        updated_layout.summary = summary

        apply_duration_ms = (time.time() - apply_start_time) * 1000
        logger.debug(f"Strategy '{strategy_name}' applied | {apply_duration_ms:.0f}ms")

        return SeatHarmonyState(
            guests=state.guests,
            venue=state.venue,
            weights=new_weights,
            strategy=strategy_name,
            layout=updated_layout,
            notes=strategy_desc,
        )

    def evaluate_states(
        self, states: List[SeatHarmonyState], n_evaluate: int
    ) -> List[Tuple[SeatHarmonyState, float]]:
        """
        Evaluate states based on layout score and hard violations.

        Prioritizes layouts with:
        1. Fewer hard violations (critical)
        2. Higher overall score (secondary)

        The hierarchical optimizer may produce "greedy" solutions with
        potentially lower global scores, so we prioritize feasibility
        (no hard violations) over raw score optimization.
        """
        evaluated: List[Tuple[SeatHarmonyState, float]] = []

        for s in states[:n_evaluate]:
            if s.layout is None:
                value = 0.0
            else:
                # Base value is the layout score
                base_score = s.layout.score

                # Penalize hard violations heavily
                # Each violation reduces effective score significantly
                violations = 0
                if s.layout.summary and s.layout.summary.hard_violations:
                    violations = len(s.layout.summary.hard_violations)

                # Penalty: -20 points per violation (on 0-100 scale)
                violation_penalty = violations * 20.0
                value = max(0.0, base_score - violation_penalty)

                if violations > 0:
                    logger.debug(
                        f"State {s.strategy}: base={base_score:.2f}, "
                        f"violations={violations}, adjusted={value:.2f}"
                    )

            evaluated.append((s, value))

        if evaluated:
            # Sort by value for logging
            sorted_eval = sorted(evaluated, key=lambda x: x[1], reverse=True)
            scores = [f"{s.strategy}:{v:.1f}" for s, v in sorted_eval]
            logger.info(f"Evaluated {len(evaluated)} strategies | scores={scores}")

        return evaluated

    def is_terminal(self, state: SeatHarmonyState) -> bool:
        """
        Terminal if we have a layout with no hard violations.

        For strategy-based search, we typically want to explore all strategies
        and let the user choose, so this mainly signals "valid solution found".
        """
        if state.layout is None or state.layout.summary is None:
            return False
        return len(state.layout.summary.hard_violations) == 0

    def get_answer(self, state: SeatHarmonyState) -> Dict[str, Any]:
        """Return a serializable layout answer with strategy info."""
        if state.layout is None:
            return {}
        from .models import layout_to_dict

        result = layout_to_dict(state.layout)
        result["strategy"] = state.strategy
        result["strategy_description"] = state.notes
        return result

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
        """Wrap prompt for proposing strategies."""
        try:
            from tot.prompts.seat_harmony import propose_prompt
            return propose_prompt.format(current_weights=y if y else "initial", context=x)
        except ImportError:
            return f"Propose seating strategies for wedding. Current: {y if y else 'initial'}. Context: {x}"

    @staticmethod
    def value_prompt_wrap(x: str, y: str) -> str:
        """Wrap prompt for evaluating a layout."""
        try:
            from tot.prompts.seat_harmony import value_prompt
            return value_prompt.format(context=x, layout=y)
        except ImportError:
            return f"Evaluate this wedding seating layout. Context: {x}. Layout: {y}"

    @staticmethod
    def value_outputs_unwrap(x: str, y: str, value_outputs: list) -> float:
        """Extract numeric value from LLM evaluation outputs."""
        if not value_outputs:
            return 0.0

        import re
        scores = []
        for output in value_outputs:
            numbers = re.findall(r'\d+\.?\d*', str(output))
            if numbers:
                try:
                    scores.append(float(numbers[0]))
                except ValueError:
                    pass

        if scores:
            return sum(scores) / len(scores)
        return 0.0
