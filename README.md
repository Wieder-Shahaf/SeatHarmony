<div align="center">

# SeatHarmony

**AI-powered wedding seating planner that creates harmonious arrangements**

[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=white)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)

[![Gurobi](https://img.shields.io/badge/Gurobi-Optimizer-EE3124?style=for-the-badge)](https://www.gurobi.com/)
[![Groq](https://img.shields.io/badge/Groq-Llama_70B-F55036?style=for-the-badge)](https://groq.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)

[Features](#-features) • [Demo](#-demo) • [Getting Started](#-getting-started) • [Usage](#-using-the-application) • [Contributing](#-contributing)

</div>

---

## What is SeatHarmony?

SeatHarmony helps plan optimal table assignments for weddings and events. Upload your guest list, define tables and venue layout, and let AI generate seating arrangements that respect relationships, guest importance, and preferences.

The system combines:
- **Gurobi Constraint Optimization** — Mathematical optimization for optimal seat assignments
- **Tree-of-Thoughts Search** — AI technique exploring different objective weightings
- **Llama 3.3 70B (via Groq)** — Generates human-readable explanations for seating decisions

---

## Features

| Feature | Description |
|---------|-------------|
|  **Guest Management** | Import guests via Excel/CSV or add manually |
|  **Venue Selection** | Choose from multiple venue layouts with visual previews |
|  **AI-Powered Seating** | Generate optimized arrangements using Gurobi + Llama 70B |
|  **Interactive Planner** | Drag-and-drop interface for manual adjustments |
|  **Visual Floor Plan** | See your seating on an interactive venue map |
|  **Export Options** | Download PDF floor plans and Excel guest lists |

---

## Demo

<div align="center">

### Landing Page
<img src="docs/screenshots/landing-page.jpeg" width="700" alt="Landing Page">

### Venue Selection
<img src="docs/screenshots/venues.jpeg" width="700" alt="Venue Selection">

### AI Recommendations
<img src="docs/screenshots/recommendations.jpeg" width="700" alt="AI Recommendations">

### Planner AI - Guest Details & AI Insights
<p>
<img src="docs/screenshots/planner-guest-detail.jpeg" width="400" alt="Guest Details">
<img src="docs/screenshots/planner-ai-insight.jpeg" width="400" alt="AI Insights">
</p>

### Final Review - Table Details & Floor Map
<p>
<img src="docs/screenshots/final-review-table.jpeg" width="400" alt="Table Details">
<img src="docs/screenshots/final-review-map.jpeg" width="400" alt="Floor Map">
</p>

### Export Page
<img src="docs/screenshots/export.jpeg" width="700" alt="Export Page">

</div>

---

## Getting Started

### Prerequisites

| Requirement | Version | Installation |
|-------------|---------|--------------|
| ![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white) | 18+ | [nodejs.org](https://nodejs.org/) |
| ![Python](https://img.shields.io/badge/Python-3.10+-3776AB?logo=python&logoColor=white) | 3.10+ | [python.org](https://www.python.org/downloads/) |
| ![Gurobi](https://img.shields.io/badge/Gurobi-10+-EE3124) | 10+ | [gurobi.com](https://www.gurobi.com/downloads/) |

### API Keys Required

| Service | Purpose | Get Key |
|---------|---------|---------|
| **Groq** | AI explanations (Llama 70B) | [console.groq.com](https://console.groq.com/keys) (Free) |
| **Gurobi** | Optimization solver | [gurobi.com/academia](https://www.gurobi.com/academia/) (Free for academics) |

---

### Installation

#### 1️⃣ Clone the Repository

```bash
git clone https://github.com/your-username/SeatHarmony.git
cd SeatHarmony
```

#### 2️⃣ Backend Setup

```bash
# Create virtual environment
cd backend
python3 -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Install Tree-of-Thought library
cd ../tree-of-thought-llm
pip install -r requirements.txt
pip install -e .
cd ..
```

#### 3️⃣ Frontend Setup

```bash
cd frontend
npm install
```

#### 4️⃣ Configure Environment
#### <b><u>For Academic Staff:</u></b>
Copy the .env file from the following link: [.env Link](https://technionmail-my.sharepoint.com/:u:/r/personal/bofek_campus_technion_ac_il/Documents/Technion/%D7%A9%D7%A0%D7%94%20%D7%93%D7%B3/%D7%A1%D7%9E%D7%A1%D7%98%D7%A8%20%D7%97%D7%95%D7%A8%D7%A3/%D7%9E%D7%A2%D7%A8%D7%9B%D7%95%D7%AA%20%D7%A0%D7%91%D7%95%D7%A0%D7%95%D7%AA%20%D7%90%D7%99%D7%A0%D7%98%D7%A8%D7%90%D7%A7%D7%98%D7%99%D7%91%D7%99%D7%95%D7%AA/Milestone%204/env?csf=1&web=1&e=AaTjbJ)  <br> 
Paste the file in the backend folder.

#### <b><u>For all other users:</u></b>
Create a `.env` file in the backend folder:
```bash
cd ..
cd backend
touch .env 
```

Open the .env file to edit:
```bash
nano .env   # or: code .env (VS Code) 
# Required: Groq API Key
echo "GROQ_API_KEY=your_key_here"
# Gurobi WLS License (if not using local license)
echo GRB_WLSACCESSID=your-access-id
echo GRB_WLSSECRET=your-secret
echo GRB_LICENSEID=your-license-id
```

#### 5️⃣ Run the Application

**Terminal 1 — Backend:**
```bash
cd ..
source backend/.venv/bin/activate
uvicorn backend.api:app --reload
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
```

#### 6️⃣ Open in Browser

Navigate to **http://localhost:3000**

---

## Using the Application

```
┌──────────────────────────────────────────────────────────────────────────┐
│  1. Landing Page    →  Click "Get Started", upload your guest list       │
│  2. Dashboard       →  Verify guest list and grouping                    │
│  3. Venues          →  Select venue                                      │
│  4. Recommendations →  Generate AI seating suggestions                   │
│  5. Planner AI      →  Guest seating explanations and fine-tune seating  │
│  6. Final Review    →  Review complete seating chart                     │
│  7. Export          →  Download PDF or Excel                             │
└──────────────────────────────────────────────────────────────────────────┘
```

### Example Data for Testing

We provide sample guest lists to help you test the system. Find them in the [`docs/data`](docs/data) folder:

| File | Guests | Description |
|------|--------|-------------|
| `Example_Small_85_Guests.csv` | 85 | Quick testing & demos |
| `Example_Medium_200_Guests.csv` | 200 | Typical wedding size |
| `Example_Large_495_Guests.csv` | 495 | Stress testing large events |

**To use:** On the Landing Page, click "Get Started" and upload one of these CSV files.

---

## Project Structure

```
SeatHarmony/
├── frontend/                 # React/Vite frontend
│   ├── src/                     # Source code
│   ├── pages/                   # Page components
│   └── components/              # Reusable UI components
│
├── backend/                  # Python FastAPI backend
│   ├── api.py                   # API endpoints
│   ├── optimizer.py             # Gurobi optimization
│   ├── seat_harmony_task.py     # Tree-of-Thoughts task
|   └── .env                     # API keys (create this)
│
└── tree-of-thought-llm/      # ToT library
```

---

## Troubleshooting

<details>
<summary><b>Module not found errors</b></summary>

Make sure your virtual environment is activated:
```bash
source backend/.venv/bin/activate
```
</details>

<details>
<summary><b>CORS error in browser</b></summary>

Ensure backend is running on port 8000:
```bash
uvicorn backend.api:app --reload --port 8000
```
</details>

<details>
<summary><b>Cannot connect to server</b></summary>

1. Check backend is running in Terminal 1
2. Verify it's on http://127.0.0.1:8000
3. Check for error messages in backend terminal
</details>

<details>
<summary><b>Gurobi license not found</b></summary>

1. Verify installation: `gurobi_cl --version`
2. Check license: `gurobi_cl --license`
3. For WLS: verify `.env` credentials
</details>

<details>
<summary><b>Port already in use</b></summary>

```bash
lsof -i :8000
kill -9 <PID>
```
</details>

---

<div align="center">

**Made with ❤️ for couples planning their perfect day**

</div>
