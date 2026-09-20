package com.shiftsync.availability.repository;

import com.shiftsync.availability.entity.BlackoutDate;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface BlackoutDateRepository extends JpaRepository<BlackoutDate, UUID> {
    List<BlackoutDate> findByStaffId(UUID staffId);
    
    List<BlackoutDate> findByStaffIdAndDateBetween(UUID staffId, LocalDate startDate, LocalDate endDate);

    @Query("SELECT b FROM BlackoutDate b WHERE b.staffId IN :staffIds AND b.date BETWEEN :startDate AND :endDate ORDER BY b.staffId ASC, b.date ASC, b.id ASC")
    List<BlackoutDate> findByStaffIdInAndDateBetween(@Param("staffIds") List<UUID> staffIds, @Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);

    boolean existsByStaffIdAndDate(UUID staffId, LocalDate date);

    void deleteByLeaveRequestId(UUID leaveRequestId);
}
