package com.shiftsync.payroll.service;
import com.shiftsync.audit.service.AuditLogService;

import com.shiftsync.attendance.entity.Attendance;
import com.shiftsync.attendance.repository.AttendanceRepository;
import com.shiftsync.employment.entity.Employment;
import com.shiftsync.employment.enums.EmploymentStatus;
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
import java.time.temporal.IsoFields;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class PayrollCalculationService {
    private final AuditLogService auditLogService;

    private final PayrollPeriodRepository payrollPeriodRepository;
    private final PayrollRepository payrollRepository;
    private final HolidayRepository holidayRepository;
    private final EmploymentRepository employmentRepository;
    private final ShiftAssignmentRepository shiftAssignmentRepository;
    private final AttendanceRepository attendanceRepository;
    private final StoreRepository storeRepository;
    private final com.shiftsync.notification.service.NotificationService notificationService;

    

    @Transactional(rollbackFor = Exception.class)
    public void generatePayroll(UUID storeId, LocalDate startDate, LocalDate endDate) {
        long startTime = System.currentTimeMillis(); // Profiling start

        if (endDate.isBefore(startDate)) {
            throw new BusinessException("End date cannot be before start date.", HttpStatus.BAD_REQUEST);
        }

        
        java.util.Optional<PayrollPeriod> existingOpt = payrollPeriodRepository.findByStoreIdAndStartDateAndEndDate(storeId, startDate, endDate);
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
            // Delete old payrolls for this period so we can regenerate
            payrollRepository.deleteByPayrollPeriod(existingOpt.get());
        }


        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new BusinessException("Store not found.", HttpStatus.NOT_FOUND));

        // 1. Fetch holidays
        Map<LocalDate, BigDecimal> holidayMap = holidayRepository.findByHolidayDateBetween(startDate, endDate)
                .stream().collect(Collectors.toMap(Holiday::getHolidayDate, Holiday::getRateMultiplier));

        // 2. Fetch employments (Active + Inactive in case they left but have unpaid shifts)
        List<Employment> employments = employmentRepository.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE);
        
        // 3. Bulk Fetch ShiftAssignments and Attendances to avoid N+1
        List<ShiftAssignment> allAssignments = shiftAssignmentRepository.findByShift_Store_IdAndShift_ShiftDateBetween(storeId, startDate, endDate);
        List<Attendance> allAttendances = attendanceRepository.findByShiftAssignment_Shift_Store_IdAndShiftAssignment_Shift_ShiftDateBetween(storeId, startDate, endDate);

        // Group Assignments by StaffId
        Map<UUID, List<ShiftAssignment>> assignmentsByStaff = allAssignments.stream()
                .filter(a -> a.getShift().getStatus() == ShiftStatus.COMPLETED)
                .collect(Collectors.groupingBy(a -> a.getStaff().getId()));

        // Group Attendances by ShiftAssignmentId
        Map<UUID, Attendance> attendanceMap = allAttendances.stream()
                .collect(Collectors.toMap(a -> a.getShiftAssignment().getId(), a -> a, (a1, a2) -> a1));
        
        // Creating the PayrollPeriod
        PayrollPeriod payrollPeriod = PayrollPeriod.builder()
                .store(store)
                .startDate(startDate)
                .endDate(endDate)
                .status(PayrollPeriodStatus.DRAFT)
                .build();
        
        payrollPeriod = payrollPeriodRepository.save(payrollPeriod);

        List<Payroll> payrolls = new ArrayList<>();

        for (Employment emp : employments) {
            List<ShiftAssignment> empAssignments = assignmentsByStaff.getOrDefault(emp.getUser().getId(), Collections.emptyList());
            Payroll payroll = calculateForEmployee(emp, payrollPeriod, empAssignments, attendanceMap, holidayMap);
            payrolls.add(payroll);
        }

        payrollRepository.saveAll(payrolls);
        
        long endTime = System.currentTimeMillis(); // Profiling end
        log.info("generatePayroll completed in {} ms for {} employees.", (endTime - startTime), employments.size());

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

    private Payroll calculateForEmployee(Employment emp, PayrollPeriod period, List<ShiftAssignment> assignments, Map<UUID, Attendance> attendanceMap, Map<LocalDate, BigDecimal> holidayMap) {
        if (assignments.isEmpty()) {
            return buildEmptyPayroll(period, emp);
        }

        // Group assignments by ISO week
        Map<Integer, List<ShiftAssignment>> weeklyAssignments = assignments.stream()
                .collect(Collectors.groupingBy(a -> a.getShift().getShiftDate().get(IsoFields.WEEK_OF_WEEK_BASED_YEAR)));

        int maxWeeklyHours = emp.getContractType().getMaxWeeklyHours();
        BigDecimal hourlyRate = emp.getHourlyRate();

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

        for (List<ShiftAssignment> weekShifts : weeklyAssignments.values()) {
            weekShifts.sort(Comparator.comparing(a -> a.getShift().getShiftDate()));
            totalAcc.hoursWorkedThisWeek = 0.0; // Reset weekly hours

            for (ShiftAssignment assignment : weekShifts) {
                Attendance att = attendanceMap.get(assignment.getId());
                if (att == null || att.getCheckInTime() == null || att.getCheckOutTime() == null) {
                    continue;
                }

                java.time.OffsetDateTime checkIn = att.getCheckInTime();
                java.time.OffsetDateTime checkOut = att.getCheckOutTime();
                LocalDate day1 = checkIn.toLocalDate();
                LocalDate day2 = checkOut.toLocalDate();

                if (day1.equals(day2)) {
                    double durationHours = Duration.between(checkIn, checkOut).toMinutes() / 60.0;
                    totalAcc.addSegment(durationHours, day1, maxWeeklyHours, hourlyRate, holidayMap, emp.getContractType().getOtMultiplier());
                } else {
                    java.time.OffsetDateTime midnight = day2.atStartOfDay().atOffset(checkOut.getOffset());
                    double day1Hours = Duration.between(checkIn, midnight).toMinutes() / 60.0;
                    double day2Hours = Duration.between(midnight, checkOut).toMinutes() / 60.0;
                    
                    totalAcc.addSegment(day1Hours, day1, maxWeeklyHours, hourlyRate, holidayMap, emp.getContractType().getOtMultiplier());
                    totalAcc.addSegment(day2Hours, day2, maxWeeklyHours, hourlyRate, holidayMap, emp.getContractType().getOtMultiplier());
                }
            }
        }

        BigDecimal totalHours = totalAcc.totalBaseHrs.add(totalAcc.totalOtHrs).add(totalAcc.totalHolidayHrs);
        BigDecimal totalAmt = totalAcc.totalBaseAmt.add(totalAcc.totalOtAmt).add(totalAcc.totalHolidayAmt);

        return Payroll.builder()
                .payrollPeriod(period)
                .staff(emp.getUser())
                .totalHours(totalHours.setScale(2, RoundingMode.HALF_UP))
                .otHours(totalAcc.totalOtHrs.setScale(2, RoundingMode.HALF_UP))
                .holidayHours(totalAcc.totalHolidayHrs.setScale(2, RoundingMode.HALF_UP))
                .baseAmount(totalAcc.totalBaseAmt.setScale(2, RoundingMode.HALF_UP))
                .otAmount(totalAcc.totalOtAmt.setScale(2, RoundingMode.HALF_UP))
                .holidayAmount(totalAcc.totalHolidayAmt.setScale(2, RoundingMode.HALF_UP))
                .totalAmount(totalAmt.setScale(2, RoundingMode.HALF_UP))
                .build();
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

    

    @Transactional
    public void updatePayrollPeriodStatus(java.util.UUID storeId, java.util.UUID periodId, com.shiftsync.payroll.enums.PayrollPeriodStatus newStatus, java.util.UUID actorId) {
        PayrollPeriod period = payrollPeriodRepository.findById(periodId)
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

                auditLogService.log(actorId, "UPDATE_PAYROLL_STATUS", "PayrollPeriod", periodId, 
                java.util.Map.of("status", period.getStatus().name()), 
                java.util.Map.of("status", newStatus.name()));

        period.setStatus(newStatus);
        payrollPeriodRepository.save(period);
    }


    @Transactional(readOnly = true)
    public boolean isDateLocked(java.util.UUID storeId, java.time.LocalDate date) {
        return payrollPeriodRepository.existsByStoreIdAndStartDateLessThanEqualAndEndDateGreaterThanEqualAndStatusIn(
                storeId, date, date, java.util.Arrays.asList(com.shiftsync.payroll.enums.PayrollPeriodStatus.CONFIRMED, com.shiftsync.payroll.enums.PayrollPeriodStatus.PAID));
    }

}
