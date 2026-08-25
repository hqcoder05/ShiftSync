$file = "test_workforce.py"
$content = Get-Content $file -Raw
$content = $content -replace "get_token_by_id\(.*, `"(.*)`"\)", "get_token(`"`$1`")"
Set-Content -Path $file -Value $content
