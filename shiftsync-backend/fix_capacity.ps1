$file = "test_workforce.py"
$content = Get-Content $file -Raw
$new_insert = "
        run_sql(f`"INSERT INTO skill (id, name, description) VALUES ('{s_id}', 'Skill', 'S') ON CONFLICT DO NOTHING;`")
        run_sql(f`"INSERT INTO shift_skill_requirement (id, shift_id, skill_id, required_count) VALUES ('{uuid.uuid4()}', '{s_id}', '{s_id}', 2);`")
        run_sql(f`"INSERT INTO staff_skill (staff_id, skill_id) VALUES ('{staff_b}', '{s_id}') ON CONFLICT DO NOTHING;`")
"
$content = $content -replace "return s_id", "$new_insert        return s_id"
Set-Content -Path $file -Value $content
