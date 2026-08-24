$ErrorActionPreference = 'Continue'
function Get-Token {
    param ($email)
    $body = @{ email = $email; password = 'password123' } | ConvertTo-Json
    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/auth/login" -Method Post -Body $body -ContentType "application/json"
    return $response.accessToken
}

$adminToken = Get-Token "admin@shiftsync.com"
$headers = @{ Authorization = "Bearer $adminToken"; "Content-Type" = "application/json" }
$storeId = "11111111-1111-1111-1111-111111111111"

$periods = Invoke-RestMethod -Uri "http://localhost:8080/api/stores/$storeId/payroll" -Method Get -Headers $headers
$periods | ConvertTo-Json
