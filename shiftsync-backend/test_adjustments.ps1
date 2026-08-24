$ErrorActionPreference = "Stop"

$staffEmail = "new_staff@test.com"
$managerEmail = "new_manager@test.com"
$storeId = "11111111-1111-1111-1111-111111111111"
$shiftId = "22222222-2222-2222-2222-222222222222"

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

Log "Cleaning up previous test data..."
docker exec shiftsync-db psql -U postgres -d shiftsync -c "DELETE FROM attendance_adjustment_request;"
docker exec shiftsync-db psql -U postgres -d shiftsync -c "DELETE FROM attendance WHERE check_in_time > '2026-08-01';"
docker exec shiftsync-db psql -U postgres -d shiftsync -c "DELETE FROM payroll_period WHERE status = 'CONFIRMED';"

Log "--- CASE 5: Forgot check-in completely (attendanceId=null) ---"
$req1 = @{ shiftId = $shiftId; requestedCheckIn = "2026-08-25T09:05:00Z"; requestedCheckOut = "2026-08-25T17:05:00Z"; reason = "Forgot to check in entirely" } | ConvertTo-Json
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
$req2 = @{ attendanceId = $newAttendanceId; shiftId = $shiftId; requestedCheckIn = "2026-08-25T09:00:00Z"; requestedCheckOut = "2026-08-25T17:00:00Z"; reason = "Adjusting to exact time" } | ConvertTo-Json
$res2 = Invoke-RestMethod -Uri "http://localhost:8080/api/stores/$storeId/attendance-adjustments" -Method Post -Body $req2 -Headers $headersStaff
Write-Host "Staff created request 2: $($res2 | ConvertTo-Json -Depth 3)"
$reqId2 = $res2.id

$app2 = Invoke-RestMethod -Uri "http://localhost:8080/api/stores/$storeId/attendance-adjustments/$reqId2/approve" -Method Put -Headers $headersManager
Write-Host "Manager approved request 2: $($app2 | ConvertTo-Json -Depth 3)"

Log "Checking DB for Case 1 & 2 (Attendance should be updated to 09:00:00)..."
docker exec shiftsync-db psql -U postgres -d shiftsync -c "SELECT id, check_in_time, check_out_time, status FROM attendance WHERE id = '$newAttendanceId';"

Log "--- CASE 3: Manager Rejects ---"
$req3 = @{ attendanceId = $newAttendanceId; shiftId = $shiftId; requestedCheckIn = "2026-08-25T08:00:00Z"; requestedCheckOut = "2026-08-25T16:00:00Z"; reason = "Oops wrong" } | ConvertTo-Json
$res3 = Invoke-RestMethod -Uri "http://localhost:8080/api/stores/$storeId/attendance-adjustments" -Method Post -Body $req3 -Headers $headersStaff
$reqId3 = $res3.id

$rej3 = Invoke-RestMethod -Uri "http://localhost:8080/api/stores/$storeId/attendance-adjustments/$reqId3/reject" -Method Put -Headers $headersManager
Write-Host "Manager rejected request 3: $($rej3 | ConvertTo-Json -Depth 3)"

Log "Checking DB for Case 3 (Attendance should REMAIN 09:00:00)..."
docker exec shiftsync-db psql -U postgres -d shiftsync -c "SELECT id, check_in_time, check_out_time, status FROM attendance WHERE id = '$newAttendanceId';"

Log "--- CASE 4: Blocked by Payroll Locked ---"
# Insert a locked payroll
docker exec shiftsync-db psql -U postgres -d shiftsync -c "INSERT INTO payroll_period (id, store_id, start_date, end_date, status) VALUES (gen_random_uuid(), '$storeId', '2026-08-01', '2026-08-31', 'CONFIRMED');"

try {
    $req4 = @{ attendanceId = $newAttendanceId; shiftId = $shiftId; requestedCheckIn = "2026-08-25T09:10:00Z"; requestedCheckOut = "2026-08-25T17:10:00Z"; reason = "I forgot payroll is locked" } | ConvertTo-Json
    Invoke-RestMethod -Uri "http://localhost:8080/api/stores/$storeId/attendance-adjustments" -Method Post -Body $req4 -Headers $headersStaff
} catch {
    Write-Host "Expected Error on Submit: $($_.Exception.Message)"
    $stream = $_.Exception.Response.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($stream)
    Write-Host "Response Body: $($reader.ReadToEnd())"
}

try {
    # Try to approve request 3 (which was rejected, but let's see if we get the locked error first)
    Invoke-RestMethod -Uri "http://localhost:8080/api/stores/$storeId/attendance-adjustments/$reqId3/approve" -Method Put -Headers $headersManager
} catch {
    Write-Host "Expected Error on Approve: $($_.Exception.Message)"
    $stream = $_.Exception.Response.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($stream)
    Write-Host "Response Body: $($reader.ReadToEnd())"
}
