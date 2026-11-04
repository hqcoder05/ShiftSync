package com.shiftsync.payroll.service;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
public class PayrollGlobalInputGuard {
    private final JdbcTemplate jdbc;

    @Transactional(propagation = org.springframework.transaction.annotation.Propagation.MANDATORY)
    public void lock() {
        if (jdbc.update("UPDATE payroll_global_input_guard SET version=version+1 WHERE id=1") != 1) {
            throw new IllegalStateException("Không thể khóa dữ liệu lương dùng chung");
        }
    }
}
