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

# Clean up
docker exec shiftsync-db psql -U postgres -d shiftsync -c "DELETE FROM payroll_period WHERE status = 'CONFIRMED';"

# Create a pending request BEFORE lock
$reqLock = @{ shiftId = $shiftId; requestedCheckIn = "2026-08-25T09:10:00Z"; requestedCheckOut = "2026-08-25T17:10:00Z"; reason = "Wait for lock" } | ConvertTo-Json
$resLock = Invoke-RestMethod -Uri "http://localhost:8080/api/stores/$storeId/attendance-adjustments" -Method Post -Body $reqLock -Headers $headersStaff
$reqLockId = $resLock.id

# Lock the payroll
docker exec shiftsync-db psql -U postgres -d shiftsync -c "INSERT INTO payroll_period (id, store_id, start_date, end_date, status) VALUES (gen_random_uuid(), '$storeId', '2026-08-01', '2026-08-31', 'CONFIRMED');"

try {
    # Try to approve request created before lock
    Invoke-RestMethod -Uri "http://localhost:8080/api/stores/$storeId/attendance-adjustments/$reqLockId/approve" -Method Put -Headers $headersManager
} catch {
    Write-Host "Expected Error on Approve: $($_.Exception.Message)"
    $stream = $_.Exception.Response.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($stream)
    Write-Host "Response Body: $($reader.ReadToEnd())"
}
