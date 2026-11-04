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
    private final com.shiftsync.payroll.service.EmploymentCompensationScheduler compensationScheduler;
    private final com.shiftsync.payroll.service.CompensationRevisionResolver compensationRevisions;

    public EmploymentService(EmploymentRepository employmentRepository, 
                             UserRepository userRepository, 
                             StoreRepository storeRepository, ContractTypeRepository contractTypeRepository,
                             com.shiftsync.payroll.service.EmploymentCompensationScheduler compensationScheduler,
                             com.shiftsync.payroll.service.CompensationRevisionResolver compensationRevisions) {
        this.employmentRepository = employmentRepository;
        this.userRepository = userRepository;
        this.storeRepository = storeRepository;
        this.contractTypeRepository = contractTypeRepository;
        this.compensationScheduler = compensationScheduler;
        this.compensationRevisions = compensationRevisions;
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

        ContractType ct = contractTypeRepository.findByIdAndStoreId(request.getContractTypeId(), storeId)
                .orElseThrow(() -> new BusinessException("Contract type not found", HttpStatus.NOT_FOUND));

        Employment employment = Employment.builder()
                .user(user)
                .store(store)
                .contractType(ct)
                .hourlyRate(request.getHourlyRate())
                .joinedDate(request.getJoinedDate())
                .status(EmploymentStatus.ACTIVE)
                .build();

        try {
            return EmploymentMapper.toDTO(employmentRepository.saveAndFlush(employment));
        } catch (org.springframework.dao.DataIntegrityViolationException ex) {
            Throwable cause = ex;
            while (cause != null) {
                if (cause.getMessage() != null && cause.getMessage().contains("uq_employment_active_staff_store")) {
                    throw new BusinessException("Nhân viên đã được phân công vào cửa hàng này", HttpStatus.CONFLICT);
                }
                cause = cause.getCause();
            }
            throw ex;
        }
    }

    @Transactional
    public void removeStaffFromStore(UUID storeId, UUID staffId) {
        // Find ACTIVE employment for this user in this store
        List<Employment> activeEmployments = employmentRepository.findByUserIdAndStatus(staffId, EmploymentStatus.ACTIVE)
                .stream()
                .filter(e -> e.getStore().getId().equals(storeId))
                .toList();
        if (activeEmployments.isEmpty()) {
            throw new BusinessException("Active employment record not found for this staff and store", HttpStatus.NOT_FOUND);
        }

        for (Employment employment : activeEmployments) {
            employment.setStatus(EmploymentStatus.INACTIVE);
            employment.setLeftDate(LocalDate.now());
            employmentRepository.save(employment);
        }
    }

    @Transactional(isolation = org.springframework.transaction.annotation.Isolation.SERIALIZABLE)
    public EmploymentDTO updateEmployment(UUID storeId, UUID staffId, com.shiftsync.employment.dto.EmploymentUpdateRequest request) {
        var authentication = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        UUID actorId = authentication != null && authentication.getPrincipal() instanceof com.shiftsync.shared.security.CustomUserDetails principal
                ? principal.getId() : null;
        LocalDate effectiveDate = compensationScheduler.schedule(storeId, staffId, request.getContractTypeId(),
                request.getHourlyRate(), request.getEffectiveDate(), actorId);
        Employment employment = employmentRepository.findByUserIdAndStatus(staffId, EmploymentStatus.ACTIVE)
                .stream()
                .filter(e -> e.getStore().getId().equals(storeId))
                .findFirst()
                .orElseThrow(() -> new BusinessException("Active employment record not found for this staff and store", HttpStatus.NOT_FOUND));

        EmploymentDTO result = toCurrentDTO(employment);
        result.setScheduledEffectiveDate(effectiveDate);
        result.setScheduledHourlyRate(request.getHourlyRate());
        result.setScheduledContractTypeId(request.getContractTypeId());
        return result;
    }

    @Transactional(readOnly = true)
    public Page<EmploymentDTO> getStaffByStore(UUID storeId, Pageable pageable) {
        return employmentRepository.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE, pageable)
                .map(this::toCurrentDTO);
    }

    @Transactional(readOnly = true)
    public Page<EmploymentDTO> getStaffRoster(UUID storeId, Pageable pageable) {
        return employmentRepository.findStaffRoster(storeId, EmploymentStatus.ACTIVE, pageable)
                .map(row -> EmploymentDTO.builder()
                        .staffId(row.getStaffId())
                        .staffFullName(row.getStaffFullName())
                        .systemRole(row.getSystemRole() == null ? "STAFF" : row.getSystemRole().name())
                        .avatarId(row.getAvatarId())
                        .avatarUrl(row.getAvatarId())
                        .build());
    }

    @Transactional(readOnly = true)
    public List<EmploymentDTO> getStoresByStaff(UUID staffId, User actor) {
        var rows = employmentRepository.findByUserIdAndStatus(staffId, EmploymentStatus.ACTIVE);
        if (actor.getSystemRole() == SystemRole.MANAGER && !actor.getId().equals(staffId)) {
            var allowed = employmentRepository.findByUserIdAndStatus(actor.getId(), EmploymentStatus.ACTIVE).stream()
                    .map(e -> e.getStore().getId()).collect(Collectors.toSet());
            rows = rows.stream().filter(e -> allowed.contains(e.getStore().getId())).toList();
            if (rows.isEmpty()) {
                throw new BusinessException("Không có quyền xem thông tin nhân viên này", HttpStatus.FORBIDDEN);
            }
        }
        return rows
                .stream()
                .map(this::toCurrentDTO)
                .collect(Collectors.toList());
    }

    private EmploymentDTO toCurrentDTO(Employment employment) {
        LocalDate today = LocalDate.now(com.shiftsync.payroll.service.CompensationEffectiveDate.BUSINESS_ZONE);
        var current = compensationRevisions.requireAt("employment", employment.getId(), today,
                com.shiftsync.payroll.service.CompensationRevisionResolver.EmploymentTerms.class);
        var contract = contractTypeRepository.findByIdAndStoreId(current.contractTypeId(), employment.getStore().getId())
                .orElseThrow(() -> new BusinessException("Hợp đồng trong lịch sử không thuộc chi nhánh; cần đối soát", HttpStatus.CONFLICT));
        var terms = compensationRevisions.requireAt("contract_type", contract.getId(), today,
                com.shiftsync.payroll.service.CompensationRevisionResolver.ContractTerms.class);
        EmploymentDTO result = EmploymentMapper.toDTO(employment);
        result.setHourlyRate(current.hourlyRate());
        result.setContractType(com.shiftsync.employment.dto.ContractTypeDTO.builder()
                .id(contract.getId()).name(contract.getName()).maxWeeklyHours(terms.maxWeeklyHours())
                .otMultiplier(terms.otMultiplier()).defaultHourlyRate(terms.defaultHourlyRate()).build());
        compensationRevisions.nextEffectiveDate("employment", employment.getId(), today).ifPresent(date -> {
            var future = compensationRevisions.requireAt("employment", employment.getId(), date,
                    com.shiftsync.payroll.service.CompensationRevisionResolver.EmploymentTerms.class);
            result.setScheduledEffectiveDate(date);
            result.setScheduledHourlyRate(future.hourlyRate());
            result.setScheduledContractTypeId(future.contractTypeId());
        });
        return result;
    }
}
