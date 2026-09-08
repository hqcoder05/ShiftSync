package com.shiftsync.skill.service;

import com.shiftsync.shared.exception.BusinessException;
import com.shiftsync.skill.dto.SkillDTO;
import com.shiftsync.skill.dto.SkillRequest;
import com.shiftsync.skill.entity.Skill;
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

    @Transactional(readOnly = true)
    public List<SkillDTO> getSkillsByStoreId(UUID storeId) {
        verifyStoreExists(storeId);
        return skillRepository.findByStoreId(storeId).stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    @Transactional
    public SkillDTO createSkill(UUID storeId, SkillRequest request) {
        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new BusinessException("Store not found", HttpStatus.NOT_FOUND));

        if (skillRepository.existsByStoreIdAndName(storeId, request.getName())) {
            throw new BusinessException("Skill name already exists in this store", HttpStatus.CONFLICT);
        }

        Skill skill = Skill.builder()
                .store(store)
                .name(request.getName())
                .description(request.getDescription())
                .build();

        return mapToDTO(skillRepository.save(skill));
    }

    @Transactional
    public SkillDTO updateSkill(UUID storeId, UUID skillId, SkillRequest request) {
        Skill skill = skillRepository.findByIdAndStoreId(skillId, storeId)
                .orElseThrow(() -> new BusinessException("Skill not found in this store", HttpStatus.NOT_FOUND));

        if (skillRepository.existsByStoreIdAndNameAndIdNot(storeId, request.getName(), skillId)) {
            throw new BusinessException("Skill name already exists in this store", HttpStatus.CONFLICT);
        }

        skill.setName(request.getName());
        skill.setDescription(request.getDescription());

        return mapToDTO(skillRepository.save(skill));
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
                .createNativeQuery("SELECT COUNT(*) FROM shift_assignment WHERE required_skill_id = :skillId AND deleted = false")
                .setParameter("skillId", skillId)
                .getSingleResult();
        if (assignCount > 0) {
            throw new BusinessException(
                "Không thể xóa vai trò này vì có " + assignCount + " nhân viên đang được phân công với vai trò này.",
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
                .build();
    }
}
