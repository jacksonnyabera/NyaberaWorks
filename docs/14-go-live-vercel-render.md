# 14 — Website on Vercel, API on Render, database on Neon

- **Vercel**: the website (Next.js).
- **Render**: the API only (free web service).
- **Neon**: the database (permanent free plan). Not Render's database: Render deletes free databases 30 days after creation ([Render free tier](https://render.com/docs/free)).

## Know the limits
- Vercel's free "Hobby" plan is for **non-commercial** use ([fair use](https://vercel.com/docs/limits/fair-use-guidelines)). A business site is commercial; the compliant option is the Pro plan (about $20/month). Using Hobby is your decision and risk; Vercel can suspend such projects.
- Render says free services are not for production, and they sleep after 15 minutes (about a minute to wake).
- Vercel Hobby functions can run up to 60 seconds, enough for one API wake-up, but the first request after a quiet spell may still feel slow.

## 1. API on Render
Follow `13-go-live-render.md` section 2 only (API service, Neon pooled address, secrets). Dockerfile path `./backend/Dockerfile`, build context `./backend`. Confirm `/api/health/ready` shows `"database":"ok"`. **Do not create the Render website service.**

## 2. Website on Vercel
1. vercel.com → sign up with GitHub → **Add New… → Project** → import the repository.
2. **Root Directory:** `frontend`. Framework: Next.js (auto). Leave build settings default.
3. **Environment Variables** (all environments):

| Key | Value |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://nyaberaworks.co.ke` |
| `API_INTERNAL_URL` | your Render API address, no trailing slash |
| `PROXY_SHARED_SECRET` | the same value as on the Render API |
| `CLIENT_IP_HOPS_FROM_RIGHT` | `1` |
| `API_PROXY_TIMEOUT_MS` | `55000` |

4. **Deploy.** Open the `vercel.app` address, browse, send a contact message.

## 3. Domain
Search Console domain verification (TXT record) as in doc 12 section 8a. Then Vercel → project → **Settings → Domains** → add `nyaberaworks.co.ke` and follow the DNS records Vercel shows at Truehost (remove old parking `A`/`AAAA` records). Vercel issues HTTPS automatically.

## 4. Check, then Google
Visitor-address check (doc 12 section 9; if codes are wrong set `CLIENT_IP_HOPS_FROM_RIGHT` to `2` and redeploy). Then sitemap and indexing (doc 12 section 11).
