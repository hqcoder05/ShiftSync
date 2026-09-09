package com.shiftsync.shift.service;

import com.shiftsync.availability.entity.Availability;
import com.shiftsync.shift.entity.Shift;
import com.shiftsync.shift.entity.ShiftAssignment;
import com.shiftsync.shift.enums.AssignmentSource;
import com.shiftsync.store.entity.SchedulerConfiguration;
import com.shiftsync.store.entity.StoreConfiguration;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.*;

/**
 * Benchmark so sanh thuc nghiem giua Greedy + Dynamic MRV + Local Repair
 * va Google OR-Tools CP-SAT solver tren 3 quy mo:
 *   1. Nho: 10 nhan vien / 25 slots
 *   2. Vua: 50 nhan vien / 100 slots
 *   3. Lon: 200 nhan vien / 500 slots
 *
 * Cach chay:
 *   mvn test -Dtest=ScheduleComparisonBenchmark
 */
public class ScheduleComparisonBenchmark {

    private static final Logger log = LoggerFactory.getLogger(ScheduleComparisonBenchmark.class);

    static class BenchmarkResult {
        final String scenarioName;
        final String method;
        final int slotsTotal;
        final int slotsFilled;
        final double totalScore;
        final long runtimeMs;
        final String solverStatus;

        BenchmarkResult(String scenarioName, String method, int slotsTotal, int slotsFilled,
                        double totalScore, long runtimeMs, String solverStatus) {
            this.scenarioName = scenarioName;
            this.method = method;
            this.slotsTotal = slotsTotal;
            this.slotsFilled = slotsFilled;
            this.totalScore = totalScore;
            this.runtimeMs = runtimeMs;
            this.solverStatus = solverStatus;
        }

        double fillRate() {
            return slotsTotal == 0 ? 0.0 : (double) slotsFilled / slotsTotal * 100.0;
        }
    }

    public static void main(String[] args) {
        new ScheduleComparisonBenchmark().runAllScenarios();
    }

    @Test
    public void runAllScenarios() {
        System.out.println("=========================================================================================");
        System.out.println("          SHIFTSYNC: BENCHMARK THUC NGHIEM AUTO-SCHEDULING (GREEDY VS CP-SAT)            ");
        System.out.println("=========================================================================================");

        LocalDate weekStart = LocalDate.of(2026, 9, 7); // Monday
        int numDays = 5;

        StoreConfiguration storeConfig = StoreConfiguration.builder().minRestHours(11).build();
        SchedulerConfiguration schedConfig = SchedulerConfiguration.builder()
                .skillWeight(BigDecimal.valueOf(0.2))
                .hourWeight(BigDecimal.valueOf(0.2))
                .fairnessWeight(BigDecimal.valueOf(0.2))
                .restTimeWeight(BigDecimal.valueOf(0.2))
                .availabilityWeight(BigDecimal.valueOf(0.2))
                .build();

        // 3 quy mo thuc nghiem
        int[][] scenarios = {
            {10, 25},   // Quy mo Nho: 10 nv, 25 slots
            {50, 100},  // Quy mo Vua: 50 nv, 100 slots
            {200, 500}  // Quy mo Lon: 200 nv, 500 slots
        };

        String[] scenarioNames = {
            "Quy mo Nho (10 NV / 25 Slots)",
            "Quy mo Vua (50 NV / 100 Slots)",
            "Quy mo Lon (200 NV / 500 Slots)"
        };

        List<BenchmarkResult[]> allResults = new ArrayList<>();

        for (int i = 0; i < scenarios.length; i++) {
            int numStaff = scenarios[i][0];
            int totalSlots = scenarios[i][1];
            String name = scenarioNames[i];

            System.out.println("\n>>> DANG THUC THI: " + name + " <<<");
            List<AutoScheduleService.Slot> slots = buildSlots(totalSlots, numDays, weekStart);

            // Chay Greedy + MRV + Local Repair
            Map<UUID, AutoScheduleService.StaffData> greedyStaff = buildStaffMap(numStaff, weekStart, numDays);
            BenchmarkResult greedyRes = runGreedy(name, new ArrayList<>(slots), greedyStaff, schedConfig, storeConfig);

            // Chay CP-SAT (fresh staffMap)
            Map<UUID, AutoScheduleService.StaffData> cpSatStaff = buildStaffMap(numStaff, weekStart, numDays);
            BenchmarkResult cpSatRes = runCpSat(name, slots, cpSatStaff, schedConfig, storeConfig);

            allResults.add(new BenchmarkResult[]{greedyRes, cpSatRes});
            printScenarioTable(greedyRes, cpSatRes);
        }

        printConsolidatedSummary(allResults);
    }

    private BenchmarkResult runGreedy(String scenario,
                                      List<AutoScheduleService.Slot> slots,
                                      Map<UUID, AutoScheduleService.StaffData> staffMap,
                                      SchedulerConfiguration schedConfig,
                                      StoreConfiguration storeConfig) {
        long start = System.currentTimeMillis();

        AutoScheduleService greedyService = new AutoScheduleService(
                null, null, null, null, null, null, null, null);

        List<AutoScheduleService.Slot> remainingSlots = new ArrayList<>(slots);
        List<ShiftAssignment> newAssignments = new ArrayList<>();
        List<AutoScheduleService.Slot> unassignedSlots = new ArrayList<>();
        int minRestHours = storeConfig.getMinRestHours();
        double totalScore = 0.0;

        while (!remainingSlots.isEmpty()) {
            AutoScheduleService.Slot bestSlot = null;
            List<AutoScheduleService.StaffData> bestCandidates = null;
            int minCandidates = Integer.MAX_VALUE;

            for (AutoScheduleService.Slot s : remainingSlots) {
                List<AutoScheduleService.StaffData> candidates =
                        greedyService.findValidCandidates(s, staffMap.values(), minRestHours);
                if (bestSlot == null || candidates.size() < minCandidates) {
                    bestSlot = s;
                    bestCandidates = candidates;
                    minCandidates = candidates.size();
                }
            }

            remainingSlots.remove(bestSlot);

            if (bestCandidates == null || bestCandidates.isEmpty()) {
                unassignedSlots.add(bestSlot);
                continue;
            }

            final AutoScheduleService.Slot finalSlot = bestSlot;
            AutoScheduleService.StaffData best = bestCandidates.stream()
                    .max(Comparator.comparingDouble((AutoScheduleService.StaffData e) ->
                            greedyService.calculateScore(e, finalSlot, schedConfig, minRestHours))
                            .thenComparing(Comparator.comparingDouble(AutoScheduleService.StaffData::getAssignedHours).reversed())
                            .thenComparing(e -> (long) java.util.Objects.hash(finalSlot.getShift().getId(), e.getEmployment().getUser().getId())))
                    .orElse(bestCandidates.get(0));

            double score = greedyService.calculateScore(best, finalSlot, schedConfig, minRestHours);
            totalScore += score;

            double dur = getDur(bestSlot.getShift());
            best.getCurrentSchedule().add(bestSlot.getShift());
            best.setAssignedHours(best.getAssignedHours() + dur);
            best.setMonthlyShiftCount(best.getMonthlyShiftCount() + 1);
            best.setMonthlyAssignedHours(best.getMonthlyAssignedHours() + dur);

            newAssignments.add(ShiftAssignment.builder()
                    .shift(bestSlot.getShift())
                    .staff(best.getEmployment().getUser())
                    .requiredSkillId(bestSlot.getSkillId())
                    .source(AssignmentSource.AUTO)
                    .build());
        }

        if (!unassignedSlots.isEmpty()) {
            greedyService.attemptLocalRepair(
                    unassignedSlots, newAssignments, staffMap, schedConfig, storeConfig);
        }

        long runtimeMs = System.currentTimeMillis() - start;
        return new BenchmarkResult(scenario, "Greedy+MRV+LocalRepair", slots.size(),
                newAssignments.size(), totalScore, runtimeMs, "N/A (deterministic)");
    }

    private BenchmarkResult runCpSat(String scenario,
                                     List<AutoScheduleService.Slot> slots,
                                     Map<UUID, AutoScheduleService.StaffData> staffMap,
                                     SchedulerConfiguration schedConfig,
                                     StoreConfiguration storeConfig) {
        CpSatAutoScheduleService cpSat = new CpSatAutoScheduleService();
        CpSatAutoScheduleService.CpSatResult result =
                cpSat.solve(slots, staffMap, schedConfig, storeConfig);
        return new BenchmarkResult(scenario, "CP-SAT (OR-Tools)", slots.size(),
                result.assignments.size(), result.totalScore, result.runtimeMs, result.solverStatus);
    }

    private void printScenarioTable(BenchmarkResult greedy, BenchmarkResult cpSat) {
        boolean cpSatRan = !cpSat.solverStatus.equals("NOT_RUN");
        System.out.println("+======================+======================+====================+");
        System.out.printf("| %-20s | %-20s | %-18s |%n", "Tieu chi", "Greedy+MRV+Repair", "CP-SAT (OR-Tools)");
        System.out.println("+======================+======================+====================+");
        System.out.printf("| %-20s | %-20d | %-18d |%n", "Tong so slot", greedy.slotsTotal, cpSat.slotsTotal);
        System.out.printf("| %-20s | %-20d | %-18s |%n", "Slot duoc gan",
                greedy.slotsFilled, cpSatRan ? String.valueOf(cpSat.slotsFilled) : "N/A");
        System.out.printf("| %-20s | %-19.1f%% | %-17s |%n", "Ti le lap day",
                greedy.fillRate(), cpSatRan ? String.format("%.1f%%", cpSat.fillRate()) : "N/A");
        System.out.printf("| %-20s | %-20.2f | %-18s |%n", "Tong soft score",
                greedy.totalScore, cpSatRan ? String.format("%.2f", cpSat.totalScore) : "N/A");
        System.out.printf("| %-20s | %-20d | %-18s |%n", "Thoi gian (ms)",
                greedy.runtimeMs, cpSatRan ? String.valueOf(cpSat.runtimeMs) : "N/A");
        System.out.printf("| %-20s | %-20s | %-18s |%n", "Solver status",
                greedy.solverStatus, cpSat.solverStatus);
        System.out.println("+======================+======================+====================+");
    }

    private void printConsolidatedSummary(List<BenchmarkResult[]> allResults) {
        System.out.println("\n=========================================================================================");
        System.out.println("                         TONG HOP KET QUA 3 QUY MO BENCHMARK                             ");
        System.out.println("=========================================================================================");
        System.out.printf("%-30s | %-12s | %-12s | %-14s | %-12s | %-12s%n",
                "Quy mo", "Thuat toan", "Lap day (%)", "Soft Score", "Runtime (ms)", "Status");
        System.out.println("-----------------------------------------------------------------------------------------");
        for (BenchmarkResult[] pair : allResults) {
            BenchmarkResult g = pair[0];
            BenchmarkResult c = pair[1];
            System.out.printf("%-30s | %-12s | %10.1f%% | %14.2f | %12d | %-12s%n",
                    g.scenarioName, "Greedy", g.fillRate(), g.totalScore, g.runtimeMs, g.solverStatus);
            System.out.printf("%-30s | %-12s | %10.1f%% | %14.2f | %12d | %-12s%n",
                    "", "CP-SAT", c.fillRate(), c.totalScore, c.runtimeMs, c.solverStatus);
            System.out.println("-----------------------------------------------------------------------------------------");
        }
        System.out.println("Ghi chu: Moi so lieu tren la ket qua do luong thuc te.");
    }

    private Map<UUID, AutoScheduleService.StaffData> buildStaffMap(int numStaff,
                                                                     LocalDate weekStart,
                                                                     int numDays) {
        Map<UUID, AutoScheduleService.StaffData> map = new LinkedHashMap<>();
        for (int i = 0; i < numStaff; i++) {
            com.shiftsync.auth.entity.User user = com.shiftsync.auth.entity.User.builder()
                    .id(UUID.randomUUID())
                    .fullName("Staff-" + i)
                    .systemRole(com.shiftsync.shared.security.SystemRole.STAFF)
                    .build();
            com.shiftsync.employment.entity.ContractType contract =
                    com.shiftsync.employment.entity.ContractType.builder()
                            .maxWeeklyHours(48).build();
            com.shiftsync.employment.entity.Employment emp =
                    com.shiftsync.employment.entity.Employment.builder()
                            .user(user).contractType(contract).build();

            List<Availability> availabilities = new ArrayList<>();
            for (int d = 0; d < numDays; d++) {
                LocalDate date = weekStart.plusDays(d);
                short dow = (short) (date.getDayOfWeek().getValue() % 7);
                availabilities.add(Availability.builder()
                        .user(user).dayOfWeek(dow)
                        .startTime(LocalTime.of(0, 0))
                        .endTime(LocalTime.of(23, 59))
                        .build());
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

    private List<AutoScheduleService.Slot> buildSlots(int totalSlots, int numDays,
                                                       LocalDate weekStart) {
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

            Shift shift = Shift.builder()
                    .id(UUID.randomUUID())
                    .shiftDate(date)
                    .startTime(startTimes[shiftType])
                    .endTime(endTimes[shiftType])
                    .status(com.shiftsync.shift.enums.ShiftStatus.DRAFT)
                    .requirements(List.of())
                    .build();
            slots.add(new AutoScheduleService.Slot(shift, null));
        }
        return slots;
    }

    private double getDur(Shift shift) {
        java.time.LocalDateTime start = java.time.LocalDateTime.of(
                shift.getShiftDate(), shift.getStartTime());
        java.time.LocalDateTime end = java.time.LocalDateTime.of(
                shift.getShiftDate(), shift.getEndTime());
        if (end.isBefore(start)) end = end.plusDays(1);
        return java.time.Duration.between(start, end).toMinutes() / 60.0;
    }
}