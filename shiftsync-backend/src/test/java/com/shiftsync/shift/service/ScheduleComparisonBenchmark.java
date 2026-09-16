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
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.*;
import java.util.stream.Collectors;

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

        SchedulerConfiguration schedConfigOld = SchedulerConfiguration.builder()
                .fairnessWeight(BigDecimal.valueOf(0.10))
                .skillWeight(BigDecimal.valueOf(0.30))
                .hourWeight(BigDecimal.valueOf(0.20))
                .restTimeWeight(BigDecimal.valueOf(0.10))
                .availabilityWeight(BigDecimal.valueOf(0.30))
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

            // Chay Greedy TRUOC FIX
            Map<UUID, AutoScheduleService.StaffData> greedyStaffBefore = buildStaffMap(numStaff, weekStart, numDays);
            runGreedyBeforeFix(name, new ArrayList<>(slots), greedyStaffBefore, schedConfigOld, storeConfig);

            // Chay Greedy SAU FIX
            Map<UUID, AutoScheduleService.StaffData> greedyStaff = buildStaffMap(numStaff, weekStart, numDays);
            BenchmarkResult greedyRes = runGreedy(name, new ArrayList<>(slots), greedyStaff, schedConfig, storeConfig);

            // 1. In bang so sanh Truoc Fix vs Sau Fix kem maxWeeklyHours va utilizationRatio
            printStaffComparisonTable(name, greedyStaffBefore, greedyStaff);

            // Chay CP-SAT (fresh staffMap)
            Map<UUID, AutoScheduleService.StaffData> cpSatStaff = buildStaffMap(numStaff, weekStart, numDays);
            BenchmarkResult cpSatRes = runCpSat(name, slots, cpSatStaff, schedConfig, storeConfig);

            allResults.add(new BenchmarkResult[]{greedyRes, cpSatRes});
            printScenarioTable(greedyRes, cpSatRes);
        }

        printConsolidatedSummary(allResults);

        // 2. Chay scenario moi: Heterogeneous Availability (Truoc fix vs Sau fix)
        runHeterogeneousAvailabilityScenario(weekStart, storeConfig);
    }

    @Test
    public void testContractUtilization10And50Staff() {
        System.out.println("=========================================================================================");
        System.out.println("   BENCHMARK CHUYEN BIET: CONTRACT TYPE & UTILIZATION RATIO (10 NV & 50 NV)              ");
        System.out.println("=========================================================================================");

        LocalDate weekStart = LocalDate.of(2026, 9, 7);
        int numDays = 5;
        StoreConfiguration storeConfig = StoreConfiguration.builder().minRestHours(11).build();

        SchedulerConfiguration schedConfigOld = SchedulerConfiguration.builder()
                .fairnessWeight(BigDecimal.valueOf(0.10))
                .skillWeight(BigDecimal.valueOf(0.30))
                .hourWeight(BigDecimal.valueOf(0.20))
                .restTimeWeight(BigDecimal.valueOf(0.10))
                .availabilityWeight(BigDecimal.valueOf(0.30))
                .build();

        SchedulerConfiguration schedConfigNew = SchedulerConfiguration.builder()
                .fairnessWeight(BigDecimal.valueOf(0.20))
                .skillWeight(BigDecimal.valueOf(0.25))
                .hourWeight(BigDecimal.valueOf(0.20))
                .restTimeWeight(BigDecimal.valueOf(0.15))
                .availabilityWeight(BigDecimal.valueOf(0.20))
                .build();

        // 1. Kich ban 10 NV / 25 slots (Hop dong dong nhat: 10 FT 48h)
        runContractUtilizationTest("10 NV / 25 Slots (Dong Nhat HD 48h)", 10, 25, false, weekStart, numDays, storeConfig, schedConfigOld, schedConfigNew);

        // 2. Kich ban 50 NV / 100 slots (Hop dong dong nhat: 50 FT 48h)
        runContractUtilizationTest("50 NV / 100 Slots (Dong Nhat HD 48h)", 50, 100, false, weekStart, numDays, storeConfig, schedConfigOld, schedConfigNew);

        // 3. Kich ban 10 NV / 25 slots (Hop dong da dang: 5 FT 48h + 5 PT 24h)
        runContractUtilizationTest("10 NV / 25 Slots (Da Dang HD: 5 FT 48h + 5 PT 24h)", 10, 25, true, weekStart, numDays, storeConfig, schedConfigOld, schedConfigNew);

        // 4. Kich ban 50 NV / 100 slots (Hop dong da dang: 25 FT 48h + 25 PT 24h)
        runContractUtilizationTest("50 NV / 100 Slots (Da Dang HD: 25 FT 48h + 25 PT 24h)", 50, 100, true, weekStart, numDays, storeConfig, schedConfigOld, schedConfigNew);
    }

    private void runContractUtilizationTest(String title, int numStaff, int totalSlots, boolean mixedContracts,
                                           LocalDate weekStart, int numDays,
                                           StoreConfiguration storeConfig,
                                           SchedulerConfiguration schedConfigOld,
                                           SchedulerConfiguration schedConfigNew) {
        List<AutoScheduleService.Slot> slots = buildSlots(totalSlots, numDays, weekStart);

        Map<UUID, AutoScheduleService.StaffData> staffBefore = buildStaffMap(numStaff, weekStart, numDays, mixedContracts);
        runGreedyBeforeFix(title, new ArrayList<>(slots), staffBefore, schedConfigOld, storeConfig);

        Map<UUID, AutoScheduleService.StaffData> staffAfter = buildStaffMap(numStaff, weekStart, numDays, mixedContracts);
        runGreedy(title, new ArrayList<>(slots), staffAfter, schedConfigNew, storeConfig);

        printStaffComparisonTable(title, staffBefore, staffAfter);
    }

    private BenchmarkResult runGreedy(String scenario,
                                      List<AutoScheduleService.Slot> slots,
                                      Map<UUID, AutoScheduleService.StaffData> staffMap,
                                      SchedulerConfiguration schedConfig,
                                      StoreConfiguration storeConfig) {
        long start = System.currentTimeMillis();

        AutoScheduleService greedyService = new AutoScheduleService(
                null, null, null, null, null, null, null, null);

        // Snapshot trung binh monthlyAssignedHours cua TOAN BO staffMap, tinh 1 lan duy nhat khi bat dau
        double teamMonthlyAvg = staffMap.values().stream()
                .mapToDouble(AutoScheduleService.StaffData::getMonthlyAssignedHours)
                .average()
                .orElse(0.0);

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
                        greedyService.findValidCandidates(s, staffMap.values(), minRestHours, teamMonthlyAvg);
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
                            .thenComparing(Comparator.comparingDouble(AutoScheduleService.StaffData::getUtilizationRatio).reversed())
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
        return buildStaffMap(numStaff, weekStart, numDays, false);
    }

    private Map<UUID, AutoScheduleService.StaffData> buildStaffMap(int numStaff,
                                                                     LocalDate weekStart,
                                                                     int numDays,
                                                                     boolean mixedContracts) {
        Map<UUID, AutoScheduleService.StaffData> map = new LinkedHashMap<>();
        for (int i = 0; i < numStaff; i++) {
            boolean isFullTime = !mixedContracts || (i % 2 == 0);
            String contractName = isFullTime ? "FULL_TIME" : "PART_TIME";
            int maxWeekly = isFullTime ? 48 : 24;

            String label = mixedContracts ? (isFullTime ? " (FT-48h)" : " (PT-24h)") : "";
            com.shiftsync.auth.entity.User user = com.shiftsync.auth.entity.User.builder()
                    .id(UUID.randomUUID())
                    .fullName("Staff-" + i + label)
                    .systemRole(com.shiftsync.shared.security.SystemRole.STAFF)
                    .build();
            com.shiftsync.employment.entity.ContractType contract =
                    com.shiftsync.employment.entity.ContractType.builder()
                            .name(contractName)
                            .maxWeeklyHours(maxWeekly)
                            .build();
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

    private void printStaffHoursTable(String scenarioName, Map<UUID, AutoScheduleService.StaffData> staffMap) {
        System.out.println("\n-------------------------------------------------------------------------------------------------------------------------------------------------");
        System.out.println(" BANG PHAN BO GIO LAM TUNG NHAN VIEN (GREEDY + MRV + LOCAL REPAIR) - " + scenarioName);
        System.out.println("-------------------------------------------------------------------------------------------------------------------------------------------------");
        System.out.printf("| %-36s | %-16s | %-12s | %-10s | %-14s | %-12s | %-20s |%n",
                "Staff ID (UUID)", "Ten NV", "Loai HD", "Max HD (h)", "Assigned (h)", "Util Ratio", "Monthly Assigned (h)");
        System.out.println("+--------------------------------------+------------------+--------------+------------+----------------+--------------+----------------------+");

        List<Double> activeHours = new ArrayList<>();
        List<Double> activeUtil = new ArrayList<>();

        for (AutoScheduleService.StaffData staff : staffMap.values()) {
            UUID id = staff.getEmployment().getUser().getId();
            String name = staff.getEmployment().getUser().getFullName();
            String contractName = staff.getEmployment().getContractType() != null && staff.getEmployment().getContractType().getName() != null
                    ? staff.getEmployment().getContractType().getName() : "STANDARD";
            int maxWeekly = staff.getMaxWeeklyHours();
            double assigned = staff.getAssignedHours();
            double util = maxWeekly > 0 ? (assigned / maxWeekly) * 100.0 : 0.0;
            double monthly = staff.getMonthlyAssignedHours();

            if (assigned > 0.0) {
                activeHours.add(assigned);
                activeUtil.add(util);
            }

            System.out.printf("| %-36s | %-16s | %-12s | %8d h | %12.2fh | %10.1f%% | %18.2fh |%n",
                    id, name, contractName, maxWeekly, assigned, util, monthly);
        }
        System.out.println("+--------------------------------------+------------------+--------------+------------+----------------+--------------+----------------------+");

        int totalStaff = staffMap.size();
        int activeCount = activeHours.size();

        if (activeCount > 0) {
            double minH = activeHours.stream().mapToDouble(Double::doubleValue).min().orElse(0.0);
            double maxH = activeHours.stream().mapToDouble(Double::doubleValue).max().orElse(0.0);
            double meanH = activeHours.stream().mapToDouble(Double::doubleValue).average().orElse(0.0);
            double stdevH = Math.sqrt(activeHours.stream().mapToDouble(h -> Math.pow(h - meanH, 2)).average().orElse(0.0));

            double minU = activeUtil.stream().mapToDouble(Double::doubleValue).min().orElse(0.0);
            double maxU = activeUtil.stream().mapToDouble(Double::doubleValue).max().orElse(0.0);
            double meanU = activeUtil.stream().mapToDouble(Double::doubleValue).average().orElse(0.0);
            double stdevU = Math.sqrt(activeUtil.stream().mapToDouble(u -> Math.pow(u - meanU, 2)).average().orElse(0.0));

            System.out.println("THONG KE PHAN BO GIO & TY LE SU DUNG HOP DONG (nhan vien duoc gan it nhat 1 slot):");
            System.out.printf("  - Tong so nhan vien                  : %d%n", totalStaff);
            System.out.printf("  - So nhan vien duoc gan (active)     : %d / %d (%.1f%%)%n",
                    activeCount, totalStaff, (double) activeCount / totalStaff * 100.0);
            System.out.printf("  - Min assignedHours                  : %.2f h%n", minH);
            System.out.printf("  - Max assignedHours                  : %.2f h%n", maxH);
            System.out.printf("  - Mean assignedHours                 : %.2f h%n", meanH);
            System.out.printf("  - Stdev assignedHours (Raw Hours)    : %.4f h%n", stdevH);
            System.out.printf("  - Min utilizationRatio               : %.2f%%%n", minU);
            System.out.printf("  - Max utilizationRatio               : %.2f%%%n", maxU);
            System.out.printf("  - Mean utilizationRatio              : %.2f%%%n", meanU);
            System.out.printf("  - Stdev utilizationRatio (%%)        : %.4f%%%n", stdevU);
        } else {
            System.out.println("Khong co nhan vien nao duoc gan slot.");
        }
        System.out.println("-------------------------------------------------------------------------------------------------------------------------------------------------\n");
    }

    private void printStaffComparisonTable(String scenarioName,
                                           Map<UUID, AutoScheduleService.StaffData> staffBefore,
                                           Map<UUID, AutoScheduleService.StaffData> staffAfter) {
        System.out.println("\n+=============================================================================================================================================================+");
        System.out.println("| BANG SO SANH PHAN BO GIO VA UTILIZATION RATIO (TRUOC FIX VS SAU FIX) - " + scenarioName);
        System.out.println("+=============================================================================================================================================================+");
        System.out.printf("| %-36s | %-16s | %-10s | %-10s | %-14s | %-13s | %-14s | %-13s |%n",
                "Staff ID (UUID)", "Ten NV", "Loai HD", "Max HD (h)", "Truoc Fix (h)", "Truoc Util(%)", "Sau Fix (h)", "Sau Util(%)");
        System.out.println("+--------------------------------------+------------------+------------+------------+----------------+---------------+----------------+---------------+");

        List<AutoScheduleService.StaffData> listBefore = new ArrayList<>(staffBefore.values());
        List<AutoScheduleService.StaffData> listAfter = new ArrayList<>(staffAfter.values());

        List<Double> activeHoursBefore = new ArrayList<>();
        List<Double> activeHoursAfter = new ArrayList<>();
        List<Double> activeUtilBefore = new ArrayList<>();
        List<Double> activeUtilAfter = new ArrayList<>();

        for (int i = 0; i < listAfter.size(); i++) {
            AutoScheduleService.StaffData sb = (i < listBefore.size()) ? listBefore.get(i) : null;
            AutoScheduleService.StaffData sa = listAfter.get(i);

            UUID id = sa.getEmployment().getUser().getId();
            String name = sa.getEmployment().getUser().getFullName();
            String contractName = sa.getEmployment().getContractType() != null && sa.getEmployment().getContractType().getName() != null
                    ? sa.getEmployment().getContractType().getName() : "STANDARD";
            int maxWeeklyHours = sa.getMaxWeeklyHours();

            double hBefore = sb != null ? sb.getAssignedHours() : 0.0;
            double utilBefore = maxWeeklyHours > 0 ? (hBefore / maxWeeklyHours) * 100.0 : 0.0;

            double hAfter = sa.getAssignedHours();
            double utilAfter = maxWeeklyHours > 0 ? (hAfter / maxWeeklyHours) * 100.0 : 0.0;

            if (hBefore > 0.0) {
                activeHoursBefore.add(hBefore);
                activeUtilBefore.add(utilBefore);
            }
            if (hAfter > 0.0) {
                activeHoursAfter.add(hAfter);
                activeUtilAfter.add(utilAfter);
            }

            System.out.printf("| %-36s | %-16s | %-10s | %8d h | %12.2fh | %12.1f%% | %12.2fh | %12.1f%% |%n",
                    id, name, contractName, maxWeeklyHours, hBefore, utilBefore, hAfter, utilAfter);
        }
        System.out.println("+--------------------------------------+------------------+------------+------------+----------------+---------------+----------------+---------------+");

        printStatisticsComparison(listAfter.size(), activeHoursBefore, activeUtilBefore, activeHoursAfter, activeUtilAfter);
    }

    private void printStatisticsComparison(int totalStaff,
                                           List<Double> hoursBefore, List<Double> utilBefore,
                                           List<Double> hoursAfter, List<Double> utilAfter) {
        int actBf = hoursBefore.size();
        int actAf = hoursAfter.size();

        double minHBf = hoursBefore.stream().mapToDouble(Double::doubleValue).min().orElse(0.0);
        double maxHBf = hoursBefore.stream().mapToDouble(Double::doubleValue).max().orElse(0.0);
        double meanHBf = hoursBefore.stream().mapToDouble(Double::doubleValue).average().orElse(0.0);
        double stdevHBf = Math.sqrt(hoursBefore.stream().mapToDouble(h -> Math.pow(h - meanHBf, 2)).average().orElse(0.0));

        double minHAf = hoursAfter.stream().mapToDouble(Double::doubleValue).min().orElse(0.0);
        double maxHAf = hoursAfter.stream().mapToDouble(Double::doubleValue).max().orElse(0.0);
        double meanHAf = hoursAfter.stream().mapToDouble(Double::doubleValue).average().orElse(0.0);
        double stdevHAf = Math.sqrt(hoursAfter.stream().mapToDouble(h -> Math.pow(h - meanHAf, 2)).average().orElse(0.0));

        double minUBf = utilBefore.stream().mapToDouble(Double::doubleValue).min().orElse(0.0);
        double maxUBf = utilBefore.stream().mapToDouble(Double::doubleValue).max().orElse(0.0);
        double meanUBf = utilBefore.stream().mapToDouble(Double::doubleValue).average().orElse(0.0);
        double stdevUBf = Math.sqrt(utilBefore.stream().mapToDouble(u -> Math.pow(u - meanUBf, 2)).average().orElse(0.0));

        double minUAf = utilAfter.stream().mapToDouble(Double::doubleValue).min().orElse(0.0);
        double maxUAf = utilAfter.stream().mapToDouble(Double::doubleValue).max().orElse(0.0);
        double meanUAf = utilAfter.stream().mapToDouble(Double::doubleValue).average().orElse(0.0);
        double stdevUAf = Math.sqrt(utilAfter.stream().mapToDouble(u -> Math.pow(u - meanUAf, 2)).average().orElse(0.0));

        System.out.println("THONG KE PHAN BO GIO VA TY LE SU DUNG HOP DONG (TRUOC FIX VS SAU FIX):");
        System.out.println("+------------------------------------+-----------------------+-----------------------+");
        System.out.printf("| %-34s | %-21s | %-21s |%n", "Chi so thong ke (active NV)", "Truoc Fix (Cu)", "Sau Fix (Moi)");
        System.out.println("+------------------------------------+-----------------------+-----------------------+");
        System.out.printf("| %-34s | %-21s | %-21s |%n", "So NV duoc gan (active)",
                String.format("%d / %d (%.1f%%)", actBf, totalStaff, totalStaff > 0 ? (double) actBf / totalStaff * 100.0 : 0.0),
                String.format("%d / %d (%.1f%%)", actAf, totalStaff, totalStaff > 0 ? (double) actAf / totalStaff * 100.0 : 0.0));
        System.out.printf("| %-34s | %20.2f h | %20.2f h |%n", "Min Assigned Hours", minHBf, minHAf);
        System.out.printf("| %-34s | %20.2f h | %20.2f h |%n", "Max Assigned Hours", maxHBf, maxHAf);
        System.out.printf("| %-34s | %20.2f h | %20.2f h |%n", "Mean Assigned Hours", meanHBf, meanHAf);
        System.out.printf("| %-34s | %20.4f h | %20.4f h |%n", "Stdev Assigned Hours (Raw)", stdevHBf, stdevHAf);
        System.out.println("+------------------------------------+-----------------------+-----------------------+");
        System.out.printf("| %-34s | %20.2f %% | %20.2f %% |%n", "Min Utilization Ratio", minUBf, minUAf);
        System.out.printf("| %-34s | %20.2f %% | %20.2f %% |%n", "Max Utilization Ratio", maxUBf, maxUAf);
        System.out.printf("| %-34s | %20.2f %% | %20.2f %% |%n", "Mean Utilization Ratio", meanUBf, meanUAf);
        System.out.printf("| %-34s | %20.4f %% | %20.4f %% |%n", "Stdev Utilization Ratio (%)", stdevUBf, stdevUAf);
        System.out.println("+------------------------------------+-----------------------+-----------------------+\n");
    }
    @Test
    public void testHeterogeneousAvailability() {
        runHeterogeneousAvailabilityScenario(LocalDate.of(2026, 9, 7), StoreConfiguration.builder().minRestHours(11).build());
    }

    public void runHeterogeneousAvailabilityScenario(LocalDate weekStart, StoreConfiguration storeConfig) {
        System.out.println("\n=========================================================================================");
        System.out.println("   SCENARIO MOI: HETEROGENEOUS AVAILABILITY (NHOM A KHOP SAT VS NHOM B RANH RONG)        ");
        System.out.println("=========================================================================================");
        System.out.println("Mo ta thuc nghiem:");
        System.out.println("  - Nhom A: 5 nhan vien (Staff-A0..A4) khai bao availability KHOP SAT ca (08:00 - 16:00)");
        System.out.println("  - Nhom B: 5 nhan vien (Staff-B0..B4) khai bao availability RANH RONG ca ngay (00:00 - 23:59)");
        System.out.println("  - Nhu cau ca: 20 slots ca 08:00 - 16:00 (4 slots/ngay trong 5 ngay, tong 160 gio)");
        System.out.println("  - So sanh: Thuat toan TRUOC FIX (availabilityScore cu) vs SAU FIX (availabilityScore=1.0)");
        System.out.println("-----------------------------------------------------------------------------------------");

        int numStaffPerGroup = 5;
        int numDays = 5;
        int slotsPerDay = 4;
        List<AutoScheduleService.Slot> slots = new ArrayList<>();

        for (int d = 0; d < numDays; d++) {
            LocalDate date = weekStart.plusDays(d);
            for (int s = 0; s < slotsPerDay; s++) {
                Shift shift = Shift.builder()
                        .id(UUID.randomUUID())
                        .shiftDate(date)
                        .startTime(LocalTime.of(8, 0))
                        .endTime(LocalTime.of(16, 0))
                        .status(com.shiftsync.shift.enums.ShiftStatus.DRAFT)
                        .requirements(List.of())
                        .build();
                slots.add(new AutoScheduleService.Slot(shift, null));
            }
        }

        // Cau hinh TRUOC FIX:
        // fairness=0.10, skill=0.30, hour=0.20, rest=0.10, avail=0.30
        SchedulerConfiguration schedConfigOld = SchedulerConfiguration.builder()
                .fairnessWeight(BigDecimal.valueOf(0.10))
                .skillWeight(BigDecimal.valueOf(0.30))
                .hourWeight(BigDecimal.valueOf(0.20))
                .restTimeWeight(BigDecimal.valueOf(0.10))
                .availabilityWeight(BigDecimal.valueOf(0.30))
                .build();

        // Cau hinh SAU FIX:
        // fairness=0.20, skill=0.25, hour=0.20, rest=0.15, avail=0.20
        SchedulerConfiguration schedConfigNew = SchedulerConfiguration.builder()
                .fairnessWeight(BigDecimal.valueOf(0.20))
                .skillWeight(BigDecimal.valueOf(0.25))
                .hourWeight(BigDecimal.valueOf(0.20))
                .restTimeWeight(BigDecimal.valueOf(0.15))
                .availabilityWeight(BigDecimal.valueOf(0.20))
                .build();

        // 1. Chay phien ban TRUOC FIX
        Map<UUID, AutoScheduleService.StaffData> staffMapBefore = buildHeterogeneousStaffMap(numStaffPerGroup, weekStart, numDays);
        runGreedyBeforeFix("Heterogeneous Availability (Truoc Fix)",
                new ArrayList<>(slots), staffMapBefore, schedConfigOld, storeConfig);

        // 2. Chay phien ban SAU FIX
        Map<UUID, AutoScheduleService.StaffData> staffMapAfter = buildHeterogeneousStaffMap(numStaffPerGroup, weekStart, numDays);
        runGreedy("Heterogeneous Availability (Sau Fix)",
                new ArrayList<>(slots), staffMapAfter, schedConfigNew, storeConfig);

        // 3. In bang so sanh chi tiet tung nhan vien truoc va sau fix
        printHeterogeneousComparisonTable(staffMapBefore, staffMapAfter);
    }

    private Map<UUID, AutoScheduleService.StaffData> buildHeterogeneousStaffMap(int numPerGroup,
                                                                                LocalDate weekStart,
                                                                                int numDays) {
        Map<UUID, AutoScheduleService.StaffData> map = new LinkedHashMap<>();

        // Nhom A: Khai bao ranh KHOP SAT (08:00 - 16:00)
        for (int i = 0; i < numPerGroup; i++) {
            com.shiftsync.auth.entity.User user = com.shiftsync.auth.entity.User.builder()
                    .id(UUID.randomUUID())
                    .fullName("Staff-A" + i + " (SatGio)")
                    .systemRole(com.shiftsync.shared.security.SystemRole.STAFF)
                    .build();
            com.shiftsync.employment.entity.ContractType contract =
                    com.shiftsync.employment.entity.ContractType.builder().maxWeeklyHours(48).build();
            com.shiftsync.employment.entity.Employment emp =
                    com.shiftsync.employment.entity.Employment.builder().user(user).contractType(contract).build();

            List<Availability> avails = new ArrayList<>();
            for (int d = 0; d < numDays; d++) {
                LocalDate date = weekStart.plusDays(d);
                short dow = (short) (date.getDayOfWeek().getValue() % 7);
                avails.add(Availability.builder()
                        .user(user).dayOfWeek(dow)
                        .startTime(LocalTime.of(8, 0))
                        .endTime(LocalTime.of(16, 0))
                        .build());
            }

            AutoScheduleService.StaffData sd = new AutoScheduleService.StaffData();
            sd.setEmployment(emp);
            sd.setSkills(List.of());
            sd.setAvailabilities(avails);
            sd.setBlackoutDates(List.of());
            sd.setCurrentSchedule(new ArrayList<>());
            sd.setAssignedHours(0.0);
            sd.setMonthlyShiftCount(0);
            sd.setMonthlyAssignedHours(0.0);
            map.put(user.getId(), sd);
        }

        // Nhom B: Khai bao ranh RONG ca ngay (00:00 - 23:59)
        for (int i = 0; i < numPerGroup; i++) {
            com.shiftsync.auth.entity.User user = com.shiftsync.auth.entity.User.builder()
                    .id(UUID.randomUUID())
                    .fullName("Staff-B" + i + " (RanhRong)")
                    .systemRole(com.shiftsync.shared.security.SystemRole.STAFF)
                    .build();
            com.shiftsync.employment.entity.ContractType contract =
                    com.shiftsync.employment.entity.ContractType.builder().maxWeeklyHours(48).build();
            com.shiftsync.employment.entity.Employment emp =
                    com.shiftsync.employment.entity.Employment.builder().user(user).contractType(contract).build();

            List<Availability> avails = new ArrayList<>();
            for (int d = 0; d < numDays; d++) {
                LocalDate date = weekStart.plusDays(d);
                short dow = (short) (date.getDayOfWeek().getValue() % 7);
                avails.add(Availability.builder()
                        .user(user).dayOfWeek(dow)
                        .startTime(LocalTime.of(0, 0))
                        .endTime(LocalTime.of(23, 59))
                        .build());
            }

            AutoScheduleService.StaffData sd = new AutoScheduleService.StaffData();
            sd.setEmployment(emp);
            sd.setSkills(List.of());
            sd.setAvailabilities(avails);
            sd.setBlackoutDates(List.of());
            sd.setCurrentSchedule(new ArrayList<>());
            sd.setAssignedHours(0.0);
            sd.setMonthlyShiftCount(0);
            sd.setMonthlyAssignedHours(0.0);
            map.put(user.getId(), sd);
        }

        return map;
    }

    private BenchmarkResult runGreedyBeforeFix(String scenario,
                                               List<AutoScheduleService.Slot> slots,
                                               Map<UUID, AutoScheduleService.StaffData> staffMap,
                                               SchedulerConfiguration schedConfigOld,
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
                // Truoc fix: khong co soft fairness cap (truyen teamMonthlyAvg = 0.0)
                List<AutoScheduleService.StaffData> candidates =
                        greedyService.findValidCandidates(s, staffMap.values(), minRestHours, 0.0);

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
            // Truoc fix: tie-break bang hash co dinh cua staff ID
            AutoScheduleService.StaffData best = bestCandidates.stream()
                    .max(Comparator.comparingDouble((AutoScheduleService.StaffData e) ->
                            calculateScoreBeforeFix(greedyService, e, finalSlot, schedConfigOld, minRestHours))
                            .thenComparing(e -> e.getEmployment().getUser().getId().toString().hashCode() * -1))
                    .orElse(bestCandidates.get(0));

            double score = calculateScoreBeforeFix(greedyService, best, finalSlot, schedConfigOld, minRestHours);
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
                    unassignedSlots, newAssignments, staffMap, schedConfigOld, storeConfig);
        }

        long runtimeMs = System.currentTimeMillis() - start;
        return new BenchmarkResult(scenario, "Greedy (Truoc Fix)", slots.size(),
                newAssignments.size(), totalScore, runtimeMs, "N/A (deterministic)");
    }

    private double calculateScoreBeforeFix(AutoScheduleService helper,
                                           AutoScheduleService.StaffData empData,
                                           AutoScheduleService.Slot slot,
                                           SchedulerConfiguration configOld,
                                           int minRestHours) {
        // Dung config voi availabilityWeight = 0 de lay base score (skill, hour, fairness, rest)
        SchedulerConfiguration baseConfig = SchedulerConfiguration.builder()
                .skillWeight(configOld.getSkillWeight())
                .hourWeight(configOld.getHourWeight())
                .fairnessWeight(configOld.getFairnessWeight())
                .restTimeWeight(configOld.getRestTimeWeight())
                .availabilityWeight(BigDecimal.ZERO)
                .build();

        double baseScore = helper.calculateScore(empData, slot, baseConfig, minRestHours);
        double oldAvailScore = getAvailabilityScoreOld(empData, slot.getShift());
        double availWeight = configOld.getAvailabilityWeight() != null ? configOld.getAvailabilityWeight().doubleValue() : 0.30;

        return baseScore + (availWeight * oldAvailScore);
    }

    private double getAvailabilityScoreOld(AutoScheduleService.StaffData empData, Shift newShift) {
        short shiftDayOfWeek = (short) (newShift.getShiftDate().getDayOfWeek().getValue() % 7);
        long shiftMinutes = Duration.between(newShift.getStartTime(), newShift.getEndTime()).toMinutes();
        if (shiftMinutes <= 0) shiftMinutes += 24 * 60;

        double maxScore = 0.0;
        for (Availability a : empData.getAvailabilities()) {
            if (a.getDayOfWeek() == shiftDayOfWeek
                    && !a.getStartTime().isAfter(newShift.getStartTime())
                    && !a.getEndTime().isBefore(newShift.getEndTime())) {
                long availMinutes = Duration.between(a.getStartTime(), a.getEndTime()).toMinutes();
                if (availMinutes <= 0) availMinutes += 24 * 60;
                double score = (double) shiftMinutes / availMinutes;
                if (score > maxScore) {
                    maxScore = score;
                }
            }
        }
        return maxScore > 0 ? maxScore : 1.0;
    }

    private void printHeterogeneousComparisonTable(Map<UUID, AutoScheduleService.StaffData> staffBefore,
                                                   Map<UUID, AutoScheduleService.StaffData> staffAfter) {
        System.out.println("\n+=======================================================================================================================+");
        System.out.println("|                     SO SANH PHAN BO GIO: TRUOC FIX VS SAU FIX TRONG HETEROGENEOUS AVAILABILITY                        |");
        System.out.println("+=======================================================================================================================+");
        System.out.printf("| %-36s | %-24s | %-16s | %-14s | %-14s |%n",
                "Staff ID (UUID)", "Ten NV", "Nhom", "Truoc Fix (h)", "Sau Fix (h)");
        System.out.println("+--------------------------------------+--------------------------+------------------+----------------+----------------+");

        List<AutoScheduleService.StaffData> listBefore = new ArrayList<>(staffBefore.values());
        List<AutoScheduleService.StaffData> listAfter = new ArrayList<>(staffAfter.values());

        double sumBeforeA = 0, sumBeforeB = 0;
        double sumAfterA = 0, sumAfterB = 0;
        List<Double> hoursBefore = new ArrayList<>();
        List<Double> hoursAfter = new ArrayList<>();

        for (int i = 0; i < listBefore.size(); i++) {
            AutoScheduleService.StaffData sb = listBefore.get(i);
            AutoScheduleService.StaffData sa = listAfter.get(i);

            String name = sb.getEmployment().getUser().getFullName();
            UUID id = sb.getEmployment().getUser().getId();
            boolean isGroupA = name.contains("SatGio");
            String groupName = isGroupA ? "Nhom A (8-16h)" : "Nhom B (0-24h)";

            double hBefore = sb.getAssignedHours();
            double hAfter = sa.getAssignedHours();

            hoursBefore.add(hBefore);
            hoursAfter.add(hAfter);

            if (isGroupA) {
                sumBeforeA += hBefore;
                sumAfterA += hAfter;
            } else {
                sumBeforeB += hBefore;
                sumAfterB += hAfter;
            }

            System.out.printf("| %-36s | %-24s | %-16s | %13.2fh | %13.2fh |%n",
                    id, name, groupName, hBefore, hAfter);
        }
        System.out.println("+--------------------------------------+--------------------------+------------------+----------------+----------------+");

        int countA = 5, countB = 5;
        System.out.printf("| %-36s | %-24s | %-16s | %13.2fh | %13.2fh |%n",
                "-", "TONG GIO NHOM A", "5 NV (Sat gio)", sumBeforeA, sumAfterA);
        System.out.printf("| %-36s | %-24s | %-16s | %13.2fh | %13.2fh |%n",
                "-", "TONG GIO NHOM B", "5 NV (Ranh rong)", sumBeforeB, sumAfterB);
        System.out.printf("| %-36s | %-24s | %-16s | %13.2fh | %13.2fh |%n",
                "-", "TRUNG BINH NHOM A", "1 NV (Sat gio)", sumBeforeA / countA, sumAfterA / countA);
        System.out.printf("| %-36s | %-24s | %-16s | %13.2fh | %13.2fh |%n",
                "-", "TRUNG BINH NHOM B", "1 NV (Ranh rong)", sumBeforeB / countB, sumAfterB / countB);

        double totalBefore = sumBeforeA + sumBeforeB;
        double totalAfter = sumAfterA + sumAfterB;
        System.out.println("+--------------------------------------+--------------------------+------------------+----------------+----------------+");
        System.out.printf("| %-36s | %-24s | %-16s | %12.1f%% | %12.1f%% |%n",
                "-", "TY LE PHAN BO NHOM A", "% ca", totalBefore == 0 ? 0 : (sumBeforeA / totalBefore * 100), totalAfter == 0 ? 0 : (sumAfterA / totalAfter * 100));
        System.out.printf("| %-36s | %-24s | %-16s | %12.1f%% | %12.1f%% |%n",
                "-", "TY LE PHAN BO NHOM B", "% ca", totalBefore == 0 ? 0 : (sumBeforeB / totalBefore * 100), totalAfter == 0 ? 0 : (sumAfterB / totalAfter * 100));

        double meanBf = hoursBefore.stream().mapToDouble(Double::doubleValue).average().orElse(0.0);
        double stdevBf = Math.sqrt(hoursBefore.stream().mapToDouble(h -> Math.pow(h - meanBf, 2)).average().orElse(0.0));
        double meanAf = hoursAfter.stream().mapToDouble(Double::doubleValue).average().orElse(0.0);
        double stdevAf = Math.sqrt(hoursAfter.stream().mapToDouble(h -> Math.pow(h - meanAf, 2)).average().orElse(0.0));

        System.out.println("+--------------------------------------+--------------------------+------------------+----------------+----------------+");
        System.out.printf("| %-36s | %-24s | %-16s | %13.4fh | %13.4fh |%n",
                "-", "DO LECH CHUAN (STDEV)", "10 NV", stdevBf, stdevAf);
        System.out.println("+=======================================================================================================================+\n");
    }
}