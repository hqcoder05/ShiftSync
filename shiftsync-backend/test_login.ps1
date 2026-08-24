$ErrorActionPreference = 'Stop'

function Get-Token {
    param ($email)
    Write-Host "Getting token for $email"
    $body = @{ email = $email; password = 'password' } | ConvertTo-Json
    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/auth/login" -Method Post -Body $body -ContentType "application/json"
    return $response.token
}

$adminToken = Get-Token "admin@shiftsync.com"
$managerToken = Get-Token "manager@shiftsync.com"
