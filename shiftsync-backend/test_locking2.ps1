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

Write-Host "---- TEST 1: Generate Payroll (creates Period in DRAFT), change to CONFIRMED, then regenerate ----"
$startDate = "2027-03-01"
$endDate = "2027-03-15"
$genBody = @{ startDate = $startDate; endDate = $endDate } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:8080/api/stores/$storeId/payroll/generate" -Method Post -Body $genBody -Headers $headers | Out-Null

# Get the periods
$periods = Invoke-RestMethod -Uri "http://localhost:8080/api/stores/$storeId/payroll" -Method Get -Headers $headers
$periodId = ($periods.content | Where-Object { $_.startDate -eq $startDate }).id
Write-Host "Created Period ID: $periodId in DRAFT"

# Update to CONFIRMED
$updateBody = @{ status = "CONFIRMED" } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:8080/api/stores/$storeId/payroll/$periodId/status" -Method Put -Body $updateBody -Headers $headers | Out-Null
Write-Host "Period changed to CONFIRMED"

# Try regenerate
try {
    Invoke-RestMethod -Uri "http://localhost:8080/api/stores/$storeId/payroll/generate" -Method Post -Body $genBody -Headers $headers | Out-Null
    Write-Host "ERROR: Regenerate succeeded! It should have failed!"
} catch {
    Write-Host "EXPECTED ERROR RE-GENERATE: $($_.Exception.Message)"
    Write-Host "Response Body: $( [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream()).ReadToEnd() )"
}

Write-Host "
---- TEST 2: Modify assignment in LOCKED period ----"
# We need a shift and assignment in 2027-03-05
$shiftBody = @{
    shiftDate = "2027-03-05"
    startTime = "08:00"
    endTime = "12:00"
    minStaff = 1
    maxStaff = 5
} | ConvertTo-Json
try {
    $shift = Invoke-RestMethod -Uri "http://localhost:8080/api/stores/$storeId/shifts" -Method Post -Body $shiftBody -Headers $headers | Out-Null
} catch {
    Write-Host "EXPECTED ERROR CREATING SHIFT IN LOCKED PERIOD: $($_.Exception.Message)"
    Write-Host "Response Body: $( [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream()).ReadToEnd() )"
}

Write-Host "
---- TEST 3: Modify assignment OUTSIDE LOCKED period (next month) ----"
$shiftBody2 = @{
    shiftDate = "2027-04-05"
    startTime = "08:00"
    endTime = "12:00"
    minStaff = 1
    maxStaff = 5
} | ConvertTo-Json
try {
    $shift2 = Invoke-RestMethod -Uri "http://localhost:8080/api/stores/$storeId/shifts" -Method Post -Body $shiftBody2 -Headers $headers
    Write-Host "SUCCESS: Shift created successfully in unlocked period! ID: $($shift2.id)"
} catch {
    Write-Host "UNEXPECTED ERROR: $($_.Exception.Message)"
    Write-Host "Response Body: $( [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream()).ReadToEnd() )"
}

Write-Host "
---- TEST 4: Try invalid state transitions ----"
Write-Host "Trying to change CONFIRMED -> DRAFT"
try {
    $updateBody2 = @{ status = "DRAFT" } | ConvertTo-Json
    Invoke-RestMethod -Uri "http://localhost:8080/api/stores/$storeId/payroll/$periodId/status" -Method Put -Body $updateBody2 -Headers $headers | Out-Null
} catch {
    Write-Host "EXPECTED ERROR (CONFIRMED->DRAFT): $($_.Exception.Message)"
    Write-Host "Response Body: $( [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream()).ReadToEnd() )"
}

Write-Host "Trying to change CONFIRMED -> PAID (Valid)"
$updateBody3 = @{ status = "PAID" } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:8080/api/stores/$storeId/payroll/$periodId/status" -Method Put -Body $updateBody3 -Headers $headers | Out-Null
Write-Host "Successfully changed to PAID"

Write-Host "Trying to change PAID -> CONFIRMED"
try {
    $updateBody4 = @{ status = "CONFIRMED" } | ConvertTo-Json
    Invoke-RestMethod -Uri "http://localhost:8080/api/stores/$storeId/payroll/$periodId/status" -Method Put -Body $updateBody4 -Headers $headers | Out-Null
} catch {
    Write-Host "EXPECTED ERROR (PAID->CONFIRMED): $($_.Exception.Message)"
    Write-Host "Response Body: $( [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream()).ReadToEnd() )"
}

