<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

## SeatHarmony

AI-powered wedding seating planner that creates harmonious seating arrangements
based on guest relationships and preferences.

This repository contains:

- **React/Vite frontend** – interactive UI for loading guests, exploring layouts, and refining plans.
- **Python backend** – Gurobi-backed optimizer, Tree-of-Thoughts-style search, FastAPI API, and Streamlit debug UI.

Original AI Studio app link (for reference):  
`https://ai.studio/apps/drive/1HhtrnqNNoj_hZa70rEwKA3lzFUNzSulW`

---

## Project structure

- `frontend/` – Vite/React frontend (app entry, components, pages, configs).
- `backend/` – Python backend (optimizer, ToT task, FastAPI API, Streamlit debug UI).

See `backend/README.md` for backend-specific details.

---

## Frontend (React/Vite)

**Prerequisites:** Node.js (LTS recommended).

From the project root, install dependencies once:

```bash
cd frontend
npm install
```

Then create a `frontend/.env.local` file and set your Gemini key (and optional backend base URL) if needed:

```bash
echo "GEMINI_API_KEY=your_key_here" > frontend/.env.local
echo "VITE_API_BASE=http://127.0.0.1:8000" >> frontend/.env.local   # FastAPI default
```

### Start the frontend dev server

```bash
cd frontend
npm run dev
```

By default Vite serves the app at `http://localhost:5173`.

---

## Backend (Python)

The backend lives in the `backend/` folder and provides:

- A Gurobi-backed optimizer with heuristic fallback.
- A Tree-of-Thoughts-style `SeatHarmonyTask`.
- A FastAPI API for the frontend (`/api/layouts/generate`, `/api/layouts/explain`).
- A Streamlit UI for debugging ToT search.

From the project root:

```bash
cd backend
python3 -m venv .venv                       # create venv (first time only)
source .venv/bin/activate                  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt            # install backend deps (excluding Tree-of-Thought-LLM)
```

Then, in the **same** virtual environment, install the Tree-of-Thought-LLM package from source:

```bash
cd ..
git clone https://github.com/princeton-nlp/tree-of-thought-llm
cd tree-of-thought-llm
pip install -r requirements.txt
pip install -e .    # install the `tot` package into the active venv
```

### Start the FastAPI backend (for the React app)

**Important:** Run this command from the **project root** (not from inside `backend/`):

```bash
cd /Users/shahafwieder/SeatHarmony  # or just 'cd ..' if you're in backend/
source backend/.venv/bin/activate    # activate venv
uvicorn backend.api:app --reload
```

This serves the API (by default) at `http://127.0.0.1:8000`.

### Start the optional Streamlit ToT debug UI

```bash
streamlit run backend/streamlit_tot_debug.py
```

This opens an interactive debugger for running Tree-of-Thoughts search over SeatHarmony instances.

---

## Running the full app end-to-end

1. **Start the backend** (API):
   - In one terminal (from project root):
     ```bash
     cd /Users/shahafwieder/SeatHarmony  # project root
     source backend/.venv/bin/activate
     uvicorn backend.api:app --reload
     ```

2. **Start the frontend**:
   - In another terminal:
     ```bash
     cd frontend
     npm run dev
     ```

3. **Open the app in your browser**:
   - Navigate to `http://localhost:5173`.
   - The frontend will call the backend at `VITE_API_BASE` (e.g. `http://127.0.0.1:8000`) for ToT-powered layouts and explanations.

4. *(Optional)* **Run the Streamlit debugger** in a third terminal:
   ```bash
   cd backend
   source .venv/bin/activate
   streamlit run streamlit_tot_debug.py
   ```


