package com.shiftsync.shift.service;
import com.shiftsync.audit.service.AuditLogService;

import com.shiftsync.auth.entity.User;
import com.shiftsync.auth.repository.UserRepository;
import com.shiftsync.payroll.repository.PayrollPeriodRepository;
import com.shiftsync.payroll.enums.PayrollPeriodStatus;
import java.util.Arrays;
import com.shiftsync.shared.exception.BusinessException;
import com.shiftsync.shift.dto.BulkDemandPlanningRequest;
import com.shiftsync.shift.dto.BulkDemandPlanningResponse;
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
import com.shiftsync.layout.entity.StoreZone;
import com.shiftsync.layout.repository.StoreZoneRepository;
import com.shiftsync.store.entity.Store;
import com.shiftsync.store.repository.StoreRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
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
    private final StoreZoneRepository storeZoneRepository;
    private final com.shiftsync.skill.repository.StaffSkillRepository staffSkillRepository;
    private final com.shiftsync.employment.repository.EmploymentRepository employmentRepository;
    private final ShiftAssignmentValidator shiftAssignmentValidator;
    private final ShiftAssignmentService shiftAssignmentService;

    @org.springframework.beans.factory.annotation.Autowired
    public ShiftService(
            AuditLogService auditLogService,
            ShiftRepository shiftRepository,
            StoreRepository storeRepository,
            com.shiftsync.store.repository.StoreConfigurationRepository storeConfigRepository,
            ShiftTemplateRepository shiftTemplateRepository,
            SkillRepository skillRepository,
            ShiftAssignmentRepository shiftAssignmentRepository,
            UserRepository userRepository,
            PayrollPeriodRepository payrollPeriodRepository,
            com.shiftsync.notification.service.NotificationService notificationService,
            StoreZoneRepository storeZoneRepository,
            com.shiftsync.skill.repository.StaffSkillRepository staffSkillRepository,
            com.shiftsync.employment.repository.EmploymentRepository employmentRepository,
            ShiftAssignmentValidator shiftAssignmentValidator,
            ShiftAssignmentService shiftAssignmentService
    ) {
        this.auditLogService = auditLogService;
        this.shiftRepository = shiftRepository;
        this.storeRepository = storeRepository;
        this.storeConfigRepository = storeConfigRepository;
        this.shiftTemplateRepository = shiftTemplateRepository;
        this.skillRepository = skillRepository;
        this.shiftAssignmentRepository = shiftAssignmentRepository;
        this.userRepository = userRepository;
        this.payrollPeriodRepository = payrollPeriodRepository;
        this.notificationService = notificationService;
        this.storeZoneRepository = storeZoneRepository;
        this.staffSkillRepository = staffSkillRepository;
        this.employmentRepository = employmentRepository;
        this.shiftAssignmentValidator = shiftAssignmentValidator;
        this.shiftAssignmentService = shiftAssignmentService;
    }

    public ShiftService(
            AuditLogService auditLogService,
            ShiftRepository shiftRepository,
            StoreRepository storeRepository,
            com.shiftsync.store.repository.StoreConfigurationRepository storeConfigRepository,
            ShiftTemplateRepository shiftTemplateRepository,
            SkillRepository skillRepository,
            ShiftAssignmentRepository shiftAssignmentRepository,
            UserRepository userRepository,
            PayrollPeriodRepository payrollPeriodRepository,
            com.shiftsync.notification.service.NotificationService notificationService,
            StoreZoneRepository storeZoneRepository,
            com.shiftsync.skill.repository.StaffSkillRepository staffSkillRepository
    ) {
        this(auditLogService, shiftRepository, storeRepository, storeConfigRepository, shiftTemplateRepository, skillRepository, shiftAssignmentRepository, userRepository, payrollPeriodRepository, notificationService, storeZoneRepository, staffSkillRepository, null, null, null);
    }

    private void checkDateNotLocked(UUID storeId, java.time.LocalDate date) {
        if (payrollPeriodRepository.existsByStoreIdAndStartDateLessThanEqualAndEndDateGreaterThanEqualAndStatusIn(
                storeId, date, date, Arrays.asList(PayrollPeriodStatus.CONFIRMED, PayrollPeriodStatus.PAID))) {
            throw new BusinessException("Cannot modify shift because its date falls in a LOCKED/PAID payroll period.", HttpStatus.BAD_REQUEST);
        }
    }

    @Transactional(readOnly = true)
    public List<ShiftDTO> getShiftsByStoreId(UUID storeId, ShiftStatus statusFilter, boolean isStaff) {
        return getShiftsByStoreId(storeId, null, statusFilter, isStaff);
    }

    @Transactional(readOnly = true)
    public List<ShiftDTO> getShiftsByStoreId(UUID storeId, java.time.LocalDate date, ShiftStatus statusFilter, boolean isStaff) {
        verifyStoreExists(storeId);
        List<Shift> shifts = date != null
                ? shiftRepository.findByStoreIdAndShiftDateBetween(storeId, date, date)
                : shiftRepository.findByStoreId(storeId);
        return shifts.stream()
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
            requireAssignmentService().assignStaffToShift(storeId, savedShift.getId(), request.getStaffId());
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

        if (requirements == null) {
            requirements = Collections.emptyList();
        }

        java.util.Set<UUID> seenSkillIds = new java.util.HashSet<>();
        for (ShiftRequirementRequest req : requirements) {
            if (req.getSkillId() == null) {
                throw new BusinessException("Skill ID cannot be null in requirements", HttpStatus.BAD_REQUEST);
            }
            if (req.getRequiredCount() < 0) {
                throw new BusinessException("Required count cannot be negative: " + req.getRequiredCount(), HttpStatus.BAD_REQUEST);
            }
            if (!seenSkillIds.add(req.getSkillId())) {
                throw new BusinessException("Duplicate skill requirement for skill: " + req.getSkillId(), HttpStatus.BAD_REQUEST);
            }
        }

        List<StoreZone> storeZones = storeZoneRepository.findByStoreId(storeId);

        List<ShiftSkillRequirement> newRequirements = requirements.stream().map(req -> {
            Skill skill = skillRepository.findByIdAndStoreId(req.getSkillId(), storeId)
                    .orElseThrow(() -> new BusinessException("Skill not found in this store: " + req.getSkillId(), HttpStatus.NOT_FOUND));

            StoreZone zone = null;
            if (req.getZoneId() != null) {
                zone = storeZoneRepository.findById(req.getZoneId())
                        .filter(candidate -> candidate.getStore() != null && storeId.equals(candidate.getStore().getId()))
                        .orElseThrow(() -> new BusinessException("Zone not found in this store: " + req.getZoneId(), HttpStatus.NOT_FOUND));
            }
            if (zone == null && !storeZones.isEmpty()) {
                String sName = skill.getName().toLowerCase();
                zone = storeZones.stream()
                        .filter(z -> isZoneSemanticMatch(z, sName))
                        .findFirst()
                        .orElse(null);
            }

            return ShiftSkillRequirement.builder()
                    .shift(shift)
                    .skill(skill)
                    .zone(zone)
                    .requiredCount(req.getRequiredCount())
                    .build();
        }).collect(Collectors.toList());

        shift.setRequirements(newRequirements);

        return mapToDTO(shiftRepository.save(shift));
    }

    @Transactional
    public BulkDemandPlanningResponse saveBulkDemandPlanning(UUID storeId, BulkDemandPlanningRequest request) {
        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new BusinessException("Store not found", HttpStatus.NOT_FOUND));

        List<LocalDate> targetDates = new ArrayList<>();
        if ("DAY".equalsIgnoreCase(request.getScope()) && request.getTargetDate() != null) {
            targetDates.add(request.getTargetDate());
        } else if (request.getStartDate() != null && request.getEndDate() != null) {
            LocalDate curr = request.getStartDate();
            while (!curr.isAfter(request.getEndDate())) {
                targetDates.add(curr);
                curr = curr.plusDays(1);
            }
        } else if (request.getTargetDate() != null) {
            targetDates.add(request.getTargetDate());
        }

        if (targetDates.isEmpty()) {
            throw new BusinessException("No target dates specified for demand planning", HttpStatus.BAD_REQUEST);
        }

        List<StoreZone> storeZones = storeZoneRepository.findByStoreId(storeId);
        List<Skill> storeSkills = skillRepository.findByStoreId(storeId);
        Map<UUID, Skill> skillMap = storeSkills.stream().collect(Collectors.toMap(Skill::getId, s -> s));

        validateBulkDemandRequirements(storeId, request, skillMap, storeZones);

        int createdCount = 0;
        int updatedCount = 0;
        int totalRequirements = 0;

        for (LocalDate date : targetDates) {
            checkDateNotLocked(storeId, date);

            for (BulkDemandPlanningRequest.ShiftDemandConfig dConfig : request.getShifts()) {
                if (!dConfig.getStartTime().isBefore(dConfig.getEndTime())) {
                    throw new BusinessException("Start time must be before end time", HttpStatus.BAD_REQUEST);
                }
                if (store.getOpenTime() != null && dConfig.getStartTime().isBefore(store.getOpenTime())) {
                    throw new BusinessException("Shift start time cannot be before store open time", HttpStatus.BAD_REQUEST);
                }
                if (store.getCloseTime() != null && dConfig.getEndTime().isAfter(store.getCloseTime())) {
                    throw new BusinessException("Shift end time cannot be after store close time", HttpStatus.BAD_REQUEST);
                }

                Shift shift = shiftRepository.findByStoreIdAndShiftDateAndStartTimeAndEndTime(storeId, date, dConfig.getStartTime(), dConfig.getEndTime())
                        .orElse(null);

                if (shift == null) {
                    java.time.ZonedDateTime deadline = java.time.ZonedDateTime.of(date, dConfig.getStartTime(), java.time.ZoneId.of("UTC")).minusHours(24);
                    shift = Shift.builder()
                            .store(store)
                            .shiftDate(date)
                            .startTime(dConfig.getStartTime())
                            .endTime(dConfig.getEndTime())
                            .status(ShiftStatus.DRAFT)
                            .availabilityDeadline(deadline)
                            .requirements(new ArrayList<>())
                            .build();
                    shift = shiftRepository.save(shift);
                    createdCount++;
                } else {
                    if (shift.getStatus() == ShiftStatus.COMPLETED) {
                        continue;
                    }
                    updatedCount++;
                }

                List<ShiftSkillRequirement> reqEntities = new ArrayList<>();
                java.util.Set<UUID> seenSkillIds = new java.util.HashSet<>();
                if (dConfig.getRequirements() != null) {
                    for (ShiftRequirementRequest req : dConfig.getRequirements()) {
                        seenSkillIds.add(req.getSkillId());
                        Skill skill = skillMap.get(req.getSkillId());

                        StoreZone zone = null;
                        if (req.getZoneId() != null) {
                            zone = storeZones.stream()
                                    .filter(candidate -> req.getZoneId().equals(candidate.getId()))
                                    .findFirst()
                                    .orElseThrow(() -> new BusinessException("Zone not found in this store: " + req.getZoneId(), HttpStatus.NOT_FOUND));
                        }
                        if (zone == null && !storeZones.isEmpty()) {
                            String sName = skill.getName().toLowerCase();
                            zone = storeZones.stream()
                                    .filter(z -> isZoneSemanticMatch(z, sName))
                                    .findFirst()
                                    .orElse(null);
                        }

                        reqEntities.add(ShiftSkillRequirement.builder()
                                .shift(shift)
                                .skill(skill)
                                .zone(zone)
                                .requiredCount(req.getRequiredCount())
                                .build());
                        totalRequirements++;
                    }
                }

                shift.setRequirements(reqEntities);
                shiftRepository.save(shift);
            }
        }

        return BulkDemandPlanningResponse.builder()
                .createdShifts(createdCount)
                .updatedShifts(updatedCount)
                .totalRequirements(totalRequirements)
                .message(String.format("Successfully configured demand for %d shifts (%d created, %d updated, %d requirements)",
                        createdCount + updatedCount, createdCount, updatedCount, totalRequirements))
                .build();
    }

    private void validateBulkDemandRequirements(UUID storeId, BulkDemandPlanningRequest request,
                                                Map<UUID, Skill> skillMap, List<StoreZone> storeZones) {
        if (request.getShifts() == null) {
            throw new BusinessException("Shifts configuration list cannot be null", HttpStatus.BAD_REQUEST);
        }
        for (BulkDemandPlanningRequest.ShiftDemandConfig config : request.getShifts()) {
            if (config.getRequirements() == null) {
                continue;
            }
            java.util.Set<UUID> seenSkillIds = new java.util.HashSet<>();
            for (ShiftRequirementRequest requirement : config.getRequirements()) {
                if (requirement.getSkillId() == null) {
                    throw new BusinessException("Skill ID cannot be null in requirements", HttpStatus.BAD_REQUEST);
                }
                if (requirement.getRequiredCount() < 0) {
                    throw new BusinessException("Required count cannot be negative: " + requirement.getRequiredCount(), HttpStatus.BAD_REQUEST);
                }
                if (!seenSkillIds.add(requirement.getSkillId())) {
                    throw new BusinessException("Duplicate skill requirement for skill: " + requirement.getSkillId(), HttpStatus.BAD_REQUEST);
                }
                if (!skillMap.containsKey(requirement.getSkillId())) {
                    throw new BusinessException("Skill not found in this store: " + requirement.getSkillId(), HttpStatus.NOT_FOUND);
                }
                if (requirement.getZoneId() != null && storeZones.stream().noneMatch(zone -> requirement.getZoneId().equals(zone.getId()))) {
                    throw new BusinessException("Zone not found in this store: " + requirement.getZoneId(), HttpStatus.NOT_FOUND);
                }
            }
        }
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

                List<ShiftAssignment> assignments = shiftAssignmentRepository.findByShiftId(shift.getId());
                for (ShiftAssignment sa : assignments) {
                    try {
                        notificationService.sendNotification(
                                sa.getStaff().getId(),
                                com.shiftsync.notification.entity.NotificationType.SCHEDULE_PUBLISHED, "Lịch làm việc đã xuất bản",
                                "Lịch làm việc tuần mới đã được công bố. Ca của bạn: ngày " + shift.getShiftDate() + " (" + shift.getStartTime() + " - " + shift.getEndTime() + ")",
                                java.util.Map.of("shiftId", shift.getId().toString())
                        );
                    } catch (Exception ignored) {
                    }
                }
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
        checkDateNotLocked(storeId, shift.getShiftDate());
        if (request.getShiftDate() != null && !request.getShiftDate().equals(shift.getShiftDate())) {
            checkDateNotLocked(storeId, request.getShiftDate());
        }

        if (request.getStartTime() != null && request.getEndTime() != null) {
            if (!request.getStartTime().isBefore(request.getEndTime())) {
                throw new BusinessException("Start time must be before end time", HttpStatus.BAD_REQUEST);
            }
            Store store = shift.getStore();
            if (store == null) {
                store = storeRepository.findById(storeId).orElse(null);
            }
            if (store != null) {
                if (store.getOpenTime() != null && request.getStartTime().isBefore(store.getOpenTime())) {
                    throw new BusinessException("Shift start time cannot be before store open time", HttpStatus.BAD_REQUEST);
                }
                if (store.getCloseTime() != null && request.getEndTime().isAfter(store.getCloseTime())) {
                    throw new BusinessException("Shift end time cannot be after store close time", HttpStatus.BAD_REQUEST);
                }
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
                requireAssignmentService().assignStaffToShift(storeId, saved.getId(), request.getStaffId());
            }
        }

        return mapToDTO(saved);
    }

    private ShiftAssignmentService requireAssignmentService() {
        if (shiftAssignmentService == null) {
            throw new IllegalStateException("ShiftAssignmentService is required for staff assignment");
        }
        return shiftAssignmentService;
    }

    @Transactional
    public void deleteShift(UUID storeId, UUID shiftId) {
        Shift shift = shiftRepository.findByIdAndStoreId(shiftId, storeId)
                .orElseThrow(() -> new BusinessException("Shift not found in this store", HttpStatus.NOT_FOUND));
        checkDateNotLocked(storeId, shift.getShiftDate());
        List<ShiftAssignment> assignments = shiftAssignmentRepository.findByShiftId(shiftId);
        if (!assignments.isEmpty()) {
            shiftAssignmentRepository.deleteAll(assignments);
        }
        shiftRepository.delete(shift);
    }

    @Transactional(readOnly = true)
    public List<ShiftDTO> getShiftsByStaffId(UUID staffId) {
        return shiftAssignmentRepository.findByStaffId(staffId).stream()
                .map(ShiftAssignment::getShift)
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ShiftDTO> getShiftsByStoreAndStaff(UUID storeId, UUID staffId) {
        verifyStoreExists(storeId);
        return shiftAssignmentRepository.findByStaffId(staffId).stream()
                .map(ShiftAssignment::getShift)
                .filter(s -> s.getStore().getId().equals(storeId))
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    private void verifyStoreExists(UUID storeId) {
        if (!storeRepository.existsById(storeId)) {
            throw new BusinessException("Store not found", HttpStatus.NOT_FOUND);
        }
    }

    public ShiftDTO mapToDTO(Shift entity) {
        List<ShiftAssignment> assignments = entity.getAssignments() != null ? entity.getAssignments() : new java.util.ArrayList<>();

        Map<UUID, String> skillNameMap = entity.getRequirements() != null
                ? entity.getRequirements().stream()
                        .filter(r -> r.getSkill() != null)
                        .collect(Collectors.toMap(r -> r.getSkill().getId(), r -> r.getSkill().getName(), (k1, k2) -> k1))
                : java.util.Collections.emptyMap();

        List<com.shiftsync.shift.dto.ShiftAssignmentResponseDTO> assignmentDTOs = assignments.stream()
                .<com.shiftsync.shift.dto.ShiftAssignmentResponseDTO>map(a -> {
                    String skillName = null;
                    if (a.getRequiredSkillId() != null) {
                        skillName = skillNameMap.get(a.getRequiredSkillId());
                        if (skillName == null) {
                            skillName = skillRepository.findById(a.getRequiredSkillId())
                                    .map(com.shiftsync.skill.entity.Skill::getName)
                                    .orElse(null);
                        }
                    }
                    return com.shiftsync.shift.dto.ShiftAssignmentResponseDTO.builder()
                            .id(a.getId())
                            .shiftId(a.getShift() != null ? a.getShift().getId() : null)
                            .staffId(a.getStaff() != null ? a.getStaff().getId() : null)
                            .staffName(a.getStaff() != null ? a.getStaff().getFullName() : null)
                            .avatarUrl(a.getStaff() != null ? a.getStaff().getAvatarUrl() : null)
                            .avatarId(a.getStaff() != null ? a.getStaff().getAvatarId() : null)
                            .requiredSkillId(a.getRequiredSkillId())
                            .skillName(skillName)
                            .zoneId(a.getZone() != null ? a.getZone().getId() : null)
                            .zoneName(a.getZone() != null ? a.getZone().getName() : null)
                            .source(a.getSource())
                            .assignedAt(a.getAssignedAt())
                            .build();
                })
                .collect(Collectors.toList());

        List<ShiftSkillRequirementDTO> reqDTOs = entity.getRequirements() != null
                ? entity.getRequirements().stream()
                .map(req -> {
                    int count = 0;
                    if (req.getSkill() != null) {
                        count = (int) assignments.stream()
                                .filter(a -> !a.isDeleted() && req.getSkill().getId().equals(a.getRequiredSkillId()))
                                .filter(a -> {
                                    if (req.getZone() != null && a.getZone() != null) {
                                        return req.getZone().getId().equals(a.getZone().getId());
                                    }
                                    return true;
                                })
                                .count();
                    }
                    if (count == 0 && entity.getRequirements().size() == 1) {
                        count = (int) assignments.stream().filter(a -> !a.isDeleted()).count();
                    }
                    int shortage = Math.max(0, req.getRequiredCount() - count);
                    return ShiftSkillRequirementDTO.builder()
                            .id(req.getId())
                            .skillId(req.getSkill() != null ? req.getSkill().getId() : null)
                            .skillName(req.getSkill() != null ? req.getSkill().getName() : null)
                            .requiredStaff(req.getRequiredCount())
                            .assignedCount(count)
                            .shortageCount(shortage)
                            .zoneId(req.getZone() != null ? req.getZone().getId() : null)
                            .zoneName(req.getZone() != null ? req.getZone().getName() : null)
                            .build();
                })
                .collect(Collectors.toList())
                : java.util.Collections.emptyList();

        UUID assignedStaffId = null;
        String assignedStaffName = null;
        if (!assignments.isEmpty()) {
            User staff = assignments.get(0).getStaff();
            if (staff != null) {
                assignedStaffId = staff.getId();
                assignedStaffName = staff.getFullName();
            }
        }

        String primarySkillName = (entity.getRequirements() != null && !entity.getRequirements().isEmpty() && entity.getRequirements().get(0).getSkill() != null)
                ? entity.getRequirements().get(0).getSkill().getName() : null;
        int totalRequiredStaff = entity.getRequirements() != null
                ? entity.getRequirements().stream().mapToInt(com.shiftsync.shift.entity.ShiftSkillRequirement::getRequiredCount).sum()
                : 0;
        int totalAssignedStaff = (int) assignments.stream().filter(a -> !a.isDeleted()).count();
        int totalShortageStaff = Math.max(0, totalRequiredStaff - totalAssignedStaff);

        return ShiftDTO.builder()
                .id(entity.getId())
                .storeId(entity.getStore() != null ? entity.getStore().getId() : null)
                .shiftTemplateId(entity.getShiftTemplate() != null ? entity.getShiftTemplate().getId() : null)
                .shiftDate(entity.getShiftDate())
                .startTime(entity.getStartTime())
                .endTime(entity.getEndTime())
                .status(entity.getStatus())
                .availabilityDeadline(entity.getAvailabilityDeadline())
                .skillRequirements(reqDTOs)
                .shiftAssignments(assignmentDTOs)
                .staffId(assignedStaffId)
                .staffName(assignedStaffName)
                .skillName(primarySkillName)
                .requiredStaff(totalRequiredStaff)
                .assignedStaffCount(totalAssignedStaff)
                .shortageStaff(totalShortageStaff)
                .isOpen(entity.isOpen())
                .note(entity.getNote())
                .build();
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

    @Transactional(readOnly = true)
    public List<com.shiftsync.employment.dto.EmploymentDTO> getEligibleStaffForShift(UUID storeId, UUID shiftId) {
        verifyStoreExists(storeId);
        Shift shift = shiftRepository.findById(shiftId)
                .orElseThrow(() -> new BusinessException("Shift not found", HttpStatus.NOT_FOUND));

        if (!shift.getStore().getId().equals(storeId)) {
            throw new BusinessException("Shift does not belong to store", HttpStatus.BAD_REQUEST);
        }

        List<com.shiftsync.employment.entity.Employment> activeEmployments =
                employmentRepository.findByStoreIdAndStatus(storeId, com.shiftsync.employment.enums.EmploymentStatus.ACTIVE);

        return activeEmployments.stream()
                .filter(emp -> emp.getUser() != null && shiftAssignmentValidator.isEligible(shift, emp.getUser().getId()))
                .map(com.shiftsync.employment.mapper.EmploymentMapper::toDTO)
                .collect(Collectors.toList());
    }
}
