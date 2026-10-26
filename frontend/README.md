# NyaberaWorks frontend

Next.js (App Router), React, TypeScript, Tailwind, TanStack Query, React Hook Form + zod. It never talks
to the database: every `/api/*` call goes through a same-origin proxy (`src/app/api/[...path]/route.ts`)
to the FastAPI backend.

```powershell
npm install
npm run dev          # http://127.0.0.1:3000 (the API must be running on port 8000)
npm run lint ; npm run typecheck ; npm test ; npm run build
```

Settings (Vercel or `.env.local`): `NEXT_PUBLIC_SITE_URL`, `API_INTERNAL_URL` (the API address),
`PROXY_SHARED_SECRET` (same value as the API), `CLIENT_IP_HOPS_FROM_RIGHT`, `API_PROXY_TIMEOUT_MS`.
See `docs/14-go-live-vercel-render.md`. Layout and flows: `docs/04-frontend-architecture.md`;
what is built today: `docs/15-as-built-status.md`.
