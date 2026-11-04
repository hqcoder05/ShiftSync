package com.shiftsync.shift.service;

import com.shiftsync.attendance.repository.AttendanceRepository;
import com.shiftsync.payroll.enums.PayrollPeriodStatus;
import com.shiftsync.payroll.repository.PayrollPeriodRepository;
import com.shiftsync.shared.exception.BusinessException;
import com.shiftsync.shift.entity.ShiftAssignment;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class ScheduleMutationGuard {
    private final PayrollPeriodRepository payroll;
    private final AttendanceRepository attendance;

    public void checkShift(UUID storeId, LocalDate date, LocalTime start, LocalTime end) {
        checkDate(storeId, date);
        if (start != null && end != null && end.isBefore(start) && !end.equals(LocalTime.MIDNIGHT)) checkDate(storeId,date.plusDays(1));
    }

    private void checkDate(UUID storeId, LocalDate day) {
        if (payroll.existsByStoreIdAndStartDateLessThanEqualAndEndDateGreaterThanEqualAndStatusIn(storeId,day,day,
                List.of(PayrollPeriodStatus.CONFIRMED,PayrollPeriodStatus.PAID))) {
            throw new BusinessException("Không thể thay đổi ca thuộc kỳ lương đã khóa",HttpStatus.CONFLICT);
        }
    }

    public void checkRemovals(List<ShiftAssignment> assignments) {
        for (ShiftAssignment assignment : assignments) {
            if (attendance.existsByShiftAssignmentId(assignment.getId())) {
                throw new BusinessException("Không thể thay phân công tự động đã có chấm công",HttpStatus.CONFLICT);
            }
        }
    }
}
