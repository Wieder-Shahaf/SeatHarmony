# SeatHarmony Review Plan

## Part 1: UI Text Copywriting Review

### Overview
SeatHarmony is a wedding seating arrangement app with 7 main pages: Landing, Dashboard, Venue Selection, Recommendations, Planner AI, Confirmation, and Export Dashboard.

---

### Page-by-Page Analysis

#### 1. Landing Page (`/pages/LandingPage.tsx`)

**Pros:**
- Clear value proposition: "AI-Powered Planning" badge immediately communicates the tech approach
- Action-oriented CTA: "Create harmonious seating plans without the stress"
- Feature cards use benefit-focused language ("Save hours", "Visualize your reception")
- Error messages are specific and actionable (tells users exactly what's wrong)

**Cons:**
- "How it Works" button text is generic - doesn't create urgency
- "Supports .xlsx, .xls, .csv up to 10MB" is technical jargon for wedding planners
- Instructions modal headline "Prepare Your Guest List" is task-focused, not benefit-focused
- Example names "Jane Doe" and "John Smith" are generic placeholders - could use more wedding-appropriate names

**Suggestions:**
| Current | Suggested | Reason |
|---------|-----------|--------|
| "How it Works" | "See How Easy It Is" | More inviting, less formal |
| "Supports .xlsx, .xls, .csv up to 10MB" | "Works with Excel and spreadsheet files" | Simpler, non-technical |
| "Prepare Your Guest List" | "Get Your Guest List Ready in 3 Steps" | Adds clarity and reduces perceived effort |
| "Jane Doe / John Smith" | "Sarah Mitchell / James Parker" | More realistic wedding guest names |
| "Perfect Match" (floating card) | Keep as-is | Effective emotional hook |

---

#### 2. Dashboard (`/pages/Dashboard.tsx`)

**Pros:**
- "Guest Group Overview" is clear and descriptive
- Stats cards (Total Guests, Groups, Uncategorized) provide at-a-glance status
- "Continue to Venue" CTA is action-oriented
- "All categorized" vs "X uncategorized" provides clear completion status

**Cons:**
- "Guests Pending" is ambiguous - pending what? Categorization? Confirmation?
- "Tap to flip hint" assumes touchscreen - not all users are on mobile
- "Groups Detected" stat title is passive - doesn't explain what this means
- Header description is a run-on sentence that's hard to scan

**Suggestions:**
| Current | Suggested | Reason |
|---------|-----------|--------|
| "Guests Pending" | "Need Categories" or "Uncategorized" | Clearer intent |
| "Tap to flip hint" | "Click to see guests" | Device-agnostic |
| "Groups Detected" | "Guest Groups" | Simpler, less technical |
| Long header description | Break into: "Review your guest groups below." + "Well-organized groups help the AI seat everyone with people they know." | Better scannability |

---

#### 3. Venue Selection (`/pages/VenueSelection.tsx`)

**Pros:**
- "Select Your Venue Layout" is clear and direct
- "Too Small" warning badge is helpful and prevents errors
- "Popular" badge creates social proof
- Filter options (Indoor, Outdoor, Banquet, Intimate) are intuitive

**Cons:**
- "{count}x {type} ({capacity} seats)" format is dense - "10x Round (10 seats)" is confusing
- "Select" / "Selected" toggle text is minimal - could confirm the action better
- No explanation of what selecting a venue does or why it matters

**Suggestions:**
| Current | Suggested | Reason |
|---------|-----------|--------|
| "10x Round (10 seats)" | "10 round tables, 10 seats each" | More readable |
| "Select" button | "Choose This Venue" | More decisive action |
| "Selected" state | "Selected" (keep as-is, add checkmark) | Clear confirmation |
| Add description | "Pick a layout that matches your event space. We'll arrange your guests across these tables." | Sets expectations |

---

#### 4. Recommendations (`/pages/Recommendations.tsx`)

**Pros:**
- "Optimized Seating Plans" is clear
- "We Found Your Optimal Seating!" creates positive momentum
- Harmony Profile visualization (Family Cohesion, Social Groups, Mixing) is transparent
- Strategy labels (Balanced Harmony, Family Focused, etc.) help users understand trade-offs

**Cons:**
- "Harmonizing your seating plan..." loading text is vague about progress
- "Couldn't reach the ToT backend" is technical jargon users won't understand
- "Social Butterfly" and "Mix & Mingle" strategy names are ambiguous - what do they actually do?
- "Issues: X constraints could not be met" is negative framing without explanation

**Suggestions:**
| Current | Suggested | Reason |
|---------|-----------|--------|
| "Harmonizing your seating plan..." | "Creating your seating options... (this may take a minute)" | Sets time expectations |
| "Couldn't reach the ToT backend" | "We're having trouble connecting. Please check your internet and try again." | User-friendly error |
| "Social Butterfly" | "Friend Groups Together" | Clearer meaning |
| "Mix & Mingle" | "Mix Bride & Groom Sides" | Specific action |
| "Issues: X constraints could not be met" | "Note: X guests couldn't be seated with their preferred group" | Constructive framing |

---

#### 5. Planner AI (`/pages/PlannerAI.tsx`)

**Pros:**
- "Guest List" sidebar is intuitive
- "Unseated (X)" filter quickly identifies problems
- "AI Insight" feature adds transparency to decisions
- Zoom controls are standard and clear

**Cons:**
- "No category" filter option is unclear - "No category" of what?
- "Click to load explanation" is passive - should happen automatically or explain why it's manual
- "Generating insight..." could take varying time - no indication of progress
- "No specific insight available for this assignment" is a dead-end with no next step

**Suggestions:**
| Current | Suggested | Reason |
|---------|-----------|--------|
| "No category" | "Ungrouped Guests" | Clearer meaning |
| "Click to load explanation" | "Click to see why they're seated here" | Benefit-focused |
| "Generating insight..." | "Getting AI explanation..." | More specific |
| "No specific insight available" | "This guest was placed to balance table sizes. Drag to move them." | Actionable fallback |

---

#### 6. Confirmation (`/pages/Confirmation.tsx`)

**Pros:**
- "Finalize & Export" is clear and final-feeling
- "Everyone is seated!" completion message is positive
- "Great job! Everyone has a seat." reinforces accomplishment
- Summary sidebar provides quick status check

**Cons:**
- "X guests remaining" + "Some guests still need seats" is repetitive
- "Export PDF" and "Confirm & Print" CTAs are confusing - what's the difference?
- "Table Details" section title is generic
- "Dance Floor" label appears without context on the visual

**Suggestions:**
| Current | Suggested | Reason |
|---------|-----------|--------|
| "X guests remaining / Some guests still need seats" | "X guests still need seats" (single line) | Remove redundancy |
| "Export PDF" / "Confirm & Print" | "Download PDF" / "Print Now" | Clearer distinction |
| "Table Details" | "Guest List by Table" | More descriptive |
| Add dance floor context | Add legend item or tooltip | Explains the UI element |

---

#### 7. Export Dashboard (`/pages/ExportDashboard.tsx`)

**Pros:**
- "Seating Plan Optimized!" is celebratory and clear
- Success message explains what happened and why it matters
- Export options (Excel, PDF, Share) cover common needs
- Settings toggles (Dietary, Vendor Count, High-Res) are helpful customizations

**Cons:**
- "Harmony Score" stat has no explanation - what does 85 mean? Is 100 perfect?
- "Download Final Excel" vs "Download PDF Map" - inconsistent naming (Final vs Map)
- "Share Link" is vague - share to where? Does it create a public link?
- Quote at bottom ("Love is the master key...") is unattributed and feels random

**Suggestions:**
| Current | Suggested | Reason |
|---------|-----------|--------|
| "Harmony Score" | "Harmony Score" + tooltip: "How well guests are grouped with people they know (out of 100)" | Adds meaning |
| "Download Final Excel" | "Download Seating List (Excel)" | Consistent format |
| "Download PDF Map" | "Download Floor Plan (PDF)" | Consistent format |
| "Share Link" | "Copy Shareable Link" | Clearer action |
| Remove quote or attribute | Either remove or add author | Feels incomplete |

---

### Global Issues

1. **Inconsistent Terminology:**
   - "Categories" vs "Groups" used interchangeably
   - "Guests" vs "People" inconsistent
   - "Layout" vs "Plan" vs "Arrangement" all mean the same thing

2. **Technical Language Leakage:**
   - "ToT backend" error visible to users
   - "Constraints" is optimization jargon
   - ".xlsx, .xls, .csv" file extensions shown

3. **Missing Microcopy:**
   - No tooltips on Harmony Profile percentages
   - No explanation of what "Mixing" means
   - No guidance when users hit dead-ends

4. **Tone Inconsistencies:**
   - Landing page is warm and inviting
   - Error messages are technical and cold
   - Export page swings to overly celebratory

---

### Recommended Terminology Standardization

| Instead of... | Use... |
|---------------|--------|
| Categories | Groups |
| Layout/Plan/Arrangement | Seating Plan |
| Constraints | Preferences |
| Cohesion | Togetherness |
| Side Mixing | Mixing Sides |
| ToT/Backend errors | "Connection issue" |

---

## Part 2: Empty Table Consolidation Strategy

> **Note:** The UI copywriting review above is for reference only - no code changes will be made for the UI text.

### Current Behavior (Problem)
The Gurobi optimizer in `backend/optimizer.py` has:
- **No lower-bound constraints** on table occupancy
- **No objective term** penalizing empty tables
- **No post-processing** to consolidate empty tables

This means empty tables can be scattered randomly throughout the venue (e.g., Table 3 empty, Table 7 empty, Table 12 empty).

### Goal
All empty tables should be grouped together at the **highest table numbers**. For example, if there are 3 empty tables out of 15, Tables 13, 14, and 15 should be empty while Tables 1-12 are occupied.

**Important:** Keep original table IDs - reassign guests to fill lower-numbered tables first.

### Chosen Approach: Soft Constraint + Post-Processing (Both)

This two-pronged approach ensures:
1. The optimizer **naturally prefers** filling lower-numbered tables (soft constraint)
2. Any remaining gaps are **guaranteed to be eliminated** (post-processing)

---

### Step 1: Soft Constraint in Objective Function
**Location:** `backend/optimizer.py` - objective function section (~line 350-380)

**Logic:**
Add a penalty term that discourages using higher-numbered tables when lower ones have capacity:

```python
# Create table order mapping (Table 1 -> 0, Table 2 -> 1, etc.)
table_order = {t_id: idx for idx, t_id in enumerate(sorted(table_ids, key=extract_table_number))}

# Penalty for using higher-numbered tables
# Small weight to not override cohesion/mixing objectives
TABLE_ORDER_PENALTY_WEIGHT = 0.01

table_usage_penalty = quicksum(
    table_order[t_id] * quicksum(x[g_id, t_id] for g_id in guest_ids)
    for t_id in table_ids
)

# Subtract from objective (we want to maximize, so penalty is negative)
objective -= TABLE_ORDER_PENALTY_WEIGHT * table_usage_penalty
```

**Why this weight (0.01):**
- Small enough to not override cohesion/mixing objectives (which use weights 0.3-0.9)
- Large enough to break ties when multiple tables have equal cohesion value
- Acts as a "tiebreaker" - all else being equal, prefer lower tables

---

### Step 2: Post-Processing Reassignment
**Location:** `backend/optimizer.py` - after solution extraction (~line 440)

**Logic:**
After Gurobi returns assignments, reassign guests so they fill tables from lowest to highest:

```python
def consolidate_to_lower_tables(
    assignments: Dict[str, str],
    table_ids: List[str],
    table_capacities: Dict[str, int]
) -> Dict[str, str]:
    """
    Reassign guests so they fill the lowest-numbered tables first.
    Keeps original table IDs - just moves guests between tables.

    Example:
    - Before: {g1: "Table 3", g2: "Table 3", g3: "Table 5"} (Tables 1,2,4 empty)
    - After:  {g1: "Table 1", g2: "Table 1", g3: "Table 2"} (Tables 3,4,5 empty)
    """
    # Helper to extract table number for sorting
    def extract_table_num(t_id: str) -> int:
        parts = t_id.split()
        return int(parts[-1]) if parts[-1].isdigit() else 0

    # Sort tables by number (lowest first)
    sorted_tables = sorted(table_ids, key=extract_table_num)

    # Group guests by their current table, preserving table groupings
    table_guests: Dict[str, List[str]] = {}
    for guest_id, table_id in assignments.items():
        if table_id not in table_guests:
            table_guests[table_id] = []
        table_guests[table_id].append(guest_id)

    # Get list of occupied tables in order
    occupied_tables = [t for t in sorted_tables if t in table_guests]

    # Reassign: move each group of guests to the next available low-numbered table
    new_assignments: Dict[str, str] = {}
    target_table_idx = 0

    for source_table in occupied_tables:
        guests_to_move = table_guests[source_table]
        target_table = sorted_tables[target_table_idx]

        for guest_id in guests_to_move:
            new_assignments[guest_id] = target_table

        target_table_idx += 1

    return new_assignments
```

**Key behavior:**
- Preserves guest groupings within tables (doesn't split groups)
- Only reassigns which table ID each group is assigned to
- Empty tables end up at highest numbers (Table 13, 14, 15)

---

### Files to Modify

1. **`backend/optimizer.py`**
   - Add `extract_table_number()` helper function
   - Add table order penalty to objective function (~line 350-380)
   - Add `consolidate_to_lower_tables()` function
   - Call consolidation after solution extraction (~line 445)

2. **`backend/api.py`** (if needed)
   - Ensure consolidated assignments are passed through correctly
   - No changes expected if optimizer returns the modified assignments

---

### Testing Checklist
- [ ] Test with more tables than needed (e.g., 100 guests, 15 tables of 10)
- [ ] Verify empty tables are always at highest numbers
- [ ] Verify guest groupings are preserved (same people at same table)
- [ ] Verify no impact on optimization quality (cohesion/mixing scores)
- [ ] Test edge cases: all tables full, only 1 guest, single table

---

## Implementation Summary

### UI Copywriting Review
**Status:** Report only - no code changes

The detailed analysis above serves as a reference document for future UI improvements. Key areas identified:
- Terminology inconsistencies (Categories vs Groups)
- Technical jargon in error messages
- Ambiguous strategy names in Recommendations page
- Missing tooltips and explanations

### Empty Table Consolidation
**Status:** To be implemented

**Changes to make in `backend/optimizer.py`:**

1. Add helper function `extract_table_number(table_id: str) -> int`

2. Add soft constraint to objective function:
   - Create `table_order` mapping
   - Add `TABLE_ORDER_PENALTY_WEIGHT = 0.01`
   - Subtract penalty from objective

3. Add `consolidate_to_lower_tables()` function

4. Call consolidation after extracting assignments from Gurobi solution

**Expected outcome:**
- Optimizer naturally prefers lower-numbered tables
- Post-processing guarantees no scattered empty tables
- Empty tables always at highest numbers (e.g., Table 13, 14, 15)
- Guest groupings preserved within tables
