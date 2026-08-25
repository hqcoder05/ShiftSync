$file = "test_workforce.py"
$content = Get-Content $file -Raw
$content = $content -replace "global_skill = str\(uuid.uuid4\(\)\)", "global_skill = '99999999-9999-9999-9999-999999999999'"
Set-Content -Path $file -Value $content
