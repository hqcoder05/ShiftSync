package com.shiftsync.leave.service;

import com.shiftsync.auth.entity.User;
import com.shiftsync.auth.repository.UserRepository;
import com.shiftsync.employment.repository.EmploymentRepository;
import com.shiftsync.leave.dto.LeaveCreateRequest;
import com.shiftsync.leave.entity.LeaveRequest;
import com.shiftsync.leave.enums.LeaveStatus;
import com.shiftsync.leave.repository.LeaveRequestRepository;
import com.shiftsync.store.entity.Store;
import com.shiftsync.store.repository.StoreRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class LeaveRequestServiceTest {

    @Mock private LeaveRequestRepository leaveRequestRepository;
    @Mock private StoreRepository storeRepository;
    @Mock private UserRepository userRepository;
    @Mock private EmploymentRepository employmentRepository;
    @Mock private com.shiftsync.notification.service.NotificationService notificationService;

    @InjectMocks
    private LeaveRequestService leaveRequestService;

    private UUID storeId;
    private UUID staffId;
    private Store store;
    private User staff;

    @BeforeEach
    void setUp() {
        storeId = UUID.randomUUID();
        staffId = UUID.randomUUID();

        store = Store.builder().id(storeId).build();
        staff = User.builder().id(staffId).build();
    }

    @Test
    void testCreateLeaveRequest_Success() {
        LeaveCreateRequest request = new LeaveCreateRequest();
        request.setStartDate(LocalDate.now().plusDays(5));
        request.setEndDate(LocalDate.now().plusDays(6));
        request.setReason("Sick leave");

        when(storeRepository.findById(storeId)).thenReturn(Optional.of(store));
        when(userRepository.findById(staffId)).thenReturn(Optional.of(staff));
        when(employmentRepository.existsByUserIdAndStoreIdAndStatus(staffId, storeId, com.shiftsync.employment.enums.EmploymentStatus.ACTIVE)).thenReturn(true);
        when(leaveRequestRepository.findOverlappingRequests(staffId, request.getStartDate(), request.getEndDate())).thenReturn(List.of());

        LeaveRequest saved = LeaveRequest.builder().id(UUID.randomUUID()).store(store).staff(staff).status(LeaveStatus.PENDING).build();
        when(leaveRequestRepository.save(any())).thenReturn(saved);

        leaveRequestService.createLeaveRequest(storeId, staffId, request);
        verify(leaveRequestRepository).save(any(LeaveRequest.class));
    }

    @Test
    void testCreateLeaveRequest_OverlapFails() {
        LeaveCreateRequest request = new LeaveCreateRequest();
        request.setStartDate(LocalDate.now().plusDays(5));
        request.setEndDate(LocalDate.now().plusDays(6));
        
        when(storeRepository.findById(storeId)).thenReturn(Optional.of(store));
        when(userRepository.findById(staffId)).thenReturn(Optional.of(staff));
        when(employmentRepository.existsByUserIdAndStoreIdAndStatus(staffId, storeId, com.shiftsync.employment.enums.EmploymentStatus.ACTIVE)).thenReturn(true);
        when(leaveRequestRepository.findOverlappingRequests(staffId, request.getStartDate(), request.getEndDate()))
                .thenReturn(List.of(LeaveRequest.builder().build()));

        assertThrows(RuntimeException.class, () -> leaveRequestService.createLeaveRequest(storeId, staffId, request));
    }
}
