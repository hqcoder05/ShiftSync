package com.shiftsync.attendance.controller;

import com.shiftsync.attendance.dto.QrResponseDTO;
import com.shiftsync.attendance.dto.QrScanRequestDTO;
import com.shiftsync.attendance.dto.AttendanceDTO;
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
import java.util.List;
import java.time.LocalDate;
import org.springframework.web.multipart.MultipartFile;

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
    public ResponseEntity<AttendanceDTO> scanQr(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody QrScanRequestDTO request) {
        Attendance attendance = attendanceService.scanQr(userDetails.getId(), request);
        AttendanceDTO dto = AttendanceDTO.builder()
                .id(attendance.getId())
                .shiftAssignmentId(attendance.getShiftAssignment().getId())
                .checkInTime(attendance.getCheckInTime())
                .checkOutTime(attendance.getCheckOutTime())
                .status(attendance.getStatus())
                .build();
        return ResponseEntity.ok(dto);
    }

    @PostMapping(value = "/attendance/selfie", consumes = "multipart/form-data")
    public ResponseEntity<AttendanceDTO> submitSelfie(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam UUID shiftId,
            @RequestParam double latitude,
            @RequestParam double longitude,
            @RequestPart("photo") MultipartFile photo) throws java.io.IOException {
        Attendance attendance = attendanceService.submitSelfie(
                userDetails.getId(), shiftId, latitude, longitude, photo.getBytes());
        return ResponseEntity.ok(toDTO(attendance));
    }

    @GetMapping("/attendance/me")
    public ResponseEntity<List<AttendanceDTO>> getMyAttendance(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(attendanceService.getMyAttendance(userDetails.getId()));
    }

    @GetMapping("/stores/{storeId}/attendance")
    @PreAuthorize("hasRole('ADMIN') or (hasRole('MANAGER') and @storeAccessService.canAccessStore(authentication, #storeId))")
    public ResponseEntity<List<AttendanceDTO>> getStoreAttendance(
            @PathVariable UUID storeId,
            @RequestParam(required = false) LocalDate from,
            @RequestParam(required = false) LocalDate to) {
        LocalDate end = to == null ? LocalDate.now() : to;
        LocalDate start = from == null ? end.withDayOfMonth(1) : from;
        return ResponseEntity.ok(attendanceService.getStoreAttendance(storeId, start, end));
    }

    private AttendanceDTO toDTO(Attendance attendance) {
        return AttendanceDTO.builder()
                .id(attendance.getId())
                .shiftAssignmentId(attendance.getShiftAssignment().getId())
                .checkInTime(attendance.getCheckInTime())
                .checkOutTime(attendance.getCheckOutTime())
                .status(attendance.getStatus())
                .build();
    }
}
