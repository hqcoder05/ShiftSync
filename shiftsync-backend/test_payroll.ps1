$ErrorActionPreference = 'Stop'
function Get-Token {
    param ($email)
    $body = @{ email = $email; password = 'password123' } | ConvertTo-Json
    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/auth/login" -Method Post -Body $body -ContentType "application/json"
    return $response.accessToken
}
$adminToken = Get-Token "admin@shiftsync.com"
$managerToken = Get-Token "manager@shiftsync.com"
$storeId = "11111111-1111-1111-1111-111111111111"
$staffId = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"

Write-Host "=== TEST 6: Calculate Payroll ==="
$calcBody = @{ startDate = "2026-09-01"; endDate = "2026-10-31" } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:8080/api/stores/$storeId/payroll/generate" -Method Post -Headers @{Authorization="Bearer $managerToken"} -Body $calcBody -ContentType "application/json" | Out-Null

$periods = Invoke-RestMethod -Uri "http://localhost:8080/api/stores/$storeId/payroll" -Method Get -Headers @{Authorization="Bearer $managerToken"}
$periodId = $periods[0].id

$payslips = Invoke-RestMethod -Uri "http://localhost:8080/api/stores/$storeId/payroll/$periodId/payslips" -Method Get -Headers @{Authorization="Bearer $managerToken"}
Write-Host "Payslip for Staff A:"
$payslips | Where-Object { $_.staffId -eq $staffId } | Format-List
