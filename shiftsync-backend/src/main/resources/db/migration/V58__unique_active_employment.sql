-- Do not select a winning contract automatically: duplicates may have different
-- rates or dates and require an administrator to reconcile them first.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM employment WHERE status = 'ACTIVE'
               GROUP BY staff_id, store_id HAVING count(*) > 1) THEN
        RAISE EXCEPTION 'Không thể nâng cấp: có quan hệ làm việc ACTIVE trùng. Hãy đối soát employment theo staff_id, store_id trước khi chạy lại migration V58.';
    END IF;
END $$;

CREATE UNIQUE INDEX uq_employment_active_staff_store
    ON employment (staff_id, store_id) WHERE status = 'ACTIVE';
