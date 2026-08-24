$ErrorActionPreference = 'Continue'
function Get-Token {
    param ($email)
    $body = @{ email = $email; password = 'password123' } | ConvertTo-Json
    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/auth/login" -Method Post -Body $body -ContentType "application/json"
    return $response.accessToken
}

$adminToken = Get-Token "admin@shiftsync.com"
$headers = @{ Authorization = "Bearer $adminToken"; "Content-Type" = "application/json" }

# Get a store ID
$stores = Invoke-RestMethod -Uri "http://localhost:8080/api/stores" -Method Get -Headers $headers
$storeId = $stores.content[0].id

Write-Host "Store ID: $storeId"

Write-Host "---- TEST 1: Generate Payroll (creates Period in DRAFT), change to CONFIRMED, then regenerate ----"
$startDate = "2027-01-01"
$endDate = "2027-01-15"
$genBody = @{ startDate = $startDate; endDate = $endDate } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:8080/api/stores/$storeId/payroll/generate" -Method Post -Body $genBody -Headers $headers

# Get the periods
$periods = Invoke-RestMethod -Uri "http://localhost:8080/api/stores/$storeId/payroll" -Method Get -Headers $headers
$periodId = ($periods | Where-Object { $_.startDate -eq $startDate }).id
Write-Host "Period ID: $periodId"

# Update to CONFIRMED
$updateBody = @{ status = "CONFIRMED" } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:8080/api/stores/$storeId/payroll/$periodId/status" -Method Put -Body $updateBody -Headers $headers
Write-Host "Period changed to CONFIRMED"

# Try regenerate
try {
    Invoke-RestMethod -Uri "http://localhost:8080/api/stores/$storeId/payroll/generate" -Method Post -Body $genBody -Headers $headers
} catch {
    Write-Host "EXPECTED ERROR: $($_.Exception.Message)"
    Write-Host "Response Body: $( [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream()).ReadToEnd() )"
}

Write-Host "
---- TEST 2: Modify assignment in LOCKED period ----"
# We need a shift and assignment in 2027-01-05
$shiftBody = @{
    shiftDate = "2027-01-05"
    startTime = "08:00"
    endTime = "12:00"
    minStaff = 1
    maxStaff = 5
} | ConvertTo-Json
try {
    $shift = Invoke-RestMethod -Uri "http://localhost:8080/api/stores/$storeId/shifts" -Method Post -Body $shiftBody -Headers $headers
} catch {
    Write-Host "EXPECTED ERROR CREATING SHIFT IN LOCKED PERIOD: $($_.Exception.Message)"
    Write-Host "Response Body: $( [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream()).ReadToEnd() )"
}

Write-Host "
---- TEST 3: Modify assignment OUTSIDE LOCKED period (next month) ----"
$shiftBody2 = @{
    shiftDate = "2027-02-05"
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
    Invoke-RestMethod -Uri "http://localhost:8080/api/stores/$storeId/payroll/$periodId/status" -Method Put -Body $updateBody2 -Headers $headers
} catch {
    Write-Host "EXPECTED ERROR (CONFIRMED->DRAFT): $($_.Exception.Message)"
    Write-Host "Response Body: $( [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream()).ReadToEnd() )"
}

Write-Host "Trying to change CONFIRMED -> PAID (Valid)"
$updateBody3 = @{ status = "PAID" } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:8080/api/stores/$storeId/payroll/$periodId/status" -Method Put -Body $updateBody3 -Headers $headers
Write-Host "Successfully changed to PAID"

Write-Host "Trying to change PAID -> CONFIRMED"
try {
    $updateBody4 = @{ status = "CONFIRMED" } | ConvertTo-Json
    Invoke-RestMethod -Uri "http://localhost:8080/api/stores/$storeId/payroll/$periodId/status" -Method Put -Body $updateBody4 -Headers $headers
} catch {
    Write-Host "EXPECTED ERROR (PAID->CONFIRMED): $($_.Exception.Message)"
    Write-Host "Response Body: $( [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream()).ReadToEnd() )"
}

