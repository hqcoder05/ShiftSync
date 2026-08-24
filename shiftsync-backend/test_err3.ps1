$ErrorActionPreference = 'Stop'

function Get-Token {
    param ($email)
    $body = @{ email = $email; password = 'password123' } | ConvertTo-Json
    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/auth/login" -Method Post -Body $body -ContentType "application/json"
    return $response.accessToken
}

$managerToken = Get-Token "manager@shiftsync.com"
$storeId = "11111111-1111-1111-1111-111111111111"
$reqBody = @( @{ skillId = "22222222-2222-2222-2222-222222222222"; requiredCount = 1 } ) | ConvertTo-Json

# Just create a shift directly to test the requirements endpoint
$shiftBody = @{
    shiftDate = "2026-09-02"
    startTime = "08:00:00"
    endTime = "12:00:00"
} | ConvertTo-Json
$shift = Invoke-RestMethod -Uri "http://localhost:8080/api/stores/$storeId/shifts" -Method Post -Headers @{Authorization="Bearer $managerToken"} -Body $shiftBody -ContentType "application/json"

try {
    Invoke-RestMethod -Uri "http://localhost:8080/api/stores/$storeId/shifts/$($shift.id)/requirements" -Method Put -Headers @{Authorization="Bearer $managerToken"} -Body $reqBody -ContentType "application/json"
} catch {
    Write-Host "Code: $($_.Exception.Response.StatusCode)"
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    Write-Host "Response: $($reader.ReadToEnd())"
}
