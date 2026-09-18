package com.shiftsync.shift.service;

import com.shiftsync.availability.repository.AvailabilityRepository;
import com.shiftsync.availability.repository.BlackoutDateRepository;
import com.shiftsync.shared.exception.BusinessException;
import com.shiftsync.shift.entity.Shift;
import com.shiftsync.shift.entity.ShiftSkillRequirement;
import com.shiftsync.shift.repository.ShiftAssignmentRepository;
import com.shiftsync.skill.entity.Skill;
import com.shiftsync.skill.entity.StaffSkill;
import com.shiftsync.skill.repository.SkillRepository;
import com.shiftsync.skill.repository.StaffSkillRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class ShiftAssignmentValidator {

    private final AvailabilityRepository availabilityRepository;
    private final BlackoutDateRepository blackoutDateRepository;
    private final ShiftAssignmentRepository shiftAssignmentRepository;
    private final StaffSkillRepository staffSkillRepository;
    private final SkillRepository skillRepository;
    private final ShiftValidationService shiftValidationService;
    private final com.shiftsync.leave.repository.LeaveRequestRepository leaveRequestRepository;

    public ShiftAssignmentValidator(
            AvailabilityRepository availabilityRepository,
            BlackoutDateRepository blackoutDateRepository,
            ShiftAssignmentRepository shiftAssignmentRepository,
            StaffSkillRepository staffSkillRepository,
            SkillRepository skillRepository,
            ShiftValidationService shiftValidationService) {
        this.availabilityRepository = availabilityRepository;
        this.blackoutDateRepository = blackoutDateRepository;
        this.shiftAssignmentRepository = shiftAssignmentRepository;
        this.staffSkillRepository = staffSkillRepository;
        this.skillRepository = skillRepository;
        this.shiftValidationService = shiftValidationService;
        this.leaveRequestRepository = null;
    }

    @Transactional(readOnly = true)
    public boolean isEligible(Shift shift, UUID staffId) {
        if (shiftAssignmentRepository.existsByShiftIdAndStaffId(shift.getId(), staffId)) {
            return false;
        }

        if (leaveRequestRepository != null) {
            boolean hasApprovedLeave = leaveRequestRepository.findOverlappingRequests(staffId, shift.getShiftDate(), shift.getShiftDate())
                    .stream().anyMatch(l -> l.getStatus() == com.shiftsync.leave.enums.LeaveStatus.APPROVED);
            if (hasApprovedLeave) {
                return false;
            }
        }

        try {
            shiftValidationService.validateNoOverlapAndWeeklyHours(shift, staffId, null);
        } catch (Exception e) {
            return false;
        }

        short dayOfWeek = (short) (shift.getShiftDate().getDayOfWeek().getValue() % 7);
        boolean covers = availabilityRepository.coversShiftTime(staffId, dayOfWeek, shift.getStartTime(), shift.getEndTime());
        if (!covers) {
            return false;
        }

        boolean hasBlackout = blackoutDateRepository.existsByStaffIdAndDate(staffId, shift.getShiftDate());
        if (hasBlackout) {
            return false;
        }

        if (shift.getRequirements() != null && !shift.getRequirements().isEmpty()) {
            int currentAssignedCount = (int) shiftAssignmentRepository.countByShiftId(shift.getId());
            int maxSlots = shift.getRequirements().stream().mapToInt(ShiftSkillRequirement::getRequiredCount).sum();
            if (currentAssignedCount >= maxSlots) {
                return false;
            }

            List<StaffSkill> staffSkills = staffSkillRepository.findByStaffId(staffId);
            List<com.shiftsync.shift.entity.ShiftAssignment> existingAssignments = shiftAssignmentRepository.findByShiftId(shift.getId()).stream()
                    .filter(a -> !a.isDeleted())
                    .collect(java.util.stream.Collectors.toList());

            boolean hasAnyRequiredSkill = false;
            boolean hasValidUnexpiredSkill = false;
            boolean hasAvailableMatchingRequirement = false;

            for (ShiftSkillRequirement req : shift.getRequirements()) {
                if (req.getSkill() == null) continue;

                long assignedForSkill = existingAssignments.stream()
                        .filter(a -> req.getSkill().getId().equals(a.getRequiredSkillId()))
                        .count();
                if (assignedForSkill == 0 && shift.getRequirements().size() == 1) {
                    assignedForSkill = existingAssignments.size();
                }
                boolean reqHasCapacity = assignedForSkill < req.getRequiredCount();

                for (StaffSkill staffSkill : staffSkills) {
                    boolean skillMatches = staffSkill.getSkillId().equals(req.getSkill().getId());
                    if (!skillMatches) {
                        Skill s = skillRepository.findById(staffSkill.getSkillId()).orElse(null);
                        if (s != null && s.getName() != null && req.getSkill().getName() != null) {
                            skillMatches = s.getName().trim().equalsIgnoreCase(req.getSkill().getName().trim());
                        }
                    }

                    if (skillMatches) {
                        hasAnyRequiredSkill = true;
                        if (staffSkill.getExpirationDate() == null || !staffSkill.getExpirationDate().isBefore(shift.getShiftDate())) {
                            hasValidUnexpiredSkill = true;
                            if (reqHasCapacity) {
                                hasAvailableMatchingRequirement = true;
                            }
                        }
                    }
                }
            }

            if (!hasAnyRequiredSkill || !hasValidUnexpiredSkill || !hasAvailableMatchingRequirement) {
                return false;
            }
        }

        return true;
    }

    @Transactional(readOnly = true)
    public void validateEligibility(Shift shift, UUID staffId) {
        validateEligibility(shift, staffId, false);
    }

    @Transactional(readOnly = true)
    public void validateEligibility(Shift shift, UUID staffId, boolean overrideAvailability) {
        // Check if already assigned
        if (shiftAssignmentRepository.existsByShiftIdAndStaffId(shift.getId(), staffId)) {
            throw new BusinessException("Staff is already assigned to this shift", HttpStatus.CONFLICT);
        }

        // Overlap and Max Weekly Hours Check
        shiftValidationService.validateNoOverlapAndWeeklyHours(shift, staffId, null);

        // Availability Check
        if (!overrideAvailability) {
            short dayOfWeek = (short) (shift.getShiftDate().getDayOfWeek().getValue() % 7);
            boolean covers = availabilityRepository.coversShiftTime(staffId, dayOfWeek, shift.getStartTime(), shift.getEndTime());
            if (!covers) {
                throw new BusinessException("Staff not available: Shift time is outside registered availability", HttpStatus.BAD_REQUEST);
            }
        }

        // Blackout Date Check
        boolean hasBlackout = blackoutDateRepository.existsByStaffIdAndDate(staffId, shift.getShiftDate());
        if (hasBlackout) {
            throw new BusinessException("Staff not available: Has blackout date on shift day", HttpStatus.BAD_REQUEST);
        }

        // Approved Leave Request Check
        if (leaveRequestRepository != null) {
            boolean hasApprovedLeave = leaveRequestRepository.findOverlappingRequests(staffId, shift.getShiftDate(), shift.getShiftDate())
                    .stream().anyMatch(l -> l.getStatus() == com.shiftsync.leave.enums.LeaveStatus.APPROVED);
            if (hasApprovedLeave) {
                throw new BusinessException("Nhân viên có lịch nghỉ phép đã được phê duyệt vào ngày này", HttpStatus.BAD_REQUEST);
            }
        }

        // Slot capacity and per-skill capacity Check
        if (shift.getRequirements() != null && !shift.getRequirements().isEmpty()) {
            int currentAssignedCount = (int) shiftAssignmentRepository.countByShiftId(shift.getId());
            int maxSlots = shift.getRequirements().stream().mapToInt(ShiftSkillRequirement::getRequiredCount).sum();
            
            if (currentAssignedCount >= maxSlots) {
                throw new BusinessException("Slot full: Shift requirement capacity reached", HttpStatus.BAD_REQUEST);
            }

            List<StaffSkill> staffSkills = staffSkillRepository.findByStaffId(staffId);
            List<com.shiftsync.shift.entity.ShiftAssignment> existingAssignments = shiftAssignmentRepository.findByShiftId(shift.getId()).stream()
                    .filter(a -> !a.isDeleted())
                    .collect(java.util.stream.Collectors.toList());

            boolean hasAnyRequiredSkill = false;
            boolean hasValidUnexpiredSkill = false;
            boolean hasAvailableMatchingRequirement = false;

            for (ShiftSkillRequirement req : shift.getRequirements()) {
                if (req.getSkill() == null) continue;

                long assignedForSkill = existingAssignments.stream()
                        .filter(a -> req.getSkill().getId().equals(a.getRequiredSkillId()))
                        .count();
                if (assignedForSkill == 0 && shift.getRequirements().size() == 1) {
                    assignedForSkill = existingAssignments.size();
                }
                boolean reqHasCapacity = assignedForSkill < req.getRequiredCount();

                for (StaffSkill staffSkill : staffSkills) {
                    boolean skillMatches = staffSkill.getSkillId().equals(req.getSkill().getId());
                    if (!skillMatches) {
                        Skill s = skillRepository.findById(staffSkill.getSkillId()).orElse(null);
                        if (s != null && s.getName() != null && req.getSkill().getName() != null) {
                            skillMatches = s.getName().trim().equalsIgnoreCase(req.getSkill().getName().trim());
                        }
                    }

                    if (skillMatches) {
                        hasAnyRequiredSkill = true; // Level 1 passed
                        
                        if (staffSkill.getExpirationDate() == null || !staffSkill.getExpirationDate().isBefore(shift.getShiftDate())) {
                            hasValidUnexpiredSkill = true; // Level 2 passed
                            if (reqHasCapacity) {
                                hasAvailableMatchingRequirement = true; // Level 3: per-skill capacity passed
                            }
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

            if (!hasAvailableMatchingRequirement) {
                throw new BusinessException("Slot full: Shift requirement capacity reached for matching skill", HttpStatus.BAD_REQUEST);
            }
        }
    }
}
