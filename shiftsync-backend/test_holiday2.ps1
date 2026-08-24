$ErrorActionPreference = 'Stop'
function Get-Token {
    param ($email)
    $body = @{ email = $email; password = 'password123' } | ConvertTo-Json
    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/auth/login" -Method Post -Body $body -ContentType "application/json"
    return $response.accessToken
}
$managerToken = Get-Token "manager@shiftsync.com"

$holidayBody = @{
    holidayDate = "2026-09-01"
    name = "National Day"
    rateMultiplier = 3.0
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8080/api/holidays" -Method Post -Headers @{Authorization="Bearer $managerToken"} -Body $holidayBody -ContentType "application/json"
