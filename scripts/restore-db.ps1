# Commonsia — restore a Supabase backup (Windows PowerShell)
#
# DANGER: --clean --if-exists drops every table in `public` before recreating. Always restore into
# a fresh/dev Supabase project first, verify, then repeat against production.
#
# Usage (from repo root):
#   .\scripts\restore-db.ps1 .\backups\2026-04-21_0200.dump.gz
#
# Optional: override the target with a one-off URL instead of reading .env.
#   $env:RESTORE_URL = "postgresql://...:5432/postgres?sslmode=require"
#   .\scripts\restore-db.ps1 .\backups\2026-04-21_0200.dump.gz

param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string]$DumpPath
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $repoRoot ".env"

if (-not (Test-Path $DumpPath)) {
    Write-Host "ERROR: backup file not found: $DumpPath" -ForegroundColor Red
    exit 1
}

$targetUrl = $env:RESTORE_URL
if (-not $targetUrl) {
    if (-not (Test-Path $envFile)) {
        Write-Host "ERROR: .env not found and RESTORE_URL not set." -ForegroundColor Red
        exit 1
    }
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^\s*DIRECT_URL\s*=\s*"?([^"\r\n]+)"?') {
            $targetUrl = $matches[1].Trim()
        }
    }
}

if (-not $targetUrl) {
    Write-Host "ERROR: No target URL. Set RESTORE_URL env var or add DIRECT_URL to .env." -ForegroundColor Red
    exit 1
}

$targetHost = ($targetUrl -replace '\?.*$', '')
if ($targetHost -match '@([^:/]+)') {
    $targetHostName = $matches[1]
} else {
    $targetHostName = "<unknown>"
}

Write-Host "WARNING — this will DROP and RECREATE every table in the public schema of:" -ForegroundColor Yellow
Write-Host "   $targetHostName" -ForegroundColor Yellow
Write-Host "   using $DumpPath" -ForegroundColor Yellow
$confirm = Read-Host "Type the host name ($targetHostName) to confirm"
if ($confirm -ne $targetHostName) {
    Write-Host "Aborted." -ForegroundColor Red
    exit 1
}

if (-not (Get-Command pg_restore -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: pg_restore not on PATH. Install Postgres 15+ client tools." -ForegroundColor Red
    exit 1
}

$connStr = $targetUrl -replace '\?.*$', ''
$tempDump = Join-Path $env:TEMP ("commonsia-restore-" + [System.Guid]::NewGuid().ToString("N") + ".dump")

try {
    Write-Host "Decompressing $DumpPath ..." -ForegroundColor Cyan
    $inStream = [System.IO.File]::OpenRead($DumpPath)
    $gzStream = New-Object System.IO.Compression.GZipStream($inStream, [System.IO.Compression.CompressionMode]::Decompress)
    $outStream = [System.IO.File]::Create($tempDump)
    $gzStream.CopyTo($outStream)
    $gzStream.Close(); $inStream.Close(); $outStream.Close()

    Write-Host "Running pg_restore..." -ForegroundColor Cyan
    & pg_restore --clean --if-exists --no-owner --no-privileges --verbose --dbname=$connStr $tempDump
    if ($LASTEXITCODE -ne 0) {
        Write-Host "pg_restore reported warnings/errors (exit $LASTEXITCODE). Inspect the log above." -ForegroundColor Yellow
    } else {
        Write-Host "Restore complete." -ForegroundColor Green
    }
} finally {
    if (Test-Path $tempDump) { Remove-Item $tempDump -Force }
}
