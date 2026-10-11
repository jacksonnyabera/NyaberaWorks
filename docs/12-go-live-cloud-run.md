# 12 — Going live for (almost) free: Google Cloud Run + Neon

This is the **low-cost alternative** to `11-go-live.md` (one paid server). Use one or the other, not both.

What you end up with: `https://nyaberaworks.co.ke` served by two Google Cloud Run services (the website and the API) and a free Neon PostgreSQL database. Payments are not part of this launch.

## 0. Read this first: what "free" means here

| Part | Cost | Honest notes |
|---|---|---|
| Domain `nyaberaworks.co.ke` | Already paid | Renewal is a separate cost next year. |
| Cloud Run (website + API) | KES 0 while you stay inside Google's monthly free amounts | Google asks for a billing card even for the free amounts. **I could not test whether Google accepts Kenyan cards; if it refuses yours, use option 1 (a $10 server) from `11-go-live.md`.** |
| Data leaving Google (egress) | Cents | The free egress allowance applies to North America only. In Europe (where we deploy) you pay from the first byte. For a new small site this is typically a few cents a month, but check your billing page weekly at first. |
| Neon database | KES 0 | Free plan: 1 GB, no card needed. It sleeps after 5 minutes idle, so the first visit after a quiet spell takes a few extra seconds. Its history is very short, so **you must take your own backups** (section 12). |
| Domain mapping | KES 0 | Google labels this feature "Preview". It works, but is not promised for production. If it misbehaves, the fix is to put a paid load balancer or a $10 server in front later. The site's data is not affected. |

Two known behaviours you should expect:
- **Cold starts.** When nobody has visited for a while, the first request takes about 2 to 6 seconds. That is the price of paying nothing.
- **Email.** Notification email stays off (`console`) until you add a mail provider (section 12). Until then, read new leads in Admin → Leads. Check that daily.

## 1. Accounts and tools (about 30 minutes)

1. Use a Google account you control. Turn on 2-step verification: <https://myaccount.google.com/security>.
2. Open <https://console.cloud.google.com>, accept the terms, and **create a project** named `nyaberaworks`. Note the **project ID** (for example `nyaberaworks-123456`).
3. Open **Billing** and link a billing account (card required).
4. **Immediately** create a budget alert: Billing → Budgets & alerts → Create budget → amount **USD 5** → keep the default email alerts at 50%, 90%, 100%. An alert does not stop spending, but it warns you.
5. Install the Google Cloud CLI. In PowerShell 7:
   ```powershell
   winget install Google.CloudSDK
   ```
   Close and reopen PowerShell, then:
   ```powershell
   gcloud auth login
   gcloud config set project YOUR_PROJECT_ID
   gcloud config set run/region europe-west1
   gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com
   ```
6. Create a free Neon account at <https://neon.com> (sign in with GitHub or email). Create a project named `nyaberaworks`, PostgreSQL 17 or newer, region **Frankfurt (eu-central-1)** or London, whichever is offered nearest to `europe-west1`.

## 2. Get the two Neon connection strings

In Neon, open your project → **Connect**. You need two addresses for the same database:

- **Pooled** (host contains `-pooler`): used by the running website. 
- **Direct** (turn "Connection pooling" off in the dialog): used only for setup and backups from your laptop.

Neon shows them as `postgresql://USER:PASSWORD@HOST/neondb?sslmode=require`. The app needs `+psycopg` after `postgresql`. So edit them like this:

```
App (pooled):  postgresql+psycopg://USER:PASSWORD@ep-xxxx-pooler.REGION.aws.neon.tech/neondb?sslmode=require
Setup (direct): postgresql+psycopg://USER:PASSWORD@ep-xxxx.REGION.aws.neon.tech/neondb?sslmode=require
```

If the password contains characters such as `@`, `:`, `/` or `#`, reset it in Neon to one made only of letters and digits, to avoid quoting problems.

## 3. Create your secrets

Two different random values. In PowerShell 7:

```powershell
function New-Secret { $b = [byte[]]::new(32); [Security.Cryptography.RandomNumberGenerator]::Fill($b); -join ($b | ForEach-Object { $_.ToString("x2") }) }
New-Secret   # copy this: APP_SECRET_KEY
New-Secret   # copy this: PROXY_SHARED_SECRET
```

Keep them in your password manager. Never paste them into chat or commit them.

## 4. Fill in the two environment files

From the project root:

```powershell
Copy-Item deploy/cloudrun/api.env.example.yaml deploy/cloudrun/api.env.yaml
Copy-Item deploy/cloudrun/web.env.example.yaml deploy/cloudrun/web.env.yaml
code deploy/cloudrun/api.env.yaml
```

Replace every `CHANGE_ME` in `api.env.yaml` (pooled `DATABASE_URL`, `APP_SECRET_KEY`, `PROXY_SHARED_SECRET`). Leave `web.env.yaml` for now: you fill it after the API is deployed. Both files are ignored by Git; confirm with `git status` (they must not be listed).

## 5. Create the tables and your admin account (from your laptop)

This runs once against Neon's **direct** address. Your laptop's local `backend/.env` is overridden by the variables set below.

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
$env:DATABASE_URL = "postgresql+psycopg://USER:PASSWORD@ep-xxxx.REGION.aws.neon.tech/neondb?sslmode=require"
$env:APP_SECRET_KEY = "any-long-random-value-at-least-32-characters-long"
alembic upgrade head
python -m app.cli.seed_catalog
python -m app.cli.create_admin
Remove-Item Env:DATABASE_URL, Env:APP_SECRET_KEY
cd ..
```

`seed_catalog` loads your services and portfolio. `create_admin` asks for your email and a password at a hidden prompt: use a long unique one.

## 6. Deploy the API

From the project root:

```powershell
gcloud run deploy nyaberaworks-api `
  --source backend `
  --region europe-west1 `
  --allow-unauthenticated `
  --cpu 1 --memory 512Mi `
  --min-instances 0 --max-instances 3 `
  --timeout 60 `
  --env-vars-file deploy/cloudrun/api.env.yaml
```

- If it offers to create an Artifact Registry repository, answer `Y`.
- The first build takes 5 to 10 minutes.
- At the end it prints a **Service URL** like `https://nyaberaworks-api-xxxxx-ew.a.run.app`. Copy it.

"Allow unauthenticated" is required: browsers must be able to reach the website. The API protects itself with sign-in and per-form spam limits; its documentation pages are switched off.

Check it:

```powershell
curl.exe https://nyaberaworks-api-xxxxx-ew.a.run.app/api/health/ready
```

Expected: `{"status":"ready","database":"ok"}` (the first call may take several seconds).

## 7. Deploy the website

Edit `deploy/cloudrun/web.env.yaml`: set `API_INTERNAL_URL` to the API Service URL, and `PROXY_SHARED_SECRET` to **exactly the same** value as in `api.env.yaml`. Then:

```powershell
gcloud run deploy nyaberaworks-web `
  --source frontend `
  --region europe-west1 `
  --allow-unauthenticated `
  --cpu 1 --memory 512Mi `
  --min-instances 0 --max-instances 3 `
  --timeout 60 `
  --env-vars-file deploy/cloudrun/web.env.yaml
```

The public address is already built in as `https://nyaberaworks.co.ke` (every canonical link and the sitemap use it). It prints a Service URL for the website.

Open that `…run.app` URL on your phone and laptop. Browse the pages and **send one contact message**: it should say it was received, and appear in Admin → Leads once the domain is live (see the next note).

> Signing in only works on the real domain. The sign-in cookie endpoints accept requests only from `https://nyaberaworks.co.ke`, so on the `run.app` address you can test pages and forms but not login. That is deliberate security, not a bug.

## 8. Connect your domain

### 8a. Prove you own it (Google Search Console)

1. Open <https://search.google.com/search-console> with the **same Google account** as the Cloud project.
2. Add property → **Domain** → `nyaberaworks.co.ke`.
3. It shows a TXT record. In your Truehost DNS panel add a **TXT** record: host `@`, value as shown. Save. Click **Verify** (it can take from a minute to a few hours).

### 8b. Map the domain to the website

```powershell
gcloud beta run domain-mappings create --service nyaberaworks-web --domain nyaberaworks.co.ke --region europe-west1
gcloud beta run domain-mappings describe --domain nyaberaworks.co.ke --region europe-west1
```

The second command lists **resource records** to add (for the bare domain: `A` records and `AAAA` records). In Truehost DNS:

1. Delete any existing `A`/`AAAA` records for `@` (parking pages).
2. Add exactly the records Google lists. Do not remove the TXT record from 8a.

### 8c. Wait for HTTPS

Google issues the certificate automatically; it takes about 15 minutes, sometimes up to 24 hours. Check:

```powershell
gcloud beta run domain-mappings describe --domain nyaberaworks.co.ke --region europe-west1
```

When the conditions say `Ready: True` and `CertificateProvisioned: True`, open <https://nyaberaworks.co.ke>.

Skip `www` for now. Later you can add a `www` mapping; the site tells search engines the bare domain is the main one.

## 9. Check that the visitor address is handled correctly (do this the same day)

The spam limit works per visitor address (5 forms per hour). If the site sees the wrong address, **every visitor shares one limit**. Check:

1. On your laptop (Wi-Fi) send a contact message. On your phone **with Wi-Fi off (mobile data)** send another. Then send a second one from the laptop.
2. In Neon → SQL Editor, run:
   ```sql
   select left(ip_hash, 8) as visitor, created_at from contact_messages order by created_at desc limit 5;
   ```
3. Expected: laptop and phone show **different** codes; the two laptop messages show the **same** code.
4. If every row has the same code (or every row is different even from the same device), change `CLIENT_IP_HOPS_FROM_RIGHT` in `web.env.yaml` to `2`, redeploy the website (section 7 command) and repeat. Tell me what you see if neither works.

Delete these test rows afterwards in Admin → Leads, or leave them: they are your own messages.

## 10. Final launch checks

- Sign in at `https://nyaberaworks.co.ke/login` with your admin account, open Admin → Leads, and confirm your test message is there.
- Admin → Services and Portfolio: check every statement is true (nothing invented).
- Read the Privacy and Terms pages: they are templates. Adjust them to how you really work.
- Open the site on a phone. Test the contact, quote and booking forms.
- <https://nyaberaworks.co.ke/robots.txt> and <https://nyaberaworks.co.ke/sitemap.xml> both open.

## 11. Get indexed by Google

In Search Console (the domain property from 8a):

1. **Sitemaps** → enter `https://nyaberaworks.co.ke/sitemap.xml` → Submit.
2. **URL inspection** → paste the home page, then `/services`, `/portfolio`, `/contact`, `/about` one at a time → **Request indexing**. (There is a daily quota; do the most important pages first.)
3. Indexing usually takes a few days to a few weeks. It is not instant, and Google does not guarantee it. Pages with real, specific content index better than thin ones.

Search `site:nyaberaworks.co.ke` in Google after a week to see what is in.

## 12. Looking after it

**Backups (weekly).** Install the PostgreSQL command-line tools (the PostgreSQL installer has a "Command Line Tools" option), then:

```powershell
$env:NEON_DIRECT_URL = "postgresql://USER:PASSWORD@ep-xxxx.REGION.aws.neon.tech/neondb?sslmode=require"
./scripts/backup-neon.ps1
Remove-Item Env:NEON_DIRECT_URL
```

(Plain `postgresql://` here, without `+psycopg`.) Copy the file in `backups/` to another place. Restore later with `pg_restore --no-owner -d TARGET_URL FILE`.

**Update the site.** After changing code, push to GitHub, then run the section 6 and/or 7 deploy commands again (website changes: the web command; backend changes: the API command; database changes: section 5's `alembic upgrade head` **first**). Admin edits of services and portfolio need no deploy: they show on the site within a minute.

**Roll back** a bad deploy: Google Cloud console → Cloud Run → the service → Revisions → pick the last good one → Manage traffic → 100%.

**Email notifications later.** When you have an SMTP provider, add to `api.env.yaml`: `EMAIL_BACKEND: "smtp"`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `EMAIL_FROM`, `ADMIN_NOTIFY_EMAIL`, and **`EMAIL_SEND_INLINE: "true"`** (Cloud Run pauses the CPU after replying, so the mail must be sent before the reply). Redeploy the API.

**Watch the bill.** Billing → Reports, once a week for the first month. If it ever rises, tell me the line item.

**Secrets are in your env files.** Keep those two files off Git and off chat. Moving them to Google Secret Manager is a good hardening step once the site is live.

**Turn it all off** (to stop any charges): delete the two services in Cloud Run, or delete the whole Google Cloud project.

## 13. If something fails

| Symptom | Likely cause and fix |
|---|---|
| Build fails | Read the log link printed by `gcloud`. Send me the last 30 lines. |
| `health/ready` says database error | `DATABASE_URL` wrong. It must start `postgresql+psycopg://` and end `?sslmode=require`. |
| Site loads but forms say "Something went wrong" | Website cannot reach the API: check `API_INTERNAL_URL`, and that `PROXY_SHARED_SECRET` is identical in both files. |
| Login says forbidden/expired on the domain | `SITE_URL` in `api.env.yaml` must be exactly `https://nyaberaworks.co.ke`. |
| Domain mapping stays pending | DNS records not matching or old parking records still present. Check with `nslookup nyaberaworks.co.ke`. |
| Domain mapping unavailable in your region | Mapping is Preview. Fall back to the VPS guide (`11-go-live.md`). |
