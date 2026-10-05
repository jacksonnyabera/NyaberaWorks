# 09 — Development Roadmap

Status: APPROVED, architecture locked v1.0 (2026-10-05); Phase 1 plan awaiting approval. Durations assume one developer working part-time alongside studies; adjust to reality. Each phase ends with a demo, passing tests, and updated docs. Do not start a phase until its dependencies are done.

## Overview

| # | Phase | Depends on | Rough effort |
|---|---|---|---|
| 1 | Foundation | — | 1–2 wks |
| 2 | Database | 1 | 1–2 wks |
| 3 | Authentication | 2 | 2 wks |
| 4 | Portfolio | 3 | 2 wks |
| 5 | Services | 3, 4 | 2 wks |
| 6 | Bookings | 5 | 2–3 wks |
| 7 | Quotes | 5, messaging basics | 2–3 wks |
| 8 | Orders | 5, 7 | 2–3 wks |
| 9 | Payments | 6, 8 | 3–4 wks |
| 10 | Client Dashboard | 6–9 | 2 wks |
| 11 | Admin Dashboard | 4–9 (grows incrementally) | 3 wks |
| 12 | Analytics | 5, 8, 9 (events from Phase 4+) | 2 wks |
| 13 | Notifications | 6–9 | 1–2 wks |
| 14 | AI features | 5, 12 | optional, 2+ wks |
| 15 | Testing and security | all | 2 wks |
| 16 | Production deployment | 15 | 1 wk |

Recommended **early public milestone**: after Phase 5 deploy a portfolio + services + contact site (no commerce). It gives a live presence for your job search while commerce phases continue. Contact form can be pulled forward into Phase 4.

## Phase details

### Phase 1 — Foundation
Purpose: repo, tooling, and conventions so later work is consistent.
- Git repo, branch strategy, PR template, commit conventions, `.gitattributes` (LF) and `.editorconfig`.
- Backend skeleton (`backend/`): Python `venv` + `pip` with pinned requirements, config loader, logging with request IDs, error envelope, `/api/health`, API docs at `/api/docs`, tests in `backend/tests`.
- Frontend skeleton (`frontend/`): Next.js + TypeScript + Tailwind with npm, layout shells (public, flows, account, admin), design tokens, Axios client for browser calls and a typed `fetch` helper for server-rendered pages, OpenAPI type generation, TanStack Query and React Hook Form + Zod wired, SEO helpers (metadata, canonical, sitemap and robots stubs), dev-only `/api/*` rewrite to FastAPI.
- Native Windows workflow: VS Code tasks for starting both servers; no Docker, WSL2, pnpm, or uv required; PostgreSQL is not needed until Phase 2.
- CI on Linux: lint, format, type-check, tests, build, dependency audit, secret scanning.
- Pre-commit hooks, secret scanning.
Exit criteria: a clean clone on Windows runs frontend + backend with one documented procedure; the home placeholder page renders and `/api/health` answers through the Next.js dev rewrite; CI green. No database, authentication, or real pages yet.

Docker is introduced later: Dockerfiles, `deploy/docker-compose.yml`, and the Caddyfile are authored at the start of Phase 15 (tested by CI image builds on Linux) and used in Phase 16.

### Phase 2 — Database
Purpose: schema foundation.
- Native PostgreSQL install on Windows (documented), dev database and roles; CI uses a PostgreSQL service container on Linux.
- SQLAlchemy base, session handling, naming conventions, Alembic setup.
- Migrations for core tables only needed next (users, categories, services, portfolio, settings, audit_logs); later phases add their own tables via migrations (avoid creating unused tables).
- Seed script (dev data).
- DB roles and local backup/restore practice.
Exit: migrate up/down works; ERD matches doc 02.

### Phase 3 — Authentication
Purpose: identity and authorization base.
- Register, verify email, login, refresh rotation, logout, reset, change password.
- RBAC dependencies; first admin created via a CLI command (never a public endpoint).
- Rate limiting, lockout, audit events.
- Frontend: login/register pages, auth context, route guards, interceptor.
- Email sending abstraction (console backend in dev, real provider later).
Exit: security tests for auth pass; admin 2FA design decided (implement here or in Phase 15 at latest before launch).

### Phase 4 — Portfolio
Purpose: showcase content (highest job-search value).
- Portfolio models/endpoints, image uploads with processing, admin CRUD (minimal admin UI shell).
- Public Home, About, Portfolio, Project Details pages as server-rendered/ISR Next.js pages with full SEO (metadata, canonical URLs, structured data, sitemap, social previews).
- Cache revalidation: publishing in admin triggers Next.js on-demand revalidation through the worker.
- Contact form + contact_messages (pulled forward).
- Analytics tracker stub (page/portfolio view events).
Exit: publishable portfolio site.

### Phase 5 — Services
Purpose: catalogue and pricing.
- Categories, services, requirements schema, pricing types, per-currency prices (`service_prices`: KES required, USD optional).
- Public services list/detail; admin CRUD with price management.
- Link services ↔ portfolio projects.
Exit: complete browsable catalogue with CTAs routed by pricing type.

### Phase 6 — Bookings
Purpose: consultations.
- Availability rules/exceptions, slot computation, time-zone handling.
- Booking creation with hold + exclusion constraint, cancel/reschedule.
- Admin booking management; .ics generation.
- Payment hookup is stubbed (free or "pay later" until Phase 9).
Exit: booking works end to end without payment, no double-booking under concurrency test.

### Phase 7 — Quotes
Purpose: custom project pipeline.
- Quote requests (guest/client), admin review, quote builder, send, accept/reject/revise, expiry job.
- Basic conversations/messages (needed for clarification) introduced here.
Exit: request → quote → accepted state works (order creation from the verified deposit is wired in Phases 8–9).

### Phase 8 — Orders
Purpose: core delivery workflow.
- Orders, order items (snapshots), status machine, order updates, attachments, delivery approval.
- Fixed-price order creation; accepted-quote orders are created when the deposit is verified (simulated until Phase 9).
- Invoice model + PDF generation.
- Auto-cancel unpaid orders job.
Exit: full order lifecycle works with payments simulated by an admin "mark paid (test)" available only in dev.

### Phase 9 — Payments
Purpose: real money, safely.
- Provider-independent payment module, fake adapter + contract test suite.
- Order: first real adapter (M-Pesa through the chosen aggregator, decision D4; direct Daraja can replace it later without changing the payment core), then card, then crypto. Both KES and USD are validated per payment.
- Webhooks, verification, reconciliation job, refunds, manual payments, admin payment views.
- Replace Phase 8's simulated payment; deposit payments on accepted quotes (`payments.quote_id`) create the order on verification.
Exit: sandbox end-to-end for each provider; failure-mode tests (duplicate/forged/late webhooks) pass; security review of payment code.

### Phase 10 — Client Dashboard
Purpose: self-service portal.
- Account overview, orders, bookings, quotes, payments/invoices, messages, profile, review submission.
Exit: a client can complete every flow without admin help except delivery.

### Phase 11 — Admin Dashboard
Purpose: unified operations console (admin features are built incrementally in earlier phases; this phase consolidates).
- Dashboard KPIs and queues, clients, reviews moderation, settings, audit log viewer, messages inbox.
Exit: day-to-day operation possible without database access.

### Phase 12 — Analytics
Purpose: business insight.
- Event ingestion hardening, consent handling, aggregation jobs, funnel/revenue/top-services endpoints and charts, CSV export.
Exit: dashboard numbers reconcile with order/payment tables.

### Phase 13 — Notifications
Purpose: reliable communication.
- Unified notification service (in-app + email), templates, queue with retries, preferences, reminders (bookings, quote expiry).
Exit: notification matrix in doc 05 fully covered.

### Phase 14 — AI features (optional, after core is stable)
Candidate features (pick by value; each independent):
- Admin-side: draft replies, summarize quote requests, suggest quote line items.
- Public: service recommender / FAQ assistant.
- Content: portfolio description helper.
Rules: provider abstraction (like payments), no sensitive data sent without need, human approval before anything is sent to a client, usage/cost caps, prompt-injection safeguards.

### Phase 15 — Testing and security
- Author Dockerfiles, `deploy/docker-compose.yml`, and the Caddyfile; add a CI job that builds the `web`, `api`, and `worker` images on Linux.
- Test coverage review (unit, integration, API, E2E), load test of key endpoints, concurrency tests.
- Security review against doc 08, OWASP ZAP baseline, dependency audit, backup/restore drill, accessibility pass, performance (Lighthouse).
- Legal pages finalized.

### Phase 16 — Production deployment
- Provision infrastructure, DNS, TLS, secrets, CI/CD deploy, monitoring/alerts, backups verified, runbook, go-live checklist, switch providers to live keys with small real transactions.

## Definition of done (every feature)
Code reviewed, tests (incl. authorization tests), migrations reversible, docs updated, security checklist item reviewed, no secrets in diff.

## Scope control
Features not in this roadmap (coupons, subscriptions, multi-currency FX, multi-admin teams, mobile app, blog/CMS) go into a backlog and are re-evaluated after launch.