# 08 — Security

Status: APPROVED, architecture locked v1.0 (2026-10-05). Security is a design input to every phase, not a final step.

## 1. Threat model summary

Assets: client accounts and contact data, payment records, uploaded files, admin access, provider credentials, business reputation.
Main threats: credential stuffing and account takeover, admin compromise, forged payment callbacks, IDOR (accessing other clients' data), injection and XSS, malicious uploads, bots and spam, secret leakage, supply-chain compromise in npm/pip dependencies, data loss.

## 2. Authentication

- **Password hashing**: Argon2id (preferred) with tuned parameters; fallback bcrypt cost >= 12. Never store or log plaintext.
- **Password policy**: minimum 10–12 characters, check against a breached-password list (k-anonymity API or local list), no forced periodic rotation.
- **JWT access token**: short-lived (15 min), signed with a strong secret or asymmetric key (EdDSA/RS256 preferred for future key rotation), claims: `sub`, `role`, `iat`, `exp`, `jti`. Algorithm pinned on verification.
- **Refresh token**: opaque random value (not a JWT), stored hashed in the DB, rotating on use, family-based reuse detection (reuse revokes the whole family). Delivered as an `HttpOnly; Secure; SameSite=Lax` (or Strict) cookie scoped to `/api/v1/auth`. Because the site is a single domain, the cookie is same-site for every call.
- **Access token storage**: in memory only in the browser; never localStorage. This is why account and admin pages are client-side: the Next.js server never holds user tokens.
- **Email verification** required before purchasing/booking.
- **Password reset**: single-use, hashed token, 30-minute expiry, revokes sessions, uniform responses to avoid account enumeration.
- **Brute-force protection**: per-IP and per-account rate limits, progressive lockout, generic error messages.
- **Admin 2FA**: TOTP mandatory for ADMIN before production; recovery codes stored hashed.

## 3. Authorization

- RBAC with roles CLIENT and ADMIN; dependency-based enforcement in FastAPI on every route (deny by default).
- **Authorization lives only in FastAPI.** Next.js route guards, layouts, and middleware are UX conveniences and are never the security boundary.
- **Object-level checks** (anti-IDOR): every client resource query is filtered by owner (`client_id = current_user.id`); foreign resources return 404 rather than 403.
- Admin routes isolated under `/api/v1/admin`; one router-level dependency requires ADMIN.
- The server controls all state transitions, prices, and currencies; clients cannot send `status`, `price`, `total`, `role`, or `is_admin` fields (schemas use explicit allowlists and `extra="forbid"`).

## 4. Transport and browser security

- HTTPS everywhere; HSTS (preload only after confidence), TLS 1.2+.
- **Same origin, no CORS in production.** The site and API share one domain through Caddy, so browsers make same-origin requests and no cross-origin access is granted. FastAPI's CORS allowlist is empty by default; any future cross-origin client (for example a separate admin host) must be added explicitly with credentials restricted to it. No wildcard with credentials, ever. Development also runs same-origin through the Next.js rewrite.
- **CSRF**: bearer-token API calls are not CSRF-prone. The cookie-authenticated endpoints (`/auth/refresh`, `/auth/logout`) are protected by SameSite, Origin/Referer checks, and a custom header requirement (or double-submit token).
- **Security headers** (set at Caddy, with page-specific CSP from Next.js where needed): Content-Security-Policy, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, `frame-ancestors 'none'`, HSTS.
  - **CSP trade-off with Next.js**: a strict nonce-based CSP forces pages to render dynamically, which removes static/ISR caching that the public SEO pages depend on. Plan: nonce-based strict CSP for account, admin, auth, and checkout (already dynamic or client-side); for cached public pages, a CSP that forbids `unsafe-eval`, restricts script sources to self and named provider/analytics domains, and starts in Report-Only mode with a reporting endpoint. Revisit hash- or SRI-based script policies for public pages as Next.js support matures. Confirm the exact mechanism against the Next.js version chosen in Phase 1.
- **XSS**: React escapes by default; no `dangerouslySetInnerHTML` without DOMPurify; user-provided markdown sanitized server- and client-side; JSON-LD is produced by serializing objects and escaping `<`; CSP as a second layer.

## 4a. Next.js web tier

- **No database access**: the `web` container has no database credentials, no database driver, and is not on the database network. It talks only to `api` over the internal network.
- **No secrets in the browser bundle**: only `NEXT_PUBLIC_*` values reach the client, and those are public by definition. Server-only variables are limited to `API_INTERNAL_URL` and `REVALIDATE_SECRET`.
- **No second backend**: no Route Handlers under `/api`, no Server Actions for business mutations, no business rules in Next.js code.
- **Revalidation endpoint** (`/internal/revalidate`): requires a shared secret compared in constant time, accepts only a fixed set of cache tags, and is rejected by Caddy for any request from outside the Docker network.
- **SSR is public-data only**: server-side fetches carry no user cookies or tokens, and responses are never cached with user-specific data.
- **Image optimizer**: `remotePatterns` limited to the own domain; size limits set; prevents use as an open image proxy.
- **Open redirects**: post-login `redirect` parameters accepted only as relative internal paths.
- **Patch discipline**: Next.js has had security advisories, including a 2025 middleware authorization-bypass issue. Keep Next.js on a supported, patched release, subscribe to advisories, and never rely on middleware for authorization.
- **Metadata and structured data** are generated only from approved API fields; admin-entered text is escaped.
- **Errors**: production error pages show no stack traces; `X-Powered-By` disabled.

## 5. Input validation and injection

- Pydantic schemas validate every request (types, lengths, enums, formats); reject unknown fields. Zod on the frontend is for UX only.
- SQLAlchemy parameterized queries only; no string-built SQL; reviewed raw SQL, if any.
- Output encoding for emails and PDFs (escape template variables).
- Validate and normalize phone numbers, emails, and URLs; block SSRF by never fetching user-supplied URLs server-side without an allowlist.

## 6. Rate limiting and abuse prevention

| Endpoint group | Limit (initial guidance) |
|---|---|
| Login / register / forgot-password | 5–10 per minute per IP, plus per account |
| Contact / quote request | 3–5 per hour per IP + captcha for guests |
| Payment creation | 10 per hour per user |
| Analytics ingestion | Per IP burst limits, payload size cap |
| General API | 60–120 per minute per user/IP |

Implementation: Caddy-level limits plus an app-level limiter (in-memory per instance at first; Redis-backed if scaling out). FastAPI trusts forwarded client IPs only from the Caddy proxy address. Captcha (Cloudflare Turnstile/hCaptcha) on public forms. Honeypot fields.

## 7. File uploads

- Authenticated for order/quote files; admin for portfolio images.
- Validate extension allowlist AND magic bytes; enforce size limits; reject archives with path traversal; rename to random keys; store outside the web root.
- Images re-encoded (strip EXIF/GPS) and resized.
- **Public vs private storage**: portfolio and service images are written to a public media location served read-only at `/media/*`. Order attachments, quote files, messages, and invoices go to a separate private location that no web server path exposes.
- Private files served only through authorized API endpoints or short-lived signed URLs, `Content-Disposition: attachment`, correct `Content-Type`, `nosniff`.
- Malware scanning (ClamAV) as an optional later step; `scan_status` field reserved.
- Quotas per user/order.

## 8. Payment security

- Server-side amount and currency calculation and verification (see 07).
- Webhook authenticity: signature/shared secret/IP allowlist plus authoritative provider query. Webhook URLs are under `/api/v1/payments/webhooks/*` and reach FastAPI directly through Caddy; Next.js never sees them.
- Idempotency, row locks, replay protection.
- No card data touches our servers (hosted checkout).
- Secrets only in environment variables of the `api` and `worker` containers; separate sandbox and live; rotate on suspicion. The `web` container receives no payment credentials.
- Admin manual payment recording requires reason, proof, and is audited.

## 9. Secrets management

- `.env` files never committed; `.env.example` has placeholders only; `.gitignore` enforced; pre-commit secret scanning (gitleaks) and GitHub secret scanning enabled.
- Frontend variables are split by risk: `NEXT_PUBLIC_*` (public), server-only (`API_INTERNAL_URL`, `REVALIDATE_SECRET`). Nothing sensitive may be prefixed `NEXT_PUBLIC_`; CI checks for this.
- Production secrets in the host's secret store or env files with `600` permissions owned by the service user, mounted only into the containers that need them.
- Config loader fails fast if a required secret is missing or still has a placeholder.
- Secrets masked in logs and error reports; never returned by APIs.
- Rotation procedure documented (JWT key, provider keys, DB password, revalidation secret).

## 10. Audit logging

Log (append-only): logins (success/failure), 2FA changes, password resets, role/status changes, service/price changes, order status changes, payment verification outcomes, manual payments, refunds, settings changes, data exports, and admin downloads of private files. The app DB role has INSERT only on `audit_logs`. Include actor, IP, user agent, request ID, before/after.

## 11. Logging, errors, monitoring

- Structured logs with request IDs; no passwords, tokens, full card/phone numbers, or secrets.
- Generic error responses to clients; stack traces only in logs/Sentry (with PII scrubbing), for both `api` and `web`.
- Alerts: repeated login failures, webhook signature failures, payment mismatches, 5xx spikes, backup failures, certificate expiry, failed revalidation jobs.
- Uptime monitoring on `/api/health` and the homepage.

## 12. Database security

- Separate DB roles: migration role (DDL), app role (DML only), read-only analytics role.
- DB not publicly exposed; on the private `db` network reachable only by `api` and `worker`.
- Encrypted connections (TLS) to managed DBs.
- Backups encrypted, stored off-host, restore-tested.

## 13. Infrastructure hardening

- OS patching, SSH keys only, no root login, firewall (80/443 + restricted SSH), fail2ban or provider equivalent.
- Containers run as non-root; minimal base images; image scanning. Compose networks: `edge` (caddy, web, api), `internal` (web, api, worker for service calls), and `db` (api, worker, postgres only).
- Dependency updates (Dependabot), `pip-audit` and `npm audit` in CI, lockfiles committed (`package-lock.json`, pinned `requirements*.txt`). Treat new npm packages with care: check maintainers, avoid install scripts where possible, and pin versions.
- Separate staging and production credentials.

## 14. Privacy and compliance

- Kenya Data Protection Act 2019: lawful basis, consent for analytics cookies, privacy policy, data subject access/deletion process, consider registration with the ODPC as a data controller/processor.
- Minimize collected data; no raw IPs in analytics (hash/truncate); coarse geo only.
- Retention schedule in 02-database-design.md.
- Cookie banner for non-essential analytics.

## 15. Secure development practices

- Code review via PRs even as a solo dev (self-review checklist), protected main branch.
- Tests for authorization (every endpoint has a "wrong user" test).
- Threat-model checklist per new feature.
- Pre-launch: security checklist, dependency audit, basic penetration test (OWASP ZAP baseline), review against OWASP Top 10 and ASVS Level 1–2.

## 16. Incident response (minimal plan)

1. Detect (alerts). 2. Contain (disable provider/admin session, rotate secrets). 3. Assess scope using audit logs. 4. Notify affected users and the ODPC where required (72-hour breach notification under Kenyan law). 5. Recover and write a post-mortem.