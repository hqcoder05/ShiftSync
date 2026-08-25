$file = "test_workforce.py"
$content = Get-Content $file -Raw
$content = $content -replace "VALUES \('{s_id}', '{store_a}', '{s_id}',", "VALUES ('{s_id}', '{store_a}',"
Set-Content -Path $file -Value $content
