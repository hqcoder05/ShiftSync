package com.shiftsync.shift.repository;

import com.shiftsync.shift.entity.ShiftRegistration;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ShiftRegistrationRepository extends JpaRepository<ShiftRegistration, UUID> {
    List<ShiftRegistration> findByShiftId(UUID shiftId);
    
    Optional<ShiftRegistration> findByIdAndShiftId(UUID id, UUID shiftId);
    
    boolean existsByShiftIdAndStaffId(UUID shiftId, UUID staffId);
}
