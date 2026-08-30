CREATE TABLE contract_type (
    id UUID PRIMARY KEY,
    store_id UUID NOT NULL REFERENCES store(id),
    name VARCHAR(255) NOT NULL,
    max_weekly_hours INT NOT NULL,
    ot_multiplier NUMERIC(10,2) NOT NULL,
    default_hourly_rate NUMERIC(10,2) NOT NULL
);

-- Insert contract types for each store based on the hardcoded logic
INSERT INTO contract_type (id, store_id, name, max_weekly_hours, ot_multiplier, default_hourly_rate)
SELECT gen_random_uuid(), id, 'FULL_TIME', 48, 1.5, 20.0
FROM store;

INSERT INTO contract_type (id, store_id, name, max_weekly_hours, ot_multiplier, default_hourly_rate)
SELECT gen_random_uuid(), id, 'PART_TIME', 24, 1.5, 15.0
FROM store;

INSERT INTO contract_type (id, store_id, name, max_weekly_hours, ot_multiplier, default_hourly_rate)
SELECT gen_random_uuid(), id, 'SEASONAL', 40, 1.5, 18.0
FROM store;

INSERT INTO contract_type (id, store_id, name, max_weekly_hours, ot_multiplier, default_hourly_rate)
SELECT gen_random_uuid(), id, 'INTERN', 20, 1.5, 10.0
FROM store;

-- Add contract_type_id column to employment
ALTER TABLE employment ADD COLUMN contract_type_id UUID;

-- Map existing employment records to the new contract_type table
UPDATE employment e
SET contract_type_id = ct.id
FROM contract_type ct
WHERE e.store_id = ct.store_id AND e.employment_type::VARCHAR = ct.name;

-- Now make it NOT NULL
ALTER TABLE employment ALTER COLUMN contract_type_id SET NOT NULL;
ALTER TABLE employment ADD CONSTRAINT fk_employment_contract_type FOREIGN KEY (contract_type_id) REFERENCES contract_type(id);
