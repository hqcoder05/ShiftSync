package com.shiftsync.shift.service;

import com.shiftsync.availability.repository.AvailabilityRepository;
import com.shiftsync.availability.repository.BlackoutDateRepository;
import com.shiftsync.employment.entity.Employment;
import com.shiftsync.employment.enums.EmploymentStatus;
import com.shiftsync.employment.repository.EmploymentRepository;
import com.shiftsync.payroll.repository.PayrollPeriodRepository;
import com.shiftsync.payroll.enums.PayrollPeriodStatus;
import java.util.Arrays;
import com.shiftsync.shared.exception.BusinessException;
import com.shiftsync.shift.dto.ShiftAssignmentResponseDTO;
import com.shiftsync.shift.entity.Shift;
import com.shiftsync.shift.entity.ShiftAssignment;
import com.shiftsync.shift.entity.ShiftSkillRequirement;
import com.shiftsync.shift.enums.AssignmentSource;
import com.shiftsync.shift.repository.ShiftAssignmentRepository;
import com.shiftsync.shift.repository.ShiftRepository;
import com.shiftsync.auth.repository.UserRepository;
import com.shiftsync.auth.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ShiftAssignmentService {

    private final ShiftRepository shiftRepository;
    private final ShiftAssignmentRepository shiftAssignmentRepository;
    private final AvailabilityRepository availabilityRepository;
    private final BlackoutDateRepository blackoutDateRepository;
    private final EmploymentRepository employmentRepository;
    private final UserRepository userRepository;
    private final PayrollPeriodRepository payrollPeriodRepository;
    private final ShiftValidationService shiftValidationService;

    @Transactional
    
    private void checkDateNotLocked(UUID storeId, java.time.LocalDate date) {
        if (payrollPeriodRepository.existsByStoreIdAndStartDateLessThanEqualAndEndDateGreaterThanEqualAndStatusIn(
                storeId, date, date, Arrays.asList(PayrollPeriodStatus.CONFIRMED, PayrollPeriodStatus.PAID))) {
            throw new BusinessException("Cannot modify assignment because its date falls in a LOCKED/PAID payroll period.", HttpStatus.BAD_REQUEST);
        }
    }

    public ShiftAssignmentResponseDTO assignStaffToShift(UUID storeId, UUID shiftId, UUID staffId) {
        Shift shift = shiftRepository.findByIdAndStoreId(shiftId, storeId)
                .orElseThrow(() -> new BusinessException("Shift not found", HttpStatus.NOT_FOUND));

        User staff = userRepository.findById(staffId)
                .orElseThrow(() -> new BusinessException("Staff not found", HttpStatus.NOT_FOUND));

        // BR-45: Check Employment is Active
        boolean isActive = employmentRepository.existsByUserIdAndStoreIdAndStatus(staffId, storeId, EmploymentStatus.ACTIVE);
        if (!isActive) {
            throw new BusinessException("Employment Inactive: Staff does not work at this store or is suspended", HttpStatus.BAD_REQUEST);
        }

        // Check if already assigned
        if (shiftAssignmentRepository.existsByShiftIdAndStaffId(shiftId, staffId)) {
            throw new BusinessException("Staff is already assigned to this shift", HttpStatus.CONFLICT);
        }

        // BR-09: Overlap and Max Weekly Hours Check
        shiftValidationService.validateNoOverlapAndWeeklyHours(shift, staffId, null);

        // Availability Check
        short dayOfWeek = (short) (shift.getShiftDate().getDayOfWeek().getValue() % 7);
        boolean covers = availabilityRepository.coversShiftTime(staffId, dayOfWeek, shift.getStartTime(), shift.getEndTime());
        if (!covers) {
            throw new BusinessException("Staff not available: Shift time is outside registered availability", HttpStatus.BAD_REQUEST);
        }

        boolean hasBlackout = blackoutDateRepository.existsByStaffIdAndDate(staffId, shift.getShiftDate());
        if (hasBlackout) {
            throw new BusinessException("Staff not available: Has blackout date on shift day", HttpStatus.BAD_REQUEST);
        }

        // BR-14/15: Check Slot capacity
        int currentAssignedCount = (int) shiftAssignmentRepository.countByShiftId(shiftId);
        int maxSlots = shift.getRequirements().stream().mapToInt(ShiftSkillRequirement::getRequiredCount).sum();
        
        if (currentAssignedCount >= maxSlots) {
            throw new BusinessException("Slot full: Shift requirement capacity reached", HttpStatus.BAD_REQUEST);
        }

        ShiftAssignment assignment = ShiftAssignment.builder()
                .shift(shift)
                .staff(staff)
                .source(AssignmentSource.MANUAL)
                .build();

        assignment = shiftAssignmentRepository.save(assignment);

        return ShiftAssignmentResponseDTO.builder()
                .id(assignment.getId())
                .shiftId(shift.getId())
                .staffId(staff.getId())
                .source(assignment.getSource())
                .assignedAt(assignment.getAssignedAt())
                .build();
    }
}
