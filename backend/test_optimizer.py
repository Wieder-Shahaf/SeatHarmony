#!/usr/bin/env python3
"""
Test script for the optimizer using an Excel file.
Reads guests from Excel and runs the optimizer with the new wedding-specific hyperparameters.
"""

import sys
import pandas as pd
from pathlib import Path
from typing import List, Dict

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from backend.models import Guest, Table, VenueConfig
from backend.optimizer import generate_layout_for_weights


def read_guests_from_excel(file_path: str) -> List[Guest]:
    """Read guests from Excel file. Expects 'Name' and 'Category' columns."""
    df = pd.read_excel(file_path)
    
    # Find name and category columns (case-insensitive)
    # Try "Full Guest Name" first, then "Proper Names", then "Name"
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
        print(f"Warning: Could not find 'Category' column. Using 'Uncategorized' for all guests.")
        category_col = None
    
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
    num_tables = (guest_count + seats_per_table - 1) // seats_per_table  # Ceiling division
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
    print("\n" + "="*80)
    print("OPTIMIZATION RESULTS")
    print("="*80)
    print(f"\nLayout ID: {layout.id}")
    print(f"Score: {layout.score:.4f}")
    print(f"\nObjective Breakdown:")
    for key, value in layout.objective_breakdown.items():
        print(f"  {key}: {value:.4f}")
    
    print(f"\nAssignments ({len(layout.assignments)} guests):")
    print("-" * 80)
    
    # Group by table
    table_assignments: Dict[str, List[str]] = {}
    for guest_id, table_id in layout.assignments.items():
        if table_id not in table_assignments:
            table_assignments[table_id] = []
        table_assignments[table_id].append(guest_id)
    
    for table_id in sorted(table_assignments.keys()):
        table = tables_by_id.get(table_id)
        table_name = table.name if table else table_id
        capacity = table.capacity if table else "?"
        guests_at_table = table_assignments[table_id]
        
        print(f"\n{table_name} (ID: {table_id}, Capacity: {capacity}, Occupied: {len(guests_at_table)}):")
        for guest_id in guests_at_table:
            guest = guests_by_id.get(guest_id)
            if guest:
                category = guest.group_id or "Uncategorized"
                print(f"  - {guest.name} ({category})")
    
    print("\n" + "="*80)


def main():
    if len(sys.argv) < 2:
        print("Usage: python test_optimizer.py <path_to_excel_file>")
        print("\nExample:")
        print('  python test_optimizer.py "/Users/shahafwieder/Library/CloudStorage/OneDrive-Technion/לימודים/שנה 4/סמסטר ז/Ofek Bernstein\'s files - מערכות נבונות אינטראקטיביות/Prototype/example.xlsx"')
        sys.exit(1)
    
    excel_path = sys.argv[1]
    
    if not Path(excel_path).exists():
        print(f"Error: File not found: {excel_path}")
        sys.exit(1)
    
    print(f"Reading Excel file: {excel_path}")
    print("-" * 80)
    
    try:
        guests = read_guests_from_excel(excel_path)
        print(f"✓ Successfully read {len(guests)} guests")
        
        # Show category distribution
        from collections import Counter
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
    
    venue = VenueConfig(tables=tables, settings={})
    
    # Create lookup dictionaries
    guests_by_id = {g.id: g for g in guests}
    tables_by_id = {t.id: t for t in tables}
    
    # Test with the new wedding-specific hyperparameters
    print("\n" + "="*80)
    print("RUNNING OPTIMIZER")
    print("="*80)
    
    weights = {
        "family_cohesion": 0.8,      # Keep families together
        "social_group_cohesion": 0.6, # Keep friend groups together
        "side_mixing": 0.3,           # Some mixing between sides
        "relationship_priority": 0.7, # Prioritize closer relationships
    }
    
    print(f"\nHyperparameters:")
    for key, value in weights.items():
        print(f"  {key}: {value:.2f}")
    
    try:
        layout, summary = generate_layout_for_weights(guests, venue, weights)
        
        if layout.id == "dummy":
            print("\n⚠ Warning: Optimizer returned dummy layout (optimization may have failed)")
        else:
            print_layout_summary(layout, guests_by_id, tables_by_id)
        
    except Exception as e:
        print(f"\n❌ Error during optimization: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()

