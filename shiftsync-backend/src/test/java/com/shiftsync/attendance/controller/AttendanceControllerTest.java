package com.shiftsync.attendance.controller;

import com.shiftsync.attendance.dto.QrResponseDTO;
import com.shiftsync.attendance.service.AttendanceService;
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
}