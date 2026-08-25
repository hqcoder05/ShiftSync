package com.shiftsync.shift.service;
import com.shiftsync.audit.service.AuditLogService;

import com.shiftsync.auth.entity.User;
import com.shiftsync.auth.repository.UserRepository;
import com.shiftsync.payroll.repository.PayrollPeriodRepository;
import com.shiftsync.payroll.enums.PayrollPeriodStatus;
import java.util.Arrays;
import com.shiftsync.shared.exception.BusinessException;
import com.shiftsync.shift.dto.ShiftCreateRequest;
import com.shiftsync.shift.dto.ShiftDTO;
import com.shiftsync.shift.dto.ShiftRequirementRequest;
import com.shiftsync.shift.dto.ShiftSkillRequirementDTO;
import com.shiftsync.shift.entity.Shift;
import com.shiftsync.shift.entity.ShiftAssignment;
import com.shiftsync.shift.entity.ShiftSkillRequirement;
import com.shiftsync.shift.entity.ShiftTemplate;
import com.shiftsync.shift.enums.AssignmentSource;
import com.shiftsync.shift.enums.ShiftStatus;
import com.shiftsync.shift.repository.ShiftAssignmentRepository;
import com.shiftsync.shift.repository.ShiftRepository;
import com.shiftsync.shift.repository.ShiftTemplateRepository;
import com.shiftsync.skill.entity.Skill;
import com.shiftsync.skill.repository.SkillRepository;
import com.shiftsync.store.entity.Store;
import com.shiftsync.store.repository.StoreRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ShiftService {
    private final AuditLogService auditLogService;

    private final ShiftRepository shiftRepository;
    private final StoreRepository storeRepository;
    private final com.shiftsync.store.repository.StoreConfigurationRepository storeConfigRepository;
    private final ShiftTemplateRepository shiftTemplateRepository;
    private final SkillRepository skillRepository;
    private final ShiftAssignmentRepository shiftAssignmentRepository;
    private final UserRepository userRepository;
    private final PayrollPeriodRepository payrollPeriodRepository;
    private final com.shiftsync.notification.service.NotificationService notificationService;

    @Transactional(readOnly = true)
    
    private void checkDateNotLocked(UUID storeId, java.time.LocalDate date) {
        if (payrollPeriodRepository.existsByStoreIdAndStartDateLessThanEqualAndEndDateGreaterThanEqualAndStatusIn(
                storeId, date, date, Arrays.asList(PayrollPeriodStatus.CONFIRMED, PayrollPeriodStatus.PAID))) {
            throw new BusinessException("Cannot modify shift because its date falls in a LOCKED/PAID payroll period.", HttpStatus.BAD_REQUEST);
        }
    }

    public List<ShiftDTO> getShiftsByStoreId(UUID storeId, ShiftStatus statusFilter, boolean isStaff) {
        verifyStoreExists(storeId);
        return shiftRepository.findByStoreId(storeId).stream()
                .filter(s -> {
                    if (isStaff) {
                        return s.getStatus() == ShiftStatus.PUBLISHED || s.getStatus() == ShiftStatus.COMPLETED;
                    }
                    if (statusFilter != null) {
                        return s.getStatus() == statusFilter;
                    }
                    return true;
                })
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    @Transactional
    public ShiftDTO createShift(UUID storeId, ShiftCreateRequest request) {
        checkDateNotLocked(storeId, request.getShiftDate());
        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new BusinessException("Store not found", HttpStatus.NOT_FOUND));

        if (!request.getStartTime().isBefore(request.getEndTime())) {
            throw new BusinessException("Start time must be before end time", HttpStatus.BAD_REQUEST);
        }
        
        if (store.getOpenTime() != null && request.getStartTime().isBefore(store.getOpenTime())) {
            throw new BusinessException("Shift start time cannot be before store open time", HttpStatus.BAD_REQUEST);
        }
        
        if (store.getCloseTime() != null && request.getEndTime().isAfter(store.getCloseTime())) {
            throw new BusinessException("Shift end time cannot be after store close time", HttpStatus.BAD_REQUEST);
        }

        ShiftTemplate template = null;
        if (request.getShiftTemplateId() != null) {
            template = shiftTemplateRepository.findByIdAndStoreId(request.getShiftTemplateId(), storeId)
                    .orElseThrow(() -> new BusinessException("Shift template not found in this store", HttpStatus.NOT_FOUND));
        }

        java.time.ZonedDateTime deadline = request.getAvailabilityDeadline();
        if (deadline == null) {
            com.shiftsync.store.entity.StoreConfiguration config = storeConfigRepository.findByStoreId(storeId).orElse(null);
            int deadlineHours = config != null ? config.getAvailabilityDeadlineHours() : 24;
            deadline = java.time.ZonedDateTime.of(request.getShiftDate(), request.getStartTime(), java.time.ZoneId.of("UTC")).minusHours(deadlineHours);
        }

        Shift shift = Shift.builder()
                .store(store)
                .shiftTemplate(template)
                .shiftDate(request.getShiftDate())
                .startTime(request.getStartTime())
                .endTime(request.getEndTime())
                .status(ShiftStatus.DRAFT)
                .availabilityDeadline(deadline)
                .build();

        Shift savedShift = shiftRepository.save(shift);

        if (request.getStaffId() != null) {
            userRepository.findById(request.getStaffId()).ifPresent(staff -> {
                ShiftAssignment assignment = ShiftAssignment.builder()
                        .shift(savedShift)
                        .staff(staff)
                        .source(AssignmentSource.MANUAL)
                        .build();
                shiftAssignmentRepository.save(assignment);
            });
        }

        return mapToDTO(savedShift);
    }

    @Transactional
    public ShiftDTO setShiftRequirements(UUID storeId, UUID shiftId, List<ShiftRequirementRequest> requirements) {
        Shift shift = shiftRepository.findByIdAndStoreId(shiftId, storeId)
                .orElseThrow(() -> new BusinessException("Shift not found in this store", HttpStatus.NOT_FOUND));

        if (shift.getStatus() != ShiftStatus.DRAFT) {
            throw new BusinessException("Cannot modify requirements of a shift that is already published", HttpStatus.BAD_REQUEST);
        }

        List<ShiftSkillRequirement> newRequirements = requirements.stream().map(req -> {
            Skill skill = skillRepository.findByIdAndStoreId(req.getSkillId(), storeId)
                    .orElseThrow(() -> new BusinessException("Skill not found in this store: " + req.getSkillId(), HttpStatus.NOT_FOUND));
            
            return ShiftSkillRequirement.builder()
                    .shift(shift)
                    .skill(skill)
                    .requiredCount(req.getRequiredCount())
                    .build();
        }).collect(Collectors.toList());

        shift.setRequirements(newRequirements);
        
        return mapToDTO(shiftRepository.save(shift));
    }

    @Transactional
    public void publishShifts(UUID storeId, java.time.LocalDate startDate, java.time.LocalDate endDate, java.util.UUID managerId) {
        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new BusinessException("Store not found", HttpStatus.NOT_FOUND));
        List<Shift> shifts = shiftRepository.findByStoreIdAndShiftDateBetween(storeId, startDate, endDate);
        
        int publishedCount = 0;
        for (Shift shift : shifts) {
            
            checkDateNotLocked(storeId, shift.getShiftDate());
            if (shift.getStatus() == ShiftStatus.DRAFT) {

                if (store.getOpenTime() != null && shift.getStartTime().isBefore(store.getOpenTime())) {
                    throw new BusinessException("Shift " + shift.getId() + " start time is before store open time", HttpStatus.BAD_REQUEST);
                }
                if (store.getCloseTime() != null && shift.getEndTime().isAfter(store.getCloseTime())) {
                    throw new BusinessException("Shift " + shift.getId() + " end time is after store close time", HttpStatus.BAD_REQUEST);
                }
                shift.setStatus(ShiftStatus.PUBLISHED);
                publishedCount++;
            }
        }
        
                if (publishedCount > 0) {
            auditLogService.log(managerId, "PUBLISH_SCHEDULE", "Store", storeId, null, 
                java.util.Map.of("startDate", startDate.toString(), "endDate", endDate.toString(), "publishedCount", publishedCount));

            shiftRepository.saveAll(shifts);
            
            // Hook: FR-19 SCHEDULE_PUBLISHED
            java.util.List<ShiftAssignment> assignments = shiftAssignmentRepository.findByShift_Store_IdAndShift_ShiftDateBetween(storeId, startDate, endDate);
            java.util.Set<java.util.UUID> notifiedStaffIds = new java.util.HashSet<>();
            for (ShiftAssignment sa : assignments) {
                if (notifiedStaffIds.add(sa.getStaff().getId())) {
                    notificationService.sendNotification(
                        sa.getStaff().getId(),
                        com.shiftsync.notification.entity.NotificationType.SCHEDULE_PUBLISHED,
                        "Schedule Published",
                        "The schedule from " + startDate + " to " + endDate + " has been published.",
                        null
                    );
                }
            }
        }
    }

    @Transactional
    public ShiftDTO updateShift(UUID storeId, UUID shiftId, ShiftCreateRequest request) {
        Shift shift = shiftRepository.findByIdAndStoreId(shiftId, storeId)
                .orElseThrow(() -> new BusinessException("Shift not found in this store", HttpStatus.NOT_FOUND));

        if (request.getStartTime() != null && request.getEndTime() != null) {
            if (!request.getStartTime().isBefore(request.getEndTime())) {
                throw new BusinessException("Start time must be before end time", HttpStatus.BAD_REQUEST);
            }
            shift.setStartTime(request.getStartTime());
            shift.setEndTime(request.getEndTime());
        }
        if (request.getShiftDate() != null) {
            shift.setShiftDate(request.getShiftDate());
        }
        if (request.getAvailabilityDeadline() != null) {
            shift.setAvailabilityDeadline(request.getAvailabilityDeadline());
        }

        Shift saved = shiftRepository.save(shift);

        if (request.getStaffId() != null) {
            List<ShiftAssignment> existing = shiftAssignmentRepository.findByShiftId(shiftId);
            if (existing.isEmpty() || !existing.get(0).getStaff().getId().equals(request.getStaffId())) {
                shiftAssignmentRepository.deleteAll(existing);
                userRepository.findById(request.getStaffId()).ifPresent(staff -> {
                    ShiftAssignment assignment = ShiftAssignment.builder()
                            .shift(saved)
                            .staff(staff)
                            .source(AssignmentSource.MANUAL)
                            .build();
                    shiftAssignmentRepository.save(assignment);
                });
            }
        }

        return mapToDTO(saved);
    }

    @Transactional
    public void deleteShift(UUID storeId, UUID shiftId) {
        Shift shift = shiftRepository.findByIdAndStoreId(shiftId, storeId)
                .orElseThrow(() -> new BusinessException("Shift not found in this store", HttpStatus.NOT_FOUND));
        List<ShiftAssignment> assignments = shiftAssignmentRepository.findByShiftId(shiftId);
        if (!assignments.isEmpty()) {
            shiftAssignmentRepository.deleteAll(assignments);
        }
        shiftRepository.delete(shift);
    }

    private void verifyStoreExists(UUID storeId) {
        if (!storeRepository.existsById(storeId)) {
            throw new BusinessException("Store not found", HttpStatus.NOT_FOUND);
        }
    }

    private ShiftDTO mapToDTO(Shift entity) {
        List<ShiftSkillRequirementDTO> reqDTOs = entity.getRequirements().stream()
                .map(req -> ShiftSkillRequirementDTO.builder()
                        .id(req.getId())
                        .skillId(req.getSkill().getId())
                        .skillName(req.getSkill().getName())
                        .requiredCount(req.getRequiredCount())
                        .build())
                .collect(Collectors.toList());

        UUID assignedStaffId = null;
        String assignedStaffName = null;
        List<ShiftAssignment> assignments = shiftAssignmentRepository.findByShiftId(entity.getId());
        if (!assignments.isEmpty()) {
            User staff = assignments.get(0).getStaff();
            assignedStaffId = staff.getId();
            assignedStaffName = staff.getFullName();
        }

        return ShiftDTO.builder()
                .id(entity.getId())
                .storeId(entity.getStore().getId())
                .shiftTemplateId(entity.getShiftTemplate() != null ? entity.getShiftTemplate().getId() : null)
                .shiftDate(entity.getShiftDate())
                .startTime(entity.getStartTime())
                .endTime(entity.getEndTime())
                .status(entity.getStatus())
                .availabilityDeadline(entity.getAvailabilityDeadline())
                .requirements(reqDTOs)
                .staffId(assignedStaffId)
                .staffName(assignedStaffName)
                .build();
    }
}