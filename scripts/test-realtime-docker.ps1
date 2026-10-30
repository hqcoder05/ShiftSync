param(
    [string]$BaseUrl = 'http://127.0.0.1:58080',
    [string]$Email = 'manager.demo@shiftsync.local',
    [string]$Password = 'password123'
)

$ErrorActionPreference = 'Stop'
$storeId = 'd0000000-0000-0000-0000-000000000001'
$shiftId = 'd0000000-0000-0000-0000-000000000104'
$staffId = 'd0000000-0000-0000-0000-000000000012'
$zoneId = 'd0000000-0000-0000-0000-000000000081'
$attendanceId = 'd0000000-0000-0000-0000-000000000132'
$attendanceCheckIn = '2026-10-25T03:54:13.270284Z'

function Send-StompFrame([System.Net.WebSockets.ClientWebSocket]$socket, [string]$frame) {
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($frame + [char]0)
    [void]$socket.SendAsync([ArraySegment[byte]]::new($bytes), [System.Net.WebSockets.WebSocketMessageType]::Text, $true, [Threading.CancellationToken]::None).GetAwaiter().GetResult()
}

function Receive-StompFrame([System.Net.WebSockets.ClientWebSocket]$socket) {
    $buffer = [byte[]]::new(16384)
    $segment = [ArraySegment[byte]]::new($buffer)
    $result = $socket.ReceiveAsync($segment, [Threading.CancellationToken]::None).GetAwaiter().GetResult()
    if ($result.MessageType -eq [System.Net.WebSockets.WebSocketMessageType]::Close) {
        throw 'STOMP socket closed unexpectedly.'
    }
    return [System.Text.Encoding]::UTF8.GetString($buffer, 0, $result.Count)
}

function Connect-And-Subscribe([string]$token) {
    $socket = [System.Net.WebSockets.ClientWebSocket]::new()
    $socketUri = [Uri](($BaseUrl -replace '^http', 'ws') + '/ws/websocket')
    [void]$socket.ConnectAsync($socketUri, [Threading.CancellationToken]::None).GetAwaiter().GetResult()
    Send-StompFrame $socket "CONNECT`naccept-version:1.2`nAuthorization:Bearer $token`n`n"
    $connected = Receive-StompFrame $socket
    if (-not $connected.StartsWith('CONNECTED')) { throw "Expected CONNECTED, got: $connected" }
    Send-StompFrame $socket "SUBSCRIBE`nid:shifts`ndestination:/topic/store/$storeId/shifts`nack:auto`n`n"
    Send-StompFrame $socket "SUBSCRIBE`nid:attendance`ndestination:/topic/store/$storeId/attendance`nack:auto`n`n"
    Write-Output $socket
}

$login = Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/auth/login" -ContentType 'application/json' -Body (@{ email = $Email; password = $Password } | ConvertTo-Json -Compress)
$headers = @{ Authorization = "Bearer $($login.accessToken)" }
$socket = $null
$assigned = $false

try {
    $socket = Connect-And-Subscribe $login.accessToken
    # The fixture's tomorrow date can map to a deliberately unavailable weekday.
    # Force is restricted to this disposable environment; the test asserts realtime delivery, not eligibility.
    $assignment = Invoke-RestMethod -Method Post -Headers $headers -ContentType 'application/json' -Uri "$BaseUrl/api/stores/$storeId/shifts/$shiftId/assignments" -Body (@{ staffId = $staffId; zoneId = $zoneId; force = $true } | ConvertTo-Json -Compress)
    $assigned = $true
    $createdEvent = Receive-StompFrame $socket
    if ($createdEvent -notmatch 'ASSIGNMENT_CREATED') { throw "Expected ASSIGNMENT_CREATED, got: $createdEvent" }

    [void]$socket.CloseAsync([System.Net.WebSockets.WebSocketCloseStatus]::NormalClosure, 'reconnect-check', [Threading.CancellationToken]::None).GetAwaiter().GetResult()
    $socket.Dispose()
    $socket = Connect-And-Subscribe $login.accessToken

    Invoke-RestMethod -Method Delete -Headers $headers -Uri "$BaseUrl/api/stores/$storeId/shifts/$shiftId/assignments/$staffId" | Out-Null
    $assigned = $false
    $removedEvent = Receive-StompFrame $socket
    if ($removedEvent -notmatch 'ASSIGNMENT_REMOVED') { throw "Expected ASSIGNMENT_REMOVED after reconnect, got: $removedEvent" }

    # Keep the seeded timestamp unchanged: this verifies the real attendance
    # event path without altering operational fixture data.
    Invoke-RestMethod -Method Put -Headers $headers -ContentType 'application/json' -Uri "$BaseUrl/api/stores/$storeId/attendance/$attendanceId" -Body (@{ checkInTime = $attendanceCheckIn } | ConvertTo-Json -Compress) | Out-Null
    $attendanceEvent = Receive-StompFrame $socket
    if ($attendanceEvent -notmatch '"action":"UPDATE"' -or $attendanceEvent -notmatch '"zoneId":"d0000000-0000-0000-0000-000000000081"') {
        throw "Expected attendance UPDATE with zoneId, got: $attendanceEvent"
    }

    [pscustomobject]@{
        storeId = $storeId
        initialConnection = 'CONNECTED + SUBSCRIBED'
        createdAction = 'ASSIGNMENT_CREATED'
        reconnect = 'CONNECTED + SUBSCRIBED'
        removedAction = 'ASSIGNMENT_REMOVED'
        attendanceAction = 'UPDATE with zoneId'
        dataRestored = $true
    } | ConvertTo-Json
}
finally {
    if ($assigned) {
        try { Invoke-RestMethod -Method Delete -Headers $headers -Uri "$BaseUrl/api/stores/$storeId/shifts/$shiftId/assignments/$staffId" | Out-Null } catch { Write-Warning "Could not restore disposable assignment: $($_.Exception.Message)" }
    }
    if ($null -ne $socket) { $socket.Dispose() }
}
