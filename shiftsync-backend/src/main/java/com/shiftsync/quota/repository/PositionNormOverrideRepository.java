package com.shiftsync.quota.repository;

import com.shiftsync.quota.entity.PositionNormOverride;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface PositionNormOverrideRepository extends JpaRepository<PositionNormOverride, UUID> {
    Optional<PositionNormOverride> findByStoreIdAndSkillId(UUID storeId, UUID skillId);
}
