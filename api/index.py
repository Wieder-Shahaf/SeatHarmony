"""
Vercel serverless function handler for SeatHarmony API.
This file serves as the entry point for API requests on Vercel.
"""
import sys
from pathlib import Path

# Add backend directory to Python path for imports
backend_path = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(backend_path))

# Import the FastAPI app
from api import app

# Vercel expects a handler function
# For FastAPI on Vercel, we can use the app directly
handler = app
