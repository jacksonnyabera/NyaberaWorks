#!/bin/sh
# Back up the database to deploy/backups/ and keep the last 14 backups.
# Run from the deploy folder:  sh backup.sh
# Schedule it daily with cron, and copy the backups off the server too.
set -eu
cd "$(dirname "$0")"
mkdir -p backups
file="backups/nyaberaworks-$(date +%Y%m%d-%H%M%S).sql.gz"
docker compose --env-file .env exec -T db pg_dump -U nyaberaworks nyaberaworks | gzip > "$file"
echo "Wrote $file"
ls -1t backups/*.sql.gz | tail -n +15 | xargs -r rm --
