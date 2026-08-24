package com.shiftsync;

import com.shiftsync.shift.dto.AutoScheduleRequest;
import com.shiftsync.shift.service.AutoScheduleService;
import com.shiftsync.shift.repository.ShiftAssignmentRepository;
import org.springframework.boot.SpringApplication;
import org.springframework.context.ApplicationContext;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import com.shiftsync.store.repository.SchedulerConfigurationRepository;
import com.shiftsync.store.entity.SchedulerConfiguration;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;
import java.util.Properties;
import org.springframework.transaction.annotation.Transactional;

public class TestRunner {
    public static void main(String[] args) {
        SpringApplication app = new SpringApplication(ShiftsyncBackendApplication.class);
        Properties props = new Properties();
        props.put("server.port", "0");
        app.setDefaultProperties(props);
        ApplicationContext context = app.run(args);
        
        ShiftAssignmentRepository saRepo = context.getBean(ShiftAssignmentRepository.class);
        // Only delete assignments in the auto-schedule window so seed historical data remains
        saRepo.deleteAll(saRepo.findByShift_Store_IdAndShift_ShiftDateBetween(
            UUID.fromString("11111111-1111-1111-1111-111111111111"), 
            LocalDate.parse("2026-08-25"), 
            LocalDate.parse("2026-08-31")
        ));

        SchedulerConfigurationRepository repo = context.getBean(SchedulerConfigurationRepository.class);
        SchedulerConfiguration config = repo.findByStoreId(UUID.fromString("11111111-1111-1111-1111-111111111111")).get();
        config.setSkillWeight(new BigDecimal("0.300"));
        config.setFairnessWeight(new BigDecimal("0.100"));
        config.setRestTimeWeight(new BigDecimal("0.100"));
        config.setAvailabilityWeight(new BigDecimal("0.300"));
        config.setHourWeight(new BigDecimal("0.200"));
        repo.save(config);

        AutoScheduleService service = context.getBean(AutoScheduleService.class);
        AutoScheduleRequest req = new AutoScheduleRequest();
        req.setStartDate(LocalDate.parse("2026-08-25"));
        req.setEndDate(LocalDate.parse("2026-08-31"));
        
        System.out.println("----- RUNNING TEST 1 (A vs B, C vs D) -----");
        service.autoSchedule(UUID.fromString("11111111-1111-1111-1111-111111111111"), req);
        
        System.out.println("----- UPDATING WEIGHTS -----");
        saRepo.deleteAll(saRepo.findByShift_Store_IdAndShift_ShiftDateBetween(
            UUID.fromString("11111111-1111-1111-1111-111111111111"), 
            LocalDate.parse("2026-08-25"), 
            LocalDate.parse("2026-08-31")
        ));
        
        config.setSkillWeight(new BigDecimal("0.600"));
        config.setFairnessWeight(new BigDecimal("0.050"));
        config.setAvailabilityWeight(new BigDecimal("0.050"));
        repo.save(config);
        
        System.out.println("----- RUNNING TEST 2 -----");
        service.autoSchedule(UUID.fromString("11111111-1111-1111-1111-111111111111"), req);
        
        System.out.println("AUTO SCHEDULE COMPLETE");
        System.exit(0);
    }
}
