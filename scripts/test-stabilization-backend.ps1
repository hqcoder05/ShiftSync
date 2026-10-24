$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path $PSScriptRoot -Parent
$composeFile = Join-Path $repoRoot 'shiftsync-backend/compose.stabilization.yml'
docker compose -f $composeFile up -d --wait
if ($LASTEXITCODE -ne 0) { throw 'Isolated test infrastructure failed to start.' }
# Linux runner avoids host-specific Java/Netty loopback failures. Compose supplies
# explicit datasource overrides and isolated Maven/target volumes.
docker compose -f $composeFile --profile test run --rm tests
if ($LASTEXITCODE -ne 0) { throw 'Backend stabilization tests failed; inspect runner surefire reports.' }
