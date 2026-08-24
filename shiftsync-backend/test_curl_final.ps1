$ProgressPreference = 'SilentlyContinue'
$loginBody = '{"email":"manager@shiftsync.com","password":"password123"}'
$loginRes = Invoke-RestMethod -Uri "http://localhost:8080/api/auth/login" -Method Post -ContentType "application/json" -Body $loginBody
$token = $loginRes.accessToken
$headers = @{ "Authorization" = "Bearer $token" }

function Test-Api {
    param($Name, $Uri, $Method, $Body)
    Write-Output "
--- $Name ---"
    try {
        if ($Body) {
            $res = Invoke-WebRequest -Uri $Uri -Method $Method -Headers $headers -Body $Body -ContentType "application/json"
        } else {
            $res = Invoke-WebRequest -Uri $Uri -Method $Method -Headers $headers
        }
        Write-Output "Status: $($res.StatusCode)"
        Write-Output $res.Content
    } catch {
        $exResponse = $_.Exception.Response
        if ($exResponse) {
            Write-Output "Status: $($exResponse.StatusCode)"
            $reader = New-Object System.IO.StreamReader($exResponse.GetResponseStream())
            Write-Output $reader.ReadToEnd()
        } else {
            Write-Output $_.Exception.Message
        }
    }
}

Test-Api "1. Marketplace Controller" "http://localhost:8080/api/stores/11111111-1111-1111-1111-111111111111/marketplace/shifts" "Get"
Test-Api "2. Payroll Controller" "http://localhost:8080/api/payroll/periods" "Get"
Test-Api "3. ShiftSwap Controller" "http://localhost:8080/api/swap/requests" "Post" '{"fromShiftId":"99999999-9999-9999-9999-999999999999","toStaffId":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","reason":"Sick leave"}'
Test-Api "4. Scheduler Configuration Controller" "http://localhost:8080/api/stores/11111111-1111-1111-1111-111111111111/scheduler-config" "Put" '{"priorityWeight":1,"skillLevelWeight":1,"workingHoursWeight":1,"restTimeWeight":1,"fairnessWeight":1,"maxWeeklyHours":40,"minRestHours":11}'
Test-Api "5. Attendance Controller" "http://localhost:8080/api/attendance/scan" "Post" '{"qrToken":"test-token","latitude":10.0,"longitude":10.0}'

