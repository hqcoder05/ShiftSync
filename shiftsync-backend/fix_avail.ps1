$file = "test_workforce.py"
$content = Get-Content $file -Raw
$content = $content -replace "INSERT INTO default_availability", "INSERT INTO availability"
Set-Content -Path $file -Value $content
