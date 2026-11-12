package com.shiftsync.availability.repository;

import com.shiftsync.availability.entity.Availability;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;
import java.time.LocalDate;
import java.time.LocalTime;

public interface AvailabilityRepository extends JpaRepository<Availability, UUID> {

    List<Availability> findByUserId(UUID userId);

    interface WeeklySlot {
        Long getRevision();
        Short getDayOfWeek();
        LocalTime getStartTime();
        LocalTime getEndTime();
    }

    @Query(value = "SELECT w.revision AS revision, s.day_of_week AS \"dayOfWeek\", s.start_time AS \"startTime\", s.end_time AS \"endTime\" FROM weekly_availability w LEFT JOIN weekly_availability_slot s ON s.staff_id=w.staff_id AND s.week_start=w.week_start WHERE w.staff_id=:userId AND w.week_start=:week", nativeQuery = true)
    List<WeeklySlot> findWeeklySlots(@Param("userId") UUID userId, @Param("week") LocalDate week);

    static List<Availability> forDate(AvailabilityRepository repository, UUID userId, LocalDate date, List<Availability> recurring) {
        if (userId == null) return recurring;
        // Coverage can use a previous day's overnight slot or the next day's
        // adjacent slot. Resolve each day against its own calendar week.
        java.util.Map<LocalDate, List<Availability>> weeks = new java.util.HashMap<>();
        java.util.List<Availability> result = new java.util.ArrayList<>();
        for (int offset = -1; offset <= 1; offset++) {
            LocalDate day = date.plusDays(offset);
            LocalDate week = day.with(java.time.temporal.TemporalAdjusters.previousOrSame(java.time.DayOfWeek.MONDAY));
            List<Availability> source = weeks.computeIfAbsent(week, key -> {
                var slots = repository.findWeeklySlots(userId, key);
                if (slots.isEmpty()) return recurring;
                return slots.stream().filter(slot -> slot.getDayOfWeek() != null).map(slot -> Availability.builder()
                        .dayOfWeek(slot.getDayOfWeek()).startTime(slot.getStartTime()).endTime(slot.getEndTime()).build()).toList();
            });
            short dayOfWeek = (short) (day.getDayOfWeek().getValue() % 7);
            source.stream().filter(slot -> slot.getDayOfWeek() != null && slot.getDayOfWeek() == dayOfWeek).forEach(result::add);
        }
        return result;
    }
    
    @Query("SELECT a FROM Availability a WHERE a.user.id IN :userIds ORDER BY a.user.id ASC, a.dayOfWeek ASC, a.startTime ASC, a.endTime ASC, a.id ASC")
    List<Availability> findByUser_IdIn(@Param("userIds") List<UUID> userIds);

}
