# Commonsia — on-demand database backup (Windows PowerShell)
#
# Runs pg_dump against DIRECT_URL (Supabase transaction-pooler URL breaks utility commands)
# and writes a gzipped custom-format dump to `backups/YYYY-MM-DD_HHmm.dump.gz`.
#
# Prereqs:
#   - PostgreSQL client tools (>= 15) installed. Download:
#     https://www.enterprisedb.com/downloads/postgres-postgresql-downloads
#     During install, enable "Command Line Tools" only; add pg install bin folder to PATH.
#   - Your `.env` file already holds DIRECT_URL.
#
# Usage (from repo root):
#   pwsh -File .\scripts\backup-db.ps1
#   .\scripts\backup-db.ps1               # if you already run PowerShell

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$backupDir = Join-Path $repoRoot "backups"
$envFile = Join-Path $repoRoot ".env"

if (-not (Test-Path $envFile)) {
    Write-Host "ERROR: .env not found at $envFile" -ForegroundColor Red
    exit 1
}

$directUrl = $null
Get-Content $envFile | ForEach-Object {
    if ($_ -match '^\s*DIRECT_URL\s*=\s*"?([^"\r\n]+)"?') {
        $directUrl = $matches[1].Trim()
    }
}

if (-not $directUrl) {
    Write-Host "ERROR: DIRECT_URL missing in .env. Paste the Supabase 'Direct connection' URL." -ForegroundColor Red
    exit 1
}

# Strip any query string — pg_dump accepts the bare URL and ?sslmode=require isn't needed for the CLI.
$connStr = $directUrl -replace '\?.*$', ''

if (-not (Get-Command pg_dump -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: pg_dump not on PATH. Install Postgres 15+ client tools." -ForegroundColor Red
    Write-Host "  Download: https://www.enterprisedb.com/downloads/postgres-postgresql-downloads" -ForegroundColor Yellow
    exit 1
}

if (-not (Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir | Out-Null
}

$timestamp = Get-Date -Format "yyyy-MM-dd_HHmm"
$dumpPath = Join-Path $backupDir "$timestamp.dump"
$compressedPath = "$dumpPath.gz"

Write-Host "Running pg_dump against Supabase..." -ForegroundColor Cyan
# Custom format (-Fc) is the most compact + restorable via pg_restore.
# --no-owner / --no-privileges keep the dump portable across Supabase projects.
& pg_dump --format=custom --no-owner --no-privileges --verbose --file=$dumpPath $connStr 2>&1 | Select-String -Pattern "^pg_dump:" -NotMatch

if ($LASTEXITCODE -ne 0) {
    Write-Host "pg_dump failed (exit $LASTEXITCODE). Dump not written." -ForegroundColor Red
    if (Test-Path $dumpPath) { Remove-Item $dumpPath -Force }
    exit $LASTEXITCODE
}

Write-Host "Compressing dump..." -ForegroundColor Cyan
$dumpBytes = [System.IO.File]::ReadAllBytes($dumpPath)
$outStream = [System.IO.File]::Create($compressedPath)
$gzStream = New-Object System.IO.Compression.GZipStream($outStream, [System.IO.Compression.CompressionLevel]::Optimal)
$gzStream.Write($dumpBytes, 0, $dumpBytes.Length)
$gzStream.Close()
$outStream.Close()
Remove-Item $dumpPath -Force

$sizeMb = [Math]::Round((Get-Item $compressedPath).Length / 1MB, 2)
Write-Host "Backup complete: $compressedPath ($sizeMb MB)" -ForegroundColor Green
Write-Host "Restore with: .\scripts\restore-db.ps1 $compressedPath" -ForegroundColor Yellow
