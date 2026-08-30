package com.shiftsync.shift.service;

import com.shiftsync.audit.service.AuditLogService;
import com.shiftsync.auth.entity.User;
import com.shiftsync.shared.exception.BusinessException;
import com.shiftsync.shift.entity.Shift;
import com.shiftsync.shift.entity.ShiftSwapRequest;
import com.shiftsync.shift.enums.SwapStatus;
import com.shiftsync.shift.repository.ShiftAssignmentRepository;
import com.shiftsync.shift.repository.ShiftSwapRequestRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ShiftSwapServiceTest {

    @Mock private ShiftSwapRequestRepository shiftSwapRequestRepository;
    @Mock private ShiftAssignmentRepository shiftAssignmentRepository;
    @Mock private ShiftValidationService shiftValidationService;
    @Mock private AuditLogService auditLogService;

    @InjectMocks
    private ShiftSwapService shiftSwapService;

    @Test
    void managerApproveSwapRequest_NotPending_ThrowsException() {
        UUID requestId = UUID.randomUUID();
        ShiftSwapRequest req = new ShiftSwapRequest();
        req.setId(requestId);
        req.setStatus(SwapStatus.APPROVED);
        
        when(shiftSwapRequestRepository.findById(requestId)).thenReturn(Optional.of(req));

        BusinessException ex = assertThrows(BusinessException.class, 
                () -> shiftSwapService.managerApproveSwapRequest(requestId, UUID.randomUUID()));
    }
}
