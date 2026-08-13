package com.shiftsync.attendance.controller;

import com.shiftsync.attendance.dto.QrResponseDTO;
import com.shiftsync.attendance.dto.QrScanRequestDTO;
import com.shiftsync.attendance.entity.Attendance;
import com.shiftsync.attendance.service.AttendanceService;
import com.shiftsync.shared.security.CustomUserDetails;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

import io.swagger.v3.oas.annotations.tags.Tag;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@Tag(name = "Attendance API", description = "Operations for shift attendance and QR codes")
public class AttendanceController {

    private final AttendanceService attendanceService;

    @PreAuthorize("hasRole('MANAGER') and @storeAccessService.canAccessStore(authentication, #storeId)")
    @GetMapping("/stores/{storeId}/shifts/{shiftId}/attendance/qr")
    public ResponseEntity<QrResponseDTO> generateQr(
            @PathVariable UUID storeId,
            @PathVariable UUID shiftId) {
        QrResponseDTO response = attendanceService.generateQrForShift(storeId, shiftId);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/attendance/scan")
    public ResponseEntity<Attendance> scanQr(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody QrScanRequestDTO request) {
        Attendance attendance = attendanceService.scanQr(userDetails.getId(), request);
        return ResponseEntity.ok(attendance);
    }
}
