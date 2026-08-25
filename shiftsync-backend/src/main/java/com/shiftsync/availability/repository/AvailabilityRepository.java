package com.shiftsync.availability.repository;

import com.shiftsync.availability.entity.Availability;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

public interface AvailabilityRepository extends JpaRepository<Availability, UUID> {

    List<Availability> findByUserId(UUID userId);
    
    List<Availability> findByUser_IdIn(List<UUID> userIds);

    @Query("SELECT COUNT(a) > 0 FROM Availability a " +
           "WHERE a.user.id = :staffId " +
           "AND a.dayOfWeek = :dayOfWeek " +
           "AND a.startTime < :endTime " +
           "AND a.endTime > :startTime " +
           "AND (:excludeId IS NULL OR a.id != :excludeId)")
    boolean hasOverlappingSlot(@Param("staffId") UUID staffId, 
                               @Param("dayOfWeek") Short dayOfWeek, 
                               @Param("startTime") LocalTime startTime, 
                               @Param("endTime") LocalTime endTime, 
                               @Param("excludeId") UUID excludeId);

    @Query("SELECT COUNT(a) > 0 FROM Availability a " +
           "WHERE a.user.id = :staffId " +
           "AND a.dayOfWeek = :dayOfWeek " +
           "AND a.startTime <= :startTime " +
           "AND a.endTime >= :endTime")
    boolean coversShiftTime(@Param("staffId") UUID staffId, 
                               @Param("dayOfWeek") Short dayOfWeek, 
                               @Param("startTime") LocalTime startTime, 
                               @Param("endTime") LocalTime endTime);
}
