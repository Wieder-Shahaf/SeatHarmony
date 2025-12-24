## SeatHarmony Backend

This folder contains the **Python backend** for SeatHarmony:

- A Gurobi-backed optimizer for seating layouts.
- A Tree-of-Thoughts-style search task (`SeatHarmonyTask`) that explores objective variants.
- A FastAPI HTTP API for the React frontend.
- A Streamlit debug UI to inspect candidate layouts and scores.

### Folder structure

- `models.py` – dataclasses for `Guest`, `Table`, `VenueConfig`, `Layout`, and constraint summaries.
- `optimizer.py` – Gurobi (or heuristic) optimization to turn weights into concrete layouts.
- `seat_harmony_task.py` – ToT-compatible `SeatHarmonyTask` and `SeatHarmonyState`.
- `api.py` – FastAPI app exposing `/api/layouts/generate` and `/api/layouts/explain`.
- `streamlit_tot_debug.py` – Streamlit app to run ToT search interactively for debugging.
- `requirements.txt` – Python dependencies for the backend.

### Virtual environment

From the `backend` directory:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
```

To install the backend dependencies:

```bash
pip install -r requirements.txt
```

> Note: `gurobipy` requires a valid Gurobi installation and license.  
> If you do not have Gurobi, you can remove `gurobipy` from `requirements.txt`; the backend will
> automatically fall back to a simple heuristic seating layout.

### Installing Tree-of-Thought-LLM (`tot`)

The backend uses the [Tree-of-Thought-LLM](https://github.com/princeton-nlp/tree-of-thought-llm) library,
which is **installed from source**, not from PyPI.

With your backend virtual environment activated:

```bash
cd ..
git clone https://github.com/princeton-nlp/tree-of-thought-llm
cd tree-of-thought-llm
pip install -r requirements.txt
pip install -e .    # installs the `tot` package into the active venv
```

After this, the `tot` package will be importable from the backend code.

### Running the FastAPI backend

With the virtual environment activated and dependencies installed, **run from the project root**:

```bash
cd /Users/shahafwieder/SeatHarmony  # project root (not backend/)
source backend/.venv/bin/activate
uvicorn backend.api:app --reload
```

By default this will listen on `http://127.0.0.1:8000`.  
Set `VITE_API_BASE` in your front-end environment (e.g. `.env.local`) to point to this URL if needed.

### Running the Streamlit ToT debug UI

With the same virtual environment:

```bash
cd backend
source .venv/bin/activate  # if not already active
streamlit run streamlit_tot_debug.py
```

This opens a local page at `http://localhost:8501` where you can:

- Use a demo configuration or upload your own `JSON` with `guests`, `tables`, and `settings`.
- Adjust Tree-of-Thoughts hyperparameters (depth, branching, etc.).
- Inspect candidate states, their objective weights, and layouts.


