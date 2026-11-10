package com.shiftsync.schedulehistory.repository;

import com.shiftsync.schedulehistory.entity.ScheduleChange;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.time.LocalDate;
import java.util.*;

public interface ScheduleChangeRepository extends JpaRepository<ScheduleChange, UUID> {
    @Query("select c from ScheduleChange c where c.storeId = :storeId " +
            "and ((c.beforeDate between :startDate and :endDate) or (c.afterDate between :startDate and :endDate)) " +
            "and (:manager = true or c.employeeVisible = true) order by c.changedAt desc, c.id desc")
    List<ScheduleChange> history(@Param("storeId") UUID storeId, @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate, @Param("manager") boolean manager);
}
