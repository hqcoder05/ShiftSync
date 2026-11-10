$ErrorActionPreference = 'Stop'
$principal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (!$principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    throw 'Windows cần quyền Administrator. Mở PowerShell bằng Run as administrator rồi chạy lại script này.'
}
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$demo = Get-Content -LiteralPath (Join-Path $projectRoot '.expo\lan-demo-env.json') -Raw | ConvertFrom-Json
$endpoint = [Uri]$demo.EXPO_PUBLIC_API_URL
$ip = $endpoint.Host
if ($demo.EXPO_PUBLIC_DEMO_MODE -ne 'lan' -or $endpoint.Port -ne 8080 -or $ip -notmatch '^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.)') { throw 'Unexpected demo configuration.' }
$network = @(Get-NetIPConfiguration | Where-Object { $_.IPv4Address.IPAddress -contains $ip -and $_.IPv4DefaultGateway })
if ($network.Count -ne 1) { throw 'IP demo không còn khớp mạng hiện tại. Chạy npm run demo:lan:prepare trước.' }
$name = 'ShiftSync-Demo-LAN-8080'
$display = 'ShiftSync Demo - LAN backend 8080'
$existing = Get-NetFirewallRule -Name $name -ErrorAction SilentlyContinue
if ($existing) {
    $filter = $existing | Get-NetFirewallPortFilter
    if ($existing.DisplayName -ne $display -or $existing.Direction -ne 'Inbound' -or $existing.Action -ne 'Allow' -or $filter.LocalPort -ne 8080) { throw 'Existing rule has unexpected settings; no changes made.' }
    Set-NetFirewallRule -Name $name -Enabled True -LocalAddress $ip -RemoteAddress LocalSubnet -InterfaceAlias $network[0].InterfaceAlias -Profile Any | Out-Null
} else {
    New-NetFirewallRule -Name $name -DisplayName $display -Direction Inbound -Action Allow -Protocol TCP -LocalPort 8080 -LocalAddress $ip -RemoteAddress LocalSubnet -InterfaceAlias $network[0].InterfaceAlias -Profile Any -EdgeTraversalPolicy Block | Out-Null
}
Write-Output "Đã cho phép backend 8080 tại $ip, chỉ trong mạng nội bộ trên $($network[0].InterfaceAlias)."
