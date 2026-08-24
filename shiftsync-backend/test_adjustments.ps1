$ErrorActionPreference = "Stop"

$staffEmail = "a@test.com"
$managerEmail = "manager@shiftsync.com"
$storeId = "11111111-1111-1111-1111-111111111111"
$shiftId = "99999999-9999-9999-9999-999999999999"

function Log($msg) { Write-Host ">>> $msg" -ForegroundColor Cyan }

function Get-Token($email) {
    $body = @{ email = $email; password = "password123" } | ConvertTo-Json
    $res = Invoke-RestMethod -Uri "http://localhost:8080/api/auth/login" -Method Post -Body $body -ContentType "application/json"
    return $res.accessToken
}

$tokenStaff = Get-Token $staffEmail
$tokenManager = Get-Token $managerEmail
$headersStaff = @{ Authorization = "Bearer $tokenStaff"; "Content-Type" = "application/json" }
$headersManager = @{ Authorization = "Bearer $tokenManager"; "Content-Type" = "application/json" }

Log "--- CASE 5: Forgot check-in completely (attendanceId=null) ---"
$req1 = @{ shiftId = $shiftId; requestedCheckIn = "2026-08-30T08:05:00Z"; requestedCheckOut = "2026-08-30T16:05:00Z"; reason = "Forgot to check in entirely" } | ConvertTo-Json
$res1 = Invoke-RestMethod -Uri "http://localhost:8080/api/stores/$storeId/attendance-adjustments" -Method Post -Body $req1 -Headers $headersStaff
Write-Host "Staff created request: $($res1 | ConvertTo-Json -Depth 3)"
$reqId1 = $res1.id

$app1 = Invoke-RestMethod -Uri "http://localhost:8080/api/stores/$storeId/attendance-adjustments/$reqId1/approve" -Method Put -Headers $headersManager
Write-Host "Manager approved request: $($app1 | ConvertTo-Json -Depth 3)"
$newAttendanceId = $app1.attendanceId

Log "Checking DB for Case 5 (Should see 1 new Attendance record linked to the request)..."
docker exec shiftsync-db psql -U postgres -d shiftsync -c "SELECT id, check_in_time, check_out_time, status FROM attendance WHERE id = '$newAttendanceId';"
docker exec shiftsync-db psql -U postgres -d shiftsync -c "SELECT id, attendance_id, status FROM attendance_adjustment_request WHERE id = '$reqId1';"

Log "--- CASE 1 & 2: Update EXISTING Attendance ---"
$req2 = @{ attendanceId = $newAttendanceId; shiftId = $shiftId; requestedCheckIn = "2026-08-30T08:00:00Z"; requestedCheckOut = "2026-08-30T16:00:00Z"; reason = "Adjusting to exact time" } | ConvertTo-Json
$res2 = Invoke-RestMethod -Uri "http://localhost:8080/api/stores/$storeId/attendance-adjustments" -Method Post -Body $req2 -Headers $headersStaff
Write-Host "Staff created request 2: $($res2 | ConvertTo-Json -Depth 3)"
$reqId2 = $res2.id

$app2 = Invoke-RestMethod -Uri "http://localhost:8080/api/stores/$storeId/attendance-adjustments/$reqId2/approve" -Method Put -Headers $headersManager
Write-Host "Manager approved request 2: $($app2 | ConvertTo-Json -Depth 3)"

Log "Checking DB for Case 1 & 2 (Attendance should be updated to 08:00:00)..."
docker exec shiftsync-db psql -U postgres -d shiftsync -c "SELECT id, check_in_time, check_out_time, status FROM attendance WHERE id = '$newAttendanceId';"
