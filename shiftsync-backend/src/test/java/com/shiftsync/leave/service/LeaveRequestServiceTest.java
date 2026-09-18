package com.shiftsync.leave.service;

import com.shiftsync.audit.service.AuditLogService;
import com.shiftsync.auth.entity.User;
import com.shiftsync.auth.repository.UserRepository;
import com.shiftsync.availability.repository.BlackoutDateRepository;
import com.shiftsync.employment.enums.EmploymentStatus;
import com.shiftsync.employment.repository.EmploymentRepository;
import com.shiftsync.leave.dto.LeaveApproveResponse;
import com.shiftsync.leave.dto.LeaveCreateRequest;
import com.shiftsync.leave.dto.LeaveRequestDTO;
import com.shiftsync.leave.entity.LeaveRequest;
import com.shiftsync.leave.enums.LeaveStatus;
import com.shiftsync.leave.enums.LeaveType;
import com.shiftsync.leave.repository.LeaveRequestRepository;
import com.shiftsync.notification.service.NotificationService;
import com.shiftsync.shared.exception.BusinessException;
import com.shiftsync.shared.websocket.RealtimeEventPublisher;
import com.shiftsync.shift.repository.ShiftAssignmentRepository;
import com.shiftsync.shift.repository.ShiftRepository;
import com.shiftsync.store.entity.Store;
import com.shiftsync.store.repository.StoreRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class LeaveRequestServiceTest {

    @Mock private AuditLogService auditLogService;
    @Mock private LeaveRequestRepository leaveRequestRepository;
    @Mock private UserRepository userRepository;
    @Mock private StoreRepository storeRepository;
    @Mock private EmploymentRepository employmentRepository;
    @Mock private BlackoutDateRepository blackoutDateRepository;
    @Mock private ShiftAssignmentRepository shiftAssignmentRepository;
    @Mock private ShiftRepository shiftRepository;
    @Mock private NotificationService notificationService;
    @Mock private RealtimeEventPublisher realtimeEventPublisher;

    @InjectMocks
    private LeaveRequestService leaveRequestService;

    private UUID storeId;
    private UUID staffId;
    private UUID managerId;
    private Store store;
    private User staff;
    private User manager;

    @BeforeEach
    void setUp() {
        storeId = UUID.randomUUID();
        staffId = UUID.randomUUID();
        managerId = UUID.randomUUID();

        store = Store.builder().id(storeId).name("Store A").build();
        staff = User.builder().id(staffId).fullName("Staff A").build();
        manager = User.builder().id(managerId).fullName("Manager M").build();
    }

    @Test
    void testCreateLeaveRequest_Success() {
        LeaveCreateRequest request = new LeaveCreateRequest();
        request.setLeaveType(LeaveType.ANNUAL);
        request.setStartDate(LocalDate.now().plusDays(5));
        request.setEndDate(LocalDate.now().plusDays(6));
        request.setReason("Annual leave request");

        when(storeRepository.findById(storeId)).thenReturn(Optional.of(store));
        when(userRepository.findById(staffId)).thenReturn(Optional.of(staff));
        when(employmentRepository.existsByUserIdAndStoreIdAndStatus(staffId, storeId, EmploymentStatus.ACTIVE)).thenReturn(true);
        when(leaveRequestRepository.findOverlappingRequests(staffId, request.getStartDate(), request.getEndDate())).thenReturn(List.of());

        LeaveRequest saved = LeaveRequest.builder()
                .id(UUID.randomUUID())
                .store(store)
                .staff(staff)
                .leaveType(LeaveType.ANNUAL)
                .status(LeaveStatus.PENDING)
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .reason(request.getReason())
                .build();
        when(leaveRequestRepository.save(any())).thenReturn(saved);

        LeaveRequestDTO result = leaveRequestService.createLeaveRequest(storeId, staffId, request);
        assertNotNull(result);
        assertEquals(LeaveStatus.PENDING, result.getStatus());
        assertEquals(request.getReason(), result.getReason());
        verify(leaveRequestRepository).save(any(LeaveRequest.class));
    }

    @Test
    void testCreateLeaveRequest_OverlapFails() {
        LeaveCreateRequest request = new LeaveCreateRequest();
        request.setLeaveType(LeaveType.ANNUAL);
        request.setStartDate(LocalDate.now().plusDays(5));
        request.setEndDate(LocalDate.now().plusDays(6));

        when(storeRepository.findById(storeId)).thenReturn(Optional.of(store));
        when(userRepository.findById(staffId)).thenReturn(Optional.of(staff));
        when(employmentRepository.existsByUserIdAndStoreIdAndStatus(staffId, storeId, EmploymentStatus.ACTIVE)).thenReturn(true);
        when(leaveRequestRepository.findOverlappingRequests(staffId, request.getStartDate(), request.getEndDate()))
                .thenReturn(List.of(LeaveRequest.builder().build()));

        BusinessException ex = assertThrows(BusinessException.class, () -> leaveRequestService.createLeaveRequest(storeId, staffId, request));
        assertEquals(HttpStatus.CONFLICT, ex.getStatus());
    }

    @Test
    void testCreateLeaveRequest_InvalidDateRange_Fails() {
        LeaveCreateRequest request = new LeaveCreateRequest();
        request.setLeaveType(LeaveType.ANNUAL);
        request.setStartDate(LocalDate.now().plusDays(10));
        request.setEndDate(LocalDate.now().plusDays(5)); // End before start

        when(storeRepository.findById(storeId)).thenReturn(Optional.of(store));
        when(userRepository.findById(staffId)).thenReturn(Optional.of(staff));

        BusinessException ex = assertThrows(BusinessException.class, () -> leaveRequestService.createLeaveRequest(storeId, staffId, request));
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
    }

    @Test
    void testCreateLeaveRequest_StaffNotActiveInStore_Fails() {
        LeaveCreateRequest request = new LeaveCreateRequest();
        request.setLeaveType(LeaveType.ANNUAL);
        request.setStartDate(LocalDate.now().plusDays(5));
        request.setEndDate(LocalDate.now().plusDays(6));

        when(storeRepository.findById(storeId)).thenReturn(Optional.of(store));
        when(userRepository.findById(staffId)).thenReturn(Optional.of(staff));
        when(employmentRepository.existsByUserIdAndStoreIdAndStatus(staffId, storeId, EmploymentStatus.ACTIVE)).thenReturn(false);

        BusinessException ex = assertThrows(BusinessException.class, () -> leaveRequestService.createLeaveRequest(storeId, staffId, request));
        assertEquals(HttpStatus.FORBIDDEN, ex.getStatus());
    }

    @Test
    void testApproveLeaveRequest_Success_GeneratesBlackoutDates() {
        UUID leaveId = UUID.randomUUID();
        LocalDate startDate = LocalDate.now().plusDays(3);
        LocalDate endDate = LocalDate.now().plusDays(4);

        LeaveRequest leaveRequest = LeaveRequest.builder()
                .id(leaveId)
                .store(store)
                .staff(staff)
                .leaveType(LeaveType.ANNUAL)
                .status(LeaveStatus.PENDING)
                .startDate(startDate)
                .endDate(endDate)
                .reason("Vacation")
                .build();

        when(leaveRequestRepository.findById(leaveId)).thenReturn(Optional.of(leaveRequest));
        when(userRepository.findById(managerId)).thenReturn(Optional.of(manager));
        when(leaveRequestRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(shiftAssignmentRepository.findByStaffIdAndShift_ShiftDateBetween(eq(staffId), eq(startDate), eq(endDate)))
                .thenReturn(List.of());

        LeaveApproveResponse response = leaveRequestService.approveLeaveRequest(storeId, leaveId, managerId);
        assertNotNull(response);
        assertEquals(LeaveStatus.APPROVED, response.getLeaveRequest().getStatus());
        assertEquals(staff.getFullName(), response.getLeaveRequest().getStaffName());

        // Verify blackout dates generated for 2 days
        verify(blackoutDateRepository, times(2)).save(any());
        verify(leaveRequestRepository).save(any(LeaveRequest.class));
    }

    @Test
    void testApproveLeaveRequest_NotPending_Fails() {
        UUID leaveId = UUID.randomUUID();
        LeaveRequest leaveRequest = LeaveRequest.builder()
                .id(leaveId)
                .store(store)
                .staff(staff)
                .status(LeaveStatus.APPROVED) // Already approved
                .startDate(LocalDate.now().plusDays(1))
                .endDate(LocalDate.now().plusDays(2))
                .build();

        when(leaveRequestRepository.findById(leaveId)).thenReturn(Optional.of(leaveRequest));

        BusinessException ex = assertThrows(BusinessException.class, () -> leaveRequestService.approveLeaveRequest(storeId, leaveId, managerId));
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
    }

    @Test
    void testApproveLeaveRequest_WrongStore_Fails() {
        UUID leaveId = UUID.randomUUID();
        UUID otherStoreId = UUID.randomUUID();
        Store otherStore = Store.builder().id(otherStoreId).build();

        LeaveRequest leaveRequest = LeaveRequest.builder()
                .id(leaveId)
                .store(otherStore)
                .staff(staff)
                .status(LeaveStatus.PENDING)
                .startDate(LocalDate.now().plusDays(1))
                .endDate(LocalDate.now().plusDays(2))
                .build();

        when(leaveRequestRepository.findById(leaveId)).thenReturn(Optional.of(leaveRequest));

        BusinessException ex = assertThrows(BusinessException.class, () -> leaveRequestService.approveLeaveRequest(storeId, leaveId, managerId));
        assertEquals(HttpStatus.FORBIDDEN, ex.getStatus());
    }

    @Test
    void testRejectLeaveRequest_Success() {
        UUID leaveId = UUID.randomUUID();
        LeaveRequest leaveRequest = LeaveRequest.builder()
                .id(leaveId)
                .store(store)
                .staff(staff)
                .leaveType(LeaveType.ANNUAL)
                .status(LeaveStatus.PENDING)
                .startDate(LocalDate.now().plusDays(1))
                .endDate(LocalDate.now().plusDays(2))
                .build();

        when(leaveRequestRepository.findById(leaveId)).thenReturn(Optional.of(leaveRequest));
        when(userRepository.findById(managerId)).thenReturn(Optional.of(manager));
        when(leaveRequestRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        LeaveRequestDTO response = leaveRequestService.rejectLeaveRequest(storeId, leaveId, managerId, "Staff shortage");
        assertNotNull(response);
        assertEquals(LeaveStatus.REJECTED, response.getStatus());
        assertEquals("Staff shortage", response.getRejectionReason());
        verify(leaveRequestRepository).save(any(LeaveRequest.class));
    }

    @Test
    void testCancelLeaveRequest_Success() {
        UUID leaveId = UUID.randomUUID();
        LeaveRequest leaveRequest = LeaveRequest.builder()
                .id(leaveId)
                .store(store)
                .staff(staff)
                .status(LeaveStatus.PENDING)
                .build();

        when(leaveRequestRepository.findById(leaveId)).thenReturn(Optional.of(leaveRequest));

        leaveRequestService.cancelLeaveRequest(storeId, leaveId, staffId);
        verify(leaveRequestRepository).delete(leaveRequest);
    }

    @Test
    void testCancelLeaveRequest_NotOwner_Fails() {
        UUID leaveId = UUID.randomUUID();
        UUID otherStaffId = UUID.randomUUID();
        LeaveRequest leaveRequest = LeaveRequest.builder()
                .id(leaveId)
                .store(store)
                .staff(staff)
                .status(LeaveStatus.PENDING)
                .build();

        when(leaveRequestRepository.findById(leaveId)).thenReturn(Optional.of(leaveRequest));

        BusinessException ex = assertThrows(BusinessException.class, () -> leaveRequestService.cancelLeaveRequest(storeId, leaveId, otherStaffId));
        assertEquals(HttpStatus.FORBIDDEN, ex.getStatus());
    }

    @Test
    void testGetLeaveRequests_StoreFilter() {
        LeaveRequest req1 = LeaveRequest.builder().id(UUID.randomUUID()).store(store).staff(staff).leaveType(LeaveType.ANNUAL).status(LeaveStatus.PENDING).build();
        LeaveRequest req2 = LeaveRequest.builder().id(UUID.randomUUID()).store(store).staff(staff).leaveType(LeaveType.SICK).status(LeaveStatus.APPROVED).build();

        when(leaveRequestRepository.findByStoreId(storeId)).thenReturn(List.of(req1, req2));
        when(leaveRequestRepository.findByStoreIdAndStatus(storeId, LeaveStatus.PENDING)).thenReturn(List.of(req1));

        List<LeaveRequestDTO> all = leaveRequestService.getLeaveRequests(storeId, null);
        assertEquals(2, all.size());

        List<LeaveRequestDTO> pendingOnly = leaveRequestService.getLeaveRequests(storeId, LeaveStatus.PENDING);
        assertEquals(1, pendingOnly.size());
    }

    @Test
    void testGetMyLeaveRequests() {
        LeaveRequest req1 = LeaveRequest.builder().id(UUID.randomUUID()).store(store).staff(staff).leaveType(LeaveType.ANNUAL).status(LeaveStatus.PENDING).build();
        when(leaveRequestRepository.findByStaffId(staffId)).thenReturn(List.of(req1));

        List<LeaveRequestDTO> myRequests = leaveRequestService.getMyLeaveRequests(staffId);
        assertEquals(1, myRequests.size());
        assertEquals(staffId, myRequests.get(0).getStaffId());
    }
}
