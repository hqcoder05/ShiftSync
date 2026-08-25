$file = "test_workforce.py"
$content = Get-Content $file -Raw
$content = $content -replace "status\)", "status, availability_deadline)"
$content = $content -replace "'PUBLISHED'\);", "'PUBLISHED', '2026-08-31 00:00:00');"
$content = $content -replace "INSERT INTO default_availability", "-- INSERT INTO default_availability"
Set-Content -Path $file -Value $content
