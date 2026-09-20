package com.shiftsync.skill.repository;

import com.shiftsync.skill.entity.StaffSkill;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface StaffSkillRepository extends JpaRepository<StaffSkill, UUID> {
    List<StaffSkill> findByStaffId(UUID staffId);
    
    @Query("SELECT s FROM StaffSkill s WHERE s.staffId IN :staffIds ORDER BY s.staffId ASC, s.skillId ASC, s.id ASC")
    List<StaffSkill> findByStaffIdIn(@Param("staffIds") List<UUID> staffIds);

    boolean existsBySkillId(UUID skillId);

    List<StaffSkill> findBySkillId(UUID skillId);
}
