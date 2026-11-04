package com.shiftsync.shift.service;

import com.shiftsync.employment.entity.Employment;
import com.shiftsync.payroll.service.CompensationRevisionResolver;
import org.springframework.test.util.ReflectionTestUtils;
import static org.mockito.Mockito.*;

/** Test fixtures without a database use their explicit contract as the dated terms. */
final class TestCompensationResolver {
    private TestCompensationResolver() {}

    static AutoScheduleService install(AutoScheduleService service) {
        var resolver=mock(CompensationRevisionResolver.class);
        lenient().when(resolver.weeklyHoursForEmployment(any(),any())).thenAnswer(call -> {
            Employment employment=call.getArgument(0);
            return employment.getContractType() == null || employment.getContractType().getMaxWeeklyHours() == null
                    ? 0 : employment.getContractType().getMaxWeeklyHours();
        });
        ReflectionTestUtils.setField(service,"compensationRevisions",resolver);
        return service;
    }
}
