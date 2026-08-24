$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$loginBody = '{"email":"manager@shiftsync.com","password":"password123"}'
$loginRes = Invoke-RestMethod -Uri "http://localhost:8080/api/auth/login" -Method Post -ContentType "application/json" -Body $loginBody
$token = $loginRes.accessToken

Write-Output "
--- B. PUT Store Configuration (Violate old shift) ---"
$configBody = '{"openTime":"10:00:00","closeTime":"20:00:00","maxHourPerWeek":40,"minRestHours":11,"geofenceRadiusM":100,"availabilityDeadlineHours":24,"allowedCheckInMinutes":30,"allowedCheckOutMinutes":60,"lateGraceMinutes":5,"earlyLeaveGraceMinutes":5}'
$res = Invoke-RestMethod -Uri "http://localhost:8080/api/stores/11111111-1111-1111-1111-111111111111/configuration" -Method Put -Headers @{Authorization="Bearer $token"} -ContentType "application/json" -Body $configBody
Write-Output "PUT Success. New openTime: $($res.openTime)"

Write-Output "
--- D. Create NEW Shift (Should be blocked by new config) ---"
$newShiftBody = '{"shiftDate":"2026-09-02","startTime":"08:00:00","endTime":"16:00:00"}'
try {
    Invoke-RestMethod -Uri "http://localhost:8080/api/stores/11111111-1111-1111-1111-111111111111/shifts" -Method Post -Headers @{Authorization="Bearer $token"} -ContentType "application/json" -Body $newShiftBody
    Write-Output "Failed! Shift was created unexpectedly."
} catch {
    Write-Output "SUCCESS: Blocked creating shift: $($_.Exception.Message)"
}
