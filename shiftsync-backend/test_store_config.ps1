$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$loginBody = '{"email":"manager@shiftsync.com","password":"password123"}'
$loginRes = Invoke-RestMethod -Uri "http://localhost:8080/api/auth/login" -Method Post -ContentType "application/json" -Body $loginBody
$token = $loginRes.accessToken

Write-Output "
--- A. Create and Publish Shift ---"
$shiftBody = '{"shiftDate":"2026-09-01","startTime":"08:00:00","endTime":"16:00:00"}'
$createRes = Invoke-RestMethod -Uri "http://localhost:8080/api/stores/11111111-1111-1111-1111-111111111111/shifts" -Method Post -Headers @{Authorization="Bearer $token"} -ContentType "application/json" -Body $shiftBody
$shiftId = $createRes.id
Write-Output "Created Shift ID: $shiftId"

$publishBody = '{"startDate":"2026-09-01","endDate":"2026-09-01"}'
Invoke-RestMethod -Uri "http://localhost:8080/api/stores/11111111-1111-1111-1111-111111111111/shifts/publish" -Method Post -Headers @{Authorization="Bearer $token"} -ContentType "application/json" -Body $publishBody
Write-Output "Published Shift"

Write-Output "
--- B. PUT Store Configuration (Violate old shift) ---"
$configBody = '{"openTime":"10:00:00","closeTime":"20:00:00","maxHourPerWeek":40,"minRestHours":11,"geofenceRadiusM":100,"availabilityDeadlineHours":24,"allowedCheckInMinutes":30,"allowedCheckOutMinutes":60,"lateGraceMinutes":5,"earlyLeaveGraceMinutes":5}'
curl.exe -s -w "\nStatus: %{http_code}" -X PUT -H "Authorization: Bearer $token" -H "Content-Type: application/json" -d $configBody http://localhost:8080/api/stores/11111111-1111-1111-1111-111111111111/configuration

Write-Output "

--- C. GET Shift (Should be unchanged) ---"
curl.exe -s -w "\nStatus: %{http_code}" -H "Authorization: Bearer $token" http://localhost:8080/api/stores/11111111-1111-1111-1111-111111111111/shifts

Write-Output "

--- D. Create NEW Shift (Should be blocked by new config) ---"
$newShiftBody = '{"shiftDate":"2026-09-02","startTime":"08:00:00","endTime":"16:00:00"}'
curl.exe -s -w "\nStatus: %{http_code}" -X POST -H "Authorization: Bearer $token" -H "Content-Type: application/json" -d $newShiftBody http://localhost:8080/api/stores/11111111-1111-1111-1111-111111111111/shifts
