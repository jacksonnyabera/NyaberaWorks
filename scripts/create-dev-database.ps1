#Requires -Version 7
<#
  Creates the local PostgreSQL role and databases for NyaberaWorks development,
  writes backend\.env with a random password and secret key, and applies the
  database migrations. Safe to run twice: it stops if backend\.env already
  has a DATABASE_URL.

  Usage (from the repo root):  .\scripts\create-dev-database.ps1
  Optional:                    .\scripts\create-dev-database.ps1 -Port 5433
#>
param([int]$Port = 5432)

$ErrorActionPreference = "Stop"
$repo = Split-Path -Parent $PSScriptRoot
$backend = Join-Path $repo "backend"
$envFile = Join-Path $backend ".env"

if ((Test-Path $envFile) -and (Select-String -Path $envFile -Pattern '^DATABASE_URL=' -Quiet)) {
    Write-Host "backend\.env already contains DATABASE_URL. Nothing to do." -ForegroundColor Yellow
    exit 0
}

# Find psql (on PATH, or in the default PostgreSQL install folder)
$psql = (Get-Command psql -ErrorAction SilentlyContinue)?.Source
if (-not $psql) {
    $psql = Get-ChildItem "C:\Program Files\PostgreSQL\*\bin\psql.exe" -ErrorAction SilentlyContinue |
        Sort-Object { [int]$_.Directory.Parent.Name } -Descending |
        Select-Object -First 1 -ExpandProperty FullName
}
if (-not $psql) { throw "psql.exe not found. Install PostgreSQL first (https://www.postgresql.org/download/windows/)." }
Write-Host "Using $psql"

$secure = Read-Host "Enter the password you chose for the 'postgres' user when installing PostgreSQL" -AsSecureString
$env:PGPASSWORD = ConvertFrom-SecureString -SecureString $secure -AsPlainText

function Invoke-Psql([string]$Database, [string]$Sql) {
    $out = & $psql -h 127.0.0.1 -p $Port -U postgres -d $Database -v ON_ERROR_STOP=1 -tA -c $Sql
    if ($LASTEXITCODE -ne 0) { throw "psql failed. Check the postgres password and that PostgreSQL is running on port $Port." }
    return ($out | Out-String).Trim()
}

$dbPassword = [Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(16)).ToLower()
$secretKey = [Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(32)).ToLower()

try {
    if ((Invoke-Psql "postgres" "SELECT 1 FROM pg_roles WHERE rolname='nyaberaworks'") -eq "1") {
        Invoke-Psql "postgres" "ALTER ROLE nyaberaworks WITH LOGIN PASSWORD '$dbPassword'" | Out-Null
        Write-Host "Role 'nyaberaworks' already existed: password reset."
    } else {
        Invoke-Psql "postgres" "CREATE ROLE nyaberaworks WITH LOGIN PASSWORD '$dbPassword'" | Out-Null
        Write-Host "Created role 'nyaberaworks'."
    }
    foreach ($name in @("nyaberaworks", "nyaberaworks_test")) {
        if ((Invoke-Psql "postgres" "SELECT 1 FROM pg_database WHERE datname='$name'") -ne "1") {
            Invoke-Psql "postgres" "CREATE DATABASE $name OWNER nyaberaworks" | Out-Null
            Write-Host "Created database '$name'."
        } else {
            Write-Host "Database '$name' already exists."
        }
    }
}
finally {
    Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
}

$lines = @(
    "DATABASE_URL=postgresql+psycopg://nyaberaworks:$dbPassword@127.0.0.1:$Port/nyaberaworks",
    "APP_SECRET_KEY=$secretKey"
)
if ((Test-Path $envFile) -and ((Get-Item $envFile).Length -gt 0)) { Add-Content -Path $envFile -Value "" -Encoding utf8NoBOM }
Add-Content -Path $envFile -Value $lines -Encoding utf8NoBOM
Write-Host "Wrote DATABASE_URL and APP_SECRET_KEY to backend\.env (this file is ignored by Git)." -ForegroundColor Green

# Apply the migrations
$python = Join-Path $backend ".venv\Scripts\python.exe"
if (-not (Test-Path $python)) { throw "backend\.venv not found. Create it first (see the setup steps)." }
Push-Location $backend
try {
    & $python -m alembic upgrade head
    if ($LASTEXITCODE -ne 0) { throw "Migrations failed." }
}
finally { Pop-Location }
Write-Host "Database ready." -ForegroundColor Green
Write-Host "To also run the migration test later, set TEST_DATABASE_URL to the same URL with /nyaberaworks_test at the end."
