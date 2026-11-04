package com.shiftsync.employment.service;

import com.shiftsync.employment.dto.ContractTypeCreateRequest;
import com.shiftsync.employment.dto.ContractTypeDTO;
import com.shiftsync.employment.entity.ContractType;
import com.shiftsync.employment.repository.ContractTypeRepository;
import com.shiftsync.employment.repository.EmploymentRepository;
import com.shiftsync.shared.exception.BusinessException;
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
public class ContractTypeService {

    private final ContractTypeRepository contractTypeRepository;
    private final StoreRepository storeRepository;
    private final EmploymentRepository employmentRepository;
    private final com.shiftsync.payroll.service.ContractCompensationScheduler compensationScheduler;
    private final com.shiftsync.payroll.service.CompensationRevisionResolver compensationRevisions;

    @Transactional(readOnly = true)
    public List<ContractTypeDTO> getContractTypes(UUID storeId) {
        return contractTypeRepository.findByStoreId(storeId).stream()
                .map(this::toCurrentDTO)
                .collect(Collectors.toList());
    }

    @Transactional
    public ContractTypeDTO createContractType(UUID storeId, ContractTypeCreateRequest request) {
        if (request.getEffectiveDate() != null) {
            throw new BusinessException("Chức năng đặt ngày hiệu lực lương chưa sẵn sàng", HttpStatus.CONFLICT);
        }
        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new BusinessException("Store not found", HttpStatus.NOT_FOUND));

        if (contractTypeRepository.existsByNameAndStoreId(request.getName(), storeId)) {
            throw new BusinessException("Contract type with this name already exists", HttpStatus.CONFLICT);
        }

        ContractType contractType = ContractType.builder()
                .store(store)
                .name(request.getName())
                .maxWeeklyHours(request.getMaxWeeklyHours())
                .otMultiplier(request.getOtMultiplier())
                .defaultHourlyRate(request.getDefaultHourlyRate())
                .build();

        return toDTO(contractTypeRepository.save(contractType));
    }

    @Transactional(isolation = org.springframework.transaction.annotation.Isolation.SERIALIZABLE)
    public ContractTypeDTO updateContractType(UUID storeId, UUID contractTypeId, ContractTypeCreateRequest request) {
        ContractType contractType = contractTypeRepository.findByIdAndStoreId(contractTypeId, storeId)
                .orElseThrow(() -> new BusinessException("Contract type not found", HttpStatus.NOT_FOUND));

        if (!contractType.getName().equals(request.getName()) && contractTypeRepository.existsByNameAndStoreId(request.getName(), storeId)) {
            throw new BusinessException("Contract type with this name already exists", HttpStatus.CONFLICT);
        }

        contractType.setName(request.getName());
        java.time.LocalDate scheduled = null;
        var today = java.time.LocalDate.now(com.shiftsync.payroll.service.CompensationEffectiveDate.BUSINESS_ZONE);
        var current = compensationRevisions.requireAt("contract_type", contractTypeId, today,
                com.shiftsync.payroll.service.CompensationRevisionResolver.ContractTerms.class);
        if (request.getEffectiveDate() != null || current.maxWeeklyHours() != request.getMaxWeeklyHours()
                || current.otMultiplier().compareTo(request.getOtMultiplier()) != 0
                || current.defaultHourlyRate().compareTo(request.getDefaultHourlyRate()) != 0) {
            var auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
            UUID actor = auth != null && auth.getPrincipal() instanceof com.shiftsync.shared.security.CustomUserDetails principal
                    ? principal.getId() : null;
            scheduled = compensationScheduler.schedule(storeId, contractTypeId, request.getDefaultHourlyRate(),
                    request.getMaxWeeklyHours(), request.getOtMultiplier(), request.getEffectiveDate(), actor);
        }
        contractTypeRepository.save(contractType);
        ContractTypeDTO result = toCurrentDTO(contractType);
        if (scheduled != null) {
            result.setScheduledEffectiveDate(scheduled);
            result.setScheduledMaxWeeklyHours(request.getMaxWeeklyHours());
            result.setScheduledOtMultiplier(request.getOtMultiplier());
            result.setScheduledDefaultHourlyRate(request.getDefaultHourlyRate());
        }
        return result;
    }

    
    @Transactional
    public void deleteContractType(UUID storeId, UUID contractTypeId) {
        ContractType contractType = contractTypeRepository.findByIdAndStoreId(contractTypeId, storeId)
                .orElseThrow(() -> new BusinessException("Contract type not found", HttpStatus.NOT_FOUND));

        // Check if in use
        if (employmentRepository.countByStoreIdAndContractTypeId(storeId, contractTypeId) > 0
                || contractTypeRepository.hasHistoricalEmploymentReference(contractTypeId)) {
            throw new BusinessException("Không thể xóa loại hợp đồng đã được nhân viên sử dụng; cần giữ dữ liệu lịch sử lương", HttpStatus.CONFLICT);
        }

        contractTypeRepository.delete(contractType);
    }

    private ContractTypeDTO toDTO(ContractType entity) {
        return ContractTypeDTO.builder()
                .id(entity.getId())
                .name(entity.getName())
                .maxWeeklyHours(entity.getMaxWeeklyHours())
                .otMultiplier(entity.getOtMultiplier())
                .defaultHourlyRate(entity.getDefaultHourlyRate())
                .build();
    }

    private ContractTypeDTO toCurrentDTO(ContractType entity) {
        var today = java.time.LocalDate.now(com.shiftsync.payroll.service.CompensationEffectiveDate.BUSINESS_ZONE);
        var result = toDTO(entity);
        var current = compensationRevisions.requireAt("contract_type", entity.getId(), today,
                com.shiftsync.payroll.service.CompensationRevisionResolver.ContractTerms.class);
        result.setMaxWeeklyHours(current.maxWeeklyHours());
        result.setOtMultiplier(current.otMultiplier());
        result.setDefaultHourlyRate(current.defaultHourlyRate());
        compensationRevisions.nextEffectiveDate("contract_type", entity.getId(), today).ifPresent(date -> {
            var future = compensationRevisions.requireAt("contract_type", entity.getId(), date,
                    com.shiftsync.payroll.service.CompensationRevisionResolver.ContractTerms.class);
            result.setScheduledEffectiveDate(date);
            result.setScheduledMaxWeeklyHours(future.maxWeeklyHours());
            result.setScheduledOtMultiplier(future.otMultiplier());
            result.setScheduledDefaultHourlyRate(future.defaultHourlyRate());
        });
        return result;
    }
}
