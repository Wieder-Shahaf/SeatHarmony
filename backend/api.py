from typing import Any, Dict, List, Optional, Tuple
from pathlib import Path
import os
import time

# Load .env file early (before any other imports that might use env vars)
from dotenv import load_dotenv

# Try to load .env from project root (parent of backend/)
project_root = Path(__file__).parent.parent
env_file = project_root / ".env"
if env_file.exists():
    load_dotenv(env_file)
elif (Path(__file__).parent / ".env").exists():
    # Fallback to backend/.env
    load_dotenv(Path(__file__).parent / ".env")

from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, RootModel
import json

from .seat_harmony_task import SeatHarmonyTask, SeatHarmonyState
from .models import layout_to_dict
from .logger import get_logger, set_request_id, get_request_id

# Initialize logger for this module
logger = get_logger("api")


class GuestIn(BaseModel):
    id: str
    name: str
    group_id: Optional[str] = None
    importance: int = 0
    tags: List[str] = []


class TableIn(BaseModel):
    id: str
    name: str
    capacity: int
    zone: Optional[str] = None
    constraints: Dict[str, Any] = {}


class SettingsIn(RootModel[Dict[str, Any]]):
    root: Dict[str, Any] = {}


class TotParams(BaseModel):
    depth: int = 2        # 2 levels of exploration
    branching: int = 3    # 3 children per node
    n_generate: int = 3   # Generate 3 thought variants
    n_evaluate: int = 3   # Evaluate top 3
    top_k: int = 3        # Return top 3 layouts


class LayoutRequest(BaseModel):
    guests: List[GuestIn]
    tables: List[TableIn]
    settings: Dict[str, Any] = {}
    tot: TotParams = TotParams()


class ExplainRequest(BaseModel):
    layout: Dict[str, Any]


class ExplainGuestsRequest(BaseModel):
    guests: List[GuestIn]
    tables: List[TableIn]
    layout: Dict[str, Any]  # The layout with assignments
    weights: Dict[str, float]  # The weights used for this layout
    notes: str  # The strategy/thought name (e.g., "traditional_seating")


app = FastAPI(title="SeatHarmony ToT API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event():
    """Verify API key is available on startup."""
    logger.info("=" * 60)
    logger.info("SeatHarmony API starting up...")
    logger.info("=" * 60)

    # .env is already loaded at module import time (above)
    # Just verify the key is available
    gemini_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    openai_key = os.getenv("OPENAI_API_KEY")

    if gemini_key:
        logger.info("GEMINI_API_KEY found in environment")
    elif openai_key:
        logger.info("OPENAI_API_KEY found in environment")
    else:
        logger.warning("No API key found. Set GEMINI_API_KEY or OPENAI_API_KEY in .env file")
        logger.warning(f"Looked for .env at: {env_file} or {Path(__file__).parent / '.env'}")

    logger.info("API startup complete - ready to receive requests")


def _sequential_tot_bfs(
    instance: Dict[str, Any],
    depth: int,
    branching: int = 3,
    n_generate: int = 3,
    n_evaluate: int = 3,
) -> List[Tuple[SeatHarmonyState, float]]:
    """
    Sequential Tree-of-Thoughts BFS.

    - Branching factor controls how many children per node
    - Processes thoughts one at a time (no threading overhead)
    - Gurobi can use all CPU cores for each optimization

    Returns a list of (state, value) pairs.
    """
    tot_start_time = time.time()
    logger.info(f"ToT BFS starting | depth={depth} branching={branching} n_generate={n_generate} n_evaluate={n_evaluate}")

    task = SeatHarmonyTask()
    root = task.get_initial_state(instance)
    logger.debug(f"Initial state created | guests={len(root.guests)} tables={len(root.venue.tables)}")

    frontier: List[SeatHarmonyState] = [root]
    scored_states: List[Tuple[SeatHarmonyState, float]] = []

    for level in range(depth):
        level_start_time = time.time()
        logger.info(f"ToT Level {level + 1}/{depth} starting | frontier_size={len(frontier)}")

        level_scored: List[Tuple[SeatHarmonyState, float]] = []

        # Collect all (state, thought) pairs to process at this level
        work_items: List[Tuple[SeatHarmonyState, str]] = []
        for state in frontier:
            thoughts = task.generate_thoughts(state, n_generate)[:branching]
            for thought in thoughts:
                work_items.append((state, thought))

        logger.info(f"ToT Level {level + 1}/{depth} | Generated {len(work_items)} work items (thoughts)")

        completed_count = 0
        failed_count = 0

        # Process work items sequentially
        for idx, (state, thought) in enumerate(work_items):
            thought_start_time = time.time()
            logger.debug(f"Processing thought {idx + 1}/{len(work_items)}: {thought}")

            try:
                child_state = task.apply_thought(state, thought)

                if child_state.layout is not None:
                    # Evaluate this child
                    evaluated = task.evaluate_states([child_state], n_evaluate)
                    level_scored.extend(evaluated)
                    completed_count += 1

                    thought_duration_ms = (time.time() - thought_start_time) * 1000
                    score = child_state.layout.score if child_state.layout else 0.0
                    logger.debug(f"Completed thought {idx + 1}/{len(work_items)}: {thought} | score={score:.2f} | {thought_duration_ms:.0f}ms")
                else:
                    failed_count += 1
                    logger.warning(f"Thought produced no layout: {thought}")

            except Exception as e:
                failed_count += 1
                logger.warning(f"Failed to apply thought: {thought} | error={type(e).__name__}: {e}")
                continue

        level_duration_ms = (time.time() - level_start_time) * 1000
        logger.info(f"ToT Level {level + 1}/{depth} completed | success={completed_count} failed={failed_count} | {level_duration_ms:.0f}ms")

        # Add this level's results to overall scored states
        scored_states.extend(level_scored)

        # Select top states for next level's frontier
        level_sorted = sorted(level_scored, key=lambda x: x[1], reverse=True)
        frontier = [s for s, _ in level_sorted[:branching]]

        if level_sorted:
            top_scores = [f"{s[1]:.2f}" for s in level_sorted[:3]]
            logger.debug(f"ToT Level {level + 1}/{depth} | Top scores: {', '.join(top_scores)}")

        # Early termination if no valid states
        if not frontier:
            logger.warning(f"ToT early termination at level {level + 1} - no valid states in frontier")
            break

    tot_duration_ms = (time.time() - tot_start_time) * 1000
    logger.info(f"ToT BFS completed | total_states={len(scored_states)} | {tot_duration_ms:.0f}ms")

    return scored_states


def _simple_tot_bfs(
    instance: Dict[str, Any],
    depth: int,
    branching: int,
    n_generate: int,
    n_evaluate: int,
) -> List[Tuple[SeatHarmonyState, float]]:
    """
    Wrapper that calls the sequential ToT implementation.
    """
    return _sequential_tot_bfs(
        instance=instance,
        depth=depth,
        branching=branching,
        n_generate=n_generate,
        n_evaluate=n_evaluate,
    )



def _sequential_tot_bfs_generator(
    instance: Dict[str, Any],
    depth: int,
    branching: int = 3,
    n_generate: int = 3,
    n_evaluate: int = 3,
):
    """
    Generator version of Sequential Tree-of-Thoughts BFS.
    Yields JSON strings with progress updates.
    Finally yields the result as a JSON string.
    """
    tot_start_time = time.time()
    logger.info(f"ToT BFS Generator starting | depth={depth} branching={branching}")

    task = SeatHarmonyTask()
    root = task.get_initial_state(instance)
    
    frontier: List[SeatHarmonyState] = [root]
    scored_states: List[Tuple[SeatHarmonyState, float]] = []

    # Initial progress
    yield json.dumps({
        "type": "progress",
        "percent": 0,
        "message": "Initializing optimization..."
    }) + "\n"

    for level in range(depth):
        level_start_time = time.time()
        yield json.dumps({
            "type": "progress",
            "percent": int((level / depth) * 100),
            "message": f"Starting Level {level + 1} of {depth}..."
        }) + "\n"

        level_scored: List[Tuple[SeatHarmonyState, float]] = []

        # Collect work items
        work_items: List[Tuple[SeatHarmonyState, str]] = []
        for state in frontier:
            thoughts = task.generate_thoughts(state, n_generate)[:branching]
            for thought in thoughts:
                work_items.append((state, thought))

        total_work = len(work_items)
        if total_work == 0:
            break

        completed_count = 0
        
        # Process work items
        for idx, (state, thought) in enumerate(work_items):
            # Calculate granular progress
            # Base progress for level + fraction of current level
            level_base = (level / depth) * 100
            step_progress = ((idx + 1) / total_work) * (100 / depth)
            current_percent = min(99, int(level_base + step_progress))
            
            yield json.dumps({
                "type": "progress",
                "percent": current_percent,
                "message": f"Level {level + 1}: Analyzing strategy {idx + 1}/{total_work} ({thought})..."
            }) + "\n"

            try:
                child_state = task.apply_thought(state, thought)

                if child_state.layout is not None:
                    # Evaluate
                    evaluated = task.evaluate_states([child_state], n_evaluate)
                    level_scored.extend(evaluated)
                    completed_count += 1
            except Exception as e:
                logger.warning(f"Failed to apply thought: {thought} | {e}")
                continue

        # Add this level's results
        scored_states.extend(level_scored)

        # Select top states for next level
        level_sorted = sorted(level_scored, key=lambda x: x[1], reverse=True)
        frontier = [s for s, _ in level_sorted[:branching]]

        if not frontier:
            break

    # Final processing
    unique_layouts = []
    seen_ids = set()
    
    for state, value in sorted(scored_states, key=lambda x: x[1], reverse=True):
        if state.layout is None:
            continue
        layout_dict = layout_to_dict(state.layout)
        # Use simple ID + assignments hash to dedup
        layout_id = (layout_dict["id"], tuple(sorted(layout_dict["assignments"].items())))
        
        if layout_id in seen_ids:
            continue
        seen_ids.add(layout_id)
        
        unique_layouts.append({
            "value": value,
            "weights": state.weights,
            "notes": state.notes,
            "layout": layout_dict,
        })
        # Note: top_k filtering should happen here or be passed in, 
        # but for now we return all useful ones and let client filter or filter locally if needed.
        # Let's limit to reasonable amount to avoid huge payloads
        if len(unique_layouts) >= 6:
            break

    yield json.dumps({
        "type": "result",
        "layouts": unique_layouts
    }) + "\n"


@app.post("/api/layouts/stream-generate")
def stream_generate_layouts(req: LayoutRequest) -> StreamingResponse:
    instance: Dict[str, Any] = {
        "guests": [g.dict() for g in req.guests],
        "tables": [t.dict() for t in req.tables],
        "settings": req.settings,
    }
    
    return StreamingResponse(
        _sequential_tot_bfs_generator(
            instance=instance,
            depth=req.tot.depth,
            branching=req.tot.branching,
            n_generate=req.tot.n_generate,
            n_evaluate=req.tot.n_evaluate,
        ),
        media_type="application/x-ndjson"
    )


@app.post("/api/layouts/generate")
def generate_layouts(req: LayoutRequest) -> Dict[str, Any]:
    # Set unique request ID for this request
    req_id = set_request_id()
    request_start_time = time.time()

    logger.info("=" * 50)
    logger.info(f"POST /api/layouts/generate | guests={len(req.guests)} tables={len(req.tables)}")
    logger.info(f"ToT params: depth={req.tot.depth} branching={req.tot.branching} n_generate={req.tot.n_generate} top_k={req.tot.top_k}")

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
    duplicates_skipped = 0

    for state, value in sorted(scored_states, key=lambda x: x[1], reverse=True):
        if state.layout is None:
            continue
        layout_dict = layout_to_dict(state.layout)
        layout_id = (layout_dict["id"], tuple(sorted(layout_dict["assignments"].items())))
        if layout_id in seen_ids:
            duplicates_skipped += 1
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

    request_duration_ms = (time.time() - request_start_time) * 1000
    logger.info(f"Response: {len(unique_layouts)} unique layouts (skipped {duplicates_skipped} duplicates)")

    if unique_layouts:
        scores = [f"{l['value']:.2f}" for l in unique_layouts[:3]]
        notes = [l['notes'] for l in unique_layouts[:3]]
        logger.info(f"Top layouts: scores={scores} strategies={notes}")

    logger.info(f"POST /api/layouts/generate completed | {request_duration_ms:.0f}ms")
    logger.info("=" * 50)

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
    fc = breakdown.get("family_cohesion", 0.0)
    if fc:
        parts.append(
            f"Emphasizes keeping family members together (family cohesion weight {fc:.2f})."
        )
    sgc = breakdown.get("social_group_cohesion", 0.0)
    if sgc:
        parts.append(
            f"Keeps social groups together (social group cohesion weight {sgc:.2f})."
        )
    sm = breakdown.get("side_mixing", 0.0)
    if sm:
        parts.append(
            f"Encourages mixing between groom's and bride's sides (side mixing weight {sm:.2f})."
        )
    rp = breakdown.get("relationship_priority", 0.0)
    if rp:
        parts.append(
            f"Prioritizes closer relationships for better table assignments (relationship priority weight {rp:.2f})."
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


def _explain_guests_batch(
    table_guests: List[Dict[str, Any]],
    table: Dict[str, Any],
    table_index: int,
    all_tables: List[Dict[str, Any]],
    all_guests: List[Dict[str, Any]],
    assignments: Dict[str, str],
    weights: Dict[str, float],
    notes: str,
) -> Dict[str, str]:
    """
    Generate explanations for all guests at a table in a single LLM call.
    Returns a dict mapping guest_id -> explanation.
    """
    table_name = table.get("name", f"Table {table_index + 1}")
    logger.debug(f"Generating explanations for {table_name} | guests={len(table_guests)}")
    batch_start_time = time.time()

    from tot.models import gpt
    
    # Build table context
    table_guest_names = [g["name"] for g in table_guests]
    table_categories = {}
    for g in table_guests:
        cat = g.get("group_id") or "Uncategorized"
        table_categories[cat] = table_categories.get(cat, 0) + 1
    
    # Build guest details with context about table composition and constraints
    guest_details = []
    table_guest_ids = {g["id"] for g in table_guests}
    
    for g in table_guests:
        # Find other guests at this table with same category (family/social group)
        same_category_guests = [other["name"] for other in table_guests 
                               if other["id"] != g["id"] and other.get("group_id") == g.get("group_id") and g.get("group_id")]
        
        # Build context string for this guest
        context_parts = []
        if same_category_guests:
            context_parts.append(f"same category as: {', '.join(same_category_guests[:3])}")
        if g.get("importance", 0) > 0:
            context_parts.append(f"VIP/important guest")
        
        guest_details.append({
            "name": g["name"],
            "category": g.get("group_id") or "Uncategorized",
            "context": "; ".join(context_parts) if context_parts else "no special constraints",
        })
    
    # Build natural context about the table
    table_summary = []
    if len(table_categories) == 1:
        table_summary.append(f"all guests are from {list(table_categories.keys())[0]}")
    else:
        main_category = max(table_categories.items(), key=lambda x: x[1])[0]
        table_summary.append(f"mostly {main_category} with some mixing")
    
    guest_list = "\n".join([f"- {g['name']} ({g['category']}) - {g['context']}" for g in guest_details])
    
    prompt = f"""You are explaining wedding seating decisions to the user. For each guest, provide ONE natural, concise sentence explaining the meaningful reason for their seating.

TABLE CONTEXT:
This table has {len(table_guests)} guests. {', '.join(table_summary)}.

GUESTS AT THIS TABLE:
{guest_list}

INSTRUCTIONS:
1. Write in THIRD PERSON (e.g., "Sarah Cohen sits with..." NOT "You sit...")
2. ONE complete sentence per guest - be concise and meaningful
3. DO NOT state the obvious (don't say "Sarah sits at Table 1" - the user already knows where they sit)
4. Focus on the MEANINGFUL reason:
   - If seated with family/friends: mention it naturally (e.g., "sits with family members")
   - If a seating request was fulfilled: mention it briefly (e.g., "seated here to fulfill the request with...")
   - If there's a CONFLICT: mention it elegantly and briefly (e.g., "placed here despite a seating constraint with...")
   - If seated due to lack of better options: mention it naturally (e.g., "sits here due to lack of other appropriate seating options")
   - If VIP/important: mention it subtly if relevant
5. Be natural and conversational - avoid technical terms like "optimization", "weights", "cohesion", "algorithm"
6. Complete each explanation fully before moving to the next guest

OUTPUT FORMAT:
Guest: [Full Name]
Explanation: [ONE natural sentence]

EXAMPLES OF GOOD EXPLANATIONS:
Guest: Sarah Cohen
Explanation: Sarah sits with her family members as part of the traditional seating arrangement.

Guest: Rachel Cohen
Explanation: Rachel sits with the family even due to lack of other appropriate seating options.

Guest: Emma Johnson
Explanation: Emma is placed here to balance the table composition.

Now generate ONE natural, concise sentence for each of the {len(table_guests)} guests:"""

    try:
        # Reduced max_tokens since we're generating one sentence per guest
        logger.debug(f"Calling LLM for {table_name} explanations | model=gpt-4")
        llm_start_time = time.time()
        response = gpt(prompt, model="gpt-4", temperature=0.7, max_tokens=400, n=1)[0]
        llm_duration_ms = (time.time() - llm_start_time) * 1000
        logger.debug(f"LLM response received | {llm_duration_ms:.0f}ms | response_len={len(response)}")
        
        # Parse the response to extract individual explanations
        explanations = {}
        current_guest = None
        current_explanation = []
        
        lines = response.split('\n')
        for line in lines:
            line = line.strip()
            if not line:
                # Empty line - if we have a guest and explanation, save it
                if current_guest and current_explanation:
                    explanations[current_guest] = ' '.join(current_explanation).strip()
                    current_guest = None
                    current_explanation = []
                continue
                
            # Check for "Guest:" pattern (case insensitive, with or without colon)
            if line.lower().startswith('guest'):
                # Save previous guest if exists
                if current_guest and current_explanation:
                    explanations[current_guest] = ' '.join(current_explanation).strip()
                # Extract guest name
                parts = line.split(':', 1)
                if len(parts) > 1:
                    current_guest = parts[1].strip()
                else:
                    # Try to extract name after "Guest"
                    name_part = line.replace('Guest', '').strip()
                    if name_part:
                        current_guest = name_part
                current_explanation = []
            elif line.lower().startswith('explanation'):
                # Extract explanation text (should be one sentence)
                parts = line.split(':', 1)
                if len(parts) > 1:
                    explanation_text = parts[1].strip()
                    if explanation_text:
                        current_explanation.append(explanation_text)
            elif current_guest and line:
                # Continuation of explanation (shouldn't happen with one sentence, but handle it)
                if not line.lower().startswith(('guest', 'explanation', '---', '===')):
                    current_explanation.append(line)
        
        # Save last guest
        if current_guest and current_explanation:
            explanations[current_guest] = ' '.join(current_explanation).strip()
        
        # Map guest names back to IDs (fuzzy matching for robustness)
        name_to_id = {g["name"]: g["id"] for g in table_guests}
        # Also create lowercase mapping for case-insensitive matching
        name_to_id_lower = {g["name"].lower(): g["id"] for g in table_guests}
        
        result = {}
        for name, explanation in explanations.items():
            # Try exact match first
            guest_id = name_to_id.get(name)
            if not guest_id:
                # Try case-insensitive match
                guest_id = name_to_id_lower.get(name.lower())
            if guest_id and explanation:
                result[guest_id] = explanation
        
        # If parsing failed or incomplete, provide fallback explanations for missing guests
        fallback_count = 0
        for g in table_guests:
            if g["id"] not in result:
                # Create natural fallback explanation in third person
                guest_name = g["name"]
                category = g.get("group_id") or "Uncategorized"

                # Build natural explanation
                if "Family" in category:
                    explanation = f"{guest_name} sits with family members as part of the seating arrangement."
                else:
                    explanation = f"{guest_name} is seated here as part of the optimized arrangement."

                result[g["id"]] = explanation
                fallback_count += 1

        batch_duration_ms = (time.time() - batch_start_time) * 1000
        logger.debug(f"{table_name} explanations complete | parsed={len(result) - fallback_count} fallback={fallback_count} | {batch_duration_ms:.0f}ms")

        return result
        
    except Exception as e:
        # Fallback if LLM call fails
        batch_duration_ms = (time.time() - batch_start_time) * 1000
        logger.error(f"LLM explanation failed for {table_name} | error={type(e).__name__}: {e} | {batch_duration_ms:.0f}ms")
        logger.info(f"Using fallback explanations for {table_name}")

        fallback_explanations = {}
        for g in table_guests:
            guest_name = g["name"]
            category = g.get("group_id") or "Uncategorized"

            if "Family" in category:
                fallback_explanations[g["id"]] = f"{guest_name} sits with family members as part of the seating arrangement."
            else:
                fallback_explanations[g["id"]] = f"{guest_name} is seated here as part of the optimized arrangement."
        return fallback_explanations


@app.post("/api/layouts/explain-guests")
def explain_guests_seating(req: ExplainGuestsRequest) -> Dict[str, Any]:
    """
    Generate explanations for all guests, batched by table.
    Returns a dict mapping guest_id -> explanation.
    """
    req_id = set_request_id()
    request_start_time = time.time()

    logger.info("=" * 50)
    logger.info(f"POST /api/layouts/explain-guests | guests={len(req.guests)} tables={len(req.tables)}")
    logger.info(f"Strategy: {req.notes}")

    assignments = req.layout.get("assignments", {})
    all_guests_dict = {g.id: g.dict() for g in req.guests}
    all_tables_dict = {t.id: t.dict() for t in req.tables}

    # Group guests by table
    table_to_guests: Dict[str, List[Dict[str, Any]]] = {}
    for guest_id, table_id in assignments.items():
        if table_id not in table_to_guests:
            table_to_guests[table_id] = []
        if guest_id in all_guests_dict:
            table_to_guests[table_id].append(all_guests_dict[guest_id])

    logger.debug(f"Guests grouped into {len(table_to_guests)} tables")

    # Generate explanations for each table (batched)
    all_explanations: Dict[str, str] = {}
    tables_list = list(req.tables)

    for table_idx, (table_id, table_guests) in enumerate(table_to_guests.items()):
        if not table_guests or table_id not in all_tables_dict:
            continue

        table = all_tables_dict[table_id]
        table_index = next((i for i, t in enumerate(tables_list) if t.id == table_id), 0)

        logger.debug(f"Processing table {table_idx + 1}/{len(table_to_guests)} | {table.get('name', table_id)} | {len(table_guests)} guests")

        # Generate batch explanation for this table
        table_explanations = _explain_guests_batch(
            table_guests=table_guests,
            table=table,
            table_index=table_index,
            all_tables=[t.dict() for t in req.tables],
            all_guests=[g.dict() for g in req.guests],
            assignments=assignments,
            weights=req.weights,
            notes=req.notes,
        )

        all_explanations.update(table_explanations)

    request_duration_ms = (time.time() - request_start_time) * 1000
    logger.info(f"Generated {len(all_explanations)} guest explanations | {request_duration_ms:.0f}ms")
    logger.info("=" * 50)

    return {"explanations": all_explanations}



