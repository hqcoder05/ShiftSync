package com.shiftsync.shift.repository;

import com.shiftsync.shift.entity.ShiftSkillRequirement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ShiftSkillRequirementRepository extends JpaRepository<ShiftSkillRequirement, UUID> {
    @org.springframework.data.jpa.repository.Query("SELECT r FROM ShiftSkillRequirement r WHERE r.shift.id = :shiftId ORDER BY r.skill.id ASC, r.id ASC")
    List<ShiftSkillRequirement> findByShiftId(@org.springframework.data.repository.query.Param("shiftId") UUID shiftId);
    Optional<ShiftSkillRequirement> findByShiftIdAndSkillId(UUID shiftId, UUID skillId);
}

