package com.shiftsync.store.repository;

import com.shiftsync.store.entity.SchedulerConfiguration;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface SchedulerConfigurationRepository extends JpaRepository<SchedulerConfiguration, UUID> {
    Optional<SchedulerConfiguration> findByStoreId(UUID storeId);
}
