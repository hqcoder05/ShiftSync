package com.shiftsync.auth.repository;

import com.shiftsync.auth.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByEmail(String email);

    @Query("SELECT u FROM User u WHERE " +
           "(:search IS NULL OR LOWER(u.fullName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(u.email) LIKE LOWER(CONCAT('%', :search, '%')))")
    org.springframework.data.domain.Page<User> searchUsers(@Param("search") String search, org.springframework.data.domain.Pageable pageable);

    @Query(value = "SELECT EXISTS (" +
                   "SELECT 1 FROM employment WHERE staff_id = :userId " +
                   "UNION ALL " +
                   "SELECT 1 FROM shift_assignment WHERE staff_id = :userId " +
                   "UNION ALL " +
                   "SELECT 1 FROM leave_request WHERE staff_id = :userId " +
                   "UNION ALL " +
                   "SELECT 1 FROM availability WHERE staff_id = :userId " +
                   "UNION ALL " +
                   "SELECT 1 FROM blackout_date WHERE staff_id = :userId " +
                   "UNION ALL " +
                   "SELECT 1 FROM shift_registration WHERE staff_id = :userId " +
                   "UNION ALL " +
                   "SELECT 1 FROM notification WHERE staff_id = :userId " +
                   "UNION ALL " +
                   "SELECT 1 FROM audit_log WHERE actor_staff_id = :userId " +
                   "UNION ALL " +
                   "SELECT 1 FROM attendance_adjustment_request WHERE staff_id = :userId" +
                   ")", nativeQuery = true)
    boolean hasRelatedRecords(@Param("userId") UUID userId);
}
