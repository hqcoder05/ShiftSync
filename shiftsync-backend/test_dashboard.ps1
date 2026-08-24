$ErrorActionPreference = "Stop"

$managerEmail = "manager@shiftsync.com"
$storeId = "11111111-1111-1111-1111-111111111111"
$startDate = "2026-08-01"
$endDate = "2026-08-31"

function Log($msg) { Write-Host ">>> $msg" -ForegroundColor Cyan }

function Get-Token($email) {
    $body = @{ email = $email; password = "password123" } | ConvertTo-Json
    $res = Invoke-RestMethod -Uri "http://localhost:8080/api/auth/login" -Method Post -Body $body -ContentType "application/json"
    return $res.accessToken
}

Log "Logging in as Manager..."
$tokenManager = Get-Token $managerEmail
$headersManager = @{ Authorization = "Bearer $tokenManager"; "Content-Type" = "application/json" }

Log "Fetching Dashboard KPIs..."
$url = "http://localhost:8080/api/stores/$storeId/dashboard?startDate=$startDate&endDate=$endDate"
$res = Invoke-RestMethod -Uri $url -Method Get -Headers $headersManager

Log "--- Dashboard KPI Response ---"
$res | ConvertTo-Json -Depth 5
