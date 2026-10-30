package com.shiftsync.availability.repository;

import com.shiftsync.availability.entity.Availability;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface AvailabilityRepository extends JpaRepository<Availability, UUID> {

    List<Availability> findByUserId(UUID userId);
    
    @Query("SELECT a FROM Availability a WHERE a.user.id IN :userIds ORDER BY a.user.id ASC, a.dayOfWeek ASC, a.startTime ASC, a.endTime ASC, a.id ASC")
    List<Availability> findByUser_IdIn(@Param("userIds") List<UUID> userIds);

}
