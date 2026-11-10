package com.shiftsync.availability.repository;

import com.shiftsync.availability.entity.AvailabilityWeek;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AvailabilityWeekRepository extends JpaRepository<AvailabilityWeek, UUID> {
    Optional<AvailabilityWeek> findByUserIdAndWeekStart(UUID userId, LocalDate weekStart);
    List<AvailabilityWeek> findByUserIdInAndWeekStartBetween(List<UUID> userIds, LocalDate start, LocalDate end);
}
