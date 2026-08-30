package com.shiftsync.auth.repository;

import com.shiftsync.auth.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByEmail(String email);

    @Query("SELECT u FROM User u WHERE " +
           "(:search IS NULL OR LOWER(u.fullName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(u.email) LIKE LOWER(CONCAT('%', :search, '%')))")
    org.springframework.data.domain.Page<User> searchUsers(@Param("search") String search, org.springframework.data.domain.Pageable pageable);

    @Query(value = "SELECT EXISTS (" +
            "SELECT 1 FROM employment e " +
            "JOIN staff u ON e.staff_id = u.id " +
            "WHERE e.staff_id = :userId AND e.status = 'ACTIVE' AND u.system_role = 'MANAGER' " +
            "AND NOT EXISTS (" +
            "    SELECT 1 FROM employment e2 " +
            "    JOIN staff u2 ON e2.staff_id = u2.id " +
            "    WHERE e2.store_id = e.store_id AND e2.status = 'ACTIVE' AND u2.system_role = 'MANAGER' AND u2.id != :userId AND u2.deleted = false" +
            "))", nativeQuery = true)
    boolean isSoleManagerOfAnyStore(@Param("userId") UUID userId);

    @Query(value = "SELECT EXISTS (SELECT 1 FROM employment WHERE staff_id = :userId AND status = 'ACTIVE')", nativeQuery = true)
    boolean hasActiveEmployment(@Param("userId") UUID userId);

    @Query(value = "SELECT EXISTS (" +
            "SELECT 1 FROM shift_assignment sa " +
            "JOIN shift s ON sa.shift_id = s.id " +
            "WHERE sa.staff_id = :userId AND s.status = 'PUBLISHED' " +
            "AND s.shift_date >= CURRENT_DATE AND sa.deleted = false" +
            ")", nativeQuery = true)
    boolean hasFuturePublishedShifts(@Param("userId") UUID userId);
}
