$loginBody = '{"email":"manager@shiftsync.com","password":"password123"}'
$loginRes = Invoke-RestMethod -Uri "http://localhost:8080/api/auth/login" -Method Post -ContentType "application/json" -Body $loginBody
$token = $loginRes.accessToken

curl.exe -s -w "\nStatus: %{http_code}" -X POST -H "Authorization: Bearer $token" -H "Content-Type: application/json" -d '{\"staffId\":\"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa\"}' http://localhost:8080/api/stores/11111111-1111-1111-1111-111111111111/shifts/a0d2a381-7957-481d-b86a-2703f734c9e8/assignments
