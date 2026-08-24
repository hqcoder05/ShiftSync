$ErrorActionPreference = 'Stop'
function Get-Token {
    param ($email)
    $body = @{ email = $email; password = 'password123' } | ConvertTo-Json
    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/auth/login" -Method Post -Body $body -ContentType "application/json"
    return $response.accessToken
}
$managerToken = Get-Token "manager@shiftsync.com"
$storeId = "11111111-1111-1111-1111-111111111111"
$staffId = "22222222-2222-2222-2222-222222222222"

$shift1Body = @{
    shiftDate = "2026-09-08"
    startTime = "08:00:00"
    endTime = "12:00:00"
} | ConvertTo-Json
$shift1 = Invoke-RestMethod -Uri "http://localhost:8080/api/stores/$storeId/shifts" -Method Post -Headers @{Authorization="Bearer $managerToken"} -Body $shift1Body -ContentType "application/json"
Write-Host "Created shift: $($shift1.id)"

$reqBody = '[{"skillId":"22222222-2222-2222-2222-222222222222","requiredCount":1}]'
Invoke-RestMethod -Uri "http://localhost:8080/api/stores/$storeId/shifts/$($shift1.id)/requirements" -Method Put -Headers @{Authorization="Bearer $managerToken"} -Body $reqBody -ContentType "application/json" | Out-Null

$publishBody = @{ startDate = "2026-09-08"; endDate = "2026-09-08" } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:8080/api/stores/$storeId/shifts/publish" -Method Post -Headers @{Authorization="Bearer $managerToken"} -Body $publishBody -ContentType "application/json" | Out-Null
Write-Host "Published shift"

try {
    $assignBody = @{ staffId = $staffId } | ConvertTo-Json
    Invoke-RestMethod -Uri "http://localhost:8080/api/stores/$storeId/shifts/$($shift1.id)/assignments" -Method Post -Headers @{Authorization="Bearer $managerToken"} -Body $assignBody -ContentType "application/json" | Out-Null
    Write-Host "Assigned successfully"
} catch {
    Write-Host "Code: $($_.Exception.Response.StatusCode)"
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    Write-Host "Response: $($reader.ReadToEnd())"
}
