package com.shiftsync.activity;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;
import java.time.OffsetDateTime;
import java.util.*;

@Repository @RequiredArgsConstructor
public class ActivityRepository {
    private final NamedParameterJdbcTemplate jdbc;
    private final ObjectMapper json;

    public List<ActivityItem> find(UUID staffId, List<UUID> stores, OffsetDateTime beforeAt, String beforeId, int limit) {
        var params = new MapSqlParameterSource().addValue("staff", staffId).addValue("stores", stores).addValue("limit", limit);
        String cursor = "";
        if (beforeAt != null) {
            params.addValue("before", beforeAt).addValue("beforeId", beforeId);
            cursor = "WHERE (occurred_at < :before OR (occurred_at = :before AND event_id < :beforeId))";
        }
        return jdbc.query(EVENTS + " SELECT * FROM events " + cursor
                + " ORDER BY occurred_at DESC,event_id DESC LIMIT :limit", params, (rs, row) -> {
            Map<String, Object> metadata;
            try { metadata = json.readValue(rs.getString("metadata"), new TypeReference<Map<String, Object>>() { }); }
            catch (Exception error) { throw new java.sql.SQLException("Invalid activity metadata", error); }
            return new ActivityItem(rs.getString("event_id"), rs.getString("type"), rs.getString("title"),
                    rs.getString("description"), rs.getObject("occurred_at", OffsetDateTime.class),
                    rs.getObject("store_id", UUID.class), rs.getString("store_name"), rs.getObject("entity_id", UUID.class),
                    rs.getString("target_screen"), metadata);
        });
    }

    private static final String EVENTS = """
        WITH events AS (
          SELECT 'attendance-in:'||a.id AS event_id,'ATTENDANCE_IN' AS type,'Đã vào ca' AS title,
            to_char(s.shift_date,'DD/MM/YYYY')||' · '||to_char(s.start_time,'HH24:MI')||'–'||to_char(s.end_time,'HH24:MI') AS description,
            a.check_in_time AS occurred_at,s.store_id,st.name AS store_name,a.id AS entity_id,'Attendance' AS target_screen,
            json_build_object('shiftId',s.id,'status',a.status)::text AS metadata
          FROM attendance a JOIN shift_assignment sa ON sa.id=a.shift_assignment_id JOIN shift s ON s.id=sa.shift_id JOIN store st ON st.id=s.store_id
          WHERE sa.staff_id=:staff AND s.store_id IN (:stores) AND NOT a.deleted AND NOT sa.deleted AND NOT st.deleted AND a.check_in_time IS NOT NULL
          UNION ALL
          SELECT 'attendance-out:'||a.id,'ATTENDANCE_OUT','Đã ra ca',to_char(s.shift_date,'DD/MM/YYYY')||' · '||st.name,
            a.check_out_time,s.store_id,st.name,a.id,'Attendance',json_build_object('shiftId',s.id,'status',a.status)::text
          FROM attendance a JOIN shift_assignment sa ON sa.id=a.shift_assignment_id JOIN shift s ON s.id=sa.shift_id JOIN store st ON st.id=s.store_id
          WHERE sa.staff_id=:staff AND s.store_id IN (:stores) AND NOT a.deleted AND NOT sa.deleted AND NOT st.deleted AND a.check_out_time IS NOT NULL
          UNION ALL
          SELECT 'adjustment-sent:'||r.id,'REQUEST_SENT','Đã gửi yêu cầu sửa công',COALESCE(r.reason,''),
            r.created_at,s.store_id,st.name,r.id,'Attendance',json_build_object('kind','ADJUSTMENT','status',r.status,'shiftId',s.id)::text
          FROM attendance_adjustment_request r JOIN shift s ON s.id=r.shift_id JOIN store st ON st.id=s.store_id
          WHERE r.staff_id=:staff AND s.store_id IN (:stores) AND NOT st.deleted AND r.created_at IS NOT NULL
          UNION ALL
          SELECT 'adjustment-reviewed:'||r.id,'REQUEST_REVIEWED','Yêu cầu sửa công đã có phản hồi',COALESCE(r.reason,''),
            r.approved_at,s.store_id,st.name,r.id,'Attendance',json_build_object('kind','ADJUSTMENT','status',r.status,'shiftId',s.id,'reviewedBy',reviewer.full_name)::text
          FROM attendance_adjustment_request r JOIN shift s ON s.id=r.shift_id JOIN store st ON st.id=s.store_id LEFT JOIN staff reviewer ON reviewer.id=r.approved_by
          WHERE r.staff_id=:staff AND s.store_id IN (:stores) AND NOT st.deleted AND r.approved_at IS NOT NULL
          UNION ALL
          SELECT 'request-sent:'||r.id,'REQUEST_SENT','Đã gửi yêu cầu',r.request_type,r.created_at,r.store_id,st.name,r.id,'Request',
            json_build_object('kind',r.type_category,'status',r.status)::text
          FROM staff_requests r JOIN store st ON st.id=r.store_id
          WHERE r.requester_id=:staff AND r.store_id IN (:stores) AND NOT st.deleted AND r.created_at IS NOT NULL
          UNION ALL
          SELECT 'request-reviewed:'||r.id,'REQUEST_REVIEWED','Yêu cầu đã có phản hồi',r.request_type,r.reviewed_at,r.store_id,st.name,r.id,'Request',
            json_build_object('status',r.status,'reviewedBy',r.reviewed_by_name,'note',r.manager_note)::text
          FROM staff_requests r JOIN store st ON st.id=r.store_id
          WHERE r.requester_id=:staff AND r.store_id IN (:stores) AND NOT st.deleted AND r.reviewed_at IS NOT NULL
          UNION ALL
          SELECT 'leave-sent:'||r.id,'REQUEST_SENT','Đã gửi đơn nghỉ phép',to_char(r.start_date,'DD/MM/YYYY')||' – '||to_char(r.end_date,'DD/MM/YYYY'),
            r.created_at,r.store_id,st.name,r.id,'Request',json_build_object('kind','LEAVE','status',r.status)::text
          FROM leave_request r JOIN store st ON st.id=r.store_id
          WHERE r.staff_id=:staff AND r.store_id IN (:stores) AND NOT st.deleted AND r.created_at IS NOT NULL
          UNION ALL
          SELECT 'leave-reviewed:'||r.id,'REQUEST_REVIEWED','Đơn nghỉ phép đã có phản hồi',COALESCE(r.rejection_reason,''),
            r.approved_at,r.store_id,st.name,r.id,'Request',json_build_object('kind','LEAVE','status',r.status,'reviewedBy',reviewer.full_name)::text
          FROM leave_request r JOIN store st ON st.id=r.store_id LEFT JOIN staff reviewer ON reviewer.id=r.approved_by
          WHERE r.staff_id=:staff AND r.store_id IN (:stores) AND NOT st.deleted AND r.approved_at IS NOT NULL
          UNION ALL
          SELECT 'swap-sent:'||r.id,CASE WHEN r.from_staff_id=:staff THEN 'SWAP_SENT' ELSE 'SWAP_RECEIVED' END,
            CASE WHEN r.from_staff_id=:staff THEN 'Đã gửi đề nghị đổi ca' ELSE 'Nhận đề nghị đổi ca' END,
            to_char(s.shift_date,'DD/MM/YYYY')||' · '||to_char(s.start_time,'HH24:MI')||'–'||to_char(s.end_time,'HH24:MI'),
            r.created_at,s.store_id,st.name,r.id,'Request',json_build_object('kind','SWAP','status',r.status,'employeeAccepted',r.employee_accepted)::text
          FROM shift_swap_request r JOIN shift s ON s.id=r.from_shift_id JOIN store st ON st.id=s.store_id
          WHERE (r.from_staff_id=:staff OR r.to_staff_id=:staff) AND s.store_id IN (:stores) AND NOT st.deleted AND r.created_at IS NOT NULL
          UNION ALL
          SELECT 'swap-responded:'||r.id,'REQUEST_REVIEWED','Đồng nghiệp đã phản hồi đổi ca','',r.employee_responded_at,s.store_id,st.name,r.id,'Request',
            json_build_object('kind','SWAP','status',r.status,'employeeAccepted',r.employee_accepted)::text
          FROM shift_swap_request r JOIN shift s ON s.id=r.from_shift_id JOIN store st ON st.id=s.store_id
          WHERE (r.from_staff_id=:staff OR r.to_staff_id=:staff) AND s.store_id IN (:stores) AND NOT st.deleted AND r.employee_responded_at IS NOT NULL
          UNION ALL
          SELECT 'swap-reviewed:'||r.id,'REQUEST_REVIEWED','Quản lý đã phản hồi đổi ca',COALESCE(r.manager_note,''),r.reviewed_at,s.store_id,st.name,r.id,'Request',
            json_build_object('kind','SWAP','status',r.status,'reviewedBy',reviewer.full_name)::text
          FROM shift_swap_request r JOIN shift s ON s.id=r.from_shift_id JOIN store st ON st.id=s.store_id LEFT JOIN staff reviewer ON reviewer.id=r.approved_by
          WHERE (r.from_staff_id=:staff OR r.to_staff_id=:staff) AND s.store_id IN (:stores) AND NOT st.deleted AND r.reviewed_at IS NOT NULL
          UNION ALL
          SELECT 'swap-cancelled:'||r.id,'REQUEST_CANCELLED','Đề nghị đổi ca đã hủy','',r.cancelled_at,s.store_id,st.name,r.id,'Request',
            json_build_object('kind','SWAP','cancelledBy',r.cancelled_by_name)::text
          FROM shift_swap_request r JOIN shift s ON s.id=r.from_shift_id JOIN store st ON st.id=s.store_id
          WHERE (r.from_staff_id=:staff OR r.to_staff_id=:staff) AND s.store_id IN (:stores) AND NOT st.deleted AND r.cancelled_at IS NOT NULL
          UNION ALL
          SELECT 'claim:'||c.id,'SHIFT_CLAIMED','Đã nhận ca trên Chợ ca',to_char(c.shift_date,'DD/MM/YYYY')||' · '||to_char(c.start_time,'HH24:MI')||'–'||to_char(c.end_time,'HH24:MI'),
            c.occurred_at,c.store_id,st.name,c.shift_id,'Schedule',json_build_object('shiftId',c.shift_id)::text
          FROM activity_shift_claim c JOIN store st ON st.id=c.store_id
          WHERE c.staff_id=:staff AND c.store_id IN (:stores) AND NOT st.deleted
          UNION ALL
          SELECT p.event_id,p.type,p.title,p.description,p.occurred_at,p.store_id,st.name,p.entity_id,'Request',p.metadata::text
          FROM activity_preserved_event p JOIN store st ON st.id=p.store_id
          WHERE p.staff_id=:staff AND p.store_id IN (:stores) AND NOT st.deleted
        )
        """;
}
