# 11 — Going live

> **Prefer to start for free?** `12-go-live-cloud-run.md` deploys the same project on Google Cloud Run with a free Neon database instead of a server.

This guide takes NyaberaWorks from your laptop to a public website on your own domain. Follow it in order. Everything runs on one small Linux server using Docker.

What you will end up with: `https://your-domain` serving the website, `/api/*` served by the API, PostgreSQL storing the data, HTTPS certificates that renew themselves, daily backups, and email notifications to you.

Payments are **not** part of this launch. The site takes quote requests, bookings, contact messages and accounts. Nothing is sold online yet.

---

## 0. Before you start: what you need

| Item | Notes |
|---|---|
| A domain name | From any registrar. You must be able to edit its DNS records. |
| A VPS (Linux server) | Ubuntu 24.04 LTS, at least 2 vCPU and 2 GB RAM (4 GB is more comfortable). Check current prices with providers when you buy. |
| A GitHub repository | Your code, pushed to `main` (see section 3). |
| A mail account for sending | An SMTP service or a mailbox on your domain. Optional on day one: without it you simply do not get email alerts. |
| About 2 hours | Most of it is waiting for DNS and the first build. |

Do these two things on your own accounts now: turn on **two-factor authentication** for your domain registrar, your VPS provider and GitHub. These three accounts control your whole business.

## 1. Content check (do this before the public sees it)

The site only states facts you have confirmed. Before launch, read every page once on your phone and on your laptop, and check:

- **Contact details** in `frontend/src/lib/site.ts` (email, phone, WhatsApp) are the ones you want published.
- **About page**: every statement is true and you are comfortable with it being public.
- **Portfolio**: each project's status and result is accurate. Edit them in Admin → Portfolio. Do not leave anything you cannot back up.
- **Prices**: services show "Priced per project" until you set a starting price in Admin → Services. Only enter a price you will honour.
- **Privacy policy and Terms**: these are templates. Read them, adjust them to how you really work, and consider having them reviewed by someone qualified. Check with the Office of the Data Protection Commissioner (ODPC) whether you need to register as a data controller or processor in Kenya.

## 2. Pick the domain's canonical address

Decide one address, for example `nyaberaworks.co.ke` (no `www`). The site redirects `www.` to it. This value is `DOMAIN` below.

## 3. Push the code to GitHub

On your laptop, in the project folder:

```powershell
git status          # make sure no .env file is listed
git push
```

`.env` files are ignored by `.gitignore`. If `git status` ever lists a `.env` file, stop and do not commit it.

## 4. Create the server

1. At your VPS provider create a server: **Ubuntu 24.04 LTS**, choose a region close to your visitors, and add your **SSH public key** (not a password login).
2. Note the server's public IPv4 address.
3. Connect from PowerShell:

```powershell
ssh root@SERVER_IP
```

## 5. Point your domain at the server

At your domain registrar's DNS settings add:

| Type | Name | Value |
|---|---|---|
| A | `@` | `SERVER_IP` |
| A | `www` | `SERVER_IP` |

DNS can take a few minutes to a few hours. Check from your laptop:

```powershell
nslookup your-domain
```

It must show your server's IP before you start the site, otherwise the HTTPS certificate cannot be issued.

## 6. Prepare the server (once)

Run these on the server. Replace `jackson` with the username you want.

```bash
# Updates
apt update && apt upgrade -y

# A normal user for daily work, with your SSH key
adduser --disabled-password --gecos "" jackson
usermod -aG sudo jackson
mkdir -p /home/jackson/.ssh
cp /root/.ssh/authorized_keys /home/jackson/.ssh/
chown -R jackson:jackson /home/jackson/.ssh
echo "jackson ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/jackson

# Firewall: SSH, HTTP, HTTPS only
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 443/udp
ufw --force enable

# Automatic security updates
apt install -y unattended-upgrades

# Swap space (the website build needs memory; this prevents out-of-memory failures)
fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab

# Docker (official installer)
curl -fsSL https://get.docker.com | sh
usermod -aG docker jackson
```

Now open a **second** PowerShell window and check you can log in as the new user before going further:

```powershell
ssh jackson@SERVER_IP
```

When that works, disable root and password logins (run as `jackson`):

```bash
sudo sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin no/; s/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo systemctl restart ssh
```

From here on, work as `jackson`.

## 7. Get the code onto the server

```bash
cd ~
git clone https://github.com/jacksonnyabera/NyaberaWorks.git
cd NyaberaWorks/deploy
```

If the repository is private, GitHub will ask for credentials. Use a **fine-grained personal access token** with read-only access to this one repository as the password. Never share that token.

## 8. Create the production settings

Still in `~/NyaberaWorks/deploy`:

```bash
cp .env.example .env
chmod 600 .env
echo "POSTGRES_PASSWORD=$(openssl rand -hex 24)"
echo "APP_SECRET_KEY=$(openssl rand -hex 32)"
nano .env
```

In `nano`, set:

- `DOMAIN` to your address, no `https://`.
- `POSTGRES_PASSWORD` and `APP_SECRET_KEY` to the two generated values printed above.
- Leave the email section for now unless you already have SMTP details (see section 12).

Save with `Ctrl+O`, `Enter`, leave with `Ctrl+X`. Keep a copy of this file's secrets in a password manager. **If you lose `APP_SECRET_KEY` nobody can stay signed in; if you lose the database password you can still reset it, but the stored data stays tied to the old one.**

## 9. Start the site

```bash
docker compose --env-file .env up -d --build
```

The first build takes several minutes. Then check:

```bash
docker compose --env-file .env ps
```

Every service should be `running` or `healthy`; `migrate` shows `exited (0)`, which is correct (it applies the database changes and loads the starter services, then stops).

If something is not healthy, read the logs of that service:

```bash
docker compose --env-file .env logs --tail=80 api
```

## 10. Create your admin account

```bash
docker compose --env-file .env exec api python -m app.cli.create_admin
```

Enter your email and a strong password at the hidden prompts. Use a password of at least 12 characters that you do not use anywhere else.

## 11. Verify the launch

Work through this list from your phone's mobile data (not your home Wi-Fi) so you see what visitors see:

- [ ] `https://your-domain` loads with a padlock.
- [ ] `http://your-domain` and `https://www.your-domain` both redirect to the main address.
- [ ] `https://your-domain/api/health/ready` shows `"status":"ready","database":"ok"` (database connected).
- [ ] `https://your-domain/api/docs` shows **Not found** (API docs are off in production).
- [ ] Submit the contact form, the quote form and the booking form with test details. Each shows a reference.
- [ ] Log in at `/login` with your admin account. Messages, Quotes and Bookings show your three test entries. Set each to a final status such as `archived` or `spam` so they do not clutter your work.
- [ ] Admin → Services: the nine starter services are listed. Edit one, wait one minute, refresh the public page: the change appears.
- [ ] Register a test client account with a different email, check it appears in Admin → Clients, then deactivate it.
- [ ] `https://your-domain/sitemap.xml` and `/robots.txt` load.
- [ ] Paste your address into WhatsApp or a social post to check the preview image and title.

## 12. Turn on email alerts

You want an email each time someone submits a form. You need SMTP details from your mail provider (host, port, username, password) and two addresses: the one mail is sent **from** (on your domain) and the one that **receives** the alerts.

Edit `deploy/.env`:

```
EMAIL_BACKEND=smtp
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_USERNAME=...
SMTP_PASSWORD=...
SMTP_STARTTLS=true
EMAIL_FROM=noreply@your-domain
ADMIN_NOTIFY_EMAIL=you@example.com
```

Apply and test:

```bash
docker compose --env-file .env up -d
```

Submit the contact form and check the mail arrives (also look in spam). If it does not, run `docker compose --env-file .env logs api | grep email` for the reason. To improve delivery, ask your mail provider how to add the SPF and DKIM records to your domain's DNS. The form submission is always saved in the database even when email fails.

## 13. Backups (do not skip)

A backup that has never been restored is only a hope. Do both steps.

**Make a backup now and schedule it daily:**

```bash
cd ~/NyaberaWorks/deploy
sh backup.sh
crontab -e
```

Add this line (runs at 02:30 every night; replace `jackson` if you chose another name):

```
30 2 * * * cd /home/jackson/NyaberaWorks/deploy && sh backup.sh >> backups/backup.log 2>&1
```

Backups are kept on the server for 14 days. A backup on the same server does not survive losing the server, so also copy them elsewhere regularly. From your laptop:

```powershell
scp -r jackson@SERVER_IP:~/NyaberaWorks/deploy/backups C:\Dev\NyaberaWorks-backups
```

Your VPS provider's snapshot feature is a good second layer.

**Practise a restore** (on the server; this replaces the database contents, so only do it deliberately):

```bash
cd ~/NyaberaWorks/deploy
docker compose --env-file .env stop web api
docker compose --env-file .env exec -T db psql -U nyaberaworks -d postgres -c "DROP DATABASE nyaberaworks;" -c "CREATE DATABASE nyaberaworks OWNER nyaberaworks;"
gunzip -c backups/FILE_NAME.sql.gz | docker compose --env-file .env exec -T db psql -U nyaberaworks -d nyaberaworks
docker compose --env-file .env up -d
```

## 14. Updating the site later

On your laptop: change code, run the checks, `git commit`, `git push`. Then on the server:

```bash
cd ~/NyaberaWorks && git pull
cd deploy && sh backup.sh
docker compose --env-file .env up -d --build
```

Database changes are applied automatically by the `migrate` step. If a new version misbehaves, go back to the previous commit with `git checkout <old-commit>` and run the same `up -d --build`; restore the backup only if data changed in a way that cannot be undone.

## 15. After launch: help people find you

1. **Google Search Console**: add your domain as a property, verify it (a DNS TXT record is easiest), then submit `https://your-domain/sitemap.xml`. Do the same in Bing Webmaster Tools.
2. **Google Business Profile**: create one if you want to appear for local searches. Use only true details.
3. Put your website address everywhere you already appear: GitHub profile, LinkedIn, WhatsApp Business, email signature, your NyumbaDirect and other project pages.
4. Share a project case study rather than only the home page; specific pages get found for specific searches.
5. Rankings take weeks, not days. Check Search Console's "Pages" report to confirm the pages are indexed.

## 16. Routine care

| How often | What |
|---|---|
| Daily | Check Admin for new messages, quotes and bookings. Answer within the time your site promises. |
| Weekly | Look at `docker compose ps` and make sure backups are still appearing in `deploy/backups`. |
| Monthly | `sudo apt update && sudo apt upgrade -y`, reboot if asked. Pull and redeploy to receive dependency fixes. |
| Every few months | Restore a backup to check it works. Review user accounts in Admin → Clients. |

## 17. Troubleshooting

| Symptom | Likely cause and fix |
|---|---|
| Browser says the connection is not private / no certificate | DNS does not point to the server yet, or ports 80/443 are blocked. Check `nslookup`, `ufw status`, and `docker compose logs caddy`. |
| 502 Bad Gateway | `api` or `web` is not running. `docker compose ps`, then `docker compose logs --tail=80 api` (or `web`). |
| `api` keeps restarting with `APP_SECRET_KEY must be at least 32 characters` | `deploy/.env` is missing or has a short key. Regenerate with `openssl rand -hex 32`. |
| `migrate` fails | `docker compose logs migrate`. Usually a wrong `POSTGRES_PASSWORD` after the first start: the database was created with the old one. If the site has no real data yet, run `docker compose down -v` and start again; otherwise reset the database user's password inside `db`. |
| Services page empty, forms say "Choose a service" | The starter services were not loaded. Run `docker compose --env-file .env run --rm migrate`. |
| Build is killed | The server ran out of memory. Make sure the swap file from section 6 exists (`free -h`) or use a bigger server. |
| Changes in Admin do not show on the site | The public pages refresh about once a minute. Wait and reload. |
| Cannot sign in after several wrong tries | The account locks for 15 minutes by design. |

## 18. Not part of this launch

Password reset by email and admin two-factor are built; reset emails need SMTP set up. Online payments (partly built, not live), orders and invoices, reviews and email verification are designed (see docs 02, 07 and 15) but not finished.
