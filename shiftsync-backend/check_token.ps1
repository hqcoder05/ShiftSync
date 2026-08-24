$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

$loginBody = '{"email":"admin@shiftsync.com","password":"password123"}'
$loginRes = Invoke-RestMethod -Uri "http://localhost:8080/api/auth/login" -Method Post -ContentType "application/json" -Body $loginBody
Write-Output "Token is:"
Write-Output $loginRes.accessToken
