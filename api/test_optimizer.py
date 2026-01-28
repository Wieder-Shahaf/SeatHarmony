#!/usr/bin/env python3
"""
Test script for the hierarchical optimizer.
Pure hierarchical optimization with venue selection.
"""

import sys
import pandas as pd
from pathlib import Path
from typing import List, Dict
from collections import Counter

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from backend.models import Guest, Table, VenueConfig
from backend.optimizer import generate_hierarchical_layout, PHASE_1_CATEGORIES, PHASE_2_CATEGORIES, PHASE_3_CATEGORIES

# =============================================================================
# VENUE DEFINITIONS
# =============================================================================

VENUES = {
    "1": {
        "name": "Intimate Chapel",
        "description": "Perfect for small, intimate weddings",
        "tables": 7,
        "seats_per_table": 8,
        "total_capacity": 56,
    },
    "2": {
        "name": "Garden Terrace",
        "description": "Beautiful outdoor setting with round tables",
        "tables": 10,
        "seats_per_table": 10,
        "total_capacity": 100,
    },
    "3": {
        "name": "Grand Ballroom",
        "description": "Elegant ballroom for larger celebrations",
        "tables": 15,
        "seats_per_table": 10,
        "total_capacity": 150,
    },
    "4": {
        "name": "Rustic Barn",
        "description": "Charming country-style venue with long tables",
        "tables": 8,
        "seats_per_table": 12,
        "total_capacity": 96,
    },
    "5": {
        "name": "Rooftop Lounge",
        "description": "Modern urban venue with mixed seating",
        "tables": 12,
        "seats_per_table": 8,
        "total_capacity": 96,
    },
    "6": {
        "name": "Beach Resort",
        "description": "Oceanfront venue with open-air seating",
        "tables": 10,
        "seats_per_table": 8,
        "total_capacity": 80,
    },
    "7": {
        "name": "Custom",
        "description": "Define your own table configuration",
        "tables": None,
        "seats_per_table": None,
        "total_capacity": None,
    },
}

# Default weights for pure hierarchical optimization (neutral - equal priority)
DEFAULT_WEIGHTS = {
    "family_cohesion": 1.0,
    "social_group_cohesion": 1.0,
    "side_mixing": 1.0,
}


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

        # Check name columns in priority order
        if name_col is None:
            for priority_name in name_priority:
                if col_lower == priority_name.lower():
                    name_col = col
                    break

        # Check category columns
        if category_col is None:
            if col_lower in ['category', 'קטגוריה', 'group', 'group_id', 'קבוצה']:
                category_col = col

    if name_col is None:
        raise ValueError(f"Could not find name column in Excel file. Available columns: {list(df.columns)}")
    if category_col is None:
        print(f"⚠️  Warning: Could not find 'Category' column. Using 'Uncategorized' for all guests.")

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


def create_tables(num_tables: int, seats_per_table: int) -> List[Table]:
    """Create tables with specified configuration."""
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


def display_venue_menu(guest_count: int):
    """Display venue selection menu."""
    print("\n" + "=" * 60)
    print("🏛️  SELECT VENUE")
    print("=" * 60)
    print(f"\nYou have {guest_count} guests. Choose a venue:\n")

    for key, venue in VENUES.items():
        if venue["total_capacity"]:
            capacity_status = "✓" if venue["total_capacity"] >= guest_count else "⚠️ Too small"
            print(f"  [{key}] {venue['name']}")
            print(f"      {venue['description']}")
            print(f"      Tables: {venue['tables']} × {venue['seats_per_table']} seats = {venue['total_capacity']} capacity {capacity_status}")
        else:
            print(f"  [{key}] {venue['name']}")
            print(f"      {venue['description']}")
        print()


def analyze_phase_distribution(guests: List[Guest]):
    """Analyze which phase each guest will be assigned to."""
    phase_counts = {1: [], 2: [], 3: [], 4: []}

    for g in guests:
        cat = g.group_id
        if cat in PHASE_1_CATEGORIES:
            phase_counts[1].append(g)
        elif cat in PHASE_2_CATEGORIES:
            phase_counts[2].append(g)
        elif cat in PHASE_3_CATEGORIES:
            phase_counts[3].append(g)
        else:
            phase_counts[4].append(g)

    print("\n" + "=" * 60)
    print("📊  HIERARCHICAL PHASE DISTRIBUTION")
    print("=" * 60)
    print("\nThe optimizer processes guests in 4 phases:")

    phase_info = [
        (1, "FAMILY", "HARD constraint: No Groom/Bride family at same table"),
        (2, "FRIENDS", "Soft penalty for cross-side mixing"),
        (3, "COLLEAGUES/UNI", "Soft penalty for cross-side mixing"),
        (4, "REMAINING", "Free mixing to fill remaining seats"),
    ]

    for phase_num, phase_name, phase_desc in phase_info:
        guests_in_phase = phase_counts[phase_num]
        print(f"\n  Phase {phase_num} - {phase_name} ({len(guests_in_phase)} guests)")
        print(f"  └─ {phase_desc}")
        if guests_in_phase:
            cats = Counter([g.group_id or "Uncategorized" for g in guests_in_phase])
            for cat, count in sorted(cats.items(), key=lambda x: -x[1]):
                print(f"       • {cat}: {count}")
        else:
            print("       (no guests in this phase)")

    return phase_counts


def print_layout_summary(layout, guests_by_id: Dict[str, Guest], tables_by_id: Dict[str, Table]):
    """Print a summary of the layout."""
    print("\n" + "=" * 60)
    print("📋  OPTIMAL SEATING ARRANGEMENT")
    print("=" * 60)

    print(f"\n🎯 Optimization Score: {layout.score:.1f}/100")
    print(f"\n📈 Metrics (% of group pairs seated together):")
    for key, value in layout.objective_breakdown.items():
        label = key.replace("_", " ").title()
        bar = "█" * int(value / 5) + "░" * (20 - int(value / 5))
        print(f"    {label}: {bar} {value:.0f}%")

    if layout.summary and layout.summary.hard_violations:
        print(f"\n⚠️  Hard Violations: {len(layout.summary.hard_violations)}")
        for v in layout.summary.hard_violations:
            print(f"    ❌ {v}")

    print(f"\n👥 Table Assignments ({len(layout.assignments)} guests):")
    print("-" * 60)

    # Group by table
    table_assignments: Dict[str, List[str]] = {}
    for guest_id, table_id in layout.assignments.items():
        if table_id not in table_assignments:
            table_assignments[table_id] = []
        table_assignments[table_id].append(guest_id)

    for table_id in sorted(table_assignments.keys(), key=lambda x: int(x.split('-')[-1]) if '-' in x else 0):
        table = tables_by_id.get(table_id)
        table_name = table.name if table else table_id
        capacity = table.capacity if table else "?"
        guests_at_table = table_assignments[table_id]

        # Analyze table composition
        categories = [guests_by_id[gid].group_id or "Uncategorized" for gid in guests_at_table]
        cat_counts = Counter(categories)

        # Determine if table is mixed or homogeneous
        if len(cat_counts) == 1:
            composition_icon = "🟢"  # Homogeneous
        elif len(cat_counts) <= 2:
            composition_icon = "🟡"  # Slightly mixed
        else:
            composition_icon = "🔴"  # Very mixed

        print(f"\n{composition_icon} {table_name} ({len(guests_at_table)}/{capacity} seats)")

        # Show composition summary
        composition = " | ".join([f"{cat}: {cnt}" for cat, cnt in sorted(cat_counts.items(), key=lambda x: -x[1])])
        print(f"   [{composition}]")

        # List guests
        for guest_id in sorted(guests_at_table, key=lambda gid: guests_by_id[gid].group_id or "zzz"):
            guest = guests_by_id.get(guest_id)
            if guest:
                category = guest.group_id or "Uncategorized"
                print(f"   • {guest.name} ({category})")

    # Show empty tables
    empty_tables = [t for t in tables_by_id.values() if t.id not in table_assignments]
    if empty_tables:
        print(f"\n⬜ Empty tables: {len(empty_tables)}")
        for t in empty_tables:
            print(f"   • {t.name}")

    print("\n" + "=" * 60)


def main():
    print("\n" + "=" * 60)
    print("🎊  SEATHARMONY - HIERARCHICAL OPTIMIZER TEST")
    print("=" * 60)
    print("\nThis test runs PURE hierarchical optimization:")
    print("  Phase 1: Family    → HARD no Groom/Bride family mixing")
    print("  Phase 2: Friends   → Soft cross-side penalty")
    print("  Phase 3: Colleagues→ Soft cross-side penalty")
    print("  Phase 4: Remaining → Free mixing")

    # Check for Excel file argument
    if len(sys.argv) < 2:
        print("\n" + "-" * 60)
        print("Usage: python test_optimizer.py <path_to_excel_file>")
        print("\nExample:")
        print('  python test_optimizer.py guests.xlsx')
        sys.exit(1)

    excel_path = sys.argv[1]

    if not Path(excel_path).exists():
        print(f"\n❌ Error: File not found: {excel_path}")
        sys.exit(1)

    # Read guests
    print(f"\n📂 Reading: {excel_path}")

    try:
        guests = read_guests_from_excel(excel_path)
        print(f"✅ Loaded {len(guests)} guests")

        # Show category distribution
        categories = Counter([g.group_id or "Uncategorized" for g in guests])
        print(f"\n📊 Category Distribution:")
        for cat, count in sorted(categories.items(), key=lambda x: -x[1]):
            print(f"    • {cat}: {count}")

    except Exception as e:
        print(f"\n❌ Error reading Excel file: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

    if len(guests) == 0:
        print("❌ Error: No guests found in Excel file")
        sys.exit(1)

    # Show phase distribution
    analyze_phase_distribution(guests)

    # Venue selection
    display_venue_menu(len(guests))

    while True:
        choice = input("Enter venue number [1-7]: ").strip()
        if choice in VENUES:
            break
        print("❌ Invalid choice. Please enter a number 1-7.")

    venue_config = VENUES[choice]

    if choice == "7":  # Custom
        while True:
            try:
                num_tables = int(input("Enter number of tables: ").strip())
                seats_per_table = int(input("Enter seats per table: ").strip())
                if num_tables > 0 and seats_per_table > 0:
                    break
                print("❌ Please enter positive numbers.")
            except ValueError:
                print("❌ Please enter valid numbers.")
        venue_config["tables"] = num_tables
        venue_config["seats_per_table"] = seats_per_table
        venue_config["total_capacity"] = num_tables * seats_per_table

    print(f"\n✅ Selected: {venue_config['name']}")
    print(f"   {venue_config['tables']} tables × {venue_config['seats_per_table']} seats = {venue_config['total_capacity']} capacity")

    if venue_config["total_capacity"] < len(guests):
        print(f"\n⚠️  Warning: Venue capacity ({venue_config['total_capacity']}) is less than guest count ({len(guests)})")
        cont = input("Continue anyway? [y/N]: ").strip().lower()
        if cont != 'y':
            sys.exit(0)

    # Create venue
    tables = create_tables(venue_config["tables"], venue_config["seats_per_table"])
    venue = VenueConfig(tables=tables, settings={})

    # Create lookup dictionaries
    guests_by_id = {g.id: g for g in guests}
    tables_by_id = {t.id: t for t in tables}

    # Run hierarchical optimization
    print("\n" + "=" * 60)
    print("⚙️  RUNNING HIERARCHICAL OPTIMIZATION")
    print("=" * 60)
    print(f"\nWeights (neutral): {DEFAULT_WEIGHTS}")
    print("\nOptimizing... ", end="", flush=True)

    try:
        import time
        start_time = time.time()

        layout, _ = generate_hierarchical_layout(
            guests=guests,
            venue=venue,
            weights=DEFAULT_WEIGHTS,
        )

        elapsed = time.time() - start_time
        print(f"Done! ({elapsed:.2f}s)")

        if layout.id == "dummy":
            print("\n⚠️  Warning: Optimizer returned dummy layout (optimization may have failed)")
        else:
            print_layout_summary(layout, guests_by_id, tables_by_id)

    except Exception as e:
        print(f"\n❌ Error during optimization: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

    print("\n👋 Done!")


if __name__ == "__main__":
    main()
