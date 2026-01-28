#!/usr/bin/env python3
"""
Test script for Tree-of-Thought (ToT) + Optimizer integration.
Calls the API endpoint to test the full optimization pipeline.
"""

import sys
import time
import pandas as pd
import requests
from pathlib import Path
from typing import List, Dict, Any
from collections import Counter

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from backend.models import Guest, Table


def read_guests_from_excel(file_path: str) -> List[Guest]:
    """Read guests from Excel file. Expects 'Name' and 'Category' columns."""
    df = pd.read_excel(file_path)

    # Find name and category columns (case-insensitive)
    name_col = None
    category_col = None

    # Priority order for name columns
    name_priority = ['Full Guest Name', 'Proper Names', 'Name', 'Guest Name', 'Guest_Name']

    for col in df.columns:
        col_str = str(col).strip()
        col_lower = col_str.lower()

        if name_col is None:
            for priority_name in name_priority:
                if col_lower == priority_name.lower():
                    name_col = col
                    break

        if category_col is None:
            if col_lower in ['category', 'group', 'group_id']:
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


def print_layout_summary(layout_data: Dict[str, Any], guests_by_id: Dict[str, Guest], tables_by_id: Dict[str, Table]):
    """Print a summary of the layout from API response."""
    layout = layout_data.get("layout", {})
    score = layout.get("score", 0)
    breakdown = layout.get("objective_breakdown", {})
    notes = layout_data.get("notes", "unknown")
    value = layout_data.get("value", 0)
    weights = layout_data.get("weights", {})

    print(f"\n  Strategy: {notes}")
    print(f"  Layout Score: {score:.1f}/100 (value: {value:.2f})")
    breakdown_str = ", ".join([f"{k}: {v:.1f}%" for k, v in breakdown.items()])
    print(f"  Objective Breakdown: {breakdown_str}")
    print(f"  Weights: {weights}")

    # Group by table and show category distribution
    assignments = layout.get("assignments", {})
    table_assignments: Dict[str, List[str]] = {}
    for guest_id, table_id in assignments.items():
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


def run_api_optimization(
    guests: List[Guest],
    tables: List[Table],
    api_url: str = "http://localhost:8000",
    tot_params: Dict[str, int] = None,
) -> Dict[str, Any]:
    """
    Call the FastAPI endpoint to run ToT optimization.
    
    Returns API response with layouts.
    """
    if tot_params is None:
        tot_params = {
            "depth": 2,
            "branching": 3,
            "n_generate": 3,
            "n_evaluate": 3,
            "top_k": 3,
        }

    # Convert guests and tables to API format
    payload = {
        "guests": [
            {
                "id": g.id,
                "name": g.name,
                "group_id": g.group_id,
                "importance": g.importance,
                "tags": g.tags,
            }
            for g in guests
        ],
        "tables": [
            {
                "id": t.id,
                "name": t.name,
                "capacity": t.capacity,
                "zone": t.zone,
                "constraints": t.constraints or {},
            }
            for t in tables
        ],
        "settings": {},
        "tot": tot_params,
    }

    print("\n" + "=" * 80)
    print("TREE-OF-THOUGHT OPTIMIZATION (via API)")
    print("=" * 80)
    print(f"\nCalling {api_url}/api/layouts/generate")
    print(f"ToT params: depth={tot_params['depth']}, branching={tot_params['branching']}, "
          f"n_generate={tot_params['n_generate']}, top_k={tot_params['top_k']}")

    start_time = time.time()
    try:
        response = requests.post(
            f"{api_url}/api/layouts/generate",
            json=payload,
            timeout=600,  # 10 minute timeout
        )
        response.raise_for_status()
        result = response.json()
    except requests.exceptions.ConnectionError:
        print(f"\n❌ ERROR: Could not connect to API at {api_url}")
        print("   Make sure the API server is running:")
        print("   cd backend && uvicorn api:app --reload")
        return {"error": "Connection failed", "elapsed": 0, "layouts": []}
    except requests.exceptions.Timeout:
        print(f"\n❌ ERROR: API request timed out after 600 seconds")
        return {"error": "Timeout", "elapsed": 600, "layouts": []}
    except Exception as e:
        print(f"\n❌ ERROR: API call failed: {e}")
        return {"error": str(e), "elapsed": 0, "layouts": []}

    elapsed = time.time() - start_time

    print(f"\n✓ API call completed in {elapsed:.2f}s")

    layouts = result.get("layouts", [])
    print(f"  Received {len(layouts)} layouts")

    return {
        "elapsed": elapsed,
        "layouts": layouts,
        "error": None,
    }


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

    # Run API optimization
    result = run_api_optimization(guests, tables)

    # Display results
    layouts = result.get("layouts", [])
    if layouts:
        print("\n" + "=" * 80)
        print("RESULTS - RANKED LAYOUTS")
        print("=" * 80)

        for rank, layout_data in enumerate(layouts, 1):
            print(f"\n{'─' * 60}")
            print(f"Rank #{rank}")
            print_layout_summary(layout_data, guests_by_id, tables_by_id)

        # Summary
        print("\n" + "=" * 80)
        print("SUMMARY")
        print("=" * 80)

        best = layouts[0]
        best_score = best.get("layout", {}).get("score", 0)
        best_strategy = best.get("notes", "unknown")
        elapsed = result.get("elapsed", 0)

        print(f"\n🏆 Best layout: {best_strategy}")
        print(f"   Score: {best_score:.1f}/100")
        print(f"   Total optimization time: {elapsed:.2f}s")
    else:
        print("\n❌ No layouts returned from API")
        if result.get("error"):
            print(f"   Error: {result['error']}")


if __name__ == "__main__":
    main()
