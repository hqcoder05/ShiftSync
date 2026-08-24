$ErrorActionPreference = "Stop"
$staffEmail = "new_staff@test.com"
$managerEmail = "new_manager@test.com"
$storeId = "11111111-1111-1111-1111-111111111111"
$shiftId = "22222222-2222-2222-2222-222222222222"

function Get-Token($email) {
    $body = @{ email = $email; password = "password123" } | ConvertTo-Json
    $res = Invoke-RestMethod -Uri "http://localhost:8080/api/auth/login" -Method Post -Body $body -ContentType "application/json"
    return $res.accessToken
}
$tokenStaff = Get-Token $staffEmail
$tokenManager = Get-Token $managerEmail
$headersStaff = @{ Authorization = "Bearer $tokenStaff"; "Content-Type" = "application/json" }
$headersManager = @{ Authorization = "Bearer $tokenManager"; "Content-Type" = "application/json" }

# Remove locks
docker exec shiftsync-db psql -U postgres -d shiftsync -c "DELETE FROM payroll_period WHERE status = 'CONFIRMED';"

$attendanceId = (docker exec shiftsync-db psql -t -A -U postgres -d shiftsync -c "SELECT id FROM attendance WHERE check_in_time > '2026-08-01' LIMIT 1").Trim()
Write-Host "Attendance ID: $attendanceId"

$reqLate = @{ attendanceId = $attendanceId; shiftId = $shiftId; requestedCheckIn = "2026-08-25T10:00:00Z"; requestedCheckOut = "2026-08-25T17:10:00Z"; reason = "I am late" } | ConvertTo-Json
$resLate = Invoke-RestMethod -Uri "http://localhost:8080/api/stores/$storeId/attendance-adjustments" -Method Post -Body $reqLate -Headers $headersStaff
$reqLateId = $resLate.id
Write-Host "Created Late Adjustment: $reqLateId"

$appLate = Invoke-RestMethod -Uri "http://localhost:8080/api/stores/$storeId/attendance-adjustments/$reqLateId/approve" -Method Put -Headers $headersManager
Write-Host "Approved Late Adjustment."

docker exec shiftsync-db psql -U postgres -d shiftsync -c "SELECT id, check_in_time, status FROM attendance WHERE id = '$attendanceId';"
