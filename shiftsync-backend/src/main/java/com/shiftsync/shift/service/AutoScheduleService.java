package com.shiftsync.shift.service;

import com.shiftsync.availability.entity.Availability;
import com.shiftsync.availability.entity.BlackoutDate;
import com.shiftsync.availability.repository.AvailabilityRepository;
import com.shiftsync.availability.repository.BlackoutDateRepository;
import com.shiftsync.employment.entity.Employment;
import com.shiftsync.employment.enums.EmploymentStatus;
import com.shiftsync.employment.repository.EmploymentRepository;
import com.shiftsync.shared.exception.BusinessException;
import com.shiftsync.shared.security.SystemRole;
import com.shiftsync.shift.dto.AutoScheduleRequest;
import com.shiftsync.shift.dto.AutoScheduleResult;
import com.shiftsync.shift.dto.FeasibilityDiagnosticsDTO;
import com.shiftsync.shift.dto.RequirementCoverageDTO;
import com.shiftsync.shift.dto.ShortageDetailDTO;
import com.shiftsync.shift.enums.ScheduleCoverageStatus;
import com.shiftsync.shift.entity.Shift;
import com.shiftsync.shift.entity.ShiftAssignment;
import com.shiftsync.shift.entity.ShiftSkillRequirement;
import com.shiftsync.shift.enums.AssignmentSource;
import com.shiftsync.shift.enums.ShiftStatus;
import com.shiftsync.shift.repository.ShiftAssignmentRepository;
import com.shiftsync.shift.repository.ShiftRepository;
import com.shiftsync.skill.entity.StaffSkill;
import com.shiftsync.skill.repository.StaffSkillRepository;
import com.shiftsync.quota.dto.AutoFillQuotaRequest;
import com.shiftsync.quota.service.HeadcountQuotaService;
import com.shiftsync.store.entity.SchedulerConfiguration;
import com.shiftsync.store.entity.Store;
import com.shiftsync.store.entity.StoreConfiguration;
import com.shiftsync.store.repository.SchedulerConfigurationRepository;
import com.shiftsync.store.repository.StoreConfigurationRepository;
import com.shiftsync.store.repository.StoreRepository;
import com.shiftsync.layout.entity.StoreZone;
import com.shiftsync.layout.entity.Workstation;
import com.shiftsync.layout.service.SpatialAllocationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
public class AutoScheduleService {

    /**
     * Số lần thử hoán đổi tối đa cho mỗi slot chưa được gán trong bước Local Repair.
     * Giới hạn độ phức tạp worst-case: O(U × MAX_REPAIR × |newAssignments| × |staffMap|).
     */
    private static final int MAX_REPAIR_ATTEMPTS_PER_SLOT = 20;

    private final ShiftRepository shiftRepository;
    private final ShiftAssignmentRepository shiftAssignmentRepository;
    private final EmploymentRepository employmentRepository;
    private final StaffSkillRepository staffSkillRepository;
    private final AvailabilityRepository availabilityRepository;
    private final BlackoutDateRepository blackoutDateRepository;
    private final StoreConfigurationRepository storeConfigRepo;
    private final SchedulerConfigurationRepository schedulerConfigRepo;
    private final StoreRepository storeRepository;
    private final HeadcountQuotaService headcountQuotaService;
    private final SpatialAllocationService spatialAllocationService;
    private final com.shiftsync.leave.repository.LeaveRequestRepository leaveRequestRepository;

    @Autowired
    public AutoScheduleService(
            ShiftRepository shiftRepository,
            ShiftAssignmentRepository shiftAssignmentRepository,
            EmploymentRepository employmentRepository,
            StaffSkillRepository staffSkillRepository,
            AvailabilityRepository availabilityRepository,
            BlackoutDateRepository blackoutDateRepository,
            StoreConfigurationRepository storeConfigRepo,
            SchedulerConfigurationRepository schedulerConfigRepo,
            StoreRepository storeRepository,
            HeadcountQuotaService headcountQuotaService,
            @Autowired(required = false) SpatialAllocationService spatialAllocationService,
            @Autowired(required = false) com.shiftsync.leave.repository.LeaveRequestRepository leaveRequestRepository) {
        this.shiftRepository = shiftRepository;
        this.shiftAssignmentRepository = shiftAssignmentRepository;
        this.employmentRepository = employmentRepository;
        this.staffSkillRepository = staffSkillRepository;
        this.availabilityRepository = availabilityRepository;
        this.blackoutDateRepository = blackoutDateRepository;
        this.storeConfigRepo = storeConfigRepo;
        this.schedulerConfigRepo = schedulerConfigRepo;
        this.storeRepository = storeRepository;
        this.headcountQuotaService = headcountQuotaService;
        this.spatialAllocationService = spatialAllocationService;
        this.leaveRequestRepository = leaveRequestRepository;
    }

    public AutoScheduleService(
            ShiftRepository shiftRepository,
            ShiftAssignmentRepository shiftAssignmentRepository,
            EmploymentRepository employmentRepository,
            StaffSkillRepository staffSkillRepository,
            AvailabilityRepository availabilityRepository,
            BlackoutDateRepository blackoutDateRepository,
            StoreConfigurationRepository storeConfigRepo,
            SchedulerConfigurationRepository schedulerConfigRepo,
            StoreRepository storeRepository,
            HeadcountQuotaService headcountQuotaService) {
        this(shiftRepository, shiftAssignmentRepository, employmentRepository, staffSkillRepository,
             availabilityRepository, blackoutDateRepository, storeConfigRepo, schedulerConfigRepo, storeRepository, headcountQuotaService, null, null);
    }

    public AutoScheduleService(
            ShiftRepository shiftRepository,
            ShiftAssignmentRepository shiftAssignmentRepository,
            EmploymentRepository employmentRepository,
            StaffSkillRepository staffSkillRepository,
            AvailabilityRepository availabilityRepository,
            BlackoutDateRepository blackoutDateRepository,
            StoreConfigurationRepository storeConfigRepo,
            SchedulerConfigurationRepository schedulerConfigRepo,
            StoreRepository storeRepository,
            HeadcountQuotaService headcountQuotaService,
            SpatialAllocationService spatialAllocationService) {
        this(shiftRepository, shiftAssignmentRepository, employmentRepository, staffSkillRepository,
             availabilityRepository, blackoutDateRepository, storeConfigRepo, schedulerConfigRepo, storeRepository, headcountQuotaService, spatialAllocationService, null);
    }

    // Overload for benchmark tests
    public AutoScheduleService(
            ShiftRepository shiftRepository,
            ShiftAssignmentRepository shiftAssignmentRepository,
            EmploymentRepository employmentRepository,
            StaffSkillRepository staffSkillRepository,
            AvailabilityRepository availabilityRepository,
            BlackoutDateRepository blackoutDateRepository,
            StoreConfigurationRepository storeConfigRepo,
            SchedulerConfigurationRepository schedulerConfigRepo) {
        this(shiftRepository, shiftAssignmentRepository, employmentRepository, staffSkillRepository,
             availabilityRepository, blackoutDateRepository, storeConfigRepo, schedulerConfigRepo, null, null, null, null);
    }

    // Helper classes for processing
    @lombok.Data
    static class Slot {
        Shift shift;
        UUID skillId;
        com.shiftsync.layout.entity.StoreZone zone;
        com.shiftsync.layout.entity.Workstation workstation;
        int eligibleCandidates = 0;
        
        public Slot(Shift shift, UUID skillId) {
            this(shift, skillId, null, null);
        }

        public Slot(Shift shift, UUID skillId, com.shiftsync.layout.entity.StoreZone zone, com.shiftsync.layout.entity.Workstation workstation) {
            this.shift = shift;
            this.skillId = skillId;
            this.zone = zone;
            this.workstation = workstation;
        }
    }
    
    @lombok.Data
    static class StaffData {
        Employment employment;
        List<StaffSkill> skills;
        List<Availability> availabilities;
        List<BlackoutDate> blackoutDates;
        Set<LocalDate> approvedLeaveDates;
        List<Shift> currentSchedule; // both existing assignments and newly assigned
        double assignedHours = 0;
        int monthlyShiftCount = 0; // TỔNG SỐ CA TRONG THÁNG (BA Fairness - Lỗi 1)
        double monthlyAssignedHours = 0; // TỔNG GIỜ TRONG THÁNG (Lỗi 5)
        
        int getMaxWeeklyHours() {
            if (employment != null && employment.getContractType() != null && employment.getContractType().getMaxWeeklyHours() != null) {
                return employment.getContractType().getMaxWeeklyHours();
            }
            return 48; // fallback standard
        }

        double getUtilizationRatio() {
            int maxWeekly = getMaxWeeklyHours();
            return maxWeekly > 0 ? assignedHours / maxWeekly : 0.0;
        }
    }

    @Transactional
    public AutoScheduleResult autoSchedule(UUID storeId, AutoScheduleRequest request) {
        long startTime = System.currentTimeMillis(); // Profiling start
        long daysBetween = ChronoUnit.DAYS.between(request.getStartDate(), request.getEndDate());
        if (daysBetween < 0 || daysBetween > 6) {
            throw new BusinessException("Auto-scheduling range cannot exceed 7 days (1 week).", HttpStatus.BAD_REQUEST);
        }

        StoreConfiguration storeConfig = storeConfigRepo.findByStoreId(storeId)
                .orElse(StoreConfiguration.builder().storeId(storeId).build());
        SchedulerConfiguration schedConfig = schedulerConfigRepo.findByStoreId(storeId)
                .orElse(SchedulerConfiguration.builder().storeId(storeId).build());

        // Lỗi 6: Validate tổng trọng số của scheduler configuration = 1.000
        validateSchedulerConfiguration(schedConfig);

        // 1. Fetch DRAFT shifts
        List<Shift> allShifts = shiftRepository.findByStoreIdAndShiftDateBetween(storeId, request.getStartDate(), request.getEndDate());
        List<Shift> draftShifts = allShifts.stream()
                .filter(s -> s.getStatus() == ShiftStatus.DRAFT)
                .collect(Collectors.toList());

        // Validate and clean up any DRAFT shifts outside store operating hours
        if (storeRepository != null && headcountQuotaService != null) {
            Store store = storeRepository.findById(storeId).orElse(null);
            if (store != null) {
                LocalTime openTime = headcountQuotaService.getStoreOpenTime(store);
                LocalTime closeTime = headcountQuotaService.getStoreCloseTime(store);

                List<Shift> outOfBoundsShifts = draftShifts.stream()
                        .filter(s -> (s.getStartTime() != null && s.getStartTime().isBefore(openTime))
                                  || (s.getEndTime() != null && s.getEndTime().isAfter(closeTime)))
                        .collect(Collectors.toList());

                if (!outOfBoundsShifts.isEmpty()) {
                    log.info("AutoSchedule: Cleaning up {} DRAFT shifts outside store hours ({} - {})",
                            outOfBoundsShifts.size(), openTime, closeTime);
                    for (Shift obs : outOfBoundsShifts) {
                        shiftAssignmentRepository.deleteAll(shiftAssignmentRepository.findByShiftId(obs.getId()));
                        shiftRepository.delete(obs);
                    }
                    shiftRepository.flush();
                    draftShifts.removeAll(outOfBoundsShifts);
                }
            }

            // If no draft shifts exist or all were cleaned up, auto-populate from store headcount quotas
            if (draftShifts.isEmpty()) {
                log.info("AutoSchedule: No draft shifts found in operating hours, applying headcount quotas for week...");
                headcountQuotaService.autoFillQuotas(AutoFillQuotaRequest.builder()
                        .branchId(storeId)
                        .scope("WEEK")
                        .weekStart(request.getStartDate())
                        .build());
                draftShifts = shiftRepository.findByStoreIdAndShiftDateBetween(storeId, request.getStartDate(), request.getEndDate())
                        .stream()
                        .filter(s -> s.getStatus() == ShiftStatus.DRAFT)
                        .collect(Collectors.toList());
            }
        }

        if (draftShifts.isEmpty()) {
            return AutoScheduleResult.builder()
                    .storeId(storeId)
                    .startDate(request.getStartDate())
                    .endDate(request.getEndDate())
                    .status(ScheduleCoverageStatus.NO_DEMAND)
                    .message("Không có ca làm việc nào cần xếp lịch trong khoảng thời gian này.")
                    .totalDemandSlots(0)
                    .existingManualAssignments(0)
                    .schedulerDemandSlots(0)
                    .newAssignmentsCreated(0)
                    .totalAssignedSlots(0)
                    .shortageSlots(0)
                    .coverageRate(100.0)
                    .shortages(new ArrayList<>())
                    .requirementCoverages(new ArrayList<>())
                    .feasibility(FeasibilityDiagnosticsDTO.builder()
                            .totalActiveStaff(0)
                            .theoreticalCapacityHours(0)
                            .totalDemandHours(0)
                            .theoreticalCapacitySufficient(true)
                            .unassignedSlotsBeforeRepair(0)
                            .localRepairRescuedCount(0)
                            .finalUnassignedCount(0)
                            .build())
                    .build();
        }

        // Idempotency: Clear previous AUTO assignments on these DRAFT shifts before re-scheduling
        List<UUID> draftShiftIds = draftShifts.stream().map(Shift::getId).collect(Collectors.toList());
        List<ShiftAssignment> existingAutoAssignments = draftShiftIds.stream()
                .flatMap(sid -> shiftAssignmentRepository.findByShiftId(sid).stream())
                .filter(a -> !a.isDeleted() && a.getSource() == AssignmentSource.AUTO)
                .collect(Collectors.toList());
        if (!existingAutoAssignments.isEmpty()) {
            shiftAssignmentRepository.deleteAll(existingAutoAssignments);
            shiftAssignmentRepository.flush();
        }

        // 2. Load Staff Data (Bulk Fetch) - ONLY STAFF can be assigned to shifts (Managers manage the store/shifts, not work them)
        List<Employment> activeEmployments = employmentRepository.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE)
                .stream()
                .filter(emp -> emp.getUser() != null && emp.getUser().getSystemRole() == SystemRole.STAFF)
                .collect(Collectors.toList());
        List<UUID> staffIds = activeEmployments.stream().map(emp -> emp.getUser().getId()).collect(Collectors.toList());
        
        Map<UUID, List<StaffSkill>> skillsMap = staffSkillRepository.findByStaffIdIn(staffIds).stream()
                .collect(Collectors.groupingBy(StaffSkill::getStaffId));
                
        Map<UUID, List<Availability>> availabilityMap = availabilityRepository.findByUser_IdIn(staffIds).stream()
                .collect(Collectors.groupingBy(a -> a.getUser().getId()));
                
        Map<UUID, List<BlackoutDate>> blackoutMap = blackoutDateRepository.findByStaffIdInAndDateBetween(staffIds, request.getStartDate(), request.getEndDate()).stream()
                .collect(Collectors.groupingBy(BlackoutDate::getStaffId));
                
        // Lỗi 2: Mở rộng query để tải thêm khoảng đệm 1 ngày trước và sau (cho HC5)
        // và toàn bộ các tuần ISO chứa cửa sổ xếp ca (cho HC4).
        LocalDate bufferStart = request.getStartDate().minusDays(1);
        LocalDate isoStart = request.getStartDate().with(java.time.DayOfWeek.MONDAY);
        LocalDate extendedStartDate = bufferStart.isBefore(isoStart) ? bufferStart : isoStart;

        LocalDate bufferEnd = request.getEndDate().plusDays(1);
        LocalDate isoEnd = request.getEndDate().with(java.time.DayOfWeek.SUNDAY);
        LocalDate extendedEndDate = bufferEnd.isAfter(isoEnd) ? bufferEnd : isoEnd;

        Map<UUID, List<ShiftAssignment>> assignmentsMap = shiftAssignmentRepository.findByStaffIdInAndShift_ShiftDateBetween(staffIds, extendedStartDate, extendedEndDate).stream()
                .filter(a -> !a.isDeleted())
                .collect(Collectors.groupingBy(a -> a.getStaff().getId()));

        // Lỗi 5: Tính tổng giờ đã làm trong tháng (không phụ thuộc độ dài ca 8h)
        LocalDate monthStart = request.getStartDate().withDayOfMonth(1);
        LocalDate monthEnd = request.getEndDate().withDayOfMonth(request.getEndDate().lengthOfMonth());
        List<ShiftAssignment> monthlyAssignments = shiftAssignmentRepository.findByStaffIdInAndShift_ShiftDateBetween(staffIds, monthStart, monthEnd).stream()
                .filter(a -> !a.isDeleted())
                .collect(Collectors.toList());

        Map<UUID, Long> monthlyShiftCountMap = monthlyAssignments.stream()
                .collect(Collectors.groupingBy(a -> a.getStaff().getId(), Collectors.counting()));

        Map<UUID, Double> monthlyHoursMap = monthlyAssignments.stream()
                .collect(Collectors.groupingBy(
                        a -> a.getStaff().getId(),
                        Collectors.summingDouble(a -> getDurationInHours(a.getShift()))
                ));

        Map<UUID, Set<LocalDate>> leaveMap = new HashMap<>();
        if (leaveRequestRepository != null) {
            leaveRequestRepository.findByStoreIdAndStatus(storeId, com.shiftsync.leave.enums.LeaveStatus.APPROVED)
                    .forEach(lr -> {
                        if (lr.getStaff() != null && lr.getStartDate() != null && lr.getEndDate() != null) {
                            UUID sid = lr.getStaff().getId();
                            leaveMap.computeIfAbsent(sid, k -> new HashSet<>());
                            LocalDate cur = lr.getStartDate();
                            while (!cur.isAfter(lr.getEndDate())) {
                                leaveMap.get(sid).add(cur);
                                cur = cur.plusDays(1);
                            }
                        }
                    });
        }

        Map<UUID, StaffData> staffMap = new HashMap<>();
        
        for (Employment emp : activeEmployments) {
            UUID sid = emp.getUser().getId();
            StaffData data = new StaffData();
            data.setEmployment(emp);
            data.setSkills(skillsMap.getOrDefault(sid, Collections.emptyList()));
            data.setAvailabilities(availabilityMap.getOrDefault(sid, Collections.emptyList()));
            data.setBlackoutDates(blackoutMap.getOrDefault(sid, Collections.emptyList()));
            data.setApprovedLeaveDates(leaveMap.getOrDefault(sid, Collections.emptySet()));
            
            List<ShiftAssignment> existingAssignments = assignmentsMap.getOrDefault(sid, Collections.emptyList());
            
            data.setCurrentSchedule(new ArrayList<>(existingAssignments.stream().map(ShiftAssignment::getShift).collect(Collectors.toList())));
            data.setAssignedHours(calculateTotalHours(data.getCurrentSchedule()));
            data.setMonthlyShiftCount(monthlyShiftCountMap.getOrDefault(sid, 0L).intValue());
            data.setMonthlyAssignedHours(monthlyHoursMap.getOrDefault(sid, 0.0));
            
            staffMap.put(sid, data);
        }

        // 3. Flatten Shifts into Slots & compute baseline demand metrics
        int totalDemandSlots = 0;
        double totalDemandHours = 0.0;
        int existingManualAssignments = 0;

        List<Slot> slots = new ArrayList<>();
        for (Shift shift : draftShifts) {
            double shiftDuration = getDurationInHours(shift);
            if (shift.getRequirements().isEmpty()) {
                totalDemandSlots += 1;
                totalDemandHours += shiftDuration;
            } else {
                for (ShiftSkillRequirement req : shift.getRequirements()) {
                    totalDemandSlots += req.getRequiredCount();
                    totalDemandHours += shiftDuration * req.getRequiredCount();
                }
            }

            List<ShiftAssignment> existingOnShift = Collections.emptyList();
            if (shift.getId() != null) {
                existingOnShift = shiftAssignmentRepository.findByShiftId(shift.getId());
            } else if (shift.getAssignments() != null) {
                existingOnShift = shift.getAssignments();
            }
            if (existingOnShift == null) {
                existingOnShift = Collections.emptyList();
            }
            final List<ShiftAssignment> activeNonAuto = existingOnShift.stream()
                    .filter(a -> !a.isDeleted() && a.getSource() != AssignmentSource.AUTO)
                    .collect(Collectors.toList());
            existingManualAssignments += activeNonAuto.size();

            if (shift.getRequirements().isEmpty()) {
                int remainingDemand = Math.max(0, 1 - activeNonAuto.size());
                for (int i = 0; i < remainingDemand; i++) {
                    slots.add(new Slot(shift, null, null, null));
                }
            } else {
                for (ShiftSkillRequirement req : shift.getRequirements()) {
                    long assignedCount = 0;
                    if (req.getSkill() != null) {
                        UUID targetSkillId = req.getSkill().getId();
                        assignedCount = activeNonAuto.stream()
                                .filter(a -> {
                                    if (targetSkillId.equals(a.getRequiredSkillId())) {
                                        if (req.getZone() != null && a.getZone() != null) {
                                            return req.getZone().getId().equals(a.getZone().getId());
                                        }
                                        return true;
                                    }
                                    if (a.getRequiredSkillId() == null && a.getStaff() != null) {
                                        StaffData sd = staffMap.get(a.getStaff().getId());
                                        if (sd != null && hasValidSkill(sd, targetSkillId, shift.getShiftDate())) {
                                            return true;
                                        }
                                    }
                                    return false;
                                })
                                .count();
                    } else {
                        assignedCount = activeNonAuto.size();
                    }
                    if (assignedCount == 0 && shift.getRequirements().size() == 1) {
                        assignedCount = activeNonAuto.size();
                    }
                    int remainingDemand = Math.max(0, req.getRequiredCount() - (int) assignedCount);
                    for (int i = 0; i < remainingDemand; i++) {
                        slots.add(new Slot(shift, req.getSkill() != null ? req.getSkill().getId() : null, req.getZone(), req.getWorkstation()));
                    }
                }
            }
        }

        // Snapshot trung bình monthlyAssignedHours của TOÀN BỘ staffMap, tính 1 lần duy nhất khi bắt đầu autoSchedule()
        double teamMonthlyAvg = staffMap.values().stream()
                .mapToDouble(StaffData::getMonthlyAssignedHours)
                .average()
                .orElse(0.0);

        // 4, 5, 6. Dynamic MRV Assignment Loop (Lỗi 4: Cập nhật domain size động sau mỗi lần gán ca)
        List<Slot> remainingSlots = new ArrayList<>(slots);
        List<ShiftAssignment> newAssignments = new ArrayList<>();
        // Thu thập các slot không tìm được ứng viên, để thử Local Repair sau vòng lặp chính
        List<Slot> unassignedSlots = new ArrayList<>();

        while (!remainingSlots.isEmpty()) {
            Slot bestSlot = null;
            List<StaffData> bestSlotCandidates = null;
            int minCandidates = Integer.MAX_VALUE;

            for (Slot candidateSlot : remainingSlots) {
                List<StaffData> validCandidates = findValidCandidates(candidateSlot, staffMap.values(), storeConfig.getMinRestHours(), teamMonthlyAvg);
                int count = validCandidates.size();

                boolean isBetter = false;
                if (bestSlot == null) {
                    isBetter = true;
                } else if (count < minCandidates) {
                    isBetter = true;
                } else if (count == minCandidates) {
                    // Tie-breaker 1: Chronological date ASC
                    int dateCmp = candidateSlot.getShift().getShiftDate().compareTo(bestSlot.getShift().getShiftDate());
                    if (dateCmp < 0) {
                        isBetter = true;
                    } else if (dateCmp == 0) {
                        // Tie-breaker 2: Start time ASC
                        int timeCmp = candidateSlot.getShift().getStartTime().compareTo(bestSlot.getShift().getStartTime());
                        if (timeCmp < 0) {
                            isBetter = true;
                        } else if (timeCmp == 0) {
                            // Tie-breaker 3: Deterministic UUID comparison
                            String idA = candidateSlot.getShift().getId() != null ? candidateSlot.getShift().getId().toString() : "";
                            String idB = bestSlot.getShift().getId() != null ? bestSlot.getShift().getId().toString() : "";
                            if (idA.compareTo(idB) < 0) {
                                isBetter = true;
                            }
                        }
                    }
                }

                if (isBetter) {
                    bestSlot = candidateSlot;
                    bestSlotCandidates = validCandidates;
                    minCandidates = count;
                }
            }

            remainingSlots.remove(bestSlot);

            if (bestSlotCandidates == null || bestSlotCandidates.isEmpty()) {
                log.warn("AutoSchedule: Could not find any valid candidate for Shift {} (Skill {}). Thêm vào danh sách chờ Local Repair.",
                        bestSlot.getShift().getId(), bestSlot.getSkillId());
                unassignedSlots.add(bestSlot);
                continue;
            }

            // 7. Calculate Weighted Score
            Slot finalSlot = bestSlot;
            StaffData bestEmp = bestSlotCandidates.stream()
                    .max(Comparator.comparingDouble((StaffData empData) -> calculateScore(empData, finalSlot, schedConfig, storeConfig.getMinRestHours()))
                            // Tie-break 1: Ưu tiên nhân viên có utilizationRatio (assignedHours / maxWeeklyHours) thấp hơn.
                            // Lý do dùng utilizationRatio thay vì assignedHours: Tránh thiên vị nhân viên Part-Time (24h) so với Full-Time (48h).
                            // Nếu dùng raw hours, nhân viên PT làm 8h (33.3% hợp đồng) luôn được ưu tiên hơn nhân viên FT làm 16h (33.3% hợp đồng),
                            // khiến PT bị dồn ca tới ~60% còn FT bị ép xuống ~36.6%. Dùng utilizationRatio đảm bảo công bằng tương đối theo dung lượng hợp đồng.
                            .thenComparing(Comparator.comparingDouble(StaffData::getUtilizationRatio).reversed())
                            // Tie-break 2: Hash động kết hợp shiftId + userId để không bao giờ thiên vị cố định một nhân viên giữa các slot
                            .thenComparing(empData -> (long) java.util.Objects.hash(finalSlot.getShift().getId(), empData.getEmployment().getUser().getId()))
                            // Tie-break 3: Fallback định danh tuyệt đối bằng userId để đảm bảo tính tất định 100%
                            .thenComparing(empData -> empData.getEmployment().getUser().getId()))
                    .orElse(bestSlotCandidates.get(0));

            // 8. Make Assignment
            ShiftAssignment assignment = ShiftAssignment.builder()
                    .shift(bestSlot.getShift())
                    .staff(bestEmp.getEmployment().getUser())
                    .requiredSkillId(bestSlot.getSkillId())
                    .zone(bestSlot.getZone())
                    .workstation(bestSlot.getWorkstation())
                    .source(AssignmentSource.AUTO)
                    .build();
            
            double slotDuration = getDurationInHours(bestSlot.getShift());
            newAssignments.add(assignment);
            bestEmp.getCurrentSchedule().add(bestSlot.getShift());
            bestEmp.setAssignedHours(bestEmp.getAssignedHours() + slotDuration);

            // Lỗi 1: Cập nhật monthlyShiftCount (+1) ngay sau khi gán
            bestEmp.setMonthlyShiftCount(bestEmp.getMonthlyShiftCount() + 1);

            // Lỗi 5: Cập nhật tổng giờ đã làm trong tháng (+ slotDuration)
            bestEmp.setMonthlyAssignedHours(bestEmp.getMonthlyAssignedHours() + slotDuration);
        }

        // Bước Local Repair: thử hoán đổi để giải cứu các slot chưa được gán
        int unassignedSlotsBeforeRepair = unassignedSlots.size();
        List<Slot> stillUnassigned = Collections.emptyList();
        if (!unassignedSlots.isEmpty()) {
            log.info("AutoSchedule: {} slot(s) chưa được gán sau vòng lặp MRV chính. Khởi động Local Repair...", unassignedSlots.size());
            stillUnassigned = attemptLocalRepair(unassignedSlots, newAssignments, staffMap, schedConfig, storeConfig);
        }
        int localRepairRescuedCount = unassignedSlotsBeforeRepair - stillUnassigned.size();
        int finalUnassignedCount = stillUnassigned.size();

        if (!newAssignments.isEmpty()) {
            shiftAssignmentRepository.saveAll(newAssignments);
            shiftAssignmentRepository.flush();

            // Auto-trigger 3D Spatial Allocation for the scheduled shifts
            if (spatialAllocationService != null) {
                Set<UUID> assignedShiftIds = newAssignments.stream()
                        .map(a -> a.getShift().getId())
                        .collect(Collectors.toSet());
                for (UUID sid : assignedShiftIds) {
                    try {
                        spatialAllocationService.allocateZonesForShift(storeId, sid);
                    } catch (Exception e) {
                        log.debug("Spatial allocation skipped for shift {}: {}", sid, e.getMessage());
                    }
                }
            }
        }

        // Feasibility Diagnostics
        int totalActiveStaff = activeEmployments.size();
        double theoreticalCapacityHours = staffMap.values().stream()
                .mapToDouble(StaffData::getMaxWeeklyHours)
                .sum();
        boolean theoreticalCapacitySufficient = theoreticalCapacityHours >= totalDemandHours;

        FeasibilityDiagnosticsDTO feasibility = FeasibilityDiagnosticsDTO.builder()
                .totalActiveStaff(totalActiveStaff)
                .theoreticalCapacityHours(theoreticalCapacityHours)
                .totalDemandHours(totalDemandHours)
                .theoreticalCapacitySufficient(theoreticalCapacitySufficient)
                .unassignedSlotsBeforeRepair(unassignedSlotsBeforeRepair)
                .localRepairRescuedCount(localRepairRescuedCount)
                .finalUnassignedCount(finalUnassignedCount)
                .build();

        // 9. Detailed Shortage and Requirement Coverage Analysis
        List<RequirementCoverageDTO> requirementCoverages = new ArrayList<>();
        List<ShortageDetailDTO> shortages = new ArrayList<>();

        for (Shift shift : draftShifts) {
            // Collect all active assignments on this shift (existing manual + newly created auto)
            List<ShiftAssignment> activeAssignmentsOnShift = new ArrayList<>();
            List<ShiftAssignment> existingOnShift = shift.getId() != null
                    ? shiftAssignmentRepository.findByShiftId(shift.getId())
                    : (shift.getAssignments() != null ? shift.getAssignments() : Collections.emptyList());
            if (existingOnShift != null) {
                activeAssignmentsOnShift.addAll(existingOnShift.stream()
                        .filter(a -> !a.isDeleted() && a.getSource() != AssignmentSource.AUTO)
                        .collect(Collectors.toList()));
            }
            for (ShiftAssignment na : newAssignments) {
                if (na.getShift() == shift || (na.getShift().getId() != null && na.getShift().getId().equals(shift.getId()))) {
                    activeAssignmentsOnShift.add(na);
                }
            }

            if (shift.getRequirements() == null || shift.getRequirements().isEmpty()) {
                int reqCount = 1;
                int assignedCount = Math.min(reqCount, activeAssignmentsOnShift.size());
                int shortageCount = Math.max(0, reqCount - assignedCount);
                double covRate = reqCount > 0 ? (assignedCount * 100.0 / reqCount) : 100.0;
                covRate = Math.round(covRate * 10.0) / 10.0;

                RequirementCoverageDTO reqCov = RequirementCoverageDTO.builder()
                        .requirementId(null)
                        .shiftId(shift.getId())
                        .shiftDate(shift.getShiftDate())
                        .startTime(shift.getStartTime())
                        .endTime(shift.getEndTime())
                        .skillId(null)
                        .skillName(null)
                        .zoneId(null)
                        .zoneName(null)
                        .workstationId(null)
                        .workstationName(null)
                        .requiredCount(reqCount)
                        .assignedCount(assignedCount)
                        .shortageCount(shortageCount)
                        .coverageRate(covRate)
                        .fullyCovered(shortageCount == 0)
                        .build();
                requirementCoverages.add(reqCov);

                if (shortageCount > 0) {
                    ShortageDiagnosis diag = diagnoseShortage(shift, null, staffMap, storeConfig.getMinRestHours());
                    shortages.add(ShortageDetailDTO.builder()
                            .storeId(storeId)
                            .shiftId(shift.getId())
                            .shiftDate(shift.getShiftDate())
                            .startTime(shift.getStartTime())
                            .endTime(shift.getEndTime())
                            .skillId(null)
                            .skillName(null)
                            .zoneId(null)
                            .zoneName(null)
                            .workstationId(null)
                            .workstationName(null)
                            .requiredCount(reqCount)
                            .assignedCount(assignedCount)
                            .shortageCount(shortageCount)
                            .primaryReason(diag.primaryReason)
                            .diagnosticDetails(diag.diagnosticDetails)
                            .build());
                }
            } else {
                List<ShiftAssignment> availableAssignments = new ArrayList<>(activeAssignmentsOnShift);
                for (ShiftSkillRequirement req : shift.getRequirements()) {
                    UUID targetSkillId = req.getSkill() != null ? req.getSkill().getId() : null;
                    String targetSkillName = req.getSkill() != null ? req.getSkill().getName() : null;
                    UUID targetZoneId = req.getZone() != null ? req.getZone().getId() : null;
                    String targetZoneName = req.getZone() != null ? req.getZone().getName() : null;
                    UUID targetWorkstationId = req.getWorkstation() != null ? req.getWorkstation().getId() : null;
                    String targetWorkstationName = req.getWorkstation() != null ? req.getWorkstation().getName() : null;

                    List<ShiftAssignment> matched = new ArrayList<>();
                    for (ShiftAssignment a : availableAssignments) {
                        if (matched.size() >= req.getRequiredCount()) {
                            break;
                        }
                        boolean skillMatches = false;
                        if (targetSkillId != null) {
                            if (targetSkillId.equals(a.getRequiredSkillId())) {
                                skillMatches = true;
                            } else if (a.getRequiredSkillId() == null && a.getStaff() != null) {
                                StaffData sd = staffMap.get(a.getStaff().getId());
                                if (sd != null && hasValidSkill(sd, targetSkillId, shift.getShiftDate())) {
                                    skillMatches = true;
                                }
                            }
                        } else {
                            skillMatches = true;
                        }

                        if (skillMatches) {
                            if (targetZoneId != null) {
                                if (a.getZone() != null && targetZoneId.equals(a.getZone().getId())) {
                                    matched.add(a);
                                }
                            } else {
                                matched.add(a);
                            }
                        }
                    }
                    availableAssignments.removeAll(matched);

                    int assignedCount = matched.size();
                    int shortageCount = Math.max(0, req.getRequiredCount() - assignedCount);
                    double covRate = req.getRequiredCount() > 0 ? (assignedCount * 100.0 / req.getRequiredCount()) : 100.0;
                    covRate = Math.round(covRate * 10.0) / 10.0;

                    RequirementCoverageDTO reqCov = RequirementCoverageDTO.builder()
                            .requirementId(req.getId())
                            .shiftId(shift.getId())
                            .shiftDate(shift.getShiftDate())
                            .startTime(shift.getStartTime())
                            .endTime(shift.getEndTime())
                            .skillId(targetSkillId)
                            .skillName(targetSkillName)
                            .zoneId(targetZoneId)
                            .zoneName(targetZoneName)
                            .workstationId(targetWorkstationId)
                            .workstationName(targetWorkstationName)
                            .requiredCount(req.getRequiredCount())
                            .assignedCount(assignedCount)
                            .shortageCount(shortageCount)
                            .coverageRate(covRate)
                            .fullyCovered(shortageCount == 0)
                            .build();
                    requirementCoverages.add(reqCov);

                    if (shortageCount > 0) {
                        ShortageDiagnosis diag = diagnoseShortage(shift, targetSkillId, staffMap, storeConfig.getMinRestHours());
                        shortages.add(ShortageDetailDTO.builder()
                                .storeId(storeId)
                                .shiftId(shift.getId())
                                .shiftDate(shift.getShiftDate())
                                .startTime(shift.getStartTime())
                                .endTime(shift.getEndTime())
                                .skillId(targetSkillId)
                                .skillName(targetSkillName)
                                .zoneId(targetZoneId)
                                .zoneName(targetZoneName)
                                .workstationId(targetWorkstationId)
                                .workstationName(targetWorkstationName)
                                .requiredCount(req.getRequiredCount())
                                .assignedCount(assignedCount)
                                .shortageCount(shortageCount)
                                .primaryReason(diag.primaryReason)
                                .diagnosticDetails(diag.diagnosticDetails)
                                .build());
                    }
                }
            }
        }

        int newAssignmentsCreated = newAssignments.size();
        int totalAssignedSlots = existingManualAssignments + newAssignmentsCreated;
        int shortageSlots = Math.max(0, totalDemandSlots - totalAssignedSlots);
        double overallCoverageRate = totalDemandSlots > 0 ? (totalAssignedSlots * 100.0 / totalDemandSlots) : 100.0;
        overallCoverageRate = Math.round(overallCoverageRate * 10.0) / 10.0;
        overallCoverageRate = Math.min(100.0, overallCoverageRate);

        ScheduleCoverageStatus status;
        String message;

        if (totalDemandSlots == 0) {
            status = ScheduleCoverageStatus.NO_DEMAND;
            message = "Không có ca làm việc nào cần xếp lịch trong khoảng thời gian này.";
        } else if (shortageSlots == 0 && totalAssignedSlots >= totalDemandSlots) {
            status = ScheduleCoverageStatus.FULLY_COVERED;
            message = "Xếp ca tự động hoàn tất 100%! Toàn bộ " + totalDemandSlots + " vị trí yêu cầu đã được đáp ứng đầy đủ.";
        } else if (totalAssignedSlots == 0) {
            status = ScheduleCoverageStatus.ZERO_COVERAGE;
            message = "Không thể phân công ca nào (độ phủ 0%). Thiếu toàn bộ " + shortageSlots + "/" + totalDemandSlots + " vị trí do thiếu nhân sự hoặc vi phạm ràng buộc.";
        } else {
            status = ScheduleCoverageStatus.PARTIALLY_COVERED;
            message = "Xếp ca tự động hoàn tất " + overallCoverageRate + "%. Đã phân công " + totalAssignedSlots + "/" + totalDemandSlots + " vị trí (thiếu " + shortageSlots + " vị trí cần bổ sung).";
        }

        long endTime = System.currentTimeMillis(); // Profiling end
        log.info("autoSchedule completed in {} ms with status {}: {}/{} assigned (shortage: {}) across {} employees.",
                (endTime - startTime), status, totalAssignedSlots, totalDemandSlots, shortageSlots, activeEmployments.size());

        return AutoScheduleResult.builder()
                .storeId(storeId)
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .status(status)
                .message(message)
                .totalDemandSlots(totalDemandSlots)
                .existingManualAssignments(existingManualAssignments)
                .schedulerDemandSlots(slots.size())
                .newAssignmentsCreated(newAssignmentsCreated)
                .totalAssignedSlots(totalAssignedSlots)
                .shortageSlots(shortageSlots)
                .coverageRate(overallCoverageRate)
                .shortages(shortages)
                .requirementCoverages(requirementCoverages)
                .feasibility(feasibility)
                .build();
    }

    /**
     * Bước Local Repair (thu nhỏ từ Large Neighborhood Search - LNS): Sau khi vòng lặp Dynamic MRV
     * kết thúc mà vẫn còn slot chưa được gán, phương thức này thử <b>hoán đổi đơn</b> (single-swap)
     * để giải cứu các slot đó mà <b>không vi phạm bất kỳ Hard Constraint nào</b> ở cả hai phía.
     *
     * <p><b>Thuật toán:</b>
     * <ol>
     *   <li>Thoát sớm nếu {@code unassignedSlots} rỗng.</li>
     *   <li>Với mỗi {@code unassignedSlot} (slot chưa gán, gọi là <i>s_u</i>):</li>
     *   <li>Lặp qua tối đa {@value #MAX_REPAIR_ATTEMPTS_PER_SLOT} assignment đã tồn tại trong
     *       {@code currentAssignments} (staff X đang làm ca <i>s_other</i>):</li>
     *   <li>  (a) Tạm thời <b>xóa</b> {@code s_other} khỏi lịch in-memory của staffX.</li>
     *   <li>  (b) Kiểm tra staffX có qua được HC1-HC5 cho {@code s_u} không.</li>
     *   <li>  (c) Nếu có → tìm staffY (≠ staffX) trong staffMap qua được HC1-HC5 cho {@code s_other}.</li>
     *   <li>  (d) Nếu tìm được staffY → thực hiện hoán đổi, cập nhật in-memory và {@code currentAssignments},
     *       ghi log INFO, thoát vòng lặp nội bộ.</li>
     *   <li>  Ngược lại → <b>khôi phục</b> lịch của staffX, thử assignment tiếp theo.</li>
     *   <li>Nếu không tìm được hoán đổi hợp lệ cho {@code s_u} → ghi log WARN (giữ nguyên hành vi cũ).</li>
     * </ol>
     *
     * <p><b>Độ phức tạp worst-case:</b>
     * O(|unassignedSlots| × {@value #MAX_REPAIR_ATTEMPTS_PER_SLOT} × |staffMap|)
     *
     * <p><b>Lưu ý:</b> Chỉ thực hiện single-swap. Không triển khai swap chuỗi nhiều bước (multi-hop chain).
     *
     * @param unassignedSlots     danh sách slot chưa được gán sau vòng MRV chính
     * @param currentAssignments  danh sách {@link ShiftAssignment} đã tạo trong phiên hiện tại (mutable)
     * @param staffMap            map từ staffId → {@link StaffData} (in-memory, mutable)
     * @param schedConfig         cấu hình trọng số scoring
     * @param storeConfig         cấu hình cửa hàng (chứa minRestHours)
     */
    List<Slot> attemptLocalRepair(List<Slot> unassignedSlots,
                                  List<ShiftAssignment> currentAssignments,
                                  Map<UUID, StaffData> staffMap,
                                  SchedulerConfiguration schedConfig,
                                  StoreConfiguration storeConfig) {
        // Thoát sớm nếu không có slot nào cần repair
        if (unassignedSlots == null || unassignedSlots.isEmpty()) {
            return Collections.emptyList();
        }

        List<Slot> stillUnassigned = new ArrayList<>();
        int minRestHours = storeConfig.getMinRestHours();

        for (Slot unassignedSlot : unassignedSlots) {
            boolean repaired = false;
            int attempts = 0;

            // Tie-break Local Repair: Ưu tiên chọn staffX có tỷ lệ sử dụng hợp đồng (utilizationRatio) cao nhất
            // để nhượng lại ca khác (otherShift), giúp san sẻ tải công bằng cho nhân viên đang có tỷ lệ tải cao
            List<ShiftAssignment> candidateAssignments = new ArrayList<>(currentAssignments);
            candidateAssignments.sort(Comparator.comparingDouble((ShiftAssignment a) -> {
                StaffData sd = staffMap.get(a.getStaff().getId());
                return sd != null ? sd.getUtilizationRatio() : 0.0;
            }).reversed());

            for (ShiftAssignment existingAssignment : candidateAssignments) {
                if (attempts >= MAX_REPAIR_ATTEMPTS_PER_SLOT) break;
                attempts++;

                // staffX: nhân viên đang làm ca otherSlot trong currentAssignments
                UUID staffXId = existingAssignment.getStaff().getId();
                StaffData staffX = staffMap.get(staffXId);
                if (staffX == null) continue;

                Shift otherShift = existingAssignment.getShift();
                double otherDuration = getDurationInHours(otherShift);

                // (a) Tạm thời xóa otherShift khỏi lịch của staffX để kiểm tra HC
                for (Iterator<Shift> it = staffX.getCurrentSchedule().iterator(); it.hasNext(); ) {
                    Shift s = it.next();
                    if ((s.getId() != null && s.getId().equals(otherShift.getId())) || s == otherShift) {
                        it.remove();
                        break;
                    }
                }

                // (b) Kiểm tra staffX có thỏa mãn HC1-HC5 cho unassignedSlot sau khi bỏ otherShift không
                boolean staffXCanTakeUnassigned = hasValidSkill(staffX, unassignedSlot.getSkillId(), unassignedSlot.getShift().getShiftDate())
                        && !isUnavailable(staffX, unassignedSlot.getShift())
                        && !hasOverlap(staffX.getCurrentSchedule(), unassignedSlot.getShift())
                        && (getWeeklyHours(staffX, unassignedSlot.getShift().getShiftDate()) + getDurationInHours(unassignedSlot.getShift()) <= staffX.getMaxWeeklyHours())
                        && satisfiesRestTime(staffX.getCurrentSchedule(), unassignedSlot.getShift(), minRestHours);

                if (!staffXCanTakeUnassigned) {
                    // Khôi phục lịch của staffX, thử assignment tiếp theo
                    staffX.getCurrentSchedule().add(otherShift);
                    continue;
                }

                // (c) Tìm staffY (≠ staffX) thỏa mãn HC1-HC5 cho otherShift — ưu tiên người có ít giờ tháng nhất (fairness)
                List<StaffData> staffYCandidates = new ArrayList<>();
                for (StaffData candidate : staffMap.values()) {
                    UUID candidateId = candidate.getEmployment().getUser().getId();
                    if (candidateId.equals(staffXId)) continue;

                    boolean candidateCanTakeOther = hasValidSkill(candidate, existingAssignment.getRequiredSkillId(), otherShift.getShiftDate())
                            && !isUnavailable(candidate, otherShift)
                            && !hasOverlap(candidate.getCurrentSchedule(), otherShift)
                            && (getWeeklyHours(candidate, otherShift.getShiftDate()) + otherDuration <= candidate.getMaxWeeklyHours())
                            && satisfiesRestTime(candidate.getCurrentSchedule(), otherShift, minRestHours);
                    if (candidateCanTakeOther) {
                        staffYCandidates.add(candidate);
                    }
                }

                StaffData staffY = staffYCandidates.stream()
                        .min(Comparator.comparingDouble(StaffData::getMonthlyAssignedHours)
                                .thenComparing(StaffData::getUtilizationRatio)
                                .thenComparing(c -> c.getEmployment().getUser().getId()))
                        .orElse(null);

                if (staffY == null) {
                    // Không tìm được staffY, khôi phục lịch staffX
                    staffX.getCurrentSchedule().add(otherShift);
                    continue;
                }

                // (d) Thực hiện hoán đổi: staffX nhận unassignedSlot, staffY nhận otherShift
                double unassignedDuration = getDurationInHours(unassignedSlot.getShift());

                // Cập nhật staffX: thêm unassignedSlot, bớt otherShift (đã bị xóa ở bước a)
                staffX.getCurrentSchedule().add(unassignedSlot.getShift());
                staffX.setAssignedHours(staffX.getAssignedHours() - otherDuration + unassignedDuration);
                staffX.setMonthlyShiftCount(staffX.getMonthlyShiftCount()); // ca count không đổi (swap 1-1)
                staffX.setMonthlyAssignedHours(staffX.getMonthlyAssignedHours() - otherDuration + unassignedDuration);

                // Cập nhật staffY: thêm otherShift
                staffY.getCurrentSchedule().add(otherShift);
                staffY.setAssignedHours(staffY.getAssignedHours() + otherDuration);
                staffY.setMonthlyShiftCount(staffY.getMonthlyShiftCount() + 1);
                staffY.setMonthlyAssignedHours(staffY.getMonthlyAssignedHours() + otherDuration);

                // Lưu lại requiredSkillId, zone, workstation của otherShift trước khi cập nhật existingAssignment
                UUID otherSkillId = existingAssignment.getRequiredSkillId();
                StoreZone otherZone = existingAssignment.getZone();
                Workstation otherWorkstation = existingAssignment.getWorkstation();

                // Cập nhật currentAssignments: đổi existingAssignment từ staffX→otherShift thành staffX→unassignedSlot
                existingAssignment.setShift(unassignedSlot.getShift());
                existingAssignment.setRequiredSkillId(unassignedSlot.getSkillId());
                existingAssignment.setZone(unassignedSlot.getZone());
                existingAssignment.setWorkstation(unassignedSlot.getWorkstation());

                // Thêm assignment mới: staffY → otherShift (kế thừa requiredSkillId gốc của otherShift)
                ShiftAssignment backfillAssignment = ShiftAssignment.builder()
                        .shift(otherShift)
                        .staff(staffY.getEmployment().getUser())
                        .requiredSkillId(otherSkillId)
                        .zone(otherZone)
                        .workstation(otherWorkstation)
                        .source(AssignmentSource.AUTO)
                        .build();
                currentAssignments.add(backfillAssignment);

                log.info("Local repair: swapped {} from shift {} to {}, backfilled with {}",
                        staffXId, otherShift.getId(), unassignedSlot.getShift().getId(),
                        staffY.getEmployment().getUser().getId());

                repaired = true;
                break;
            }

            if (!repaired) {
                log.warn("AutoSchedule Local Repair: Không thể tìm hoán đổi hợp lệ cho Shift {} (Skill {}). Slot sẽ không được gán.",
                        unassignedSlot.getShift().getId(), unassignedSlot.getSkillId());
                stillUnassigned.add(unassignedSlot);
            }
        }
        return stillUnassigned;
    }

    private static class ShortageDiagnosis {
        final String primaryReason;
        final String diagnosticDetails;

        ShortageDiagnosis(String primaryReason, String diagnosticDetails) {
            this.primaryReason = primaryReason;
            this.diagnosticDetails = diagnosticDetails;
        }
    }

    ShortageDiagnosis diagnoseShortage(Shift shift, UUID targetSkillId, Map<UUID, StaffData> staffMap, int minRestHours) {
        if (staffMap == null || staffMap.isEmpty()) {
            return new ShortageDiagnosis("NO_QUALIFIED_STAFF", "Cửa hàng hiện chưa có nhân sự đang hoạt động nào.");
        }

        List<StaffData> qualifiedStaff;
        if (targetSkillId != null) {
            qualifiedStaff = staffMap.values().stream()
                    .filter(sd -> hasValidSkill(sd, targetSkillId, shift.getShiftDate()))
                    .collect(Collectors.toList());
        } else {
            qualifiedStaff = new ArrayList<>(staffMap.values());
        }

        if (qualifiedStaff.isEmpty()) {
            return new ShortageDiagnosis("NO_QUALIFIED_STAFF", "Không có nhân sự đang hoạt động nào sở hữu kỹ năng yêu cầu còn hiệu lực.");
        }

        int unavailableCount = 0;
        int overlapCount = 0;
        int maxHoursCount = 0;
        int restTimeCount = 0;

        double shiftDuration = getDurationInHours(shift);

        for (StaffData sd : qualifiedStaff) {
            if (isUnavailable(sd, shift)) {
                unavailableCount++;
            }
            if (hasOverlap(sd.getCurrentSchedule(), shift)) {
                overlapCount++;
            }
            if (getWeeklyHours(sd, shift.getShiftDate()) + shiftDuration > sd.getMaxWeeklyHours()) {
                maxHoursCount++;
            }
            if (!satisfiesRestTime(sd.getCurrentSchedule(), shift, minRestHours)) {
                restTimeCount++;
            }
        }

        String details = String.format("Có %d nhân sự đạt kỹ năng nhưng không thể phân công: %d bận/vắng, %d trùng ca, %d chạm trần giờ tuần, %d vi phạm giờ nghỉ giữa 2 ca.",
                qualifiedStaff.size(), unavailableCount, overlapCount, maxHoursCount, restTimeCount);

        return new ShortageDiagnosis("CONSTRAINTS_VIOLATED", details);
    }

    private boolean hasValidSkill(StaffData empData, UUID skillId, LocalDate shiftDate) {
        if (skillId == null) return true;
        return empData.getSkills().stream()
                .anyMatch(s -> s.getSkillId().equals(skillId) && 
                              (s.getExpirationDate() == null || !s.getExpirationDate().isBefore(shiftDate)));
    }

    private boolean isUnavailable(StaffData empData, Shift shift) {
        // Check Blackout Dates
        boolean isBlackout = empData.getBlackoutDates().stream()
                .anyMatch(b -> b.getDate().equals(shift.getShiftDate()));
        if (isBlackout) return true;

        // Check Approved Leaves
        if (empData.getApprovedLeaveDates() != null && empData.getApprovedLeaveDates().contains(shift.getShiftDate())) {
            return true;
        }
        
        // Availability Check: Staff MUST have an availability slot covering the shift
        short shiftDayOfWeek = (short) (shift.getShiftDate().getDayOfWeek().getValue() % 7);
        
        boolean isCovered = empData.getAvailabilities().stream()
                .anyMatch(a -> {
                    if (a.getDayOfWeek() == null || a.getDayOfWeek() != shiftDayOfWeek) return false;
                    // Allow up to 30 minutes tolerance at shift start/end to match store shifts flexibly
                    LocalTime availStart = a.getStartTime();
                    LocalTime availEnd = a.getEndTime();
                    LocalTime effStart = availStart.isAfter(LocalTime.of(0, 30)) ? availStart.minusMinutes(30) : LocalTime.MIN;
                    LocalTime effEnd = availEnd.isBefore(LocalTime.of(23, 30)) ? availEnd.plusMinutes(30) : LocalTime.MAX;
                    
                    return !effStart.isAfter(shift.getStartTime()) && !effEnd.isBefore(shift.getEndTime());
                });
        
        return !isCovered;
    }

    // Lỗi 6: Validate tổng trọng số scoring = 1.000 (cho phép sai số float 0.001)
    private void validateSchedulerConfiguration(SchedulerConfiguration config) {
        if (config == null) return;
        if ((config.getFairnessWeight() != null && config.getFairnessWeight().compareTo(java.math.BigDecimal.ZERO) < 0) ||
            (config.getSkillWeight() != null && config.getSkillWeight().compareTo(java.math.BigDecimal.ZERO) < 0) ||
            (config.getHourWeight() != null && config.getHourWeight().compareTo(java.math.BigDecimal.ZERO) < 0) ||
            (config.getRestTimeWeight() != null && config.getRestTimeWeight().compareTo(java.math.BigDecimal.ZERO) < 0) ||
            (config.getAvailabilityWeight() != null && config.getAvailabilityWeight().compareTo(java.math.BigDecimal.ZERO) < 0)) {
            throw new BusinessException("Scheduler weights cannot be negative", HttpStatus.BAD_REQUEST);
        }
        java.math.BigDecimal sum = (config.getFairnessWeight() != null ? config.getFairnessWeight() : java.math.BigDecimal.ZERO)
                .add(config.getSkillWeight() != null ? config.getSkillWeight() : java.math.BigDecimal.ZERO)
                .add(config.getHourWeight() != null ? config.getHourWeight() : java.math.BigDecimal.ZERO)
                .add(config.getRestTimeWeight() != null ? config.getRestTimeWeight() : java.math.BigDecimal.ZERO)
                .add(config.getAvailabilityWeight() != null ? config.getAvailabilityWeight() : java.math.BigDecimal.ZERO);
        if (sum.subtract(java.math.BigDecimal.ONE).abs().compareTo(new java.math.BigDecimal("0.001")) > 0) {
            throw new BusinessException("Total scheduler weights must equal 1.000 (found: " + sum + ")", HttpStatus.BAD_REQUEST);
        }
    }

    // Lỗi 3: Helper chuyển đổi thời gian ca sang LocalDateTime, xử lý ca qua đêm (qua 00:00)
    private LocalDateTime getStartDateTime(Shift shift) {
        return LocalDateTime.of(shift.getShiftDate(), shift.getStartTime());
    }

    private LocalDateTime getEndDateTime(Shift shift) {
        LocalDateTime start = getStartDateTime(shift);
        LocalDateTime end = LocalDateTime.of(shift.getShiftDate(), shift.getEndTime());
        if (end.isBefore(start)) {
            end = end.plusDays(1);
        }
        return end;
    }

    // Lỗi 2: Tính tổng giờ đã làm trong tuần ISO chứa shiftDate (Thứ 2 đến Chủ nhật)
    double getWeeklyHours(StaffData empData, LocalDate shiftDate) {
        LocalDate weekStart = shiftDate.with(java.time.DayOfWeek.MONDAY);
        LocalDate weekEnd = shiftDate.with(java.time.DayOfWeek.SUNDAY);

        return empData.getCurrentSchedule().stream()
                .filter(s -> !s.getShiftDate().isBefore(weekStart) && !s.getShiftDate().isAfter(weekEnd))
                .mapToDouble(this::getDurationInHours)
                .sum();
    }

    // Lỗi 4: Tìm danh sách ứng viên thỏa mãn 5 Hard Constraints cho một slot (hỗ trợ backward compatibility)
    List<StaffData> findValidCandidates(Slot slot, Collection<StaffData> staffList, int minRestHours) {
        double teamAvg = staffList.stream()
                .mapToDouble(StaffData::getMonthlyAssignedHours)
                .average()
                .orElse(0.0);
        return findValidCandidates(slot, staffList, minRestHours, teamAvg);
    }

    /**
     * Tìm danh sách ứng viên thỏa mãn 5 Hard Constraints (HC1-HC5) cho một slot ca làm việc,
     * đồng thời áp dụng cơ chế Soft Fairness Cap dựa trên snapshot trung bình giờ tháng toàn đội.
     *
     * <p><b>Cơ chế Soft Fairness Cap (Snapshot vs Dynamic):</b>
     * <ul>
     *   <li><b>Trước đây (Cap động theo slot):</b> Tính {@code teamAvg} động trên tập ứng viên hợp lệ của từng slot.
     *       Thực nghiệm benchmark ({@code ScheduleComparisonBenchmark#testContractUtilization10And50Staff})
     *       phát hiện cách tính động này gây hiện tượng <i>phân mảnh cơ hội (opportunity fragmentation)</i>:
     *       ngưỡng cap dao động thất thường giữa các slot, vô tình loại bỏ ứng viên phù hợp và làm tăng
     *       độ lệch chuẩn utilization ratio bất thường (tăng từ 13.6% lên 15.3%).</li>
     *   <li><b>Hiện tại (Snapshot toàn đội):</b> Giá trị {@code teamMonthlyAvg} được tính duy nhất 1 lần
     *       ở đầu chu trình {@link #autoSchedule} trên toàn bộ nhân sự ({@code staffMap.values()}) và truyền vào.
     *       Ngưỡng trần {@code 1.3 * teamMonthlyAvg} giữ tính ổn định toàn cục xuyên suốt quá trình lập lịch,
     *       chỉ kích hoạt khi có &gt; 1 ứng viên hợp lệ và {@code teamMonthlyAvg > 0} để tuyệt đối không làm bỏ trống ca.</li>
     * </ul>
     *
     * @param slot            slot ca làm việc cần tìm ứng viên
     * @param staffList       danh sách nhân viên cần đánh giá
     * @param minRestHours    thời gian nghỉ tối thiểu giữa 2 ca (HC5)
     * @param teamMonthlyAvg  snapshot trung bình giờ làm trong tháng của toàn bộ nhân viên tại thời điểm bắt đầu
     * @return danh sách ứng viên thỏa mãn HC1-HC5 và Soft Fairness Cap
     */
    List<StaffData> findValidCandidates(Slot slot, Collection<StaffData> staffList, int minRestHours, double teamMonthlyAvg) {
        List<StaffData> validCandidates = new ArrayList<>();
        double slotDuration = getDurationInHours(slot.getShift());

        for (StaffData empData : staffList) {
            // HC1: Skill Match & Expiration
            if (!hasValidSkill(empData, slot.getSkillId(), slot.getShift().getShiftDate())) continue;
            
            // HC2: Availability / Blackout
            if (isUnavailable(empData, slot.getShift())) continue;
            
            // HC3: Overlap (Lỗi 3: dùng LocalDateTime xử lý đúng ca qua đêm)
            if (hasOverlap(empData.getCurrentSchedule(), slot.getShift())) continue;
            
            // HC4: Max Contract Hours theo tuần ISO (Lỗi 2)
            double currentWeeklyHours = getWeeklyHours(empData, slot.getShift().getShiftDate());
            if (currentWeeklyHours + slotDuration > empData.getMaxWeeklyHours()) continue;
            
            // HC5: Minimum Rest Time (Lỗi 2: buffer trước/sau)
            if (!satisfiesRestTime(empData.getCurrentSchedule(), slot.getShift(), minRestHours)) continue;

            validCandidates.add(empData);
        }

        // Soft Fairness Cap: loại bớt ứng viên có giờ tháng vượt quá 1.3x trung bình snapshot toàn team,
        // CHỈ áp dụng khi có > 1 ứng viên hợp lệ và teamMonthlyAvg > 0 để không bao giờ bỏ trống ca
        if (validCandidates.size() > 1 && teamMonthlyAvg > 0) {
            double cap = teamMonthlyAvg * 1.3;
            List<StaffData> fairCandidates = validCandidates.stream()
                    .filter(e -> e.getMonthlyAssignedHours() <= cap)
                    .collect(Collectors.toList());
            if (!fairCandidates.isEmpty()) {
                validCandidates = fairCandidates;
            }
        }

        return validCandidates;
    }

    // Lỗi 3: Sửa so sánh overlap dùng đầy đủ (startDateTime, endDateTime) dạng LocalDateTime
    private boolean hasOverlap(List<Shift> schedule, Shift newShift) {
        LocalDateTime newStart = getStartDateTime(newShift);
        LocalDateTime newEnd = getEndDateTime(newShift);

        for (Shift s : schedule) {
            LocalDateTime sStart = getStartDateTime(s);
            LocalDateTime sEnd = getEndDateTime(s);

            // Hai khoảng thời gian [newStart, newEnd) và [sStart, sEnd) giao nhau khi:
            // newStart < sEnd && newEnd > sStart
            if (newStart.isBefore(sEnd) && newEnd.isAfter(sStart)) {
                return true;
            }
        }
        return false;
    }

    private boolean satisfiesRestTime(List<Shift> schedule, Shift newShift, int minRestHours) {
        LocalDateTime newStart = getStartDateTime(newShift);
        LocalDateTime newEnd = getEndDateTime(newShift);

        for (Shift s : schedule) {
            LocalDateTime sStart = getStartDateTime(s);
            LocalDateTime sEnd = getEndDateTime(s);

            long hoursBetween = 0;
            if (sEnd.isBefore(newStart) || sEnd.isEqual(newStart)) {
                hoursBetween = Duration.between(sEnd, newStart).toHours();
            } else if (newEnd.isBefore(sStart) || newEnd.isEqual(sStart)) {
                hoursBetween = Duration.between(newEnd, sStart).toHours();
            } else {
                return false; // overlap, handled by HC3, but just in case
            }

            if (hoursBetween < minRestHours) {
                return false;
            }
        }
        return true;
    }

    private double getSkillScore(StaffData empData, UUID skillId) {
        if (skillId == null) return 0.5;
        com.shiftsync.skill.entity.SkillLevel level = empData.getSkills().stream()
                .filter(s -> s.getSkillId().equals(skillId))
                .map(s -> s.getLevel())
                .findFirst()
                .orElse(com.shiftsync.skill.entity.SkillLevel.BEGINNER);

        if (level == null) return 0.5;
        switch (level) {
            case EXPERT: return 1.0;
            case ADVANCED: return 0.75;
            case INTERMEDIATE: return 0.5;
            case BEGINNER: return 0.25;
            default:
                log.warn("Invalid skill level found: '{}' for staff: {}", level, empData.getEmployment().getUser().getId());
                throw new IllegalStateException("Unknown skill level: " + level);
        }
    }

    private double getRestTimeScore(StaffData empData, Shift newShift, int minRestHours) {
        if (empData.getCurrentSchedule().isEmpty()) {
            return 1.0;
        }

        LocalDateTime newStart = getStartDateTime(newShift);
        LocalDateTime newEnd = getEndDateTime(newShift);

        double minGap = Double.MAX_VALUE;

        for (Shift s : empData.getCurrentSchedule()) {
            LocalDateTime sStart = getStartDateTime(s);
            LocalDateTime sEnd = getEndDateTime(s);

            double hoursBetween = Double.MAX_VALUE;
            if (sEnd.isBefore(newStart) || sEnd.isEqual(newStart)) {
                hoursBetween = Duration.between(sEnd, newStart).toMinutes() / 60.0;
            } else if (newEnd.isBefore(sStart) || newEnd.isEqual(sStart)) {
                hoursBetween = Duration.between(newEnd, sStart).toMinutes() / 60.0;
            }

            if (hoursBetween < minGap) {
                minGap = hoursBetween;
            }
        }

        if (minGap == Double.MAX_VALUE) {
            return 1.0;
        }

        if (minGap <= minRestHours) return 0.0;
        if (minGap >= 24.0) return 1.0;
        
        return Math.min(1.0, (minGap - minRestHours) / (24.0 - minRestHours));
    }

    /**
     * Trả về điểm khả dụng cho nhân viên với ca làm việc.
     *
     * <p><b>Lý do thay đổi (fix phân bổ không đều):</b> Công thức cũ
     * ({@code shiftMinutes / availMinutes}) vô tình phạt nhân viên đăng ký
     * khung giờ rộng (linh hoạt) và thưởng nhân viên khai báo hẹp/khớp sát —
     * ngược với mục tiêu công bằng. Vì HC2 ({@link #isUnavailable}) đã đảm bảo
     * chỉ những ứng viên đã pass coverage mới đến bước scoring, hàm này
     * chỉ cần trả {@code 1.0} cho mọi ứng viên hợp lệ.
     *
     * @param empData  dữ liệu nhân viên
     * @param newShift ca làm việc cần đánh giá
     * @return luôn trả về 1.0 (đã được HC2 đảm bảo coverage)
     */
    double getAvailabilityScore(StaffData empData, Shift newShift) {
        return 1.0;
    }

    double calculateScore(StaffData empData, Slot slot, SchedulerConfiguration config, int minRestHours) {
        if (empData.getMaxWeeklyHours() <= 0) {
            log.warn("Invalid MaxWeeklyHours: {} for staff: {}", empData.getMaxWeeklyHours(), empData.getEmployment().getUser().getId());
            throw new IllegalStateException("Max weekly hours must be strictly positive to avoid division by zero.");
        }

        double skillScore = getSkillScore(empData, slot.getSkillId());
        
        // Lỗi 2: Tính S_hour dựa trên số giờ làm trong tuần ISO của ca làm việc
        double currentWeeklyHours = getWeeklyHours(empData, slot.getShift().getShiftDate());
        double hourScore = Math.max(0.0, 1.0 - (currentWeeklyHours / empData.getMaxWeeklyHours()));
        
        // Lỗi 5: S_fairness so sánh theo TỔNG GIỜ đã làm trong tháng / (maxWeeklyHours * 4) thay vì đếm số ca
        double maxMonthlyHours = empData.getMaxWeeklyHours() * 4.0;
        double monthlyHours = empData.getMonthlyAssignedHours();
        double fairnessScore = Math.max(0.0, 1.0 - (monthlyHours / maxMonthlyHours));
        
        double restTimeScore = getRestTimeScore(empData, slot.getShift(), minRestHours);
        
        double availScore = getAvailabilityScore(empData, slot.getShift());
        
        double skillW = (config != null && config.getSkillWeight() != null) ? config.getSkillWeight().doubleValue() : 0.0;
        double hourW = (config != null && config.getHourWeight() != null) ? config.getHourWeight().doubleValue() : 0.0;
        double fairnessW = (config != null && config.getFairnessWeight() != null) ? config.getFairnessWeight().doubleValue() : 0.0;
        double restTimeW = (config != null && config.getRestTimeWeight() != null) ? config.getRestTimeWeight().doubleValue() : 0.0; 
        double availW = (config != null && config.getAvailabilityWeight() != null) ? config.getAvailabilityWeight().doubleValue() : 0.0;

        double totalScore = (skillW * skillScore) +
                            (hourW * hourScore) +
                            (fairnessW * fairnessScore) +
                            (restTimeW * restTimeScore) +
                            (availW * availScore);

        log.info("Staff {} -> Total: {} | Skill: {}*{} | Hour: {}*{} | Rest: {}*{} | Fair: {}*{} | Avail: {}*{}",
                empData.getEmployment().getUser().getId(),
                String.format("%.3f", totalScore),
                String.format("%.2f", skillW), String.format("%.2f", skillScore),
                String.format("%.2f", hourW), String.format("%.2f", hourScore),
                String.format("%.2f", restTimeW), String.format("%.2f", restTimeScore),
                String.format("%.2f", fairnessW), String.format("%.2f", fairnessScore),
                String.format("%.2f", availW), String.format("%.2f", availScore));

        return totalScore;
    }

    private double getDurationInHours(Shift shift) {
        return Duration.between(getStartDateTime(shift), getEndDateTime(shift)).toMinutes() / 60.0;
    }

    private double calculateTotalHours(List<Shift> shifts) {
        return shifts.stream().mapToDouble(this::getDurationInHours).sum();
    }
}
