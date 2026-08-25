$file = "test_workforce.py"
$content = Get-Content $file -Raw
$content = $content -replace "INSERT INTO skill", "-- INSERT INTO skill"
$content = $content -replace "INSERT INTO staff_skill", "-- INSERT INTO staff_skill"
$content = $content -replace "('{uuid.uuid4()}', '{s_id}', '{s_id}',", "('{uuid.uuid4()}', '{s_id}', '{global_skill}',"
$content = $content -replace "def create_shift", "global_skill = str(uuid.uuid4())`n    run_sql(f`"INSERT INTO skill (id, store_id, name, description) VALUES ('{global_skill}', '{store_a}', 'Skill_Workforce', 'S') ON CONFLICT DO NOTHING;`")`n    run_sql(f`"INSERT INTO staff_skill (staff_id, skill_id) VALUES ('{staff_b}', '{global_skill}') ON CONFLICT DO NOTHING;`")`n    def create_shift"
Set-Content -Path $file -Value $content
