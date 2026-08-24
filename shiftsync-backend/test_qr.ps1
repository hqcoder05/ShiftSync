$ProgressPreference = 'SilentlyContinue'
$ErrorActionPreference = 'Stop'
$loginBody = '{"email":"manager@shiftsync.com","password":"password123"}'
$loginRes = Invoke-RestMethod -Uri "http://localhost:8080/api/auth/login" -Method Post -ContentType "application/json" -Body $loginBody
$token = $loginRes.accessToken
$headers = @{ "Authorization" = "Bearer $token" }

$qrRes = Invoke-RestMethod -Uri "http://localhost:8080/api/stores/11111111-1111-1111-1111-111111111111/shifts/99999999-9999-9999-9999-999999999999/attendance/qr" -Method Get -Headers $headers
$qrToken = $qrRes.qrToken
Write-Output "QR: $qrToken"

$body = @{ qrToken = $qrToken; latitude = 10.0; longitude = 10.0 } | ConvertTo-Json
$res = Invoke-RestMethod -Uri "http://localhost:8080/api/attendance/scan" -Method Post -ContentType "application/json" -Headers $headers -Body $body
$res | ConvertTo-Json -Depth 5
