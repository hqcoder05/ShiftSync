package com.shiftsync.leave.controller;

import com.shiftsync.auth.entity.User;
import com.shiftsync.leave.dto.*;
import com.shiftsync.leave.enums.LeaveStatus;
import com.shiftsync.leave.enums.LeaveType;
import com.shiftsync.leave.service.LeaveRequestService;
import com.shiftsync.shared.security.CustomUserDetails;
import com.shiftsync.shared.security.SystemRole;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class LeaveRequestControllerTest {

    @Mock
    private LeaveRequestService leaveRequestService;

    @Mock
    private com.shiftsync.leave.service.LeaveBalanceService leaveBalanceService;

    @InjectMocks
    private LeaveRequestController leaveRequestController;

    private CustomUserDetails staffUser;
    private CustomUserDetails managerUser;
    private UUID storeId;

    @BeforeEach
    public void setUp() {
        storeId = UUID.randomUUID();
        User staff = User.builder()
                .id(UUID.randomUUID())
                .fullName("Staff Nguyen")
                .systemRole(SystemRole.STAFF)
                .build();
        staffUser = new CustomUserDetails(staff);

        User manager = User.builder()
                .id(UUID.randomUUID())
                .fullName("Manager Alice")
                .systemRole(SystemRole.MANAGER)
                .build();
        managerUser = new CustomUserDetails(manager);
    }

    @Test
    public void testStaffCanCreateLeaveRequest() {
        LeaveCreateRequest request = new LeaveCreateRequest();
        request.setLeaveType(LeaveType.ANNUAL);
        request.setStartDate(LocalDate.now().plusDays(3));
        request.setEndDate(LocalDate.now().plusDays(4));
        request.setReason("Vacation");

        LeaveRequestDTO responseDTO = LeaveRequestDTO.builder()
                .id(UUID.randomUUID())
                .staffId(staffUser.getId())
                .storeId(storeId)
                .leaveType(LeaveType.ANNUAL)
                .status(LeaveStatus.PENDING)
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .reason(request.getReason())
                .build();

        when(leaveRequestService.createLeaveRequest(eq(storeId), eq(staffUser.getId()), eq(request)))
                .thenReturn(responseDTO);

        ResponseEntity<LeaveRequestDTO> response = leaveRequestController.createLeaveRequest(storeId, staffUser, request);

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(LeaveStatus.PENDING, response.getBody().getStatus());
        assertEquals(staffUser.getId(), response.getBody().getStaffId());
        verify(leaveRequestService, times(1)).createLeaveRequest(storeId, staffUser.getId(), request);
    }

    @Test
    public void testManagerCanGetStoreLeaveRequests() {
        LeaveRequestDTO r1 = LeaveRequestDTO.builder().id(UUID.randomUUID()).storeId(storeId).status(LeaveStatus.PENDING).build();
        when(leaveRequestService.getLeaveRequests(storeId, LeaveStatus.PENDING)).thenReturn(List.of(r1));

        ResponseEntity<List<LeaveRequestDTO>> response = leaveRequestController.getLeaveRequests(storeId, LeaveStatus.PENDING);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(1, response.getBody().size());
        assertEquals(LeaveStatus.PENDING, response.getBody().get(0).getStatus());
    }

    @Test
    public void testStaffCanGetMyLeaveRequests() {
        LeaveRequestDTO r1 = LeaveRequestDTO.builder().id(UUID.randomUUID()).staffId(staffUser.getId()).build();
        when(leaveRequestService.getMyLeaveRequests(staffUser.getId())).thenReturn(List.of(r1));

        ResponseEntity<List<LeaveRequestDTO>> response = leaveRequestController.getMyLeaveRequests(staffUser);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(1, response.getBody().size());
        assertEquals(staffUser.getId(), response.getBody().get(0).getStaffId());
    }

    @Test
    public void testManagerCanApproveLeaveRequest() {
        UUID leaveId = UUID.randomUUID();
        LeaveApproveResponse approveResponse = LeaveApproveResponse.builder()
                .leaveRequest(LeaveRequestDTO.builder().id(leaveId).status(LeaveStatus.APPROVED).build())
                .warning(null)
                .build();

        when(leaveRequestService.approveLeaveRequest(storeId, leaveId, managerUser.getId())).thenReturn(approveResponse);

        ResponseEntity<LeaveApproveResponse> response = leaveRequestController.approveLeaveRequest(storeId, leaveId, managerUser);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(LeaveStatus.APPROVED, response.getBody().getLeaveRequest().getStatus());
    }

    @Test
    public void testManagerCanRejectLeaveRequest() {
        UUID leaveId = UUID.randomUUID();
        LeaveRejectRequest rejectRequest = new LeaveRejectRequest();
        rejectRequest.setReason("Store too busy");

        LeaveRequestDTO rejectResponse = LeaveRequestDTO.builder()
                .id(leaveId)
                .status(LeaveStatus.REJECTED)
                .rejectionReason("Store too busy")
                .build();

        when(leaveRequestService.rejectLeaveRequest(storeId, leaveId, managerUser.getId(), "Store too busy"))
                .thenReturn(rejectResponse);

        ResponseEntity<LeaveRequestDTO> response = leaveRequestController.rejectLeaveRequest(storeId, leaveId, rejectRequest, managerUser);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(LeaveStatus.REJECTED, response.getBody().getStatus());
        assertEquals("Store too busy", response.getBody().getRejectionReason());
    }

    @Test
    public void testStaffCanCancelLeaveRequest() {
        UUID leaveId = UUID.randomUUID();
        doNothing().when(leaveRequestService).cancelLeaveRequest(storeId, leaveId, staffUser.getId());

        ResponseEntity<Void> response = leaveRequestController.cancelLeaveRequest(storeId, leaveId, staffUser);

        assertEquals(HttpStatus.NO_CONTENT, response.getStatusCode());
        verify(leaveRequestService, times(1)).cancelLeaveRequest(storeId, leaveId, staffUser.getId());
    }

    @Test
    public void testGetLeaveTypes() {
        LeaveTypeDTO type = LeaveTypeDTO.builder().code(LeaveType.ANNUAL).name("Nghỉ phép năm").build();
        when(leaveBalanceService.getLeaveTypes()).thenReturn(List.of(type));

        ResponseEntity<List<LeaveTypeDTO>> response = leaveRequestController.getLeaveTypes(storeId);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(1, response.getBody().size());
        assertEquals("Nghỉ phép năm", response.getBody().get(0).getName());
    }

    @Test
    public void testGetMyLeaveBalance() {
        LeaveBalanceDTO balance = LeaveBalanceDTO.builder()
                .staffId(staffUser.getId())
                .annualEntitlement(12)
                .usedDays(2)
                .remainingDays(10)
                .build();
        when(leaveBalanceService.getMyBalance(storeId, staffUser.getId(), 2026)).thenReturn(balance);

        ResponseEntity<LeaveBalanceDTO> response = leaveRequestController.getMyLeaveBalance(storeId, 2026, staffUser);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(10, response.getBody().getRemainingDays());
    }

    @Test
    public void testGetStoreLeaveBalances() {
        LeaveBalanceDTO balance = LeaveBalanceDTO.builder().storeId(storeId).annualEntitlement(12).build();
        when(leaveBalanceService.getStoreBalances(storeId, 2026)).thenReturn(List.of(balance));

        ResponseEntity<List<LeaveBalanceDTO>> response = leaveRequestController.getStoreLeaveBalances(storeId, 2026);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(1, response.getBody().size());
    }
}
