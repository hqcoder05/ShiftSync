package com.shiftsync.layout.repository;

import com.shiftsync.layout.entity.StoreZone;
import org.springframework.data.jpa.repository.JpaRepository;


import java.util.List;
import java.util.UUID;


public interface StoreZoneRepository extends JpaRepository<StoreZone, UUID> {
    List<StoreZone> findByStoreId(UUID storeId);
}
