package com.shiftsync.workforce.repository;

import com.shiftsync.workforce.entity.WorkforceRequest;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface WorkforceRequestRepository extends JpaRepository<WorkforceRequest, UUID> {
    List<WorkforceRequest> findByTargetStoreIdOrderByCreatedAtDesc(UUID targetStoreId);
    List<WorkforceRequest> findByRequestingStoreIdOrderByCreatedAtDesc(UUID requestingStoreId);
}
