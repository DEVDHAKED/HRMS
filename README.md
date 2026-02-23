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

git clone https://github.com/<your-username>/HRMS.git
cd HRMS
