$file = "test_workforce.py"
$content = Get-Content $file -Raw
$content = $content -replace "-- INSERT INTO skill", "INSERT INTO skill"
$content = $content -replace "-- INSERT INTO staff_skill", "INSERT INTO staff_skill"
Set-Content -Path $file -Value $content
