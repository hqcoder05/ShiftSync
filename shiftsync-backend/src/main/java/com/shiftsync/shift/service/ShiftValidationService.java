package com.shiftsync.shift.service;

import com.shiftsync.shared.exception.BusinessException;
import com.shiftsync.shift.entity.Shift;
import com.shiftsync.shift.repository.ShiftRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import com.shiftsync.employment.repository.EmploymentRepository;
import com.shiftsync.employment.entity.Employment;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ShiftValidationService {

    private final ShiftRepository shiftRepository;
    private final EmploymentRepository employmentRepository;

    public void validateNoOverlapAndWeeklyHours(Shift newShift, UUID staffId, UUID excludedShiftId) {
        java.time.LocalDate startOfWeek = newShift.getShiftDate().with(java.time.DayOfWeek.MONDAY);
        java.time.LocalDate endOfWeek = newShift.getShiftDate().with(java.time.DayOfWeek.SUNDAY);

        List<Shift> activeShifts = shiftRepository.findActiveShiftsForStaffInPeriod(staffId, startOfWeek, endOfWeek);

        double totalHoursThisWeek = 0;
        for (Shift s : activeShifts) {
            // Exclude the shift being swapped out
            if (excludedShiftId != null && s.getId().equals(excludedShiftId)) {
                continue;
            }

            // Check for overlap if on the same day
            if (s.getShiftDate().equals(newShift.getShiftDate())) {
                boolean overlap = newShift.getStartTime().isBefore(s.getEndTime()) && newShift.getEndTime().isAfter(s.getStartTime());
                if (overlap) {
                    String msg = String.format("Ca làm việc bị trùng giờ (%s - %s) với ca làm bạn đã có trong ngày (%s - %s).",
                            newShift.getStartTime().toString().substring(0, 5),
                            newShift.getEndTime().toString().substring(0, 5),
                            s.getStartTime().toString().substring(0, 5),
                            s.getEndTime().toString().substring(0, 5));
                    throw new BusinessException(msg, HttpStatus.CONFLICT);
                }
            }

            // Calculate duration in hours
            java.time.Duration duration = java.time.Duration.between(s.getStartTime(), s.getEndTime());
            totalHoursThisWeek += duration.toMinutes() / 60.0;
        }

        // Add new shift hours
        java.time.Duration newDuration = java.time.Duration.between(newShift.getStartTime(), newShift.getEndTime());
        totalHoursThisWeek += newDuration.toMinutes() / 60.0;

        Employment employment = employmentRepository.findByUserIdAndStatus(staffId, com.shiftsync.employment.enums.EmploymentStatus.ACTIVE)
                .stream().findFirst()
                .orElseThrow(() -> new BusinessException("Active employment not found for staff", HttpStatus.BAD_REQUEST));
        int MAX_WEEKLY_HOURS = employment.getContractType().getMaxWeeklyHours();

        if (totalHoursThisWeek > MAX_WEEKLY_HOURS) {
            throw new BusinessException("Nhận thêm ca này sẽ vượt quá số giờ làm việc tối đa trong tuần (" + MAX_WEEKLY_HOURS + " giờ/tuần)", HttpStatus.BAD_REQUEST);
        }
    }
}
