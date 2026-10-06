# 06 — Admin Dashboard

Status: APPROVED, architecture locked v1.0 (2026-10-05). The admin console is a client-side-only, non-indexed area of the same Next.js app (`/admin/*`), backed by `/api/v1/admin/*`. All authorization is enforced by FastAPI; the admin pages fetch data in the browser.

## 1. Principles

- Every admin API route requires role ADMIN; every mutating action writes an audit log entry.
- Work-queue first: the dashboard answers "what needs my attention today?"
- Dense, fast tables with server-side filtering and pagination.
- Destructive actions need confirmation; money actions need a typed confirmation and reason.
- Admin 2FA (TOTP) required before production launch.

## 2. Sections

### Dashboard
- KPI cards: revenue (today / 7d / 30d / all), orders, paid orders, new clients, conversion rate, average order value.
- Action queues: new quote requests, quotes awaiting client, orders needing action, upcoming bookings (next 7 days), unread messages, reviews pending approval, failed/unmatched payments.
- Charts: revenue over time, orders by status, top services, traffic sources (from analytics events).
- Recent activity feed (from audit log and events).

### Services
- List, create, edit, reorder, activate/deactivate, feature.
- Fields: title, slug, category, summary, description (markdown), pricing type, per-currency prices (KES required, USD optional), deposit %, delivery days, requirements form builder, images, FAQs, SEO fields.
- Price changes are audited and never alter existing orders (snapshots).
- Category management.

### Projects (Portfolio)
- CRUD, publish/unpublish, featured flag, ordering.
- Multi-image upload with cover and alt text, drag-to-reorder.
- Link projects to services, tag technologies, optional client name and permission note.

### Orders
- Filters: status, payment status, client, service, date range, source (purchase/quote).
- Detail: client, items, requirements and files, payment history, invoice, status timeline, internal notes, messages.
- Actions (only valid transitions offered): start work, request client input, send for review, complete, cancel, refund, post client-visible update, upload deliverables, issue/void invoice.

### Bookings
- Calendar and list views.
- Actions: confirm, reschedule, cancel, complete, mark no-show, set meeting link.
- Availability manager: weekly rules, buffers, days off/exceptions, minimum notice, max days ahead.

### Clients
- List and search; detail with profile, orders, bookings, quotes, payments, messages, notes, lifetime value, last activity.
- Actions: suspend/reactivate, resend verification, trigger password reset email. Admin cannot see passwords or view-as-client without an audited impersonation feature (not planned for launch).

### Payments
- List with filters: provider, status, date, amount, reconciled.
- Detail: linked payable, full transaction log (webhooks, verification results), raw provider payload (secrets masked).
- Actions: re-verify with provider, mark manual payment received (bank transfer, with proof upload and reason), issue refund, resolve flagged mismatch.
- Reconciliation view: payments pending longer than expected.

### Quotes
- Two tabs: Requests (NEW, IN_REVIEW, QUOTED, DECLINED) and Quotes (DRAFT, SENT, ACCEPTED, REJECTED, EXPIRED).
- Quote editor: line items, taxes, deposit, validity, terms templates, preview as client, send.
- Revision history.

### Reviews
- Moderation queue; approve, hide, feature on homepage, reply publicly.
- Manual testimonial entry for clients from outside the platform (marked as such).

### Messages
- Unified inbox of conversations and contact-form messages.
- Filter: unread, by context, by client; templates/snippets for common replies.

### Analytics
- Traffic: visits, unique visitors, top pages, referrers/UTM, countries (coarse).
- Content: service views, portfolio views, most viewed, time on page (optional).
- Funnel: visit → service view → (quote request | booking | checkout started) → paid; conversion rates per service.
- Revenue: by period, service, provider, currency; average order value; repeat clients.
- Operations: orders by status, average completion time, quote acceptance rate.
- Exports: CSV.

### Settings
- Business profile, logo, contact details, social links.
- Currencies and tax settings, invoice numbering and footer.
- Payment providers: enable/disable, display order, limits (secrets are NOT editable here; they live in environment variables).
- Booking rules, order auto-cancel window, quote validity default.
- Email templates (later), notification preferences.
- Security: view active sessions, enforce 2FA, view audit log.

## 3. Audit log viewer
Filter by actor, action, entity, date; show before/after diffs. Read-only, append-only.

## 4. Admin permissions model
Launch: single role ADMIN with full access. Designed so a permission map (e.g. `orders:write`, `payments:refund`, `settings:write`) can be introduced in code, and later assigned to additional roles (SUPPORT, EDITOR) without schema redesign.

## 5. Non-functional requirements
- Admin pages load < 2 s on a normal connection; tables paginate server-side.
- Admin area excluded from analytics and search engines (`noindex`).
- Optional IP allowlist or extra rate limit on `/api/v1/admin` login attempts.
