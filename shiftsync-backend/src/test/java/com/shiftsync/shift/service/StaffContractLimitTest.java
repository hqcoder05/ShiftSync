package com.shiftsync.shift.service;

import com.shiftsync.employment.entity.*;
import com.shiftsync.shared.exception.BusinessException;
import org.junit.jupiter.api.Test;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;

class StaffContractLimitTest {
    private Employment contract(Integer hours){return Employment.builder().contractType(ContractType.builder().maxWeeklyHours(hours).build()).build();}
    @Test void everyActiveLimitAppliesRegardlessOfRepositoryOrder(){
        assertEquals(20,StaffContractLimit.weeklyHours(List.of(contract(48),contract(20))));
        assertEquals(20,StaffContractLimit.weeklyHours(List.of(contract(20),contract(48))));
    }
    @Test void contractsAreNotAddedTogether(){assertEquals(24,StaffContractLimit.weeklyHours(List.of(contract(24),contract(24))));}
    @Test void missingActiveContractIsRejected(){assertThrows(BusinessException.class,()->StaffContractLimit.weeklyHours(List.of()));}
    @Test void missingContractTypeIsRejected(){assertThrows(BusinessException.class,()->StaffContractLimit.weeklyHours(List.of(Employment.builder().build())));}
    @Test void unknownLimitIsRejected(){assertThrows(BusinessException.class,()->StaffContractLimit.weeklyHours(List.of(contract(null))));}
    @Test void zeroOrNegativeLimitIsRejected(){
        assertThrows(BusinessException.class,()->StaffContractLimit.weeklyHours(List.of(contract(0))));
        assertThrows(BusinessException.class,()->StaffContractLimit.weeklyHours(List.of(contract(-1))));
    }
}
