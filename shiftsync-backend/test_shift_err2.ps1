$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

$loginBody = '{"email":"manager@shiftsync.com","password":"password123"}'
$loginRes = Invoke-RestMethod -Uri "http://localhost:8080/api/auth/login" -Method Post -ContentType "application/json" -Body $loginBody
$token = $loginRes.accessToken

$shiftBody = '{"shiftDate":"2026-09-11","startTime":"08:00:00","endTime":"16:00:00"}'
try {
    $createRes = Invoke-RestMethod -Uri "http://localhost:8080/api/stores/11111111-1111-1111-1111-111111111111/shifts" -Method Post -Headers @{Authorization="Bearer $token"} -ContentType "application/json" -Body $shiftBody
    Write-Output "Created"
} catch {
    Write-Output $_.ErrorDetails.Message
}
