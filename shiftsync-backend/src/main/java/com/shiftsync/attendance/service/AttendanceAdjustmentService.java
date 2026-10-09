package com.shiftsync.attendance.service;
import com.shiftsync.audit.service.AuditLogService;

import com.shiftsync.attendance.dto.AdjustmentCreateRequest;
import com.shiftsync.attendance.dto.AdjustmentResponseDTO;
import com.shiftsync.attendance.entity.Attendance;
import com.shiftsync.attendance.entity.AttendanceAdjustmentRequest;
import com.shiftsync.attendance.enums.AdjustmentStatus;
import com.shiftsync.attendance.enums.AttendanceStatus;
import com.shiftsync.attendance.repository.AttendanceAdjustmentRequestRepository;
import com.shiftsync.attendance.repository.AttendanceRepository;
import com.shiftsync.auth.entity.User;
import com.shiftsync.auth.repository.UserRepository;
import com.shiftsync.payroll.enums.PayrollPeriodStatus;
import com.shiftsync.payroll.repository.PayrollPeriodRepository;
import com.shiftsync.shared.exception.BusinessException;
import com.shiftsync.shift.entity.Shift;
import com.shiftsync.shift.entity.ShiftAssignment;
import com.shiftsync.shift.repository.ShiftAssignmentRepository;
import com.shiftsync.shift.repository.ShiftRepository;
import com.shiftsync.store.entity.StoreConfiguration;
import com.shiftsync.store.repository.StoreConfigurationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AttendanceAdjustmentService {
    private final AuditLogService auditLogService;

    private final AttendanceAdjustmentRequestRepository requestRepository;
    private final AttendanceRepository attendanceRepository;
    private final ShiftRepository shiftRepository;
    private final ShiftAssignmentRepository shiftAssignmentRepository;
    private final UserRepository userRepository;
    private final PayrollPeriodRepository payrollPeriodRepository;
    private final StoreConfigurationRepository storeConfigurationRepository;
    private final com.shiftsync.employment.repository.EmploymentRepository employmentRepository;
    private final com.shiftsync.notification.service.NotificationService notificationService;

    private void checkDateNotLocked(UUID storeId, java.time.LocalDate date, String action) {
        if (date != null && payrollPeriodRepository.existsByStoreIdAndStartDateLessThanEqualAndEndDateGreaterThanEqualAndStatusIn(
                storeId, date, date, Arrays.asList(PayrollPeriodStatus.CONFIRMED, PayrollPeriodStatus.PAID))) {
            throw new BusinessException("Cannot " + action + ": payroll period is locked or already confirmed", HttpStatus.CONFLICT);
        }
    }

    @Transactional
    public AdjustmentResponseDTO createRequest(UUID staffId, AdjustmentCreateRequest dto) {
        User staff = userRepository.findById(staffId)
                .orElseThrow(() -> new BusinessException("Staff not found", HttpStatus.NOT_FOUND));

        Shift shift = shiftRepository.findById(dto.getShiftId())
                .orElseThrow(() -> new BusinessException("Shift not found", HttpStatus.NOT_FOUND));

        checkDateNotLocked(shift.getStore().getId(), shift.getShiftDate(), "submit adjustment");

        Attendance attendance = null;
        if (dto.getAttendanceId() != null) {
            attendance = attendanceRepository.findById(dto.getAttendanceId())
                    .orElseThrow(() -> new BusinessException("Attendance not found", HttpStatus.NOT_FOUND));
            if (!attendance.getShiftAssignment().getShift().getId().equals(shift.getId())) {
                throw new BusinessException("Attendance does not belong to the specified shift", HttpStatus.BAD_REQUEST);
            }
            if (!attendance.getShiftAssignment().getStaff().getId().equals(staffId)) {
                throw new BusinessException("You can only explain your own attendance", HttpStatus.FORBIDDEN);
            }
        } else if (shiftAssignmentRepository.findByShiftIdAndStaffId(shift.getId(), staffId).isEmpty()) {
            throw new BusinessException("You are not assigned to this shift", HttpStatus.FORBIDDEN);
        }

        AttendanceAdjustmentRequest request = AttendanceAdjustmentRequest.builder()
                .attendance(attendance)
                .staff(staff)
                .shift(shift)
                .requestedCheckIn(dto.getRequestedCheckIn())
                .requestedCheckOut(dto.getRequestedCheckOut())
                .reason(dto.getReason())
                .status(AdjustmentStatus.PENDING)
                .build();

        return mapToDTO(requestRepository.save(request));
    }

    public List<AdjustmentResponseDTO> getMyRequests(UUID storeId, UUID staffId) {
        return requestRepository.findByShiftStoreIdAndStaffId(storeId, staffId).stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    public List<AdjustmentResponseDTO> getRequests(UUID storeId, AdjustmentStatus status) {
        List<AttendanceAdjustmentRequest> requests;
        if (status != null) {
            requests = requestRepository.findByShiftStoreIdAndStatus(storeId, status);
        } else {
            requests = requestRepository.findByShiftStoreId(storeId);
        }
        return requests.stream().map(this::mapToDTO).collect(Collectors.toList());
    }

    @Transactional
    public AdjustmentResponseDTO approveRequest(UUID storeId, UUID requestId, UUID managerId) {
        AttendanceAdjustmentRequest request = requestRepository.findById(requestId)
                .orElseThrow(() -> new BusinessException("Request not found", HttpStatus.NOT_FOUND));

        if (request.getShift() == null || request.getShift().getStore() == null || !request.getShift().getStore().getId().equals(storeId)) {
            throw new BusinessException("Request does not belong to this store", HttpStatus.FORBIDDEN);
        }

        if (request.getStatus() != AdjustmentStatus.PENDING) {
            throw new BusinessException("Only pending requests can be approved", HttpStatus.BAD_REQUEST);
        }

        checkDateNotLocked(storeId, request.getShift().getShiftDate(), "approve");

        User manager = userRepository.findById(managerId)
                .orElseThrow(() -> new BusinessException("Manager not found", HttpStatus.NOT_FOUND));

        if (manager.getSystemRole() != com.shiftsync.shared.security.SystemRole.ADMIN 
                && !employmentRepository.isStaffInStore(managerId, storeId, com.shiftsync.employment.enums.EmploymentStatus.ACTIVE)) {
            throw new BusinessException("Manager does not have permission to manage this store", HttpStatus.FORBIDDEN);
        }

        // Determine late/present status based on store configuration
        StoreConfiguration config = storeConfigurationRepository.findByStoreId(storeId).orElse(null);
        int lateGrace = (config != null && config.getLateGraceMinutes() != null) ? config.getLateGraceMinutes() : 5;

        java.time.LocalDate sDate = request.getShift().getShiftDate() != null ? request.getShift().getShiftDate() : java.time.LocalDate.now();
        java.time.LocalTime sTime = request.getShift().getStartTime() != null ? request.getShift().getStartTime() : java.time.LocalTime.of(0, 0);
        java.time.LocalDateTime shiftStart = java.time.LocalDateTime.of(sDate, sTime);

        AttendanceStatus calculatedStatus = AttendanceStatus.PRESENT;
        
        Attendance attendance = request.getAttendance();
        OffsetDateTime effectiveCheckIn = request.getRequestedCheckIn();
        if (effectiveCheckIn == null && attendance != null) {
            effectiveCheckIn = attendance.getCheckInTime();
        }
        
        if (effectiveCheckIn != null) {
            if (effectiveCheckIn.toLocalDateTime().isAfter(shiftStart.plusMinutes(lateGrace))) {
                calculatedStatus = AttendanceStatus.LATE;
            }
        }

        if (attendance == null) {
            ShiftAssignment assignment = shiftAssignmentRepository.findByShiftIdAndStaffId(request.getShift().getId(), request.getStaff().getId())
                    .orElseThrow(() -> new BusinessException("Staff is not assigned to this shift", HttpStatus.BAD_REQUEST));
            
            // Check if an attendance record already exists for this assignment to prevent unique constraint violation
            attendance = attendanceRepository.findByShiftAssignmentId(assignment.getId())
                    .orElseGet(() -> Attendance.builder()
                            .shiftAssignment(assignment)
                            .build());
        }

        if (request.getRequestedCheckIn() != null) {
            attendance.setCheckInTime(request.getRequestedCheckIn());
        }
        if (request.getRequestedCheckOut() != null) {
            attendance.setCheckOutTime(request.getRequestedCheckOut());
        }
        attendance.setStatus(calculatedStatus);
        attendance = attendanceRepository.save(attendance);
        request.setAttendance(attendance);

        request.setStatus(AdjustmentStatus.APPROVED);
        request.setApprovedBy(manager);
        request.setApprovedAt(OffsetDateTime.now());
        
        request = requestRepository.save(request);
        auditLogService.log(managerId, "APPROVE_ATTENDANCE_ADJ", "AttendanceAdjustmentRequest", requestId, 
                java.util.Map.of("status", "PENDING"), 
                java.util.Map.of("status", "APPROVED"));

        notificationService.sendNotification(
            request.getStaff().getId(),
            com.shiftsync.notification.entity.NotificationType.ATTENDANCE_ADJUSTMENT_UPDATED,
            "Attendance Adjustment Approved",
            "Your attendance adjustment request has been approved.",
            null
        );

        return mapToDTO(request);
    }

    @Transactional
    public AdjustmentResponseDTO rejectRequest(UUID storeId, UUID requestId, UUID managerId) {
        AttendanceAdjustmentRequest request = requestRepository.findById(requestId)
                .orElseThrow(() -> new BusinessException("Request not found", HttpStatus.NOT_FOUND));

        if (request.getShift() == null || request.getShift().getStore() == null || !request.getShift().getStore().getId().equals(storeId)) {
            throw new BusinessException("Request does not belong to this store", HttpStatus.FORBIDDEN);
        }

        if (request.getStatus() != AdjustmentStatus.PENDING) {
            throw new BusinessException("Only pending requests can be rejected", HttpStatus.BAD_REQUEST);
        }

        checkDateNotLocked(storeId, request.getShift().getShiftDate(), "reject");

        User manager = userRepository.findById(managerId)
                .orElseThrow(() -> new BusinessException("Manager not found", HttpStatus.NOT_FOUND));

        if (manager.getSystemRole() != com.shiftsync.shared.security.SystemRole.ADMIN 
                && !employmentRepository.isStaffInStore(managerId, storeId, com.shiftsync.employment.enums.EmploymentStatus.ACTIVE)) {
            throw new BusinessException("Manager does not have permission to manage this store", HttpStatus.FORBIDDEN);
        }

        request.setStatus(AdjustmentStatus.REJECTED);
        request.setApprovedBy(manager);
        request.setApprovedAt(OffsetDateTime.now());

        request = requestRepository.save(request);
        auditLogService.log(managerId, "REJECT_ATTENDANCE_ADJ", "AttendanceAdjustmentRequest", requestId, 
                java.util.Map.of("status", "PENDING"), 
                java.util.Map.of("status", "REJECTED"));

        notificationService.sendNotification(
            request.getStaff().getId(),
            com.shiftsync.notification.entity.NotificationType.ATTENDANCE_ADJUSTMENT_UPDATED,
            "Attendance Adjustment Rejected",
            "Your attendance adjustment request has been rejected.",
            null
        );

        return mapToDTO(request);
    }

    private AdjustmentResponseDTO mapToDTO(AttendanceAdjustmentRequest request) {
        return AdjustmentResponseDTO.builder()
                .id(request.getId())
                .attendanceId(request.getAttendance() != null ? request.getAttendance().getId() : null)
                .staffId(request.getStaff().getId())
                .staffName(request.getStaff().getFullName())
                .shiftId(request.getShift().getId())
                .requestedCheckIn(request.getRequestedCheckIn())
                .requestedCheckOut(request.getRequestedCheckOut())
                .reason(request.getReason())
                .status(request.getStatus())
                .createdAt(request.getCreatedAt())
                .approvedBy(request.getApprovedBy() != null ? request.getApprovedBy().getId() : null)
                .approvedByName(request.getApprovedBy() != null ? request.getApprovedBy().getFullName() : null)
                .approvedAt(request.getApprovedAt())
                .build();
    }
}
