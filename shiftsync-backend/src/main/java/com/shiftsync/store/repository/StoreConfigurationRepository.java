package com.shiftsync.store.repository;

import com.shiftsync.store.entity.StoreConfiguration;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface StoreConfigurationRepository extends JpaRepository<StoreConfiguration, UUID> {
    Optional<StoreConfiguration> findByStoreId(UUID storeId);
}
