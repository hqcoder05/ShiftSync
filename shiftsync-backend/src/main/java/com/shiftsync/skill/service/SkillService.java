package com.shiftsync.skill.service;

import com.shiftsync.shared.exception.BusinessException;
import com.shiftsync.skill.dto.SkillDTO;
import com.shiftsync.skill.dto.SkillRequest;
import com.shiftsync.skill.entity.Skill;
import com.shiftsync.skill.entity.StaffSkill;
import com.shiftsync.skill.repository.SkillRepository;
import com.shiftsync.skill.repository.StaffSkillRepository;
import com.shiftsync.store.entity.Store;
import com.shiftsync.store.repository.StoreRepository;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SkillService {

    private final SkillRepository skillRepository;
    private final StoreRepository storeRepository;
    private final StaffSkillRepository staffSkillRepository;
    private final EntityManager entityManager;
    private final com.shiftsync.employment.repository.EmploymentRepository employmentRepository;
    private final com.shiftsync.payroll.service.SkillCompensationScheduler compensationScheduler;
    private final com.shiftsync.payroll.service.CompensationRevisionResolver compensationRevisions;

    @Transactional(readOnly = true)
    public List<SkillDTO> getSkillsByStoreId(UUID storeId) {
        verifyStoreExists(storeId);
        return skillRepository.findByStoreId(storeId).stream()
                .map(this::mapCurrentToDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<SkillDTO> getAllSkills() {
        return skillRepository.findAll().stream()
                .map(this::mapCurrentToDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<UUID> getSkillIdsByStaffId(UUID staffId, com.shiftsync.auth.entity.User actor) {
        var allowedStores = permittedStores(staffId, actor);
        List<StaffSkill> existing = staffSkillRepository.findByStaffId(staffId);
        var visibleIds = scopedSkillIds(existing.stream().map(StaffSkill::getSkillId).toList(), allowedStores);
        return existing.stream().filter(skill -> visibleIds.contains(skill.getSkillId()))
                .map(StaffSkill::getSkillId)
                .collect(Collectors.toList());
    }

    @Transactional(isolation = org.springframework.transaction.annotation.Isolation.SERIALIZABLE)
    public void replaceStaffSkills(UUID staffId, List<UUID> newSkillIds, com.shiftsync.auth.entity.User actor) {
        var allowedStores = permittedStores(staffId, actor);
        java.util.Set<UUID> requested = new java.util.HashSet<>(newSkillIds == null ? List.of() : newSkillIds);
        if (requested.contains(null) || !scopedSkillIds(requested, allowedStores).equals(requested)) {
            throw new BusinessException("Kỹ năng không tồn tại hoặc không thuộc cửa hàng được phép quản lý", HttpStatus.BAD_REQUEST);
        }
        List<StaffSkill> existing = staffSkillRepository.findByStaffId(staffId);
        var editable = scopedSkillIds(existing.stream().map(StaffSkill::getSkillId).toList(), allowedStores);
        var remove = existing.stream().filter(skill -> editable.contains(skill.getSkillId())
                && !requested.contains(skill.getSkillId())).toList();
        if (!remove.isEmpty()) staffSkillRepository.deleteAll(remove);
        java.util.Set<UUID> existingIds = existing.stream().map(StaffSkill::getSkillId).collect(Collectors.toSet());
        var add = requested.stream().filter(id -> !existingIds.contains(id))
                .map(id -> StaffSkill.builder().staffId(staffId).skillId(id).build()).toList();
        if (!add.isEmpty()) staffSkillRepository.saveAll(add);
    }

    // null means an administrator can manage skills from every store.
    private java.util.Set<UUID> permittedStores(UUID staffId, com.shiftsync.auth.entity.User actor) {
        if (actor.getSystemRole() == com.shiftsync.shared.security.SystemRole.ADMIN) return null;
        var active = com.shiftsync.employment.enums.EmploymentStatus.ACTIVE;
        var targetStores = employmentRepository.findByUserIdAndStatus(staffId, active).stream()
                .map(e -> e.getStore().getId()).collect(Collectors.toSet());
        targetStores.retainAll(employmentRepository.findByUserIdAndStatus(actor.getId(), active).stream()
                .map(e -> e.getStore().getId()).collect(Collectors.toSet()));
        if (targetStores.isEmpty()) throw new BusinessException("Không có quyền quản lý nhân viên này", HttpStatus.FORBIDDEN);
        return targetStores;
    }

    private java.util.Set<UUID> scopedSkillIds(java.util.Collection<UUID> ids, java.util.Set<UUID> allowedStores) {
        if (ids.isEmpty()) return java.util.Set.of();
        return skillRepository.findAllById(ids).stream()
                .filter(skill -> allowedStores == null || allowedStores.contains(skill.getStore().getId()))
                .map(Skill::getId).collect(Collectors.toSet());
    }

    @Transactional
    public SkillDTO createSkill(UUID storeId, SkillRequest request) {
        if (request.getEffectiveDate() != null) {
            throw new BusinessException("Chức năng đặt ngày hiệu lực lương chưa sẵn sàng", HttpStatus.CONFLICT);
        }
        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new BusinessException("Store not found", HttpStatus.NOT_FOUND));

        if (skillRepository.existsByStoreIdAndName(storeId, request.getName())) {
            throw new BusinessException("Skill name already exists in this store", HttpStatus.CONFLICT);
        }

        java.math.BigDecimal rate = request.getHourlyRate() != null ? request.getHourlyRate() : java.math.BigDecimal.valueOf(23000);
        Skill skill = Skill.builder()
                .store(store)
                .name(request.getName())
                .description(request.getDescription())
                .hourlyRate(rate)
                .build();

        return mapToDTO(skillRepository.save(skill));
    }

    @Transactional(isolation = org.springframework.transaction.annotation.Isolation.SERIALIZABLE)
    public SkillDTO updateSkill(UUID storeId, UUID skillId, SkillRequest request) {
        Skill skill = skillRepository.findByIdAndStoreId(skillId, storeId)
                .orElseThrow(() -> new BusinessException("Skill not found in this store", HttpStatus.NOT_FOUND));

        if (skillRepository.existsByStoreIdAndNameAndIdNot(storeId, request.getName(), skillId)) {
            throw new BusinessException("Skill name already exists in this store", HttpStatus.CONFLICT);
        }

        skill.setName(request.getName());
        skill.setDescription(request.getDescription());
        java.time.LocalDate scheduled = null;
        var today = java.time.LocalDate.now(com.shiftsync.payroll.service.CompensationEffectiveDate.BUSINESS_ZONE);
        var current = compensationRevisions.requireAt("skill", skillId, today,
                com.shiftsync.payroll.service.CompensationRevisionResolver.SkillTerms.class);
        if (request.getHourlyRate() != null && (request.getEffectiveDate() != null
                || current.hourlyRate().compareTo(request.getHourlyRate()) != 0)) {
            var auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
            UUID actor = auth != null && auth.getPrincipal() instanceof com.shiftsync.shared.security.CustomUserDetails principal
                    ? principal.getId() : null;
            scheduled = compensationScheduler.schedule(storeId, skillId, request.getHourlyRate(), request.getEffectiveDate(), actor);
        }
        skillRepository.save(skill);
        SkillDTO result = mapCurrentToDTO(skill);
        if (scheduled != null) {
            result.setScheduledEffectiveDate(scheduled);
            result.setScheduledHourlyRate(request.getHourlyRate());
        }
        return result;
    }

    @Transactional
    public void deleteSkill(UUID storeId, UUID skillId) {
        Skill skill = skillRepository.findByIdAndStoreId(skillId, storeId)
                .orElseThrow(() -> new BusinessException("Skill not found in this store", HttpStatus.NOT_FOUND));

        // Check if this skill is referenced in shift requirements (future/current shifts)
        Long shiftReqCount = (Long) entityManager
                .createNativeQuery("SELECT COUNT(*) FROM shift_skill_requirement WHERE skill_id = :skillId")
                .setParameter("skillId", skillId)
                .getSingleResult();
        if (shiftReqCount > 0) {
            throw new BusinessException(
                "Không thể xóa vai trò này vì đang được sử dụng trong " + shiftReqCount + " ca làm việc. "
                    + "Hãy xóa yêu cầu ca làm trước.",
                HttpStatus.CONFLICT);
        }

        // Check if referenced in shift assignments
        Long assignCount = (Long) entityManager
                .createNativeQuery("SELECT COUNT(*) FROM shift_assignment WHERE required_skill_id = :skillId")
                .setParameter("skillId", skillId)
                .getSingleResult();
        if (assignCount > 0) {
            throw new BusinessException(
                "Không thể xóa vai trò này vì có " + assignCount + " phân công hiện tại hoặc lịch sử sử dụng vai trò.",
                HttpStatus.CONFLICT);
        }

        // Safe to delete staff_skill associations first (these are just employee profiles)
        staffSkillRepository.deleteAll(staffSkillRepository.findBySkillId(skillId));

        skillRepository.delete(skill);
    }

    private void verifyStoreExists(UUID storeId) {
        if (!storeRepository.existsById(storeId)) {
            throw new BusinessException("Store not found", HttpStatus.NOT_FOUND);
        }
    }

    private SkillDTO mapToDTO(Skill entity) {
        return SkillDTO.builder()
                .id(entity.getId())
                .storeId(entity.getStore().getId())
                .name(entity.getName())
                .description(entity.getDescription())
                .hourlyRate(entity.getHourlyRate())
                .build();
    }

    private SkillDTO mapCurrentToDTO(Skill entity) {
        var today = java.time.LocalDate.now(com.shiftsync.payroll.service.CompensationEffectiveDate.BUSINESS_ZONE);
        var result = mapToDTO(entity);
        var current = compensationRevisions.requireAt("skill", entity.getId(), today,
                com.shiftsync.payroll.service.CompensationRevisionResolver.SkillTerms.class);
        result.setHourlyRate(current.hourlyRate());
        compensationRevisions.nextEffectiveDate("skill", entity.getId(), today).ifPresent(date -> {
            result.setScheduledEffectiveDate(date);
            result.setScheduledHourlyRate(compensationRevisions.requireAt("skill", entity.getId(), date,
                    com.shiftsync.payroll.service.CompensationRevisionResolver.SkillTerms.class).hourlyRate());
        });
        return result;
    }
}
