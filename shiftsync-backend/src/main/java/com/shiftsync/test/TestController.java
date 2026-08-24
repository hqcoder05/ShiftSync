package com.shiftsync.test;

import com.shiftsync.payroll.service.PayrollCalculationService;
import org.springframework.web.bind.annotation.*;
import org.springframework.beans.factory.annotation.Autowired;
import java.time.LocalDate;
import java.util.UUID;

@RestController
@RequestMapping("/api/auth/test-payroll")
public class TestController {
    
    @Autowired
    private PayrollCalculationService service;

    @PostMapping("/{storeId}")
    public String trigger(@PathVariable UUID storeId, @RequestParam String startDate, @RequestParam String endDate) {
        service.generatePayroll(storeId, LocalDate.parse(startDate), LocalDate.parse(endDate));
        return "OK";
    }
}
