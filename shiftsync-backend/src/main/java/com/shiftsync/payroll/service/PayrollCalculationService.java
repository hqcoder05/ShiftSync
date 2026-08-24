package com.shiftsync.payroll.service;

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

    private final PayrollPeriodRepository payrollPeriodRepository;
    private final PayrollRepository payrollRepository;
    private final HolidayRepository holidayRepository;
    private final EmploymentRepository employmentRepository;
    private final ShiftAssignmentRepository shiftAssignmentRepository;
    private final AttendanceRepository attendanceRepository;
    private final StoreRepository storeRepository;

    private static final BigDecimal OT_MULTIPLIER = new BigDecimal("1.50");

    @Transactional(rollbackFor = Exception.class)
    public void generatePayroll(UUID storeId, LocalDate startDate, LocalDate endDate) {
        long startTime = System.currentTimeMillis(); // Profiling start

        if (endDate.isBefore(startDate)) {
            throw new BusinessException("End date cannot be before start date.", HttpStatus.BAD_REQUEST);
        }

        
        java.util.Optional<PayrollPeriod> existingOpt = payrollPeriodRepository.findByStoreIdAndStartDateAndEndDate(storeId, startDate, endDate);
        if (existingOpt.isPresent()) {
            if (existingOpt.get().getStatus() != com.shiftsync.payroll.enums.PayrollPeriodStatus.DRAFT) {
                throw new BusinessException("Cannot regenerate payroll. Period is already " + existingOpt.get().getStatus(), HttpStatus.CONFLICT);
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
    }

    private Payroll calculateForEmployee(Employment emp, PayrollPeriod period, List<ShiftAssignment> assignments, Map<UUID, Attendance> attendanceMap, Map<LocalDate, BigDecimal> holidayMap) {
        if (assignments.isEmpty()) {
            return buildEmptyPayroll(period, emp);
        }

        // Group assignments by ISO week
        Map<Integer, List<ShiftAssignment>> weeklyAssignments = assignments.stream()
                .collect(Collectors.groupingBy(a -> a.getShift().getShiftDate().get(IsoFields.WEEK_OF_WEEK_BASED_YEAR)));

        int maxWeeklyHours = getMaxWeeklyHours(emp);
        BigDecimal hourlyRate = emp.getHourlyRate();

        BigDecimal totalBaseAmt = BigDecimal.ZERO;
        BigDecimal totalOtAmt = BigDecimal.ZERO;
        BigDecimal totalHolidayAmt = BigDecimal.ZERO;

        BigDecimal totalBaseHrs = BigDecimal.ZERO;
        BigDecimal totalOtHrs = BigDecimal.ZERO;
        BigDecimal totalHolidayHrs = BigDecimal.ZERO;

        for (List<ShiftAssignment> weekShifts : weeklyAssignments.values()) {
            // Sort chronologically to accumulate hours
            weekShifts.sort(Comparator.comparing(a -> a.getShift().getShiftDate()));

            double hoursWorkedThisWeek = 0.0;

            for (ShiftAssignment assignment : weekShifts) {
                Attendance att = attendanceMap.get(assignment.getId());
                // MUST have check-out time
                if (att == null || att.getCheckInTime() == null || att.getCheckOutTime() == null) {
                    continue;
                }

                double durationHours = Duration.between(att.getCheckInTime(), att.getCheckOutTime()).toMinutes() / 60.0;
                if (durationHours <= 0) continue;

                LocalDate shiftDate = assignment.getShift().getShiftDate();
                boolean isHoliday = holidayMap.containsKey(shiftDate);
                BigDecimal holidayMultiplier = isHoliday ? holidayMap.get(shiftDate) : BigDecimal.ONE;

                // Split into Standard and OT
                double remainingStandard = Math.max(0, maxWeeklyHours - hoursWorkedThisWeek);
                double stdHours = Math.min(durationHours, remainingStandard);
                double otHours = durationHours - stdHours;

                // Calculate Standard Segment
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

                // Calculate OT Segment
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

                hoursWorkedThisWeek += durationHours;
            }
        }

        BigDecimal totalHours = totalBaseHrs.add(totalOtHrs).add(totalHolidayHrs);
        BigDecimal totalAmt = totalBaseAmt.add(totalOtAmt).add(totalHolidayAmt);

        return Payroll.builder()
                .payrollPeriod(period)
                .staff(emp.getUser())
                .totalHours(totalHours.setScale(2, RoundingMode.HALF_UP))
                .otHours(totalOtHrs.setScale(2, RoundingMode.HALF_UP))
                .holidayHours(totalHolidayHrs.setScale(2, RoundingMode.HALF_UP))
                .baseAmount(totalBaseAmt.setScale(2, RoundingMode.HALF_UP))
                .otAmount(totalOtAmt.setScale(2, RoundingMode.HALF_UP))
                .holidayAmount(totalHolidayAmt.setScale(2, RoundingMode.HALF_UP))
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

    private int getMaxWeeklyHours(Employment employment) {
        return switch (employment.getEmploymentType()) {
            case FULL_TIME -> 48;
            case PART_TIME -> 24;
            case INTERN -> 20;
            case SEASONAL -> 40;
        };
    }

    @Transactional
    public void updatePayrollPeriodStatus(java.util.UUID storeId, java.util.UUID periodId, com.shiftsync.payroll.enums.PayrollPeriodStatus newStatus) {
        PayrollPeriod period = payrollPeriodRepository.findById(periodId)
                .orElseThrow(() -> new BusinessException("Payroll period not found.", HttpStatus.NOT_FOUND));

        if (!period.getStore().getId().equals(storeId)) {
            throw new BusinessException("Payroll period does not belong to this store.", HttpStatus.FORBIDDEN);
        }

        // Validate One-way state transition: DRAFT -> CONFIRMED -> PAID
        if (period.getStatus() == com.shiftsync.payroll.enums.PayrollPeriodStatus.PAID) {
            throw new BusinessException("Cannot change status of a PAID payroll period.", HttpStatus.BAD_REQUEST);
        }
        if (period.getStatus() == com.shiftsync.payroll.enums.PayrollPeriodStatus.CONFIRMED && newStatus == com.shiftsync.payroll.enums.PayrollPeriodStatus.DRAFT) {
            throw new BusinessException("Cannot revert CONFIRMED payroll period back to DRAFT.", HttpStatus.BAD_REQUEST);
        }
        if (period.getStatus() == com.shiftsync.payroll.enums.PayrollPeriodStatus.DRAFT && newStatus == com.shiftsync.payroll.enums.PayrollPeriodStatus.PAID) {
            throw new BusinessException("Cannot skip CONFIRMED state. Must confirm before paying.", HttpStatus.BAD_REQUEST);
        }

        period.setStatus(newStatus);
        payrollPeriodRepository.save(period);
    }


    @Transactional(readOnly = true)
    public boolean isDateLocked(java.util.UUID storeId, java.time.LocalDate date) {
        return payrollPeriodRepository.existsByStoreIdAndStartDateLessThanEqualAndEndDateGreaterThanEqualAndStatusIn(
                storeId, date, date, java.util.Arrays.asList(com.shiftsync.payroll.enums.PayrollPeriodStatus.CONFIRMED, com.shiftsync.payroll.enums.PayrollPeriodStatus.PAID));
    }

}
