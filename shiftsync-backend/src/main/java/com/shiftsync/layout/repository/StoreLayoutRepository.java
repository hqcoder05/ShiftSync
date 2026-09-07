package com.shiftsync.layout.repository;

import com.shiftsync.layout.entity.StoreLayout;
import org.springframework.data.jpa.repository.JpaRepository;


import java.util.Optional;
import java.util.UUID;


public interface StoreLayoutRepository extends JpaRepository<StoreLayout, UUID> {
    Optional<StoreLayout> findByStoreId(UUID storeId);
}
