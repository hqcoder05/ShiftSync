package com.shiftsync.payroll.repository;

import com.shiftsync.payroll.entity.Holiday;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface HolidayRepository extends JpaRepository<Holiday, UUID> {
    List<Holiday> findByHolidayDateBetween(LocalDate startDate, LocalDate endDate);
}
