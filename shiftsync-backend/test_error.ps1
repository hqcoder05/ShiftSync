$ErrorActionPreference = 'Stop'
function Get-Token {
    param ($email)
    $body = @{ email = $email; password = 'password123' } | ConvertTo-Json
    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/auth/login" -Method Post -Body $body -ContentType "application/json"
    return $response.accessToken
}

$adminToken = Get-Token "admin@shiftsync.com"
$headers = @{ Authorization = "Bearer $adminToken"; "Content-Type" = "application/json" }
$storeId = "11111111-1111-1111-1111-111111111111"

try {
    $shiftId = "7cb2f9a9-3a37-4995-acc1-c7945d75f5f7"
    $staffId = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
    $assignBody = @{ staffId = $staffId } | ConvertTo-Json
    $assignment = Invoke-RestMethod -Uri "http://localhost:8080/api/stores/$storeId/shifts/$shiftId/assignments" -Method Post -Body $assignBody -Headers $headers
} catch {
    Write-Host "Response: $( [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream()).ReadToEnd() )"
}
