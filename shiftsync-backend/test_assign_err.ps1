$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

$managerBody = '{"email":"manager@shiftsync.com","password":"password123"}'
$managerToken = (Invoke-RestMethod -Uri "http://localhost:8080/api/auth/login" -Method Post -ContentType "application/json" -Body $managerBody).accessToken

$shiftBody3 = '{"shiftDate":"2026-10-25","startTime":"10:00:00","endTime":"14:00:00", "requirements":[{"skillLevel":"BEGINNER", "requiredCount":1}]}'
$shiftRes3 = Invoke-RestMethod -Uri "http://localhost:8080/api/stores/11111111-1111-1111-1111-111111111111/shifts" -Method Post -Headers @{Authorization="Bearer $managerToken"} -ContentType "application/json" -Body $shiftBody3
$shiftId3 = $shiftRes3.id

$publishBody3 = '{"startDate":"2026-10-25","endDate":"2026-10-25"}'
Invoke-RestMethod -Uri "http://localhost:8080/api/stores/11111111-1111-1111-1111-111111111111/shifts/publish" -Method Post -Headers @{Authorization="Bearer $managerToken"} -ContentType "application/json" -Body $publishBody3

$assignBody = '{"staffId":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}'
curl.exe -s -w "\nStatus: %{http_code}" -X POST -H "Authorization: Bearer $managerToken" -H "Content-Type: application/json" -d '{\"staffId\":\"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa\"}' http://localhost:8080/api/stores/11111111-1111-1111-1111-111111111111/shifts/$shiftId3/assignments
