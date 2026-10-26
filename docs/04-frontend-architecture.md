# 04 — Frontend Architecture

> **As built:** this page is the target design. For what exists today, see [15-as-built-status.md](15-as-built-status.md).

Status: APPROVED, architecture locked v1.0 (2026-10-05). No application code exists yet.

## 1. Stack

| Concern | Choice |
|---|---|
| Framework | Next.js, App Router, current stable release |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS |
| Server state (client side) | TanStack Query |
| Forms and validation | React Hook Form + Zod |
| Client HTTP | Axios instance (interceptors for token refresh) |
| Server-side HTTP | Native `fetch` (needed for Next caching and tags) |
| Routing | Next.js file-based routing (replaces React Router) |
| Messages | next-intl message files, no locale-prefixed routing at launch |
| API types | Generated from FastAPI's OpenAPI schema (e.g. `openapi-typescript`) |
| Package manager | npm, lockfile committed |
| Unit/component tests | Vitest + React Testing Library |
| End-to-end tests | Playwright, located in root `tests/e2e` |

Why Next.js rather than a Vite SPA: public service and portfolio pages come from the database and change from the admin console. Server rendering with on-demand revalidation delivers complete HTML to search engines and to WhatsApp/LinkedIn/X link previews, with no rebuild step.

## 2. Hard rules

1. **Next.js never accesses PostgreSQL.** No database drivers, no ORM, no database credentials in the `web` container.
2. **FastAPI is the only business/API backend.** No Next.js Route Handlers under `/api`. No Server Actions for business mutations. All mutations go from the browser to FastAPI.
3. The only Next.js route handler is `/internal/revalidate`: cache control only, secret-protected, blocked from the internet by Caddy.
4. Public SSR fetches only public, unauthenticated data. Server code never reads or forwards user cookies or tokens.
5. No secrets in the bundle. `NEXT_PUBLIC_*` values are public by definition.

## 3. Areas and rendering strategy

| Route | Rendering | Indexed |
|---|---|---|
| `/` Home | ISR (time-based + on-demand) | Yes |
| `/about` | Static | Yes |
| `/services` | ISR | Yes |
| `/services/[slug]` | ISR; known slugs pre-generated, new slugs rendered on first request | Yes |
| `/portfolio` | ISR | Yes |
| `/portfolio/[slug]` | ISR | Yes |
| `/contact`, `/request-quote` | Static shell + client form | Contact yes, quote optional |
| `/privacy`, `/terms`, `/refund-policy` | Static | Yes |
| `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email` | Static shell + client | No |
| `/book/[serviceSlug]`, `/checkout/[serviceSlug]` | ISR service data in a shell + client-side flow (auth required) | No |
| `/account/*` | Client-side only | No (`noindex`) |
| `/admin/*` | Client-side only, lazy-loaded bundle | No (`noindex`) |
| `/sitemap.xml`, `/robots.txt` | Generated from the API, cached | n/a |

Account and admin are client-side because the access token lives in memory only (see 08). They need no SEO and cost nothing in search performance.

## 4. Routes

Public: `/`, `/about`, `/services`, `/services/[slug]`, `/portfolio`, `/portfolio/[slug]`, `/contact`, `/request-quote`, `/book/[serviceSlug]`, `/checkout/[serviceSlug]`, legal pages.

Auth: `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email`.

Client (`/account/*`): overview, orders and `orders/[id]`, bookings, quotes and `quotes/[id]`, payments, messages and `messages/[id]`, reviews, profile.

Admin (`/admin/*`): dashboard, services, projects, orders, bookings, clients, payments, quotes, reviews, analytics, messages, settings.

## 5. Folder structure (inside `frontend/`)

```
frontend/
  package.json, package-lock.json
  next.config.ts          rewrites /api/* to FastAPI in dev; security headers; image rules
  tsconfig.json
  public/                 favicons, static images
  src/
    app/
      layout.tsx          root layout, <html lang>, providers
      (public)/           home, about, services, portfolio, contact, request-quote, legal
      (auth)/             login, register, password flows, verify-email
      (checkout)/         book/[serviceSlug], checkout/[serviceSlug]
      account/            client portal (client components)
      admin/              admin console (client components)
      internal/revalidate/route.ts   cache revalidation only
      sitemap.ts, robots.ts, not-found.tsx, error.tsx
    features/             catalog, portfolio, booking, quotes, orders, payments,
                          messaging, reviews, notifications, analytics, admin, auth
                          (each: components/, hooks/, api.ts, schemas.ts)
    components/
      ui/                 Button, Input, Modal, Table, Toast, Skeleton ...
      seo/                JsonLd, Breadcrumbs, canonical helper
    lib/
      api/                server fetch helpers, client Axios instance, generated types
      seo/                metadata builders, structured-data builders
      money/              formatting from amount_minor + currency
      i18n/               message loader, link builder
      constants/
    messages/             en.json (sw.json later)
    hooks/
    styles/               Tailwind layers, design tokens
    test/
```

Rule: pages compose features; features expose a public `index` and do not reach into each other's internals.

## 6. Data fetching

- **Public pages (Server Components)**: `fetch` against `API_INTERNAL_URL` with `next: { revalidate, tags }`. Tags: `services`, `service:{slug}`, `portfolio`, `project:{slug}`, `reviews`.
- **Account, admin, auth, checkout (Client Components)**: TanStack Query hooks over one Axios instance (`NEXT_PUBLIC_API_BASE_URL=/api/v1`, same origin, credentials for the refresh cookie).
- **Revalidation**: when an admin publishes or edits a service, project, or review, FastAPI queues a job; the worker calls `/internal/revalidate` with the tags. A time-based `revalidate` interval is the fallback so a failed call can never leave content stale indefinitely.
- **Contract**: TypeScript types generated from OpenAPI; CI fails on drift.
- Axios interceptors: attach the access token; on 401, call `/auth/refresh` once (single-flight), retry, else log out.

## 7. SEO implementation (public pages)

- **Metadata**: per-page `generateMetadata` (title template, description, canonical, Open Graph, Twitter card). Default site metadata with `metadataBase` from `NEXT_PUBLIC_SITE_URL`.
- **Canonical URLs**: absolute canonical on every indexable page; query-parameter variants canonicalize to the clean URL; one host (www or apex, chosen once, redirected by Caddy).
- **Social previews**: Open Graph image per service and project (cover image or generated); titles and descriptions server-rendered so WhatsApp/LinkedIn/X crawlers see them without running JavaScript.
- **Structured data (JSON-LD)**: `Person`/`Organization` and `WebSite` on home and about, `Service` or `ProfessionalService` on service pages, `CreativeWork`/`SoftwareSourceCode`-style markup on projects, `BreadcrumbList` everywhere nested. JSON-LD is serialized safely (escape `<`). Do not add self-serving `AggregateRating` markup for the business itself; follow Google's review-snippet guidelines or omit rating markup.
- **Sitemap and robots**: `sitemap.ts` built from the API (services, projects, static pages, `lastmod`); `robots.ts` disallows `/account`, `/admin`, `/api`, `/checkout`, `/book`, `/internal`. Submit the sitemap in Google Search Console.
- **Performance** (ranking and conversion): server-rendered HTML, `next/image` with explicit dimensions, font optimization, minimal client JavaScript on public pages, Core Web Vitals checked in CI with Lighthouse from Phase 4.
- **Content**: each service page needs real content (scope, process, deliverables, pricing, FAQs, related projects, reviews). Technical SEO does not replace this.
- **Next image optimizer on a small VPS**: restrict `remotePatterns` to the own domain, cap sizes, and watch memory; pre-sized images are the fallback.

## 8. Localization readiness (English now, Swahili later)

- All UI strings come from `src/messages/en.json` via next-intl; no hard-coded user-facing text in components.
- Links are built through one helper so a locale prefix can be introduced centrally.
- Dates, numbers, and money format through locale-aware helpers.
- No `[locale]` route segment at launch. When Swahili is added, introduce it with an "as-needed" prefix so **English URLs stay unchanged** (no SEO loss) and Swahili lives under `/sw/...`; add `hreflang` alternates and translated slugs at that point.
- `<html lang>` comes from configuration, not a literal.
- Database side: see 02, section 11.

## 9. State management

- **Server state**: Server Components (public) and TanStack Query (client).
- **Auth state**: small context holding the current user and the access token in memory only.
- **UI state**: local component state; no Redux.
- **Checkout and booking drafts**: React state, optionally `sessionStorage` for non-sensitive values.

## 10. Forms and validation

- React Hook Form with Zod resolvers.
- Zod schemas give immediate feedback and mirror server rules; they never replace FastAPI validation.
- Service requirement forms are rendered from the service's `requirements_schema` (JSON) into Zod at runtime.

## 11. Security in the frontend

See 08, section 4a. Summary: access token in memory only, no `dangerouslySetInnerHTML` without sanitization, route guards are UX only, payment UI never marks success itself and only reads `GET /payments/{id}`.

## 12. UI/UX direction

- Mobile-first and low-bandwidth friendly; mobile users are a core audience in Kenya.
- Design tokens in Tailwind theme (colors, spacing, type scale); dark mode optional later.
- Accessibility: semantic HTML, keyboard navigation, focus states, WCAG AA contrast, announced form errors.
- Brand direction: clean, credible, engineering-led, combining biomedical and software identity. Final visual design is decided in Phase 4.

## 13. Key page behaviors

- **Service details**: description, per-currency price (KES primary, USD where set), delivery time, FAQs, related projects, reviews. The CTA depends on pricing type: Buy Now, Book, or Request Quote.
- **Checkout**: Requirements, Review, Payment method, Pay, Status. Payment methods offered depend on currency (M-Pesa KES only). M-Pesa shows a phone input and waiting state; card uses redirect or hosted fields; crypto shows address/QR and a countdown.
- **Booking**: available days, then slots, then requirements, then payment if needed, then confirmation. Times show in the user's time zone with the zone labeled.
- **Client order page**: status timeline, updates, files, messages, invoice, review prompt when completed.
- **Admin tables**: server-side pagination and filters, confirmation on destructive actions, optimistic UI only for harmless toggles.

## 14. Analytics client

A small tracker sends page views and key events (service view, portfolio view, CTA click) in batches to `/api/v1/analytics/events`. The anonymous visitor id is stored only after consent; Do Not Track is respected.

## 15. Testing

- Unit and component: Vitest + React Testing Library.
- End-to-end: Playwright in root `tests/e2e` for critical flows (register, buy service, book, pay in sandbox, admin updates an order), plus SEO checks (metadata, JSON-LD, sitemap present in rendered HTML).
- Lint and format: ESLint + Prettier; type-check in CI.
