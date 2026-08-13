package com.shiftsync.store.repository;

import com.shiftsync.store.entity.StoreConfiguration;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface StoreConfigurationRepository extends JpaRepository<StoreConfiguration, UUID> {
    Optional<StoreConfiguration> findByStoreId(UUID storeId);
}
