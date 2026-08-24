$ErrorActionPreference = 'Stop'
$body = @{ email = "admin@shiftsync.com"; password = "password123" } | ConvertTo-Json
$response = Invoke-RestMethod -Uri "http://localhost:8080/api/auth/login" -Method Post -Body $body -ContentType "application/json"
$token = $response.accessToken

$holidayBody = @{
    holidayDate = "2026-09-01"
    name = "National Day"
    rateMultiplier = 3.0
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:8080/api/holidays" -Method Post -Headers @{Authorization="Bearer $token"} -Body $holidayBody -ContentType "application/json" -ErrorVariable err -ErrorAction SilentlyContinue | Out-Null
Write-Host "Error: $($err[0].ErrorDetails)"
