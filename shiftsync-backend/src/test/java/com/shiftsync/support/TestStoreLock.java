package com.shiftsync.support;

import com.shiftsync.shift.service.ShiftAssignmentService;
import com.shiftsync.store.entity.Store;
import com.shiftsync.store.repository.StoreRepository;
import java.util.Optional;
import org.springframework.test.util.ReflectionTestUtils;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

public final class TestStoreLock {
    private TestStoreLock() {}
    public static ShiftAssignmentService install(ShiftAssignmentService service) {
        var stores=mock(StoreRepository.class);
        lenient().when(stores.findByIdForUpdate(any())).thenAnswer(call ->
                Optional.of(Store.builder().id(call.getArgument(0)).build()));
        ReflectionTestUtils.setField(service,"storeRepository",stores);
        return service;
    }
    public static com.shiftsync.attendance.service.AttendanceService installAttendance(com.shiftsync.attendance.service.AttendanceService service) {
        var stores=mock(StoreRepository.class);
        lenient().when(stores.findByIdForUpdate(any())).thenAnswer(call -> Optional.of(Store.builder().id(call.getArgument(0)).build()));
        ReflectionTestUtils.setField(service,"payrollStores",stores);
        return service;
    }
    public static void installAdjustment(com.shiftsync.attendance.service.AttendanceAdjustmentService service) {
        var stores=mock(StoreRepository.class);
        lenient().when(stores.findByIdForUpdate(any())).thenAnswer(call -> Optional.of(Store.builder().id(call.getArgument(0)).build()));
        ReflectionTestUtils.setField(service,"payrollStores",stores);
    }
    public static com.shiftsync.layout.service.SpatialAllocationService installSpatial(com.shiftsync.layout.service.SpatialAllocationService service) {
        var stores=mock(StoreRepository.class);
        lenient().when(stores.findByIdForUpdate(any())).thenAnswer(call -> Optional.of(Store.builder().id(call.getArgument(0)).build()));
        ReflectionTestUtils.setField(service,"payrollStores",stores);
        ReflectionTestUtils.setField(service,"payrollPeriods",mock(com.shiftsync.payroll.repository.PayrollPeriodRepository.class));
        return service;
    }
    public static com.shiftsync.marketplace.service.MarketplaceService installMarketplace(com.shiftsync.marketplace.service.MarketplaceService service) {
        var stores=mock(StoreRepository.class);
        lenient().when(stores.findByIdForUpdate(any())).thenAnswer(call -> Optional.of(Store.builder().id(call.getArgument(0)).build()));
        ReflectionTestUtils.setField(service,"payrollStores",stores);
        return service;
    }
}
