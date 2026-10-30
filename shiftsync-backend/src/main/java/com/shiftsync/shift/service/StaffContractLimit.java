package com.shiftsync.shift.service;

import com.shiftsync.employment.entity.Employment;
import com.shiftsync.shared.exception.BusinessException;
import org.springframework.http.HttpStatus;
import java.util.Collection;

/** One person's combined hours must respect every applicable active contract. */
final class StaffContractLimit {
    private StaffContractLimit() {}
    static int weeklyHours(Collection<Employment> employments) {
        if (employments.isEmpty()) throw new BusinessException("Active employment not found for staff", HttpStatus.BAD_REQUEST);
        int limit=Integer.MAX_VALUE;
        for (Employment employment:employments) {
            Integer hours=employment.getContractType()==null ? null : employment.getContractType().getMaxWeeklyHours();
            if (hours==null || hours<=0) throw new BusinessException("Active contract must define a positive weekly hour limit",HttpStatus.BAD_REQUEST);
            limit=Math.min(limit,hours);
        }
        return limit;
    }
}
