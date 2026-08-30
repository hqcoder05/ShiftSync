package com.shiftsync.skill.repository;

import com.shiftsync.skill.entity.StaffSkill;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface StaffSkillRepository extends JpaRepository<StaffSkill, UUID> {
    List<StaffSkill> findByStaffId(UUID staffId);
    
    List<StaffSkill> findByStaffIdIn(List<UUID> staffIds);
}
