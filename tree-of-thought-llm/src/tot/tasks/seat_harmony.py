"""
SeatHarmony task for Tree-of-Thoughts.
This wraps the backend SeatHarmonyTask to integrate with the ToT framework.
"""

import sys
from pathlib import Path

# Add backend to path so we can import
backend_path = Path(__file__).parent.parent.parent.parent / "backend"
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

from backend.seat_harmony_task import SeatHarmonyTask as BackendSeatHarmonyTask

# Re-export as SeatHarmonyTask for the ToT framework
SeatHarmonyTask = BackendSeatHarmonyTask

