$ErrorActionPreference = 'Stop'
function Get-Token {
    param ($email)
    $body = @{ email = $email; password = 'password123' } | ConvertTo-Json
    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/auth/login" -Method Post -Body $body -ContentType "application/json"
    return $response.accessToken
}
$adminToken = Get-Token "admin@shiftsync.com"
$managerToken = Get-Token "manager@shiftsync.com"
$storeId = "11111111-1111-1111-1111-111111111111"
$staffId = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"

Write-Host "=== TEST 1: Admin creates Holiday ==="
$holidayBody = @{ holidayDate = "2026-09-27"; name = "Sunday Holiday"; rateMultiplier = 3.0 } | ConvertTo-Json
$holiday = Invoke-RestMethod -Uri "http://localhost:8080/api/holidays" -Method Post -Headers @{Authorization="Bearer $adminToken"} -Body $holidayBody -ContentType "application/json"
$holiday | Format-List

Write-Host "=== TEST 2: Manager creates Shifts ==="
$shift1Body = @{ shiftDate = "2026-09-27"; startTime = "08:00:00"; endTime = "12:00:00" } | ConvertTo-Json
$shift1 = Invoke-RestMethod -Uri "http://localhost:8080/api/stores/$storeId/shifts" -Method Post -Headers @{Authorization="Bearer $managerToken"} -Body $shift1Body -ContentType "application/json"
Write-Host "Shift 1 on Holiday created: $($shift1.id)"

$shift2Body = @{ shiftDate = "2026-10-04"; startTime = "08:00:00"; endTime = "12:00:00" } | ConvertTo-Json
$shift2 = Invoke-RestMethod -Uri "http://localhost:8080/api/stores/$storeId/shifts" -Method Post -Headers @{Authorization="Bearer $managerToken"} -Body $shift2Body -ContentType "application/json"
Write-Host "Shift 2 on Normal Day created: $($shift2.id)"

Write-Host "=== TEST 3: Add requirements and publish ==="
$reqBody = '[{"skillId":"22222222-2222-2222-2222-222222222222","requiredCount":1}]'
Invoke-RestMethod -Uri "http://localhost:8080/api/stores/$storeId/shifts/$($shift1.id)/requirements" -Method Put -Headers @{Authorization="Bearer $managerToken"} -Body $reqBody -ContentType "application/json" | Out-Null
Invoke-RestMethod -Uri "http://localhost:8080/api/stores/$storeId/shifts/$($shift2.id)/requirements" -Method Put -Headers @{Authorization="Bearer $managerToken"} -Body $reqBody -ContentType "application/json" | Out-Null

$publishBody = @{ startDate = "2026-09-27"; endDate = "2026-10-04" } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:8080/api/stores/$storeId/shifts/publish" -Method Post -Headers @{Authorization="Bearer $managerToken"} -Body $publishBody -ContentType "application/json" | Out-Null

Write-Host "=== TEST 4: Assign Staff A to both shifts ==="
$assignBody = @{ staffId = $staffId } | ConvertTo-Json
$assignment1 = Invoke-RestMethod -Uri "http://localhost:8080/api/stores/$storeId/shifts/$($shift1.id)/assignments" -Method Post -Headers @{Authorization="Bearer $managerToken"} -Body $assignBody -ContentType "application/json"
$assignment2 = Invoke-RestMethod -Uri "http://localhost:8080/api/stores/$storeId/shifts/$($shift2.id)/assignments" -Method Post -Headers @{Authorization="Bearer $managerToken"} -Body $assignBody -ContentType "application/json"

Write-Host "=== TEST 5: Complete shifts (via direct DB) ==="
docker exec shiftsync-db psql -U postgres -d shiftsync -c "UPDATE shift SET status = 'COMPLETED' WHERE id IN ('$($shift1.id)', '$($shift2.id)');"
docker exec shiftsync-db psql -U postgres -d shiftsync -c "INSERT INTO attendance (id, shift_assignment_id, check_in_time, check_out_time, deleted) VALUES (gen_random_uuid(), '$($assignment1.id)', '2026-09-27 08:00:00+00', '2026-09-27 12:00:00+00', false);"
docker exec shiftsync-db psql -U postgres -d shiftsync -c "INSERT INTO attendance (id, shift_assignment_id, check_in_time, check_out_time, deleted) VALUES (gen_random_uuid(), '$($assignment2.id)', '2026-10-04 08:00:00+00', '2026-10-04 12:00:00+00', false);"

Write-Host "=== TEST 6: Calculate Payroll ==="
$calcBody = @{ startDate = "2026-09-01"; endDate = "2026-10-31" } | ConvertTo-Json
$payroll = Invoke-RestMethod -Uri "http://localhost:8080/api/stores/$storeId/payroll/calculate" -Method Post -Headers @{Authorization="Bearer $managerToken"} -Body $calcBody -ContentType "application/json"
$payroll | Format-List
