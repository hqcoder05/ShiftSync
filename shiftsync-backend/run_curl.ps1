$loginBody = '{"email":"manager@shiftsync.com","password":"password123"}'
$loginRes = Invoke-RestMethod -Uri "http://localhost:8080/api/auth/login" -Method Post -ContentType "application/json" -Body $loginBody
$token = $loginRes.accessToken

Write-Output "
--- 1. Marketplace Controller ---"
curl.exe -s -w "\nStatus: %{http_code}" -H "Authorization: Bearer $token" http://localhost:8080/api/stores/11111111-1111-1111-1111-111111111111/marketplace/shifts

Write-Output "

--- 2. Payroll Controller ---"
curl.exe -s -w "\nStatus: %{http_code}" -H "Authorization: Bearer $token" http://localhost:8080/api/payroll/periods

Write-Output "

--- 3. ShiftSwap Controller ---"
curl.exe -s -w "\nStatus: %{http_code}" -X POST -H "Authorization: Bearer $token" -H "Content-Type: application/json" -d '{"fromShiftId":"99999999-9999-9999-9999-999999999999","toStaffId":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","reason":"Sick leave"}' http://localhost:8080/api/swap/requests

Write-Output "

--- 4. Scheduler Configuration Controller ---"
curl.exe -s -w "\nStatus: %{http_code}" -X PUT -H "Authorization: Bearer $token" -H "Content-Type: application/json" -d '{"priorityWeight":1,"skillLevelWeight":1,"workingHoursWeight":1,"restTimeWeight":1,"fairnessWeight":1,"maxWeeklyHours":40,"minRestHours":11}' http://localhost:8080/api/stores/11111111-1111-1111-1111-111111111111/scheduler-config

Write-Output "

--- 5. Attendance Controller ---"
curl.exe -s -w "\nStatus: %{http_code}" -X POST -H "Authorization: Bearer $token" -H "Content-Type: application/json" -d '{"qrToken":"test-token","latitude":10.0,"longitude":10.0}' http://localhost:8080/api/attendance/scan
