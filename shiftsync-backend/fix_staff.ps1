$file = "test_workforce.py"
$content = Get-Content $file -Raw
$content = $content -replace "INSERT INTO users", "INSERT INTO staff"
Set-Content -Path $file -Value $content
