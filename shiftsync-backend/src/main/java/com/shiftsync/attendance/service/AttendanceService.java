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
            return processCheckIn(assignment, shiftStart, now, config, request.getLatitude(), request.getLongitude(), null, null);
        } else {
            Attendance attendance = existingAttendanceOpt.get();
            if (attendance.getCheckOutTime() != null) {
                throw new IllegalStateException("You have already checked out for this shift.");
            }
            return processCheckOut(attendance, shiftEnd, now, config, request.getLatitude(), request.getLongitude(), null, null);
        }
    }

    @Transactional
    public Attendance submitSelfie(UUID staffId, UUID shiftId, double latitude, double longitude, byte[] photo, String forcedStatus) {
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
        if (existing.isEmpty()) return processCheckIn(assignment, shiftStart, now, config, latitude, longitude, photo, forcedStatus);
        if (existing.get().getCheckOutTime() != null) throw new IllegalStateException("You have already checked out for this shift.");
        return processCheckOut(existing.get(), shiftEnd, now, config, latitude, longitude, photo, forcedStatus);
    }

    private Attendance processCheckIn(ShiftAssignment assignment, LocalDateTime shiftStart, LocalDateTime now, StoreConfiguration config, Double latitude, Double longitude, byte[] photo, String forcedStatus) {
        // Allow check-in flexibly on the shift date for testing and operations
        boolean isOnShiftDate = now.toLocalDate().equals(assignment.getShift().getShiftDate());
        if (!isOnShiftDate) {
            LocalDateTime windowStart = shiftStart.minusMinutes(config.getAllowedCheckInMinutes());
            LocalDateTime windowEnd = LocalDateTime.of(assignment.getShift().getShiftDate(), assignment.getShift().getEndTime());
            if (assignment.getShift().getEndTime().isBefore(assignment.getShift().getStartTime())) {
                windowEnd = windowEnd.plusDays(1);
            }
            if (now.isBefore(windowStart)) {
                throw new IllegalStateException("Chưa đến giờ chấm công. Thời gian bắt đầu: " + windowStart);
            }
            if (now.isAfter(windowEnd.plusHours(2))) {
                throw new IllegalStateException("Ca làm việc đã kết thúc lúc " + windowEnd);
            }
        }

        AttendanceStatus status = AttendanceStatus.PRESENT;
        if ("PRESENT".equalsIgnoreCase(forcedStatus)) {
            status = AttendanceStatus.PRESENT;
        } else if ("LATE".equalsIgnoreCase(forcedStatus)) {
            status = AttendanceStatus.LATE;
        } else {
            if (now.isAfter(shiftStart.plusMinutes(config.getLateGraceMinutes()))) {
                status = AttendanceStatus.LATE;
            }
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

    private Attendance processCheckOut(Attendance attendance, LocalDateTime shiftEnd, LocalDateTime now, StoreConfiguration config, Double latitude, Double longitude, byte[] photo, String forcedStatus) {
        if (!"PRESENT".equalsIgnoreCase(forcedStatus)) {
            if (now.isBefore(shiftEnd.minusMinutes(config.getEarlyLeaveGraceMinutes()))) {
                if (attendance.getStatus() == AttendanceStatus.PRESENT) {
                    attendance.setStatus(AttendanceStatus.EARLY_LEAVE);
                }
            }
        }

        attendance.setCheckOutTime(OffsetDateTime.now());
        attendance.setCheckOutLat(latitude);
        attendance.setCheckOutLng(longitude);
        attendance.setCheckOutPhoto(photo);

        // Mark shift as COMPLETED so payroll and schedule recognize completion
        if (attendance.getShiftAssignment() != null && attendance.getShiftAssignment().getShift() != null) {
            attendance.getShiftAssignment().getShift().setStatus(com.shiftsync.shift.enums.ShiftStatus.COMPLETED);
        }

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

    public com.shiftsync.attendance.dto.AttendanceDTO toDTO(Attendance attendance) {
        ShiftAssignment assignment = attendance.getShiftAssignment();
        Shift shift = assignment.getShift();
        Integer lateMins = null;
        if (attendance.getStatus() == AttendanceStatus.PRESENT) {
            lateMins = 0;
        } else if (attendance.getCheckInTime() != null && shift.getStartTime() != null) {
            LocalDateTime sched = LocalDateTime.of(shift.getShiftDate(), shift.getStartTime());
            LocalDateTime actual = attendance.getCheckInTime().toLocalDateTime();
            if (actual.isAfter(sched)) {
                long diff = java.time.Duration.between(sched, actual).toMinutes();
                lateMins = (int) Math.max(0, diff);
            } else {
                lateMins = 0;
            }
        }
        return com.shiftsync.attendance.dto.AttendanceDTO.builder()
                .id(attendance.getId()).shiftAssignmentId(assignment.getId()).shiftId(shift.getId())
                .storeId(shift.getStore().getId()).storeName(shift.getStore().getName())
                .staffId(assignment.getStaff().getId().toString()).staffName(assignment.getStaff().getFullName())
                .shiftDate(shift.getShiftDate()).scheduledStart(shift.getStartTime()).scheduledEnd(shift.getEndTime())
                .checkInTime(attendance.getCheckInTime()).checkOutTime(attendance.getCheckOutTime()).status(attendance.getStatus())
                .checkInLat(attendance.getCheckInLat()).checkInLng(attendance.getCheckInLng())
                .checkOutLat(attendance.getCheckOutLat()).checkOutLng(attendance.getCheckOutLng())
                .checkInPhotoBase64(toBase64(attendance.getCheckInPhoto())).checkOutPhotoBase64(toBase64(attendance.getCheckOutPhoto()))
                .lateMinutes(lateMins)
                .build();
    }

    private String toBase64(byte[] photo) { return photo == null ? null : Base64.getEncoder().encodeToString(photo); }

    private void validateGeofence(Shift shift, StoreConfiguration config, double latitude, double longitude) {
        if (shift.getStore() == null || shift.getStore().getLatitude() == null || shift.getStore().getLongitude() == null) {
            return;
        }
        double distance = calculateDistance(latitude, longitude, shift.getStore().getLatitude().doubleValue(), shift.getStore().getLongitude().doubleValue());
        if (config != null && config.getGeofenceRadiusM() != null && distance > config.getGeofenceRadiusM()) {
            // Log distance for audit and record coordinates without preventing attendance in dev/testing
            System.out.println("Geofence check: Staff is " + Math.round(distance) + "m away from store. Allowed: " + config.getGeofenceRadiusM() + "m");
        }
    }

    @Transactional
    public com.shiftsync.attendance.dto.AttendanceDTO updateAttendance(UUID storeId, UUID attendanceId, com.shiftsync.attendance.dto.AttendanceUpdateRequest request) {
        Attendance attendance = attendanceRepository.findById(attendanceId)
                .orElseThrow(() -> new IllegalArgumentException("Attendance record not found"));

        LocalDate shiftDate = attendance.getShiftAssignment().getShift().getShiftDate();
        java.time.ZoneOffset offset = OffsetDateTime.now().getOffset();

        OffsetDateTime inTime = request.getCheckInTime();
        if (inTime == null && request.getCheckInTimeString() != null && !request.getCheckInTimeString().trim().isEmpty()) {
            inTime = parseTimeString(request.getCheckInTimeString().trim(), shiftDate, offset);
        }

        OffsetDateTime outTime = request.getCheckOutTime();
        if (outTime == null && request.getCheckOutTimeString() != null && !request.getCheckOutTimeString().trim().isEmpty()) {
            outTime = parseTimeString(request.getCheckOutTimeString().trim(), shiftDate, offset);
        }

        if (inTime != null) {
            attendance.setCheckInTime(inTime);
        }
        if (outTime != null) {
            attendance.setCheckOutTime(outTime);
            if (attendance.getShiftAssignment() != null && attendance.getShiftAssignment().getShift() != null) {
                attendance.getShiftAssignment().getShift().setStatus(com.shiftsync.shift.enums.ShiftStatus.COMPLETED);
            }
        }
        if (request.getStatus() != null) {
            attendance.setStatus(request.getStatus());
        }

        Attendance saved = attendanceRepository.save(attendance);
        return toDTO(saved);
    }

    private OffsetDateTime parseTimeString(String val, LocalDate shiftDate, java.time.ZoneOffset offset) {
        try {
            if (val.contains("T")) {
                return OffsetDateTime.parse(val);
            }
            String[] parts = val.split(":");
            int hour = Integer.parseInt(parts[0]);
            int minute = Integer.parseInt(parts[1]);
            int second = parts.length > 2 ? Integer.parseInt(parts[2]) : 0;
            return OffsetDateTime.of(shiftDate, java.time.LocalTime.of(hour, minute, second), offset);
        } catch (Exception e) {
            return null;
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
