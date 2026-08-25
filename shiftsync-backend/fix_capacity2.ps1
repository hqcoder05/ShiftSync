$file = "test_workforce.py"
$content = Get-Content $file -Raw
$content = $content -replace "INSERT INTO skill \(id, name, description\) VALUES", "INSERT INTO skill (id, store_id, name, description) VALUES ('{s_id}', '{store_a}',"
Set-Content -Path $file -Value $content
