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
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Component
public class ShiftAssignmentValidator {

    private final AvailabilityRepository availabilityRepository;
    private final BlackoutDateRepository blackoutDateRepository;
    private final ShiftAssignmentRepository shiftAssignmentRepository;
    private final StaffSkillRepository staffSkillRepository;
    private final SkillRepository skillRepository;
    private final ShiftValidationService shiftValidationService;
    private final com.shiftsync.leave.repository.LeaveRequestRepository leaveRequestRepository;
    private final com.shiftsync.store.repository.StoreConfigurationRepository storeConfigurationRepository;

    @org.springframework.beans.factory.annotation.Autowired
    public ShiftAssignmentValidator(
            AvailabilityRepository availabilityRepository,
            BlackoutDateRepository blackoutDateRepository,
            ShiftAssignmentRepository shiftAssignmentRepository,
            StaffSkillRepository staffSkillRepository,
            SkillRepository skillRepository,
            ShiftValidationService shiftValidationService,
            @org.springframework.beans.factory.annotation.Autowired(required = false) com.shiftsync.leave.repository.LeaveRequestRepository leaveRequestRepository,
            com.shiftsync.store.repository.StoreConfigurationRepository storeConfigurationRepository) {
        this.availabilityRepository = availabilityRepository;
        this.blackoutDateRepository = blackoutDateRepository;
        this.shiftAssignmentRepository = shiftAssignmentRepository;
        this.staffSkillRepository = staffSkillRepository;
        this.skillRepository = skillRepository;
        this.shiftValidationService = shiftValidationService;
        this.leaveRequestRepository = leaveRequestRepository;
        this.storeConfigurationRepository = storeConfigurationRepository;
    }

    public ShiftAssignmentValidator(AvailabilityRepository availabilityRepository,
            BlackoutDateRepository blackoutDateRepository, ShiftAssignmentRepository shiftAssignmentRepository,
            StaffSkillRepository staffSkillRepository, SkillRepository skillRepository,
            ShiftValidationService shiftValidationService,
            com.shiftsync.leave.repository.LeaveRequestRepository leaveRequestRepository) {
        this(availabilityRepository, blackoutDateRepository, shiftAssignmentRepository, staffSkillRepository,
                skillRepository, shiftValidationService, leaveRequestRepository, null);
    }

    public ShiftAssignmentValidator(
            AvailabilityRepository availabilityRepository,
            BlackoutDateRepository blackoutDateRepository,
            ShiftAssignmentRepository shiftAssignmentRepository,
            StaffSkillRepository staffSkillRepository,
            SkillRepository skillRepository,
            ShiftValidationService shiftValidationService) {
        this(availabilityRepository, blackoutDateRepository, shiftAssignmentRepository,
             staffSkillRepository, skillRepository, shiftValidationService, null);
    }

    @Transactional(readOnly = true)
    public boolean isEligible(Shift shift, UUID staffId) {
        if (shiftAssignmentRepository.existsByShiftIdAndStaffId(shift.getId(), staffId)) {
            return false;
        }

        if (leaveRequestRepository != null) {
            boolean hasApprovedLeave = leaveRequestRepository.findOverlappingRequests(staffId, shift.getShiftDate(), ShiftDateRange.lastWorkingDate(shift))
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

        boolean covers = availabilityCovers(shift, staffId);
        if (!covers) {
            return false;
        }

        boolean hasBlackout = hasBlackoutDuringShift(shift, staffId);
        if (hasBlackout) {
            return false;
        }

        int maxSlots = shift.getRequirements() == null || shift.getRequirements().isEmpty() ? 1
                : shift.getRequirements().stream().mapToInt(ShiftSkillRequirement::getRequiredCount).sum();
        if (shiftAssignmentRepository.countByShiftId(shift.getId()) >= maxSlots) return false;

        if (shift.getRequirements() != null && !shift.getRequirements().isEmpty()) {

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
            boolean covers = availabilityCovers(shift, staffId);
            if (!covers) {
                throw new BusinessException("Staff not available: Shift time is outside registered availability", HttpStatus.BAD_REQUEST);
            }
        }

        // Blackout Date Check
        boolean hasBlackout = hasBlackoutDuringShift(shift, staffId);
        if (hasBlackout) {
            throw new BusinessException("Staff not available: Has blackout date on shift day", HttpStatus.BAD_REQUEST);
        }

        // Approved Leave Request Check
        if (leaveRequestRepository != null) {
            boolean hasApprovedLeave = leaveRequestRepository.findOverlappingRequests(staffId, shift.getShiftDate(), ShiftDateRange.lastWorkingDate(shift))
                    .stream().anyMatch(l -> l.getStatus() == com.shiftsync.leave.enums.LeaveStatus.APPROVED);
            if (hasApprovedLeave) {
                throw new BusinessException("Nhân viên có lịch nghỉ phép đã được phê duyệt vào ngày này", HttpStatus.BAD_REQUEST);
            }
        }

        // A shift without explicit requirements has one generic slot, as in auto scheduling.
        int maxSlots = shift.getRequirements() == null || shift.getRequirements().isEmpty() ? 1
                : shift.getRequirements().stream().mapToInt(ShiftSkillRequirement::getRequiredCount).sum();
        if (shiftAssignmentRepository.countByShiftId(shift.getId()) >= maxSlots) {
            throw new BusinessException("Slot full: Shift requirement capacity reached", HttpStatus.BAD_REQUEST);
        }

        // Per-skill capacity Check
        if (shift.getRequirements() != null && !shift.getRequirements().isEmpty()) {

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
    /** Select a remaining role the claimant can actually perform, not the first vacancy. */
    public UUID selectClaimSkill(Shift shift, UUID staffId) {
        if (shift.getRequirements() == null || shift.getRequirements().isEmpty()) return null;
        List<StaffSkill> skills = staffSkillRepository.findByStaffId(staffId);
        List<com.shiftsync.shift.entity.ShiftAssignment> assignments = shiftAssignmentRepository.findByShiftId(shift.getId())
                .stream().filter(assignment -> !assignment.isDeleted()).toList();
        return shift.getRequirements().stream()
                .filter(requirement -> requirement.getSkill() != null)
                .filter(requirement -> {
                    long count = assignments.stream().filter(assignment -> requirement.getSkill().getId().equals(assignment.getRequiredSkillId())).count();
                    if (count == 0 && shift.getRequirements().size() == 1) count = assignments.size();
                    return count < requirement.getRequiredCount();
                })
                .filter(requirement -> skills.stream().anyMatch(skill -> {
                    if (skill.getExpirationDate() != null && skill.getExpirationDate().isBefore(shift.getShiftDate())) return false;
                    if (requirement.getSkill().getId().equals(skill.getSkillId())) return true;
                    return skillRepository.findById(skill.getSkillId())
                            .map(known -> known.getName() != null && requirement.getSkill().getName() != null
                                    && known.getName().trim().equalsIgnoreCase(requirement.getSkill().getName().trim())).orElse(false);
                }))
                .map(requirement -> requirement.getSkill().getId())
                .sorted().findFirst()
                .orElseThrow(() -> new BusinessException("No remaining requirement matches staff's valid skills", HttpStatus.BAD_REQUEST));
    }

    private boolean availabilityCovers(Shift shift, UUID staffId) {
        int tolerance = storeConfigurationRepository != null && shift.getStore() != null
                ? storeConfigurationRepository.findByStoreId(shift.getStore().getId())
                    .map(com.shiftsync.store.entity.StoreConfiguration::getAvailabilityToleranceMinutes).orElse(0)
                : 0;
        return com.shiftsync.availability.service.AvailabilityCoverage.covers(
                availabilityRepository.findByUserId(staffId), shift.getShiftDate(),
                shift.getStartTime(), shift.getEndTime(), tolerance);
    }

    /** Swap validation must not count the outgoing assignment as occupied capacity. */
    public void validateAvailabilityAndTimeOff(Shift shift, UUID staffId) {
        if (!availabilityCovers(shift, staffId)) {
            throw new BusinessException("Staff not available: Shift time is outside registered availability", HttpStatus.BAD_REQUEST);
        }
        if (hasBlackoutDuringShift(shift, staffId)) {
            throw new BusinessException("Staff not available: Has blackout date during shift", HttpStatus.BAD_REQUEST);
        }
        if (leaveRequestRepository != null && leaveRequestRepository.findOverlappingRequests(
                staffId, shift.getShiftDate(), ShiftDateRange.lastWorkingDate(shift)).stream()
                .anyMatch(leave -> leave.getStatus() == com.shiftsync.leave.enums.LeaveStatus.APPROVED)) {
            throw new BusinessException("Nhân viên có lịch nghỉ phép đã được phê duyệt trong ca này", HttpStatus.BAD_REQUEST);
        }
    }

    private boolean hasBlackoutDuringShift(Shift shift, UUID staffId) {
        java.time.LocalDate last = ShiftDateRange.lastWorkingDate(shift);
        return blackoutDateRepository.existsByStaffIdAndDate(staffId, shift.getShiftDate())
                || (!last.equals(shift.getShiftDate()) && blackoutDateRepository.existsByStaffIdAndDate(staffId, last));
    }
}
