while(!(Test-NetConnection -ComputerName localhost -Port 8080 -InformationLevel Quiet)) { Start-Sleep -Seconds 1 }

$body = @{ email = "manager@shiftsync.com"; password = "password123" } | ConvertTo-Json
$response = Invoke-RestMethod -Uri "http://localhost:8080/api/auth/login" -Method Post -Body $body -ContentType "application/json"
$token = $response.accessToken

$req = @{ startDate = "2026-08-25"; endDate = "2026-08-31" } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:8080/api/stores/11111111-1111-1111-1111-111111111111/shifts/auto-schedule" -Method Post -Body $req -ContentType "application/json" -Headers @{Authorization="Bearer $token"}

Start-Sleep -Seconds 2
docker exec shiftsync-db psql -U postgres -d shiftsync -c "SELECT s.full_name, sa.source FROM shift_assignment sa JOIN staff s ON sa.staff_id = s.id WHERE sa.shift_id = '99999999-9999-9999-9999-999999999999';"
