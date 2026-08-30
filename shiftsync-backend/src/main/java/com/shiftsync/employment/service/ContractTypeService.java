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

    @Transactional(readOnly = true)
    public List<ContractTypeDTO> getContractTypes(UUID storeId) {
        return contractTypeRepository.findByStoreId(storeId).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional
    public ContractTypeDTO createContractType(UUID storeId, ContractTypeCreateRequest request) {
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

    @Transactional
    public ContractTypeDTO updateContractType(UUID storeId, UUID contractTypeId, ContractTypeCreateRequest request) {
        ContractType contractType = contractTypeRepository.findByIdAndStoreId(contractTypeId, storeId)
                .orElseThrow(() -> new BusinessException("Contract type not found", HttpStatus.NOT_FOUND));

        if (!contractType.getName().equals(request.getName()) && contractTypeRepository.existsByNameAndStoreId(request.getName(), storeId)) {
            throw new BusinessException("Contract type with this name already exists", HttpStatus.CONFLICT);
        }

        contractType.setName(request.getName());
        contractType.setMaxWeeklyHours(request.getMaxWeeklyHours());
        contractType.setOtMultiplier(request.getOtMultiplier());
        contractType.setDefaultHourlyRate(request.getDefaultHourlyRate());

        return toDTO(contractTypeRepository.save(contractType));
    }

    
    @Transactional
    public void deleteContractType(UUID storeId, UUID contractTypeId) {
        ContractType contractType = contractTypeRepository.findByIdAndStoreId(contractTypeId, storeId)
                .orElseThrow(() -> new BusinessException("Contract type not found", HttpStatus.NOT_FOUND));

        // Check if in use
        if (employmentRepository.countByStoreIdAndContractTypeId(storeId, contractTypeId) > 0) {
            throw new BusinessException("Cannot delete contract type that is in use by employees", HttpStatus.BAD_REQUEST);
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
}
