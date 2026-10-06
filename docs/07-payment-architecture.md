# 07 — Payment Architecture

Status: APPROVED, architecture locked v1.0 (2026-10-05). No payment code exists. Provider-specific details must be re-confirmed against current provider docs when Phase 9 starts.

## 1. Design goals

1. Provider independence: adding or replacing M-Pesa, card, or crypto providers must not change orders, bookings, quotes, or the frontend checkout flow.
2. The server is the only source of truth for payment success.
3. No secrets in the frontend, repository, or logs.
4. Idempotent, auditable, and recoverable (missed webhooks must not lose money).

## 2. Layers

```
Checkout UI ──> Payments API ──> PaymentService ──> ProviderRegistry ──> Adapter
                                       │                                  │
                                       │                    M-Pesa / Card / Crypto / (future)
                                       ▼
                         payments + payment_transactions (DB)
                                       │
                          Domain handlers (orders, bookings, quote deposits)
```

- **PaymentService**: creates payments, applies verified results, handles refunds. Only this service changes payment and payable payment-state.
- **ProviderRegistry**: maps provider keys to adapters, filtered by settings (enabled/disabled), currency, and amount limits.
- **Adapters**: one per provider, implementing a common interface.
- **Domain handlers**: subscribe to "payment succeeded/failed/refunded" outcomes and update orders/bookings/quotes. The payments module does not know order business rules.

## 3. Provider adapter interface (conceptual)

| Capability | Purpose |
|---|---|
| `key`, `supported_currencies`, `supported_methods`, `limits` | Registry metadata |
| `initiate(payment)` | Start payment; returns a client action |
| `parse_webhook(headers, raw_body)` | Verify signature, return a normalized event |
| `verify(payment)` | Authoritative status query to the provider API |
| `refund(payment, amount)` | If supported; otherwise manual |
| `normalize_status(raw)` | Map provider statuses to internal statuses |

**Client action types** returned to the frontend (provider-agnostic):
- `STK_PUSH_SENT` — wait and poll (M-Pesa)
- `REDIRECT` — URL to hosted checkout (card)
- `CRYPTO_INVOICE` — address/QR, amount, expiry (crypto)
- `MANUAL_INSTRUCTIONS` — bank transfer details with reference

## 4. Payment lifecycle

```
CREATED → PENDING → PROCESSING → SUCCEEDED
              │          │
              ├──────────┴──> FAILED | EXPIRED | CANCELLED
SUCCEEDED → REFUNDED (full or partial via REFUND rows)
```

1. Client calls `POST /payments` with payable reference (an order, booking, or quote id), chosen method and currency, and `Idempotency-Key`.
2. Server loads the payable, **computes the amount itself** (never trusts a client amount), checks ownership and payable state.
3. Creates `payments` row (CREATED), calls adapter `initiate`, stores provider reference, status PENDING, writes a transaction event.
4. Provider notifies via webhook/callback (and/or the server polls).
5. Server stores raw event (deduped by provider event id), validates signature/source, then **calls provider `verify`** for an authoritative result.
6. Checks: status success, amount equals expected, currency equals expected, reference matches, payment not already applied, not expired (or accept late payment into a review state).
7. In a single DB transaction: payment → SUCCEEDED, `verified_at` set, domain handler applied (order PAID / booking CONFIRMED / deposit recorded), invoice issued, notifications and audit entry created.
8. Frontend polls `GET /payments/{id}`; it only ever displays server state.

Mismatch cases (wrong amount, late, duplicate, unknown reference) → payment flagged `NEEDS_REVIEW` (stored as a flag on the payment), admin alerted, nothing auto-fulfilled.

## 5. Reliability

- **Idempotency**: unique `idempotency_key` on payments; unique `(provider, provider_event_id)` on transactions; processing the same webhook twice has no extra effect.
- **Reconciliation job**: every few minutes, query provider status for payments PENDING/PROCESSING older than N minutes; expire after the configured window; daily report of anything unmatched.
- **Webhook retries**: respond 2xx after durable storage; process in worker with retries and backoff; dead-letter into admin "failed events".
- **Concurrency**: row-level lock (`SELECT ... FOR UPDATE`) on the payment during state transitions.
- **Out-of-order events**: state machine only allows forward transitions.

## 6. Provider notes (to be confirmed at implementation)

> **Locked decisions (2026-10-05):** M-Pesa goes through an **aggregator first** (decision D4); the adapter interface stays provider-independent so direct Safaricom Daraja can replace or complement it later by adding an adapter and changing `payments.provider` values. Payments reference their payable through three nullable foreign keys (`order_id`, `booking_id`, `quote_id`, exactly one set), per doc 02. Supported currencies are KES (primary) and USD; M-Pesa is KES only, card and crypto may offer USD. Webhooks are received at `/api/v1/payments/webhooks/{provider}` (same domain, straight to FastAPI).

### M-Pesa (Safaricom Daraja)
- STK Push (Lipa Na M-Pesa Online) for paybill/till; asynchronous result delivered to a callback URL; query-status API available for verification.
- Requirements: Safaricom Daraja app, shortcode, passkey, consumer key/secret (all env vars), publicly reachable HTTPS callback.
- Callbacks do not carry a strong signature by default; protect with an unguessable callback path token, IP allowlist if published, and always confirm via the status query API.
- Amounts in KES, whole shillings; phone normalized to 2547XXXXXXXX.
- Alternative aggregator (single integration covering M-Pesa + cards): e.g. Pesapal, Flutterwave, Paystack, IntaSend. Trade-off: higher fees and a dependency on one intermediary, but faster start and simpler compliance. The adapter design lets you start with an aggregator and switch to direct Daraja later (decision D4).

### Bank / card
- Never handle raw card data; use a hosted checkout or hosted fields from a PCI-compliant provider (keeps NyaberaWorks at the lightest PCI scope, SAQ A).
- Candidates: Stripe (availability for Kenyan merchants should be checked), Flutterwave, Paystack, Pesapal, DPO.
- Verification via signed webhooks plus provider retrieve-transaction API.
- Bank transfer: `MANUAL_INSTRUCTIONS` flow; admin records receipt with proof; audited.

### Cryptocurrency
- Use a payment processor (e.g. Coinbase Commerce, BTCPay Server, NOWPayments, or similar) instead of managing wallets or keys yourself.
- Considerations: price volatility (invoice priced in fiat, locked for a window), network confirmations before SUCCEEDED, underpayment/overpayment handling, chain/asset allowlist (e.g. USDT/USDC on a low-fee network, BTC), tax and regulatory review in Kenya.
- BTCPay Server (self-hosted) has no processor fee but adds an operational burden; hosted processors are easier for a solo developer.
- Treat crypto as a Phase 9 late-stage provider; launch with M-Pesa and card first.

## 7. Currency and amounts

- Store `amount_minor` + `currency`. Default business currency KES; USD optional for international clients.
- Service price may be set per currency (explicit prices) rather than live conversion; avoids exchange-rate disputes.
- Crypto payments: fiat amount is the contract; crypto amount is derived by the processor.

## 8. Refunds

- Refund = new `payments` row `kind=REFUND` linked to the original; partial refunds allowed.
- Provider API refund where supported; otherwise recorded manual refund by admin with reason.
- Refund policy shown at checkout; invoice credit note generated.

## 9. Invoices and receipts

- Invoice created when an order is created or on payment (decision in Phase 8); PDF generated by the server (e.g. WeasyPrint/ReportLab), stored privately, available via authorized download.
- Tax handling (VAT) driven by settings; confirm with an accountant/KRA requirements. eTIMS compliance may be required for Kenyan businesses; flagged as a risk.

## 10. Secrets and configuration

All secrets are environment variables (see `.env.example`), loaded via Pydantic settings, never logged, never returned by any endpoint, and absent from the frontend. Separate sandbox and live credentials per environment. Settings in the admin UI may only toggle providers on/off and set limits.

## 11. Testing strategy

- Provider sandboxes (Daraja sandbox, card test mode, crypto testnet).
- Adapter contract tests: every adapter must pass the same suite.
- Fake provider adapter for local development and automated tests.
- Test cases: duplicate webhook, forged webhook, wrong amount, late payment, out-of-order events, lost webhook recovered by reconciliation.

## 12. Compliance checklist

- Terms, privacy, and refund policy pages before accepting live payments.
- Business registration and provider onboarding (KYC) lead time: start early, because approvals can take days to weeks.
- Keep payment records 7 years (confirm requirements).
