package com.shiftsync.attendance.controller;

import com.shiftsync.attendance.dto.AdjustmentCreateRequest;
import com.shiftsync.attendance.dto.AdjustmentResponseDTO;
import com.shiftsync.attendance.service.AttendanceAdjustmentService;
import com.shiftsync.auth.entity.User;
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

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class AttendanceAdjustmentControllerTest {

    @Mock
    private AttendanceAdjustmentService service;

    @InjectMocks
    private AttendanceAdjustmentController controller;

    private CustomUserDetails staffUser;
    private CustomUserDetails managerUser;
    private UUID storeId;

    @BeforeEach
    public void setUp() {
        storeId = UUID.randomUUID();
        User staff = User.builder()
                .id(UUID.randomUUID())
                .fullName("Staff A")
                .systemRole(SystemRole.STAFF)
                .build();
        staffUser = new CustomUserDetails(staff);

        User manager = User.builder()
                .id(UUID.randomUUID())
                .fullName("Manager B")
                .systemRole(SystemRole.MANAGER)
                .build();
        managerUser = new CustomUserDetails(manager);
    }

    @Test
    public void testStaffCanCreateAdjustmentRequest() {
        AdjustmentCreateRequest request = new AdjustmentCreateRequest();
        AdjustmentResponseDTO responseDTO = AdjustmentResponseDTO.builder()
                .id(UUID.randomUUID())
                .staffId(staffUser.getId())
                .build();

        when(service.createRequest(staffUser.getId(), request)).thenReturn(responseDTO);

        ResponseEntity<AdjustmentResponseDTO> response = controller.createRequest(storeId, request, staffUser);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(staffUser.getId(), response.getBody().getStaffId());
    }

    @Test
    public void testManagerCanCreateAdjustmentRequest() {
        AdjustmentCreateRequest request = new AdjustmentCreateRequest();
        AdjustmentResponseDTO responseDTO = AdjustmentResponseDTO.builder()
                .id(UUID.randomUUID())
                .staffId(managerUser.getId())
                .build();

        when(service.createRequest(managerUser.getId(), request)).thenReturn(responseDTO);

        ResponseEntity<AdjustmentResponseDTO> response = controller.createRequest(storeId, request, managerUser);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(managerUser.getId(), response.getBody().getStaffId());
    }
}