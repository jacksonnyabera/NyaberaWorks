# 13 — Launch on Render (free) + Neon

A **temporary, no-card launch**. Use it to get online and indexed now; move to a paid server (`11-go-live.md`) when you can pay.

## 0. Read this first

- Render's own [free-tier page](https://render.com/docs/free) says free instances are for testing and hobby projects and **not for production applications**. Use this as a trial launch.
- A free service **sleeps after 15 minutes without visits** and takes about a minute to wake up. Two services sleep here (website and API), so the first visitor after a quiet spell may wait about one to two minutes. Later clicks are fast.
- You get 750 free hours a month for the whole account. One service awake all month uses nearly all of it, so **do not use a "keep-alive" pinger**: it would use up the hours and Render would suspend your services.
- Neon (database) also sleeps after 5 minutes idle and adds a few seconds.
- Free build minutes and bandwidth are limited. If they run out, builds or services pause until next month.
- Render's screens change. If a button is named slightly differently, tell me what you see.

## 1. Before you start

Do steps 3 and 4 and 5 of `docs/12-go-live-cloud-run.md` first (they do not need Google):

1. Create the Neon database (section 1, item 6, and section 2). Get the **pooled** and **direct** addresses, each starting `postgresql+psycopg://`.
2. Create your two secrets (section 3).
3. Create the tables and your admin account (section 5, using the **direct** address).

Your code must be pushed to GitHub (`git push`).

## 2. Create the API on Render

1. Sign up at <https://render.com> with GitHub.
2. **New +** → **Web Service** → pick your NyaberaWorks repository (connect GitHub if asked).
3. Fill in:
   - **Name:** `nyaberaworks-api`
   - **Region:** Frankfurt
   - **Branch:** `main`
   - **Root Directory:** `backend`
   - **Language / Runtime:** Docker
   - **Instance type:** Free
4. Under **Environment Variables** add each of these (one per row):

| Key | Value |
|---|---|
| `APP_ENV` | `production` |
| `APP_DEBUG` | `false` |
| `ENABLE_API_DOCS` | `false` |
| `SITE_URL` | `https://nyaberaworks.co.ke` |
| `DATABASE_URL` | the Neon **pooled** address |
| `APP_SECRET_KEY` | your first secret |
| `PROXY_SHARED_SECRET` | your second secret |
| `WEB_CONCURRENCY` | `1` |
| `PORT` | `8000` |
| `EMAIL_BACKEND` | `console` |

5. Under **Advanced** set **Health Check Path** to `/api/health`.
6. **Create Web Service**. The first build takes 5 to 10 minutes. When it is "Live", copy its address (like `https://nyaberaworks-api.onrender.com`; the name must be unique, so it may differ).
7. Test it (the first call can take a minute):
   ```powershell
   curl.exe https://YOUR-API.onrender.com/api/health/ready
   ```
   Expected: `{"status":"ready","database":"ok"}`.

## 3. Create the website on Render

Same screen, **New +** → **Web Service**, same repository:

- **Name:** `nyaberaworks-web`, **Region:** Frankfurt, **Root Directory:** `frontend`, **Runtime:** Docker, **Instance type:** Free.

Environment variables:

| Key | Value |
|---|---|
| `API_INTERNAL_URL` | the API address from step 2 (no trailing slash) |
| `PROXY_SHARED_SECRET` | the **same** second secret as the API |
| `CLIENT_IP_HOPS_FROM_RIGHT` | `1` |
| `API_PROXY_TIMEOUT_MS` | `75000` |
| `PORT` | `3000` |

Create it and wait for "Live". Open its `onrender.com` address, browse the pages, and send a test contact message. (Login only works on the real domain; that is deliberate.)

## 4. Connect your domain

1. Search Console: add a **Domain** property for `nyaberaworks.co.ke`, add the TXT record at Truehost, and verify (same as section 8a of doc 12).
2. In Render, open `nyaberaworks-web` → **Settings** → **Custom Domains** → **Add Custom Domain** → `nyaberaworks.co.ke`.
3. Render shows DNS records to add. In Truehost DNS: delete old `A`/`AAAA` records for `@`, then add exactly what Render lists. Keep the TXT record.
4. Click **Verify** in Render. HTTPS is issued automatically (minutes to a few hours).

Skip `www` for now.

## 5. Check the visitor address

Same test as section 9 of doc 12: send a form from your laptop and your phone (mobile data), then in Neon's SQL Editor:

```sql
select left(ip_hash, 8) as visitor, created_at from contact_messages order by created_at desc limit 5;
```

Laptop and phone must show different codes; two messages from the same device show the same code. If every row is identical, set `CLIENT_IP_HOPS_FROM_RIGHT` to `2` on the website service (Render redeploys) and repeat. Tell me what you see.

## 6. Launch checks and Google

Do sections 10 and 11 of doc 12 (log in as admin, check Leads, read Privacy/Terms, submit `https://nyaberaworks.co.ke/sitemap.xml`, request indexing for the main pages).

Because services sleep, Google may sometimes find the site slow. That can limit how well it ranks. It is another reason to move to a paid server later.

## 7. Looking after it

- **Update the site:** push to GitHub; Render rebuilds automatically. Database changes: run `alembic upgrade head` from your laptop (doc 12 section 5) **before** pushing.
- **Backups:** `scripts/backup-neon.ps1` weekly (doc 12 section 12).
- **Email later:** add the SMTP settings plus `EMAIL_SEND_INLINE=true` to the API service.
- **Move to a paid server later:** `docs/11-go-live.md`. Your data can be restored from a Neon backup.
