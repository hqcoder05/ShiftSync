-- Existing drafts must be recalculated before confirmation; do not infer a
-- generation time from potentially incomplete or missing payslips.
ALTER TABLE payroll_period ADD COLUMN last_generated_at TIMESTAMPTZ;
