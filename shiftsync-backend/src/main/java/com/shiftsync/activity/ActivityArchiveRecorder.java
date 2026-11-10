package com.shiftsync.activity;

import com.shiftsync.leave.entity.LeaveRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Objects;
import java.util.UUID;

/** Retains real leave events in the same transaction that removes their source row. */
@Service
@RequiredArgsConstructor
public class ActivityArchiveRecorder {
    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private final NamedParameterJdbcTemplate jdbc;

    @Transactional(propagation = Propagation.MANDATORY)
    public void preserveCancelledLeave(LeaveRequest leave, UUID cancelledBy, OffsetDateTime cancelledAt) {
        String dates = leave.getStartDate().format(DATE) + " – " + leave.getEndDate().format(DATE);
        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("staff", leave.getStaff().getId()).addValue("store", leave.getStore().getId())
                .addValue("entity", leave.getId()).addValue("status", leave.getStatus().name())
                .addValue("reviewer", leave.getApprovedBy() == null ? null : leave.getApprovedBy().getFullName())
                .addValue("cancelledBy", cancelledBy == null ? null : cancelledBy.toString());
        // Null timestamps mean the original action is unknown, so no event is invented.
        if (leave.getCreatedAt() != null) {
            insert(params, "leave-sent:", "REQUEST_SENT", "Đã gửi đơn nghỉ phép", dates, leave.getCreatedAt(), false);
        }
        if (leave.getApprovedAt() != null) {
            insert(params, "leave-reviewed:", "REQUEST_REVIEWED", "Đơn nghỉ phép đã có phản hồi",
                    Objects.toString(leave.getRejectionReason(), ""), leave.getApprovedAt(), false);
        }
        insert(params, "leave-cancelled:", "REQUEST_CANCELLED", "Đơn nghỉ phép đã hủy", dates,
                Objects.requireNonNull(cancelledAt, "Cancellation time is required"), true);
    }

    private void insert(MapSqlParameterSource params, String prefix, String type, String title, String description,
            OffsetDateTime at, boolean cancellation) {
        params.addValue("eventId", prefix + params.getValue("entity")).addValue("type", type).addValue("title", title)
                .addValue("description", description).addValue("at", at);
        String metadata = cancellation
                ? "jsonb_build_object('kind','LEAVE','status','CANCELLED','cancelledBy',CAST(:cancelledBy AS text))"
                : "jsonb_build_object('kind','LEAVE','status',CAST(:status AS text),'reviewedBy',CAST(:reviewer AS text))";
        jdbc.update("INSERT INTO activity_preserved_event(event_id,staff_id,store_id,entity_id,occurred_at,type,title,description,metadata) "
                + "VALUES(:eventId,:staff,:store,:entity,:at,:type,:title,:description," + metadata + ") "
                + "ON CONFLICT(event_id) DO NOTHING", params);
    }
}
