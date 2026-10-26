# 15 — As built: what exists today versus the design

Docs 01–10 describe the **target design**. This page says what the code actually does now, so nobody
mistakes a plan for a feature. When the two differ, this page and the code win. Updated 2026-10-27
(through migration `0005`).

## Built and working

| Area | As built |
|---|---|
| Public site | Home, about, services, portfolio, FAQ, legal pages, SEO metadata, structured data, sitemap. Services and projects come from the catalog tables, with a built-in fallback when the API is unreachable. |
| Requests | Contact, quote and booking forms saved to `contact_messages`, `quote_requests`, `booking_requests` (the table was renamed from `bookings` in migration `cb0548d94dfc`). Honeypot, per-visitor hourly limit, owner email alert. |
| Accounts | Register, login, logout, refresh-token rotation with reuse detection, change password, Argon2id hashing, 15-minute access token in memory, httpOnly refresh cookie, lockout after 5 failed attempts per account. |
| Per-visitor limits | Register 5 per hour, failed logins 10 per 15 minutes, password-reset requests 5 per hour, leads 5 per hour. Counted in the database (`auth_events`), so they hold across server restarts and instances. |
| Password reset | `POST /auth/forgot-password` (always 202) and `/auth/reset-password`. Single-use hashed link, 30-minute expiry, at most 3 links per account per hour, revokes every session, clears a lockout. **Needs SMTP configured to deliver the email.** |
| Admin two-factor | Optional TOTP for the admin role only (`/auth/2fa/setup`, `/enable`, `/disable`), 8 single-use recovery codes, replay protection. Not forced on. Recovery: `python -m app.cli.reset_2fa --email ...`. |
| Conversations | Signed-in clients get replies and quotations under `/me/...`; admin replies and sends quotations under `/admin/requests/...` and `/admin/quote-requests/.../quotations`. Tables `lead_messages` and `quotations`. Guests cannot receive replies in the app. |
| Admin area | Overview, messages, quotes, bookings, clients, services, portfolio. Admin is not linked from the public site; sign in at `/login`. |
| WhatsApp | Floating chat button and hero button, +254 798 304 161, starts a chat only. |
| Deployment | Website on Vercel, API on Render, database on Neon (doc 14). Docker Compose + Caddy for a paid server (doc 11). |

## Partly built

| Area | State |
|---|---|
| Payments | Module `app/modules/payments` exists: `payments` and `payment_transactions` ledger tables, an admin-only endpoint that records a payment intent, Daraja M-Pesa STK push and callback handling. There is **no client checkout**, no link to quotations or invoices, and it has **not been run against live M-Pesa**. Do not enable it in production until doc 07 prerequisites are met. |

## Designed but not built

Email verification, orders and invoices, reviews, card and crypto payments, `audit_logs`, a
Content-Security-Policy and HSTS, Redis, file uploads, the `/messages/conversations` API in doc 03
(the built version is the `/me` and `/admin/requests` endpoints above), and the unified
`conversations` table in doc 02 (the built version is `lead_messages` attached to each request).

## Known gaps

- The admin TOTP secret is stored unencrypted in the database. Anyone with database access can read it.
- There is no email verification yet, so an account's email address is not proven.
- Email (reset links, owner alerts) only works once `EMAIL_BACKEND=smtp`, the `SMTP_*` settings,
  `EMAIL_FROM` and `SITE_URL` are set on the API.
- The portfolio project images are illustrations, not screenshots.
