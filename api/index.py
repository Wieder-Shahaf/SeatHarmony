"""
Vercel serverless function handler for SeatHarmony API.
This file serves as the entry point for API requests on Vercel.
"""
# Import the FastAPI app from the current directory
from api import app

# Vercel expects a handler function
# For FastAPI on Vercel, we can use the app directly
handler = app
