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
import java.time.Duration;
import java.time.LocalDateTime;
import org.springframework.web.multipart.MultipartFile;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@Tag(name = "Attendance API", description = "Operations for shift attendance and QR codes")
public class AttendanceController {

    private final AttendanceService attendanceService;

    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER') and @storeAccessService.canAccessStore(authentication, #storeId)")
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
        return ResponseEntity.ok(toDTO(attendance));
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

    @PutMapping("/stores/{storeId}/attendance/{attendanceId}")
    @PreAuthorize("hasRole('ADMIN') or (hasRole('MANAGER') and @storeAccessService.canAccessStore(authentication, #storeId))")
    public ResponseEntity<AttendanceDTO> updateAttendance(
            @PathVariable UUID storeId,
            @PathVariable UUID attendanceId,
            @Valid @RequestBody com.shiftsync.attendance.dto.AttendanceUpdateRequest request) {
        return ResponseEntity.ok(attendanceService.updateAttendance(storeId, attendanceId, request));
    }

    @DeleteMapping("/stores/{storeId}/attendance/{attendanceId}")
    @PreAuthorize("hasRole('ADMIN') or (hasRole('MANAGER') and @storeAccessService.canAccessStore(authentication, #storeId))")
    public ResponseEntity<Void> deleteAttendance(
            @PathVariable UUID storeId,
            @PathVariable UUID attendanceId) {
        attendanceService.deleteAttendance(storeId, attendanceId);
        return ResponseEntity.noContent().build();
    }


    private AttendanceDTO toDTO(Attendance attendance) {
        Long lateMinutes = null;
        if (attendance.getStatus() == com.shiftsync.attendance.enums.AttendanceStatus.LATE
                && attendance.getCheckInTime() != null
                && attendance.getShiftAssignment().getShift().getShiftDate() != null
                && attendance.getShiftAssignment().getShift().getStartTime() != null) {
            LocalDateTime shiftStart = LocalDateTime.of(
                    attendance.getShiftAssignment().getShift().getShiftDate(),
                    attendance.getShiftAssignment().getShift().getStartTime());
            lateMinutes = Math.max(0L, Duration.between(shiftStart, attendance.getCheckInTime().toLocalDateTime()).toMinutes());
        }
        return AttendanceDTO.builder()
                .id(attendance.getId())
                .shiftAssignmentId(attendance.getShiftAssignment().getId())
                .checkInTime(attendance.getCheckInTime())
                .checkOutTime(attendance.getCheckOutTime())
                .status(attendance.getStatus())
                .lateMinutes(lateMinutes)
                .shiftId(attendance.getShiftAssignment().getShift().getId())
                .storeId(attendance.getShiftAssignment().getShift().getStore().getId())
                .storeName(attendance.getShiftAssignment().getShift().getStore().getName())
                .staffId(attendance.getShiftAssignment().getStaff().getId().toString())
                .staffName(attendance.getShiftAssignment().getStaff().getFullName())
                .zoneId(attendance.getShiftAssignment().getZone() != null ? attendance.getShiftAssignment().getZone().getId() : null)
                .zoneName(attendance.getShiftAssignment().getZone() != null ? attendance.getShiftAssignment().getZone().getName() : null)
                .workstationId(attendance.getShiftAssignment().getWorkstation() != null ? attendance.getShiftAssignment().getWorkstation().getId() : null)
                .workstationName(attendance.getShiftAssignment().getWorkstation() != null ? attendance.getShiftAssignment().getWorkstation().getName() : null)
                .shiftDate(attendance.getShiftAssignment().getShift().getShiftDate())
                .scheduledStart(attendance.getShiftAssignment().getShift().getStartTime())
                .scheduledEnd(attendance.getShiftAssignment().getShift().getEndTime())
                .build();
    }
}
