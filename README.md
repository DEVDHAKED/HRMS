# HRMS Lite

HRMS Lite is a lightweight Human Resource Management System focused on two core HR operations:

- **Employee management** – add, list, and delete employees
- **Attendance tracking** – mark daily attendance and review per‑employee history

The goal is to provide a simple, internal admin console with a clean, professional UI and a production‑like backend (validation, error handling, and persistence).

## Tech Stack

- **Frontend**
  - React 18 (loaded from CDN, compiled in browser via Babel)
  - Plain HTML/CSS/JS (no bundler required)
  - Deployed as a static site (e.g. Netlify manual deploy)

- **Backend**
  - FastAPI (Python)
  - SQLAlchemy 2.x (ORM)
  - SQLite (file‑based database `hrms.db`)
  - Deployed on Render as a Python web service

- **Other**
  - RESTful JSON APIs
  - CORS configured so browser frontend can call the API
  - GitHub for source control

---

## Running the Project Locally

### 1. Clone the repo

git clone https://github.com/DEVDHAKED/HRMS.git

cd HRMS


### 2. Backend (FastAPI + SQLite)
  1.Create and activate virtual environment (Windows PowerShell):
      python -m venv .venv   .venv\Scripts\Activate
  2. Install dependencies:
      pip install -r requirements.txt
  3. Start the API server:
      uvicorn backend.main:app --reload --port 8000
  4. Verify:  
      - Health check: http://127.0.0.1:8000/health → {"status":"ok"}
      - Interactive docs: http://127.0.0.1:8000/docs
> The first run will create a local SQLite database file hrms.db in the project root.
### 3. Frontend (React + static files)
    1. Make sure API_BASE at the top of frontend/main.jsx points to your local API when running locally:
        const API_BASE = "http://localhost:8000";
    2. Start a simple static server (from the frontend directory):
       cd frontend   python -m http.server 5173
    3. Open the app in your browser:
       http://localhost:5173
-- You should see the HRMS Lite UI. You can now:
-- Add employees in the Employee Directory panel.
-- Mark attendance and view history in the Daily Attendance panel.
-- See summary counts and filter attendance by date.
