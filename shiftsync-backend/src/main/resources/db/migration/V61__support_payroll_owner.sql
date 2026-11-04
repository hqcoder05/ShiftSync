ALTER TABLE shift_assignment ADD COLUMN support_employment_id UUID REFERENCES employment(id);

-- Past accepted proposals identify the home store. Do not guess when multiple
-- proposals or overlapping employment episodes match an assignment.
DO $$
BEGIN
  IF EXISTS (
    SELECT a.id FROM shift_assignment a
    JOIN workforce_request r ON r.shift_id = a.shift_id
    JOIN workforce_proposal p ON p.workforce_request_id = r.id AND p.staff_id = a.staff_id AND p.status = 'ACCEPTED'
    LEFT JOIN employment e ON e.staff_id = a.staff_id AND e.store_id = r.target_store_id
      AND e.joined_date <= (SELECT shift_date FROM shift WHERE id=a.shift_id)
      AND (e.left_date IS NULL OR e.left_date >= (SELECT shift_date FROM shift WHERE id=a.shift_id))
    WHERE a.source IN ('MANUAL','WORKFORCE_SHARING')
    GROUP BY a.id HAVING count(DISTINCT p.id) <> 1 OR count(DISTINCT e.id) <> 1
  ) THEN
    RAISE EXCEPTION 'Không thể nâng cấp: phân công hỗ trợ có nhiều hoặc thiếu hợp đồng nguồn. Hãy đối soát workforce_proposal và employment trước khi chạy lại V61.';
  END IF;
END $$;

UPDATE shift_assignment a SET support_employment_id = matched.employment_id, source = 'WORKFORCE_SHARING'
FROM (
    SELECT a2.id AS assignment_id, (array_agg(DISTINCT e.id))[1] AS employment_id
    FROM shift_assignment a2
    JOIN shift s ON s.id=a2.shift_id
    JOIN workforce_request r ON r.shift_id=a2.shift_id
    JOIN workforce_proposal p ON p.workforce_request_id=r.id AND p.staff_id=a2.staff_id AND p.status='ACCEPTED'
    JOIN employment e ON e.staff_id=a2.staff_id AND e.store_id=r.target_store_id
      AND e.joined_date <= s.shift_date AND (e.left_date IS NULL OR e.left_date >= s.shift_date)
    WHERE a2.source IN ('MANUAL','WORKFORCE_SHARING')
    GROUP BY a2.id
) matched WHERE a.id=matched.assignment_id;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM shift_assignment WHERE source='WORKFORCE_SHARING' AND support_employment_id IS NULL) THEN
    RAISE EXCEPTION 'Không thể nâng cấp: phân công hỗ trợ chưa xác định được hợp đồng nguồn. Hãy đối soát trước khi chạy lại V61.';
  END IF;
END $$;

ALTER TABLE shift_assignment ADD CONSTRAINT chk_support_employment_source
  CHECK ((source='WORKFORCE_SHARING') = (support_employment_id IS NOT NULL));
CREATE INDEX idx_shift_assignment_support_employment ON shift_assignment(support_employment_id) WHERE support_employment_id IS NOT NULL;
