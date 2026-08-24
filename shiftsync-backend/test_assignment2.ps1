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
    minStaff = 1
    maxStaff = 5
} | ConvertTo-Json
$shift = Invoke-RestMethod -Uri "http://localhost:8080/api/stores/$storeId/shifts" -Method Post -Body $shiftBody -Headers $headers
$shiftId = $shift.id
Write-Host "Created Shift: $shiftId"

# 2. Assign staff (Manager assigns Staff A)
$staffId = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
$assignBody = @{ staffId = $staffId } | ConvertTo-Json
$assignment = Invoke-RestMethod -Uri "http://localhost:8080/api/stores/$storeId/shifts/$shiftId/assignments" -Method Post -Body $assignBody -Headers $headers
$assignmentId = $assignment.id
Write-Host "Created Assignment: $assignmentId"

# 3. Generate Payroll to create period for 2027-06
$genBody = @{ startDate = "2027-06-01"; endDate = "2027-06-15" } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:8080/api/stores/$storeId/payroll/generate" -Method Post -Body $genBody -Headers $headers | Out-Null

$periods = Invoke-RestMethod -Uri "http://localhost:8080/api/stores/$storeId/payroll" -Method Get -Headers $headers
$periodId = ($periods | Where-Object { $_.startDate -eq "2027-06-01" }).id

# 4. Update Period to CONFIRMED
$updateBody = @{ status = "CONFIRMED" } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:8080/api/stores/$storeId/payroll/$periodId/status" -Method Put -Body $updateBody -Headers $headers | Out-Null
Write-Host "Period changed to CONFIRMED"

# 5. Try to assign ANOTHER staff -> Should fail
$staffId2 = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"
$assignBody2 = @{ staffId = $staffId2 } | ConvertTo-Json
try {
    Invoke-RestMethod -Uri "http://localhost:8080/api/stores/$storeId/shifts/$shiftId/assignments" -Method Post -Body $assignBody2 -Headers $headers | Out-Null
    Write-Host "ERROR: Allowed assignment in LOCKED period!"
} catch {
    Write-Host "EXPECTED ERROR CREATE ASSIGNMENT: $($_.Exception.Message)"
    Write-Host "Response: $( [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream()).ReadToEnd() )"
}

# 6. Try to delete assignment -> Should fail
try {
    Invoke-RestMethod -Uri "http://localhost:8080/api/stores/$storeId/shifts/$shiftId/assignments/$assignmentId" -Method Delete -Headers $headers | Out-Null
    Write-Host "ERROR: Allowed delete assignment in LOCKED period!"
} catch {
    Write-Host "EXPECTED ERROR DELETE ASSIGNMENT: $($_.Exception.Message)"
    Write-Host "Response: $( [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream()).ReadToEnd() )"
}
