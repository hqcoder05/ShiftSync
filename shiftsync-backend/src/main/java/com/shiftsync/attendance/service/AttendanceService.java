package com.shiftsync.attendance.service;

import com.shiftsync.attendance.dto.QrResponseDTO;
import com.shiftsync.attendance.dto.QrScanRequestDTO;
import com.shiftsync.attendance.entity.Attendance;
import com.shiftsync.attendance.enums.AttendanceStatus;
import com.shiftsync.attendance.repository.AttendanceRepository;
import com.shiftsync.shared.security.JwtTokenProvider;
import com.shiftsync.shift.entity.Shift;
import com.shiftsync.shift.entity.ShiftAssignment;
import com.shiftsync.shift.repository.ShiftAssignmentRepository;
import com.shiftsync.shift.repository.ShiftRepository;
import com.shiftsync.store.entity.StoreConfiguration;
import com.shiftsync.store.repository.StoreConfigurationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;
import java.util.List;
import java.time.LocalDate;
import java.util.Base64;

@Service
@RequiredArgsConstructor
public class AttendanceService {

    private final AttendanceRepository attendanceRepository;
    private final ShiftAssignmentRepository shiftAssignmentRepository;
    private final ShiftRepository shiftRepository;
    private final StoreConfigurationRepository storeConfigurationRepository;
    private final JwtTokenProvider jwtTokenProvider;

    private static final long QR_EXPIRATION_MS = 5 * 60 * 1000; // 5 minutes

    public QrResponseDTO generateQrForShift(UUID storeId, UUID shiftId) {
        Shift shift = shiftRepository.findById(shiftId)
                .orElseThrow(() -> new IllegalArgumentException("Shift not found"));

        if (!shift.getStore().getId().equals(storeId)) {
            throw new IllegalArgumentException("Shift does not belong to the specified store");
        }

        String token = jwtTokenProvider.generateQrToken(shiftId.toString(), QR_EXPIRATION_MS);
        return new QrResponseDTO(token, QR_EXPIRATION_MS);
    }

    @Transactional
    public Attendance scanQr(UUID staffId, QrScanRequestDTO request) {
        // Validate and extract shiftId
        String shiftIdStr = jwtTokenProvider.getShiftIdFromQrToken(request.getQrToken());
        UUID shiftId = UUID.fromString(shiftIdStr);

        ShiftAssignment assignment = shiftAssignmentRepository.findByShiftIdAndStaffId(shiftId, staffId)
                .orElseThrow(() -> new IllegalArgumentException("You are not assigned to this shift"));

        Shift shift = assignment.getShift();
        StoreConfiguration config = storeConfigurationRepository.findByStoreId(shift.getStore().getId())
                .orElseGet(StoreConfiguration::new); // Use default config if not found

        // Geofencing Validation
        if (shift.getStore().getLatitude() == null || shift.getStore().getLongitude() == null) {
            throw new IllegalStateException("Store GPS coordinates are not configured. Cannot perform geofence validation.");
        }

        validateGeofence(shift, config, request.getLatitude(), request.getLongitude());

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime shiftStart = LocalDateTime.of(shift.getShiftDate(), shift.getStartTime());
        LocalDateTime shiftEnd = LocalDateTime.of(shift.getShiftDate(), shift.getEndTime());

        // Handle overnight shifts
        if (shiftEnd.isBefore(shiftStart)) {
            shiftEnd = shiftEnd.plusDays(1);
        }

        Optional<Attendance> existingAttendanceOpt = attendanceRepository.findByShiftAssignmentId(assignment.getId());

        if (existingAttendanceOpt.isEmpty()) {
            return processCheckIn(assignment, shiftStart, now, config, request.getLatitude(), request.getLongitude(), null);
        } else {
            Attendance attendance = existingAttendanceOpt.get();
            if (attendance.getCheckOutTime() != null) {
                throw new IllegalStateException("You have already checked out for this shift.");
            }
            return processCheckOut(attendance, shiftEnd, now, config, request.getLatitude(), request.getLongitude(), null);
        }
    }

    @Transactional
    public Attendance submitSelfie(UUID staffId, UUID shiftId, double latitude, double longitude, byte[] photo) {
        if (photo == null || photo.length == 0) {
            throw new IllegalArgumentException("A live selfie is required to record attendance.");
        }
        ShiftAssignment assignment = shiftAssignmentRepository.findByShiftIdAndStaffId(shiftId, staffId)
                .orElseThrow(() -> new IllegalArgumentException("You are not assigned to this shift"));
        Shift shift = assignment.getShift();
        StoreConfiguration config = storeConfigurationRepository.findByStoreId(shift.getStore().getId())
                .orElseGet(StoreConfiguration::new);
        validateGeofence(shift, config, latitude, longitude);

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime shiftStart = LocalDateTime.of(shift.getShiftDate(), shift.getStartTime());
        LocalDateTime shiftEnd = LocalDateTime.of(shift.getShiftDate(), shift.getEndTime());
        if (shiftEnd.isBefore(shiftStart)) shiftEnd = shiftEnd.plusDays(1);

        Optional<Attendance> existing = attendanceRepository.findByShiftAssignmentId(assignment.getId());
        if (existing.isEmpty()) return processCheckIn(assignment, shiftStart, now, config, latitude, longitude, photo);
        if (existing.get().getCheckOutTime() != null) throw new IllegalStateException("You have already checked out for this shift.");
        return processCheckOut(existing.get(), shiftEnd, now, config, latitude, longitude, photo);
    }

    private Attendance processCheckIn(ShiftAssignment assignment, LocalDateTime shiftStart, LocalDateTime now, StoreConfiguration config, Double latitude, Double longitude, byte[] photo) {
        // Validate Check-in window
        LocalDateTime windowStart = shiftStart.minusMinutes(config.getAllowedCheckInMinutes());
        LocalDateTime windowEnd = shiftStart.plusMinutes(config.getAllowedCheckInMinutes());

        if (now.isBefore(windowStart)) {
            throw new IllegalStateException("Too early to check in. Check-in starts at " + windowStart);
        }
        if (now.isAfter(windowEnd)) {
            throw new IllegalStateException("Too late to check in. Check-in ended at " + windowEnd);
        }

        AttendanceStatus status = AttendanceStatus.PRESENT;
        if (now.isAfter(shiftStart.plusMinutes(config.getLateGraceMinutes()))) {
            status = AttendanceStatus.LATE;
        }

        Attendance attendance = Attendance.builder()
                .shiftAssignment(assignment)
                .checkInTime(OffsetDateTime.now())
                .checkInLat(latitude)
                .checkInLng(longitude)
                .checkInPhoto(photo)
                .status(status)
                .build();

        return attendanceRepository.save(attendance);
    }

    private Attendance processCheckOut(Attendance attendance, LocalDateTime shiftEnd, LocalDateTime now, StoreConfiguration config, Double latitude, Double longitude, byte[] photo) {
        // Validate Check-out window
        LocalDateTime windowStart = shiftEnd.minusMinutes(config.getAllowedCheckOutMinutes());
        LocalDateTime windowEnd = shiftEnd.plusMinutes(config.getAllowedCheckOutMinutes());

        if (now.isBefore(windowStart)) {
            throw new IllegalStateException("Too early to check out. Check-out starts at " + windowStart);
        }
        if (now.isAfter(windowEnd)) {
            throw new IllegalStateException("Too late to check out. Check-out ended at " + windowEnd);
        }

        // If checking out before the end minus early leave grace period, mark as early leave
        // Only override status if they were present (don't override LATE)
        if (now.isBefore(shiftEnd.minusMinutes(config.getEarlyLeaveGraceMinutes()))) {
            if (attendance.getStatus() == AttendanceStatus.PRESENT) {
                attendance.setStatus(AttendanceStatus.EARLY_LEAVE);
            }
        }

        attendance.setCheckOutTime(OffsetDateTime.now());
        attendance.setCheckOutLat(latitude);
        attendance.setCheckOutLng(longitude);
        attendance.setCheckOutPhoto(photo);
        return attendanceRepository.save(attendance);
    }

    @Transactional(readOnly = true)
    public List<com.shiftsync.attendance.dto.AttendanceDTO> getMyAttendance(UUID staffId) {
        return attendanceRepository.findByShiftAssignment_Staff_IdOrderByCheckInTimeDesc(staffId).stream().map(this::toDTO).toList();
    }

    @Transactional(readOnly = true)
    public List<com.shiftsync.attendance.dto.AttendanceDTO> getStoreAttendance(UUID storeId, LocalDate from, LocalDate to) {
        return attendanceRepository.findByShiftAssignment_Shift_Store_IdAndShiftAssignment_Shift_ShiftDateBetween(storeId, from, to).stream().map(this::toDTO).toList();
    }

    private com.shiftsync.attendance.dto.AttendanceDTO toDTO(Attendance attendance) {
        ShiftAssignment assignment = attendance.getShiftAssignment();
        Shift shift = assignment.getShift();
        return com.shiftsync.attendance.dto.AttendanceDTO.builder()
                .id(attendance.getId()).shiftAssignmentId(assignment.getId()).shiftId(shift.getId())
                .storeId(shift.getStore().getId()).storeName(shift.getStore().getName())
                .staffId(assignment.getStaff().getId().toString()).staffName(assignment.getStaff().getFullName())
                .shiftDate(shift.getShiftDate()).scheduledStart(shift.getStartTime()).scheduledEnd(shift.getEndTime())
                .checkInTime(attendance.getCheckInTime()).checkOutTime(attendance.getCheckOutTime()).status(attendance.getStatus())
                .checkInLat(attendance.getCheckInLat()).checkInLng(attendance.getCheckInLng())
                .checkOutLat(attendance.getCheckOutLat()).checkOutLng(attendance.getCheckOutLng())
                .checkInPhotoBase64(toBase64(attendance.getCheckInPhoto())).checkOutPhotoBase64(toBase64(attendance.getCheckOutPhoto()))
                .build();
    }

    private String toBase64(byte[] photo) { return photo == null ? null : Base64.getEncoder().encodeToString(photo); }

    private void validateGeofence(Shift shift, StoreConfiguration config, double latitude, double longitude) {
        if (shift.getStore().getLatitude() == null || shift.getStore().getLongitude() == null) {
            throw new IllegalStateException("Store GPS coordinates are not configured. Cannot perform geofence validation.");
        }
        double distance = calculateDistance(latitude, longitude, shift.getStore().getLatitude().doubleValue(), shift.getStore().getLongitude().doubleValue());
        if (distance > config.getGeofenceRadiusM()) {
            throw new IllegalStateException(String.format("You are out of the allowed geofence area. Distance: %.0f meters, Allowed: %d meters.", distance, config.getGeofenceRadiusM()));
        }
    }

    private double calculateDistance(double lat1, double lon1, double lat2, double lon2) {
        final int R = 6371000; // Radius of the earth in meters
        double latDistance = Math.toRadians(lat2 - lat1);
        double lonDistance = Math.toRadians(lon2 - lon1);
        double a = Math.sin(latDistance / 2) * Math.sin(latDistance / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(lonDistance / 2) * Math.sin(lonDistance / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c; // convert to meters
    }
}
