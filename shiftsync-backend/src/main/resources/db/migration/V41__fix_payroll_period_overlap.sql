-- V41__fix_payroll_period_overlap.sql

DELETE FROM payroll WHERE payroll_period_id IN (
  SELECT p1.id FROM payroll_period p1
  JOIN payroll_period p2 ON p1.store_id = p2.store_id AND p1.id > p2.id
  WHERE p1.start_date <= p2.end_date AND p1.end_date >= p2.start_date
);

DELETE FROM payroll_period p1
USING payroll_period p2
WHERE p1.store_id = p2.store_id AND p1.id > p2.id
AND p1.start_date <= p2.end_date AND p1.end_date >= p2.start_date;

CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- The range is inclusive on both ends ('[]'), meaning [01, 15] and [16, 30] would overlap if not careful.
-- Wait, if they are '[]' then [01, 15] and [16, 30] DO NOT overlap. 15 and 16 are discrete!
-- But wait, daterange natively treats '[]' as '[)', so [01, 15] is internally [01, 16).
-- Wait, '[]' means both inclusive. So [2026-01-01, 2026-01-15] and [2026-01-16, 2026-01-31] DO NOT OVERLAP because they do not share any discrete date.
ALTER TABLE payroll_period ADD CONSTRAINT chk_no_overlap 
EXCLUDE USING gist (
    store_id WITH =, 
    daterange(start_date, end_date, '[]') WITH &&
);
