package com.shiftsync.shift.service;

import com.shiftsync.payroll.repository.PayrollPeriodRepository;
import com.shiftsync.payroll.enums.PayrollPeriodStatus;
import java.util.Arrays;
import com.shiftsync.shared.exception.BusinessException;
import com.shiftsync.shift.dto.ShiftCreateRequest;
import com.shiftsync.shift.dto.ShiftDTO;
import com.shiftsync.shift.dto.ShiftRequirementRequest;
import com.shiftsync.shift.dto.ShiftSkillRequirementDTO;
import com.shiftsync.shift.entity.Shift;
import com.shiftsync.shift.entity.ShiftSkillRequirement;
import com.shiftsync.shift.entity.ShiftTemplate;
import com.shiftsync.shift.enums.ShiftStatus;
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

    private final ShiftRepository shiftRepository;
    private final StoreRepository storeRepository;
    private final com.shiftsync.store.repository.StoreConfigurationRepository storeConfigRepository;
    private final ShiftTemplateRepository shiftTemplateRepository;
    private final SkillRepository skillRepository;
    private final PayrollPeriodRepository payrollPeriodRepository;

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

        return mapToDTO(shiftRepository.save(shift));
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
    public void publishShifts(UUID storeId, java.time.LocalDate startDate, java.time.LocalDate endDate) {
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
            shiftRepository.saveAll(shifts);
        }
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
                .build();
    }
}
