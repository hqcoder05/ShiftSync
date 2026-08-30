package com.shiftsync.store.repository;

import com.shiftsync.store.entity.SchedulerConfiguration;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface SchedulerConfigurationRepository extends JpaRepository<SchedulerConfiguration, UUID> {
    Optional<SchedulerConfiguration> findByStoreId(UUID storeId);
}
