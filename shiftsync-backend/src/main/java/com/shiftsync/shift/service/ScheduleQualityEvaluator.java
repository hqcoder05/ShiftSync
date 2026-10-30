package com.shiftsync.shift.service;

import com.shiftsync.shift.dto.RequirementCoverageDTO;
import com.shiftsync.shift.dto.ScheduleQualityDTO;
import com.shiftsync.shift.entity.Shift;
import com.shiftsync.shift.entity.ShiftAssignment;
import java.time.*;
import java.util.*;

/**
 * Order-independent evaluation of final facts, shared by the scheduler and benchmark callers.
 * Coverage rows must already contain role/placement matching, not raw assignment counts.
 * Monthly schedules include all stores, retained assignments and the final repaired assignments,
 * but exclude the AUTO assignments being replaced. All active target-store staff belong to the
 * cohort, including staff with no assigned hours. Capacity is a comparison denominator, not a
 * monthly legal limit or a promise that everyone can work every available shift.
 */
public final class ScheduleQualityEvaluator {
    public static final String VERSION = "FINAL_METRICS_V1";
    public record Person(UUID staffId, double weeklyHourLimit, List<Shift> finalMonthlySchedule) {}
    private record Placement(UUID shiftId, UUID staffId, UUID skillId, UUID zoneId, UUID workstationId) {}

    private ScheduleQualityEvaluator() {}

    public static ScheduleQualityDTO evaluate(List<RequirementCoverageDTO> coverage,
            Collection<Person> people, List<ShiftAssignment> previousAuto, List<ShiftAssignment> finalAuto,
            YearMonth firstMonth, YearMonth lastMonth) {
        if (lastMonth.isBefore(firstMonth)) throw new IllegalArgumentException("Invalid quality period");
        int demanded = 0, covered = 0;
        double demandHours = 0, coveredHours = 0;
        for (var row : coverage) {
            if (row.getRequiredCount() < 0 || row.getAssignedCount() < 0) throw new IllegalArgumentException("Negative coverage");
            int matched = Math.min(row.getRequiredCount(), row.getAssignedCount());
            Shift shift = Shift.builder().shiftDate(row.getShiftDate()).startTime(row.getStartTime()).endTime(row.getEndTime()).build();
            double duration = ShiftTimeRange.hours(shift);
            demanded += row.getRequiredCount(); covered += matched;
            demandHours += duration * row.getRequiredCount(); coveredHours += duration * matched;
        }
        var roster = people.stream().sorted(Comparator.comparing(Person::staffId)).toList();
        Set<UUID> ids = new HashSet<>();
        for (var person : roster) {
            if (!ids.add(person.staffId())) throw new IllegalArgumentException("Duplicate quality cohort member");
            if (!Double.isFinite(person.weeklyHourLimit()) || person.weeklyHourLimit() <= 0)
                throw new IllegalArgumentException("Invalid quality contract capacity");
        }
        List<ScheduleQualityDTO.MonthlyLoad> months = new ArrayList<>();
        for (var month = firstMonth; !month.isAfter(lastMonth); month = month.plusMonths(1)) {
            List<ScheduleQualityDTO.StaffLoad> loads = new ArrayList<>();
            for (var person : roster) {
                double hours = 0;
                for (var shift : person.finalMonthlySchedule()) hours += ShiftTimeRange.hoursInMonth(shift, month);
                double capacity = person.weeklyHourLimit() * month.lengthOfMonth() / 7.0;
                loads.add(ScheduleQualityDTO.StaffLoad.builder().staffId(person.staffId()).scheduledHours(hours)
                        .capacityHours(capacity).loadRatio(hours / capacity).build());
            }
            double mean = loads.stream().mapToDouble(ScheduleQualityDTO.StaffLoad::getLoadRatio).average().orElse(0);
            double variance = loads.stream().mapToDouble(load -> Math.pow(load.getLoadRatio() - mean, 2)).average().orElse(0);
            months.add(ScheduleQualityDTO.MonthlyLoad.builder().month(month.toString()).staffCount(loads.size())
                    .scheduledHours(loads.stream().mapToDouble(ScheduleQualityDTO.StaffLoad::getScheduledHours).sum())
                    .normalizedLoadStdDev(Math.sqrt(variance)).staffLoads(loads).build());
        }
        var old = placements(previousAuto); var next = placements(finalAuto);
        int kept = old.entrySet().stream().mapToInt(entry -> Math.min(entry.getValue(), next.getOrDefault(entry.getKey(), 0))).sum();
        int before = old.values().stream().mapToInt(Integer::intValue).sum();
        int after = next.values().stream().mapToInt(Integer::intValue).sum();
        return ScheduleQualityDTO.builder().evaluationVersion(VERSION).demandSlots(demanded).coveredSlots(covered)
                .unfilledSlots(demanded-covered).demandHours(demandHours).coveredHours(coveredHours)
                .unfilledHours(demandHours-coveredHours).autoAssignmentsKept(kept)
                .autoAssignmentsAdded(after-kept).autoAssignmentsRemoved(before-kept).monthlyLoads(months).build();
    }

    private static Map<Placement,Integer> placements(List<ShiftAssignment> assignments) {
        Map<Placement,Integer> rows = new HashMap<>();
        for (var assignment : assignments) {
            if (assignment.isDeleted() || assignment.getSource() != com.shiftsync.shift.enums.AssignmentSource.AUTO) continue;
            rows.merge(new Placement(assignment.getShift().getId(),assignment.getStaff().getId(),assignment.getRequiredSkillId(),
                    assignment.getZone()==null?null:assignment.getZone().getId(),
                    assignment.getWorkstation()==null?null:assignment.getWorkstation().getId()),1,Integer::sum);
        }
        return rows;
    }
}
