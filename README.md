# NyaberaWorks

Professional portfolio and digital-services platform for a biomedical engineering professional and software developer. Visitors can explore services and projects, request quotes, book consultations, buy fixed-price services, pay securely, track work, and leave reviews. An admin console manages the whole business.

> **Status: architecture locked (v1.0), implementation not started.** The documents in `docs/` describe the planned system. Phase 1 begins only after the plan is approved.

## Locked stack

- **Frontend:** Next.js (App Router) + TypeScript, Tailwind CSS, TanStack Query, React Hook Form + Zod
- **Backend:** Python, FastAPI, SQLAlchemy, Pydantic, Alembic, JWT
- **Database:** PostgreSQL
- **Payments:** provider-independent adapters; M-Pesa through an aggregator first (direct Daraja later), plus bank/card and cryptocurrency; verified server-side
- **Currencies:** KES (primary) and USD
- **Languages:** English at launch, Swahili-ready architecture
- **Deployment:** single VPS with Docker Compose, Caddy, Next.js, FastAPI, worker, and PostgreSQL; one domain with `/api/*` routed to FastAPI
- **Development:** native Windows, VS Code, Git/GitHub, npm, Python venv + pip

Key rule: Next.js never accesses PostgreSQL. FastAPI is the only business/API backend.

## Documentation

| Document | Description |
|---|---|
| [PROJECT_SPEC.md](PROJECT_SPEC.md) | Scope, requirements, locked decisions |
| [docs/01-system-architecture.md](docs/01-system-architecture.md) | Components, routing, module map |
| [docs/02-database-design.md](docs/02-database-design.md) | Tables, relationships, currency and localization |
| [docs/03-api-specification.md](docs/03-api-specification.md) | Versioned API design |
| [docs/04-frontend-architecture.md](docs/04-frontend-architecture.md) | Next.js structure, rendering, SEO |
| [docs/05-user-flows.md](docs/05-user-flows.md) | Business workflows |
| [docs/06-admin-dashboard.md](docs/06-admin-dashboard.md) | Admin console design |
| [docs/07-payment-architecture.md](docs/07-payment-architecture.md) | Payment adapters and verification |
| [docs/08-security.md](docs/08-security.md) | Security design |
| [docs/09-development-roadmap.md](docs/09-development-roadmap.md) | 16-phase plan |
| [docs/10-deployment.md](docs/10-deployment.md) | Hosting, CI/CD, backups, monitoring |

## Planned repository layout

```
NyaberaWorks/
├── backend/      FastAPI application, migrations, worker, backend/tests
├── frontend/     Next.js application
├── docs/         Architecture documents
├── tests/e2e/    End-to-end tests only
├── scripts/      PowerShell developer helpers
├── deploy/       Dockerfiles, Compose, Caddy (added in Phase 15)
├── .env.example  Environment variable template (no real secrets)
└── .gitignore
```

## Getting started

Setup instructions will be added in Phase 1. Expected prerequisites on Windows: Git, VS Code, Node.js (LTS, with npm), and Python 3.12+. PostgreSQL is needed from Phase 2. Docker, WSL2, pnpm, and uv are not required. Never commit real `.env` files; copy values from `.env.example` into `backend/.env` and `frontend/.env.local`.

## Security note

Secrets (JWT keys, database passwords, payment credentials) live only in environment variables of the backend and are never exposed to the frontend. All payments are verified server-side.

## License

To be decided by the owner.