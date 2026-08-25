import os
import glob
import re

sql_files = glob.glob("*.sql")
for file in sql_files:
    with open(file, "r", encoding="utf-8", errors="ignore") as f:
        content = f.read()
    
    if "INSERT INTO employment" in content:
        # Check if contract_type inserts exist
        if "INSERT INTO contract_type" not in content:
            # We must add them after store is inserted
            store_insert_pattern = re.compile(r"(INSERT INTO store.*?;)", re.IGNORECASE)
            match = store_insert_pattern.search(content)
            if match:
                store_insert = match.group(1)
                
                # We need to extract the store_id from the insert to use it, or just use a select
                contract_type_inserts = """
INSERT INTO contract_type (id, store_id, name, max_weekly_hours, ot_multiplier, default_hourly_rate) VALUES (gen_random_uuid(), (SELECT id FROM store LIMIT 1), 'FULL_TIME', 48, 1.5, 20.0);
INSERT INTO contract_type (id, store_id, name, max_weekly_hours, ot_multiplier, default_hourly_rate) VALUES (gen_random_uuid(), (SELECT id FROM store LIMIT 1), 'PART_TIME', 24, 1.5, 15.0);
INSERT INTO contract_type (id, store_id, name, max_weekly_hours, ot_multiplier, default_hourly_rate) VALUES (gen_random_uuid(), (SELECT id FROM store LIMIT 1), 'SEASONAL', 40, 1.5, 18.0);
INSERT INTO contract_type (id, store_id, name, max_weekly_hours, ot_multiplier, default_hourly_rate) VALUES (gen_random_uuid(), (SELECT id FROM store LIMIT 1), 'INTERN', 20, 1.5, 10.0);
"""
                content = content.replace(store_insert, store_insert + "\n" + contract_type_inserts)
        
        # Replace employment_type with contract_type_id
        content = content.replace("employment_type", "contract_type_id")
        
        # Replace 'FULL_TIME' with (SELECT id FROM contract_type WHERE name='FULL_TIME' LIMIT 1)
        content = re.sub(r"'FULL_TIME'", "(SELECT id FROM contract_type WHERE name='FULL_TIME' LIMIT 1)", content)
        content = re.sub(r"'PART_TIME'", "(SELECT id FROM contract_type WHERE name='PART_TIME' LIMIT 1)", content)
        content = re.sub(r"'SEASONAL'", "(SELECT id FROM contract_type WHERE name='SEASONAL' LIMIT 1)", content)
        content = re.sub(r"'INTERN'", "(SELECT id FROM contract_type WHERE name='INTERN' LIMIT 1)", content)

        with open(file, "w", encoding="utf-8") as f:
            f.write(content)
