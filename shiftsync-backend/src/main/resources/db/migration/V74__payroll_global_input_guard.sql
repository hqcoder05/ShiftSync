-- A transaction-level serialization point shared by holiday writes and payroll
-- generation/confirmation. Incrementing the row also detects stale snapshots.
CREATE TABLE payroll_global_input_guard (id SMALLINT PRIMARY KEY CHECK (id = 1), version BIGINT NOT NULL DEFAULT 0);
INSERT INTO payroll_global_input_guard(id) VALUES (1);
