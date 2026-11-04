-- Force a row version change when locking payroll so serializable writers that
-- started before confirmation cannot continue with an obsolete snapshot.
ALTER TABLE store ADD COLUMN payroll_lock_version BIGINT NOT NULL DEFAULT 0;
