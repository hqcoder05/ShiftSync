$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path $PSScriptRoot -Parent
$composeFile = Join-Path $repoRoot 'shiftsync-backend/compose.stabilization.yml'

docker compose -f $composeFile up -d --wait postgres redis
if ($LASTEXITCODE -ne 0) { throw 'Isolated test infrastructure failed to start.' }

# JDK Windows selectors use Unix-domain sockets in the temp directory. A short
# ASCII path avoids failures when the user profile path cannot be used for them.
$env:TEMP = Join-Path $env:SystemRoot 'Temp'
$env:TMP = $env:TEMP
$env:DB_HOST = '127.0.0.1'
$env:DB_PORT = '55432'
$env:DB_NAME = 'shiftsync_stabilization'
$env:DB_USER = 'postgres'
$env:DB_PASSWORD = 'stabilization-local-only'
$env:REDIS_HOST = '127.0.0.1'
$env:REDIS_PORT = '56379'

Push-Location (Join-Path $repoRoot 'shiftsync-backend')
try {
    & .\mvnw.cmd test @args
    if ($LASTEXITCODE -ne 0) { throw 'Backend tests failed.' }
} finally {
    Pop-Location
}
