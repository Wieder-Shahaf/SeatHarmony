from typing import Any, Dict, List, Optional, Tuple
from pathlib import Path
import os

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
    # .env is already loaded at module import time (above)
    # Just verify the key is available
    gemini_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    openai_key = os.getenv("OPENAI_API_KEY")
    
    if gemini_key:
        print(f"✓ GEMINI_API_KEY found in environment")
    elif openai_key:
        print(f"✓ OPENAI_API_KEY found in environment")
    else:
        print("⚠ Warning: No API key found. Set GEMINI_API_KEY or OPENAI_API_KEY in .env file")
        print(f"  (Looked for .env at: {env_file} or {Path(__file__).parent / '.env'})")


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
        response = gpt(prompt, model="gpt-4", temperature=0.7, max_tokens=400, n=1)[0]
        
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
        
        return result
        
    except Exception as e:
        # Fallback if LLM call fails
        print(f"Error generating explanations: {e}")
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
    
    # Generate explanations for each table (batched)
    all_explanations: Dict[str, str] = {}
    tables_list = list(req.tables)
    
    for table_id, table_guests in table_to_guests.items():
        if not table_guests or table_id not in all_tables_dict:
            continue
        
        table = all_tables_dict[table_id]
        table_index = next((i for i, t in enumerate(tables_list) if t.id == table_id), 0)
        
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
    
    return {"explanations": all_explanations}



