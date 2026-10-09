package com.shiftsync.employment.repository;

import com.shiftsync.employment.entity.Employment;
import com.shiftsync.employment.enums.EmploymentStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface EmploymentRepository extends JpaRepository<Employment, UUID> {

    List<Employment> findByUserIdAndStatus(UUID staffId, EmploymentStatus status);

    List<Employment> findByUserIdAndStoreIdAndStatus(UUID userId, UUID storeId, EmploymentStatus status);

    Page<Employment> findByStoreIdAndStatus(UUID storeId, EmploymentStatus status, Pageable pageable);

    @Query("SELECT e FROM Employment e WHERE e.store.id = :storeId AND e.status = :status ORDER BY e.user.id ASC, e.id ASC")
    List<Employment> findByStoreIdAndStatus(@Param("storeId") UUID storeId, @Param("status") EmploymentStatus status);

    long countByStoreIdAndContractTypeId(UUID storeId, UUID contractTypeId);

    long countByStoreIdAndStatus(UUID storeId, EmploymentStatus status);

    boolean existsByUserIdAndStoreIdAndStatus(UUID staffId, UUID storeId, EmploymentStatus status);

    @Query("SELECT COUNT(e) > 0 FROM Employment e " +
           "WHERE e.user.id = :staffId AND e.store.id = :storeId " +
           "AND e.status = :status")
    boolean isStaffInStore(@Param("staffId") UUID staffId, @Param("storeId") UUID storeId, @Param("status") EmploymentStatus status);
    @Query("SELECT COUNT(e1) FROM Employment e1 INNER JOIN Employment e2 ON e1.store.id = e2.store.id WHERE e1.user.id = :user1Id AND e1.status = :status AND e2.user.id = :user2Id AND e2.status = :status")
    long countSharedStores(@Param("user1Id") UUID user1Id, @Param("user2Id") UUID user2Id, @Param("status") EmploymentStatus status);
    @Query("SELECT e FROM Employment e JOIN FETCH e.user u JOIN FETCH e.store s WHERE e.status = :status AND u.systemRole = :role")
    List<Employment> findByStatusAndUserSystemRole(@Param("status") EmploymentStatus status, @Param("role") com.shiftsync.shared.security.SystemRole role);

    @Query("SELECT e FROM Employment e JOIN FETCH e.user u WHERE e.store.id = :storeId AND e.status = :status AND u.systemRole = :role")
    List<Employment> findByStoreIdAndStatusAndUserSystemRole(@Param("storeId") UUID storeId, @Param("status") EmploymentStatus status, @Param("role") com.shiftsync.shared.security.SystemRole role);

    @Query("SELECT e.store.id, COUNT(e) FROM Employment e WHERE e.status = :status GROUP BY e.store.id")
    List<Object[]> countActiveStaffGroupByStore(@Param("status") EmploymentStatus status);
}


