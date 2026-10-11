<#
Back up the Neon database to a file on your laptop.

Usage (PowerShell 7, from the project root):
    $env:NEON_DIRECT_URL = "postgresql://USER:PASSWORD@ep-xxxx.REGION.aws.neon.tech/neondb?sslmode=require"
    ./scripts/backup-neon.ps1

Use the DIRECT (non-pooled) address. Needs pg_dump (installed with PostgreSQL;
the "Command Line Tools" option is enough). Backups go to backups/ (ignored by Git).
Neon's free plan only keeps a few hours of history, so run this weekly and
copy the files somewhere safe (another drive or your cloud storage).
#>
$ErrorActionPreference = "Stop"
if (-not $env:NEON_DIRECT_URL) { throw "Set `$env:NEON_DIRECT_URL first (see the top of this script)." }
if (-not (Get-Command pg_dump -ErrorAction SilentlyContinue)) { throw "pg_dump not found. Install PostgreSQL client tools and reopen PowerShell." }
$dir = Join-Path $PSScriptRoot "..\backups"
New-Item -ItemType Directory -Force -Path $dir | Out-Null
$file = Join-Path $dir ("nyaberaworks-{0}.dump" -f (Get-Date -Format "yyyyMMdd-HHmmss"))
pg_dump --format=custom --no-owner --file $file $env:NEON_DIRECT_URL
if ($LASTEXITCODE -ne 0) { Remove-Item $file -ErrorAction SilentlyContinue; throw "pg_dump failed." }
"Wrote $file ({0:N0} KB)" -f ((Get-Item $file).Length / 1KB)
# Keep the newest 12 backups.
Get-ChildItem $dir -Filter "nyaberaworks-*.dump" | Sort-Object LastWriteTime -Descending | Select-Object -Skip 12 | Remove-Item
