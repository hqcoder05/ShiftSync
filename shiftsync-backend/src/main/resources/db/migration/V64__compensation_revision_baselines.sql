-- These baselines describe the state observed at migration, not earlier rates.
-- Historical days before this date require reconciliation.
INSERT INTO payroll_effective_revision(id, entity_type, entity_id, effective_date, values_json)
SELECT gen_random_uuid(), 'employment', e.id, (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date,
       jsonb_build_object('contractTypeId', e.contract_type_id, 'hourlyRate', e.hourly_rate)
FROM employment e
ON CONFLICT (entity_type, entity_id, effective_date) DO NOTHING;

INSERT INTO payroll_effective_revision(id, entity_type, entity_id, effective_date, values_json)
SELECT gen_random_uuid(), 'contract_type', c.id, (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date,
       jsonb_build_object('defaultHourlyRate', c.default_hourly_rate, 'maxWeeklyHours', c.max_weekly_hours,
                          'otMultiplier', c.ot_multiplier)
FROM contract_type c
ON CONFLICT (entity_type, entity_id, effective_date) DO NOTHING;

INSERT INTO payroll_effective_revision(id, entity_type, entity_id, effective_date, values_json)
SELECT gen_random_uuid(), 'skill', s.id, (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date,
       jsonb_build_object('hourlyRate', s.hourly_rate)
FROM skill s
ON CONFLICT (entity_type, entity_id, effective_date) DO NOTHING;
