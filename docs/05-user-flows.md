# 05 — User Flows

> **As built:** this page is the target design. For what exists today, see [15-as-built-status.md](15-as-built-status.md).

Status: APPROVED, architecture locked v1.0 (2026-10-05). Each flow lists steps, system actions, failure paths, and notifications. Pages in these flows that are not public (booking, checkout, account, admin) run client-side; all data and decisions come from FastAPI.

## Roles

- **Visitor**: unauthenticated.
- **Client**: authenticated, role CLIENT.
- **Admin**: role ADMIN (you).

## Flow A — Fixed-price service purchase

1. Visitor opens a service → sees price, delivery time, details.
2. Clicks **Buy Now**. If not logged in → login/register → return to checkout.
3. **Requirements**: form built from the service's `requirements_schema` + file upload.
4. **Review**: price, taxes, total, terms/refund policy acceptance.
5. **Create order** (`POST /orders`, idempotency key) in the chosen currency (KES by default; USD if the service has a USD price). Order = PENDING_PAYMENT. Items snapshot saved.
6. **Choose payment method** → `POST /payments`.
7. Provider flow runs (see 07-payment-architecture.md).
8. **Server-side verification**: webhook and/or provider query confirms amount, currency, reference, status.
9. In one DB transaction: payment → SUCCEEDED, order → PAID, invoice issued, notifications queued, audit entry written.
10. Client sees confirmation page (reads status from API). Email receipt sent.
11. Admin notified (in-app + email).
12. Admin moves order to IN_PROGRESS, posts updates; client notified on each update.
13. Admin marks IN_REVIEW with deliverables; client approves (or requests changes via messages) → COMPLETED.
14. Client prompted to leave a review. Review goes to PENDING until approved.

Failure paths: payment fails/expires → order stays PENDING_PAYMENT, client can retry with another method; unpaid orders auto-cancel after a configured window (e.g. 48 h). Underpayment/overpayment → payment flagged for admin review. Client closes the browser after paying → webhook still completes the order.

## Flow B — Consultation booking

1. Visitor selects a consultation service.
2. Calendar shows available dates (from availability rules minus exceptions minus existing bookings), in the visitor's time zone.
3. Picks a slot → login/register if needed.
4. Enters requirements/agenda (and optional files).
5. `POST /bookings` creates a temporary hold (e.g. 15 min). Overlap prevented in DB.
6. If price/deposit is required → payment flow; booking becomes CONFIRMED on verified payment. If free → CONFIRMED immediately.
7. Confirmation page + email with calendar invite (.ics) and meeting link.
8. Reminders sent 24 h and 1 h before (worker).
9. Admin manages: confirm/reschedule/cancel/complete/no-show; client may cancel/reschedule within policy.
10. After completion, optional review and follow-up (may lead to a quote request).

Failure paths: hold expires → slot released, client informed; double-click/race → second request gets 409 and sees updated slots.

## Flow C — Custom project (quote)

1. Visitor clicks **Request Quote** (from service page or navigation).
2. Submits: project title, description, budget range, deadline, files, contact details. Guests supply email (captcha); a client account is offered/created on acceptance.
3. Request status NEW. Admin notified; client receives acknowledgement.
4. Admin reviews (IN_REVIEW), may ask questions through messages.
5. Admin builds a quote: line items, scope, timeline, terms, deposit amount, validity date → sends (status SENT). Client notified by email + in-app.
6. Client opens the quote (login required) → Accept / Reject / Request changes.
7. Accept → quote becomes ACCEPTED and the client is taken to pay the deposit in the quote's currency (KES or USD); the deposit payment is linked to the quote (`payments.quote_id`). If the deposit is zero, the order is created immediately.
8. Deposit paid and verified server-side → in one transaction the payment is SUCCEEDED and the order (source ACCEPTED_QUOTE, linked to the quote) is created as partially paid or paid → IN_PROGRESS when admin starts.
9. Milestone or final payments are created by admin as additional payments against the order (`payments.order_id`); each is verified the same way.
10. Updates, delivery, completion, review as in Flow A.

Failure paths: quote expires → EXPIRED, client can request renewal; revised quote → new version, previous marked superseded; accepted quote whose deposit stays unpaid past the configured window → expires and the admin is notified.

## Flow D — Registration and login

1. Register with name, email, password (strength check), consent to terms.
2. Verification email → click link → account ACTIVE.
3. Login → access token (memory) + refresh cookie.
4. Failed attempts are rate limited and progressively locked.
5. Forgot password → emailed one-time link (short expiry) → set new password → all sessions revoked.
6. Admin login uses the same endpoint but admin routes require ADMIN; optional 2FA (TOTP) planned as mandatory for admin before launch (see 08-security.md).

## Flow E — Client communication

1. Client opens an order/quote/booking → **Message** or uses the general inbox.
2. Admin gets a notification; replies from the admin console.
3. Client gets in-app + email notification (with link, no message content in email if sensitive).
4. Messages remain attached to their context for future reference.

## Flow F — Project updates

1. Admin posts an update (text, optional status change, optional files) on an order.
2. `order_updates` row created; visible-to-client flag controls visibility.
3. Client notified; sees the timeline on the order page.

## Flow G — Review

1. Eligible when order is COMPLETED and no review exists.
2. Client submits rating + text.
3. Review PENDING → admin approves (optionally replies, marks featured for homepage).
4. Approved review appears on the service page and aggregated rating.

## Flow H — Contact

1. Visitor submits contact form (captcha + rate limit + honeypot).
2. Stored in `contact_messages`; admin notified; auto-acknowledgement emailed.
3. Admin replies by email; status set to REPLIED.

## Flow I — Refund / cancellation

1. Client requests cancellation (before work starts: automatic cancel and refund per policy; after: via message and admin decision).
2. Admin issues refund through the payments module (provider refund API when available, otherwise recorded manual refund).
3. Order → CANCELLED/REFUNDED, invoice voided or credit-noted, audit entry written.

## Flow J — Admin daily operations

1. Dashboard shows pending items: new quote requests, unpaid/at-risk orders, orders awaiting action, upcoming bookings, unread messages, pending reviews, failed payments.
2. Admin works through each queue, with every state change recorded in the audit log.

## Cross-cutting notification matrix

| Event | Client | Admin |
|---|---|---|
| Registered | Verify email | — |
| Order paid | Receipt, confirmation | New order |
| Payment failed | Retry prompt | Flag if repeated |
| Order update posted | Yes | — |
| Order completed | Review prompt | — |
| Booking confirmed | Confirmation + reminders | New booking |
| Quote request submitted | Acknowledgement | New request |
| Quote sent | Yes | — |
| Quote accepted/rejected | Confirmation | Yes |
| New message | Yes | Yes |
| Review submitted | — | Pending review |
| Contact message | Acknowledgement | Yes |
