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

Write-Host "=== TEST 1: Admin creates Holiday 1 & 2 ==="
$hol1 = Invoke-RestMethod -Uri "http://localhost:8080/api/holidays" -Method Post -Headers @{Authorization="Bearer $adminToken"} -Body (@{ holidayDate="2026-11-08"; name="Sun 1"; rateMultiplier=3.0 }|ConvertTo-Json) -ContentType "application/json"
$hol2 = Invoke-RestMethod -Uri "http://localhost:8080/api/holidays" -Method Post -Headers @{Authorization="Bearer $adminToken"} -Body (@{ holidayDate="2026-11-15"; name="Sun 2"; rateMultiplier=2.0 }|ConvertTo-Json) -ContentType "application/json"

Write-Host "=== TEST 2: Manager creates Shifts ==="
$shift1 = Invoke-RestMethod -Uri "http://localhost:8080/api/stores/$storeId/shifts" -Method Post -Headers @{Authorization="Bearer $managerToken"} -Body (@{ shiftDate="2026-11-08"; startTime="08:00:00"; endTime="12:00:00" }|ConvertTo-Json) -ContentType "application/json"
$shift2 = Invoke-RestMethod -Uri "http://localhost:8080/api/stores/$storeId/shifts" -Method Post -Headers @{Authorization="Bearer $managerToken"} -Body (@{ shiftDate="2026-11-15"; startTime="08:00:00"; endTime="12:00:00" }|ConvertTo-Json) -ContentType "application/json"

$reqBody = '[{"skillId":"22222222-2222-2222-2222-222222222222","requiredCount":1}]'
Invoke-RestMethod -Uri "http://localhost:8080/api/stores/$storeId/shifts/$($shift1.id)/requirements" -Method Put -Headers @{Authorization="Bearer $managerToken"} -Body $reqBody -ContentType "application/json" | Out-Null
Invoke-RestMethod -Uri "http://localhost:8080/api/stores/$storeId/shifts/$($shift2.id)/requirements" -Method Put -Headers @{Authorization="Bearer $managerToken"} -Body $reqBody -ContentType "application/json" | Out-Null
Invoke-RestMethod -Uri "http://localhost:8080/api/stores/$storeId/shifts/publish" -Method Post -Headers @{Authorization="Bearer $managerToken"} -Body (@{ startDate="2026-11-08"; endDate="2026-11-15" }|ConvertTo-Json) -ContentType "application/json" | Out-Null

$assignBody = @{ staffId = $staffId } | ConvertTo-Json
$assignment1 = Invoke-RestMethod -Uri "http://localhost:8080/api/stores/$storeId/shifts/$($shift1.id)/assignments" -Method Post -Headers @{Authorization="Bearer $managerToken"} -Body $assignBody -ContentType "application/json"
$assignment2 = Invoke-RestMethod -Uri "http://localhost:8080/api/stores/$storeId/shifts/$($shift2.id)/assignments" -Method Post -Headers @{Authorization="Bearer $managerToken"} -Body $assignBody -ContentType "application/json"

docker exec shiftsync-db psql -U postgres -d shiftsync -c "UPDATE shift SET status = 'COMPLETED' WHERE id IN ('$($shift1.id)', '$($shift2.id)');"
docker exec shiftsync-db psql -U postgres -d shiftsync -c "INSERT INTO attendance (id, shift_assignment_id, check_in_time, check_out_time, deleted) VALUES (gen_random_uuid(), '$($assignment1.id)', '2026-11-08 08:00:00+00', '2026-11-08 12:00:00+00', false);"
docker exec shiftsync-db psql -U postgres -d shiftsync -c "INSERT INTO attendance (id, shift_assignment_id, check_in_time, check_out_time, deleted) VALUES (gen_random_uuid(), '$($assignment2.id)', '2026-11-15 08:00:00+00', '2026-11-15 12:00:00+00', false);"

Invoke-RestMethod -Uri "http://localhost:8080/api/stores/$storeId/payroll/generate" -Method Post -Headers @{Authorization="Bearer $managerToken"} -Body (@{ startDate="2026-11-01"; endDate="2026-11-30" }|ConvertTo-Json) -ContentType "application/json" | Out-Null
$periods = Invoke-RestMethod -Uri "http://localhost:8080/api/stores/$storeId/payroll" -Method Get -Headers @{Authorization="Bearer $managerToken"}
$periodId = $periods[0].id
$payslips = Invoke-RestMethod -Uri "http://localhost:8080/api/stores/$storeId/payroll/$periodId/payslips" -Method Get -Headers @{Authorization="Bearer $managerToken"}
$payslips | Where-Object { $_.staffId -eq $staffId } | Format-List
