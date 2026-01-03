import json
import sys
from pathlib import Path
from typing import Any, Dict, List, Tuple

import streamlit as st  # type: ignore

# Add project root to Python path so we can import backend as a package
project_root = Path(__file__).parent.parent
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))

# Import from backend package (works with relative imports in backend files)
from backend.seat_harmony_task import SeatHarmonyTask, SeatHarmonyState
from backend.models import layout_to_dict


def simple_tot_bfs(
    instance: Dict[str, Any],
    depth: int = 2,
    branching: int = 4,
    n_generate: int = 4,
    n_evaluate: int = 4,
) -> Tuple[List[Tuple[SeatHarmonyState, float]], SeatHarmonyState]:
    """
    A lightweight Tree-of-Thoughts-style BFS over SeatHarmonyTask.

    This does not depend on the external tree-of-thought-llm BFS implementation
    but uses the same Task interface (generate_thoughts, apply_thought,
    evaluate_states) to keep things easy to debug in Streamlit.
    """
    task = SeatHarmonyTask()
    root = task.get_initial_state(instance)

    frontier: List[SeatHarmonyState] = [root]
    scored_states: List[Tuple[SeatHarmonyState, float]] = []
    best_state = root
    best_value = float("-inf")

    for _ in range(depth):
        new_frontier: List[SeatHarmonyState] = []

        for state in frontier:
            thoughts = task.generate_thoughts(state, n_generate)[:branching]
            children: List[SeatHarmonyState] = [
                task.apply_thought(state, t) for t in thoughts
            ]

            evaluated = task.evaluate_states(children, n_evaluate)
            scored_states.extend(evaluated)

            for child, value in evaluated:
                if value > best_value:
                    best_value = value
                    best_state = child

            # Simple selection: keep the top `branching` children by value.
            evaluated_sorted = sorted(evaluated, key=lambda x: x[1], reverse=True)
            new_frontier.extend([s for s, _ in evaluated_sorted[:branching]])

        frontier = new_frontier

    return scored_states, best_state


def _default_demo_instance() -> Dict[str, Any]:
    return {
        "guests": [
            {"id": "g1", "name": "Alice", "group_id": "family_a", "importance": 2},
            {"id": "g2", "name": "Bob", "group_id": "family_a", "importance": 1},
            {
                "id": "g3",
                "name": "Charlie",
                "group_id": "friends",
            },
            {"id": "g4", "name": "Dana", "group_id": "friends"},
        ],
        "tables": [
            {"id": "t1", "name": "Table 1", "capacity": 4},
            {"id": "t2", "name": "Table 2", "capacity": 4},
        ],
        "settings": {},
    }


def main() -> None:
    st.set_page_config(
        page_title="SeatHarmony ToT Debugger",
        layout="wide",
    )

    st.title("SeatHarmony Tree-of-Thoughts Debugger")
    st.write(
        "Run a lightweight Tree-of-Thoughts-style search over SeatHarmony layouts, "
        "inspect candidate layouts, scores, and objective weights."
    )

    st.sidebar.header("Search Hyperparameters")
    depth = st.sidebar.slider("Depth", min_value=1, max_value=4, value=2)
    branching = st.sidebar.slider("Branching per depth", 1, 8, 4)
    n_generate = st.sidebar.slider("Thoughts to generate", 1, 8, 4)
    n_evaluate = st.sidebar.slider("States to evaluate", 1, 8, 4)

    st.sidebar.header("Instance Configuration")
    use_demo = st.sidebar.checkbox("Use demo configuration", value=True)

    if use_demo:
        instance = _default_demo_instance()
        st.sidebar.info("Using a small built-in demo guest/table configuration.")
    else:
        uploaded = st.sidebar.file_uploader(
            "Upload JSON instance (guests, tables, settings)", type=["json"]
        )
        if uploaded is not None:
            try:
                instance = json.loads(uploaded.read().decode("utf-8"))
            except Exception as e:  # pragma: no cover - defensive
                st.error(f"Failed to parse JSON: {e}")
                return
        else:
            st.warning("Upload an instance JSON or enable the demo configuration.")
            return

    if st.button("Run ToT Search", type="primary"):
        with st.spinner("Running search..."):
            scored_states, best_state = simple_tot_bfs(
                instance=instance,
                depth=depth,
                branching=branching,
                n_generate=n_generate,
                n_evaluate=n_evaluate,
            )

        st.subheader("Best Layout")
        if best_state.layout is None:
            st.warning("Best state has no layout. Check your configuration.")
        else:
            best_layout_dict = layout_to_dict(best_state.layout)
            st.json(best_layout_dict)

            cols = st.columns(3)
            with cols[0]:
                st.metric("Score", f"{best_layout_dict['score']:.2f}")
            with cols[1]:
                st.metric(
                    "Hard Violations",
                    len(best_layout_dict["summary"]["hard_violations"]),
                )
            with cols[2]:
                st.metric("Variant", best_layout_dict.get("variant_label") or "-")

        st.subheader("Candidate States")
        if not scored_states:
            st.info("No candidate states produced.")
        else:
            for idx, (state, value) in enumerate(
                sorted(scored_states, key=lambda x: x[1], reverse=True)
            ):
                with st.expander(f"State {idx + 1} – value={value:.2f} – thought={state.notes}"):
                    st.write("Weights:", state.weights)
                    if state.layout is not None:
                        st.json(layout_to_dict(state.layout))
                    else:
                        st.write("No layout computed for this state.")


if __name__ == "__main__":  # pragma: no cover - manual launch
    main()


