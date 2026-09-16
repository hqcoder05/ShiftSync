package com.shiftsync.request.controller;

import com.shiftsync.auth.entity.User;
import com.shiftsync.request.dto.StaffRequestCreateDTO;
import com.shiftsync.request.dto.StaffRequestDTO;
import com.shiftsync.request.dto.StaffRequestStatusUpdateDTO;
import com.shiftsync.request.enums.RequestStatus;
import com.shiftsync.request.service.StaffRequestService;
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
import org.springframework.security.access.AccessDeniedException;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class StaffRequestControllerTest {

    @Mock
    private StaffRequestService staffRequestService;

    @InjectMocks
    private StaffRequestController controller;

    private CustomUserDetails staffUser;
    private CustomUserDetails managerUser;

    @BeforeEach
    public void setUp() {
        User staff = User.builder()
                .id(UUID.randomUUID())
                .fullName("Nguyen Van A")
                .email("staff@test.com")
                .systemRole(SystemRole.STAFF)
                .build();
        staffUser = new CustomUserDetails(staff);

        User manager = User.builder()
                .id(UUID.randomUUID())
                .fullName("Tran Van B")
                .email("manager@test.com")
                .systemRole(SystemRole.MANAGER)
                .build();
        managerUser = new CustomUserDetails(manager);
    }

    @Test
    public void testStaffCanCreateRequest_Returns201() {
        StaffRequestCreateDTO createDTO = new StaffRequestCreateDTO();
        createDTO.setRequestType("Yêu cầu nghỉ");
        createDTO.setContent("Xin nghỉ phép");
        createDTO.setStartDate(LocalDate.now());
        createDTO.setEndDate(LocalDate.now());

        StaffRequestDTO responseDTO = StaffRequestDTO.builder()
                .id(UUID.randomUUID())
                .requesterName("Nguyen Van A")
                .requestType("Yêu cầu nghỉ")
                .status(RequestStatus.PENDING)
                .build();

        when(staffRequestService.createRequest(any(StaffRequestCreateDTO.class))).thenReturn(responseDTO);

        ResponseEntity<StaffRequestDTO> response = controller.createRequest(staffUser, createDTO);

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("Nguyen Van A", createDTO.getRequesterName());
        verify(staffRequestService, times(1)).createRequest(createDTO);
    }

    @Test
    public void testStaffCanGetOwnRequests_FiltersByStaffName() {
        when(staffRequestService.getAllRequests(isNull(), isNull(), isNull(), eq("Nguyen Van A")))
                .thenReturn(List.of(StaffRequestDTO.builder().requesterName("Nguyen Van A").build()));

        ResponseEntity<List<StaffRequestDTO>> response = controller.getAllRequests(staffUser, null, null, null);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(1, response.getBody().size());
        assertEquals("Nguyen Van A", response.getBody().get(0).getRequesterName());
    }

    @Test
    public void testManagerCanGetAllRequests_WithoutFilter() {
        when(staffRequestService.getAllRequests(isNull(), isNull(), isNull(), isNull()))
                .thenReturn(List.of(
                        StaffRequestDTO.builder().requesterName("Nguyen Van A").build(),
                        StaffRequestDTO.builder().requesterName("Le Van C").build()
                ));

        ResponseEntity<List<StaffRequestDTO>> response = controller.getAllRequests(managerUser, null, null, null);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(2, response.getBody().size());
    }

    @Test
    public void testStaffCanGetOwnRequestById_Returns200() {
        UUID requestId = UUID.randomUUID();
        StaffRequestDTO dto = StaffRequestDTO.builder()
                .id(requestId)
                .requesterName("Nguyen Van A")
                .requestType("Yêu cầu đổi ca")
                .build();

        when(staffRequestService.getRequestById(requestId)).thenReturn(dto);

        ResponseEntity<StaffRequestDTO> response = controller.getRequestById(staffUser, requestId);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("Nguyen Van A", response.getBody().getRequesterName());
    }

    @Test
    public void testStaffCannotGetOtherStaffRequestById_ThrowsAccessDenied() {
        UUID requestId = UUID.randomUUID();
        StaffRequestDTO dto = StaffRequestDTO.builder()
                .id(requestId)
                .requesterName("Other Staff")
                .requestType("Yêu cầu đổi ca")
                .build();

        when(staffRequestService.getRequestById(requestId)).thenReturn(dto);

        AccessDeniedException ex = assertThrows(AccessDeniedException.class, () -> {
            controller.getRequestById(staffUser, requestId);
        });

        assertEquals("You can only view your own requests", ex.getMessage());
    }

    @Test
    public void testManagerCanGetAnyStaffRequestById_Returns200() {
        UUID requestId = UUID.randomUUID();
        StaffRequestDTO dto = StaffRequestDTO.builder()
                .id(requestId)
                .requesterName("Other Staff")
                .requestType("Yêu cầu đổi ca")
                .build();

        when(staffRequestService.getRequestById(requestId)).thenReturn(dto);

        ResponseEntity<StaffRequestDTO> response = controller.getRequestById(managerUser, requestId);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("Other Staff", response.getBody().getRequesterName());
    }

    @Test
    public void testManagerCanUpdateStatus_Returns200() {
        UUID requestId = UUID.randomUUID();
        StaffRequestStatusUpdateDTO updateDTO = new StaffRequestStatusUpdateDTO();
        updateDTO.setStatus(RequestStatus.APPROVED);

        StaffRequestDTO updatedDTO = StaffRequestDTO.builder()
                .id(requestId)
                .status(RequestStatus.APPROVED)
                .build();

        when(staffRequestService.updateRequestStatus(requestId, RequestStatus.APPROVED)).thenReturn(updatedDTO);

        ResponseEntity<StaffRequestDTO> response = controller.updateStatus(requestId, updateDTO);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(RequestStatus.APPROVED, response.getBody().getStatus());
    }
}