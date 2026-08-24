package com.shiftsync.availability.repository;

import com.shiftsync.availability.entity.BlackoutDate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Repository
public interface BlackoutDateRepository extends JpaRepository<BlackoutDate, UUID> {
    List<BlackoutDate> findByStaffId(UUID staffId);
    
    List<BlackoutDate> findByStaffIdAndDateBetween(UUID staffId, LocalDate startDate, LocalDate endDate);

    List<BlackoutDate> findByStaffIdInAndDateBetween(List<UUID> staffIds, LocalDate startDate, LocalDate endDate);

    boolean existsByStaffIdAndDate(UUID staffId, LocalDate date);
}
