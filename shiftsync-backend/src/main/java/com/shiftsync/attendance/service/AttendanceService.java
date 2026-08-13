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

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

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

        double distance = calculateDistance(
                request.getLatitude(), request.getLongitude(),
                shift.getStore().getLatitude().doubleValue(), shift.getStore().getLongitude().doubleValue()
        );

        if (distance > config.getGeofenceRadiusM()) {
            throw new IllegalStateException(String.format(
                    "You are out of the allowed geofence area. Distance: %.0f meters, Allowed: %d meters.",
                    distance, config.getGeofenceRadiusM()));
        }

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime shiftStart = LocalDateTime.of(shift.getShiftDate(), shift.getStartTime());
        LocalDateTime shiftEnd = LocalDateTime.of(shift.getShiftDate(), shift.getEndTime());

        // Handle overnight shifts
        if (shiftEnd.isBefore(shiftStart)) {
            shiftEnd = shiftEnd.plusDays(1);
        }

        Optional<Attendance> existingAttendanceOpt = attendanceRepository.findByShiftAssignmentId(assignment.getId());

        if (existingAttendanceOpt.isEmpty()) {
            return processCheckIn(assignment, shiftStart, now, config);
        } else {
            Attendance attendance = existingAttendanceOpt.get();
            if (attendance.getCheckOutTime() != null) {
                throw new IllegalStateException("You have already checked out for this shift.");
            }
            return processCheckOut(attendance, shiftEnd, now, config);
        }
    }

    private Attendance processCheckIn(ShiftAssignment assignment, LocalDateTime shiftStart, LocalDateTime now, StoreConfiguration config) {
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
                .status(status)
                .build();

        return attendanceRepository.save(attendance);
    }

    private Attendance processCheckOut(Attendance attendance, LocalDateTime shiftEnd, LocalDateTime now, StoreConfiguration config) {
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
        return attendanceRepository.save(attendance);
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
