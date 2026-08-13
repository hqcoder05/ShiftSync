package com.shiftsync;

import com.shiftsync.payroll.service.PayrollCalculationService;
import com.shiftsync.shift.service.AutoScheduleService;
import com.shiftsync.shift.dto.AutoScheduleRequest;
import com.shiftsync.store.entity.Store;
import com.shiftsync.store.repository.StoreRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.UUID;
import java.util.List;

@SpringBootTest
public class PerformanceTest {

    @Autowired
    private PayrollCalculationService payrollCalculationService;

    @Autowired
    private AutoScheduleService autoScheduleService;

    @Autowired
    private StoreRepository storeRepository;

    @Test
    @Transactional
    public void runProfiling() {
        List<Store> stores = storeRepository.findAll();
        if (stores.isEmpty()) {
            System.out.println("No stores found for profiling.");
            return;
        }

        UUID storeId = stores.get(0).getId();
        LocalDate start = LocalDate.now().withDayOfMonth(1);
        LocalDate end = start.plusDays(6);

        // 1. Profile AutoSchedule
        long startAuto = System.currentTimeMillis();
        AutoScheduleRequest req = new AutoScheduleRequest();
        req.setStartDate(start);
        req.setEndDate(end);
        
        try {
            autoScheduleService.autoSchedule(storeId, req);
        } catch (Exception e) {
            System.out.println("AutoSchedule skipped/failed: " + e.getMessage());
        }
        long endAuto = System.currentTimeMillis();
        System.out.println(">>> PROFILING AutoSchedule: " + (endAuto - startAuto) + " ms");

        // 2. Profile Payroll
        long startPayroll = System.currentTimeMillis();
        try {
            payrollCalculationService.generatePayroll(storeId, start, end);
        } catch (Exception e) {
            System.out.println("Payroll skipped/failed: " + e.getMessage());
        }
        long endPayroll = System.currentTimeMillis();
        System.out.println(">>> PROFILING Payroll: " + (endPayroll - startPayroll) + " ms");
    }
}
