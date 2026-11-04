package com.shiftsync.payroll.repository;

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/** Stores dated revisions independently from the immutable change audit. */
@Repository
@RequiredArgsConstructor
public class CompensationRevisionRepository {
    private final JdbcTemplate jdbc;
    private static final String UNTRACKED_FILTER = """
            h.entity_type=? AND h.entity_id=? AND h.operation='UPDATE'
              AND NOT EXISTS (SELECT 1 FROM payroll_untracked_reconciliation m WHERE m.history_id=h.id)
              AND h.recorded_at > COALESCE((SELECT min(r.created_at) FROM payroll_effective_revision r
                    WHERE r.entity_type=h.entity_type AND r.entity_id=h.entity_id), '-infinity'::timestamptz)
              AND CASE h.entity_type
                WHEN 'employment' THEN (h.old_values->'hourly_rate', h.old_values->'contract_type_id') IS DISTINCT FROM (h.new_values->'hourly_rate', h.new_values->'contract_type_id')
                WHEN 'contract_type' THEN (h.old_values->'default_hourly_rate', h.old_values->'max_weekly_hours', h.old_values->'ot_multiplier') IS DISTINCT FROM (h.new_values->'default_hourly_rate', h.new_values->'max_weekly_hours', h.new_values->'ot_multiplier')
                WHEN 'skill' THEN h.old_values->'hourly_rate' IS DISTINCT FROM h.new_values->'hourly_rate'
                ELSE false END
            """;
    public record UntrackedChange(long historyId, java.time.OffsetDateTime recordedAt, String oldTerms, String newTerms) {}

    public void insert(UUID id, String entityType, UUID entityId, LocalDate effectiveDate,
                       String valuesJson, UUID actorId) {
        int inserted = jdbc.update("""
                INSERT INTO payroll_effective_revision
                    (id, entity_type, entity_id, effective_date, values_json, created_by)
                VALUES (?, ?, ?, ?, CAST(? AS jsonb), ?)
                ON CONFLICT (entity_type, entity_id, effective_date) DO NOTHING
                """, id, entityType, entityId, effectiveDate, valuesJson, actorId);
        if (inserted == 0) {
            throw new com.shiftsync.shared.exception.BusinessException(
                    "Đã có thay đổi lương cho ngày hiệu lực này", org.springframework.http.HttpStatus.CONFLICT);
        }
    }

    public Optional<String> findEffectiveValues(String entityType, UUID entityId, LocalDate date) {
        return jdbc.query("""
                SELECT values_json::text FROM payroll_effective_revision
                WHERE entity_type = ? AND entity_id = ? AND effective_date <= ?
                ORDER BY effective_date DESC LIMIT 1
                """, (rs, row) -> rs.getString(1), entityType, entityId, date).stream().findFirst();
    }

    public Optional<LocalDate> findNextEffectiveDate(String entityType, UUID entityId, LocalDate date) {
        return jdbc.query("""
                SELECT effective_date FROM payroll_effective_revision
                WHERE entity_type = ? AND entity_id = ? AND effective_date > ?
                ORDER BY effective_date LIMIT 1
                """, (rs, row) -> rs.getObject(1, LocalDate.class), entityType, entityId, date)
                .stream().findFirst();
    }

    public Optional<LocalDate> findFirstEffectiveDate(String entityType, UUID entityId) {
        return jdbc.query("SELECT effective_date FROM payroll_effective_revision WHERE entity_type=? AND entity_id=? ORDER BY effective_date LIMIT 1",
                (rs, row) -> rs.getObject(1, LocalDate.class), entityType, entityId).stream().findFirst();
    }

    /** Detect edits made through legacy paths that did not create a dated revision. */
    public boolean hasUntrackedCompensationChange(String entityType, UUID entityId) {
        Boolean changed = jdbc.queryForObject("SELECT EXISTS (SELECT 1 FROM payroll_input_history h WHERE "
                + UNTRACKED_FILTER + ")", Boolean.class, entityType, entityId);
        return Boolean.TRUE.equals(changed);
    }

    public java.util.List<UntrackedChange> findUntrackedChanges(String entityType, UUID entityId) {
        return jdbc.query("""
                SELECT h.id,h.recorded_at,
                    CASE h.entity_type
                      WHEN 'employment' THEN jsonb_build_object('hourlyRate',h.old_values->'hourly_rate','contractTypeId',h.old_values->'contract_type_id')
                      WHEN 'contract_type' THEN jsonb_build_object('defaultHourlyRate',h.old_values->'default_hourly_rate','maxWeeklyHours',h.old_values->'max_weekly_hours','otMultiplier',h.old_values->'ot_multiplier')
                      WHEN 'skill' THEN jsonb_build_object('hourlyRate',h.old_values->'hourly_rate') END::text,
                    CASE h.entity_type
                      WHEN 'employment' THEN jsonb_build_object('hourlyRate',h.new_values->'hourly_rate','contractTypeId',h.new_values->'contract_type_id')
                      WHEN 'contract_type' THEN jsonb_build_object('defaultHourlyRate',h.new_values->'default_hourly_rate','maxWeeklyHours',h.new_values->'max_weekly_hours','otMultiplier',h.new_values->'ot_multiplier')
                      WHEN 'skill' THEN jsonb_build_object('hourlyRate',h.new_values->'hourly_rate') END::text
                FROM payroll_input_history h WHERE """ + " " + UNTRACKED_FILTER + " ORDER BY h.recorded_at,h.id",
                (rs, row) -> new UntrackedChange(rs.getLong(1), rs.getObject(2, java.time.OffsetDateTime.class), rs.getString(3), rs.getString(4)),
                entityType, entityId);
    }
}
