# 03 — API Specification (Design Only)

Status: APPROVED, architecture locked v1.0 (2026-10-05). Nothing is implemented.

Deployment contract: the API is served on the same domain as the site under `/api/*` (path forwarded unchanged by Caddy). Interactive docs are at `/api/docs`, the OpenAPI schema at `/api/openapi.json` (the frontend generates its TypeScript types from it), and an unversioned health check at `/api/health`. Money fields carry `currency` (KES or USD); a single document never mixes currencies. FastAPI is the only business/API backend; Next.js calls only the public, unauthenticated endpoints on the server and calls everything else from the browser.

## 1. Conventions

- Base path: `/api/v1`. Breaking changes → `/api/v2`.
- JSON only (except file upload multipart and webhook raw bodies).
- Auth: `Authorization: Bearer <access JWT>` (15 min). Refresh token in httpOnly, Secure, SameSite cookie (see 08-security.md).
- Roles: PUBLIC, CLIENT, ADMIN. Ownership checks are enforced server-side on every client resource.
- IDs: UUIDs. Money: `{ "amount_minor": 5000000, "currency": "KES" }`.
- Pagination: `?page=1&page_size=20` (max 100) → `{ items, page, page_size, total }`. Sorting `?sort=-created_at`.
- Errors: `{ "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [...], "request_id": "..." } }` with correct HTTP status (400, 401, 403, 404, 409, 422, 429, 500).
- Idempotency: `Idempotency-Key` header required on payment creation and order creation.
- Rate limits: stricter on auth, contact, quote request, and payment endpoints.
- OpenAPI docs: enabled in dev/staging; disabled or admin-gated in production.
- Admin endpoints live under `/api/v1/admin/...` and require ADMIN on every route.

## 2. Areas

### 2.1 /auth
| Method | Path | Access | Purpose |
|---|---|---|---|
| POST | /auth/register | Public | Create client account; send verification email |
| POST | /auth/verify-email | Public | Confirm token |
| POST | /auth/login | Public | Returns access token; sets refresh cookie |
| POST | /auth/refresh | Cookie | Rotate refresh token |
| POST | /auth/logout | Client/Admin | Revoke refresh token family |
| POST | /auth/forgot-password | Public | Send reset link (always 202) |
| POST | /auth/reset-password | Public | Set new password |
| GET | /auth/me | Client/Admin | Current user |
| PATCH | /auth/me | Client/Admin | Update profile |
| POST | /auth/change-password | Client/Admin | Requires current password |

### 2.2 /services
| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | /services/categories | Public | List categories |
| GET | /services | Public | List active services (filter category, pricing type, search) |
| GET | /services/{slug} | Public | Detail incl. requirements form definition |
| GET | /services/{slug}/reviews | Public | Approved reviews |
| GET | /services/{slug}/availability | Public | Bookable slots for consultation services (`from`, `to`, `tz`) |

### 2.3 /portfolio
| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | /portfolio | Public | List published projects (filter category/tag) |
| GET | /portfolio/{slug} | Public | Project details and images |
| GET | /portfolio/featured | Public | Homepage selection |

### 2.4 /bookings
| Method | Path | Access | Purpose |
|---|---|---|---|
| POST | /bookings | Client | Hold a slot (status PENDING_PAYMENT or CONFIRMED if free) |
| GET | /bookings | Client | My bookings |
| GET | /bookings/{id} | Client (owner) | Detail |
| POST | /bookings/{id}/cancel | Client (owner) | Cancel per policy |
| POST | /bookings/{id}/reschedule | Client (owner) | Move to another free slot |

Slot hold expires after N minutes if payment is not completed.

### 2.5 /quotes
| Method | Path | Access | Purpose |
|---|---|---|---|
| POST | /quotes/requests | Public/Client | Submit requirements (captcha for guests) |
| GET | /quotes/requests | Client | My requests |
| GET | /quotes | Client | Quotes sent to me |
| GET | /quotes/{id} | Client (owner) | Quote with items |
| POST | /quotes/{id}/accept | Client (owner) | Accept; triggers deposit payment creation |
| POST | /quotes/{id}/reject | Client (owner) | Reject with reason |
| POST | /quotes/{id}/request-changes | Client (owner) | Opens message thread / new revision |

Quote creation and editing is under `/admin/quotes`.

### 2.6 /orders
| Method | Path | Access | Purpose |
|---|---|---|---|
| POST | /orders | Client | Create order for fixed-price service with requirements; returns payment-required state |
| GET | /orders | Client | My orders |
| GET | /orders/{id} | Client (owner) | Detail with status timeline |
| GET | /orders/{id}/updates | Client (owner) | Project updates |
| POST | /orders/{id}/attachments | Client (owner) | Upload files |
| POST | /orders/{id}/approve-delivery | Client (owner) | Mark delivery accepted → COMPLETED |
| POST | /orders/{id}/cancel | Client (owner) | Only before work starts |
| GET | /orders/{id}/invoice | Client (owner) | Invoice PDF |

Order status is never settable by clients except the explicit actions above.

### 2.7 /payments
| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | /payments/methods | Public/Client | Enabled providers and methods for currency/amount |
| POST | /payments | Client | Create payment for a payable (`order`, `booking`, `quote deposit`), choose provider; returns provider action (STK push started / redirect URL / crypto address+amount) |
| GET | /payments/{id} | Client (owner) | Status (poll or SSE) |
| POST | /payments/{id}/cancel | Client (owner) | Cancel unpaid |
| POST | /payments/webhooks/{provider} | Provider only | Signed callback; verified and processed server-side |
| GET | /payments | Client | My payment history |

Frontend never decides that a payment succeeded; it only reads `status`.

### 2.8 /messages
| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | /messages/conversations | Client | My threads |
| POST | /messages/conversations | Client | Start thread (general or about order/quote/booking) |
| GET | /messages/conversations/{id} | Client (owner) | Messages |
| POST | /messages/conversations/{id}/messages | Client (owner) | Send |
| POST | /messages/conversations/{id}/read | Client (owner) | Mark read |
| POST | /messages/contact | Public | Contact form (captcha, rate limited) |

Realtime: start with polling every 15–30 s; SSE/WebSocket later.

### 2.9 /reviews
| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | /reviews | Public | Approved reviews/testimonials |
| POST | /reviews | Client | Review a COMPLETED order (once) |
| PATCH | /reviews/{id} | Client (owner) | Edit within a short window |

### 2.10 /analytics
| Method | Path | Access | Purpose |
|---|---|---|---|
| POST | /analytics/events | Public | Ingest events (page view, service view, portfolio view, CTA click); batch; consent-aware; heavily rate-limited |
| GET | /analytics/summary | Admin | KPI summary (also exposed under /admin) |
| GET | /analytics/funnel | Admin | Visit → view → quote/booking/order → paid |
| GET | /analytics/top-services | Admin | Popular services |
| GET | /analytics/revenue | Admin | Revenue by period/service/provider |

### 2.11 /notifications (client-facing)
| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | /notifications | Client/Admin | My notifications |
| POST | /notifications/{id}/read | Client/Admin | Mark read |
| POST | /notifications/read-all | Client/Admin | Mark all read |

### 2.12 /admin (all ADMIN only)
| Area | Endpoints (summary) |
|---|---|
| Dashboard | GET /admin/dashboard (KPIs, recent activity, pending actions) |
| Services | CRUD /admin/services, /admin/service-categories; PATCH price; toggle active/featured |
| Portfolio | CRUD /admin/portfolio; image upload/reorder |
| Clients | GET /admin/clients, GET /admin/clients/{id} (orders, payments, messages), PATCH status (suspend) |
| Bookings | GET list/detail; confirm, reschedule, cancel, complete; manage availability rules and exceptions |
| Quote requests | List, assign, change status, decline |
| Quotes | Create from request, edit draft, add items, send, revoke, new version |
| Orders | List/detail; change status through allowed transitions; post updates; attach deliverables; issue invoice |
| Payments | List/detail; transactions log; manual-payment record (e.g. bank transfer) with audit; refund; reconcile |
| Messages | All conversations; reply; mark resolved; contact messages inbox |
| Reviews | Approve, hide, feature, reply |
| Analytics | Same as /analytics/* plus exports (CSV) |
| Settings | GET/PUT /admin/settings (business info, taxes, payment providers on/off, booking rules) |
| Audit log | GET /admin/audit-logs (filter) |
| Admin users | Later: manage additional admins/roles |

## 3. State machines (enforced in services)

**Order**: PENDING_PAYMENT → PAID → IN_PROGRESS ⇄ AWAITING_CLIENT → IN_REVIEW → COMPLETED; any pre-IN_PROGRESS → CANCELLED; PAID/IN_PROGRESS → REFUNDED (via refund).
**Booking**: PENDING_PAYMENT → CONFIRMED → COMPLETED | NO_SHOW | CANCELLED.
**Quote**: DRAFT → SENT → ACCEPTED | REJECTED | EXPIRED | REVOKED.
**Payment**: CREATED → PENDING → PROCESSING → SUCCEEDED | FAILED | EXPIRED | CANCELLED; SUCCEEDED → REFUNDED.

Invalid transitions return 409.

## 4. Webhooks

- Raw body read for signature verification before parsing.
- Provider IP allowlist where the provider publishes ranges, in addition to signatures/shared secret.
- Event stored in `payment_transactions` first (dedupe by provider event id), then verified with the provider API, then state applied in one DB transaction.
- Always respond quickly (2xx) once stored; heavy work goes to the worker.

## 5. File uploads

- Presented as multipart to the API (not directly to the bucket at launch).
- Allowlist types (pdf, png, jpg, webp, zip, docx, txt), size cap (e.g. 10 MB per file, 50 MB per order), random storage names, content sniffing, no execution, served with `Content-Disposition: attachment` and via authorized endpoints for private files.

## 6. Versioning and compatibility

- Additive changes allowed in v1.
- Frontend uses a typed client generated from the OpenAPI schema to catch drift.
