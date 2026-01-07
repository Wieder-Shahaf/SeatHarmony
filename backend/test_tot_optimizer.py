#!/usr/bin/env python3
"""
Test script for Tree-of-Thought (ToT) + Optimizer integration.
Tests different weight configurations (thoughts) and evaluates their layouts.
"""

import sys
import time
import pandas as pd
from pathlib import Path
from typing import List, Dict
from collections import Counter

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from backend.models import Guest, Table, VenueConfig
from backend.seat_harmony_task import SeatHarmonyTask, SeatHarmonyState


def read_guests_from_excel(file_path: str) -> List[Guest]:
    """Read guests from Excel file. Expects 'Name' and 'Category' columns."""
    df = pd.read_excel(file_path)

    # Find name and category columns (case-insensitive)
    name_col = None
    category_col = None

    # Priority order for name columns
    name_priority = ['Full Guest Name', 'Proper Names', 'Name', 'שם', 'Guest Name', 'Guest_Name']

    for col in df.columns:
        col_str = str(col).strip()
        col_lower = col_str.lower()

        if name_col is None:
            for priority_name in name_priority:
                if col_lower == priority_name.lower():
                    name_col = col
                    break

        if category_col is None:
            if col_lower in ['category', 'קטגוריה', 'group', 'group_id', 'קבוצה']:
                category_col = col

    if name_col is None:
        raise ValueError(f"Could not find name column. Available columns: {list(df.columns)}")

    guests = []
    for idx, row in df.iterrows():
        name = str(row[name_col]).strip()
        if pd.isna(name) or name == '' or name.lower() == 'nan':
            continue

        category = None
        if category_col:
            cat_val = row[category_col]
            if not pd.isna(cat_val):
                category = str(cat_val).strip()
                if category.lower() == 'nan' or category == '':
                    category = None

        guest_id = f"guest-{idx + 1}-{name.lower().replace(' ', '-')}"
        guest = Guest(
            id=guest_id,
            name=name,
            group_id=category,
            importance=0,
            tags=[],
        )
        guests.append(guest)

    return guests


def create_default_tables(guest_count: int, seats_per_table: int = 10) -> List[Table]:
    """Create default tables based on guest count."""
    num_tables = (guest_count + seats_per_table - 1) // seats_per_table
    if num_tables == 0:
        num_tables = 1

    tables = []
    for i in range(num_tables):
        table = Table(
            id=f"table-{i + 1}",
            name=f"Table {i + 1}",
            capacity=seats_per_table,
            zone=None,
            constraints={},
        )
        tables.append(table)

    return tables


def print_layout_summary(layout, guests_by_id: Dict[str, Guest], tables_by_id: Dict[str, Table]):
    """Print a summary of the layout."""
    print(f"\n  Layout Score: {layout.score:.1f}/100")
    breakdown_str = ", ".join([f"{k}: {v:.1f}%" for k, v in layout.objective_breakdown.items()])
    print(f"  Objective Breakdown: {breakdown_str}")

    # Group by table and show category distribution
    table_assignments: Dict[str, List[str]] = {}
    for guest_id, table_id in layout.assignments.items():
        if table_id not in table_assignments:
            table_assignments[table_id] = []
        table_assignments[table_id].append(guest_id)

    # Show category distribution per table
    print(f"\n  Table Category Distribution:")
    for table_id in sorted(table_assignments.keys()):
        table = tables_by_id.get(table_id)
        table_name = table.name if table else table_id
        guests_at_table = table_assignments[table_id]

        categories = Counter()
        for guest_id in guests_at_table:
            guest = guests_by_id.get(guest_id)
            if guest:
                cat = guest.group_id or "Uncategorized"
                categories[cat] += 1

        cat_str = ", ".join([f"{cat}: {cnt}" for cat, cnt in categories.most_common(3)])
        print(f"    {table_name} ({len(guests_at_table)} guests): {cat_str}")


def run_tot_search(guests: List[Guest], tables: List[Table]) -> Dict[str, SeatHarmonyState]:
    """
    Run Tree-of-Thought search over different weight configurations.
    Returns a dictionary of thought -> resulting state.
    """
    task = SeatHarmonyTask()
    venue = VenueConfig(tables=tables, settings={})

    # Create initial state
    initial_state = SeatHarmonyState(
        guests=guests,
        venue=venue,
        weights=task.base_weights.copy()
    )

    # Generate all available thoughts
    thoughts = task.generate_thoughts(initial_state, n_generate=10)

    results = {}

    print("\n" + "=" * 80)
    print("TREE-OF-THOUGHT SEARCH")
    print("=" * 80)
    print(f"\nTesting {len(thoughts)} different weight configurations (thoughts):")

    for thought in thoughts:
        print(f"\n{'─' * 60}")
        print(f"Thought: {thought}")

        start_time = time.time()
        new_state = task.apply_thought(initial_state, thought)
        elapsed = time.time() - start_time

        print(f"  Weights: {new_state.weights}")
        print(f"  Optimization time: {elapsed:.2f}s")

        if new_state.layout:
            results[thought] = new_state
        else:
            print("  ⚠ No layout generated")

    return results


def evaluate_and_rank(results: Dict[str, SeatHarmonyState], guests_by_id: Dict[str, Guest], tables_by_id: Dict[str, Table]):
    """Evaluate and rank all generated layouts."""
    print("\n" + "=" * 80)
    print("EVALUATION & RANKING")
    print("=" * 80)

    # Rank by score
    ranked = sorted(
        [(thought, state) for thought, state in results.items() if state.layout],
        key=lambda x: x[1].layout.score,
        reverse=True
    )

    print(f"\nRanked by optimization score (highest first):\n")
    for rank, (thought, state) in enumerate(ranked, 1):
        print(f"{rank}. {thought}")
        print_layout_summary(state.layout, guests_by_id, tables_by_id)

    return ranked


def main():
    # Default to the example file path
    default_path = "/Users/shahafwieder/Library/CloudStorage/OneDrive-Technion/לימודים/שנה 4/סמסטר ז/Ofek Bernstein's files - מערכות נבונות אינטראקטיביות/Prototype/example.xlsx"

    if len(sys.argv) >= 2:
        excel_path = sys.argv[1]
    else:
        excel_path = default_path

    if not Path(excel_path).exists():
        print(f"Error: File not found: {excel_path}")
        print("\nUsage: python test_tot_optimizer.py [path_to_excel_file]")
        sys.exit(1)

    print(f"Reading Excel file: {excel_path}")
    print("-" * 80)

    try:
        guests = read_guests_from_excel(excel_path)
        print(f"✓ Successfully read {len(guests)} guests")

        # Show category distribution
        categories = Counter([g.group_id or "Uncategorized" for g in guests])
        print(f"\nCategory distribution:")
        for cat, count in sorted(categories.items()):
            print(f"  {cat}: {count} guests")

    except Exception as e:
        print(f"Error reading Excel file: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

    if len(guests) == 0:
        print("Error: No guests found in Excel file")
        sys.exit(1)

    # Create tables
    seats_per_table = 10
    tables = create_default_tables(len(guests), seats_per_table)
    print(f"\n✓ Created {len(tables)} tables ({seats_per_table} seats each)")

    # Create lookup dictionaries
    guests_by_id = {g.id: g for g in guests}
    tables_by_id = {t.id: t for t in tables}

    # Run ToT search
    results = run_tot_search(guests, tables)

    # Evaluate and rank results
    if results:
        ranked = evaluate_and_rank(results, guests_by_id, tables_by_id)

        # Summary
        print("\n" + "=" * 80)
        print("SUMMARY")
        print("=" * 80)

        if ranked:
            best_thought, best_state = ranked[0]
            print(f"\n🏆 Best configuration: {best_thought}")
            print(f"   Score: {best_state.layout.score:.1f}/100")
            print(f"   Weights: {best_state.weights}")
        else:
            print("\n⚠ No valid layouts generated")
    else:
        print("\n❌ No results from ToT search")


if __name__ == "__main__":
    main()
