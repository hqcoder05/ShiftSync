package com.shiftsync.shift.service;

import com.shiftsync.shift.entity.Shift;
import com.shiftsync.shift.entity.ShiftAssignment;
import com.shiftsync.shift.enums.AssignmentSource;
import com.shiftsync.store.entity.SchedulerConfiguration;
import com.shiftsync.store.entity.StoreConfiguration;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;

/**
 * <b>Proof-of-Concept (PoC) & Benchmark -- KHÔNG dùng trong production.</b>
 *
 * <p>Triển khai bài toán Auto-Scheduling bằng Google OR-Tools CP-SAT solver (Constraint Programming - Satisfiability).
 * Mục đích duy nhất là <b>đo lường và so sánh chất lượng nghiệm</b> với thuật toán production
 * {@link AutoScheduleService} (Greedy + Dynamic MRV + Local Repair).
 *
 * <p><b>CẤU HÌNH & KÍCH HOẠT MAVEN PROFILE:</b>
 * <ul>
 *   <li>Mặc định trong CI/CD (GitHub Actions) và Docker container (Linux), module này bị LOẠI BỎ khỏi test-compile
 *       để tránh lỗi {@code UnsatisfiedLinkError} do thiếu thư viện native C++.</li>
 *   <li>Để kích hoạt biên dịch và kiểm thử module này:
 *       <pre>mvn test -P cpsat-benchmark</pre>
 *   </li>
 *   <li>Để thực thi benchmark đo lường trực tiếp:
 *       <pre>mvn test-compile org.codehaus.mojo:exec-maven-plugin:3.1.0:java \
 *           -Dexec.mainClass="com.shiftsync.shift.service.ScheduleComparisonBenchmark" \
 *           -Dexec.classpathScope="test" -P cpsat-benchmark</pre>
 *   </li>
 *   <li><b>Yêu cầu hệ thống:</b> Kiến trúc CPU x86-64 trên Windows (ortools-win32-x86-64)
 *       hoặc Linux (ortools-linux-x86-64 glibc). Bản 9.11.4210 tương thích Java 21 LTS.</li>
 * </ul>
 *
 * <p><b>Mô hình CP-SAT:</b>
 * <pre>
 *   Biến:  x[staff][slot] in {0,1}  -- BoolVar
 *   Ràng buộc cứng:
 *     HC1-HC5 được lọc tiền xử lý (eligiblePairs) -> chỉ tạo BoolVar cho cặp hợp lệ
 *     addAtMostOne per slot: sum(x[*][slot]) <= 1
 *     HC4 (max weekly hours): sum(duration[s] * x[staff][s]) <= maxWeeklyHours * 60 (phút)
 *     HC3+HC5 (overlap/rest): x[staff][s1] + x[staff][s2] <= 1 cho mỗi cặp (s1, s2) xung đột
 *   Mục tiêu: maximize sum(score(staff, slot) * 1000 * x[staff][slot])
 *   Timeout: 10 giây -> dùng FEASIBLE nếu chưa đạt OPTIMAL
 * </pre>
 *
 * @see AutoScheduleService
 * @see ScheduleComparisonBenchmark
 */
public class CpSatAutoScheduleService {

    private static final Logger log = LoggerFactory.getLogger(CpSatAutoScheduleService.class);

    /** He so nhan de chuyen soft score (0.0-1.0) sang integer cho CP-SAT objective. */
    private static final int SCORE_SCALE_FACTOR = 1000;

    /** Timeout toi da cho CP-SAT solver (giay). */
    private static final double SOLVER_TIMEOUT_SECONDS = 10.0;

    /** Cap (staff, slot) hop le da qua HC1-HC5. */
    static class EligiblePair {
        final AutoScheduleService.StaffData staff;
        final AutoScheduleService.Slot slot;
        final double score;

        EligiblePair(AutoScheduleService.StaffData staff, AutoScheduleService.Slot slot, double score) {
            this.staff = staff;
            this.slot = slot;
            this.score = score;
        }
    }

    /** Ket qua tra ve cua CP-SAT solver. */
    public static class CpSatResult {
        public final List<ShiftAssignment> assignments;
        public final double totalScore;
        public final long runtimeMs;
        /** "OPTIMAL", "FEASIBLE", "INFEASIBLE", "UNKNOWN", "NOT_RUN" */
        public final String solverStatus;

        public CpSatResult(List<ShiftAssignment> assignments, double totalScore,
                           long runtimeMs, String solverStatus) {
            this.assignments = assignments;
            this.totalScore = totalScore;
            this.runtimeMs = runtimeMs;
            this.solverStatus = solverStatus;
        }
    }

    /**
     * Chay CP-SAT solver de xep ca toi uu.
     *
     * QUAN TRONG - CHUA CHAY DUOC THUC TE: Xem Javadoc class de biet chi tiet.
     *
     * @param slots       danh sach slot can xep ca (da flatten)
     * @param staffMap    map staffId to StaffData
     * @param schedConfig cau hinh trong so scoring
     * @param storeConfig cau hinh cua hang (minRestHours)
     * @return CpSatResult chua assignments, totalScore, runtimeMs, solverStatus
     */
    public CpSatResult solve(List<AutoScheduleService.Slot> slots,
                             Map<UUID, AutoScheduleService.StaffData> staffMap,
                             SchedulerConfiguration schedConfig,
                             StoreConfiguration storeConfig) {
        long startTime = System.currentTimeMillis();

        // Buoc 0: Thu load OR-Tools native library.
        try {
            com.google.ortools.Loader.loadNativeLibraries();
        } catch (Exception | Error e) {
            log.error("CP-SAT PoC: Khong the load OR-Tools native library. " +
                      "Expected failure neu moi truong khong phai Windows x86-64. Error: {}", e.getMessage());
            return new CpSatResult(Collections.emptyList(), 0.0,
                    System.currentTimeMillis() - startTime, "NOT_RUN");
        }

        // Buoc 1: Tao model
        com.google.ortools.sat.CpModel model = new com.google.ortools.sat.CpModel();

        // Buoc 2: Tien xu ly -- chi tao BoolVar cho cap (staff, slot) hop le (HC1-HC5)
        // Su dung AutoScheduleService helper methods (same package, package-private access)
        AutoScheduleService helperService = new AutoScheduleService(
                null, null, null, null, null, null, null, null);
        int minRestHours = storeConfig.getMinRestHours();

        List<EligiblePair> eligiblePairs = new ArrayList<>();
        List<com.google.ortools.sat.BoolVar> allVars = new ArrayList<>();
        Map<Integer, List<Integer>> slotPairIndices = new HashMap<>();
        Map<UUID, List<long[]>> staffPairDurations = new HashMap<>();

        for (int si = 0; si < slots.size(); si++) {
            AutoScheduleService.Slot slot = slots.get(si);
            // findValidCandidates is package-private in AutoScheduleService (same package)
            List<AutoScheduleService.StaffData> candidates =
                    helperService.findValidCandidates(slot, staffMap.values(), minRestHours);

            List<Integer> pairsForSlot = new ArrayList<>();
            for (AutoScheduleService.StaffData staff : candidates) {
                // calculateScore is package-private in AutoScheduleService (same package)
                double score = helperService.calculateScore(staff, slot, schedConfig, minRestHours);
                int pairIdx = eligiblePairs.size();
                eligiblePairs.add(new EligiblePair(staff, slot, score));

                String varName = "x_" + staff.getEmployment().getUser().getId() + "_s" + si;
                com.google.ortools.sat.BoolVar var = model.newBoolVar(varName);
                allVars.add(var);
                pairsForSlot.add(pairIdx);

                UUID staffId = staff.getEmployment().getUser().getId();
                long durationMins = Math.round(getDurationHours(slot.getShift()) * 60);
                staffPairDurations.computeIfAbsent(staffId, k -> new ArrayList<>())
                                  .add(new long[]{pairIdx, durationMins});
            }
            slotPairIndices.put(si, pairsForSlot);
        }

        // Buoc 3: addAtMostOne per slot
        for (int si = 0; si < slots.size(); si++) {
            List<Integer> pairsForSlot = slotPairIndices.getOrDefault(si, List.of());
            if (pairsForSlot.size() > 1) {
                com.google.ortools.sat.BoolVar[] slotVarArr = pairsForSlot.stream()
                        .map(allVars::get)
                        .toArray(com.google.ortools.sat.BoolVar[]::new);
                model.addAtMostOne(slotVarArr);
            }
        }

        // Buoc 4: HC4 -- max weekly hours per staff (minutes scale)
        for (Map.Entry<UUID, List<long[]>> entry : staffPairDurations.entrySet()) {
            UUID staffId = entry.getKey();
            AutoScheduleService.StaffData staffData = staffMap.get(staffId);
            if (staffData == null) continue;

            Map<java.time.LocalDate, List<long[]>> byWeek = new HashMap<>();
            for (long[] tuple : entry.getValue()) {
                int pairIdx = (int) tuple[0];
                AutoScheduleService.Slot slot = eligiblePairs.get(pairIdx).slot;
                java.time.LocalDate weekStart = slot.getShift().getShiftDate()
                        .with(java.time.DayOfWeek.MONDAY);
                byWeek.computeIfAbsent(weekStart, k -> new ArrayList<>()).add(tuple);
            }

            for (Map.Entry<java.time.LocalDate, List<long[]>> weekEntry : byWeek.entrySet()) {
                List<long[]> weekTuples = weekEntry.getValue();
                // getWeeklyHours is package-private in AutoScheduleService (same package)
                long alreadyMins = Math.round(
                        helperService.getWeeklyHours(staffData, weekEntry.getKey()) * 60);
                long maxMins = (long) staffData.getMaxWeeklyHours() * 60L - alreadyMins;

                com.google.ortools.sat.LinearExprBuilder weekExpr =
                        com.google.ortools.sat.LinearExpr.newBuilder();
                for (long[] tuple : weekTuples) {
                    weekExpr.addTerm(allVars.get((int) tuple[0]), tuple[1]);
                }
                model.addLessOrEqual(weekExpr, maxMins);
            }
        }

        // Buoc 5: HC3+HC5 -- conflict pairs: x[staff][s1] + x[staff][s2] <= 1
        for (Map.Entry<UUID, List<long[]>> entry : staffPairDurations.entrySet()) {
            List<long[]> tuples = entry.getValue();
            for (int i = 0; i < tuples.size(); i++) {
                for (int j = i + 1; j < tuples.size(); j++) {
                    int pi = (int) tuples.get(i)[0];
                    int pj = (int) tuples.get(j)[0];
                    Shift si2 = eligiblePairs.get(pi).slot.getShift();
                    Shift sj2 = eligiblePairs.get(pj).slot.getShift();
                    // Nếu 2 ca cách nhau hơn 1 ngày thì không thể conflict với minRestHours <= 24
                    if (Math.abs(si2.getShiftDate().toEpochDay() - sj2.getShiftDate().toEpochDay()) > 1) {
                        continue;
                    }
                    if (wouldConflict(si2, sj2, minRestHours)) {
                        model.addLessOrEqual(
                                com.google.ortools.sat.LinearExpr.newBuilder()
                                        .add(allVars.get(pi))
                                        .add(allVars.get(pj)),
                                1
                        );
                    }
                }
            }
        }

        // Buoc 6: Maximize tong soft score (scale x 1000 -> integer)
        com.google.ortools.sat.LinearExprBuilder objective =
                com.google.ortools.sat.LinearExpr.newBuilder();
        for (int pi = 0; pi < eligiblePairs.size(); pi++) {
            long scaledScore = Math.round(eligiblePairs.get(pi).score * SCORE_SCALE_FACTOR);
            objective.addTerm(allVars.get(pi), scaledScore);
        }
        model.maximize(objective);

        // Buoc 7: Chay solver voi timeout 10s
        com.google.ortools.sat.CpSolver solver = new com.google.ortools.sat.CpSolver();
        solver.getParameters().setMaxTimeInSeconds(SOLVER_TIMEOUT_SECONDS);
        solver.getParameters().setNumWorkers(1);

        com.google.ortools.sat.CpSolverStatus status = solver.solve(model);
        long runtimeMs = System.currentTimeMillis() - startTime;

        String statusStr = switch (status) {
            case OPTIMAL -> "OPTIMAL";
            case FEASIBLE -> "FEASIBLE";
            case INFEASIBLE -> "INFEASIBLE";
            default -> "UNKNOWN";
        };
        log.info("CP-SAT PoC: status={}, runtimeMs={}", statusStr, runtimeMs);

        if (status != com.google.ortools.sat.CpSolverStatus.OPTIMAL
                && status != com.google.ortools.sat.CpSolverStatus.FEASIBLE) {
            return new CpSatResult(Collections.emptyList(), 0.0, runtimeMs, statusStr);
        }

        // Buoc 8: Thu thap ket qua
        List<ShiftAssignment> resultAssignments = new ArrayList<>();
        double totalScore = 0.0;
        for (int pi = 0; pi < eligiblePairs.size(); pi++) {
            if (solver.booleanValue(allVars.get(pi))) {
                EligiblePair pair = eligiblePairs.get(pi);
                resultAssignments.add(ShiftAssignment.builder()
                        .shift(pair.slot.getShift())
                        .staff(pair.staff.getEmployment().getUser())
                        .requiredSkillId(pair.slot.getSkillId())
                        .source(AssignmentSource.AUTO)
                        .build());
                totalScore += pair.score;
            }
        }

        return new CpSatResult(resultAssignments, totalScore, runtimeMs, statusStr);
    }

    /** Kiem tra 2 ca co xung dot (overlap hoac vi pham rest time) khong. */
    private boolean wouldConflict(Shift s1, Shift s2, int minRestHours) {
        LocalDateTime start1 = LocalDateTime.of(s1.getShiftDate(), s1.getStartTime());
        LocalDateTime end1 = LocalDateTime.of(s1.getShiftDate(), s1.getEndTime());
        if (end1.isBefore(start1)) end1 = end1.plusDays(1);

        LocalDateTime start2 = LocalDateTime.of(s2.getShiftDate(), s2.getStartTime());
        LocalDateTime end2 = LocalDateTime.of(s2.getShiftDate(), s2.getEndTime());
        if (end2.isBefore(start2)) end2 = end2.plusDays(1);

        if (start1.isBefore(end2) && end1.isAfter(start2)) return true;

        long hoursBetween;
        if (end1.isBefore(start2) || end1.isEqual(start2)) {
            hoursBetween = Duration.between(end1, start2).toHours();
        } else {
            hoursBetween = Duration.between(end2, start1).toHours();
        }
        return hoursBetween < minRestHours;
    }

    /** Lay thoi luong ca tinh bang gio (double), ho tro ca qua dem. */
    private double getDurationHours(Shift shift) {
        LocalDateTime start = LocalDateTime.of(shift.getShiftDate(), shift.getStartTime());
        LocalDateTime end = LocalDateTime.of(shift.getShiftDate(), shift.getEndTime());
        if (end.isBefore(start)) end = end.plusDays(1);
        return Duration.between(start, end).toMinutes() / 60.0;
    }
}