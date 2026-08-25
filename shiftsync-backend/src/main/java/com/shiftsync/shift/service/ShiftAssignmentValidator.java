package com.shiftsync.shift.service;

import com.shiftsync.availability.repository.AvailabilityRepository;
import com.shiftsync.availability.repository.BlackoutDateRepository;
import com.shiftsync.shared.exception.BusinessException;
import com.shiftsync.shift.entity.Shift;
import com.shiftsync.shift.entity.ShiftSkillRequirement;
import com.shiftsync.shift.repository.ShiftAssignmentRepository;
import com.shiftsync.skill.entity.StaffSkill;
import com.shiftsync.skill.repository.StaffSkillRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class ShiftAssignmentValidator {

    private final AvailabilityRepository availabilityRepository;
    private final BlackoutDateRepository blackoutDateRepository;
    private final ShiftAssignmentRepository shiftAssignmentRepository;
    private final StaffSkillRepository staffSkillRepository;
    private final ShiftValidationService shiftValidationService;

    @Transactional(readOnly = true)
    public void validateEligibility(Shift shift, UUID staffId) {
        // Check if already assigned
        if (shiftAssignmentRepository.existsByShiftIdAndStaffId(shift.getId(), staffId)) {
            throw new BusinessException("Staff is already assigned to this shift", HttpStatus.CONFLICT);
        }

        // Overlap and Max Weekly Hours Check
        shiftValidationService.validateNoOverlapAndWeeklyHours(shift, staffId, null);

        // Availability Check
        short dayOfWeek = (short) (shift.getShiftDate().getDayOfWeek().getValue() % 7);
        boolean covers = availabilityRepository.coversShiftTime(staffId, dayOfWeek, shift.getStartTime(), shift.getEndTime());
        if (!covers) {
            throw new BusinessException("Staff not available: Shift time is outside registered availability", HttpStatus.BAD_REQUEST);
        }

        // Blackout Date Check
        boolean hasBlackout = blackoutDateRepository.existsByStaffIdAndDate(staffId, shift.getShiftDate());
        if (hasBlackout) {
            throw new BusinessException("Staff not available: Has blackout date on shift day", HttpStatus.BAD_REQUEST);
        }

        // Slot capacity Check
        if (!shift.getRequirements().isEmpty()) {
            int currentAssignedCount = (int) shiftAssignmentRepository.countByShiftId(shift.getId());
            int maxSlots = shift.getRequirements().stream().mapToInt(ShiftSkillRequirement::getRequiredCount).sum();
            
            if (currentAssignedCount >= maxSlots) {
                throw new BusinessException("Slot full: Shift requirement capacity reached", HttpStatus.BAD_REQUEST);
            }
        }

        // Skill Checking
        if (!shift.getRequirements().isEmpty()) {
            List<StaffSkill> staffSkills = staffSkillRepository.findByStaffId(staffId);
            
            boolean hasAnyRequiredSkill = false;
            boolean hasValidUnexpiredSkill = false;

            for (ShiftSkillRequirement req : shift.getRequirements()) {
                for (StaffSkill staffSkill : staffSkills) {
                    if (staffSkill.getSkillId().equals(req.getSkill().getId())) {
                        hasAnyRequiredSkill = true; // Level 1 passed
                        
                        if (staffSkill.getExpirationDate() == null || !staffSkill.getExpirationDate().isBefore(shift.getShiftDate())) {
                            hasValidUnexpiredSkill = true; // Level 2 passed
                        }
                    }
                }
            }

            if (!hasAnyRequiredSkill) {
                throw new BusinessException("Staff does not have required skill for this shift", HttpStatus.BAD_REQUEST);
            }
            
            if (!hasValidUnexpiredSkill) {
                throw new BusinessException("Staff's required skill has expired", HttpStatus.BAD_REQUEST);
            }
        }
    }
}
