package com.shiftsync.shift.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.shiftsync.shared.exception.BusinessException;
import com.shiftsync.shared.security.CustomUserDetails;
import com.shiftsync.shared.security.SystemRole;
import jakarta.persistence.EntityManager;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;

@RestController
@RequestMapping("/api/stores/{storeId}/schedule-history")
public class ScheduleHistoryController {
    private final EntityManager db;
    private final ObjectMapper json;
    public ScheduleHistoryController(EntityManager db, ObjectMapper json) { this.db = db; this.json = json; }
    public record Entry(UUID id, UUID shiftId, JsonNode before, JsonNode after, Object changedAt, String actorName, String reason,
                        boolean beforeHidden, boolean afterHidden) {}

    @GetMapping
    @PreAuthorize("@storeAccessService.canAccessStore(authentication, #storeId)")
    @Transactional(readOnly=true)
    public List<Entry> list(@PathVariable UUID storeId, @RequestParam LocalDate startDate, @RequestParam LocalDate endDate,
                            @AuthenticationPrincipal CustomUserDetails user) {
        long days = ChronoUnit.DAYS.between(startDate, endDate);
        if (days < 0 || days > 30) throw new BusinessException("Khoảng thời gian phải từ 1 đến 31 ngày.");
        boolean staff = user.getUser().getSystemRole() == SystemRole.STAFF;
        String visible = staff ? " AND (h.before_snapshot->>'status' IN ('PUBLISHED','COMPLETED','CANCELLED') OR h.after_snapshot->>'status' IN ('PUBLISHED','COMPLETED','CANCELLED'))" : "";
        @SuppressWarnings("unchecked") List<Object[]> rows = db.createNativeQuery("SELECT h.id,h.shift_id,CAST(h.before_snapshot AS text),CAST(h.after_snapshot AS text),h.changed_at,s.full_name,h.reason FROM schedule_history h LEFT JOIN staff s ON s.id=h.actor_id WHERE h.store_id=:store AND ((h.before_snapshot->>'shiftDate' BETWEEN :start AND :end) OR (h.after_snapshot->>'shiftDate' BETWEEN :start AND :end))" + visible + " ORDER BY h.changed_at DESC,h.id DESC")
                .setParameter("store",storeId).setParameter("start",startDate.toString()).setParameter("end",endDate.toString()).getResultList();
        return rows.stream().map(r -> {
            JsonNode before = parse((String)r[2]), after = parse((String)r[3]);
            boolean beforeHidden = staff && before != null && "DRAFT".equals(before.path("status").asText());
            boolean afterHidden = staff && after != null && "DRAFT".equals(after.path("status").asText());
            if (beforeHidden) before = null;
            if (afterHidden) after = null;
            return new Entry((UUID)r[0],(UUID)r[1],before,after,r[4],(String)r[5],(String)r[6],beforeHidden,afterHidden);
        }).toList();
    }
    private JsonNode parse(String value) {
        if(value==null) return null;
        try { return json.readTree(value); } catch (Exception e) { throw new IllegalStateException("Dữ liệu lịch sử ca không hợp lệ.",e); }
    }
}
