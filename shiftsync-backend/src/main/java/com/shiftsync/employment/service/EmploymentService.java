package com.shiftsync.employment.service;

import com.shiftsync.auth.entity.User;
import com.shiftsync.auth.repository.UserRepository;
import com.shiftsync.employment.dto.EmploymentCreateRequest;
import com.shiftsync.employment.dto.EmploymentDTO;
import com.shiftsync.employment.entity.Employment;
import com.shiftsync.employment.enums.EmploymentStatus;
import com.shiftsync.employment.mapper.EmploymentMapper;
import com.shiftsync.employment.repository.EmploymentRepository;
import com.shiftsync.shared.exception.BusinessException;
import com.shiftsync.shared.security.SystemRole;
import com.shiftsync.store.entity.Store;
import com.shiftsync.store.repository.StoreRepository;
import com.shiftsync.employment.repository.ContractTypeRepository;
import com.shiftsync.employment.entity.ContractType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class EmploymentService {

    private final EmploymentRepository employmentRepository;
    private final UserRepository userRepository;
    private final StoreRepository storeRepository;
    private final ContractTypeRepository contractTypeRepository;

    public EmploymentService(EmploymentRepository employmentRepository, 
                             UserRepository userRepository, 
                             StoreRepository storeRepository, ContractTypeRepository contractTypeRepository) {
        this.employmentRepository = employmentRepository;
        this.userRepository = userRepository;
        this.storeRepository = storeRepository;
        this.contractTypeRepository = contractTypeRepository;
    }

    @Transactional
    public EmploymentDTO assignStaffToStore(UUID storeId, EmploymentCreateRequest request) {
        User user = userRepository.findById(request.getStaffId())
                .orElseThrow(() -> new BusinessException("Staff not found", HttpStatus.NOT_FOUND));

        if (user.getSystemRole() == SystemRole.ADMIN) {
            throw new BusinessException("Cannot assign an ADMIN to a store", HttpStatus.BAD_REQUEST);
        }
        
        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new BusinessException("Store not found", HttpStatus.NOT_FOUND));

        if (employmentRepository.existsByUserIdAndStoreIdAndStatus(user.getId(), store.getId(), EmploymentStatus.ACTIVE)) {
            throw new BusinessException("Staff is already assigned to this store", HttpStatus.CONFLICT);
        }

        ContractType ct = contractTypeRepository.findById(request.getContractTypeId())
                .orElseThrow(() -> new BusinessException("Contract type not found", HttpStatus.NOT_FOUND));

        Employment employment = Employment.builder()
                .user(user)
                .store(store)
                .contractType(ct)
                .hourlyRate(request.getHourlyRate())
                .joinedDate(request.getJoinedDate())
                .status(EmploymentStatus.ACTIVE)
                .build();

        return EmploymentMapper.toDTO(employmentRepository.save(employment));
    }

    @Transactional
    public void removeStaffFromStore(UUID storeId, UUID staffId) {
        // Find ACTIVE employment for this user in this store
        Employment employment = employmentRepository.findByUserIdAndStatus(staffId, EmploymentStatus.ACTIVE)
                .stream()
                .filter(e -> e.getStore().getId().equals(storeId))
                .findFirst()
                .orElseThrow(() -> new BusinessException("Active employment record not found for this staff and store", HttpStatus.NOT_FOUND));

        employment.setStatus(EmploymentStatus.INACTIVE);
        employment.setLeftDate(LocalDate.now());
        employmentRepository.save(employment);
    }

    @Transactional(readOnly = true)
    public Page<EmploymentDTO> getStaffByStore(UUID storeId, Pageable pageable) {
        return employmentRepository.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE, pageable)
                .map(EmploymentMapper::toDTO);
    }

    @Transactional(readOnly = true)
    public List<EmploymentDTO> getStoresByStaff(UUID staffId) {
        return employmentRepository.findByUserIdAndStatus(staffId, EmploymentStatus.ACTIVE)
                .stream()
                .map(EmploymentMapper::toDTO)
                .collect(Collectors.toList());
    }
}
