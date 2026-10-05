# NyaberaWorks — Project Specification

Status: APPROVED, architecture locked v1.0 (2026-10-05). No application code has been written. Implementation starts only after the Phase 1 plan is approved.

## 1. Summary

NyaberaWorks is the professional portfolio and digital-services business platform of a biomedical engineering professional and software developer. It showcases skills and projects, and works as a service-commerce platform: visitors can browse services, request quotes, book consultations, buy fixed-price services, pay, track work, communicate, and review. A secure admin console runs the business.

## 2. Objectives

1. Present a credible professional profile and portfolio that ranks in search (supports job search and client acquisition).
2. Sell services online with secure, verified payments (M-Pesa via an aggregator first, bank/card, cryptocurrency).
3. Reduce manual work: bookings, quotes, orders, invoices, updates, and reviews flow through the system.
4. Provide business insight: revenue, conversion, popular services.
5. Stay maintainable and affordable for one developer.

## 3. Users and roles

| Role | Description |
|---|---|
| Visitor | Browses, contacts, requests quotes |
| CLIENT | Registered; buys, books, pays, tracks, messages, reviews |
| ADMIN | Owner; manages everything |

Additional roles (e.g. SUPPORT, EDITOR) can be added later through a permissions map.

## 4. Functional scope

### Public
Home, About, Services, Service Details, Portfolio, Project Details, Contact, Request Quote, legal pages. Server-rendered for SEO.

### Client
Register/login/verify, profile, Buy Now + requirements, checkout and payment, booking, quotes (view/accept/reject), orders and status timeline, project updates, files, invoices, messaging, notifications, reviews.

### Admin
Dashboard, services and prices (KES and USD), portfolio, orders, bookings and availability, clients, payments and refunds, quote requests and quotes, reviews and testimonials, messages, analytics, settings, audit log.

### Workflows
Fixed-price purchase, consultation booking, custom-project quotation (see `docs/05-user-flows.md`).

## 5. Locked decisions (approved 2026-10-05)

| # | Decision |
|---|---|
| 1 | Frontend: Next.js (App Router) + TypeScript |
| 2 | Backend: FastAPI + Python |
| 3 | Database: PostgreSQL |
| 4 | Styling: Tailwind CSS |
| 5 | Client data fetching: TanStack Query |
| 6 | Forms and validation: React Hook Form + Zod |
| 7 | Routing: Next.js file-based routing |
| 8 | M-Pesa through an aggregator initially, behind a provider-independent payment adapter so direct Safaricom Daraja can be added later |
| 9 | Tests: backend tests in `backend/tests`; root `tests/` only for end-to-end tests |
| 10 | Deployment: single VPS, Docker Compose + Caddy + Next.js + FastAPI + worker + PostgreSQL |
| 11 | Development: native Windows initially; WSL2, Docker Desktop, pnpm, and uv are not required for Phase 1 |
| 12 | Package manager: npm |
| 13 | Python environment: standard `venv` + pip |
| 14 | URL architecture: one domain; `/api/*` routed to FastAPI |
| 15 | Language: English at launch; architecture extensible for Swahili |
| 16 | Currency: KES (primary) and USD, with explicit per-currency prices |
| 17 | Public Next.js pages support SEO: metadata, structured data, sitemap, canonical URLs, social previews |
| 18 | Account and admin sections are client-side (no SEO need) |
| 19 | Next.js never accesses PostgreSQL; FastAPI is the only business/API backend |

Earlier approvals carried forward: reviews are the testimonial system; payments reference their payable through three nullable foreign keys with an exactly-one CHECK; keep TanStack Query, React Hook Form + Zod, and Tailwind.

Defaults applied beneath these decisions (change on request): Next.js App Router with current stable release and Node.js LTS; Axios retained for client-side calls while server-side fetching uses native `fetch`; `next-intl` message files without locale-prefixed routing at launch; pinned `requirements*.txt` for Python dependencies; ruff and pytest for the backend; `pre-commit` for local checks.

## 6. Non-functional requirements

| Area | Requirement |
|---|---|
| Security | OWASP Top 10 coverage, RBAC in FastAPI only, hashed passwords, server-side payment verification, audit logging (see doc 08) |
| SEO | Server-rendered public pages, per-page metadata, JSON-LD, sitemap, canonical URLs, Open Graph previews, Core Web Vitals in the "good" range |
| Performance | Public pages LCP < 2.5 s on mobile 4G; API p95 < 500 ms for typical requests |
| Availability | Target 99.5% initially; daily backups; restore-tested |
| Maintainability | Modular monolith backend, typed contracts generated from OpenAPI, tests, documentation |
| Cost | Baseline hosting about USD 15–35 / month |
| Accessibility | WCAG 2.1 AA targets |
| Privacy | Kenya Data Protection Act 2019 alignment |
| Compatibility | Latest 2 versions of major browsers; mobile-first |

## 7. Technology stack (final)

| Layer | Choice |
|---|---|
| Frontend | Next.js + TypeScript, Tailwind CSS, TanStack Query, React Hook Form + Zod, Axios (client-side), next-intl |
| Backend | Python 3.12+, FastAPI, SQLAlchemy 2.x, Pydantic v2, Alembic, JWT |
| Database | PostgreSQL |
| Jobs | Postgres-backed worker (Redis later if needed) |
| Edge | Caddy |
| Packaging | npm (frontend), venv + pip (backend) |
| Containers | Docker Compose on the VPS (authored in Phase 15) |
| CI/CD | GitHub Actions on Linux |
| Testing | pytest (`backend/tests`), Vitest + React Testing Library, Playwright (`tests/e2e`) |
| Monitoring | Sentry, uptime monitor |
| Dev environment | Native Windows, VS Code, Git/GitHub |

## 8. Repository structure

```
NyaberaWorks/
├── README.md
├── PROJECT_SPEC.md
├── .env.example
├── .gitignore
├── .gitattributes                (Phase 1: force LF)
├── docs/                         architecture documents 01–10
├── backend/
│   ├── requirements.txt          pinned runtime dependencies
│   ├── requirements-dev.txt      pinned dev/test dependencies
│   ├── alembic.ini
│   ├── alembic/                  migrations (Phase 2+)
│   ├── tests/                    unit, integration, api, security, payment-adapter contract
│   └── app/
│       ├── main.py
│       ├── core/                 config, security, db, logging, errors, audit, storage
│       ├── modules/
│       │   ├── auth/ users/ catalog/ portfolio/ scheduling/ quotes/
│       │   ├── orders/ payments/ invoices/ messaging/ reviews/
│       │   ├── notifications/ analytics/ admin/
│       │   │     (each: models.py, schemas.py, repository.py, service.py, router.py)
│       │   └── payments/providers/   aggregator/ daraja/ (later) card/ crypto/ fake/
│       ├── worker/               background jobs
│       └── cli/                  create-admin and maintenance commands
├── frontend/
│   ├── package.json, package-lock.json, next.config.ts, tsconfig.json
│   └── src/                      app/, features/, components/, lib/, messages/, hooks/, styles/, test/
├── tests/
│   └── e2e/                      Playwright end-to-end tests only
├── scripts/                      PowerShell dev helpers, backup/restore
├── deploy/                       Dockerfiles, Compose, Caddy config (added in Phase 15)
└── .github/workflows/
```

## 9. Document map

| Doc | Content |
|---|---|
| 01 | System architecture |
| 02 | Database design and ERD |
| 03 | API specification |
| 04 | Frontend architecture (Next.js, SEO, i18n readiness) |
| 05 | User flows |
| 06 | Admin dashboard |
| 07 | Payment architecture |
| 08 | Security |
| 09 | Development roadmap |
| 10 | Deployment |

## 10. Decision register

| ID | Decision | Status |
|---|---|---|
| D1 | Modular monolith backend, no microservices | Locked |
| D2 | Postgres-backed jobs; no Redis at launch | Locked |
| D3 | TypeScript frontend | Locked |
| D4 | M-Pesa via aggregator first, adapter design allows direct Daraja later | Locked (aggregator vendor still to choose, needed by Phase 9) |
| D5 | Reviews are the testimonial system | Locked |
| D6 | Three nullable payable FKs with exactly-one CHECK | Locked (doc 02 corrected) |
| D7 | Backend tests in `backend/tests`; root `tests/` for E2E | Locked |
| D8 | Refresh token in httpOnly cookie, access token in memory | Locked |
| D9 | Single VPS with Docker Compose + Caddy | Locked |
| D10 | `settings` key/value instead of `admin_settings` | Locked |
| D11 | Tailwind, TanStack Query, React Hook Form + Zod | Locked |
| D12 | Next.js for public SEO pages (replaces Vite SPA + pre-rendering) | Locked |
| D13 | One domain, `/api/*` to FastAPI, no CORS in production | Locked |
| D14 | KES primary + USD, explicit per-currency prices, no auto-conversion | Locked |
| D15 | English now, Swahili-ready (messages, translation-ready data) | Locked |
| D16 | Native Windows dev, npm, venv + pip | Locked |

## 11. Risks (summary)

Payment provider onboarding time, regulatory/tax (KRA eTIMS, VAT), crypto compliance, scope creep, solo-developer bandwidth, Next.js caching complexity and patch cadence, CSP versus static caching trade-off, Windows-to-Linux parity, security of payment code, time-zone/booking bugs, spam on public forms, data protection obligations, USD support varying by payment aggregator.

## 12. Out of scope for the initial release

Carts/multi-item checkout, coupons, subscriptions, multi-vendor marketplace, native mobile app, blog/CMS, multi-admin team features, live chat/video, real-time WebSockets, live FX conversion, a second language (architecture only).

## 13. Approval

Architecture is locked. Phase 1 implementation begins only after the owner approves the Phase 1 plan.