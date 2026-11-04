package com.shiftsync.payroll.service;
import com.shiftsync.audit.service.AuditLogService;

import com.shiftsync.attendance.entity.Attendance;
import com.shiftsync.attendance.repository.AttendanceRepository;
import com.shiftsync.employment.entity.Employment;
import com.shiftsync.employment.repository.EmploymentRepository;
import com.shiftsync.payroll.entity.Holiday;
import com.shiftsync.payroll.entity.Payroll;
import com.shiftsync.payroll.entity.PayrollPeriod;
import com.shiftsync.payroll.enums.PayrollPeriodStatus;
import com.shiftsync.payroll.repository.HolidayRepository;
import com.shiftsync.payroll.repository.PayrollPeriodRepository;
import com.shiftsync.payroll.repository.PayrollRepository;
import com.shiftsync.shared.exception.BusinessException;
import com.shiftsync.shift.entity.ShiftAssignment;
import com.shiftsync.shift.enums.ShiftStatus;
import com.shiftsync.shift.repository.ShiftAssignmentRepository;
import com.shiftsync.store.entity.Store;
import com.shiftsync.store.repository.StoreRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class PayrollCalculationService {
    private final AuditLogService auditLogService;
    private final CompensationRevisionResolver compensationRevisions;

    private final PayrollPeriodRepository payrollPeriodRepository;
    private final PayrollRepository payrollRepository;
    private final HolidayRepository holidayRepository;
    private final EmploymentRepository employmentRepository;
    private final ShiftAssignmentRepository shiftAssignmentRepository;
    private final AttendanceRepository attendanceRepository;
    private final StoreRepository storeRepository;
    private final com.shiftsync.skill.repository.SkillRepository skillRepository;
    private final com.shiftsync.notification.service.NotificationService notificationService;
    private final com.shiftsync.leave.repository.LeaveRequestRepository leaveRequestRepository;
    @org.springframework.beans.factory.annotation.Autowired
    private PayrollGlobalInputGuard globalInputGuard;

    @Transactional(rollbackFor = Exception.class)
    public void generatePayroll(UUID storeId, LocalDate startDate, LocalDate endDate) {
        globalInputGuard.lock();
        long startTime = System.currentTimeMillis(); // Profiling start

        if (endDate.isBefore(startDate)) {
            throw new BusinessException("End date cannot be before start date.", HttpStatus.BAD_REQUEST);
        }


        java.util.List<PayrollPeriod> overlaps = payrollPeriodRepository.findOverlappingPeriods(storeId, startDate, endDate);
        java.util.Optional<PayrollPeriod> existingOpt = java.util.Optional.empty();

        for (PayrollPeriod overlap : overlaps) {
            if (overlap.getStartDate().equals(startDate) && overlap.getEndDate().equals(endDate)) {
                existingOpt = java.util.Optional.of(overlap);
            } else {
                throw new BusinessException(String.format("Requested period (%s to %s) overlaps with existing period (%s to %s).",
                        startDate, endDate, overlap.getStartDate(), overlap.getEndDate()), HttpStatus.CONFLICT);
            }
        }

        if (existingOpt.isPresent()) {
            com.shiftsync.payroll.enums.PayrollPeriodStatus currentStatus = existingOpt.get().getStatus();
            if (currentStatus == com.shiftsync.payroll.enums.PayrollPeriodStatus.PAID) {
                throw new BusinessException("Cannot regenerate payroll. Period is already PAID.", HttpStatus.BAD_REQUEST);
            }
            if (currentStatus == com.shiftsync.payroll.enums.PayrollPeriodStatus.CONFIRMED) {
                boolean isAdmin = false;
                org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
                if (auth != null) {
                    isAdmin = auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
                }
                if (!isAdmin) {
                    throw new BusinessException("Cannot regenerate payroll. Period is already CONFIRMED. Only ADMIN can do this.", HttpStatus.FORBIDDEN);
                }
                java.util.UUID authUserId = null;
                if (auth != null && auth.getPrincipal() instanceof com.shiftsync.shared.security.CustomUserDetails) {
                    authUserId = ((com.shiftsync.shared.security.CustomUserDetails) auth.getPrincipal()).getId();
                }
                if (authUserId != null) {
                    auditLogService.log(authUserId, "UPDATE_PAYROLL_STATUS", "PayrollPeriod", existingOpt.get().getId(),
                        java.util.Map.of("status", "CONFIRMED"),
                        java.util.Map.of("status", "DRAFT (Regenerated)"));
                }
            }
            // Hard delete old payrolls for this period so we can regenerate cleanly
            payrollRepository.hardDeleteByPayrollPeriodId(existingOpt.get().getId());
        }


        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new BusinessException("Store not found.", HttpStatus.NOT_FOUND));

        // Reusing or Creating the PayrollPeriod
        PayrollPeriod payrollPeriod;
        if (existingOpt.isPresent()) {
            payrollPeriod = existingOpt.get();
            payrollPeriod.setStatus(PayrollPeriodStatus.DRAFT);
            payrollPeriod = payrollPeriodRepository.save(payrollPeriod);
        } else {
            payrollPeriod = PayrollPeriod.builder()
                    .store(store)
                    .startDate(startDate)
                    .endDate(endDate)
                    .status(PayrollPeriodStatus.DRAFT)
                    .build();
            payrollPeriod = payrollPeriodRepository.save(payrollPeriod);
        }

        List<Payroll> payrolls = calculatePayrolls(storeId, payrollPeriod, startDate, endDate);

        payrollRepository.saveAll(payrolls);
        payrollPeriod.setLastGeneratedAt(java.time.OffsetDateTime.now(java.time.ZoneOffset.UTC));
        payrollPeriodRepository.save(payrollPeriod);

        long endTime = System.currentTimeMillis(); // Profiling end
        log.info("Tính lương hoàn tất sau {} mili giây cho {} nhân viên.", (endTime - startTime), payrolls.size());

        // Hook FR-19: PAYROLL_COMPLETED
        for (Payroll p : payrolls) {
            notificationService.sendNotification(
                p.getStaff().getId(),
                com.shiftsync.notification.entity.NotificationType.PAYROLL_COMPLETED,
                "Payroll Generated",
                "Your payroll for the period " + startDate + " to " + endDate + " has been generated.",
                null
            );
        }
    }

    private List<Payroll> calculatePayrolls(UUID storeId, PayrollPeriod payrollPeriod, LocalDate startDate, LocalDate endDate) {
        // 1. Fetch holidays
        Map<LocalDate, BigDecimal> holidayMap = holidayRepository.findByHolidayDateBetween(startDate, endDate)
                .stream().collect(Collectors.toMap(Holiday::getHolidayDate, Holiday::getRateMultiplier));

        // 2. Fetch skills for position rate resolution
        Map<UUID, com.shiftsync.skill.entity.Skill> skillMap = skillRepository.findByStoreId(storeId)
                .stream().collect(Collectors.toMap(com.shiftsync.skill.entity.Skill::getId, s -> s));

        // Include former employees and each rehire episode, including weekly history.
        LocalDate historyStart = startDate.with(java.time.temporal.TemporalAdjusters.previousOrSame(java.time.DayOfWeek.MONDAY)).minusDays(1);
        List<Employment> employments = employmentRepository.findPayrollEmployments(storeId,
                com.shiftsync.shared.security.SystemRole.STAFF, historyStart, endDate);
        Map<UUID, List<Employment>> employmentsByStaff = employments.stream()
                .collect(Collectors.groupingBy(emp -> emp.getUser().getId()));

        // 4. Bulk Fetch ShiftAssignments and Attendances to avoid N+1
        List<ShiftAssignment> allAssignments = new ArrayList<>(shiftAssignmentRepository.findByShift_Store_IdAndShift_ShiftDateBetween(storeId, startDate, endDate));
        List<Attendance> allAttendances = new ArrayList<>(attendanceRepository.findByShiftAssignment_Shift_Store_IdAndShiftAssignment_Shift_ShiftDateBetween(storeId, startDate, endDate));
        LocalDate historyEnd = startDate.minusDays(1);
        allAssignments.addAll(shiftAssignmentRepository.findPayrollHistory(storeId, historyStart, historyEnd));
        allAttendances.addAll(attendanceRepository.findPayrollHistory(storeId, historyStart, historyEnd));

        // The employee's home store pays support shifts. Never include those
        // assignments in the receiving store's payroll, even for dual members.
        allAssignments.removeIf(a -> a.getSource() == com.shiftsync.shift.enums.AssignmentSource.WORKFORCE_SHARING);
        List<ShiftAssignment> supportAssignments = shiftAssignmentRepository.findSupportForPayroll(storeId, historyStart, endDate);
        allAssignments.addAll(supportAssignments);
        if (!supportAssignments.isEmpty()) {
            allAttendances.addAll(attendanceRepository.findByShiftAssignment_IdIn(supportAssignments.stream().map(ShiftAssignment::getId).toList()));
        }

        // Group Assignments by StaffId
        Map<UUID, List<ShiftAssignment>> assignmentsByStaff = allAssignments.stream()
                .filter(a -> a.getShift().getStatus() == ShiftStatus.COMPLETED || a.getShift().getStatus() == ShiftStatus.PUBLISHED)
                .collect(Collectors.groupingBy(a -> a.getStaff().getId()));

        // Group Attendances by ShiftAssignmentId
        Map<UUID, Attendance> attendanceMap = allAttendances.stream()
                .collect(Collectors.toMap(a -> a.getShiftAssignment().getId(), a -> a, (a1, a2) -> a1));

        // 5. Bulk Fetch Approved Leave Requests for Store in Date Range
        List<com.shiftsync.leave.entity.LeaveRequest> approvedLeaves = new ArrayList<>(leaveRequestRepository.findApprovedLeavesInPeriod(
                storeId, com.shiftsync.leave.enums.LeaveStatus.APPROVED, startDate, endDate));
        approvedLeaves.addAll(leaveRequestRepository.findSupportLeavesForPayroll(storeId, startDate, endDate));
        if (approvedLeaves.stream().anyMatch(leave -> leave.getLeaveType() != null && leave.getLeaveType().isPaid()
                && !leave.isAssignmentProvenanceComplete())) {
            throw new BusinessException("Không thể tính lương: đơn nghỉ có lương cũ chưa được đối chiếu lịch phân công", HttpStatus.CONFLICT);
        }
        Map<UUID, List<com.shiftsync.leave.entity.LeaveRequest>> leaveMap = approvedLeaves.stream()
                .collect(Collectors.groupingBy(l -> l.getStaff().getId()));

        List<Payroll> payrolls = new ArrayList<>();

        for (List<Employment> episodes : employmentsByStaff.values()) {
            if (episodes.stream().noneMatch(e -> !e.getJoinedDate().isAfter(endDate)
                    && (e.getLeftDate() == null || !e.getLeftDate().isBefore(startDate)))) continue;
            Employment emp = episodes.get(0);
            List<ShiftAssignment> empAssignments = assignmentsByStaff.getOrDefault(emp.getUser().getId(), Collections.emptyList());
            List<com.shiftsync.leave.entity.LeaveRequest> empLeaves = leaveMap.getOrDefault(emp.getUser().getId(), Collections.emptyList());
            Payroll payroll = calculateForEmployee(emp, episodes, payrollPeriod, empAssignments, empLeaves, attendanceMap, holidayMap, skillMap);
            payrolls.add(payroll);
        }

        return payrolls;
    }

    private BigDecimal resolvePositionHourlyRate(ShiftAssignment assignment, Map<UUID, com.shiftsync.skill.entity.Skill> skillMap, Employment emp) {
        if (assignment != null && assignment.getSource() == com.shiftsync.shift.enums.AssignmentSource.WORKFORCE_SHARING
                && assignment.getRequiredSkillId() != null && !skillMap.containsKey(assignment.getRequiredSkillId())) {
            var role = skillRepository.findById(assignment.getRequiredSkillId())
                    .filter(skill -> skill.getStore() != null && assignment.getShift() != null
                            && skill.getStore().getId().equals(assignment.getShift().getStore().getId()))
                    .orElseThrow(() -> new BusinessException("Không xác định được mức lương vị trí của ca hỗ trợ", HttpStatus.CONFLICT));
            skillMap.put(role.getId(), role);
        }
        if (assignment != null && assignment.getRequiredSkillId() != null && skillMap.containsKey(assignment.getRequiredSkillId())) {
            com.shiftsync.skill.entity.Skill skill = skillMap.get(assignment.getRequiredSkillId());
            if (skill != null && skill.getHourlyRate() != null && skill.getHourlyRate().compareTo(BigDecimal.ZERO) > 0) {
                return skill.getHourlyRate();
            }
        }

        if (emp != null && emp.getHourlyRate() != null && emp.getHourlyRate().compareTo(BigDecimal.ZERO) > 0) {
            return emp.getHourlyRate();
        }
        if (emp != null && emp.getContractType() != null
                && emp.getContractType().getDefaultHourlyRate() != null
                && emp.getContractType().getDefaultHourlyRate().signum() > 0) {
            return emp.getContractType().getDefaultHourlyRate();
        }
        throw new BusinessException("Không xác định được mức lương hợp lệ cho ca làm việc; cần đối soát hợp đồng trước khi tính lương", HttpStatus.CONFLICT);
    }

    private Payroll calculateForEmployee(
            Employment emp,
            List<Employment> episodes,
            PayrollPeriod period,
            List<ShiftAssignment> assignments,
            List<com.shiftsync.leave.entity.LeaveRequest> empLeaves,
            Map<UUID, Attendance> attendanceMap,
            Map<LocalDate, BigDecimal> holidayMap,
            Map<UUID, com.shiftsync.skill.entity.Skill> skillMap) {

        // 1. Process Approved Leave Requests for this Employee in Period
        Set<LocalDate> allApprovedLeaveDates = new HashSet<>();
        Set<LocalDate> processedPaidLeaveDates = new HashSet<>();
        BigDecimal totalPaidLeaveHrs = BigDecimal.ZERO;
        BigDecimal totalPaidLeaveAmt = BigDecimal.ZERO;

        if (empLeaves != null) {
            for (com.shiftsync.leave.entity.LeaveRequest leave : empLeaves) {
                if (leave.getStatus() != com.shiftsync.leave.enums.LeaveStatus.APPROVED) {
                    continue;
                }
                LocalDate effStart = leave.getStartDate().isBefore(period.getStartDate()) ? period.getStartDate() : leave.getStartDate();
                LocalDate effEnd = leave.getEndDate().isAfter(period.getEndDate()) ? period.getEndDate() : leave.getEndDate();

                if (effStart.isAfter(effEnd)) {
                    continue; // Outside payroll period
                }

                LocalDate d = effStart;
                while (!d.isAfter(effEnd)) {
                    allApprovedLeaveDates.add(d);
                    d = d.plusDays(1);
                }

                if (leave.getLeaveType() == null || !leave.getLeaveType().isPaid()) {
                    continue; // Unpaid / non-compensable leave
                }

                LocalDate cur = effStart;
                while (!cur.isAfter(effEnd)) {
                    if (processedPaidLeaveDates.add(cur)) {
                        final LocalDate leaveDate = cur;
                        Map<UUID, ShiftAssignment> dateAssignments = new LinkedHashMap<>();
                        boolean foreignLeave = leave.getStore() != null && period.getStore() != null
                                && !leave.getStore().getId().equals(period.getStore().getId());
                        if (!foreignLeave) {
                            assignments.stream().filter(a -> a.getShift() != null
                                    && !a.getShift().getShiftDate().isBefore(leaveDate.minusDays(1))
                                    && !a.getShift().getShiftDate().isAfter(leaveDate))
                                    .forEach(a -> dateAssignments.put(a.getId(), a));
                        }
                        if (leave.getId() != null && period.getStore() != null) {
                            shiftAssignmentRepository.findRemovedForLeave(leave.getId(), emp.getUser().getId(),
                                    period.getStore().getId(), leaveDate.minusDays(1), leaveDate)
                                    .forEach(a -> dateAssignments.putIfAbsent(a.getId(), a));
                        }

                        for (ShiftAssignment sa : dateAssignments.values()) {
                            // A receiving-store leave may compensate only the
                            // support work linked to it, not ordinary home shifts.
                            if (foreignLeave
                                    && sa.getSource() != com.shiftsync.shift.enums.AssignmentSource.WORKFORCE_SHARING) continue;
                            if (sa.getShift() == null) continue;
                            var shiftStart = sa.getShift().getShiftDate().atTime(sa.getShift().getStartTime());
                            var shiftEnd = sa.getShift().getShiftDate().atTime(sa.getShift().getEndTime());
                            if (!shiftEnd.isAfter(shiftStart)) shiftEnd = shiftEnd.plusDays(1);
                            var coveredStart = shiftStart.isAfter(leaveDate.atStartOfDay()) ? shiftStart : leaveDate.atStartOfDay();
                            var dayEnd = leaveDate.plusDays(1).atStartOfDay();
                            var coveredEnd = shiftEnd.isBefore(dayEnd) ? shiftEnd : dayEnd;
                            double schedHours = Duration.between(coveredStart, coveredEnd).toMillis() / 3_600_000.0;
                            if (schedHours <= 0) continue;

                            // Double payment protection: check if employee actually worked this shift (attendance)
                            Attendance att = attendanceMap.get(sa.getId());
                            double workedHours = 0.0;
                            if (att != null && att.getCheckInTime() != null && att.getCheckOutTime() != null) {
                                var businessZone = java.time.ZoneId.of("Asia/Ho_Chi_Minh");
                                var actualStart = att.getCheckInTime().atZoneSameInstant(businessZone).toLocalDateTime();
                                var actualEnd = att.getCheckOutTime().atZoneSameInstant(businessZone).toLocalDateTime();
                                var overlapStart = actualStart.isAfter(coveredStart) ? actualStart : coveredStart;
                                var overlapEnd = actualEnd.isBefore(coveredEnd) ? actualEnd : coveredEnd;
                                workedHours = Math.max(0.0, Duration.between(overlapStart, overlapEnd).toMillis() / 3_600_000.0);
                            }

                            double unworkedLeaveHours = Math.max(0.0, schedHours - workedHours);
                            if (unworkedLeaveHours > 0) {
                                Employment leaveEmployment = employmentForAssignment(sa, episodes, leaveDate);
                                BigDecimal shiftHourlyRate = compensationRevisions.resolvePayTerms(leaveEmployment.getId(), leaveEmployment.getStore().getId(), sa.getShift().getStore().getId(), sa.getRequiredSkillId(), leaveDate).hourlyRate();
                                BigDecimal hrs = BigDecimal.valueOf(unworkedLeaveHours);
                                totalPaidLeaveHrs = totalPaidLeaveHrs.add(hrs);
                                totalPaidLeaveAmt = totalPaidLeaveAmt.add(hrs.multiply(shiftHourlyRate));
                            }
                        }
                    }
                    cur = cur.plusDays(1);
                }
            }
        }

        if (assignments.isEmpty() && totalPaidLeaveHrs.compareTo(BigDecimal.ZERO) == 0) {
            return buildEmptyPayroll(period, emp);
        }

        class PayrollAccumulator {
            BigDecimal totalBaseAmt = BigDecimal.ZERO;
            BigDecimal totalOtAmt = BigDecimal.ZERO;
            BigDecimal totalHolidayAmt = BigDecimal.ZERO;

            BigDecimal totalBaseHrs = BigDecimal.ZERO;
            BigDecimal totalOtHrs = BigDecimal.ZERO;
            BigDecimal totalHolidayHrs = BigDecimal.ZERO;

            double hoursWorkedThisWeek = 0.0;

            void addSegment(double segmentHours, LocalDate date, int maxWeeklyHours, BigDecimal hourlyRate, Map<LocalDate, BigDecimal> holidayMap, BigDecimal OT_MULTIPLIER) {
                if (segmentHours <= 0) return;
                boolean isHoliday = holidayMap.containsKey(date);
                BigDecimal holidayMultiplier = isHoliday ? holidayMap.get(date) : BigDecimal.ONE;

                double remainingStandard = Math.max(0, maxWeeklyHours - hoursWorkedThisWeek);
                double stdHours = Math.min(segmentHours, remainingStandard);
                double otHours = segmentHours - stdHours;

                if (stdHours > 0) {
                    BigDecimal hrs = BigDecimal.valueOf(stdHours);
                    if (isHoliday) {
                        totalHolidayHrs = totalHolidayHrs.add(hrs);
                        totalHolidayAmt = totalHolidayAmt.add(hrs.multiply(hourlyRate).multiply(holidayMultiplier));
                    } else {
                        totalBaseHrs = totalBaseHrs.add(hrs);
                        totalBaseAmt = totalBaseAmt.add(hrs.multiply(hourlyRate));
                    }
                }

                if (otHours > 0) {
                    BigDecimal hrs = BigDecimal.valueOf(otHours);
                    BigDecimal effectiveMultiplier = isHoliday ? OT_MULTIPLIER.max(holidayMultiplier) : OT_MULTIPLIER;

                    if (isHoliday && holidayMultiplier.compareTo(OT_MULTIPLIER) > 0) {
                        totalHolidayHrs = totalHolidayHrs.add(hrs);
                        totalHolidayAmt = totalHolidayAmt.add(hrs.multiply(hourlyRate).multiply(effectiveMultiplier));
                    } else {
                        totalOtHrs = totalOtHrs.add(hrs);
                        totalOtAmt = totalOtAmt.add(hrs.multiply(hourlyRate).multiply(effectiveMultiplier));
                    }
                }
                hoursWorkedThisWeek += segmentHours;
            }
        }

        PayrollAccumulator totalAcc = new PayrollAccumulator();

        record WorkSegment(java.time.ZonedDateTime start, java.time.ZonedDateTime end, UUID assignmentId, CompensationRevisionResolver.PayTerms terms) {}
        var segments = new ArrayList<WorkSegment>();
        var businessZone = java.time.ZoneId.of("Asia/Ho_Chi_Minh");
        for (ShiftAssignment assignment : assignments) {
            Attendance att = attendanceMap.get(assignment.getId());
            if (att == null || att.getCheckInTime() == null || att.getCheckOutTime() == null) continue;
            var cursor = att.getCheckInTime().atZoneSameInstant(businessZone);
            var end = att.getCheckOutTime().atZoneSameInstant(businessZone);
            while (cursor.isBefore(end)) {
                var midnight = cursor.toLocalDate().plusDays(1).atStartOfDay(businessZone);
                var segmentEnd = midnight.isBefore(end) ? midnight : end;
                if (!cursor.toLocalDate().isBefore(historyStart(period.getStartDate())) && !cursor.toLocalDate().isAfter(period.getEndDate())) {
                    Employment effective = employmentForAssignment(assignment, episodes, cursor.toLocalDate());
                    var terms = compensationRevisions.resolvePayTerms(effective.getId(), effective.getStore().getId(), assignment.getShift().getStore().getId(), assignment.getRequiredSkillId(), cursor.toLocalDate());
                    segments.add(new WorkSegment(cursor, segmentEnd, assignment.getId(), terms));
                }
                cursor = segmentEnd;
            }
        }
        segments.sort(Comparator.comparing(WorkSegment::start).thenComparing(WorkSegment::assignmentId));
        Map<LocalDate, Double> workedByWeek = new HashMap<>();
        LocalDate firstWeek = period.getStartDate().with(java.time.temporal.TemporalAdjusters.previousOrSame(java.time.DayOfWeek.MONDAY));
        for (var segment : segments) {
            LocalDate date = segment.start().toLocalDate();
            if (date.isBefore(firstWeek) || date.isAfter(period.getEndDate())) continue;
            LocalDate weekStart = date.with(java.time.temporal.TemporalAdjusters.previousOrSame(java.time.DayOfWeek.MONDAY));
            totalAcc.hoursWorkedThisWeek = workedByWeek.getOrDefault(weekStart, 0.0);
            double hours = Duration.between(segment.start(), segment.end()).toMillis() / 3_600_000.0;
            if (date.isBefore(period.getStartDate())) {
                totalAcc.hoursWorkedThisWeek += hours;
            } else {
                totalAcc.addSegment(hours, date, segment.terms().maxWeeklyHours(), segment.terms().hourlyRate(), holidayMap, segment.terms().otMultiplier());
            }
            workedByWeek.put(weekStart, totalAcc.hoursWorkedThisWeek);
        }

        BigDecimal totalBaseHrs = totalAcc.totalBaseHrs.add(totalPaidLeaveHrs);
        BigDecimal totalBaseAmt = totalAcc.totalBaseAmt.add(totalPaidLeaveAmt);
        BigDecimal totalHours = totalBaseHrs.add(totalAcc.totalOtHrs).add(totalAcc.totalHolidayHrs);
        BigDecimal roundedBaseAmt = totalBaseAmt.setScale(2, RoundingMode.HALF_UP);
        BigDecimal roundedOtAmt = totalAcc.totalOtAmt.setScale(2, RoundingMode.HALF_UP);
        BigDecimal roundedHolidayAmt = totalAcc.totalHolidayAmt.setScale(2, RoundingMode.HALF_UP);
        BigDecimal totalAmt = roundedBaseAmt.add(roundedOtAmt).add(roundedHolidayAmt);

        return Payroll.builder()
                .payrollPeriod(period)
                .staff(emp.getUser())
                .totalHours(totalHours.setScale(2, RoundingMode.HALF_UP))
                .otHours(totalAcc.totalOtHrs.setScale(2, RoundingMode.HALF_UP))
                .holidayHours(totalAcc.totalHolidayHrs.setScale(2, RoundingMode.HALF_UP))
                .baseAmount(roundedBaseAmt)
                .otAmount(roundedOtAmt)
                .holidayAmount(roundedHolidayAmt)
                .totalAmount(totalAmt.setScale(2, RoundingMode.HALF_UP))
                .build();
    }

    private static LocalDate historyStart(LocalDate startDate) {
        return startDate.with(java.time.temporal.TemporalAdjusters.previousOrSame(java.time.DayOfWeek.MONDAY)).minusDays(1);
    }

    private Employment employmentOn(List<Employment> episodes, LocalDate date) {
        List<Employment> matches = episodes.stream().filter(e -> !e.getJoinedDate().isAfter(date)
                && (e.getLeftDate() == null || !e.getLeftDate().isBefore(date))).toList();
        if (matches.size() != 1) {
            throw new BusinessException("Không thể tính lương ngày " + date + ": cần đối soát thời gian hợp đồng của nhân viên", HttpStatus.CONFLICT);
        }
        return matches.get(0);
    }

    private Employment employmentForAssignment(ShiftAssignment assignment, List<Employment> episodes, LocalDate date) {
        Employment effective = employmentOn(episodes, date);
        if (assignment.getSource() == com.shiftsync.shift.enums.AssignmentSource.WORKFORCE_SHARING
                && (assignment.getSupportEmployment() == null || !java.util.Objects.equals(effective.getId(), assignment.getSupportEmployment().getId()))) {
            throw new BusinessException("Không thể tính lương ca hỗ trợ: hợp đồng nguồn không khớp ngày làm việc", HttpStatus.CONFLICT);
        }
        return effective;
    }

    private Payroll buildEmptyPayroll(PayrollPeriod period, Employment emp) {
        return Payroll.builder()
                .payrollPeriod(period)
                .staff(emp.getUser())
                .totalHours(BigDecimal.ZERO)
                .otHours(BigDecimal.ZERO)
                .holidayHours(BigDecimal.ZERO)
                .baseAmount(BigDecimal.ZERO)
                .otAmount(BigDecimal.ZERO)
                .holidayAmount(BigDecimal.ZERO)
                .totalAmount(BigDecimal.ZERO)
                .build();
    }



    @Transactional(isolation = org.springframework.transaction.annotation.Isolation.SERIALIZABLE)
    public void updatePayrollPeriodStatus(java.util.UUID storeId, java.util.UUID periodId, com.shiftsync.payroll.enums.PayrollPeriodStatus newStatus, java.util.UUID actorId) {
        globalInputGuard.lock();
        storeRepository.findByIdForUpdate(storeId)
                .orElseThrow(() -> new BusinessException("Không tìm thấy chi nhánh", HttpStatus.NOT_FOUND));
        storeRepository.bumpPayrollLockVersion(storeId);
        PayrollPeriod period = payrollPeriodRepository.findByIdForUpdate(periodId)
                .orElseThrow(() -> new BusinessException("Payroll period not found.", HttpStatus.NOT_FOUND));

        if (!period.getStore().getId().equals(storeId)) {
            throw new BusinessException("Payroll period does not belong to this store.", HttpStatus.FORBIDDEN);
        }

        // Fetch user roles
        boolean isAdmin = false;
        org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        if (auth != null) {
            isAdmin = auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        }

        // Validate One-way state transition: DRAFT -> CONFIRMED -> PAID
        if (period.getStatus() == com.shiftsync.payroll.enums.PayrollPeriodStatus.PAID) {
            throw new BusinessException("Cannot change status of a PAID payroll period.", HttpStatus.BAD_REQUEST);
        }
        if (period.getStatus() == com.shiftsync.payroll.enums.PayrollPeriodStatus.CONFIRMED && newStatus == com.shiftsync.payroll.enums.PayrollPeriodStatus.DRAFT) {
            if (!isAdmin) {
                throw new BusinessException("Cannot revert CONFIRMED payroll period back to DRAFT. Only ADMIN can do this.", HttpStatus.FORBIDDEN);
            }
        }
        if (period.getStatus() == com.shiftsync.payroll.enums.PayrollPeriodStatus.DRAFT && newStatus == com.shiftsync.payroll.enums.PayrollPeriodStatus.PAID) {
            throw new BusinessException("Cannot skip CONFIRMED state. Must confirm before paying.", HttpStatus.BAD_REQUEST);
        }
        if ((newStatus == com.shiftsync.payroll.enums.PayrollPeriodStatus.CONFIRMED || newStatus == com.shiftsync.payroll.enums.PayrollPeriodStatus.PAID) && !isAdmin) {
            throw new BusinessException("Transition to CONFIRMED or PAID is only allowed for ADMIN.", HttpStatus.FORBIDDEN);
        }

        if (period.getStatus() == PayrollPeriodStatus.DRAFT && newStatus == PayrollPeriodStatus.CONFIRMED) {
            if (period.getLastGeneratedAt() == null) {
                throw new BusinessException("Cần tính bảng lương trước khi xác nhận", HttpStatus.CONFLICT);
            }
            var saved = payrollSnapshot(payrollRepository.findByPayrollPeriodId(periodId));
            var current = payrollSnapshot(calculatePayrolls(storeId, period, period.getStartDate(), period.getEndDate()));
            if (!saved.equals(current)) {
                throw new BusinessException("Dữ liệu tính lương đã thay đổi. Hãy tính lại và kiểm tra bảng lương trước khi xác nhận", HttpStatus.CONFLICT);
            }
        }

                auditLogService.log(actorId, "UPDATE_PAYROLL_STATUS", "PayrollPeriod", periodId,
                java.util.Map.of("status", period.getStatus().name()),
                java.util.Map.of("status", newStatus.name()));

        period.setStatus(newStatus);
        payrollPeriodRepository.save(period);
    }

    private record PayrollSnapshot(BigDecimal totalHours, BigDecimal overtimeHours, BigDecimal holidayHours,
            BigDecimal baseAmount, BigDecimal overtimeAmount, BigDecimal holidayAmount, BigDecimal totalAmount) {}

    private Map<UUID, PayrollSnapshot> payrollSnapshot(List<Payroll> payrolls) {
        Map<UUID, PayrollSnapshot> result = new HashMap<>();
        for (Payroll payroll : payrolls) {
            UUID staffId = payroll.getStaff().getId();
            var row = new PayrollSnapshot(normalize(payroll.getTotalHours()), normalize(payroll.getOtHours()),
                    normalize(payroll.getHolidayHours()), normalize(payroll.getBaseAmount()), normalize(payroll.getOtAmount()),
                    normalize(payroll.getHolidayAmount()), normalize(payroll.getTotalAmount()));
            if (result.put(staffId, row) != null) {
                throw new BusinessException("Bảng lương có phiếu trùng nhân viên; cần tính lại", HttpStatus.CONFLICT);
            }
        }
        return result;
    }

    private static BigDecimal normalize(BigDecimal amount) {
        return amount == null ? null : amount.stripTrailingZeros();
    }


    @Transactional(readOnly = true)
    public boolean isDateLocked(java.util.UUID storeId, java.time.LocalDate date) {
        return payrollPeriodRepository.existsByStoreIdAndStartDateLessThanEqualAndEndDateGreaterThanEqualAndStatusIn(
                storeId, date, date, java.util.Arrays.asList(com.shiftsync.payroll.enums.PayrollPeriodStatus.CONFIRMED, com.shiftsync.payroll.enums.PayrollPeriodStatus.PAID));
    }

}
