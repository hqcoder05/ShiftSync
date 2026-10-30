package com.shiftsync.shift.service;

import com.shiftsync.notification.service.NotificationService;
import com.shiftsync.employment.enums.EmploymentStatus;
import com.shiftsync.employment.repository.EmploymentRepository;
import com.shiftsync.payroll.repository.PayrollPeriodRepository;
import com.shiftsync.payroll.enums.PayrollPeriodStatus;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;
import com.shiftsync.shared.exception.BusinessException;
import com.shiftsync.shift.dto.ShiftAssignmentResponseDTO;
import com.shiftsync.shift.dto.ShiftZoneSwapRequest;
import com.shiftsync.shift.dto.ShiftZoneSwapResponseDTO;
import com.shiftsync.shift.entity.Shift;
import com.shiftsync.shift.entity.ShiftAssignment;
import com.shiftsync.shift.entity.ShiftSkillRequirement;
import com.shiftsync.shift.enums.AssignmentSource;
import com.shiftsync.shift.enums.ShiftStatus;
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
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.UUID;

@Service
@Transactional(isolation = org.springframework.transaction.annotation.Isolation.SERIALIZABLE)
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
    private final com.shiftsync.attendance.repository.AttendanceRepository attendanceRepository;
    @Autowired(required = false)
    private com.shiftsync.shared.websocket.RealtimeEventPublisher realtimeEventPublisher;
    @Autowired(required = false)
    private com.shiftsync.shared.transaction.SerializableRetry serializableRetry;

    @org.springframework.beans.factory.annotation.Autowired
    public ShiftAssignmentService(
            ShiftRepository shiftRepository,
            ShiftAssignmentRepository shiftAssignmentRepository,
            EmploymentRepository employmentRepository,
            UserRepository userRepository,
            PayrollPeriodRepository payrollPeriodRepository,
            NotificationService notificationService,
            ShiftAssignmentValidator shiftAssignmentValidator,
            StaffSkillRepository staffSkillRepository,
            StoreZoneRepository storeZoneRepository,
            SkillRepository skillRepository,
            @org.springframework.beans.factory.annotation.Autowired(required = false) com.shiftsync.attendance.repository.AttendanceRepository attendanceRepository
    ) {
        this.shiftRepository = shiftRepository;
        this.shiftAssignmentRepository = shiftAssignmentRepository;
        this.employmentRepository = employmentRepository;
        this.userRepository = userRepository;
        this.payrollPeriodRepository = payrollPeriodRepository;
        this.notificationService = notificationService;
        this.shiftAssignmentValidator = shiftAssignmentValidator;
        this.staffSkillRepository = staffSkillRepository;
        this.storeZoneRepository = storeZoneRepository;
        this.skillRepository = skillRepository;
        this.attendanceRepository = attendanceRepository;
    }

    public ShiftAssignmentService(
            ShiftRepository shiftRepository,
            ShiftAssignmentRepository shiftAssignmentRepository,
            EmploymentRepository employmentRepository,
            UserRepository userRepository,
            PayrollPeriodRepository payrollPeriodRepository,
            NotificationService notificationService,
            ShiftAssignmentValidator shiftAssignmentValidator,
            StaffSkillRepository staffSkillRepository,
            StoreZoneRepository storeZoneRepository,
            SkillRepository skillRepository
    ) {
        this(shiftRepository, shiftAssignmentRepository, employmentRepository, userRepository,
             payrollPeriodRepository, notificationService, shiftAssignmentValidator,
             staffSkillRepository, storeZoneRepository, skillRepository, null);
    }

    @Transactional(isolation = org.springframework.transaction.annotation.Isolation.SERIALIZABLE)
    
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

        if (shift.getStatus() == ShiftStatus.COMPLETED || shift.getStatus() == ShiftStatus.CANCELLED) {
            throw new BusinessException("Cannot assign staff to a " + shift.getStatus() + " shift", HttpStatus.BAD_REQUEST);
        }

        User staff = userRepository.findById(staffId)
                .orElseThrow(() -> new BusinessException("Staff not found", HttpStatus.NOT_FOUND));

        if (staff.getSystemRole() != null && staff.getSystemRole() != com.shiftsync.shared.security.SystemRole.STAFF) {
            throw new BusinessException("Only users with role STAFF can be assigned to shifts", HttpStatus.BAD_REQUEST);
        }

        // BR-45: Check Employment is Active
        boolean isActive = employmentRepository.existsByUserIdAndStoreIdAndStatus(staffId, storeId, EmploymentStatus.ACTIVE);
        if (!isActive) {
            throw new BusinessException("Employment Inactive: Staff does not work at this store or is suspended", HttpStatus.BAD_REQUEST);
        }

        // Check if staff is ALREADY assigned to this shift (e.g. Zone Transfer / Reallocation)
        Optional<ShiftAssignment> existingOpt = shiftAssignmentRepository.findWithLockByShiftIdAndStaffId(shiftId, staffId);
        if (existingOpt.isEmpty()) {
            existingOpt = shiftAssignmentRepository.findByShiftIdAndStaffId(shiftId, staffId);
        }
        if (existingOpt.isPresent()) {
            ShiftAssignment existing = existingOpt.get();
            if (requestedZoneId != null) {
                StoreZone targetZone = storeZoneRepository.findById(requestedZoneId)
                        .filter(zone -> zone.getStore() != null && storeId.equals(zone.getStore().getId()))
                        .orElseThrow(() -> new BusinessException("Zone not found", HttpStatus.NOT_FOUND));
                existing.setZone(targetZone);
                existing = shiftAssignmentRepository.save(existing);
                publishShiftEventAfterCommit(storeId, "ASSIGNMENT_MOVED", shiftId, staffId, requestedZoneId);
                return mapToResponseDTO(existing);
            } else {
                throw new BusinessException("Staff is already assigned to this shift", HttpStatus.CONFLICT);
            }
        }

        shiftAssignmentValidator.validateEligibility(shift, staffId, force);

        // Resolve best matching zone and skill for this employee based on available requirement capacity
        StoreZone assignedZone = null;
        if (requestedZoneId != null) {
            assignedZone = storeZoneRepository.findById(requestedZoneId)
                    .filter(zone -> zone.getStore() != null && storeId.equals(zone.getStore().getId()))
                    .orElseThrow(() -> new BusinessException("Zone not found", HttpStatus.NOT_FOUND));
        }

        UUID matchedSkillId = null;

        List<ShiftAssignment> existingAssignments = shiftAssignmentRepository.findByShiftId(shiftId).stream()
                .filter(a -> !a.isDeleted())
                .collect(Collectors.toList());
        List<StaffSkill> staffSkills = staffSkillRepository.findByStaffId(staffId);
        List<StoreZone> storeZones = storeZoneRepository.findByStoreId(storeId);

        // 1. Check if shift has explicit requirements that match staff skills and have remaining capacity
        if (shift.getRequirements() != null && !shift.getRequirements().isEmpty()) {
            List<ShiftSkillRequirement> candidateReqs = new ArrayList<>();
            for (ShiftSkillRequirement req : shift.getRequirements()) {
                if (req.getSkill() == null) continue;

                boolean staffHasSkill = staffSkills.stream()
                        .anyMatch(ss -> {
                            boolean idMatch = ss.getSkillId().equals(req.getSkill().getId());
                            if (!idMatch) {
                                Skill s = skillRepository.findById(ss.getSkillId()).orElse(null);
                                if (s != null && s.getName() != null && req.getSkill().getName() != null) {
                                    idMatch = s.getName().trim().equalsIgnoreCase(req.getSkill().getName().trim());
                                }
                            }
                            return idMatch && (ss.getExpirationDate() == null || !ss.getExpirationDate().isBefore(shift.getShiftDate()));
                        });
                if (!staffHasSkill) continue;

                long currentAssigned = existingAssignments.stream()
                        .filter(a -> req.getSkill().getId().equals(a.getRequiredSkillId()))
                        .count();
                if (currentAssigned == 0 && shift.getRequirements().size() == 1) {
                    currentAssigned = existingAssignments.size();
                }

                if (currentAssigned < req.getRequiredCount()) {
                    candidateReqs.add(req);
                }
            }

            if (!candidateReqs.isEmpty()) {
                ShiftSkillRequirement chosenReq;
                if (requestedZoneId != null) {
                    chosenReq = candidateReqs.stream()
                            .filter(r -> r.getZone() != null && r.getZone().getId().equals(requestedZoneId))
                            .findFirst()
                            .orElse(candidateReqs.get(0));
                } else {
                    chosenReq = candidateReqs.get(0);
                }

                matchedSkillId = chosenReq.getSkill().getId();
                if (assignedZone == null && chosenReq.getZone() != null) {
                    assignedZone = chosenReq.getZone();
                }
            }
        }

        if (matchedSkillId == null && requestedZoneId != null && shift.getRequirements() != null) {
            matchedSkillId = shift.getRequirements().stream()
                    .filter(r -> r.getZone() != null && requestedZoneId.equals(r.getZone().getId()) && r.getSkill() != null)
                    .map(r -> r.getSkill().getId())
                    .findFirst()
                    .orElse(null);
        }

                // 2. Semantic matching from store zones based on employee skills
        if (assignedZone == null && !staffSkills.isEmpty() && !storeZones.isEmpty()) {
            java.util.List<UUID> skillIds = staffSkills.stream().map(StaffSkill::getSkillId).collect(java.util.stream.Collectors.toList());
            java.util.Map<UUID, Skill> skillMap = skillRepository.findAllById(skillIds).stream().collect(java.util.stream.Collectors.toMap(Skill::getId, s -> s));
            for (StaffSkill ss : staffSkills) {
                Skill sk = skillMap.get(ss.getSkillId());
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

        // Fallback for matchedSkillId: if still null, use staff's first skill
        if (matchedSkillId == null && !staffSkills.isEmpty()) {
            matchedSkillId = staffSkills.get(0).getSkillId();
        }

        ShiftAssignment assignment = ShiftAssignment.builder()
                .shift(shift)
                .staff(staff)
                .zone(assignedZone)
                .requiredSkillId(matchedSkillId)
                .source(AssignmentSource.MANUAL)
                .build();

        assignment = shiftAssignmentRepository.save(assignment);
        publishShiftEventAfterCommit(storeId, "ASSIGNMENT_CREATED", shiftId, staffId,
                assignedZone == null ? null : assignedZone.getId());

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
                .gender(assignment.getStaff().getGender())
                .avatarUrl(assignment.getStaff().getAvatarUrl())
                .avatarId(assignment.getStaff().getAvatarId())
                .requiredSkillId(assignment.getRequiredSkillId())
                .zoneId(assignment.getZone() != null ? assignment.getZone().getId() : null)
                .zoneName(assignment.getZone() != null ? assignment.getZone().getName() : null)
                .workstationId(assignment.getWorkstation() != null ? assignment.getWorkstation().getId() : null)
                .workstationName(assignment.getWorkstation() != null ? assignment.getWorkstation().getName() : null)
                .source(assignment.getSource())
                .assignedAt(assignment.getAssignedAt())
                .build();
    }

    @Transactional(propagation = org.springframework.transaction.annotation.Propagation.NEVER)
    public void unassignStaffFromShift(UUID storeId, UUID shiftId, UUID staffId) {
        if (serializableRetry == null) {
            unassignStaffFromShiftInTransaction(storeId, shiftId, staffId);
            return;
        }
        serializableRetry.execute(() -> {
            unassignStaffFromShiftInTransaction(storeId, shiftId, staffId);
            return null;
        });
    }

    private void unassignStaffFromShiftInTransaction(UUID storeId, UUID shiftId, UUID staffId) {
        Shift shift = shiftRepository.findByIdAndStoreId(shiftId, storeId)
                .orElseThrow(() -> new BusinessException("Shift not found", HttpStatus.NOT_FOUND));
        checkDateNotLocked(storeId, shift.getShiftDate());

        if (shift.getStatus() == ShiftStatus.COMPLETED) {
            throw new BusinessException("Cannot unassign staff from a completed shift", HttpStatus.BAD_REQUEST);
        }
        
        ShiftAssignment assignment = shiftAssignmentRepository.findWithLockByShiftIdAndStaffId(shiftId, staffId)
                .or(() -> shiftAssignmentRepository.findByShiftId(shiftId).stream()
                        .filter(a -> a.getStaff().getId().equals(staffId))
                        .findFirst())
                .orElseThrow(() -> new BusinessException("Staff is not assigned to this shift", HttpStatus.NOT_FOUND));

        if (attendanceRepository != null && attendanceRepository.existsByShiftAssignmentId(assignment.getId())) {
            throw new BusinessException("Cannot unassign staff from a shift with existing attendance records", HttpStatus.BAD_REQUEST);
        }
                
        if (shift.getAssignments() != null) {
            shift.getAssignments().remove(assignment);
        }
        shiftAssignmentRepository.delete(assignment);
        shiftAssignmentRepository.flush();
        publishShiftEventAfterCommit(storeId, "ASSIGNMENT_REMOVED", shiftId, staffId,
                assignment.getZone() == null ? null : assignment.getZone().getId());
    }

    @Transactional(propagation = org.springframework.transaction.annotation.Propagation.NEVER)
    public ShiftZoneSwapResponseDTO swapStaffZones(UUID storeId, UUID shiftId, ShiftZoneSwapRequest request) {
        if (serializableRetry == null) return swapStaffZonesInTransaction(storeId, shiftId, request);
        return serializableRetry.execute(() -> swapStaffZonesInTransaction(storeId, shiftId, request));
    }

    private ShiftZoneSwapResponseDTO swapStaffZonesInTransaction(UUID storeId, UUID shiftId, ShiftZoneSwapRequest request) {
        if (request == null || request.getStaffAId() == null || request.getStaffBId() == null) {
            throw new BusinessException("Both staff IDs are required for zone swap", HttpStatus.BAD_REQUEST);
        }

        UUID staffAId = request.getStaffAId();
        UUID staffBId = request.getStaffBId();

        if (staffAId.equals(staffBId)) {
            throw new BusinessException("Cannot swap zones with the same staff member", HttpStatus.BAD_REQUEST);
        }

        Shift shift = shiftRepository.findByIdAndStoreId(shiftId, storeId)
                .orElseThrow(() -> new BusinessException("Shift not found", HttpStatus.NOT_FOUND));
        checkDateNotLocked(storeId, shift.getShiftDate());

        if (shift.getStatus() == ShiftStatus.COMPLETED || shift.getStatus() == ShiftStatus.CANCELLED) {
            throw new BusinessException("Cannot swap assignments in a " + shift.getStatus() + " shift", HttpStatus.BAD_REQUEST);
        }

        // Pessimistic Write Lock both assignments in a single query to eliminate race conditions,
        // prevent lost updates, and guarantee canonical ordering without deadlocks.
        List<UUID> staffIds = java.util.stream.Stream.of(staffAId, staffBId).sorted().toList();
        List<ShiftAssignment> lockedAssignments = shiftAssignmentRepository.findWithLockByShiftIdAndStaffIdIn(shiftId, staffIds);
        if (lockedAssignments == null || lockedAssignments.isEmpty()) {
            lockedAssignments = new ArrayList<>();
            UUID firstId = staffAId.compareTo(staffBId) < 0 ? staffAId : staffBId;
            UUID secondId = staffAId.compareTo(staffBId) < 0 ? staffBId : staffAId;
            shiftAssignmentRepository.findByShiftIdAndStaffId(shiftId, firstId).ifPresent(lockedAssignments::add);
            shiftAssignmentRepository.findByShiftIdAndStaffId(shiftId, secondId).ifPresent(lockedAssignments::add);
        }

        ShiftAssignment assignmentA = lockedAssignments.stream()
                .filter(a -> a.getStaff() != null && staffAId.equals(a.getStaff().getId()))
                .findFirst()
                .orElseThrow(() -> new BusinessException("Staff A is not assigned to this shift", HttpStatus.NOT_FOUND));

        ShiftAssignment assignmentB = lockedAssignments.stream()
                .filter(a -> a.getStaff() != null && staffBId.equals(a.getStaff().getId()))
                .findFirst()
                .orElseThrow(() -> new BusinessException("Staff B is not assigned to this shift", HttpStatus.NOT_FOUND));

        // Determine target zone for Staff A
        UUID targetAId = request.getTargetZoneForAId() != null ? request.getTargetZoneForAId() :
                (request.getZoneBId() != null ? request.getZoneBId() :
                        (assignmentB.getZone() != null ? assignmentB.getZone().getId() : null));

        StoreZone targetZoneA = null;
        if (targetAId != null) {
            targetZoneA = storeZoneRepository.findById(targetAId)
                    .filter(z -> z.getStore() != null && storeId.equals(z.getStore().getId()))
                    .orElseThrow(() -> new BusinessException("Target zone for Staff A not found or does not belong to this store", HttpStatus.NOT_FOUND));
        }

        // Determine target zone for Staff B
        UUID targetBId = request.getTargetZoneForBId() != null ? request.getTargetZoneForBId() :
                (request.getZoneAId() != null ? request.getZoneAId() :
                        (assignmentA.getZone() != null ? assignmentA.getZone().getId() : null));

        StoreZone targetZoneB = null;
        if (targetBId != null) {
            targetZoneB = storeZoneRepository.findById(targetBId)
                    .filter(z -> z.getStore() != null && storeId.equals(z.getStore().getId()))
                    .orElseThrow(() -> new BusinessException("Target zone for Staff B not found or does not belong to this store", HttpStatus.NOT_FOUND));
        }

        assignmentA.setZone(targetZoneA);
        assignmentB.setZone(targetZoneB);

        ShiftAssignment savedA = shiftAssignmentRepository.save(assignmentA);
        ShiftAssignment savedB = shiftAssignmentRepository.save(assignmentB);
        publishShiftEventAfterCommit(storeId, "ASSIGNMENT_ZONE_SWAPPED", shiftId, staffAId,
                targetZoneA == null ? null : targetZoneA.getId());

        return ShiftZoneSwapResponseDTO.builder()
                .assignmentA(mapToResponseDTO(savedA))
                .assignmentB(mapToResponseDTO(savedB))
                .build();
    }

    private void publishShiftEventAfterCommit(UUID storeId, String action, UUID shiftId, UUID staffId, UUID zoneId) {
        if (realtimeEventPublisher == null) return;
        java.util.Map<String, Object> data = new java.util.LinkedHashMap<>();
        data.put("shiftId", shiftId == null ? "" : shiftId.toString());
        if (staffId != null) data.put("staffId", staffId.toString());
        if (zoneId != null) data.put("zoneId", zoneId.toString());
        Runnable publish = () -> realtimeEventPublisher.publishStoreEvent(storeId, "shifts", action, data);
        publish.run();
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
                .gender(assignment.getStaff().getGender())
                        .avatarUrl(assignment.getStaff().getAvatarUrl())
                        .avatarId(assignment.getStaff().getAvatarId())
                        .requiredSkillId(assignment.getRequiredSkillId())
                        .zoneId(assignment.getZone() != null ? assignment.getZone().getId() : null)
                        .zoneName(assignment.getZone() != null ? assignment.getZone().getName() : null)
                        .workstationId(assignment.getWorkstation() != null ? assignment.getWorkstation().getId() : null)
                        .workstationName(assignment.getWorkstation() != null ? assignment.getWorkstation().getName() : null)
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


