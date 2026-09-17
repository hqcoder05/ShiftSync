package com.shiftsync.quota.service;

import com.shiftsync.layout.entity.StoreZone;
import com.shiftsync.layout.repository.StoreZoneRepository;
import com.shiftsync.quota.dto.*;
import com.shiftsync.shift.entity.Shift;
import com.shiftsync.shift.entity.ShiftSkillRequirement;
import com.shiftsync.shift.enums.ShiftStatus;
import com.shiftsync.shift.repository.ShiftAssignmentRepository;
import com.shiftsync.shift.repository.ShiftRepository;
import com.shiftsync.skill.entity.Skill;
import com.shiftsync.skill.repository.SkillRepository;
import com.shiftsync.store.entity.Store;
import com.shiftsync.store.repository.StoreRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import com.shiftsync.shared.exception.BusinessException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class HeadcountQuotaService {

    private final StoreRepository storeRepository;
    private final SkillRepository skillRepository;
    private final ShiftRepository shiftRepository;
    private final StoreZoneRepository storeZoneRepository;
    private final ShiftAssignmentRepository shiftAssignmentRepository;

    private static final long MONTHLY_BUDGET_STANDARD = 85_000_000L;
    private final Map<UUID, Long> storeMonthlyBudgets = new ConcurrentHashMap<>();
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DateTimeFormatter SHORT_DATE_FORMATTER = DateTimeFormatter.ofPattern("dd/MM");

    public LocalTime getStoreOpenTime(Store store) {
        if (store != null && store.getOpenTime() != null) {
            return store.getOpenTime();
        }
        return LocalTime.of(8, 0);
    }

    public LocalTime getStoreCloseTime(Store store) {
        if (store != null && store.getCloseTime() != null) {
            return store.getCloseTime();
        }
        return LocalTime.of(22, 0);
    }

    public LocalTime getStoreMidTime(Store store) {
        LocalTime open = getStoreOpenTime(store);
        LocalTime close = getStoreCloseTime(store);
        long minutes = java.time.Duration.between(open, close).toMinutes();
        if (minutes <= 0) minutes = 14 * 60;
        return open.plusMinutes(minutes / 2);
    }

    private List<Integer> generateTimelineHours(LocalTime start, LocalTime end) {
        List<Integer> hours = new ArrayList<>();
        int s = start.getHour();
        int e = end.getHour();
        for (int h = s; h <= e; h += 2) {
            hours.add(h);
        }
        return hours;
    }

    // In-memory cache for dynamic Min/Target/Max overrides per store and position
    private final Map<String, PositionNormOverride> normOverrides = new ConcurrentHashMap<>();

    private static class PositionNormOverride {
        int min;
        int target;
        int max;
        PositionNormOverride(int min, int target, int max) {
            this.min = min;
            this.target = target;
            this.max = max;
        }
    }

    /**
     * GET /api/branches
     */
    @Transactional(readOnly = true)
    public List<BranchDTO> getBranches() {
        return storeRepository.findAll().stream()
                .map(store -> BranchDTO.builder()
                        .id(store.getId())
                        .name(store.getName())
                        .code("CN-" + store.getId().toString().substring(0, 6).toUpperCase())
                        .address(store.getAddress() != null ? store.getAddress() : "Khu vực trung tâm")
                        .format(store.getFormat() != null ? store.getFormat() : "Standard")
                        .build())
                .collect(Collectors.toList());
    }

    /**
     * GET /api/positions?branchId=
     * Filters out Leader/Manager to return only operational roles.
     */
    @Transactional(readOnly = true)
    public List<PositionDTO> getPositions(UUID branchId) {
        List<Skill> skills = skillRepository.findByStoreId(branchId);
        List<PositionDTO> operationalPositions = new ArrayList<>();

        for (Skill s : skills) {
            String nameLower = s.getName().toLowerCase();
            if (isGeneralStoreManager(nameLower)) {
                continue; // Only exclude store manager / store owner
            }
            operationalPositions.add(mapSkillToPositionDTO(branchId, s));
        }

        // If store doesn't have custom operational skills, provide standard operational roles
        if (operationalPositions.isEmpty()) {
            operationalPositions.add(createDefaultPosition(branchId, "Barista", "BARISTA", "Pha chế & Quầy", 28000L, "purple", "coffee", 1, 2, 4, "ALL"));
            operationalPositions.add(createDefaultPosition(branchId, "Cashier", "CASHIER", "Order & Tính tiền", 26000L, "amber", "credit-card", 1, 2, 2, "PEAK_ONLY"));
            operationalPositions.add(createDefaultPosition(branchId, "Waiter", "WAITER", "Sảnh & Bàn khách", 25000L, "blue", "utensils", 1, 2, 3, "ALL"));
        }

        return operationalPositions;
    }

    private boolean isGeneralStoreManager(String nameLower) {
        return nameLower.contains("store manager") || nameLower.contains("cửa hàng trưởng")
            || nameLower.contains("quản lý cửa hàng") || nameLower.contains("chủ cửa hàng") || nameLower.contains("owner");
    }

    private PositionDTO mapSkillToPositionDTO(UUID branchId, Skill s) {
        String name = s.getName();
        String nameLower = name.toLowerCase();

        long hourlyRate = 26000L;
        String color = "purple";
        String icon = "coffee";
        int defaultMin = 1;
        int defaultTarget = 2;
        int defaultMax = 3;
        String shiftScope = "ALL";
        String code = "POSITION";
        String desc = s.getDescription() != null ? s.getDescription() : "Vị trí trực tiếp";

        if (nameLower.contains("barista") || nameLower.contains("pha chế")) {
            code = "BARISTA";
            name = "Barista";
            hourlyRate = 28000L;
            color = "purple";
            icon = "coffee";
            defaultMin = 1;
            defaultTarget = 2;
            defaultMax = 4;
            shiftScope = "ALL";
            desc = "Pha chế & Quầy";
        } else if (nameLower.contains("thu ngân") || nameLower.contains("cashier")) {
            code = "CASHIER";
            name = "Cashier";
            hourlyRate = 26000L;
            color = "amber";
            icon = "credit-card";
            defaultMin = 1;
            defaultTarget = 2;
            defaultMax = 2;
            shiftScope = "PEAK_ONLY";
            desc = "Order & Tính tiền";
        } else if (nameLower.contains("bếp") || nameLower.contains("kitchen")) {
            code = "KITCHEN";
            name = "Kitchen";
            hourlyRate = 30000L;
            color = "orange";
            icon = "utensils";
            defaultMin = 1;
            defaultTarget = 2;
            defaultMax = 3;
            shiftScope = "ALL";
            desc = "Bếp nóng & Bánh";
        } else if (nameLower.contains("waiter") || nameLower.contains("phục vụ") || nameLower.contains("sảnh") || nameLower.contains("bàn")) {
            code = "WAITER";
            name = "Waiter";
            hourlyRate = 25000L;
            color = "blue";
            icon = "utensils";
            defaultMin = 1;
            defaultTarget = 2;
            defaultMax = 3;
            shiftScope = "ALL";
            desc = "Sảnh & Bàn khách";
        } else if (nameLower.contains("leader") || nameLower.contains("trưởng ca") || nameLower.contains("giám sát") || nameLower.contains("supervisor")) {
            code = "LEADER";
            name = "Trưởng ca";
            hourlyRate = 35000L;
            color = "indigo";
            icon = "badge";
            defaultMin = 1;
            defaultTarget = 1;
            defaultMax = 1;
            shiftScope = "ALL";
            desc = "Điều phối & Giám sát ca";
        }

        // Check custom overrides
        String key = branchId + "_" + s.getId();
        PositionNormOverride override = normOverrides.get(key);
        if (override != null) {
            defaultMin = override.min;
            defaultTarget = override.target;
            defaultMax = override.max;
        }

        return PositionDTO.builder()
                .id(s.getId())
                .name(name)
                .code(code)
                .description(desc)
                .hourlyRate(hourlyRate)
                .color(color)
                .icon(icon)
                .defaultMin(defaultMin)
                .defaultTarget(defaultTarget)
                .defaultMax(defaultMax)
                .shiftScope(shiftScope)
                .build();
    }

    private PositionDTO createDefaultPosition(UUID branchId, String name, String code, String desc,
                                              long rate, String color, String icon,
                                              int min, int target, int max, String scope) {
        UUID tempId = UUID.nameUUIDFromBytes((branchId.toString() + "_" + code).getBytes());
        String key = branchId + "_" + tempId;
        PositionNormOverride override = normOverrides.get(key);
        if (override != null) {
            min = override.min;
            target = override.target;
            max = override.max;
        }
        return PositionDTO.builder()
                .id(tempId)
                .name(name)
                .code(code)
                .description(desc)
                .hourlyRate(rate)
                .color(color)
                .icon(icon)
                .defaultMin(min)
                .defaultTarget(target)
                .defaultMax(max)
                .shiftScope(scope)
                .build();
    }

    /**
     * GET /api/headcount-quotas?branchId=&date=
     */
    @Transactional
    public DailyQuotaResponse getDailyQuotas(UUID branchId, LocalDate date) {
        Store store = storeRepository.findById(branchId).orElse(null);
        String storeName = store != null ? store.getName() : "ShiftSync Store";

        List<PositionDTO> positions = getPositions(branchId);
        List<Shift> shifts = shiftRepository.findByStoreIdAndShiftDate(branchId, date);

        LocalTime open = getStoreOpenTime(store);
        LocalTime mid = getStoreMidTime(store);
        LocalTime close = getStoreCloseTime(store);

        String openStr = String.format("%02d:%02d", open.getHour(), open.getMinute());
        String midStr = String.format("%02d:%02d", mid.getHour(), mid.getMinute());
        String closeStr = String.format("%02d:%02d", close.getHour(), close.getMinute());

        // Ensure 2 default operational shifts exist within store hours
        Shift morningShift = getOrCreateShift(store, date, open, mid, "Ca Sáng");
        Shift afternoonShift = getOrCreateShift(store, date, mid, close, "Ca Chiều");

        List<DailyQuotaResponse.DailyShiftQuota> shiftQuotas = new ArrayList<>();
        shiftQuotas.add(buildDailyShiftQuota(morningShift, "Ca Sáng (" + openStr + "-" + midStr + ")", openStr, midStr, generateTimelineHours(open, mid), positions, true));
        shiftQuotas.add(buildDailyShiftQuota(afternoonShift, "Ca Chiều (" + midStr + "-" + closeStr + ")", midStr, closeStr, generateTimelineHours(mid, close), positions, false));

        // Evaluate Position KPIs
        List<DailyQuotaResponse.DailyPositionKpi> kpis = new ArrayList<>();
        int totalAssignedHoursAll = 0;
        long totalCostAll = 0;
        int compliantCellsCount = 0;
        int totalCellsCount = 0;
        List<String> violationDetails = new ArrayList<>();
        List<String> overstaffedDetails = new ArrayList<>();

        for (PositionDTO pos : positions) {
            int posAssignedHours = 0;
            int posTotalCount = 0;
            int posCompliantCount = 0;

            for (DailyQuotaResponse.DailyShiftQuota sq : shiftQuotas) {
                for (DailyQuotaResponse.DailyQuotaCell cell : sq.getQuotas()) {
                    if (cell.getPositionId().equals(pos.getId())) {
                        totalCellsCount++;
                        posTotalCount++;
                        posAssignedHours += cell.getCount() * 8;
                        totalCostAll += cell.getCount() * 8 * pos.getHourlyRate();

                        if ("COMPLIANT".equals(cell.getStatus())) {
                            posCompliantCount++;
                            compliantCellsCount++;
                        } else if ("UNDERSTAFFED".equals(cell.getStatus())) {
                            int diff = cell.getMin() - cell.getCount();
                            violationDetails.add(sq.getName() + ": " + pos.getName() + " (hiện có " + cell.getCount() + "/" + cell.getMin() + " NV, thiếu " + diff + " NV)");
                        } else if ("OVERSTAFFED".equals(cell.getStatus())) {
                            overstaffedDetails.add(sq.getName() + ": " + pos.getName() + " (" + cell.getCount() + "/" + cell.getMax() + " NV)");
                        }
                    }
                }
            }

            totalAssignedHoursAll += posAssignedHours;
            int posSlaPercent = posTotalCount > 0 ? (int) Math.round(((double) posCompliantCount / posTotalCount) * 100) : 100;

            kpis.add(DailyQuotaResponse.DailyPositionKpi.builder()
                    .positionId(pos.getId())
                    .positionName(pos.getName())
                    .code(pos.getCode())
                    .slaPercentage(posSlaPercent)
                    .assignedHours(posAssignedHours)
                    .requiredCount(pos.getDefaultTarget() * 2)
                    .min(pos.getDefaultMin())
                    .target(pos.getDefaultTarget())
                    .max(pos.getDefaultMax())
                    .normLabel("Chuẩn: " + pos.getDefaultMin() + " - " + pos.getDefaultMax() + " NV/ca")
                    .positionDescription(pos.getDescription())
                    .hourlyRate(pos.getHourlyRate())
                    .color(pos.getColor())
                    .icon(pos.getIcon())
                    .build());
        }

        double overallSla = totalCellsCount > 0 ? Math.round(((double) compliantCellsCount / totalCellsCount) * 1000.0) / 10.0 : 100.0;
        int totalHeadcount = totalAssignedHoursAll / 8;

        DailyQuotaResponse.DailyWarningBanner warningBanner;
        if (!violationDetails.isEmpty()) {
            warningBanner = DailyQuotaResponse.DailyWarningBanner.builder()
                    .hasViolation(true)
                    .title("⚠️ Cảnh báo thiếu quân số vận hành (" + violationDetails.size() + " vị trí chưa đạt định mức)")
                    .message(String.join("; ", violationDetails))
                    .impactDescription("Tỷ lệ đáp ứng SLA hiện tại: " + String.format("%.1f", overallSla) + "%. Cần bổ sung quân số để đảm bảo tiêu chuẩn phục vụ.")
                    .build();
        } else {
            String extraInfo = "";
            if (!overstaffedDetails.isEmpty()) {
                extraInfo = " (Lưu ý " + overstaffedDetails.size() + " vị trí vượt mức tối đa: " + String.join(", ", overstaffedDetails) + ")";
            }
            warningBanner = DailyQuotaResponse.DailyWarningBanner.builder()
                    .hasViolation(false)
                    .title("✓ Đạt chuẩn SLA vận hành (" + String.format("%.0f", overallSla) + "% chuẩn định biên)")
                    .message("Tất cả " + shiftQuotas.size() + " ca làm việc (" + compliantCellsCount + "/" + totalCellsCount + " vị trí) đã đạt chuẩn định biên SLA vận hành!" + extraInfo)
                    .impactDescription("Đã phân bổ đủ " + totalHeadcount + " lượt nhân sự (" + totalAssignedHoursAll + " giờ công) theo đúng định mức nhân sự cho toàn bộ các ca làm việc.")
                    .build();
        }

        String costBreakdown = positions.stream()
                .filter(p -> p.getHourlyRate() > 0)
                .map(p -> p.getName() + " " + (p.getHourlyRate() / 1000) + "k/h")
                .collect(Collectors.joining(", "));
        String dynamicCostBreakdownText = costBreakdown.isEmpty() ? "" : "(" + costBreakdown + ")";

        return DailyQuotaResponse.builder()
                .branchId(branchId)
                .branchName(storeName)
                .date(date)
                .dateFormatted(date.format(DATE_FORMATTER))
                .slaPercentage(overallSla)
                .statusBadge(warningBanner.isHasViolation() ? "● " + compliantCellsCount + "/" + totalCellsCount + " ca đã đủ định biên" : "● Đã đủ định biên chuẩn")
                .completedShiftsCount(compliantCellsCount)
                .totalShiftsCount(totalCellsCount)
                .positionKpis(kpis)
                .shifts(shiftQuotas)
                .warningBanner(warningBanner)
                .summary(DailyQuotaResponse.DailySummaryFooter.builder()
                        .totalHours(totalAssignedHoursAll)
                        .totalShiftsCount(totalHeadcount)
                        .estimatedCost(totalCostAll)
                        .costBreakdownText(dynamicCostBreakdownText)
                        .slaComplianceRate(overallSla)
                        .isBiometricSynced(true)
                        .compliantSlotsCount(compliantCellsCount)
                        .totalSlotsCount(totalCellsCount)
                        .violationSlotsCount(totalCellsCount - compliantCellsCount)
                        .build())
                .build();
    }

    private Shift getOrCreateShift(Store store, LocalDate date, LocalTime start, LocalTime end, String name) {
        if (store == null) return null;
        return shiftRepository.findByStoreIdAndShiftDateAndStartTimeAndEndTime(store.getId(), date, start, end)
                .orElseGet(() -> {
                    ZonedDateTime deadline = ZonedDateTime.of(date, start, java.time.ZoneId.of("UTC")).minusHours(24);
                    Shift newShift = Shift.builder()
                            .store(store)
                            .shiftDate(date)
                            .startTime(start)
                            .endTime(end)
                            .status(ShiftStatus.DRAFT)
                            .availabilityDeadline(deadline)
                            .requirements(new ArrayList<>())
                            .build();
                    return shiftRepository.save(newShift);
                });
    }

    private Shift resolveCanonicalShift(List<Shift> shifts, LocalDate date, LocalTime targetStart, LocalTime targetEnd, boolean isMorning) {
        if (shifts == null || shifts.isEmpty()) return null;

        List<Shift> dayShifts = shifts.stream()
                .filter(s -> s.getShiftDate().equals(date) && s.getStartTime() != null)
                .collect(Collectors.toList());

        // 1. Exact match start and end
        for (Shift s : dayShifts) {
            if (targetStart.equals(s.getStartTime()) && targetEnd.equals(s.getEndTime())) {
                return s;
            }
        }

        // 2. Exact match start
        for (Shift s : dayShifts) {
            if (targetStart.equals(s.getStartTime())) {
                return s;
            }
        }

        // 3. Fallback matching period (morning < targetEnd vs afternoon >= targetStart)
        return dayShifts.stream()
                .filter(s -> isMorning ? s.getStartTime().isBefore(targetEnd) : !s.getStartTime().isBefore(targetStart))
                .min(Comparator.comparingLong(s -> Math.abs(java.time.Duration.between(s.getStartTime(), targetStart).toMinutes())))
                .orElse(null);
    }

    private DailyQuotaResponse.DailyShiftQuota buildDailyShiftQuota(
            Shift shift, String name, String startTime, String endTime,
            List<Integer> timelineHours, List<PositionDTO> positions, boolean isMorning) {

        List<DailyQuotaResponse.DailyQuotaCell> cells = new ArrayList<>();
        Map<UUID, Integer> reqMap = new HashMap<>();

        if (shift != null && shift.getRequirements() != null) {
            for (ShiftSkillRequirement req : shift.getRequirements()) {
                if (req.getSkill() != null) {
                    reqMap.put(req.getSkill().getId(), req.getRequiredCount());
                }
            }
        }

        for (PositionDTO pos : positions) {
            Integer count = reqMap.get(pos.getId());
            if (count == null) {
                // Default standards: Barista 2 NV, Cashier morning 1 NV (or 2 NV afternoon), Kitchen 2 NV, Leader 1 NV, Waiter 2 NV
                if ("CASHIER".equals(pos.getCode())) {
                    count = isMorning ? 1 : 2;
                } else if ("LEADER".equals(pos.getCode())) {
                    count = 1;
                } else {
                    count = pos.getDefaultTarget();
                }
            }

            int min = pos.getDefaultMin();
            int max = pos.getDefaultMax();
            int target = pos.getDefaultTarget();

            String status = "COMPLIANT";
            String statusLabel = "✓ Đạt chuẩn";
            boolean isViolation = false;
            String violationMsg = null;

            if (count < min) {
                status = "UNDERSTAFFED";
                statusLabel = "⚠️ Thiếu " + (min - count) + " NV";
                isViolation = true;
                violationMsg = "Thiếu quân số so với quy chuẩn tối thiểu (" + min + " NV)";
            } else if (count > max) {
                status = "OVERSTAFFED";
                statusLabel = "⚠️ Vượt chuẩn";
                isViolation = false;
            }

            String quotaId = (shift != null ? shift.getId().toString() : "temp") + "_" + pos.getId();

            cells.add(DailyQuotaResponse.DailyQuotaCell.builder()
                    .quotaId(quotaId)
                    .positionId(pos.getId())
                    .positionName(pos.getName())
                    .positionCode(pos.getCode())
                    .positionDescription(pos.getDescription())
                    .count(count)
                    .min(min)
                    .target(target)
                    .max(max)
                    .status(status)
                    .statusLabel(statusLabel)
                    .isViolation(isViolation)
                    .violationMessage(violationMsg)
                    .hourlyRate(pos.getHourlyRate())
                    .build());
        }

        return DailyQuotaResponse.DailyShiftQuota.builder()
                .id(shift != null ? shift.getId() : UUID.randomUUID())
                .name(name)
                .startTime(startTime)
                .endTime(endTime)
                .durationHours(8)
                .timelineHours(timelineHours)
                .quotas(cells)
                .build();
    }

    /**
     * GET /api/headcount-quotas/weekly?branchId=&weekStart=
     */
    @Transactional
    public WeeklyMatrixQuotaResponse getWeeklyQuotas(UUID branchId, LocalDate weekStart) {
        Store store = storeRepository.findById(branchId).orElse(null);
        String storeName = store != null ? store.getName() : "ShiftSync Store";

        LocalTime open = getStoreOpenTime(store);
        LocalTime mid = getStoreMidTime(store);
        LocalTime close = getStoreCloseTime(store);

        String openStr = String.format("%02d:%02d", open.getHour(), open.getMinute());
        String midStr = String.format("%02d:%02d", mid.getHour(), mid.getMinute());
        String closeStr = String.format("%02d:%02d", close.getHour(), close.getMinute());

        String morningLabel = "Ca Sáng (" + openStr + "-" + midStr + ")";
        String afternoonLabel = "Ca Chiều (" + midStr + "-" + closeStr + ")";

        List<PositionDTO> positions = getPositions(branchId);
        LocalDate weekEnd = weekStart.plusDays(6);

        // Pre-fetch shifts in period
        List<Shift> shifts = shiftRepository.findByStoreIdAndShiftDateBetween(branchId, weekStart, weekEnd);

        // Build 7 day headers
        List<WeeklyMatrixQuotaResponse.DayColumnHeader> dayHeaders = new ArrayList<>();
        List<LocalDate> weekDates = new ArrayList<>();
        for (int i = 0; i < 7; i++) {
            LocalDate d = weekStart.plusDays(i);
            weekDates.add(d);
            boolean isPeak = d.getDayOfWeek() == DayOfWeek.SATURDAY || d.getDayOfWeek() == DayOfWeek.SUNDAY;
            String dayName = getDayOfWeekVietnamese(d.getDayOfWeek());
            dayHeaders.add(WeeklyMatrixQuotaResponse.DayColumnHeader.builder()
                    .date(d)
                    .dayOfWeekName(dayName + " (" + d.format(SHORT_DATE_FORMATTER) + ")")
                    .formattedDate(d.format(SHORT_DATE_FORMATTER))
                    .expectedRevenueText(isPeak ? "Dự kiến: 35-40tr DT" : "Dự kiến: 20-25tr DT")
                    .isPeakWeekend(isPeak)
                    .build());
        }

        // Build Matrix Rows
        List<WeeklyMatrixQuotaResponse.MatrixRow> matrixRows = new ArrayList<>();
        List<WeeklyMatrixQuotaResponse.WeeklyWarningItem> warnings = new ArrayList<>();

        int totalSlotsCompliant = 0;
        int totalSlotsPeak = 0;
        int totalSlotsReview = 0;
        int totalSlotsAll = 0;
        long totalWeeklyCost = 0;

        // Position KPI cards tracking
        Map<UUID, Integer> posAssignedSlots = new HashMap<>();
        Map<UUID, Integer> posTargetSlots = new HashMap<>();

        for (PositionDTO pos : positions) {
            List<WeeklyMatrixQuotaResponse.MatrixCell> cells = new ArrayList<>();
            int assignedForPos = 0;
            int targetForPos = 0;

            for (LocalDate d : weekDates) {
                boolean isWeekend = d.getDayOfWeek() == DayOfWeek.SATURDAY || d.getDayOfWeek() == DayOfWeek.SUNDAY;

                // Morning shift
                Shift mShift = resolveCanonicalShift(shifts, d, open, mid, true);
                WeeklyMatrixQuotaResponse.MatrixCell mCell = buildMatrixCell(store, d, mShift, "morning", morningLabel, pos, isWeekend, open, mid);
                cells.add(mCell);

                // Afternoon shift
                Shift aShift = resolveCanonicalShift(shifts, d, mid, close, false);
                WeeklyMatrixQuotaResponse.MatrixCell aCell = buildMatrixCell(store, d, aShift, "afternoon", afternoonLabel, pos, isWeekend, mid, close);
                cells.add(aCell);

                // Add to stats
                for (WeeklyMatrixQuotaResponse.MatrixCell c : Arrays.asList(mCell, aCell)) {
                    totalSlotsAll++;
                    assignedForPos += c.getCount();
                    targetForPos += c.getTarget();
                    totalWeeklyCost += c.getCount() * 8 * pos.getHourlyRate();

                    if ("COMPLIANT".equals(c.getStatus())) totalSlotsCompliant++;
                    else if ("PEAK".equals(c.getStatus())) totalSlotsPeak++;
                    else totalSlotsReview++;

                    if ("VIOLATION".equals(c.getStatus())) {
                        warnings.add(WeeklyMatrixQuotaResponse.WeeklyWarningItem.builder()
                                .id(c.getQuotaId())
                                .severity("RED")
                                .severityLabel("ĐỎ: VI PHẠM QUY CHUẨN")
                                .title(d.format(SHORT_DATE_FORMATTER) + " - " + c.getShiftName() + ": " + pos.getName())
                                .description("Chỉ có " + c.getCount() + " NV (Yêu cầu tối thiểu: " + c.getMin() + " NV). Cần bổ sung quân số.")
                                .targetQuotaId(c.getQuotaId())
                                .build());
                    }
                }
            }

            posAssignedSlots.put(pos.getId(), assignedForPos);
            posTargetSlots.put(pos.getId(), targetForPos);

            matrixRows.add(WeeklyMatrixQuotaResponse.MatrixRow.builder()
                    .positionId(pos.getId())
                    .positionName(pos.getName())
                    .positionCode(pos.getCode())
                    .description(pos.getDescription())
                    .hourlyRate(pos.getHourlyRate())
                    .targetSummary("Mục tiêu: Sáng " + pos.getDefaultTarget() + " – Chiều " + ("CASHIER".equals(pos.getCode()) ? "1/2" : String.valueOf(pos.getDefaultTarget())))
                    .cells(cells)
                    .build());
        }

        // Summary Rows (14 shift totals, 7 day totals, 7 man-hours)
        List<Integer> shiftTotals = new ArrayList<>();
        List<WeeklyMatrixQuotaResponse.DayTotalSummary> dayTotals = new ArrayList<>();
        List<Integer> manHours = new ArrayList<>();

        for (int i = 0; i < 7; i++) {
            int morningTotal = 0;
            int afternoonTotal = 0;
            int dayMin = 0;
            int dayTarget = 0;
            int dayMax = 0;

            for (WeeklyMatrixQuotaResponse.MatrixRow row : matrixRows) {
                WeeklyMatrixQuotaResponse.MatrixCell mCell = row.getCells().get(i * 2);
                WeeklyMatrixQuotaResponse.MatrixCell aCell = row.getCells().get(i * 2 + 1);

                morningTotal += mCell.getCount();
                afternoonTotal += aCell.getCount();

                dayMin += mCell.getMin() + aCell.getMin();
                dayTarget += mCell.getTarget() + aCell.getTarget();
                dayMax += mCell.getMax() + aCell.getMax();
            }
            shiftTotals.add(morningTotal);
            shiftTotals.add(afternoonTotal);

            int dayTotal = morningTotal + afternoonTotal;
            String badge;
            String badgeType;

            if (dayTotal > dayMax) {
                badge = "Vượt +" + (dayTotal - dayMax) + " NV";
                badgeType = "OVER";
            } else if (dayTotal < dayMin) {
                badge = "Thiếu " + (dayMin - dayTotal) + " NV";
                badgeType = "UNDER";
            } else if (dayTotal == dayTarget) {
                badge = "Đạt chuẩn";
                badgeType = "COMPLIANT";
            } else if (dayTotal > dayTarget) {
                badge = "Trong định biên (Tối đa " + dayMax + " NV)";
                badgeType = "COMPLIANT";
            } else {
                badge = "Đạt chuẩn";
                badgeType = "COMPLIANT";
            }

            dayTotals.add(WeeklyMatrixQuotaResponse.DayTotalSummary.builder()
                    .totalStaff(dayTotal)
                    .standardNorm(dayTarget)
                    .maxNorm(dayMax)
                    .minNorm(dayMin)
                    .statusBadge(badge)
                    .badgeType(badgeType)
                    .build());

            manHours.add(dayTotal * 8);
        }

        // Blue Auto Peak Warning
        warnings.add(WeeklyMatrixQuotaResponse.WeeklyWarningItem.builder()
                .id("auto_peak_weekend")
                .severity("BLUE")
                .severityLabel("XANH: CAO ĐIỂM TỰ ĐỘNG")
                .title("Cuối tuần T7 – CN: Các ô ca đã tự động kích hoạt +50% nhân sự dự kiến theo doanh thu traffic.")
                .description("Hệ thống đã tự động khóa để bảo toàn chất lượng dịch vụ giờ cao điểm.")
                .isLocked(true)
                .build());

        // Build Position Cards
        List<WeeklyMatrixQuotaResponse.WeeklyPositionCard> positionCards = new ArrayList<>();
        for (PositionDTO pos : positions) {
            int assigned = posAssignedSlots.getOrDefault(pos.getId(), 28);
            int target = posTargetSlots.getOrDefault(pos.getId(), 28);
            int slaPct = target > 0 ? (int) Math.min(100, Math.round(((double) assigned / target) * 100)) : 100;

            positionCards.add(WeeklyMatrixQuotaResponse.WeeklyPositionCard.builder()
                    .positionId(pos.getId())
                    .positionName(pos.getName())
                    .code(pos.getCode())
                    .min(pos.getDefaultMin())
                    .target(pos.getDefaultTarget())
                    .max(pos.getDefaultMax())
                    .hourlyRate(pos.getHourlyRate())
                    .assignedSlots(assigned)
                    .targetSlots(target)
                    .totalHours(assigned * 8)
                    .applyScope(pos.getShiftScope().equals("PEAK_ONLY") ? "Áp dụng: Chỉ ca cao điểm" : "Áp dụng: Mọi ca")
                    .slaPercentage(slaPct)
                    .color(pos.getColor())
                    .icon(pos.getIcon())
                    .build());
        }

        double totalSla = totalSlotsAll > 0 ? Math.round(((double) (totalSlotsCompliant + totalSlotsPeak) / totalSlotsAll) * 1000.0) / 10.0 : 100.0;
        int totalHoursAll = shiftTotals.stream().mapToInt(Integer::intValue).sum() * 8;
        long monthlyBudget = branchId != null ? storeMonthlyBudgets.getOrDefault(branchId, MONTHLY_BUDGET_STANDARD) : MONTHLY_BUDGET_STANDARD;
        double budgetPct = Math.round(((double) totalWeeklyCost / monthlyBudget) * 1000.0) / 10.0;

        DecimalFormatSymbols symbols = new DecimalFormatSymbols(Locale.GERMANY);
        symbols.setGroupingSeparator('.');
        DecimalFormat df = new DecimalFormat("#,###", symbols);
        String formattedCost = df.format(totalWeeklyCost) + " đ";

        return WeeklyMatrixQuotaResponse.builder()
                .branchId(branchId)
                .branchName(storeName)
                .weekStart(weekStart)
                .weekEnd(weekEnd)
                .weekFormatted(weekStart.format(SHORT_DATE_FORMATTER) + " – " + weekEnd.format(DATE_FORMATTER))
                .slaPercentage(totalSla)
                .totalQuotaSlots(totalSlotsCompliant + totalSlotsPeak)
                .standardQuotaSlots(totalSlotsAll)
                .progressTitle("TIẾN ĐỘ PHÂN BỔ ĐỊNH BIÊN TUẦN: " + (shiftTotals.stream().mapToInt(Integer::intValue).sum()) + " / " + totalSlotsAll + " Lượt ca vị trí (" + (int)totalSla + "%)")
                .progressPills(WeeklyMatrixQuotaResponse.ProgressPills.builder()
                        .compliantCount(totalSlotsCompliant)
                        .compliantPercent(totalSlotsAll > 0 ? Math.round(((double) totalSlotsCompliant / totalSlotsAll) * 1000.0) / 10.0 : 97.0)
                        .peakCount(totalSlotsPeak)
                        .peakPercent(totalSlotsAll > 0 ? Math.round(((double) totalSlotsPeak / totalSlotsAll) * 1000.0) / 10.0 : 3.0)
                        .needsReviewCount(totalSlotsReview)
                        .needsReviewPercent(totalSlotsAll > 0 ? Math.round(((double) totalSlotsReview / totalSlotsAll) * 1000.0) / 10.0 : 0.0)
                        .build())
                .positionCards(positionCards)
                .days(dayHeaders)
                .matrixRows(matrixRows)
                .summaryRows(WeeklyMatrixQuotaResponse.MatrixSummaryRows.builder()
                        .shiftTotals(shiftTotals)
                        .dayTotals(dayTotals)
                        .manHours(manHours)
                        .build())
                .warnings(warnings)
                .budget(WeeklyMatrixQuotaResponse.WeeklyBudgetFooter.builder()
                        .totalQuotas(shiftTotals.stream().mapToInt(Integer::intValue).sum())
                        .totalHours(totalHoursAll)
                        .estimatedCost(totalWeeklyCost)
                        .formattedEstimatedCost(formattedCost)
                        .slaComplianceRate(totalSla)
                        .monthlyQuotaBudget(monthlyBudget)
                        .monthlyUsedBudget(totalWeeklyCost)
                        .monthlyUsedPercentage(budgetPct)
                        .budgetStatusText(budgetPct + "% ngân sách tháng — " + (budgetPct > 100.0 ? "VƯỢT HẠN MỨC CHO PHÉP!" : "Đang trong hạn mức an toàn"))
                        .build())
                .build();
    }

    private WeeklyMatrixQuotaResponse.MatrixCell buildMatrixCell(
            Store store, LocalDate date, Shift shift, String shiftType, String shiftName,
            PositionDTO pos, boolean isWeekend, LocalTime start, LocalTime end) {

        int count = -1;
        if (shift != null && shift.getRequirements() != null) {
            for (ShiftSkillRequirement req : shift.getRequirements()) {
                if (req.getSkill() != null && req.getSkill().getId().equals(pos.getId())) {
                    count = req.getRequiredCount();
                    break;
                }
            }
        }

        if (count == -1) {
            // Default standards: Weekend afternoon for Barista is auto peak +50% (3 NV)
            if (isWeekend && "afternoon".equalsIgnoreCase(shiftType) && "BARISTA".equals(pos.getCode())) {
                count = pos.getDefaultTarget() + 1; // Auto peak +50% for weekend afternoon (3 NV)
            } else if ("CASHIER".equals(pos.getCode())) {
                count = shiftType.equals("morning") ? 1 : 2;
            } else if ("LEADER".equals(pos.getCode())) {
                count = 1;
            } else {
                count = pos.getDefaultTarget();
            }
        }

        int min = pos.getDefaultMin();
        int max = pos.getDefaultMax();
        int target = pos.getDefaultTarget();
        if (isWeekend && count > target) {
            max = Math.max(max, count);
        }

        String status = "COMPLIANT";
        String statusLabel = "Đạt chuẩn";
        boolean isPeakSlot = isWeekend && "afternoon".equalsIgnoreCase(shiftType) && "BARISTA".equals(pos.getCode()) && count > target;

        if (count < min) {
            status = "VIOLATION";
            statusLabel = "Vi phạm";
        } else if (isPeakSlot) {
            status = "PEAK";
            statusLabel = "Cao điểm";
        } else if (count > max) {
            status = "OVER";
            statusLabel = "Vượt chuẩn";
        }

        String quotaId = date.toString() + "_" + shiftType + "_" + pos.getId();

        return WeeklyMatrixQuotaResponse.MatrixCell.builder()
                .quotaId(quotaId)
                .date(date)
                .shiftType(shiftType)
                .shiftName(shiftName)
                .count(count)
                .min(min)
                .target(target)
                .max(max)
                .status(status)
                .statusLabel(statusLabel)
                .isPeakSlot(isPeakSlot)
                .build();
    }

    private String getDayOfWeekVietnamese(DayOfWeek dow) {
        switch (dow) {
            case MONDAY: return "Thứ 2";
            case TUESDAY: return "Thứ 3";
            case WEDNESDAY: return "Thứ 4";
            case THURSDAY: return "Thứ 5";
            case FRIDAY: return "Thứ 6";
            case SATURDAY: return "Thứ 7";
            case SUNDAY: return "Chủ nhật";
            default: return "";
        }
    }

    /**
     * PUT /api/headcount-quotas/{quotaId}
     * Updates quota count or Min/Target/Max inline.
     */
    @Transactional
    public void updateQuota(String quotaId, UpdateQuotaRequest req) {
        if (req == null) return;
        UUID branchId = req.getBranchId();
        if (branchId == null) {
            throw new BusinessException("Branch ID is required", HttpStatus.BAD_REQUEST);
        }

        if (req.getCount() != null && req.getCount() < 0) {
            throw new BusinessException("Required count cannot be negative: " + req.getCount(), HttpStatus.BAD_REQUEST);
        }
        if (req.getMin() != null && req.getMin() < 0) {
            throw new BusinessException("Min quota cannot be negative: " + req.getMin(), HttpStatus.BAD_REQUEST);
        }
        if (req.getTarget() != null && req.getTarget() < 0) {
            throw new BusinessException("Target quota cannot be negative: " + req.getTarget(), HttpStatus.BAD_REQUEST);
        }
        if (req.getMax() != null && req.getMax() < 0) {
            throw new BusinessException("Max quota cannot be negative: " + req.getMax(), HttpStatus.BAD_REQUEST);
        }

        // Update norm override if Min/Target/Max changed
        if (req.getPositionId() != null && (req.getMin() != null || req.getTarget() != null || req.getMax() != null)) {
            String key = branchId + "_" + req.getPositionId();
            PositionNormOverride existing = normOverrides.getOrDefault(key, new PositionNormOverride(1, 2, 3));
            if (req.getMin() != null) existing.min = req.getMin();
            if (req.getTarget() != null) existing.target = req.getTarget();
            if (req.getMax() != null) existing.max = req.getMax();
            normOverrides.put(key, existing);
        }

        // Update shift requirement in database if count is provided
        if (req.getDate() != null && req.getShiftType() != null && req.getPositionId() != null && req.getCount() != null) {
            Store store = storeRepository.findById(branchId)
                    .orElseThrow(() -> new BusinessException("Store not found: " + branchId, HttpStatus.NOT_FOUND));

            LocalTime open = getStoreOpenTime(store);
            LocalTime mid = getStoreMidTime(store);
            LocalTime close = getStoreCloseTime(store);

            LocalTime start = req.getShiftType().equalsIgnoreCase("morning") ? open : mid;
            LocalTime end = req.getShiftType().equalsIgnoreCase("morning") ? mid : close;

            Shift shift = getOrCreateShift(store, req.getDate(), start, end, req.getShiftType().equalsIgnoreCase("morning") ? "Ca Sáng" : "Ca Chiều");
            Skill skill = skillRepository.findById(req.getPositionId())
                    .orElseThrow(() -> new BusinessException("Position/Skill not found: " + req.getPositionId(), HttpStatus.NOT_FOUND));

            if (shift != null) {
                if (shift.getRequirements() == null) {
                    shift.setRequirements(new ArrayList<>());
                }
                ShiftSkillRequirement targetReq = null;
                for (ShiftSkillRequirement r : shift.getRequirements()) {
                    if (r.getSkill() != null && r.getSkill().getId().equals(skill.getId())) {
                        targetReq = r;
                        break;
                    }
                }

                if (targetReq == null) {
                    targetReq = ShiftSkillRequirement.builder()
                            .shift(shift)
                            .skill(skill)
                            .requiredCount(req.getCount())
                            .build();
                    shift.getRequirements().add(targetReq);
                } else {
                    targetReq.setRequiredCount(req.getCount());
                }
                shiftRepository.save(shift);
            }
        }
    }

    /**
     * POST /api/headcount-quotas/auto-fill
     */
    @Transactional
    public void autoFillQuotas(AutoFillQuotaRequest req) {
        if (req == null || req.getBranchId() == null) {
            throw new BusinessException("Branch ID is required", HttpStatus.BAD_REQUEST);
        }
        UUID branchId = req.getBranchId();
        Store store = storeRepository.findById(branchId)
                .orElseThrow(() -> new BusinessException("Store not found: " + branchId, HttpStatus.NOT_FOUND));

        LocalTime open = getStoreOpenTime(store);
        LocalTime mid = getStoreMidTime(store);
        LocalTime close = getStoreCloseTime(store);

        List<PositionDTO> positions = getPositions(branchId);
        List<LocalDate> dates = new ArrayList<>();

        if ("DAY".equalsIgnoreCase(req.getScope()) && req.getDate() != null) {
            dates.add(req.getDate());
        } else if (req.getWeekStart() != null) {
            for (int i = 0; i < 7; i++) {
                dates.add(req.getWeekStart().plusDays(i));
            }
        }

        for (LocalDate d : dates) {
            boolean isWeekend = d.getDayOfWeek() == DayOfWeek.SATURDAY || d.getDayOfWeek() == DayOfWeek.SUNDAY;

            Shift morning = getOrCreateShift(store, d, open, mid, "Ca Sáng");
            Shift afternoon = getOrCreateShift(store, d, mid, close, "Ca Chiều");

            for (Shift s : Arrays.asList(morning, afternoon)) {
                if (s.getRequirements() == null) {
                    s.setRequirements(new ArrayList<>());
                }
                boolean isMorning = s.getStartTime().isBefore(mid);
                for (PositionDTO pos : positions) {
                    Skill skill = skillRepository.findById(pos.getId()).orElse(null);
                    if (skill == null) continue;

                    int targetCount = pos.getDefaultTarget();
                    if (isWeekend && ("BARISTA".equals(pos.getCode()) || "KITCHEN".equals(pos.getCode()))) {
                        targetCount = pos.getDefaultTarget() + 1; // +50% on weekends
                    } else if ("CASHIER".equals(pos.getCode())) {
                        targetCount = isMorning ? 1 : 2;
                    }

                    ShiftSkillRequirement existing = null;
                    for (ShiftSkillRequirement r : s.getRequirements()) {
                        if (r.getSkill() != null && r.getSkill().getId().equals(skill.getId())) {
                            existing = r;
                            break;
                        }
                    }

                    if (existing == null) {
                        s.getRequirements().add(ShiftSkillRequirement.builder()
                                .shift(s)
                                .skill(skill)
                                .requiredCount(targetCount)
                                .build());
                    } else {
                        existing.setRequiredCount(targetCount);
                    }
                }
                shiftRepository.save(s);
            }
        }
    }

    /**
     * POST /api/headcount-quotas/apply-to-scheduler
     * Synchronizes headcount quota demand to scheduler shifts without overwriting custom quota requirements.
     */
    @Transactional
    public Map<String, Object> applyToScheduler(ApplySchedulerRequest req) {
        if (req == null || req.getBranchId() == null) {
            throw new BusinessException("Branch ID is required", HttpStatus.BAD_REQUEST);
        }
        Store store = storeRepository.findById(req.getBranchId())
                .orElseThrow(() -> new BusinessException("Store not found: " + req.getBranchId(), HttpStatus.NOT_FOUND));

        LocalTime openTime = getStoreOpenTime(store);
        LocalTime closeTime = getStoreCloseTime(store);
        LocalTime midTime = getStoreMidTime(store);

        LocalDate start = req.getDate() != null ? req.getDate() : req.getWeekStart();
        LocalDate end = req.getDate() != null ? req.getDate() : (req.getWeekStart() != null ? req.getWeekStart().plusDays(6) : null);

        if (start == null && end == null) {
            start = LocalDate.now();
            end = LocalDate.now();
        } else if (start != null && end == null) {
            end = start;
        }

        // 1. Clean up ONLY out-of-bounds DRAFT shifts for this store in this date range
        List<Shift> existingDraftShifts = shiftRepository.findByStoreIdAndShiftDateBetween(store.getId(), start, end)
                .stream().filter(s -> s.getStatus() == ShiftStatus.DRAFT).collect(Collectors.toList());

        for (Shift s : existingDraftShifts) {
            if ((s.getStartTime() != null && s.getStartTime().isBefore(openTime))
                    || (s.getEndTime() != null && s.getEndTime().isAfter(closeTime))) {
                shiftAssignmentRepository.deleteAll(shiftAssignmentRepository.findByShiftId(s.getId()));
                shiftRepository.delete(s);
            }
        }
        shiftRepository.flush();

        // 2. Synchronize demand: ensure canonical shifts [open, mid] and [mid, close] exist.
        // If requirements already exist, PRESERVE THEM (preserve custom quota edits).
        // If missing, initialize with standard quota target.
        List<PositionDTO> positions = getPositions(store.getId());
        List<LocalDate> dates = new ArrayList<>();
        LocalDate curr = start;
        while (!curr.isAfter(end)) {
            dates.add(curr);
            curr = curr.plusDays(1);
        }

        for (LocalDate d : dates) {
            boolean isWeekend = d.getDayOfWeek() == DayOfWeek.SATURDAY || d.getDayOfWeek() == DayOfWeek.SUNDAY;

            Shift morning = getOrCreateShift(store, d, openTime, midTime, "Ca Sáng");
            Shift afternoon = getOrCreateShift(store, d, midTime, closeTime, "Ca Chiều");

            for (Shift s : Arrays.asList(morning, afternoon)) {
                if (s.getRequirements() == null) {
                    s.setRequirements(new ArrayList<>());
                }
                boolean isMorning = s.getStartTime().isBefore(midTime);

                Map<UUID, ShiftSkillRequirement> existingReqs = new HashMap<>();
                for (ShiftSkillRequirement r : s.getRequirements()) {
                    if (r.getSkill() != null) {
                        existingReqs.put(r.getSkill().getId(), r);
                    }
                }

                boolean modified = false;
                for (PositionDTO pos : positions) {
                    Skill skill = skillRepository.findById(pos.getId()).orElse(null);
                    if (skill == null) continue;

                    if (!existingReqs.containsKey(skill.getId())) {
                        int targetCount = pos.getDefaultTarget();
                        if (isWeekend && ("BARISTA".equals(pos.getCode()) || "KITCHEN".equals(pos.getCode()))) {
                            targetCount = pos.getDefaultTarget() + 1;
                        } else if ("CASHIER".equals(pos.getCode())) {
                            targetCount = isMorning ? 1 : 2;
                        }

                        s.getRequirements().add(ShiftSkillRequirement.builder()
                                .shift(s)
                                .skill(skill)
                                .requiredCount(targetCount)
                                .build());
                        modified = true;
                    }
                    // Preserves existing requirements as configured by store manager
                }

                if (modified) {
                    shiftRepository.save(s);
                }
            }
        }

        Map<String, Object> result = new HashMap<>();
        result.put("success", true);
        result.put("message", "Đã áp dụng định biên sang Scheduler thành công!");
        return result;
    }

    /**
     * GET /api/headcount-quotas/summary
     */
    @Transactional(readOnly = true)
    public QuotaSummaryResponse getSummary(UUID branchId, LocalDate date, LocalDate weekStart) {
        WeeklyMatrixQuotaResponse weekly = getWeeklyQuotas(branchId, weekStart != null ? weekStart : LocalDate.now());
        WeeklyMatrixQuotaResponse.WeeklyBudgetFooter b = weekly.getBudget();

        return QuotaSummaryResponse.builder()
                .branchId(branchId)
                .totalHours(b.getTotalHours())
                .totalQuotas(b.getTotalQuotas())
                .estimatedCost(b.getEstimatedCost())
                .formattedEstimatedCost(b.getFormattedEstimatedCost())
                .slaComplianceRate(b.getSlaComplianceRate())
                .monthlyQuotaBudget(b.getMonthlyQuotaBudget())
                .monthlyUsedBudget(b.getMonthlyUsedBudget())
                .monthlyUsedPercentage(b.getMonthlyUsedPercentage())
                .budgetStatusText(b.getBudgetStatusText())
                .build();
    }

    public void updateMonthlyBudget(UUID branchId, long budget) {
        if (branchId != null && budget > 0) {
            storeMonthlyBudgets.put(branchId, budget);
        }
    }
}
