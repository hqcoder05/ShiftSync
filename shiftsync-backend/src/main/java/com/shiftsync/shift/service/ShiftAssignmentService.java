package com.shiftsync.shift.service;

import com.shiftsync.notification.service.NotificationService;
import com.shiftsync.employment.enums.EmploymentStatus;
import com.shiftsync.employment.repository.EmploymentRepository;
import com.shiftsync.payroll.repository.PayrollPeriodRepository;
import com.shiftsync.payroll.enums.PayrollPeriodStatus;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
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
import com.shiftsync.layout.entity.StoreZone;
import com.shiftsync.layout.repository.StoreZoneRepository;
import com.shiftsync.skill.entity.Skill;
import com.shiftsync.skill.entity.StaffSkill;
import com.shiftsync.skill.repository.SkillRepository;
import com.shiftsync.skill.repository.StaffSkillRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ShiftAssignmentService {

    private final ShiftRepository shiftRepository;
    private final ShiftAssignmentRepository shiftAssignmentRepository;
    private final EmploymentRepository employmentRepository;
    private final UserRepository userRepository;
    private final PayrollPeriodRepository payrollPeriodRepository;
    private final NotificationService notificationService;
    private final ShiftAssignmentValidator shiftAssignmentValidator;
    private final StaffSkillRepository staffSkillRepository;
    private final StoreZoneRepository storeZoneRepository;
    private final SkillRepository skillRepository;

    @Transactional
    
    private void checkDateNotLocked(UUID storeId, java.time.LocalDate date) {
        if (payrollPeriodRepository.existsByStoreIdAndStartDateLessThanEqualAndEndDateGreaterThanEqualAndStatusIn(
                storeId, date, date, Arrays.asList(PayrollPeriodStatus.CONFIRMED, PayrollPeriodStatus.PAID))) {
            throw new BusinessException("Cannot modify assignment because its date falls in a LOCKED/PAID payroll period.", HttpStatus.BAD_REQUEST);
        }
    }

    public ShiftAssignmentResponseDTO assignStaffToShift(UUID storeId, UUID shiftId, UUID staffId) {
        return assignStaffToShift(storeId, shiftId, staffId, null, false);
    }

    public ShiftAssignmentResponseDTO assignStaffToShift(UUID storeId, UUID shiftId, UUID staffId, UUID requestedZoneId) {
        return assignStaffToShift(storeId, shiftId, staffId, requestedZoneId, false);
    }

    public ShiftAssignmentResponseDTO assignStaffToShift(UUID storeId, UUID shiftId, UUID staffId, UUID requestedZoneId, boolean force) {
        Shift shift = shiftRepository.findByIdAndStoreId(shiftId, storeId)
                .orElseThrow(() -> new BusinessException("Shift not found", HttpStatus.NOT_FOUND));
        checkDateNotLocked(storeId, shift.getShiftDate());

        User staff = userRepository.findById(staffId)
                .orElseThrow(() -> new BusinessException("Staff not found", HttpStatus.NOT_FOUND));

        // BR-45: Check Employment is Active
        boolean isActive = employmentRepository.existsByUserIdAndStoreIdAndStatus(staffId, storeId, EmploymentStatus.ACTIVE);
        if (!isActive) {
            throw new BusinessException("Employment Inactive: Staff does not work at this store or is suspended", HttpStatus.BAD_REQUEST);
        }

        // Check if staff is ALREADY assigned to this shift (e.g. Zone Transfer / Reallocation)
        Optional<ShiftAssignment> existingOpt = shiftAssignmentRepository.findByShiftIdAndStaffId(shiftId, staffId);
        if (existingOpt.isPresent()) {
            ShiftAssignment existing = existingOpt.get();
            if (requestedZoneId != null) {
                StoreZone targetZone = storeZoneRepository.findById(requestedZoneId)
                        .orElseThrow(() -> new BusinessException("Zone not found", HttpStatus.NOT_FOUND));
                existing.setZone(targetZone);
                existing = shiftAssignmentRepository.save(existing);
                return mapToResponseDTO(existing);
            } else {
                throw new BusinessException("Staff is already assigned to this shift", HttpStatus.CONFLICT);
            }
        }

        shiftAssignmentValidator.validateEligibility(shift, staffId, force);

        // Resolve best matching zone and skill for this employee
        StoreZone assignedZone = null;
        if (requestedZoneId != null) {
            assignedZone = storeZoneRepository.findById(requestedZoneId).orElse(null);
        }

        UUID matchedSkillId = null;

        List<StaffSkill> staffSkills = staffSkillRepository.findByStaffId(staffId);
        List<StoreZone> storeZones = storeZoneRepository.findByStoreId(storeId);

        // 1. Check if shift has explicit requirements with zones that match staff skills
        if (assignedZone == null && shift.getRequirements() != null && !shift.getRequirements().isEmpty()) {
            for (ShiftSkillRequirement req : shift.getRequirements()) {
                if (req.getSkill() != null) {
                    boolean staffHasSkill = staffSkills.stream()
                            .anyMatch(ss -> ss.getSkillId().equals(req.getSkill().getId()));
                    if (staffHasSkill) {
                        matchedSkillId = req.getSkill().getId();
                        if (req.getZone() != null) {
                            assignedZone = req.getZone();
                            break;
                        }
                    }
                }
            }
        }

        // 2. Semantic matching from store zones based on employee skills
        if (assignedZone == null && !staffSkills.isEmpty() && !storeZones.isEmpty()) {
            for (StaffSkill ss : staffSkills) {
                Skill sk = skillRepository.findById(ss.getSkillId()).orElse(null);
                if (sk != null) {
                    String sName = sk.getName().toLowerCase();
                    StoreZone matched = storeZones.stream()
                            .filter(z -> isZoneSemanticMatch(z, sName))
                            .findFirst()
                            .orElse(null);
                    if (matched != null) {
                        assignedZone = matched;
                        if (matchedSkillId == null) {
                            matchedSkillId = sk.getId();
                        }
                        break;
                    }
                }
            }
        }

        // 3. Fallback: if still null, pick first available zone
        if (assignedZone == null && !storeZones.isEmpty()) {
            assignedZone = storeZones.get(0);
        }

        ShiftAssignment assignment = ShiftAssignment.builder()
                .shift(shift)
                .staff(staff)
                .zone(assignedZone)
                .requiredSkillId(matchedSkillId)
                .source(AssignmentSource.MANUAL)
                .build();

        assignment = shiftAssignmentRepository.save(assignment);

        try {
            notificationService.sendNotification(
                    staff.getId(),
                    com.shiftsync.notification.entity.NotificationType.SCHEDULE_PUBLISHED,
                    "Phân công ca làm việc",
                    "Bạn đã được phân công ca làm việc ngày " + shift.getShiftDate() + " (" + shift.getStartTime() + " - " + shift.getEndTime() + ")",
                    java.util.Map.of("shiftId", shift.getId().toString())
            );
        } catch (Exception ignored) {
        }

        return mapToResponseDTO(assignment);
    }

    private ShiftAssignmentResponseDTO mapToResponseDTO(ShiftAssignment assignment) {
        return ShiftAssignmentResponseDTO.builder()
                .id(assignment.getId())
                .shiftId(assignment.getShift().getId())
                .staffId(assignment.getStaff().getId())
                .staffName(assignment.getStaff().getFullName())
                .avatarUrl(assignment.getStaff().getAvatarUrl())
                .requiredSkillId(assignment.getRequiredSkillId())
                .zoneId(assignment.getZone() != null ? assignment.getZone().getId() : null)
                .zoneName(assignment.getZone() != null ? assignment.getZone().getName() : null)
                .source(assignment.getSource())
                .assignedAt(assignment.getAssignedAt())
                .build();
    }

    public void unassignStaffFromShift(UUID storeId, UUID shiftId, UUID staffId) {
        Shift shift = shiftRepository.findByIdAndStoreId(shiftId, storeId)
                .orElseThrow(() -> new BusinessException("Shift not found", HttpStatus.NOT_FOUND));
        checkDateNotLocked(storeId, shift.getShiftDate());
        
        ShiftAssignment assignment = shiftAssignmentRepository.findByShiftId(shiftId).stream()
                .filter(a -> a.getStaff().getId().equals(staffId))
                .findFirst()
                .orElseThrow(() -> new BusinessException("Staff is not assigned to this shift", HttpStatus.NOT_FOUND));
                
        shiftAssignmentRepository.delete(assignment);
    }

    public java.util.List<ShiftAssignmentResponseDTO> getAssignmentsByShiftId(UUID storeId, UUID shiftId) {
        shiftRepository.findByIdAndStoreId(shiftId, storeId)
                .orElseThrow(() -> new BusinessException("Shift not found", HttpStatus.NOT_FOUND));

        return shiftAssignmentRepository.findByShiftId(shiftId).stream()
                .<ShiftAssignmentResponseDTO>map(assignment -> ShiftAssignmentResponseDTO.builder()
                        .id(assignment.getId())
                        .shiftId(assignment.getShift().getId())
                        .staffId(assignment.getStaff().getId())
                        .staffName(assignment.getStaff().getFullName())
                        .avatarUrl(assignment.getStaff().getAvatarUrl())
                        .requiredSkillId(assignment.getRequiredSkillId())
                        .zoneId(assignment.getZone() != null ? assignment.getZone().getId() : null)
                        .zoneName(assignment.getZone() != null ? assignment.getZone().getName() : null)
                        .source(assignment.getSource())
                        .assignedAt(assignment.getAssignedAt())
                        .build())
                .collect(java.util.stream.Collectors.toList());
    }

    private boolean isZoneSemanticMatch(StoreZone zone, String skillName) {
        String zName = (zone.getName() != null ? zone.getName() : "").toLowerCase();
        String zCode = (zone.getCode() != null ? zone.getCode() : "").toLowerCase();
        String zType = (zone.getZoneType() != null ? zone.getZoneType().name() : "").toLowerCase();

        if (skillName.contains("barista") || skillName.contains("pha chế") || skillName.contains("cà phê")) {
            return zName.contains("barista") || zName.contains("pha chế") || zCode.contains("barista") || zType.contains("counter");
        }
        if (skillName.contains("cashier") || skillName.contains("thu ngân") || skillName.contains("pos") || skillName.contains("checkout")) {
            return zName.contains("cashier") || zName.contains("thu ngân") || zName.contains("pos") || zCode.contains("pos") || zType.contains("counter");
        }
        if (skillName.contains("kitchen") || skillName.contains("bếp") || skillName.contains("bánh") || skillName.contains("bakery")) {
            return zName.contains("kitchen") || zName.contains("bếp") || zName.contains("bakery");
        }
        if (skillName.contains("waiter") || skillName.contains("phục vụ") || skillName.contains("server")) {
            return zName.contains("dining") || zName.contains("sảnh") || zType.contains("seating");
        }
        if (skillName.contains("leader") || skillName.contains("trưởng ca") || skillName.contains("supervisor")) {
            return zName.contains("pos") || zName.contains("cashier") || zName.contains("barista") || zName.contains("service");
        }
        return false;
    }
}

