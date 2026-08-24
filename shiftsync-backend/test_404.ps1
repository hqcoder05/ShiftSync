$ErrorActionPreference = 'Stop'
function Get-Token {
    param ($email)
    $body = @{ email = $email; password = 'password123' } | ConvertTo-Json
    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/auth/login" -Method Post -Body $body -ContentType "application/json"
    return $response.accessToken
}
$adminToken = Get-Token "admin@shiftsync.com"
try {
    Invoke-RestMethod -Uri "http://localhost:8080/api/test-auth" -Method Get -Headers @{Authorization="Bearer $adminToken"}
} catch {
    Write-Host "Code: $($_.Exception.Response.StatusCode)"
}
