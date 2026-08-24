package com.shiftsync.shift.service;

import com.shiftsync.auth.entity.User;
import com.shiftsync.availability.entity.Availability;
import com.shiftsync.availability.entity.BlackoutDate;
import com.shiftsync.availability.repository.AvailabilityRepository;
import com.shiftsync.availability.repository.BlackoutDateRepository;
import com.shiftsync.employment.entity.Employment;
import com.shiftsync.employment.enums.EmploymentStatus;
import com.shiftsync.employment.enums.EmploymentType;
import com.shiftsync.employment.repository.EmploymentRepository;
import com.shiftsync.shared.exception.BusinessException;
import com.shiftsync.shift.dto.AutoScheduleRequest;
import com.shiftsync.shift.entity.Shift;
import com.shiftsync.shift.entity.ShiftAssignment;
import com.shiftsync.shift.entity.ShiftSkillRequirement;
import com.shiftsync.shift.enums.AssignmentSource;
import com.shiftsync.shift.enums.ShiftStatus;
import com.shiftsync.shift.repository.ShiftAssignmentRepository;
import com.shiftsync.shift.repository.ShiftRepository;
import com.shiftsync.skill.entity.StaffSkill;
import com.shiftsync.skill.repository.StaffSkillRepository;
import com.shiftsync.store.entity.SchedulerConfiguration;
import com.shiftsync.store.entity.StoreConfiguration;
import com.shiftsync.store.repository.SchedulerConfigurationRepository;
import com.shiftsync.store.repository.StoreConfigurationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AutoScheduleService {

    private final ShiftRepository shiftRepository;
    private final ShiftAssignmentRepository shiftAssignmentRepository;
    private final EmploymentRepository employmentRepository;
    private final StaffSkillRepository staffSkillRepository;
    private final AvailabilityRepository availabilityRepository;
    private final BlackoutDateRepository blackoutDateRepository;
    private final StoreConfigurationRepository storeConfigRepo;
    private final SchedulerConfigurationRepository schedulerConfigRepo;

    // Helper classes for processing
    @lombok.Data
    static class Slot {
        Shift shift;
        UUID skillId;
        int eligibleCandidates = 0;
        
        public Slot(Shift shift, UUID skillId) {
            this.shift = shift;
            this.skillId = skillId;
        }
    }
    
    @lombok.Data
    static class StaffData {
        Employment employment;
        List<StaffSkill> skills;
        List<Availability> availabilities;
        List<BlackoutDate> blackoutDates;
        List<Shift> currentSchedule; // both existing assignments and newly assigned
        double assignedHours = 0;
        int monthlyShiftCount = 0; // TỔNG SỐ CA TRONG THÁNG (BA Fairness)
        
        int getMaxWeeklyHours() {
            return switch (employment.getEmploymentType()) {
                case FULL_TIME -> 48;
                case PART_TIME -> 24;
                case INTERN -> 20;
                case SEASONAL -> 40;
            };
        }
    }

    @Transactional
    public void autoSchedule(UUID storeId, AutoScheduleRequest request) {
        long startTime = System.currentTimeMillis(); // Profiling start
        long daysBetween = ChronoUnit.DAYS.between(request.getStartDate(), request.getEndDate());
        if (daysBetween < 0 || daysBetween > 6) {
            throw new BusinessException("Auto-scheduling range cannot exceed 7 days (1 week).", HttpStatus.BAD_REQUEST);
        }

        StoreConfiguration storeConfig = storeConfigRepo.findByStoreId(storeId)
                .orElse(StoreConfiguration.builder().storeId(storeId).build());
        SchedulerConfiguration schedConfig = schedulerConfigRepo.findByStoreId(storeId)
                .orElse(SchedulerConfiguration.builder().storeId(storeId).build());

        // 1. Fetch DRAFT shifts
        List<Shift> allShifts = shiftRepository.findByStoreIdAndShiftDateBetween(storeId, request.getStartDate(), request.getEndDate());
        List<Shift> draftShifts = allShifts.stream()
                .filter(s -> s.getStatus() == ShiftStatus.DRAFT)
                .collect(Collectors.toList());

        if (draftShifts.isEmpty()) {
            return;
        }

        // 2. Load Staff Data (Bulk Fetch)
        List<Employment> activeEmployments = employmentRepository.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE);
        List<UUID> staffIds = activeEmployments.stream().map(emp -> emp.getUser().getId()).collect(Collectors.toList());
        
        Map<UUID, List<StaffSkill>> skillsMap = staffSkillRepository.findByStaffIdIn(staffIds).stream()
                .collect(Collectors.groupingBy(StaffSkill::getStaffId));
                
        Map<UUID, List<Availability>> availabilityMap = availabilityRepository.findByUser_IdIn(staffIds).stream()
                .collect(Collectors.groupingBy(a -> a.getUser().getId()));
                
        Map<UUID, List<BlackoutDate>> blackoutMap = blackoutDateRepository.findByStaffIdInAndDateBetween(staffIds, request.getStartDate(), request.getEndDate()).stream()
                .collect(Collectors.groupingBy(BlackoutDate::getStaffId));
                
        Map<UUID, List<ShiftAssignment>> assignmentsMap = shiftAssignmentRepository.findByStaffIdInAndShift_ShiftDateBetween(staffIds, request.getStartDate(), request.getEndDate()).stream()
                .collect(Collectors.groupingBy(a -> a.getStaff().getId()));

        LocalDate monthStart = request.getStartDate().withDayOfMonth(1);
        LocalDate monthEnd = request.getStartDate().withDayOfMonth(request.getStartDate().lengthOfMonth());
        Map<UUID, Long> monthlyShiftCountMap = shiftAssignmentRepository.findByStaffIdInAndShift_ShiftDateBetween(staffIds, monthStart, monthEnd).stream()
                .collect(Collectors.groupingBy(a -> a.getStaff().getId(), Collectors.counting()));

        Map<UUID, StaffData> staffMap = new HashMap<>();
        
        for (Employment emp : activeEmployments) {
            UUID sid = emp.getUser().getId();
            StaffData data = new StaffData();
            data.setEmployment(emp);
            data.setSkills(skillsMap.getOrDefault(sid, Collections.emptyList()));
            data.setAvailabilities(availabilityMap.getOrDefault(sid, Collections.emptyList()));
            data.setBlackoutDates(blackoutMap.getOrDefault(sid, Collections.emptyList()));
            
            List<ShiftAssignment> existingAssignments = assignmentsMap.getOrDefault(sid, Collections.emptyList());
            
            data.setCurrentSchedule(existingAssignments.stream().map(ShiftAssignment::getShift).collect(Collectors.toList()));
            data.setAssignedHours(calculateTotalHours(data.getCurrentSchedule()));
            data.setMonthlyShiftCount(monthlyShiftCountMap.getOrDefault(sid, 0L).intValue());
            
            staffMap.put(sid, data);
        }

        // 3. Flatten Shifts into Slots
        List<Slot> slots = new ArrayList<>();
        for (Shift shift : draftShifts) {
            for (ShiftSkillRequirement req : shift.getRequirements()) {
                // Determine how many are already assigned to this shift for this skill? 
                // For simplicity, Auto-schedule assumes DRAFT shifts have no current assignments, or we assign up to requiredCount
                // Let's assume DRAFT shifts have 0 assignments initially.
                for (int i = 0; i < req.getRequiredCount(); i++) {
                    slots.add(new Slot(shift, req.getSkill().getId()));
                }
            }
        }

        // 4. Pre-compute Static Eligibility (MRV)
        for (Slot slot : slots) {
            for (StaffData empData : staffMap.values()) {
                if (hasValidSkill(empData, slot.getSkillId(), slot.getShift().getShiftDate()) && !isUnavailable(empData, slot.getShift())) {
                    slot.eligibleCandidates++;
                }
            }
        }

        // 5. Sort Slots by MRV ASC, then Chronological ASC
        slots.sort(Comparator.comparingInt(Slot::getEligibleCandidates)
                .thenComparing((Slot s) -> s.getShift().getShiftDate())
                .thenComparing((Slot s) -> s.getShift().getStartTime()));

        List<ShiftAssignment> newAssignments = new ArrayList<>();

        // 6. Greedily assign
        for (Slot slot : slots) {
            List<StaffData> validCandidates = new ArrayList<>();
            double slotDuration = getDurationInHours(slot.getShift());

            for (StaffData empData : staffMap.values()) {
                // HC1: Skill Match & Expiration
                if (!hasValidSkill(empData, slot.getSkillId(), slot.getShift().getShiftDate())) continue;
                
                // HC2: Availability / Blackout
                if (isUnavailable(empData, slot.getShift())) continue;
                
                // HC3: Overlap
                if (hasOverlap(empData.getCurrentSchedule(), slot.getShift())) continue;
                
                // HC4: Max Contract Hours
                if (empData.getAssignedHours() + slotDuration > empData.getMaxWeeklyHours()) continue;
                
                // HC5: Minimum Rest Time
                if (!satisfiesRestTime(empData.getCurrentSchedule(), slot.getShift(), storeConfig.getMinRestHours())) continue;

                validCandidates.add(empData);
            }

            if (validCandidates.isEmpty()) {
                log.warn("AutoSchedule: Could not find any valid candidate for Shift {} (Skill {})", slot.getShift().getId(), slot.getSkillId());
                continue;
            }

            // 7. Calculate Weighted Score
            StaffData bestEmp = validCandidates.stream()
                    .max(Comparator.comparingDouble((StaffData empData) -> calculateScore(empData, slot, schedConfig, storeConfig.getMinRestHours()))
                            .thenComparing(empData -> empData.getEmployment().getUser().getId().toString().hashCode() * -1)) // Deterministic tie-break
                    .orElse(validCandidates.get(0));

            // 8. Make Assignment
            ShiftAssignment assignment = ShiftAssignment.builder()
                    .shift(slot.getShift())
                    .staff(bestEmp.getEmployment().getUser())
                    .source(AssignmentSource.AUTO)
                    .build();
            
            newAssignments.add(assignment);
            bestEmp.getCurrentSchedule().add(slot.getShift());
            bestEmp.setAssignedHours(bestEmp.getAssignedHours() + slotDuration);
        }

        if (!newAssignments.isEmpty()) {
            shiftAssignmentRepository.saveAll(newAssignments);
        }
        
        long endTime = System.currentTimeMillis(); // Profiling end
        log.info("autoSchedule completed in {} ms for {} assignments across {} employees.", (endTime - startTime), newAssignments.size(), activeEmployments.size());
    }

    private boolean hasValidSkill(StaffData empData, UUID skillId, LocalDate shiftDate) {
        return empData.getSkills().stream()
                .anyMatch(s -> s.getSkillId().equals(skillId) && 
                              (s.getExpirationDate() == null || !s.getExpirationDate().isBefore(shiftDate)));
    }

    private boolean isUnavailable(StaffData empData, Shift shift) {
        // Check Blackout Dates
        boolean isBlackout = empData.getBlackoutDates().stream()
                .anyMatch(b -> b.getDate().equals(shift.getShiftDate()));
        if (isBlackout) return true;
        
        // Availability Check: Staff MUST have an availability slot covering the shift
        short shiftDayOfWeek = (short) (shift.getShiftDate().getDayOfWeek().getValue() % 7);
        
        boolean isCovered = empData.getAvailabilities().stream()
                .anyMatch(a -> a.getDayOfWeek() == shiftDayOfWeek 
                        && !a.getStartTime().isAfter(shift.getStartTime()) 
                        && !a.getEndTime().isBefore(shift.getEndTime()));
        
        return !isCovered;
    }

    private boolean hasOverlap(List<Shift> schedule, Shift newShift) {
        for (Shift s : schedule) {
            if (s.getShiftDate().equals(newShift.getShiftDate())) {
                if (newShift.getStartTime().isBefore(s.getEndTime()) && newShift.getEndTime().isAfter(s.getStartTime())) {
                    return true;
                }
            }
        }
        return false;
    }

    private boolean satisfiesRestTime(List<Shift> schedule, Shift newShift, int minRestHours) {
        LocalDateTime newStart = LocalDateTime.of(newShift.getShiftDate(), newShift.getStartTime());
        LocalDateTime newEnd = LocalDateTime.of(newShift.getShiftDate(), newShift.getEndTime());

        for (Shift s : schedule) {
            LocalDateTime sStart = LocalDateTime.of(s.getShiftDate(), s.getStartTime());
            LocalDateTime sEnd = LocalDateTime.of(s.getShiftDate(), s.getEndTime());

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
        String level = empData.getSkills().stream()
                .filter(s -> s.getSkillId().equals(skillId))
                .map(s -> s.getLevel().trim().toUpperCase())
                .findFirst()
                .orElse("BEGINNER");

        switch (level) {
            case "EXPERT": return 1.0;
            case "ADVANCED": return 0.75;
            case "INTERMEDIATE": return 0.5;
            case "BEGINNER": return 0.25;
            default:
                log.warn("Invalid skill level found: '{}' for staff: {}", level, empData.getEmployment().getUser().getId());
                throw new IllegalStateException("Unknown skill level: " + level);
        }
    }

    private double getRestTimeScore(StaffData empData, Shift newShift, int minRestHours) {
        if (empData.getCurrentSchedule().isEmpty()) {
            return 1.0;
        }

        LocalDateTime newStart = LocalDateTime.of(newShift.getShiftDate(), newShift.getStartTime());
        LocalDateTime newEnd = LocalDateTime.of(newShift.getShiftDate(), newShift.getEndTime());

        double minGap = Double.MAX_VALUE;

        for (Shift s : empData.getCurrentSchedule()) {
            LocalDateTime sStart = LocalDateTime.of(s.getShiftDate(), s.getStartTime());
            LocalDateTime sEnd = LocalDateTime.of(s.getShiftDate(), s.getEndTime());

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

    double getAvailabilityScore(StaffData empData, Shift newShift) {
        return 1.0; // Simplified logic, assume covered = 1.0 as HC already checked covering.
    }

    double calculateScore(StaffData empData, Slot slot, SchedulerConfiguration config, int minRestHours) {
        if (empData.getMaxWeeklyHours() <= 0) {
            log.warn("Invalid MaxWeeklyHours: {} for staff: {}", empData.getMaxWeeklyHours(), empData.getEmployment().getUser().getId());
            throw new IllegalStateException("Max weekly hours must be strictly positive to avoid division by zero.");
        }

        double skillScore = getSkillScore(empData, slot.getSkillId());
        
        double hourScore = Math.max(0.0, 1.0 - (empData.getAssignedHours() / empData.getMaxWeeklyHours()));
        
        // BA Fairness is based on "Tổng số ca trong THÁNG" (Total shifts in month).
        // Normalize against max possible shifts in a month (assuming 8h standard shift * 4 weeks)
        double maxMonthlyShifts = (empData.getMaxWeeklyHours() / 8.0) * 4.0;
        int monthlyShifts = empData.getMonthlyShiftCount();
        double fairnessScore = Math.max(0.0, 1.0 - (monthlyShifts / maxMonthlyShifts));
        
        double restTimeScore = getRestTimeScore(empData, slot.getShift(), minRestHours);
        
        double availScore = getAvailabilityScore(empData, slot.getShift());
        
        double skillW = config.getSkillWeight().doubleValue();
        double hourW = config.getHourWeight().doubleValue();
        double fairnessW = config.getFairnessWeight().doubleValue();
        double restTimeW = config.getRestTimeWeight().doubleValue(); 
        double availW = config.getAvailabilityWeight().doubleValue();

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
        return Duration.between(shift.getStartTime(), shift.getEndTime()).toMinutes() / 60.0;
    }

    private double calculateTotalHours(List<Shift> shifts) {
        return shifts.stream().mapToDouble(this::getDurationInHours).sum();
    }
}
