$file = "test_workforce.py"
$content = Get-Content $file -Raw
$content = $content -replace "INSERT INTO `"user`"", "INSERT INTO users"
Set-Content -Path $file -Value $content
