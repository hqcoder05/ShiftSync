package com.shiftsync.quota.service;

import com.shiftsync.layout.entity.StoreZone;
import com.shiftsync.layout.repository.StoreZoneRepository;
import com.shiftsync.quota.dto.*;
import com.shiftsync.quota.entity.PositionNormOverride;
import com.shiftsync.quota.repository.PositionNormOverrideRepository;
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
    private final PositionNormOverrideRepository positionNormOverrideRepository;
    private final com.shiftsync.payroll.repository.PayrollPeriodRepository payrollPeriodRepository;
    private final com.shiftsync.store.repository.StoreConfigurationRepository storeConfigurationRepository;
    private final com.shiftsync.payroll.service.CompensationRevisionResolver compensationRevisions;

    private static final long MONTHLY_BUDGET_STANDARD = 85_000_000L;
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
        if (minutes < 0) minutes += 24 * 60;
        return open.plusMinutes(minutes / 2);
    }

    private double durationHours(LocalTime start, LocalTime end) {
        if (start == null || end == null) {
            return 0;
        }
        long nanos = java.time.Duration.between(start, end).toNanos();
        if (nanos < 0) nanos += java.time.Duration.ofDays(1).toNanos();
        return nanos / 3_600_000_000_000.0;
    }

    private long estimatedShiftCost(UUID skillId, LocalDate date, LocalTime start, LocalTime end, int count, boolean[] incomplete) {
        var cursor = date.atTime(start);
        var finish = date.atTime(end);
        if (finish.isBefore(cursor)) finish = finish.plusDays(1);
        java.math.BigDecimal amount = java.math.BigDecimal.ZERO;
        while (cursor.isBefore(finish)) {
            var midnight = cursor.toLocalDate().plusDays(1).atStartOfDay();
            var boundary = finish.isBefore(midnight) ? finish : midnight;
            var rate = compensationRevisions.requireAt("skill", skillId, cursor.toLocalDate(),
                    com.shiftsync.payroll.service.CompensationRevisionResolver.SkillTerms.class).hourlyRate();
            if (count > 0 && rate.signum() == 0) incomplete[0] = true;
            var seconds = java.math.BigDecimal.valueOf(java.time.Duration.between(cursor, boundary).toSeconds());
            amount = amount.add(rate.multiply(seconds).multiply(java.math.BigDecimal.valueOf(count)));
            cursor = boundary;
        }
        return amount.divide(java.math.BigDecimal.valueOf(3600), 0, java.math.RoundingMode.HALF_UP).longValueExact();
    }

    private double durationHours(String start, String end) {
        try {
            return durationHours(LocalTime.parse(start), LocalTime.parse(end));
        } catch (Exception ignored) {
            return 0;
        }
    }

    private double durationForShiftType(String shiftType, LocalTime open, LocalTime mid, LocalTime close) {
        return "morning".equalsIgnoreCase(shiftType) ? durationHours(open, mid) : durationHours(mid, close);
    }

    private double calculatePositionWeeklyHours(UUID positionId, List<WeeklyMatrixQuotaResponse.MatrixRow> rows,
                                                LocalTime open, LocalTime mid, LocalTime close) {
        return rows.stream()
                .filter(row -> positionId.equals(row.getPositionId()))
                .flatMap(row -> row.getCells().stream())
                .mapToDouble(cell -> cell.getCount() * durationForShiftType(cell.getShiftType(), open, mid, close))
                .sum();
    }

    private PositionNormOverride findNormOverride(UUID storeId, UUID skillId) {
        return positionNormOverrideRepository == null ? null
                : positionNormOverrideRepository.findByStoreIdAndSkillId(storeId, skillId).orElse(null);
    }

    private void validateNorm(PositionNormOverride override) {
        if (override.getMin() > override.getTarget() || override.getTarget() > override.getMax()) {
            throw new BusinessException("Quota norm must satisfy min <= target <= max", HttpStatus.BAD_REQUEST);
        }
    }

    private List<Integer> generateTimelineHours(LocalTime start, LocalTime end) {
        List<Integer> hours = new ArrayList<>();
        int length = (end.getHour() - start.getHour() + 24) % 24;
        for (int offset = 0; offset <= length; offset += 2) {
            hours.add((start.getHour() + offset) % 24);
        }
        return hours;
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
                        .openTime(store.getOpenTime())
                        .closeTime(store.getCloseTime())
                        .build())
                .collect(Collectors.toList());
    }

    /**
     * GET /api/positions?branchId=
     * Filters out Leader/Manager to return only operational roles.
     */
    @Transactional(readOnly = true)
    public List<PositionDTO> getPositions(UUID branchId) {
        return getPositions(branchId, LocalDate.now(com.shiftsync.payroll.service.CompensationEffectiveDate.BUSINESS_ZONE));
    }

    private List<PositionDTO> getPositions(UUID branchId, LocalDate date) {
        List<Skill> skills = skillRepository.findByStoreId(branchId);
        List<PositionDTO> operationalPositions = new ArrayList<>();

        for (Skill s : skills) {
            String nameLower = s.getName().toLowerCase();
            if (isGeneralStoreManager(nameLower)) {
                continue; // Only exclude store manager / store owner
            }
            operationalPositions.add(mapSkillToPositionDTO(branchId, s, date));
        }

        return operationalPositions;
    }

    private boolean isGeneralStoreManager(String nameLower) {
        return nameLower.contains("store manager") || nameLower.contains("cửa hàng trưởng")
            || nameLower.contains("quản lý cửa hàng") || nameLower.contains("chủ cửa hàng") || nameLower.contains("owner");
    }

    private PositionDTO mapSkillToPositionDTO(UUID branchId, Skill s, LocalDate date) {
        String name = s.getName();
        String nameLower = name.toLowerCase();

        long hourlyRate = compensationRevisions.requireAt("skill", s.getId(), date,
                com.shiftsync.payroll.service.CompensationRevisionResolver.SkillTerms.class).hourlyRate()
                .setScale(0, java.math.RoundingMode.HALF_UP).longValueExact();
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
            color = "indigo";
            icon = "badge";
            defaultMin = 1;
            defaultTarget = 1;
            defaultMax = 1;
            shiftScope = "ALL";
            desc = "Điều phối & Giám sát ca";
        }

        // Check custom overrides
        PositionNormOverride override = findNormOverride(branchId, s.getId());
        if (override != null) {
            defaultMin = override.getMin();
            defaultTarget = override.getTarget();
            defaultMax = override.getMax();
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

    /**
     * GET /api/headcount-quotas?branchId=&date=
     */
    @Transactional(readOnly = true)
    public DailyQuotaResponse getDailyQuotas(UUID branchId, LocalDate date) {
        Store store = storeRepository.findById(branchId).orElse(null);
        String storeName = store != null ? store.getName() : "ShiftSync Store";

        List<PositionDTO> positions = getPositions(branchId, date);
        LocalTime open = getStoreOpenTime(store);
        LocalTime mid = getStoreMidTime(store);
        LocalTime close = getStoreCloseTime(store);
        List<Shift> shifts = close.isBefore(open)
                ? shiftRepository.findByStoreIdAndShiftDateBetween(branchId, date, date.plusDays(1))
                : shiftRepository.findByStoreIdAndShiftDate(branchId, date);

        String openStr = String.format("%02d:%02d", open.getHour(), open.getMinute());
        String midStr = String.format("%02d:%02d", mid.getHour(), mid.getMinute());
        String closeStr = String.format("%02d:%02d", close.getHour(), close.getMinute());

        // Reads must not initialize scheduler state. Explicit write endpoints do that.
        Shift morningShift = resolveCanonicalShift(shifts, date, open, mid, true, open, close);
        Shift afternoonShift = resolveCanonicalShift(shifts, date, mid, close, false, open, close);

        List<DailyQuotaResponse.DailyShiftQuota> shiftQuotas = new ArrayList<>();
        shiftQuotas.add(buildDailyShiftQuota(morningShift, "Ca Sáng (" + openStr + "-" + midStr + ")", openStr, midStr, generateTimelineHours(open, mid), positions, true, date));
        shiftQuotas.add(buildDailyShiftQuota(afternoonShift, "Ca Chiều (" + midStr + "-" + closeStr + ")", midStr, closeStr, generateTimelineHours(mid, close), positions, false, date));

        // Evaluate Position KPIs
        List<DailyQuotaResponse.DailyPositionKpi> kpis = new ArrayList<>();
        double totalAssignedHoursAll = 0;
        long totalCostAll = 0;
        boolean[] costIncomplete = {false};
        int compliantCellsCount = 0;
        int totalCellsCount = 0;
        List<String> violationDetails = new ArrayList<>();
        List<String> overstaffedDetails = new ArrayList<>();

        for (PositionDTO pos : positions) {
            double posAssignedHours = 0;
            int posTotalCount = 0;
            int posCompliantCount = 0;

            for (DailyQuotaResponse.DailyShiftQuota sq : shiftQuotas) {
                for (DailyQuotaResponse.DailyQuotaCell cell : sq.getQuotas()) {
                    if (cell.getPositionId().equals(pos.getId())) {
                        totalCellsCount++;
                        posTotalCount++;
                        double shiftHours = sq.getDurationHours();
                        posAssignedHours += cell.getCount() * shiftHours;
                        LocalTime start = LocalTime.parse(sq.getStartTime());
                        LocalTime end = LocalTime.parse(sq.getEndTime());
                        totalCostAll += estimatedShiftCost(pos.getId(), slotDate(date, open, start), start, end, cell.getCount(), costIncomplete);

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
        int totalHeadcount = shiftQuotas.stream()
                .flatMap(sq -> sq.getQuotas().stream())
                .mapToInt(DailyQuotaResponse.DailyQuotaCell::getCount)
                .sum();

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
                .openTime(open)
                .closeTime(close)
                .midTime(mid)
                .morningLabel("Ca Sáng (" + openStr + "-" + midStr + ")")
                .afternoonLabel("Ca Chiều (" + midStr + "-" + closeStr + ")")
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
                        .costIncomplete(costIncomplete[0])
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
        if (payrollPeriodRepository.existsByStoreIdAndStartDateLessThanEqualAndEndDateGreaterThanEqualAndStatusIn(
                store.getId(), date, date, List.of(com.shiftsync.payroll.enums.PayrollPeriodStatus.CONFIRMED, com.shiftsync.payroll.enums.PayrollPeriodStatus.PAID))) {
            throw new BusinessException("Không thể sửa định biên trong kỳ lương đã chốt", HttpStatus.CONFLICT);
        }
        if (end.isBefore(start) && !end.equals(LocalTime.MIDNIGHT)
                && payrollPeriodRepository.existsByStoreIdAndStartDateLessThanEqualAndEndDateGreaterThanEqualAndStatusIn(
                    store.getId(), date.plusDays(1), date.plusDays(1), List.of(com.shiftsync.payroll.enums.PayrollPeriodStatus.CONFIRMED, com.shiftsync.payroll.enums.PayrollPeriodStatus.PAID))) {
            throw new BusinessException("Không thể sửa định biên trong kỳ lương đã chốt", HttpStatus.CONFLICT);
        }
        Shift shift = shiftRepository.findByStoreIdAndShiftDateAndStartTimeAndEndTime(store.getId(), date, start, end)
                .orElseGet(() -> {
                    ZonedDateTime deadline = com.shiftsync.shift.service.ShiftDeadlinePolicy.calculate(storeConfigurationRepository, store.getId(), date, start);
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
        if (shift.getStatus() != ShiftStatus.DRAFT) {
            throw new BusinessException("Chỉ được sửa định biên của ca nháp", HttpStatus.CONFLICT);
        }
        return shift;
    }

    private void requireCapacity(Shift shift, UUID skillId, int capacity) {
        long assigned = shiftAssignmentRepository.findByShiftId(shift.getId()).stream().filter(a -> !a.isDeleted())
                .filter(a -> skillId.equals(a.getRequiredSkillId()) || (a.getRequiredSkillId() == null && (shift.getRequirements() == null || shift.getRequirements().size() <= 1))).count();
        if (assigned > capacity) throw new BusinessException("Định biên không thể thấp hơn số nhân viên đã phân công", HttpStatus.CONFLICT);
    }

    private Shift resolveCanonicalShift(List<Shift> shifts, LocalDate date, LocalTime targetStart, LocalTime targetEnd, boolean isMorning, LocalTime openTime, LocalTime closeTime) {
        if (shifts == null || shifts.isEmpty()) return null;

        Store window = Store.builder().openTime(openTime).closeTime(closeTime).build();
        long split = java.time.Duration.between(openTime, getStoreMidTime(window)).toMinutes();
        if (split < 0) split += 24 * 60;
        final long splitMinutes = split;
        List<Shift> dayShifts = shifts.stream()
                .filter(s -> s.getStartTime() != null && s.getShiftDate().equals(slotDate(date, openTime, s.getStartTime())))
                .filter(s -> com.shiftsync.store.service.OperatingHours.contains(window, s.getStartTime(), s.getEndTime()))
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

        // 3. Fallback matching period (morning < targetEnd vs afternoon >= targetStart) within operating hours
        return dayShifts.stream()
                .filter(s -> isMorning ? offsetMinutes(openTime, s.getStartTime()) < splitMinutes : offsetMinutes(openTime, s.getStartTime()) >= splitMinutes)
                .min(Comparator.comparingLong(s -> Math.abs(offsetMinutes(openTime, s.getStartTime()) - offsetMinutes(openTime, targetStart))))
                .orElse(null);
    }

    private static long offsetMinutes(LocalTime start, LocalTime time) {
        return Math.floorMod(java.time.Duration.between(start, time).toMinutes(), 24 * 60);
    }

    private static LocalDate slotDate(LocalDate businessDate, LocalTime open, LocalTime slotStart) {
        return slotStart.isBefore(open) ? businessDate.plusDays(1) : businessDate;
    }

    private DailyQuotaResponse.DailyShiftQuota buildDailyShiftQuota(
            Shift shift, String name, String startTime, String endTime,
            List<Integer> timelineHours, List<PositionDTO> positions, boolean isMorning, LocalDate date) {

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
                count = suggestedCount(pos, date, isMorning);
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
                    .source(reqMap.containsKey(pos.getId()) ? "SAVED" : "SUGGESTED")
                    .assignedCount(assignedCount(shift, pos.getId()))
                    .shortageCount(Math.max(0, count - assignedCount(shift, pos.getId())))
                    .excessCount(Math.max(0, assignedCount(shift, pos.getId()) - count))
                    .unclassifiedAssignedCount(assignedCount(shift, null))
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

        double durationHours = durationHours(startTime, endTime);

        return DailyQuotaResponse.DailyShiftQuota.builder()
                .id(shift != null ? shift.getId() : UUID.randomUUID())
                .name(name)
                .startTime(startTime)
                .endTime(endTime)
                .durationHours(durationHours)
                .timelineHours(timelineHours)
                .quotas(cells)
                .build();
    }

    /**
     * GET /api/headcount-quotas/weekly?branchId=&weekStart=
     */
    @Transactional(isolation = org.springframework.transaction.annotation.Isolation.SERIALIZABLE)
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

        List<PositionDTO> positions = getPositions(branchId, weekStart);
        LocalDate weekEnd = weekStart.plusDays(6);

        // Pre-fetch shifts in period
        List<Shift> shifts = shiftRepository.findByStoreIdAndShiftDateBetween(branchId, weekStart, close.isBefore(open) ? weekEnd.plusDays(1) : weekEnd);

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
        boolean[] costIncomplete = {false};

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
                Shift mShift = resolveCanonicalShift(shifts, d, open, mid, true, open, close);
                WeeklyMatrixQuotaResponse.MatrixCell mCell = buildMatrixCell(store, d, mShift, "morning", morningLabel, pos, isWeekend, open, mid);
                cells.add(mCell);

                // Afternoon shift
                Shift aShift = resolveCanonicalShift(shifts, d, mid, close, false, open, close);
                WeeklyMatrixQuotaResponse.MatrixCell aCell = buildMatrixCell(store, d, aShift, "afternoon", afternoonLabel, pos, isWeekend, mid, close);
                cells.add(aCell);

                // Add to stats
                for (WeeklyMatrixQuotaResponse.MatrixCell c : Arrays.asList(mCell, aCell)) {
                    totalSlotsAll++;
                    assignedForPos += c.getCount();
                    targetForPos += c.getTarget();
                    LocalTime slotStart = "morning".equals(c.getShiftType()) ? open : mid;
                    LocalTime slotEnd = "morning".equals(c.getShiftType()) ? mid : close;
                    totalWeeklyCost += estimatedShiftCost(pos.getId(), slotDate(d, open, slotStart), slotStart, slotEnd, c.getCount(), costIncomplete);

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
        List<Double> manHours = new ArrayList<>();

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

            manHours.add(morningTotal * durationHours(open, mid) + afternoonTotal * durationHours(mid, close));
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
                    .totalHours(calculatePositionWeeklyHours(pos.getId(), matrixRows, open, mid, close))
                    .applyScope(pos.getShiftScope().equals("PEAK_ONLY") ? "Áp dụng: Chỉ ca cao điểm" : "Áp dụng: Mọi ca")
                    .slaPercentage(slaPct)
                    .color(pos.getColor())
                    .icon(pos.getIcon())
                    .build());
        }

        double totalSla = totalSlotsAll > 0 ? Math.round(((double) (totalSlotsCompliant + totalSlotsPeak) / totalSlotsAll) * 1000.0) / 10.0 : 100.0;
        double totalHoursAll = manHours.stream().mapToDouble(Double::doubleValue).sum();
        long monthlyBudget = store != null && store.getMonthlyQuotaBudget() != null
                ? store.getMonthlyQuotaBudget() : MONTHLY_BUDGET_STANDARD;
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
                .openTime(open)
                .closeTime(close)
                .midTime(mid)
                .morningLabel(morningLabel)
                .afternoonLabel(afternoonLabel)
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
                        .costIncomplete(costIncomplete[0])
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

        boolean saved = count != -1;
        if (count == -1) {
            count = suggestedCount(pos, date, "morning".equals(shiftType));
        }

        int min = pos.getDefaultMin();
        int max = pos.getDefaultMax();
        int target = pos.getDefaultTarget();

        String status = "COMPLIANT";
        String statusLabel = "Đạt chuẩn";
        boolean isPeakSlot = isWeekend && "afternoon".equalsIgnoreCase(shiftType) && "BARISTA".equals(pos.getCode()) && count > target;

        if (count < min) {
            status = "VIOLATION";
            statusLabel = "Vi phạm";
        } else if (count > max) {
            status = "OVER";
            statusLabel = "Vượt chuẩn";
        } else if (isPeakSlot) {
            status = "PEAK";
            statusLabel = "Cao điểm";
        }

        String quotaId = date.toString() + "_" + shiftType + "_" + pos.getId();

        return WeeklyMatrixQuotaResponse.MatrixCell.builder()
                .source(saved ? "SAVED" : "SUGGESTED")
                .assignedCount(assignedCount(shift, pos.getId()))
                .shortageCount(Math.max(0, count - assignedCount(shift, pos.getId())))
                .excessCount(Math.max(0, assignedCount(shift, pos.getId()) - count))
                .unclassifiedAssignedCount(assignedCount(shift, null))
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

    private int suggestedCount(PositionDTO position, LocalDate date, boolean morning) {
        boolean weekend = date.getDayOfWeek() == DayOfWeek.SATURDAY || date.getDayOfWeek() == DayOfWeek.SUNDAY;
        if (weekend && ("BARISTA".equals(position.getCode()) || "KITCHEN".equals(position.getCode()))) {
            return position.getDefaultTarget() + 1;
        }
        if ("CASHIER".equals(position.getCode())) return morning ? 1 : 2;
        return position.getDefaultTarget();
    }

    private int assignedCount(Shift shift, UUID positionId) {
        if (shift == null || shift.getStatus() == ShiftStatus.CANCELLED || shift.getAssignments() == null) return 0;
        return (int) shift.getAssignments().stream()
                .filter(a -> !a.isDeleted() && Objects.equals(a.getRequiredSkillId(), positionId))
                .count();
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
    @Transactional(isolation = org.springframework.transaction.annotation.Isolation.SERIALIZABLE)
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

        Store lockedStore = storeRepository.findByIdForUpdate(branchId)
                .orElseThrow(() -> new BusinessException("Không tìm thấy chi nhánh", HttpStatus.NOT_FOUND));

        // Update norm override if Min/Target/Max changed
        if (req.getPositionId() != null && (req.getMin() != null || req.getTarget() != null || req.getMax() != null)) {
            Store store = lockedStore;
            Skill skill = skillRepository.findByIdAndStoreId(req.getPositionId(), branchId)
                    .orElseThrow(() -> new BusinessException("Position/Skill not found in this store: " + req.getPositionId(), HttpStatus.NOT_FOUND));
            PositionNormOverride existing = positionNormOverrideRepository.findByStoreIdAndSkillId(branchId, req.getPositionId())
                    .orElse(PositionNormOverride.builder().store(store).skill(skill).min(1).target(2).max(3).build());
            if (req.getMin() != null) existing.setMin(req.getMin());
            if (req.getTarget() != null) existing.setTarget(req.getTarget());
            if (req.getMax() != null) existing.setMax(req.getMax());
            validateNorm(existing);
            positionNormOverrideRepository.save(existing);
        }

        // Update shift requirement in database if count is provided
        if (req.getDate() != null && req.getShiftType() != null && req.getPositionId() != null && req.getCount() != null) {
            Store store = lockedStore;

            LocalTime open = getStoreOpenTime(store);
            LocalTime mid = getStoreMidTime(store);
            LocalTime close = getStoreCloseTime(store);

            LocalTime start = req.getShiftType().equalsIgnoreCase("morning") ? open : mid;
            LocalTime end = req.getShiftType().equalsIgnoreCase("morning") ? mid : close;

            Skill skill = skillRepository.findByIdAndStoreId(req.getPositionId(), branchId)
                    .orElseThrow(() -> new BusinessException("Position/Skill not found in this store: " + req.getPositionId(), HttpStatus.NOT_FOUND));
            Shift shift = getOrCreateShift(store, slotDate(req.getDate(), open, start), start, end, req.getShiftType().equalsIgnoreCase("morning") ? "Ca Sáng" : "Ca Chiều");

            if (shift != null) {
                requireCapacity(shift, skill.getId(), req.getCount());
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
    @Transactional(isolation = org.springframework.transaction.annotation.Isolation.SERIALIZABLE)
    public void autoFillQuotas(AutoFillQuotaRequest req) {
        if (req == null || req.getBranchId() == null) {
            throw new BusinessException("Branch ID is required", HttpStatus.BAD_REQUEST);
        }
        UUID branchId = req.getBranchId();
        Store store = storeRepository.findByIdForUpdate(branchId)
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

        java.util.Map<java.util.UUID, com.shiftsync.skill.entity.Skill> posSkillMap = skillRepository.findAllById(positions.stream().map(PositionDTO::getId).collect(java.util.stream.Collectors.toList())).stream().collect(java.util.stream.Collectors.toMap(com.shiftsync.skill.entity.Skill::getId, s -> s));
        if (positions.isEmpty() || posSkillMap.size() != positions.size()) {
            throw new BusinessException("Hãy tạo các vị trí của cửa hàng trước khi tự động điền định biên", HttpStatus.BAD_REQUEST);
        }
        for (LocalDate d : dates) {
            boolean isWeekend = d.getDayOfWeek() == DayOfWeek.SATURDAY || d.getDayOfWeek() == DayOfWeek.SUNDAY;

            Shift morning = getOrCreateShift(store, d, open, mid, "Ca Sáng");
            Shift afternoon = getOrCreateShift(store, slotDate(d, open, mid), mid, close, "Ca Chiều");

            for (Shift s : Arrays.asList(morning, afternoon)) {
                if (s.getRequirements() == null) {
                    s.setRequirements(new ArrayList<>());
                }
                boolean isMorning = s == morning;
                for (PositionDTO pos : positions) {
                    Skill skill = posSkillMap.get(pos.getId());
                    if (skill == null) continue;

                    int targetCount = suggestedCount(pos, d, isMorning);
                    requireCapacity(s, skill.getId(), targetCount);

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
    @Transactional(isolation = org.springframework.transaction.annotation.Isolation.SERIALIZABLE)
    public Map<String, Object> applyToScheduler(ApplySchedulerRequest req) {
        if (req == null || req.getBranchId() == null) {
            throw new BusinessException("Branch ID is required", HttpStatus.BAD_REQUEST);
        }
        Store store = storeRepository.findByIdForUpdate(req.getBranchId())
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

        // Demand planning must never delete existing shifts or their assignments.
        LocalDate fetchEnd = closeTime.isBefore(openTime) ? end.plusDays(1) : end;
        List<Shift> existingDraftShifts = shiftRepository.findByStoreIdAndShiftDateBetween(store.getId(), start, fetchEnd)
                .stream().filter(s -> s.getStatus() == ShiftStatus.DRAFT).collect(Collectors.toList());

        List<UUID> reviewShiftIds = existingDraftShifts.stream()
                .filter(s -> !com.shiftsync.store.service.OperatingHours.contains(store, s.getStartTime(), s.getEndTime()))
                .map(Shift::getId).toList();

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

        java.util.Map<java.util.UUID, com.shiftsync.skill.entity.Skill> posSkillMap2 = skillRepository.findAllById(positions.stream().map(PositionDTO::getId).collect(java.util.stream.Collectors.toList())).stream().collect(java.util.stream.Collectors.toMap(com.shiftsync.skill.entity.Skill::getId, s -> s));
        if (positions.isEmpty() || posSkillMap2.size() != positions.size()) {
            throw new BusinessException("Hãy tạo các vị trí của cửa hàng trước khi áp dụng định biên", HttpStatus.BAD_REQUEST);
        }
        for (LocalDate d : dates) {
            boolean isWeekend = d.getDayOfWeek() == DayOfWeek.SATURDAY || d.getDayOfWeek() == DayOfWeek.SUNDAY;

            Shift morning = getOrCreateShift(store, d, openTime, midTime, "Ca Sáng");
            Shift afternoon = getOrCreateShift(store, slotDate(d, openTime, midTime), midTime, closeTime, "Ca Chiều");

            for (Shift s : Arrays.asList(morning, afternoon)) {
                if (s.getRequirements() == null) {
                    s.setRequirements(new ArrayList<>());
                }
                boolean isMorning = s == morning;

                Map<UUID, ShiftSkillRequirement> existingReqs = new HashMap<>();
                for (ShiftSkillRequirement r : s.getRequirements()) {
                    if (r.getSkill() != null) {
                        existingReqs.put(r.getSkill().getId(), r);
                    }
                }

                boolean modified = false;
                for (PositionDTO pos : positions) {
                    Skill skill = posSkillMap2.get(pos.getId());
                    if (skill == null) continue;

                    if (!existingReqs.containsKey(skill.getId())) {
                        int targetCount = suggestedCount(pos, d, isMorning);

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
        result.put("reviewShiftIds", reviewShiftIds);
        result.put("message", reviewShiftIds.isEmpty()
                ? "Đã áp dụng định biên sang Scheduler thành công!"
                : "Đã áp dụng định biên. Giữ nguyên " + reviewShiftIds.size()
                    + " ca nháp ngoài giờ mở cửa và phân công hiện có; cần rà soát riêng.");
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

    @Transactional(isolation = org.springframework.transaction.annotation.Isolation.SERIALIZABLE)
    public void updateMonthlyBudget(UUID branchId, long budget) {
        if (branchId == null || budget <= 0) {
            throw new BusinessException("Ngân sách phải lớn hơn 0 và có chi nhánh hợp lệ.", HttpStatus.BAD_REQUEST);
        }
        Store store = storeRepository.findById(branchId)
                .orElseThrow(() -> new BusinessException("Store not found", HttpStatus.NOT_FOUND));
        store.setMonthlyQuotaBudget(budget);
        storeRepository.save(store);
    }
}

