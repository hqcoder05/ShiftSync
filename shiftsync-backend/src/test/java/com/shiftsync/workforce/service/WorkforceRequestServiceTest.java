package com.shiftsync.workforce.service;

import com.shiftsync.auth.entity.User;
import com.shiftsync.auth.repository.UserRepository;
import com.shiftsync.shift.entity.Shift;
import com.shiftsync.shared.exception.BusinessException;
import com.shiftsync.store.entity.Store;
import com.shiftsync.workforce.dto.WorkforceProposalCreateDTO;
import com.shiftsync.workforce.entity.WorkforceRequest;
import com.shiftsync.workforce.enums.WorkforceRequestStatus;
import com.shiftsync.workforce.repository.WorkforceProposalRepository;
import com.shiftsync.workforce.repository.WorkforceRequestRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
public class WorkforceRequestServiceTest {

    @Mock
    private WorkforceRequestRepository workforceRequestRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private WorkforceRequestService workforceRequestService;

    @Test
    void testProposeStaff_ActorNotFoundThrowsBusinessException() {
        UUID requestId = UUID.randomUUID();
        UUID actorId = UUID.randomUUID();
        WorkforceProposalCreateDTO dto = new WorkforceProposalCreateDTO();
        dto.setStaffId(UUID.randomUUID());

        WorkforceRequest request = new WorkforceRequest();
        request.setStatus(WorkforceRequestStatus.PENDING);
        com.shiftsync.store.entity.Store targetStore = new com.shiftsync.store.entity.Store();
        UUID targetStoreId = UUID.randomUUID();
        targetStore.setId(targetStoreId);
        request.setTargetStore(targetStore);

        when(workforceRequestRepository.findById(requestId)).thenReturn(Optional.of(request));
        
        User staff = new User();
        when(userRepository.findById(dto.getStaffId())).thenReturn(Optional.of(staff));

        when(userRepository.findById(actorId)).thenReturn(Optional.empty());

        BusinessException ex = assertThrows(BusinessException.class, () -> 
                workforceRequestService.proposeStaff(targetStoreId, requestId, dto, actorId)
        );
        assertEquals("Actor not found", ex.getMessage());
        assertEquals(HttpStatus.NOT_FOUND, ex.getStatus());
    }

    @Test
    void getOutgoingRequests_ExpiresPastPendingRequest() {
        UUID requestingStoreId = UUID.randomUUID();
        Store requestingStore = new Store();
        requestingStore.setId(requestingStoreId);
        requestingStore.setName("Cửa hàng gửi yêu cầu");
        Store targetStore = new Store();
        targetStore.setId(UUID.randomUUID());
        targetStore.setName("Cửa hàng hỗ trợ");

        Shift pastShift = new Shift();
        pastShift.setId(UUID.randomUUID());
        pastShift.setShiftDate(LocalDate.now().minusDays(1));
        pastShift.setStartTime(LocalTime.of(8, 0));
        pastShift.setEndTime(LocalTime.of(16, 0));

        User creator = new User();
        creator.setId(UUID.randomUUID());
        creator.setFullName("Quản lý cửa hàng");

        WorkforceRequest request = new WorkforceRequest();
        request.setId(UUID.randomUUID());
        request.setRequestingStore(requestingStore);
        request.setTargetStore(targetStore);
        request.setShift(pastShift);
        request.setCreatedBy(creator);
        request.setNeededCount(1);
        request.setStatus(WorkforceRequestStatus.PENDING);

        when(workforceRequestRepository.findByRequestingStoreIdOrderByCreatedAtDesc(requestingStoreId))
                .thenReturn(List.of(request));

        var result = workforceRequestService.getOutgoingRequests(requestingStoreId);

        assertEquals(WorkforceRequestStatus.EXPIRED, result.getFirst().getStatus());
        verify(workforceRequestRepository).save(request);
    }
}
