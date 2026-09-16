package com.shiftsync.layout.repository;

import com.shiftsync.layout.entity.Workstation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface WorkstationRepository extends JpaRepository<Workstation, UUID> {
    List<Workstation> findByStoreId(UUID storeId);
    List<Workstation> findByZoneId(UUID zoneId);
    void deleteByStoreId(UUID storeId);
}
