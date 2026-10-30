package com.shiftsync.shift.service;

import com.shiftsync.auth.entity.User;
import com.shiftsync.shared.exception.BusinessException;
import com.shiftsync.shift.entity.Shift;
import com.shiftsync.shift.entity.ShiftAssignment;
import com.shiftsync.shift.entity.ShiftSwapRequest;
import com.shiftsync.shift.enums.ShiftStatus;
import com.shiftsync.shift.enums.SwapStatus;
import com.shiftsync.shift.repository.ShiftSwapRequestRepository;
import com.shiftsync.auth.repository.UserRepository;
import com.shiftsync.store.entity.Store;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ShiftSwapServiceQaTest {

    @Mock
    private ShiftSwapRequestRepository shiftSwapRequestRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private ShiftSwapService shiftSwapService;

    @Test
    void testManagerApproveSwapRequest_PastShift_ThrowsException() {
        UUID requestId = UUID.randomUUID();
        UUID managerId = UUID.randomUUID();

        Store store = Store.builder().id(UUID.randomUUID()).build();
        
        Shift pastShift = Shift.builder()
                .store(store)
                .shiftDate(LocalDate.now().minusDays(1)) // In the past!
                .startTime(LocalTime.of(8, 0))
                .status(ShiftStatus.PUBLISHED)
                .build();
                
        Shift futureShift = Shift.builder()
                .store(store)
                .shiftDate(LocalDate.now().plusDays(2))
                .startTime(LocalTime.of(8, 0))
                .status(ShiftStatus.PUBLISHED)
                .build();

        ShiftSwapRequest request = ShiftSwapRequest.builder()
                .id(requestId)
                .status(SwapStatus.PENDING)
                .employeeAccepted(true)
                .fromShift(pastShift)
                .toShift(futureShift)
                .build();

        when(shiftSwapRequestRepository.findById(requestId)).thenReturn(Optional.of(request));

        BusinessException ex = assertThrows(BusinessException.class, () -> {
            shiftSwapService.managerApproveSwapRequest(requestId, managerId);
        });

        assertEquals("This swap request has expired because at least one shift has already started.", ex.getMessage());
        assertEquals(SwapStatus.EXPIRED, request.getStatus());
        verify(shiftSwapRequestRepository).save(request);
    }

    @Test
    void getStoreSwapRequests_ExpiresPastPendingRequest() {
        UUID storeId = UUID.randomUUID();
        Shift pastShift = Shift.builder()
                .store(Store.builder().id(storeId).build())
                .shiftDate(LocalDate.now().minusDays(1))
                .startTime(LocalTime.of(8, 0))
                .status(ShiftStatus.PUBLISHED)
                .build();
        ShiftSwapRequest request = ShiftSwapRequest.builder()
                .id(UUID.randomUUID())
                .status(SwapStatus.PENDING)
                .fromShift(pastShift)
                .build();

        when(shiftSwapRequestRepository.findByFromShiftId_StoreId(storeId)).thenReturn(java.util.List.of(request));

        var result = shiftSwapService.getStoreSwapRequests(storeId, null);

        assertEquals(1, result.size());
        assertEquals(SwapStatus.EXPIRED, result.getFirst().getStatus());
        verify(shiftSwapRequestRepository).save(request);
    }
}
