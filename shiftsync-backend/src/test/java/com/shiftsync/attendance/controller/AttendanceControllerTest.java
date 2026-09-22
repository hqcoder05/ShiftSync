package com.shiftsync.attendance.controller;

import com.shiftsync.attendance.dto.AttendanceDTO;
import com.shiftsync.attendance.dto.QrResponseDTO;
import com.shiftsync.attendance.entity.Attendance;
import com.shiftsync.attendance.enums.AttendanceStatus;
import com.shiftsync.attendance.service.AttendanceService;
import com.shiftsync.auth.entity.User;
import com.shiftsync.shared.security.CustomUserDetails;
import com.shiftsync.shift.entity.Shift;
import com.shiftsync.shift.entity.ShiftAssignment;
import com.shiftsync.store.entity.Store;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockMultipartFile;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class AttendanceControllerTest {

    @Mock
    private AttendanceService attendanceService;

    @InjectMocks
    private AttendanceController controller;

    @Test
    public void testGenerateQr() {
        UUID storeId = UUID.randomUUID();
        UUID shiftId = UUID.randomUUID();
        QrResponseDTO qr = new QrResponseDTO();
        qr.setQrToken("qr_code_token_123");

        when(attendanceService.generateQrForShift(storeId, shiftId)).thenReturn(qr);

        ResponseEntity<QrResponseDTO> response = controller.generateQr(storeId, shiftId);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("qr_code_token_123", response.getBody().getQrToken());
    }

    @Test
    public void testSubmitSelfieReceivesParametersAndPhotoOver1MB() throws Exception {
        UUID staffId = UUID.randomUUID();
        UUID shiftId = UUID.randomUUID();
        double latitude = 10.833931828902953;
        double longitude = 106.72873397063299;

        // Simulated real camera photo exceeding previous 1 MB (1048576 bytes) limit: 2 MB
        byte[] photoBytes = new byte[2 * 1024 * 1024];
        MockMultipartFile photo = new MockMultipartFile(
                "photo", "attendance-selfie.jpg", "image/jpeg", photoBytes);

        CustomUserDetails userDetails = mock(CustomUserDetails.class);
        when(userDetails.getId()).thenReturn(staffId);

        Store store = Store.builder().id(UUID.randomUUID()).name("Test Store").build();
        User staff = User.builder().id(staffId).fullName("Test Staff").build();
        Shift shift = Shift.builder()
                .id(shiftId)
                .store(store)
                .shiftDate(LocalDate.now())
                .startTime(LocalTime.of(8, 0))
                .endTime(LocalTime.of(16, 0))
                .build();
        ShiftAssignment assignment = ShiftAssignment.builder()
                .id(UUID.randomUUID())
                .shift(shift)
                .staff(staff)
                .build();
        Attendance attendance = Attendance.builder()
                .id(UUID.randomUUID())
                .shiftAssignment(assignment)
                .checkInTime(OffsetDateTime.now())
                .checkInLat(latitude)
                .checkInLng(longitude)
                .status(AttendanceStatus.PRESENT)
                .build();

        when(attendanceService.submitSelfie(eq(staffId), eq(shiftId), eq(latitude), eq(longitude), any(byte[].class)))
                .thenReturn(attendance);

        ResponseEntity<AttendanceDTO> response = controller.submitSelfie(userDetails, shiftId, latitude, longitude, photo);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(shiftId, response.getBody().getShiftId());
        verify(attendanceService).submitSelfie(
                eq(staffId), eq(shiftId), eq(latitude), eq(longitude), argThat(bytes -> bytes.length == 2 * 1024 * 1024));
    }
}