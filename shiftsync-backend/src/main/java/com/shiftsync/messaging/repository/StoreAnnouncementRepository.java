package com.shiftsync.messaging.repository;

import com.shiftsync.messaging.entity.StoreAnnouncement;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface StoreAnnouncementRepository extends JpaRepository<StoreAnnouncement, UUID> {
    List<StoreAnnouncement> findByStoreIdOrderByCreatedAtDescIdDesc(UUID storeId, Pageable pageable);
}
