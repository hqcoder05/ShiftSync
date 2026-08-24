$ErrorActionPreference = 'Stop'

function Get-Token {
    param ($email)
    $body = @{ email = $email; password = 'password123' } | ConvertTo-Json
    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/auth/login" -Method Post -Body $body -ContentType "application/json"
    return $response.accessToken
}

$adminToken = Get-Token "admin@shiftsync.com"
$holidayBody = @{
    holidayDate = "2026-09-01"
    name = "National Day"
    rateMultiplier = 3.0
} | ConvertTo-Json

try {
    Invoke-RestMethod -Uri "http://localhost:8080/api/holidays" -Method Post -Headers @{Authorization="Bearer $adminToken"} -Body $holidayBody -ContentType "application/json"
} catch {
    Write-Host "Code: $($_.Exception.Response.StatusCode)"
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    Write-Host "Response: $($reader.ReadToEnd())"
}
