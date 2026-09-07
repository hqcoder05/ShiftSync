package com.shiftsync.workforce.repository;

import com.shiftsync.workforce.entity.WorkforceProposal;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface WorkforceProposalRepository extends JpaRepository<WorkforceProposal, UUID> {
    List<WorkforceProposal> findByStaffIdOrderByCreatedAtDesc(UUID staffId);
}
