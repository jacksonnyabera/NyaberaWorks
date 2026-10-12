# NyaberaWorks

Technology, Automation & Biomedical Engineering Solutions. The website and client platform of Jackson Nyabera, Nairobi.

**What works today:** public website (home, about, services, portfolio, FAQ, legal pages), quote, booking and contact forms saved to a database, client accounts, an admin area (messages, quotes, bookings, clients, services, portfolio), email alerts to the owner, SEO basics (metadata, structured data, sitemap), and a Docker deployment.
**Not built yet:** online payments, orders and invoices, reviews, password reset by email. See `docs/`.

## Stack

Next.js (App Router) + TypeScript + Tailwind, FastAPI + SQLAlchemy + Alembic, PostgreSQL, Docker Compose + Caddy. One domain; `/api/*` goes to FastAPI. Next.js never talks to the database.

## Run it locally (Windows, PowerShell 7)

```powershell
# one-time database setup (creates backend\.env with random secrets)
.\scripts\create-dev-database.ps1

# backend
cd backend
python -m venv .venv ; .\.venv\Scripts\Activate.ps1
pip install -r requirements-dev.txt
python -m alembic upgrade head
python -m app.cli.seed_catalog        # starter services and projects
python -m app.cli.create_admin        # your admin login
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

# frontend (second terminal)
cd frontend ; npm install ; npm run dev
```

Open http://127.0.0.1:3000. Checks: `ruff check .` and `python -m pytest -q` in `backend`; `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` in `frontend`.

## Going live

Three routes: a paid server with Docker ([docs/11-go-live.md](docs/11-go-live.md)), free-tier Google Cloud Run + Neon ([docs/12-go-live-cloud-run.md](docs/12-go-live-cloud-run.md)), a temporary free launch on Render + Neon ([docs/13-go-live-render.md](docs/13-go-live-render.md)), or website on Vercel with the API on Render ([docs/14-go-live-vercel-render.md](docs/14-go-live-vercel-render.md)). Production files are in `deploy/`.

## Documentation

`PROJECT_SPEC.md` and `docs/01`–`12` (architecture, database, API, frontend, flows, admin, payments, security, roadmap, deployment, go-live, go-live on Cloud Run).

## Secrets

Never commit `.env` files. Templates: `.env.example` (development) and `deploy/.env.example` (production).
