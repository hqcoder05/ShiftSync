package com.shiftsync.workforce.repository;

import com.shiftsync.workforce.entity.WorkforceRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface WorkforceRequestRepository extends JpaRepository<WorkforceRequest, UUID> {
    List<WorkforceRequest> findByTargetStoreIdOrderByCreatedAtDesc(UUID targetStoreId);
    List<WorkforceRequest> findByRequestingStoreIdOrderByCreatedAtDesc(UUID requestingStoreId);
}
