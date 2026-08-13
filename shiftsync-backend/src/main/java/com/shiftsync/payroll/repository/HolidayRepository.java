package com.shiftsync.payroll.repository;

import com.shiftsync.payroll.entity.Holiday;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Repository
public interface HolidayRepository extends JpaRepository<Holiday, UUID> {
    List<Holiday> findByHolidayDateBetween(LocalDate startDate, LocalDate endDate);
}
