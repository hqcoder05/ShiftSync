# ShiftSync Master Seed Dataset Runner (PowerShell)
# Usage: ./run_seed.ps1

Write-Host "=== RESETTING & SEEDING SHIFTSYNC DATABASE ===" -ForegroundColor Cyan

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$seedFile = Join-Path $scriptDir "seed_master_dataset.sql"

if (-Not (Test-Path $seedFile)) {
    Write-Host "Error: seed_master_dataset.sql not found at $seedFile" -ForegroundColor Red
    Exit 1
}

Write-Host "Applying $seedFile to PostgreSQL container shiftsync-db..." -ForegroundColor Yellow
Get-Content $seedFile -Raw | docker exec -i shiftsync-db psql -U postgres -d shiftsync

if ($LASTEXITCODE -eq 0) {
    Write-Host "=== DATABASE SEEDED SUCCESSFULLY! READY FOR MANUAL QA ===" -ForegroundColor Green
} else {
    Write-Host "=== DATABASE SEED FAILED! PLEASE CHECK POSTGRES LOGS ===" -ForegroundColor Red
    Exit 1
}
