package com.shiftsync.payroll.service;

import com.shiftsync.payroll.repository.PayrollPeriodRepository;
import com.shiftsync.store.entity.Store;
import com.shiftsync.store.repository.StoreRepository;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import static org.mockito.Mockito.*;

class CompensationPeriodGuardTest {
    @Test void locksEachStoreOnceInStableOrderBeforeCheckingPeriods() {
        var periods=mock(PayrollPeriodRepository.class);
        var stores=mock(StoreRepository.class);
        UUID a=new UUID(0,1), b=new UUID(0,2);
        when(stores.findByIdForUpdate(any())).thenReturn(Optional.of(new Store()));
        new CompensationPeriodGuard(periods,stores).lockAndCheck(List.of(b,a,b),LocalDate.of(2030,1,1),null);
        var order=inOrder(stores,periods);
        order.verify(stores).findByIdForUpdate(a);
        order.verify(stores).findByIdForUpdate(b);
        order.verify(periods).existsLockedOverlappingRevision(eq(a),any(),any(),any());
        order.verify(periods).existsLockedOverlappingRevision(eq(b),any(),any(),any());
        verify(stores,times(2)).findByIdForUpdate(any());
    }
}
