package com.shiftsync.layout.repository;

import com.shiftsync.layout.entity.StoreZone;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface StoreZoneRepository extends JpaRepository<StoreZone, UUID> {
    List<StoreZone> findByStoreId(UUID storeId);
}
