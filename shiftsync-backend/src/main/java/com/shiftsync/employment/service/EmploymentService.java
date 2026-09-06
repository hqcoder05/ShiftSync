package com.shiftsync.employment.service;

import com.shiftsync.auth.entity.User;
import com.shiftsync.auth.repository.UserRepository;
import com.shiftsync.employment.dto.EmploymentCreateRequest;
import com.shiftsync.employment.dto.EmploymentDTO;
import com.shiftsync.employment.entity.Employment;
import com.shiftsync.employment.enums.EmploymentStatus;
import com.shiftsync.employment.mapper.EmploymentMapper;
import com.shiftsync.employment.repository.EmploymentRepository;
import com.shiftsync.employment.repository.ContractTypeRepository;
import com.shiftsync.employment.entity.ContractType;
import com.shiftsync.shared.exception.BusinessException;
import com.shiftsync.shared.security.SystemRole;
import com.shiftsync.skill.entity.Skill;
import com.shiftsync.skill.entity.StaffSkill;
import com.shiftsync.skill.repository.SkillRepository;
import com.shiftsync.skill.repository.StaffSkillRepository;
import com.shiftsync.store.entity.Store;
import com.shiftsync.store.repository.StoreRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class EmploymentService {

    private final EmploymentRepository employmentRepository;
    private final UserRepository userRepository;
    private final StoreRepository storeRepository;
    private final ContractTypeRepository contractTypeRepository;
    private final SkillRepository skillRepository;
    private final StaffSkillRepository staffSkillRepository;

    public EmploymentService(EmploymentRepository employmentRepository, 
                             UserRepository userRepository, 
                             StoreRepository storeRepository, 
                             ContractTypeRepository contractTypeRepository,
                             SkillRepository skillRepository,
                             StaffSkillRepository staffSkillRepository) {
        this.employmentRepository = employmentRepository;
        this.userRepository = userRepository;
        this.storeRepository = storeRepository;
        this.contractTypeRepository = contractTypeRepository;
        this.skillRepository = skillRepository;
        this.staffSkillRepository = staffSkillRepository;
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

        ContractType ct = null;
        if (request.getContractTypeId() != null) {
            ct = contractTypeRepository.findById(request.getContractTypeId()).orElse(null);
        }
        if (ct == null && request.getEmploymentType() != null && !request.getEmploymentType().isBlank()) {
            ct = contractTypeRepository.findByStoreIdAndName(storeId, request.getEmploymentType().trim()).orElse(null);
        }
        if (ct == null) {
            List<ContractType> storeContracts = contractTypeRepository.findByStoreId(storeId);
            if (!storeContracts.isEmpty()) {
                ct = storeContracts.get(0);
            } else {
                String typeName = (request.getEmploymentType() != null && !request.getEmploymentType().isBlank())
                        ? request.getEmploymentType().trim() : "FULL_TIME";
                BigDecimal defaultRate = (request.getHourlyRate() != null && request.getHourlyRate().compareTo(BigDecimal.ZERO) > 0)
                        ? request.getHourlyRate() : BigDecimal.valueOf(25000);
                ct = contractTypeRepository.save(ContractType.builder()
                        .store(store)
                        .name(typeName)
                        .maxWeeklyHours("PART_TIME".equalsIgnoreCase(typeName) ? 24 : 48)
                        .otMultiplier(BigDecimal.valueOf(1.5))
                        .defaultHourlyRate(defaultRate)
                        .build());
            }
        }

        BigDecimal rate = (request.getHourlyRate() != null && request.getHourlyRate().compareTo(BigDecimal.ZERO) > 0)
                ? request.getHourlyRate()
                : (ct.getDefaultHourlyRate() != null ? ct.getDefaultHourlyRate() : BigDecimal.valueOf(25000));
        LocalDate joined = request.getJoinedDate() != null ? request.getJoinedDate() : LocalDate.now();

        // Check if user already has an active employment record
        List<Employment> activeEmployments = employmentRepository.findByUserIdAndStatus(user.getId(), EmploymentStatus.ACTIVE);
        Employment employment = null;

        for (Employment emp : activeEmployments) {
            if (emp.getStore().getId().equals(storeId)) {
                employment = emp;
            } else {
                // If staff was active in another store, deactivate old store's employment
                emp.setStatus(EmploymentStatus.INACTIVE);
                emp.setLeftDate(LocalDate.now());
                employmentRepository.save(emp);
            }
        }

        if (employment != null) {
            // Update existing employment record
            employment.setContractType(ct);
            employment.setHourlyRate(rate);
            if (request.getJoinedDate() != null) {
                employment.setJoinedDate(request.getJoinedDate());
            }
            employment = employmentRepository.save(employment);
        } else {
            // Create new employment record
            employment = Employment.builder()
                    .user(user)
                    .store(store)
                    .contractType(ct)
                    .hourlyRate(rate)
                    .joinedDate(joined)
                    .status(EmploymentStatus.ACTIVE)
                    .build();
            employment = employmentRepository.save(employment);
        }

        // Handle Skill (Vị trí công việc) assignment
        if (request.getSkillId() != null) {
            UUID skillId = request.getSkillId();
            Skill skill = skillRepository.findByIdAndStoreId(skillId, storeId)
                    .orElseThrow(() -> new BusinessException("Vị trí/Kỹ năng không thuộc chi nhánh này", HttpStatus.BAD_REQUEST));
            
            // Remove previous skills of this staff for this store
            List<Skill> storeSkills = skillRepository.findByStoreId(storeId);
            Set<UUID> storeSkillIds = storeSkills.stream().map(Skill::getId).collect(Collectors.toSet());
            
            List<StaffSkill> userSkills = staffSkillRepository.findByStaffId(user.getId());
            for (StaffSkill us : userSkills) {
                if (storeSkillIds.contains(us.getSkillId())) {
                    staffSkillRepository.delete(us);
                }
            }
            
            // Assign new skill
            StaffSkill newStaffSkill = StaffSkill.builder()
                    .staffId(user.getId())
                    .skillId(skillId)
                    .level("BEGINNER")
                    .build();
            staffSkillRepository.save(newStaffSkill);
        }

        EmploymentDTO dto = EmploymentMapper.toDTO(employment);
        return enrichWithSkill(dto);
    }

    private EmploymentDTO enrichWithSkill(EmploymentDTO dto) {
        if (dto == null || dto.getStaffId() == null || dto.getStoreId() == null) {
            return dto;
        }
        List<StaffSkill> staffSkills = staffSkillRepository.findByStaffId(dto.getStaffId());
        if (!staffSkills.isEmpty()) {
            List<Skill> storeSkills = skillRepository.findByStoreId(dto.getStoreId());
            Map<UUID, Skill> skillMap = storeSkills.stream().collect(Collectors.toMap(Skill::getId, s -> s, (a, b) -> a));
            for (StaffSkill ss : staffSkills) {
                if (skillMap.containsKey(ss.getSkillId())) {
                    Skill sk = skillMap.get(ss.getSkillId());
                    dto.setSkillId(sk.getId());
                    dto.setSkillName(sk.getName());
                    break;
                }
            }
        }
        return dto;
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
                .map(EmploymentMapper::toDTO)
                .map(this::enrichWithSkill);
    }

    @Transactional(readOnly = true)
    public List<EmploymentDTO> getStoresByStaff(UUID staffId) {
        return employmentRepository.findByUserIdAndStatus(staffId, EmploymentStatus.ACTIVE)
                .stream()
                .map(EmploymentMapper::toDTO)
                .map(this::enrichWithSkill)
                .collect(Collectors.toList());
    }
}
