$file = "test_workforce.py"
$content = Get-Content $file -Raw
$content = $content -replace "Skill_Workforce_Test", "Skill_Workforce_RBAC"
Set-Content -Path $file -Value $content
