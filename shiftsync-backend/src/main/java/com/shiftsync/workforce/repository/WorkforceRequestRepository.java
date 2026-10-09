package com.shiftsync.workforce.repository;

import com.shiftsync.workforce.entity.WorkforceRequest;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface WorkforceRequestRepository extends JpaRepository<WorkforceRequest, UUID> {
    List<WorkforceRequest> findByTargetStoreIdOrderByCreatedAtDesc(UUID targetStoreId);
    List<WorkforceRequest> findByRequestingStoreIdOrderByCreatedAtDesc(UUID requestingStoreId);

    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("SELECT w FROM WorkforceRequest w WHERE w.id = :id")
    java.util.Optional<WorkforceRequest> findByIdForUpdate(@org.springframework.data.repository.query.Param("id") UUID id);
}
