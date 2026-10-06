# 01 — System Architecture

Status: APPROVED, architecture locked v1.0 (2026-10-05). No application code exists yet.

## 1. Goals and constraints

NyaberaWorks is a portfolio plus service-commerce platform run by one developer. Architecture is driven by:

- **Solo maintainability**: few moving parts, boring technology, one language per tier.
- **Low cost**: runs on a single small VPS at launch.
- **SEO for public pages**: service and portfolio pages are the client-acquisition engine.
- **Security first**: payments, client data, and admin access are the sensitive surfaces.
- **Provider independence**: payment, email, storage, and (later) AI providers sit behind interfaces.
- **Growth path**: can be split into more services later without a rewrite.

## 2. Architectural style

A **modular monolith backend** (FastAPI) plus a **separate web tier** (Next.js) in front of it, one PostgreSQL database, one background worker.

- FastAPI is the **only** business/API backend and the **only** component that talks to PostgreSQL.
- Next.js renders pages and calls FastAPI over HTTP like any other client. It has no database credentials, no network route to PostgreSQL, no business rules, and no payment secrets.
- Microservices are rejected: operational overhead and cost are unjustified for one developer.

## 3. High-level diagram

```
                  +------------------------------+
                  | Browser                      |
                  +--------------+---------------+
                                 | HTTPS (one domain)
                  +--------------v---------------+
                  | Caddy (TLS, headers, limits) |
                  +---+-----------+----------+---+
          /api/*      |           | /media/* |   everything else
                      |           |  (public |
                      |           |   files) |
           +----------v--+   read-only      +v-------------------+
           | FastAPI api |   volume         | Next.js web        |
           | (Uvicorn)   |                  | (Node, standalone) |
           +--+-----+----+                  +----------+---------+
              |     |                                  |
              |     |  internal HTTP only              | server-side fetch
              |     +<---------------------------------+ (public data,
              |        /internal/revalidate (secret)      API_INTERNAL_URL)
     +--------v------+       +-----------------+
     | PostgreSQL    |<------+ worker          |
     | (db network)  |       | (jobs, email,   |
     +---------------+       |  reconciliation)|
                             +--------+--------+
                                      |
                        External providers: payment aggregator,
                        card, crypto, email, (AI later)
```

Network rule: PostgreSQL is reachable only from `api` and `worker`. The `web` container is not on the database network.

## 4. Components

| Component | Responsibility |
|---|---|
| Next.js web (App Router, TypeScript) | Server-renders public pages for SEO (metadata, structured data, sitemap); hosts client-side account, admin, auth, and checkout UI. No DB, no business rules, no secrets beyond an internal API URL and a revalidation secret. |
| Caddy | TLS, routing, static asset caching, security headers, request size limits, basic rate limiting, blocks `/internal/*` from the internet. |
| FastAPI api | All business logic, auth, RBAC, validation, payment verification, webhooks, OpenAPI contract. |
| PostgreSQL | System of record. |
| File storage | Public media (portfolio images) and private files (attachments, invoices) in separate locations behind a storage interface. Local volume at first; S3-compatible later. |
| Worker | Email, notifications, webhook retries, payment reconciliation, expiry jobs, analytics rollups, cache revalidation calls. |
| External providers | M-Pesa via an aggregator (direct Daraja later), card, crypto, email, (AI later). All behind adapters. |

## 5. Request routing (one domain)

| Path | Goes to | Notes |
|---|---|---|
| `/api/*` | FastAPI | Reserved entirely for FastAPI. Next.js must not define routes under `/api`. Includes payment webhooks. |
| `/media/*` | Caddy file server | Public, read-only portfolio/service images. Private files are never here. |
| `/_next/static/*` | Next.js | Long-lived immutable cache headers. |
| `/internal/*` | Next.js, internal only | Cache revalidation endpoint. Caddy rejects these from outside; FastAPI/worker call it over the Docker network with a shared secret. |
| everything else | Next.js | Pages, sitemap, robots. |

**Development** (native Windows): the browser talks only to the Next.js dev server on port 3000. Next rewrites `/api/*` to FastAPI on port 8000. Behavior matches production: same origin, no CORS, same cookie rules.

## 6. Backend module map

Each module owns its models, schemas, repository (DB access), service (business logic), and router.

- `auth` — register, login, token refresh, password reset, email verification
- `users` — profiles, roles, preferred locale
- `catalog` — service categories, services, per-currency prices
- `portfolio` — projects and images
- `scheduling` — availability rules, bookings
- `quotes` — quote requests, quotes, quote items
- `orders` — orders, order items, status workflow, project updates
- `payments` — provider abstraction, payment records, webhooks, reconciliation
- `invoices` — invoice generation
- `messaging` — client/admin threads attached to orders, quotes, or bookings
- `reviews` — post-completion reviews, manual testimonials, moderation
- `notifications` — in-app and email
- `analytics` — event ingestion and aggregation
- `admin` — admin-only aggregation endpoints and settings
- `core` — config, security helpers, DB session, logging, errors, audit log, storage interface

Dependency rule: modules call each other only through service-layer functions, never another module's repository. `core` depends on nothing; routers depend on services; services depend on repositories.

## 7. Layering inside a module

```
Router  ->  Service  ->  Repository  ->  Database
 (HTTP)     (rules)      (SQLAlchemy)
   ^           |
   |      Pydantic schemas (request/response, never ORM objects)
```

- Routers: parse, authorize, delegate. No business logic.
- Services: transactions, state transitions, provider adapter calls.
- Repositories: queries only.

## 8. Cross-cutting concerns

- **Config**: Pydantic settings from environment variables; fail fast on missing secrets.
- **Errors**: one error envelope (`code`, `message`, `details`, `request_id`).
- **Logging**: structured JSON, request ID per request, secrets and PII scrubbed.
- **Audit log**: append-only record of admin and money-related actions.
- **Idempotency**: payment and order creation are idempotent by key.
- **Time**: all timestamps UTC; display default Africa/Nairobi; booking slots carry explicit time zones.
- **Money**: integer minor units plus ISO currency code, never floats. Enabled currencies are KES (primary) and USD. Prices are set explicitly per currency; there is no automatic conversion.
- **Localization**: English only at launch. UI strings live in message files, content tables are translation-ready, and routing can adopt a locale segment later without changing English URLs (see 04 and 02).
- **API contract**: FastAPI generates OpenAPI; the frontend generates TypeScript types from it, so contract drift fails CI.

## 9. Background work

A worker process using a Postgres-backed job table. Redis is deliberately not required at launch.

Jobs: send email, deliver notifications, retry failed webhook processing, expire unpaid pending orders/bookings, reconcile pending payments with providers, roll up analytics, and **call the Next.js revalidation endpoint** after services, projects, or reviews are published or changed (retried until it succeeds; time-based revalidation is the fallback).

## 10. Environments

| Env | Purpose |
|---|---|
| local | **Native Windows** and VS Code. Node.js (npm) for `frontend/`, Python venv + pip for `backend/`. PostgreSQL installed natively from Phase 2. WSL2, Docker Desktop, pnpm, and uv are not required. |
| CI | Linux GitHub Actions. Runs backend tests against a PostgreSQL service container, frontend lint/typecheck/test/build, and (from Phase 15) container image builds. This is what catches Windows-vs-Linux differences. |
| staging | Optional, small and cheap, provider sandbox keys, runs the production Compose stack on Linux. |
| production | Single VPS, Docker Compose, live keys, backups, monitoring. |

Known cost of native Windows development: small differences from Linux production (path and line-ending handling, PostgreSQL collation, shell scripts). Mitigations: `.gitattributes` forcing LF, PowerShell helper scripts, `127.0.0.1` rather than `localhost` for local service URLs, and CI on Linux for every push.

## 11. Locked technology

| Layer | Choice |
|---|---|
| Frontend | Next.js (App Router) + TypeScript, Tailwind CSS, TanStack Query, React Hook Form + Zod, Axios for client-side API calls, next-intl for message files |
| Backend | Python 3.12+, FastAPI, SQLAlchemy 2.x, Pydantic v2, Alembic, JWT |
| Database | PostgreSQL |
| Jobs | Postgres-backed worker |
| Edge | Caddy |
| Packaging | npm (frontend), venv + pip (backend) |
| Production runtime | Docker Compose on one VPS: `caddy`, `web`, `api`, `worker`, `postgres` |
| CI/CD | GitHub Actions |

## 12. Scalability path

1. Vertical scaling of the VPS.
2. Managed PostgreSQL.
3. S3-compatible storage and CDN for media.
4. Multiple `api` and `web` instances behind Caddy (both are stateless).
5. Redis for cache, rate limits, and queues.
6. Extract payments or notifications into separate services only if justified.
