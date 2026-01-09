# SeatHarmony

AI-powered wedding seating planner that creates harmonious seating arrangements based on guest relationships, preferences, and venue constraints.

---

## Project Overview

SeatHarmony helps plan optimal table assignments for weddings and events. Users upload their guest list, define tables and venue layout, and the system generates seating arrangements that respect relationships (who should sit together or apart), guest importance, and other preferences.

The system combines **constraint optimization** (Gurobi-based) with **Tree-of-Thoughts search** — an AI technique that explores different objective weightings to find well-balanced, socially harmonious layouts. An LLM (Gemini or OpenAI) powers the ToT search and generates human-readable explanations for the seating decisions.

---

## Components

### Frontend (`frontend/`)

React/Vite application with a multi-step workflow:

- **Landing** — Introduction and entry point
- **Dashboard** — Guest management and overview
- **Venue Selection** — Configure tables, capacity, and zones
- **Recommendations** — View AI-generated seating suggestions
- **Planner AI** — Interactive layout generation and refinement
- **Confirmation & Export** — Finalize and export the seating plan

### Backend (`backend/`)

Python service providing:

- **FastAPI API** — Endpoints for layout generation (`/api/layouts/generate`) and explanations (`/api/layouts/explain`)
- **Optimizer** — Gurobi-backed constraint solver with heuristic fallback (if Gurobi is unavailable)
- **SeatHarmonyTask** — Tree-of-Thoughts-compatible task that explores objective variants
- **Streamlit Debug UI** — Interactive tool for testing and inspecting ToT search

### Tree-of-Thought-LLM (`tree-of-thought-llm/`)

The [Tree-of-Thought-LLM](https://github.com/princeton-nlp/tree-of-thought-llm) library (included as a subfolder) provides the ToT search framework. It is installed from source into the backend environment.

---

## Prerequisites

- **Node.js** (LTS) — for the frontend
- **Python 3.10+** — for the backend
- **LLM API key** — Gemini (`GEMINI_API_KEY`) or OpenAI (`OPENAI_API_KEY`) for AI-powered search and explanations

> **Note:** Gurobi is optional. The optimizer falls back to a heuristic if Gurobi is not installed or licensed. See `backend/setup_gurobi_license.sh` if you have Gurobi.

---

## How to Run

### 1. Backend Setup (first time)

```bash
# From project root
cd backend
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Install Tree-of-Thought-LLM (from the bundled tree-of-thought-llm/ folder)
cd ../tree-of-thought-llm
pip install -r requirements.txt
pip install -e .
cd ..
```

### 2. Configure API Key

Create a `.env` file in the **project root**:

```bash
# Project root
echo "GEMINI_API_KEY=your_key_here" > .env
# OR: echo "OPENAI_API_KEY=your_key_here" > .env
```

### 3. Frontend Setup (first time)

```bash
cd frontend
npm install

# Optional: create .env.local to override API URL (default: http://127.0.0.1:8000)
echo "VITE_API_BASE=http://127.0.0.1:8000" > .env.local
```

### 4. Start the Application

**Terminal 1 — Backend:**

```bash
# From project root
source backend/.venv/bin/activate
uvicorn backend.api:app --reload
```

API runs at `http://127.0.0.1:8000`

**Terminal 2 — Frontend:**

```bash
cd frontend
npm run dev
```

App runs at `http://localhost:5173`

---

## Optional: Streamlit ToT Debugger

For debugging and inspecting the Tree-of-Thoughts search:

```bash
source backend/.venv/bin/activate
streamlit run backend/streamlit_tot_debug.py
```

Opens at `http://localhost:8501`

---

## Project Structure

```
SeatHarmony/
├── frontend/          # React/Vite UI
├── backend/           # Python API, optimizer, ToT task
├── tree-of-thought-llm/   # ToT library (install from source)
└── .env               # API keys (create this)
```

See `backend/README.md` for detailed backend documentation.
