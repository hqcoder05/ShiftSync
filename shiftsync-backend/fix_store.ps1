$file = "test_workforce.py"
$content = Get-Content $file -Raw
$content = $content -replace "address, timezone", "address"
$content = $content -replace "'Address', 'UTC'", "'Address'"
Set-Content -Path $file -Value $content
