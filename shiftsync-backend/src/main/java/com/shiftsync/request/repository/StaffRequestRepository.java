package com.shiftsync.request.repository;

import com.shiftsync.request.entity.StaffRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface StaffRequestRepository extends JpaRepository<StaffRequest, UUID> {

    List<StaffRequest> findAllByOrderByCreatedAtDesc();

    List<StaffRequest> findByStatusOrderByCreatedAtDesc(String status);

    List<StaffRequest> findByTypeCategoryOrderByCreatedAtDesc(String typeCategory);
}
