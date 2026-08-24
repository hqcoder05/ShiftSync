$ErrorActionPreference = 'Stop'
function Get-Token {
    param ($email)
    $body = @{ email = $email; password = 'password123' } | ConvertTo-Json
    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/auth/login" -Method Post -Body $body -ContentType "application/json"
    return $response.accessToken
}

$adminToken = Get-Token "admin@shiftsync.com"
$headers = @{ Authorization = "Bearer $adminToken"; "Content-Type" = "application/json" }
$storeId = "11111111-1111-1111-1111-111111111111"

Write-Host "---- TEST ShiftAssignment ----"
$shiftDate = "2027-06-06"  # SUNDAY

# 1. Create Shift in DRAFT/UNLOCKED period
$shiftBody = @{
    shiftDate = $shiftDate
    startTime = "08:00"
    endTime = "12:00"
} | ConvertTo-Json
$shift = Invoke-RestMethod -Uri "http://localhost:8080/api/stores/$storeId/shifts" -Method Post -Body $shiftBody -Headers $headers
$shiftId = $shift.id
Write-Host "Created Shift: $shiftId"

# 2. Set Requirements (2 slots)
$reqBody = '[{"skillId":"22222222-2222-2222-2222-222222222222","requiredCount":2}]'
Invoke-RestMethod -Uri "http://localhost:8080/api/stores/$storeId/shifts/$shiftId/requirements" -Method Put -Headers $headers -Body $reqBody -ContentType "application/json" | Out-Null

# 3. Publish
$pubBody = @{ startDate = $shiftDate; endDate = $shiftDate } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:8080/api/stores/$storeId/shifts/publish" -Method Post -Headers $headers -Body $pubBody -ContentType "application/json" | Out-Null

# 4. Assign staff 1 (Manager assigns Staff A)
$staffId = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
$assignBody = @{ staffId = $staffId } | ConvertTo-Json
$assignment = Invoke-RestMethod -Uri "http://localhost:8080/api/stores/$storeId/shifts/$shiftId/assignments" -Method Post -Body $assignBody -Headers $headers
$assignmentId = $assignment.id
Write-Host "Created Assignment: $assignmentId"

# 5. Generate Payroll to create period for 2027-06
$genBody = @{ startDate = "2027-06-01"; endDate = "2027-06-15" } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:8080/api/stores/$storeId/payroll/generate" -Method Post -Body $genBody -Headers $headers | Out-Null

$periods = Invoke-RestMethod -Uri "http://localhost:8080/api/stores/$storeId/payroll" -Method Get -Headers $headers
$periodId = ($periods | Where-Object { $_.startDate -eq "2027-06-01" }).id

# 6. Update Period to CONFIRMED
$updateBody = @{ status = "CONFIRMED" } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:8080/api/stores/$storeId/payroll/$periodId/status" -Method Put -Body $updateBody -Headers $headers | Out-Null
Write-Host "Period changed to CONFIRMED"

# 7. Try to assign ANOTHER staff -> Should fail because PERIOD IS LOCKED
$staffId2 = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"
$assignBody2 = @{ staffId = $staffId2 } | ConvertTo-Json
try {
    Invoke-RestMethod -Uri "http://localhost:8080/api/stores/$storeId/shifts/$shiftId/assignments" -Method Post -Body $assignBody2 -Headers $headers | Out-Null
    Write-Host "ERROR: Allowed assignment in LOCKED period!"
} catch {
    Write-Host "EXPECTED ERROR CREATE ASSIGNMENT: $($_.Exception.Message)"
    Write-Host "Response: $( [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream()).ReadToEnd() )"
}
