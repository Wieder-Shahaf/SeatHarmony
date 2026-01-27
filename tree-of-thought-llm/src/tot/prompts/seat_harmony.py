"""
Prompts for SeatHarmony Tree-of-Thoughts task.
These prompts guide the LLM to propose weight modifications and evaluate layouts.
"""

# Prompt for proposing weight modifications (thought generation)
propose_prompt = '''You are helping optimize wedding seating arrangements. The current objective weights are:
{current_weights}

Context: {context}

Propose a modification to the weights to improve the seating layout. Consider:
- family_cohesion: How strongly to keep family members together (0.0-1.0)
- social_group_cohesion: How strongly to keep friend groups together (0.0-1.0)  
- side_mixing: How much to encourage mixing between groom's and bride's sides (0.0-1.0)
- relationship_priority: How much to prioritize closer relationships for better tables (0.0-1.0)

Suggest a specific weight modification strategy. Examples:
- "Increase family_cohesion to 0.9 to keep families together"
- "Increase side_mixing to 0.7 to encourage more interaction between sides"
- "Balance all weights at 0.6 for a neutral approach"

Your proposal:
'''

# Prompt for evaluating a layout (value estimation)
value_prompt = '''Evaluate this wedding seating layout:

Context: {context}

Layout: {layout}

Rate the quality of this layout on a scale of 0-10, considering:
1. Are family members seated together appropriately?
2. Are social groups (friends, colleagues) kept together?
3. Is there appropriate mixing between groom's and bride's sides?
4. Are important guests (family, close friends) at good tables?
5. Are there any obvious conflicts or awkward placements?

Provide a single numeric score (0-10) and a brief explanation.
Score: '''

# Standard prompt for initial layout generation (if needed)
standard_prompt = '''Generate an initial wedding seating layout with these weights:
- family_cohesion: {family_cohesion}
- social_group_cohesion: {social_group_cohesion}
- side_mixing: {side_mixing}
- relationship_priority: {relationship_priority}

Guest categories: {categories}
Number of tables: {num_tables}

Describe the seating strategy:
'''

# CoT (Chain of Thought) prompt for step-by-step reasoning
cot_prompt = '''Generate a wedding seating layout step by step.

Current weights:
- family_cohesion: {family_cohesion}
- social_group_cohesion: {social_group_cohesion}
- side_mixing: {side_mixing}
- relationship_priority: {relationship_priority}

Guest information: {guests_info}
Tables: {tables_info}

Think step by step:
1. Identify family groups that should sit together
2. Identify social groups (friends, colleagues) that should sit together
3. Consider which tables should have mixed sides vs. separated sides
4. Assign important guests to better tables
5. Finalize the complete seating arrangement

Step-by-step reasoning:
'''

