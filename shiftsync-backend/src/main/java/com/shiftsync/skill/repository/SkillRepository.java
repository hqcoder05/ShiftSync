package com.shiftsync.skill.repository;

import com.shiftsync.skill.entity.Skill;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SkillRepository extends JpaRepository<Skill, UUID> {
    List<Skill> findByStoreId(UUID storeId);
    
    Optional<Skill> findByIdAndStoreId(UUID id, UUID storeId);
    
    boolean existsByStoreIdAndName(UUID storeId, String name);
    
    boolean existsByStoreIdAndNameAndIdNot(UUID storeId, String name, UUID id);
}
