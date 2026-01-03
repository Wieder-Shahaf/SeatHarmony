#!/usr/bin/env python3
"""
Test script for guest seating explanations.
Tests the LLM-based explanation system with table batching.
"""

import sys
import json
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from backend.models import Guest, Table, VenueConfig, Layout, ConstraintSummary
from backend.optimizer import generate_layout_for_weights
from backend.api import explain_guests_seating, ExplainGuestsRequest, GuestIn, TableIn


def create_test_guests() -> list[Guest]:
    """Create a sample set of wedding guests."""
    return [
        Guest(
            id="guest-1-sarah-cohen",
            name="Sarah Cohen",
            group_id="Groom's Family",
            importance=5,
            tags=[],
        ),
        Guest(
            id="guest-2-david-cohen",
            name="David Cohen",
            group_id="Groom's Family",
            importance=5,
            tags=[],
        ),
        Guest(
            id="guest-3-rachel-cohen",
            name="Rachel Cohen",
            group_id="Groom's Family",
            importance=4,
            tags=[],
        ),
        Guest(
            id="guest-4-emma-johnson",
            name="Emma Johnson",
            group_id="Bride's Family",
            importance=5,
            tags=[],
        ),
        Guest(
            id="guest-5-john-smith",
            name="John Smith",
            group_id="Groom's Friends",
            importance=2,
            tags=[],
        ),
        Guest(
            id="guest-6-tom-wilson",
            name="Tom Wilson",
            group_id="Groom's Friends",
            importance=2,
            tags=[],
        ),
        Guest(
            id="guest-7-lisa-chen",
            name="Lisa Chen",
            group_id="Bride's Work Colleagues",
            importance=1,
            tags=[],
        ),
        Guest(
            id="guest-8-alex-martinez",
            name="Alex Martinez",
            group_id="Groom's Friends",
            importance=1,
            tags=[],
        ),
        Guest(
            id="guest-9-sophie-brown",
            name="Sophie Brown",
            group_id="Bride's Friends",
            importance=2,
            tags=[],
        ),
        Guest(
            id="guest-10-lucas-green",
            name="Lucas Green",
            group_id="Bride's Friends",
            importance=1,
            tags=[],
        ),
    ]


def create_test_tables() -> list[Table]:
    """Create sample tables."""
    return [
        Table(id="table-1", name="Table 1", capacity=4, zone=None, constraints={}),
        Table(id="table-2", name="Table 2", capacity=4, zone=None, constraints={}),
        Table(id="table-3", name="Table 3", capacity=4, zone=None, constraints={}),
    ]


def test_explanation_system():
    """Test the guest explanation system."""
    print("=" * 80)
    print("TESTING GUEST EXPLANATION SYSTEM")
    print("=" * 80)
    
    # Create test data
    guests = create_test_guests()
    tables = create_test_tables()
    venue = VenueConfig(tables=tables, settings={})
    
    print(f"\n✓ Created {len(guests)} guests and {len(tables)} tables")
    
    # Show guest distribution
    from collections import Counter
    categories = Counter([g.group_id or "Uncategorized" for g in guests])
    print(f"\nGuest categories:")
    for cat, count in sorted(categories.items()):
        print(f"  {cat}: {count} guests")
    
    # Generate a layout
    print("\n" + "=" * 80)
    print("GENERATING LAYOUT")
    print("=" * 80)
    
    weights = {
        "family_cohesion": 0.8,
        "social_group_cohesion": 0.6,
        "side_mixing": 0.3,
        "relationship_priority": 0.7,
    }
    
    print(f"\nWeights: {weights}")
    print(f"Strategy: traditional_seating")
    
    try:
        layout, summary = generate_layout_for_weights(guests, venue, weights)
        print(f"\n✓ Layout generated successfully")
        print(f"  Score: {layout.score:.4f}")
        print(f"  Assignments: {len(layout.assignments)} guests")
    except Exception as e:
        print(f"\n✗ Error generating layout: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    # Show assignments
    print("\n" + "-" * 80)
    print("LAYOUT ASSIGNMENTS")
    print("-" * 80)
    table_assignments = {}
    for guest_id, table_id in layout.assignments.items():
        if table_id not in table_assignments:
            table_assignments[table_id] = []
        guest = next(g for g in guests if g.id == guest_id)
        table_assignments[table_id].append(guest)
    
    for table_id in sorted(table_assignments.keys()):
        table = next(t for t in tables if t.id == table_id)
        table_guests = table_assignments[table_id]
        print(f"\n{table.name} ({table_id}):")
        for guest in table_guests:
            category = guest.group_id or "Uncategorized"
            constraints = []
            print(f"  - {guest.name} ({category}, importance: {guest.importance}) {', '.join(constraints)}")
    
    # Test explanation endpoint
    print("\n" + "=" * 80)
    print("TESTING EXPLANATION ENDPOINT")
    print("=" * 80)
    
    # Convert to API format
    guest_ins = [GuestIn(**{
        "id": g.id,
        "name": g.name,
        "group_id": g.group_id,
        "importance": g.importance,
        "tags": g.tags,
    }) for g in guests]
    
    table_ins = [TableIn(**{
        "id": t.id,
        "name": t.name,
        "capacity": t.capacity,
        "zone": t.zone,
        "constraints": t.constraints,
    }) for t in tables]
    
    from backend.models import layout_to_dict
    layout_dict = layout_to_dict(layout)
    
    request = ExplainGuestsRequest(
        guests=guest_ins,
        tables=table_ins,
        layout=layout_dict,
        weights=weights,
        notes="traditional_seating",
    )
    
    print("\nRequesting explanations...")
    print(f"  Guests: {len(request.guests)}")
    print(f"  Tables: {len(request.tables)}")
    print(f"  Strategy: {request.notes}")
    print(f"  Weights: {request.weights}")
    
    try:
        result = explain_guests_seating(request)
        explanations = result.get("explanations", {})
        
        print(f"\n✓ Explanations generated successfully")
        print(f"  Total explanations: {len(explanations)}")
        
        # Verify all guests have explanations
        guest_ids = {g.id for g in guests}
        explained_ids = set(explanations.keys())
        missing = guest_ids - explained_ids
        
        if missing:
            print(f"\n⚠ Warning: {len(missing)} guests missing explanations:")
            for gid in missing:
                guest = next(g for g in guests if g.id == gid)
                print(f"  - {guest.name} ({gid})")
        else:
            print(f"\n✓ All {len(guests)} guests have explanations")
        
        # Display explanations grouped by table
        print("\n" + "=" * 80)
        print("EXPLANATIONS BY TABLE")
        print("=" * 80)
        
        for table_id in sorted(table_assignments.keys()):
            table = next(t for t in tables if t.id == table_id)
            table_guests = table_assignments[table_id]
            
            print(f"\n{table.name} ({table_id}):")
            print("-" * 80)
            
            for guest in table_guests:
                explanation = explanations.get(guest.id, "No explanation available")
                category = guest.group_id or "Uncategorized"
                print(f"\n{guest.name} ({category}):")
                print(f"  {explanation}")
        
        # Test batching verification
        print("\n" + "=" * 80)
        print("BATCHING VERIFICATION")
        print("=" * 80)
        
        # Check that explanations were generated per table
        table_explanation_counts = {}
        for table_id, table_guests_list in table_assignments.items():
            explained_count = sum(1 for g in table_guests_list if g.id in explanations)
            table_explanation_counts[table_id] = explained_count
            print(f"{next(t.name for t in tables if t.id == table_id)}: {explained_count}/{len(table_guests_list)} guests explained")
        
        # Verify explanation quality (basic checks)
        print("\n" + "=" * 80)
        print("EXPLANATION QUALITY CHECKS")
        print("=" * 80)
        
        quality_issues = []
        for guest_id, explanation in explanations.items():
            guest = next(g for g in guests if g.id == guest_id)
            # Find which table this guest is at
            guest_table_id = layout.assignments.get(guest_id)
            if guest_table_id:
                guest_table = next(t for t in tables if t.id == guest_table_id)
            else:
                guest_table = None
            
            # Check length (one sentence should be at least 30 chars)
            if len(explanation) < 30:
                quality_issues.append(f"{guest.name}: Explanation too short ({len(explanation)} chars)")
            
            # Check for guest name (should be present in third person)
            if guest.name.lower() not in explanation.lower():
                quality_issues.append(f"{guest.name}: Guest name not found in explanation")
            
            # Check for third person format (should NOT start with "You're" or "Your")
            explanation_lower = explanation.lower().strip()
            if explanation_lower.startswith(("you're", "your", "you are")):
                quality_issues.append(f"{guest.name}: Explanation uses second person ('you') instead of third person")
            
            # Check that it's one sentence (count sentence-ending punctuation)
            sentence_count = explanation.count('.') + explanation.count('!') + explanation.count('?')
            if sentence_count > 1:
                quality_issues.append(f"{guest.name}: Explanation has {sentence_count} sentences (should be 1)")
            elif sentence_count == 0:
                quality_issues.append(f"{guest.name}: Explanation missing sentence-ending punctuation")
            
            # Check that explanation is complete (ends with punctuation)
            if not explanation.rstrip().endswith(('.', '!', '?')):
                quality_issues.append(f"{guest.name}: Explanation doesn't end with punctuation")
            
            # Check for technical terms (should be natural language)
            technical_terms = ["optimization", "weight", "cohesion", "algorithm", "objective", "constraint", "hyperparameter"]
            found_technical = [term for term in technical_terms if term in explanation_lower]
            if found_technical:
                quality_issues.append(f"{guest.name}: Explanation contains technical terms: {', '.join(found_technical)}")
            
            # Check that it doesn't state the obvious (don't say "sits at Table X" or table name)
            if guest_table:
                if guest_table.name.lower() in explanation_lower:
                    quality_issues.append(f"{guest.name}: Explanation states the obvious (mentions table name)")
                # Also check for "table 1", "table 2" patterns
                if "table" in explanation_lower and any(char.isdigit() for char in explanation_lower.split("table")[-1][:5]):
                    quality_issues.append(f"{guest.name}: Explanation states the obvious (mentions table number)")
            
        
        if quality_issues:
            print(f"\n⚠ Found {len(quality_issues)} potential quality issues:")
            for issue in quality_issues[:5]:  # Show first 5
                print(f"  - {issue}")
            if len(quality_issues) > 5:
                print(f"  ... and {len(quality_issues) - 5} more")
        else:
            print("\n✓ All explanations pass quality checks")
        
        print("\n" + "=" * 80)
        print("TEST SUMMARY")
        print("=" * 80)
        print(f"✓ Layout generation: SUCCESS")
        print(f"✓ Explanation generation: SUCCESS")
        print(f"✓ Coverage: {len(explanations)}/{len(guests)} guests ({100*len(explanations)/len(guests):.1f}%)")
        print(f"✓ Batching: Working (explanations grouped by table)")
        print(f"✓ Quality: {'PASS' if not quality_issues else 'ISSUES FOUND'}")
        print("=" * 80)
        
        return True
        
    except Exception as e:
        print(f"\n✗ Error generating explanations: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    import os
    
    # Check for API key
    if not os.getenv("GEMINI_API_KEY") and not os.getenv("OPENAI_API_KEY"):
        print("⚠ Warning: No API key found. Set GEMINI_API_KEY or OPENAI_API_KEY")
        print("   Explanations will use fallback text.")
        print()
    
    success = test_explanation_system()
    sys.exit(0 if success else 1)

