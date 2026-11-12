package com.shiftsync.availability.controller;

import com.shiftsync.auth.repository.UserRepository;
import com.shiftsync.availability.dto.AvailabilityRequest;
import com.shiftsync.availability.entity.Availability;
import com.shiftsync.availability.service.AvailabilityCoverage;
import com.shiftsync.shared.exception.BusinessException;
import jakarta.persistence.EntityManager;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.*;
import java.time.temporal.TemporalAdjusters;
import java.util.*;

@RestController
@RequestMapping("/api/availability/weeks")
public class WeeklyAvailabilityController {
    private final EntityManager db;
    private final UserRepository users;
    private static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    public WeeklyAvailabilityController(EntityManager db, UserRepository users) {
        this.db = db;
        this.users = users;
    }

    public record Slot(UUID id, short dayOfWeek, LocalTime startTime, LocalTime endTime) {}
    public record Snapshot(LocalDate weekStart, long revision, String source, boolean editable, List<Slot> slots) {}
    public record SaveRequest(@NotNull Long revision, @NotNull List<@NotNull @Valid AvailabilityRequest> slots) {}

    private UUID userId(Authentication auth) {
        return users.findByEmail(auth.getName()).orElseThrow(() -> new BusinessException("Không tìm thấy tài khoản.", HttpStatus.NOT_FOUND)).getId();
    }
    private void checkWeek(LocalDate week) {
        if (week.getDayOfWeek() != DayOfWeek.MONDAY) throw new BusinessException("Ngày bắt đầu tuần phải là thứ Hai.");
    }
    private boolean editable(LocalDate week) {
        LocalDate today = LocalDate.now(ZONE);
        LocalDate nextMonday = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY)).plusWeeks(1);
        return week.equals(nextMonday) && ZonedDateTime.now(ZONE).isBefore(week.minusDays(2).atStartOfDay(ZONE));
    }

    @GetMapping("/{week}")
    @Transactional(readOnly = true)
    public Snapshot get(@PathVariable LocalDate week, Authentication auth) {
        checkWeek(week);
        UUID user = userId(auth);
        // One statement keeps the revision and its slots in the same PostgreSQL snapshot,
        // even when another session saves this week at the same time.
        @SuppressWarnings("unchecked") List<Object[]> rows = db.createNativeQuery("""
                SELECT w.revision, s.id, s.day_of_week, s.start_time, s.end_time
                FROM weekly_availability w LEFT JOIN weekly_availability_slot s
                  ON s.staff_id=w.staff_id AND s.week_start=w.week_start
                WHERE w.staff_id=:user AND w.week_start=:week ORDER BY s.day_of_week, s.start_time, s.id
                """)
                .setParameter("user", user).setParameter("week", week).getResultList();
        if (rows.isEmpty()) return new Snapshot(week, 0, "EMPTY", editable(week), List.of());
        List<Slot> slots = rows.stream().filter(r -> r[1] != null)
                .map(r -> new Slot((UUID) r[1], ((Number) r[2]).shortValue(), asLocalTime(r[3]), asLocalTime(r[4]))).toList();
        return new Snapshot(week, ((Number) rows.getFirst()[0]).longValue(), "REGISTERED", editable(week), slots);
    }

    private static LocalTime asLocalTime(Object value) {
        if (value instanceof LocalTime time) return time;
        if (value instanceof java.sql.Time time) return time.toLocalTime();
        throw new IllegalStateException("Kiểu dữ liệu giờ trong lịch rảnh không hợp lệ.");
    }

    @PutMapping("/{week}")
    @Transactional
    public Snapshot save(@PathVariable LocalDate week, @Valid @RequestBody SaveRequest request, Authentication auth) {
        checkWeek(week);
        if (!editable(week)) throw new BusinessException("Tuần này không còn trong thời gian đăng ký.", HttpStatus.FORBIDDEN);
        if (request.slots().size() > 100) throw new BusinessException("Quá nhiều khung giờ.");
        List<Availability> validated = new ArrayList<>();
        for (AvailabilityRequest slot : request.slots()) {
            if (slot.getStartTime().equals(slot.getEndTime()) || AvailabilityCoverage.overlaps(validated, slot.getDayOfWeek(), slot.getStartTime(), slot.getEndTime(), null))
                throw new BusinessException("Khung giờ rảnh không hợp lệ hoặc bị trùng.");
            validated.add(Availability.builder().dayOfWeek(slot.getDayOfWeek()).startTime(slot.getStartTime()).endTime(slot.getEndTime()).build());
        }
        UUID user = userId(auth);
        db.createNativeQuery("INSERT INTO weekly_availability (staff_id, week_start, revision) VALUES (:user, :week, 0) ON CONFLICT DO NOTHING")
                .setParameter("user", user).setParameter("week", week).executeUpdate();
        int updated = db.createNativeQuery("UPDATE weekly_availability SET revision = revision + 1 WHERE staff_id = :user AND week_start = :week AND revision = :revision")
                .setParameter("user", user).setParameter("week", week).setParameter("revision", request.revision()).executeUpdate();
        if (updated != 1) throw new BusinessException("Lịch rảnh đã thay đổi, vui lòng tải lại.", HttpStatus.CONFLICT);
        db.createNativeQuery("DELETE FROM weekly_availability_slot WHERE staff_id = :user AND week_start = :week").setParameter("user", user).setParameter("week", week).executeUpdate();
        for (Availability slot : validated) db.createNativeQuery("INSERT INTO weekly_availability_slot (id, staff_id, week_start, day_of_week, start_time, end_time) VALUES (:id, :user, :week, :day, :start, :end)")
                .setParameter("id", UUID.randomUUID()).setParameter("user", user).setParameter("week", week).setParameter("day", slot.getDayOfWeek()).setParameter("start", slot.getStartTime()).setParameter("end", slot.getEndTime()).executeUpdate();
        return get(week, auth);
    }
}
