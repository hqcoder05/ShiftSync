package com.shiftsync.shift.service;

import com.shiftsync.availability.entity.Availability;
import com.shiftsync.shift.entity.Shift;
import com.shiftsync.shift.entity.ShiftAssignment;
import com.shiftsync.shift.enums.AssignmentSource;
import com.shiftsync.store.entity.SchedulerConfiguration;
import com.shiftsync.store.entity.StoreConfiguration;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.*;

public class Scenario2Benchmark {
    private static final Logger log = LoggerFactory.getLogger(Scenario2Benchmark.class);

    public static void main(String[] args) {
        LocalDate weekStart = LocalDate.of(2026, 9, 7);
        int numStaff = 50;
        int totalSlots = 100;
        int numDays = 5;

        StoreConfiguration storeConfig = StoreConfiguration.builder().minRestHours(11).build();
        SchedulerConfiguration schedConfig = SchedulerConfiguration.builder()
                .skillWeight(BigDecimal.valueOf(0.2))
                .hourWeight(BigDecimal.valueOf(0.2))
                .fairnessWeight(BigDecimal.valueOf(0.2))
                .restTimeWeight(BigDecimal.valueOf(0.2))
                .availabilityWeight(BigDecimal.valueOf(0.2))
                .build();

        List<AutoScheduleService.Slot> slots = buildSlots(totalSlots, numDays, weekStart);

        // Run Greedy
        long startG = System.currentTimeMillis();
        AutoScheduleService greedyService = new AutoScheduleService(null, null, null, null, null, null, null, null);
        Map<UUID, AutoScheduleService.StaffData> staffMap = buildStaffMap(numStaff, weekStart, numDays);
        List<AutoScheduleService.Slot> remaining = new ArrayList<>(slots);
        List<ShiftAssignment> assignments = new ArrayList<>();
        List<AutoScheduleService.Slot> unassigned = new ArrayList<>();
        double totalScoreG = 0.0;

        while (!remaining.isEmpty()) {
            AutoScheduleService.Slot bestSlot = null;
            List<AutoScheduleService.StaffData> bestCandidates = null;
            int minCandidates = Integer.MAX_VALUE;

            for (AutoScheduleService.Slot s : remaining) {
                List<AutoScheduleService.StaffData> candidates =
                        greedyService.findValidCandidates(s, staffMap.values(), storeConfig.getMinRestHours());
                if (bestSlot == null || candidates.size() < minCandidates) {
                    bestSlot = s;
                    bestCandidates = candidates;
                    minCandidates = candidates.size();
                }
            }

            remaining.remove(bestSlot);

            if (bestCandidates == null || bestCandidates.isEmpty()) {
                unassigned.add(bestSlot);
                continue;
            }

            final AutoScheduleService.Slot fSlot = bestSlot;
            AutoScheduleService.StaffData best = bestCandidates.stream()
                    .max(Comparator.comparingDouble(e ->
                            greedyService.calculateScore(e, fSlot, schedConfig, storeConfig.getMinRestHours())))
                    .orElse(bestCandidates.get(0));

            double score = greedyService.calculateScore(best, fSlot, schedConfig, storeConfig.getMinRestHours());
            totalScoreG += score;

            double dur = getDur(bestSlot.getShift());
            best.getCurrentSchedule().add(bestSlot.getShift());
            best.setAssignedHours(best.getAssignedHours() + dur);
            best.setMonthlyShiftCount(best.getMonthlyShiftCount() + 1);
            best.setMonthlyAssignedHours(best.getMonthlyAssignedHours() + dur);

            assignments.add(ShiftAssignment.builder()
                    .shift(bestSlot.getShift())
                    .staff(best.getEmployment().getUser())
                    .requiredSkillId(bestSlot.getSkillId())
                    .source(AssignmentSource.AUTO)
                    .build());
        }

        if (!unassigned.isEmpty()) {
            greedyService.attemptLocalRepair(unassigned, assignments, staffMap, schedConfig, storeConfig);
        }
        long runtimeG = System.currentTimeMillis() - startG;

        // Run CP-SAT
        Map<UUID, AutoScheduleService.StaffData> staffMapCp = buildStaffMap(numStaff, weekStart, numDays);
        CpSatAutoScheduleService cpSat = new CpSatAutoScheduleService();
        CpSatAutoScheduleService.CpSatResult resCp = cpSat.solve(slots, staffMapCp, schedConfig, storeConfig);

        System.out.println("=== KET QUA QUY MO VUA (50 NV / 100 SLOTS) ===");
        System.out.println("Greedy: slotsFilled=" + assignments.size() + "/" + totalSlots +
                           ", totalScore=" + String.format("%.2f", totalScoreG) +
                           ", runtimeMs=" + runtimeG + ", status=N/A (deterministic)");
        System.out.println("CP-SAT: slotsFilled=" + resCp.assignments.size() + "/" + totalSlots +
                           ", totalScore=" + String.format("%.2f", resCp.totalScore) +
                           ", runtimeMs=" + resCp.runtimeMs + ", status=" + resCp.solverStatus);
    }

    private static Map<UUID, AutoScheduleService.StaffData> buildStaffMap(int numStaff, LocalDate weekStart, int numDays) {
        Map<UUID, AutoScheduleService.StaffData> map = new LinkedHashMap<>();
        for (int i = 0; i < numStaff; i++) {
            com.shiftsync.auth.entity.User user = com.shiftsync.auth.entity.User.builder()
                    .id(UUID.randomUUID()).fullName("Staff-" + i)
                    .systemRole(com.shiftsync.shared.security.SystemRole.STAFF).build();
            com.shiftsync.employment.entity.ContractType contract =
                    com.shiftsync.employment.entity.ContractType.builder().maxWeeklyHours(48).build();
            com.shiftsync.employment.entity.Employment emp =
                    com.shiftsync.employment.entity.Employment.builder().user(user).contractType(contract).build();

            List<Availability> availabilities = new ArrayList<>();
            for (int d = 0; d < numDays; d++) {
                LocalDate date = weekStart.plusDays(d);
                short dow = (short) (date.getDayOfWeek().getValue() % 7);
                availabilities.add(Availability.builder().user(user).dayOfWeek(dow)
                        .startTime(LocalTime.of(0, 0)).endTime(LocalTime.of(23, 59)).build());
            }

            AutoScheduleService.StaffData staffData = new AutoScheduleService.StaffData();
            staffData.setEmployment(emp);
            staffData.setSkills(List.of());
            staffData.setAvailabilities(availabilities);
            staffData.setBlackoutDates(List.of());
            staffData.setCurrentSchedule(new ArrayList<>());
            staffData.setAssignedHours(0.0);
            staffData.setMonthlyShiftCount(0);
            staffData.setMonthlyAssignedHours(0.0);
            map.put(user.getId(), staffData);
        }
        return map;
    }

    private static List<AutoScheduleService.Slot> buildSlots(int totalSlots, int numDays, LocalDate weekStart) {
        List<AutoScheduleService.Slot> slots = new ArrayList<>();
        LocalTime[] startTimes = {
            LocalTime.of(6, 0), LocalTime.of(8, 0), LocalTime.of(12, 0),
            LocalTime.of(14, 0), LocalTime.of(16, 0)
        };
        LocalTime[] endTimes = {
            LocalTime.of(14, 0), LocalTime.of(16, 0), LocalTime.of(20, 0),
            LocalTime.of(22, 0), LocalTime.of(23, 59)
        };
        for (int i = 0; i < totalSlots; i++) {
            int dayIdx = i % numDays;
            LocalDate date = weekStart.plusDays(dayIdx);
            int shiftType = (i / numDays) % startTimes.length;
            Shift shift = Shift.builder().id(UUID.randomUUID()).shiftDate(date)
                    .startTime(startTimes[shiftType]).endTime(endTimes[shiftType])
                    .status(com.shiftsync.shift.enums.ShiftStatus.DRAFT).requirements(List.of()).build();
            slots.add(new AutoScheduleService.Slot(shift, null));
        }
        return slots;
    }

    private static double getDur(Shift shift) {
        java.time.LocalDateTime start = java.time.LocalDateTime.of(shift.getShiftDate(), shift.getStartTime());
        java.time.LocalDateTime end = java.time.LocalDateTime.of(shift.getShiftDate(), shift.getEndTime());
        if (end.isBefore(start)) end = end.plusDays(1);
        return java.time.Duration.between(start, end).toMinutes() / 60.0;
    }
}