# NyaberaWorks

Technology, Automation & Biomedical Engineering Solutions. The website and client platform of Jackson Nyabera, Nairobi.

**What works today:** public website (home, about, services, portfolio, FAQ, legal pages), quote, booking and contact forms saved to a database, client accounts with password reset by email link, an admin area (messages, quotes, bookings, clients, services, portfolio) with optional two-factor sign-in, replies and quotations inside the client account, email alerts to the owner, a WhatsApp chat button, and SEO basics (metadata, structured data, sitemap).
**Partly built:** M-Pesa payments (ledger, admin-only intent, Daraja STK push; not live, no client checkout yet).
**Not built yet:** email verification, orders and invoices, reviews, card and crypto payments. See `docs/15-as-built-status.md`.

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

Routes: a paid server with Docker ([docs/11-go-live.md](docs/11-go-live.md)), free-tier Google Cloud Run + Neon ([docs/12-go-live-cloud-run.md](docs/12-go-live-cloud-run.md)), a temporary free launch on Render + Neon ([docs/13-go-live-render.md](docs/13-go-live-render.md)), or website on Vercel with the API on Render ([docs/14-go-live-vercel-render.md](docs/14-go-live-vercel-render.md)). Production files are in `deploy/`.

## Documentation

`PROJECT_SPEC.md` and `docs/01`–`14` (architecture, database, API, frontend, flows, admin, payments, security, roadmap, deployment, go-live routes). Docs 01–10 are the target design; **`docs/15-as-built-status.md` says what exists today.**

## Secrets

Never commit `.env` files. Templates: `.env.example` (development) and `deploy/.env.example` (production).


## Replies and quotations

Clients who are signed in when they send a contact, quote or booking request have it linked to their account. In `/account` they see each request, your replies and any quotation, can reply, and can accept or decline a quotation. In Admin, open a request to read the conversation, reply, and (for quote requests) send or withdraw a quotation. Requests sent as a guest cannot receive replies in the app; the admin panel says so. Migration `0004` adds the links and two tables and does not change existing data.

## Account safety

Forgot-password sends a 30-minute single-use link (needs SMTP: `EMAIL_BACKEND=smtp`, `SMTP_*`, `EMAIL_FROM`, `SITE_URL`). The admin can turn on two-factor sign-in in `/account`; recovery codes are shown once. If the phone and codes are lost: `python -m app.cli.reset_2fa --email you@example.com` in `backend`. Migration `0005` adds the reset-token table and two-factor columns.
