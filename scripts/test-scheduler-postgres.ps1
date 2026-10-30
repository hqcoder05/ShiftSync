param()
$ErrorActionPreference = 'Stop'
$backendPath = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../shiftsync-backend'))
Push-Location -LiteralPath $backendPath
try {
    & docker compose -f compose.stabilization.yml up -d --wait --wait-timeout 60 postgres redis
    if ($LASTEXITCODE -ne 0) { throw 'Could not start isolated scheduler test services.' }
    $databaseExists = & docker exec shiftsync-stabilization-postgres-1 psql -U postgres -d postgres -Atc "SELECT count(*) FROM pg_database WHERE datname='shiftsync_scheduler_test'"
    if ($LASTEXITCODE -ne 0) { throw 'Could not inspect isolated test PostgreSQL.' }
    if ($databaseExists.Trim() -eq '0') {
        & docker exec shiftsync-stabilization-postgres-1 psql -U postgres -d postgres -c 'CREATE DATABASE shiftsync_scheduler_test'
        if ($LASTEXITCODE -ne 0) { throw 'Could not create isolated scheduler test database.' }
    }
    # No reset, truncate, or operational datasource. Spring migrates only the test DB.
    & mvn '-Dtest=SchedulingPostgresIntegrationTest' '-Dshiftsync.scheduler.postgres-tests=true' '-DargLine=-XX:ActiveProcessorCount=4 -Djava.net.preferIPv4Stack=true' test
    if ($LASTEXITCODE -ne 0) { throw 'Scheduler PostgreSQL integration tests failed; inspect target/surefire-reports.' }
    # Keep opt-in evidence when an ordinary unit run subsequently writes a skipped report.
    $evidenceDirectory = Join-Path $backendPath 'target/scheduler-postgres-evidence'
    New-Item -ItemType Directory -Path $evidenceDirectory -Force | Out-Null
    Copy-Item -LiteralPath (Join-Path $backendPath 'target/surefire-reports/TEST-com.shiftsync.shift.service.SchedulingPostgresIntegrationTest.xml') -Destination $evidenceDirectory -Force
} finally {
    Pop-Location
}
