# 10 — Deployment

Status: APPROVED, architecture locked v1.0 (2026-10-05). Costs are rough and must be re-checked at provisioning time.

## 1. Locked choice

A **single VPS running Docker Compose** with five containers: `caddy`, `web` (Next.js), `api` (FastAPI), `worker`, and `postgres`. One domain; `/api/*` goes to FastAPI and everything else to Next.js.

Alternatives considered: a PaaS (less ops, higher cost, vendor lock-in) and splitting the frontend onto a static/edge host (not applicable now that Next.js needs a Node runtime and shares one domain with the API).

## 2. Runtime topology

```
Internet -> Caddy (80/443, TLS, headers, rate limit, /media/*)
              |-- /api/*      -> api    (FastAPI, Uvicorn/Gunicorn workers)
              |-- /internal/* -> rejected from outside
              `-- everything  -> web    (Next.js standalone server)
api, worker -> postgres (volume, or managed DB later)
worker -> web  (internal revalidation call, shared secret)
Backups -> encrypted dump to off-site object storage
```

Compose networks: `edge` (caddy, web, api), `internal` (web, api, worker), `db` (api, worker, postgres). `web` is not on `db`; only Caddy publishes ports.

Sizing: Next.js adds roughly 150–300 MB of RAM at idle. Start with **2 vCPU / 4 GB RAM**.

## 3. Routing rules (conceptual)

| Match | Target | Notes |
|---|---|---|
| `/api/*` | `api:8000` | Includes payment webhooks. Upload size limit set here. |
| `/media/*` | read-only public media volume | Portfolio and service images only. |
| `/_next/static/*` | `web:3000` | Immutable long-lived cache headers. |
| `/internal/*` | blocked externally | Reachable only by `api`/`worker` over the internal network. |
| everything else | `web:3000` | Pages, sitemap, robots. |
| non-canonical host (www or apex) | 301 to canonical | One canonical host for SEO. |

## 4. Development environment (native Windows)

- **Locked for Phase 1**: Windows, VS Code, Git. Node.js (current LTS) with **npm**, Python 3.12+ with **venv + pip**. No WSL2, Docker Desktop, pnpm, or uv required.
- Frontend runs `next dev` on port 3000 with a rewrite sending `/api/*` to FastAPI at `http://127.0.0.1:8000`. Use `127.0.0.1`, not `localhost`, for service URLs: Node may resolve `localhost` to IPv6 while Uvicorn listens on IPv4, which causes confusing connection failures on Windows.
- PostgreSQL is not needed in Phase 1. From Phase 2, install PostgreSQL natively on Windows and create the dev database and roles with a documented script.
- Helper scripts are PowerShell (`scripts/*.ps1`) plus npm scripts; no Makefile dependency.
- `.gitattributes` forces LF line endings so scripts and Docker files behave on Linux.
- **Docker is used only where Linux is the target**: CI and the VPS. Dockerfiles, Compose files, and the Caddy configuration are authored at the start of Phase 15 (not in Phase 1) and used in Phase 16. Anyone may optionally use Docker locally, but nothing requires it.
- **Parity safeguard**: GitHub Actions on Linux runs the backend tests against a PostgreSQL service container and builds the frontend on every push, catching Windows-versus-Linux differences early.

## 5. Environments and configuration

- Local: `frontend/.env.local` and `backend/.env`. Staging and production use env files on the server. All are untracked. The root `.env.example` documents every variable and marks which tier uses it.
- Variable groups: app (env, URLs), database, JWT/keys, cookies, email provider, storage, currency and locale, payment aggregator and providers, captcha, monitoring, AI (later), and the Next.js group (`NEXT_PUBLIC_*` and server-only variables).
- Production: debug off, API docs disabled or admin-gated, secure cookies on, same-origin so CORS stays empty.

## 6. CI/CD

- GitHub Actions on pull requests: backend lint, type-check, and tests (with PostgreSQL service container); frontend lint, type-check, unit tests, and production build; OpenAPI-to-TypeScript contract check; dependency audits (`pip-audit`, `npm audit`); secret scanning.
- From Phase 15: build `web`, `api`, and `worker` images on the CI runner and push to GitHub Container Registry. Images are built in CI, not on the VPS, because Next.js builds are memory-hungry.
- On merge to `main`: deploy to staging; production deploy by manual approval or tag.
- Deploy mechanism: SSH + `docker compose pull && docker compose up -d`, health-gated.
- Migrations: run `alembic upgrade head` as an explicit step before switching traffic; migrations are backward-compatible (expand/contract) to allow rollback.
- Rollback: redeploy the previous image tags; DB changes designed to be compatible with N-1.
- After deploy: call the revalidation endpoint (or warm key pages) so cached pages match the new release.

## 7. Database operations

- PostgreSQL 16 (or current supported release), tuned for a small instance.
- **Backups**: daily `pg_dump` (compressed, encrypted with a key held off-server) pushed to off-site object storage; keep 7 daily, 4 weekly, 12 monthly. If a managed Postgres is adopted later, enable PITR.
- **Restore drill** every quarter, documented in a runbook.
- Migrations only via Alembic; never manual schema edits in production.
- Connection pooling via SQLAlchemy; add PgBouncer only if needed.

## 8. File storage

- Launch: two directories on mounted volumes behind the storage interface: **public media** (served at `/media/*`) and **private files** (never served directly). Both included in backups.
- Growth: S3-compatible object storage (Cloudflare R2, Backblaze B2, Wasabi, AWS S3) with signed URLs for private files and a CDN for public media.

## 9. Domain, DNS, TLS, email

- Domain registered with 2FA on the registrar; DNS via Cloudflare (optional proxy/WAF/DDoS protection). If the Cloudflare proxy is used, configure Caddy and FastAPI to trust its forwarded-IP headers correctly.
- TLS automatic via Caddy (Let's Encrypt).
- Transactional email through a reputable provider (Resend, Postmark, Brevo, Amazon SES, Mailgun). Configure SPF, DKIM, DMARC.
- Payment webhook URLs: stable HTTPS URLs under `/api/v1/payments/webhooks/*`; in development use a tunnel (Cloudflare Tunnel or ngrok) for callbacks.
- Search: verify the domain in Google Search Console and submit the sitemap at launch.

## 10. Monitoring and observability

- Uptime checks on `/api/health` and the homepage (UptimeRobot/Better Stack).
- Error tracking: Sentry (free tier) for `api`, `worker`, and `web`, with PII scrubbing.
- Logs: container logs with rotation; ship to a log service if budget allows.
- Metrics (later): latency, 5xx rate, queue depth, failed payments, failed revalidations, Core Web Vitals.
- Alerts to email/Telegram/WhatsApp for downtime, backup failure, disk usage above 80%, memory pressure, certificate expiry, payment anomalies.

## 11. Hardening checklist

- SSH key-only, non-root deploy user, firewall (22 restricted, 80, 443), unattended security upgrades, fail2ban.
- Docker: non-root users, read-only filesystems where possible, resource limits (set a memory limit on `web` so a Node leak cannot starve Postgres), pinned image digests.
- Secrets never baked into images; mounted via env file or secret store, only into the containers that need them. The `web` container gets no database or payment secrets.
- Separate sandbox and live payment credentials; verify the correct set per environment on startup (log provider mode, not secrets).

## 12. Go-live checklist (summary)

1. Staging passes full E2E with provider sandboxes.
2. Security checklist (doc 08) and Phase 15 review complete.
3. Backups running and a restore tested.
4. Legal pages published (privacy, terms, refund policy); cookie consent working.
5. Email deliverability verified (SPF/DKIM/DMARC).
6. Monitoring and alerts live; runbook written.
7. SEO verified in rendered HTML: metadata, canonical, Open Graph previews, JSON-LD, sitemap, robots; Search Console set up.
8. Live provider keys configured; small real transactions tested per provider and refunded.
9. First admin account with 2FA created through the CLI; default/seed accounts removed.
10. `robots.txt` and `noindex` confirmed for account, admin, and checkout.
11. DNS cut-over and post-launch smoke test.

## 13. Cost sketch (monthly, indicative)

| Item | Estimate |
|---|---|
| VPS (2 vCPU / 4 GB) | USD 12–20 |
| Domain | USD 1–2 |
| Off-site backups / object storage | USD 1–5 |
| Email (low volume) | free to USD 10 |
| Error tracking, uptime | free tier |
| Payment fees | per transaction (aggregator/provider-specific) |
| **Total baseline** | **about USD 15–35** |

## 14. Scaling triggers

- CPU/RAM above 70% sustained: larger VPS (the `web` container is usually the first to need memory).
- DB above 50% of resources or backup window grows: managed Postgres.
- Heavy file or image traffic: object storage + CDN.
- Need multiple `api` or `web` instances: add Redis for rate limits and the queue, and a load balancer.
