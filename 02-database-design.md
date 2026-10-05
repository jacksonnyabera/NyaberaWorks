# 02 — Database Design

Status: APPROVED, architecture locked v1.0 (2026-10-05). PostgreSQL. No migrations exist yet.

## 1. Conventions

- Primary keys: `uuid` (v4 generated server-side), except small lookup tables.
- Timestamps: `created_at`, `updated_at` as `timestamptz` (UTC). Soft delete (`deleted_at`) only where history matters (users, services, portfolio_projects).
- Money: `amount_minor bigint` + `currency char(3)`. Never floating point. Enabled currencies are **KES (primary) and USD**, controlled by settings and validated in the application and by a CHECK on money-bearing tables.
- Enums: `text` + CHECK constraints rather than PostgreSQL enums, since adding values via Alembic is simpler.
- Human-readable references: `order_number`, `quote_number`, `invoice_number`, `booking_ref` generated from sequences (e.g. `NW-2026-000123`).
- Foreign keys are always indexed. `ON DELETE RESTRICT` for financial records; `CASCADE` only for pure child rows (images, items).
- Snapshots: order items and quote items copy the service name and price at the time, so later edits never change history.
- Localization: English content in base columns at launch; see section 11 for the Swahili path.

## 2. Entity decisions

### Included (needed for the stated workflows)

| Entity | Why |
|---|---|
| users | Clients and admins; one table with a `role`. |
| service_categories | Group services (Web, Backend/API, Automation, Data/AI, Biomedical, Consulting). |
| services | The catalogue. `pricing_type` covers fixed, consultation, quote-only. |
| service_prices | One price per service per currency (KES required for priced services, USD optional). |
| portfolio_projects | Showcase items. |
| project_images | Many images per project. |
| availability_rules / availability_exceptions | Define bookable times without pre-generating slots. |
| bookings | Consultations. |
| quote_requests | Visitor/client submits requirements. Separate from the quote itself. |
| quotes | Admin's priced proposal. |
| quote_items | Line items of a quote. |
| orders | A purchase or accepted quote; the unit of work. |
| order_items | Line items (snapshot). |
| order_updates | Project progress posts visible to the client. |
| payments | One payment attempt/intent per payable thing. |
| payment_transactions | Provider-level events and callbacks for a payment; audit trail. |
| invoices | Financial document per order or deposit. |
| conversations + messages | Threaded communication tied to an order, quote, or booking. |
| reviews | Client reviews after completed work, plus manually entered testimonials. This is the testimonial system. |
| notifications | In-app notification feed (email sending is tracked in the same table via channel/status). |
| contact_messages | Public contact form submissions. |
| analytics_events | Raw events for funnels. |
| audit_logs | Append-only admin and financial actions. |
| attachments | Files attached to quote requests, orders, messages. |
| settings | Key-value business settings (replaces `admin_settings`). |

### Deliberately NOT created as separate tables (yet)

- `admin_settings` becomes `settings` (key/value JSONB), single table.
- `testimonials`: reviews carry a `source` (`PLATFORM` or `MANUAL`), so one table serves both.
- Separate `admins` / `clients` tables: one `users` table with `role`, plus `client_profiles` only if client-specific fields grow.
- `carts` / `cart_items`: services are bought individually ("Buy Now"); no cart at launch.
- `refunds`: modeled as `payments` rows with `kind = REFUND` pointing at the original payment.
- `roles` / `permissions` tables: the `role` column is enough for CLIENT/ADMIN; see section 6.
- `exchange_rates`: no automatic currency conversion at launch (section 10).
- Translation tables: added only when a second language ships (section 11).
- Daily analytics aggregate table: add only when raw-event queries become slow.

## 3. Tables (columns summarized)

### users
`id`, `email` (unique, citext), `password_hash`, `full_name`, `phone`, `role` (CLIENT|ADMIN), `status` (ACTIVE|SUSPENDED|PENDING_VERIFICATION), `email_verified_at`, `company_name`, `country`, `timezone`, `preferred_locale` (default `en`), `preferred_currency` (nullable, KES|USD), `last_login_at`, `failed_login_count`, `locked_until`, `created_at`, `updated_at`, `deleted_at`.

### refresh_tokens
`id`, `user_id`, `token_hash`, `family_id`, `expires_at`, `revoked_at`, `user_agent`, `ip`. Supports rotation and reuse detection.

### service_categories
`id`, `name`, `slug` (unique), `description`, `sort_order`, `is_active`.

### services
`id`, `category_id`, `title`, `slug` (unique), `summary`, `description` (markdown), `pricing_type` (FIXED|CONSULTATION|QUOTE_ONLY), `deposit_percent` (nullable), `delivery_days`, `duration_minutes` (consultations), `requirements_schema` (JSONB: questions asked at checkout), `seo_title`, `seo_description`, `og_image_attachment_id` (nullable), `is_active`, `is_featured`, `sort_order`, `deleted_at`.
Prices are not stored here; see `service_prices`.

### service_prices
`id`, `service_id`, `currency` (KES|USD), `amount_minor`, `is_active`.
Unique `(service_id, currency)`; CHECK `amount_minor >= 0`.
Rules: FIXED and CONSULTATION services must have a KES row. A USD row is optional and, when present, is an explicit price chosen by the admin, not a converted one. QUOTE_ONLY services have no price rows. A service with no price in the visitor's chosen currency falls back to KES.

### portfolio_projects
`id`, `title`, `slug`, `summary`, `description`, `client_name` (nullable, optional display), `project_url`, `repo_url`, `tech_tags` (text[]), `category` (WEB|BACKEND|AUTOMATION|DATA_AI|BIOMEDICAL|OTHER), `seo_title`, `seo_description`, `is_published`, `is_featured`, `completed_on`, `sort_order`, `deleted_at`.

### project_images
`id`, `project_id`, `attachment_id`/`file_key`, `alt_text`, `sort_order`, `is_cover`.

### project_services (link)
`project_id`, `service_id`: which services a project demonstrates.

### availability_rules
`id`, `weekday`, `start_time`, `end_time`, `slot_minutes`, `buffer_minutes`, `timezone`, `is_active`.

### availability_exceptions
`id`, `date`, `is_available`, `start_time`, `end_time`, `reason`.

### bookings
`id`, `booking_ref`, `service_id`, `client_id`, `starts_at`, `ends_at`, `status` (PENDING_PAYMENT|CONFIRMED|COMPLETED|CANCELLED|NO_SHOW|RESCHEDULED), `requirements` (text/JSONB), `meeting_url`, `price_minor`, `currency`, `deposit_minor`, `payment_status`, `cancelled_at`, `cancel_reason`.
Constraint: exclusion constraint on `tstzrange(starts_at, ends_at)` for non-cancelled bookings to prevent double booking.

### quote_requests
`id`, `client_id` (nullable for guests; guest must provide email), `contact_email`, `contact_name`, `service_id` (nullable), `title`, `description`, `budget_range`, `budget_currency` (KES|USD), `deadline`, `status` (NEW|IN_REVIEW|QUOTED|DECLINED|CLOSED), `assigned_admin_id`.

### quotes
`id`, `quote_number`, `quote_request_id`, `client_id`, `status` (DRAFT|SENT|ACCEPTED|REJECTED|EXPIRED|REVOKED), `currency` (KES|USD), `subtotal_minor`, `tax_minor`, `total_minor`, `deposit_minor`, `valid_until`, `scope_notes`, `terms`, `sent_at`, `accepted_at`, `version`.

### quote_items
`id`, `quote_id`, `description`, `quantity`, `unit_price_minor`, `line_total_minor`, `sort_order`.

### orders
`id`, `order_number`, `client_id`, `source` (SERVICE_PURCHASE|ACCEPTED_QUOTE), `quote_id` (nullable, unique), `status` (PENDING_PAYMENT|PAID|IN_PROGRESS|AWAITING_CLIENT|IN_REVIEW|COMPLETED|CANCELLED|REFUNDED), `currency` (KES|USD), `subtotal_minor`, `tax_minor`, `total_minor`, `amount_paid_minor`, `payment_status` (UNPAID|PARTIALLY_PAID|PAID|REFUNDED), `requirements` (JSONB), `due_date`, `completed_at`, `cancelled_at`.
An order has exactly one currency, and every payment against it must use that currency.
Orders from accepted quotes are created when the deposit is verified (or immediately if the quote needs no deposit), so their first status is PAID, not PENDING_PAYMENT.

### order_items
`id`, `order_id`, `service_id` (nullable), `title_snapshot`, `description_snapshot`, `quantity`, `unit_price_minor`, `line_total_minor`.

### order_updates
`id`, `order_id`, `author_id`, `status_to` (nullable), `message`, `is_visible_to_client`, `created_at`.

### payments

`id`, `order_id`, `booking_id`, `quote_id`, `client_id`, `provider` (text key of the adapter, e.g. the chosen aggregator, a future direct Daraja adapter, card, crypto, manual), `provider_method` (MPESA|CARD|CRYPTO|BANK_TRANSFER), `kind` (PAYMENT|REFUND), `refund_of_payment_id` (nullable self-reference, required when `kind = REFUND`), `amount_minor`, `currency` (KES|USD), `status` (CREATED|PENDING|PROCESSING|SUCCEEDED|FAILED|CANCELLED|EXPIRED|REFUNDED), `needs_review` (boolean), `idempotency_key` (unique), `provider_reference`, `failure_code`, `verified_at`, `expires_at`.

**Payable foreign keys (corrected):** a payment points at what it pays for through three nullable foreign keys, not a polymorphic `payable_type/payable_id` pair.

- `order_id → orders.id`, `booking_id → bookings.id`, `quote_id → quotes.id`, all `ON DELETE RESTRICT`.
- `CHECK (num_nonnulls(order_id, booking_id, quote_id) = 1)`: exactly one is set.
- A partial index on each foreign key (`WHERE order_id IS NOT NULL`, and so on).
- `quote_id` is used for the deposit on an accepted quote, because the order does not exist until that deposit is verified. When the order is then created, its `amount_paid_minor` is derived from payments where `payments.order_id = orders.id` **or** `payments.quote_id = orders.quote_id`. Payments are never re-pointed, so the ledger stays immutable.
- For refunds, the payable FK matches the original payment's, and `refund_of_payment_id` links back to it.
- The service layer additionally checks that `payments.currency` equals the payable's currency and that the amount is server-computed.

Why this instead of polymorphic columns: the database enforces referential integrity and the exactly-one rule, and queries per payable type stay indexable.

### payment_transactions
`id`, `payment_id`, `event_type` (INITIATED|CALLBACK_RECEIVED|VERIFIED|VERIFICATION_FAILED|REFUND|...), `provider_event_id` (unique per provider), `raw_payload` (JSONB, secrets stripped), `signature_valid`, `processed_at`. Append-only.

### invoices
`id`, `invoice_number`, `order_id`, `client_id`, `status` (DRAFT|ISSUED|PAID|VOID), `total_minor`, `currency`, `issued_at`, `paid_at`, `pdf_file_key`, `billing_details` (JSONB snapshot).

### conversations
`id`, `subject`, `context_type` (ORDER|QUOTE|BOOKING|GENERAL), `context_id`, `client_id`, `last_message_at`.

### messages
`id`, `conversation_id`, `sender_id`, `body`, `read_at`, `created_at`.

### attachments
`id`, `owner_id`, `file_key`, `original_name`, `mime_type`, `size_bytes`, `sha256`, `parent_type`, `parent_id`, `visibility` (PUBLIC|PRIVATE), `scan_status`, `created_at`.

### reviews (also the testimonial system)
`id`, `source` (PLATFORM|MANUAL), `order_id` (nullable, unique when set), `client_id` (nullable for MANUAL), `service_id` (nullable), `author_name` and `author_title` (used for MANUAL; PLATFORM takes them from the user), `rating` (1–5), `title`, `body`, `status` (PENDING|APPROVED|HIDDEN), `admin_reply`, `is_featured`, `created_at`.
CHECK: `source = 'PLATFORM'` requires `order_id` and `client_id`; `source = 'MANUAL'` requires `author_name`. Manual entries are created only by an admin and are labeled as such in the admin UI.

### notifications
`id`, `user_id`, `channel` (IN_APP|EMAIL), `type`, `title`, `body`, `link`, `status` (QUEUED|SENT|FAILED|READ), `read_at`, `sent_at`, `attempts`.

### contact_messages
`id`, `name`, `email`, `subject`, `message`, `status` (NEW|REPLIED|SPAM|ARCHIVED), `ip_hash`, `created_at`.

### analytics_events
`id`, `occurred_at`, `event_type`, `visitor_id` (anonymous random id, not fingerprint), `session_id`, `user_id` (nullable), `entity_type`, `entity_id`, `path`, `referrer`, `utm` (JSONB), `device` (coarse), `country` (coarse), `metadata` (JSONB). Partition by month when volume warrants.

### audit_logs
`id`, `actor_id`, `action`, `entity_type`, `entity_id`, `before` (JSONB), `after` (JSONB), `ip`, `user_agent`, `request_id`, `created_at`. Insert-only (revoke UPDATE/DELETE from the app DB role).

### settings
`key` (pk), `value` (JSONB), `updated_by`, `updated_at`. Examples: business name, `primary_currency` (KES), `enabled_currencies` (KES, USD), tax rate, default deposit percent, booking lead time, enabled payment providers, `enabled_locales` (en).

## 4. Relationships (conceptual ERD)

```
users 1───* refresh_tokens
users 1───* quote_requests
users 1───* quotes
users 1───* orders
users 1───* bookings
users 1───* payments
users 1───* notifications
users 1───* reviews                  (PLATFORM reviews)
users 1───* audit_logs (as actor)

service_categories 1───* services
services 1───* service_prices        (one per currency)
services 1───* bookings
services 1───* order_items           (nullable FK, snapshot kept)
services *───* portfolio_projects    (via project_services)
services 1───* reviews
services 1───* quote_requests        (optional)

portfolio_projects 1───* project_images

quote_requests 1───* quotes          (revisions)
quotes 1───* quote_items
quotes 1───0..1 orders               (created when deposit verified)
quotes 1───* payments                (deposit, via payments.quote_id)

orders 1───* order_items
orders 1───* order_updates
orders 1───* invoices
orders 1───0..1 reviews
orders 1───* payments                (via payments.order_id)
bookings 1───* payments              (via payments.booking_id)

payments 1───* payment_transactions
payments 1───0..* payments           (refund_of_payment_id)

conversations 1───* messages
conversations ───> (order | quote | booking) by context
attachments ───> (quote_request | order | message | project_image) by parent
```

Text ERD (key cardinalities):

```
[users]──<[orders]──<[order_items]>──[services]──>[service_categories]
   │          │                          └──<[service_prices]
   │          ├──<[order_updates]
   │          ├──<[invoices]
   │          ├──0..1[reviews]
   │          └──<[payments]──<[payment_transactions]
   ├──<[bookings]──<[payments]
   ├──<[quote_requests]──<[quotes]──<[quote_items]
   │                         ├──<[payments]   (deposit)
   │                         └──0..1──[orders]
   ├──<[conversations]──<[messages]
   └──<[notifications]
[portfolio_projects]──<[project_images]
[portfolio_projects]>──<[services]
```

## 5. Key integrity rules

1. An order becomes PAID only through the payment service after server-side verification, never from client input.
2. `orders.amount_paid_minor` is derived from successful payments inside one DB transaction (payments by `order_id`, plus deposit payments by the order's `quote_id`).
3. Exactly one payable per payment, enforced by the CHECK on `payments`.
4. A payment's currency must equal its payable's currency; mismatches are rejected.
5. A PLATFORM review requires a COMPLETED order owned by the reviewer, and there is one review per order. MANUAL testimonials are admin-only.
6. Booking overlap is prevented by the exclusion constraint.
7. Quote items sum to totals; totals are recomputed server-side.
8. An accepted quote is immutable; changes create a new `version`.
9. Deleting a user is a soft delete; financial rows keep their references.
10. Service prices are explicit per currency; there is no implicit conversion anywhere.

## 6. Roles and extensibility

`users.role` is a CHECK constraint (CLIENT, ADMIN). To add roles later (e.g. SUPPORT, EDITOR), introduce a permissions map in code first; add `roles`/`user_roles` tables only if per-user custom permissions are required.

## 7. Indexing guidance

- Unique: `users.email`, `services.slug`, `portfolio_projects.slug`, `(service_id, currency)` on prices, `payments.idempotency_key`, `(provider, provider_event_id)` on transactions, document numbers, `reviews.order_id` (where set), `orders.quote_id` (where set).
- Composite: `orders(client_id, status)`, `bookings(starts_at)`, `payments(status, created_at)`, `analytics_events(event_type, occurred_at)`, `notifications(user_id, read_at)`.
- Partial: one per payable FK on `payments`.
- Search: later add `pg_trgm` on service/project titles; no external search engine initially.

## 8. Data retention and privacy

- Analytics events: keep raw 13 months, then aggregate and delete.
- Contact messages: 24 months unless linked to a client.
- Payment, invoice, and audit records: keep at least 7 years (confirm local tax requirements).
- Account deletion request: anonymize personal fields, retain financial records.
- Comply with the Kenya Data Protection Act 2019 (consent for analytics cookies, data subject requests).

## 9. Backups

See 10-deployment.md. Daily encrypted logical backups plus WAL/PITR if the host supports it; quarterly restore test.

## 10. Currency model (KES primary, USD supported)

- **KES is the primary and default currency.** Catalogue prices, quotes, and invoices are issued in a single currency each.
- **Explicit prices per currency.** Admin sets a KES price and, optionally, a USD price per service. There is no live exchange-rate conversion, which avoids rate disputes and rounding surprises.
- **A client's currency choice** is made at checkout (default from `users.preferred_currency`, then KES). It fixes the currency of that order or booking.
- **Quotes** are written in one currency chosen by the admin.
- **Payment methods by currency**: M-Pesa supports KES only. Card and crypto are offered in the currencies the chosen aggregator or processor supports; each adapter declares `supported_currencies` (see 07). USD availability depends on the aggregator chosen, so confirm it during provider selection.
- **Reporting**: revenue is reported per currency. An optional KES-equivalent total may use a manually maintained reference rate in `settings` and is always labeled approximate. No rate is stored on payments at launch.
- **Tax and invoices**: VAT handling and numbering are per invoice currency; confirm KRA requirements (including eTIMS) with an accountant.

## 11. Localization readiness (English now, Swahili later)

- Launch stores English in the base columns (`title`, `summary`, `description`, `seo_*`, and so on). `users.preferred_locale` exists from day one.
- When Swahili ships, add translation tables (for example `service_translations`, `portfolio_project_translations`, `service_category_translations`) keyed by `(entity_id, locale)` with translated text and a per-locale `slug`. The base columns remain the English source and the fallback.
- Content with no translation falls back to English and is marked so it is not indexed as a duplicate.
- User-generated content (messages, requirements) is never translated.
- Email templates and notifications select a template by `preferred_locale`.

## 12. Change log

- **v1.0**: Corrected payment foreign keys (three nullable FKs with exactly-one CHECK, replacing `payable_type/payable_id`); added `service_prices` and removed price columns from `services`; added `source` to reviews and removed the separate testimonials entity; added currency and localization sections; quote-sourced orders are created on verified deposit; added `visibility` to attachments and SEO fields to services and projects.