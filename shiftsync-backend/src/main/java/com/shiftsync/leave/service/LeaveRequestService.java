package com.shiftsync.leave.service;


import com.shiftsync.auth.entity.User;
import com.shiftsync.auth.repository.UserRepository;
import com.shiftsync.availability.entity.BlackoutDate;
import com.shiftsync.availability.repository.BlackoutDateRepository;
import com.shiftsync.leave.dto.LeaveApproveResponse;
import com.shiftsync.leave.dto.LeaveCreateRequest;
import com.shiftsync.leave.dto.LeaveRequestDTO;
import com.shiftsync.leave.entity.LeaveRequest;
import com.shiftsync.leave.enums.LeaveStatus;
import com.shiftsync.leave.repository.LeaveRequestRepository;
import com.shiftsync.employment.repository.EmploymentRepository;
import com.shiftsync.shared.exception.BusinessException;
import com.shiftsync.shift.repository.ShiftAssignmentRepository;
import com.shiftsync.store.entity.Store;
import com.shiftsync.store.repository.StoreRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class LeaveRequestService {
    private final com.shiftsync.audit.service.AuditLogService auditLogService;
    private final LeaveRequestRepository leaveRequestRepository;
    private final UserRepository userRepository;
    private final StoreRepository storeRepository;
    private final EmploymentRepository employmentRepository;
    private final BlackoutDateRepository blackoutDateRepository;
    private final ShiftAssignmentRepository shiftAssignmentRepository;
    private final com.shiftsync.shift.repository.ShiftRepository shiftRepository;
    private final com.shiftsync.notification.service.NotificationService notificationService;
    private final com.shiftsync.shared.websocket.RealtimeEventPublisher realtimeEventPublisher;
    @Transactional
    public LeaveRequestDTO createLeaveRequest(UUID storeId, UUID staffId, LeaveCreateRequest request) {
        User staff = userRepository.findById(staffId)
                .orElseThrow(() -> new BusinessException("Staff not found", HttpStatus.NOT_FOUND));
        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new BusinessException("Store not found", HttpStatus.NOT_FOUND));

        if (request.getStartDate().isAfter(request.getEndDate())) {
            throw new BusinessException("Start date must be before or equal to end date", HttpStatus.BAD_REQUEST);
        }
        
        boolean isActiveInStore = employmentRepository.existsByUserIdAndStoreIdAndStatus(staffId, storeId, com.shiftsync.employment.enums.EmploymentStatus.ACTIVE);
        if (!isActiveInStore) {
            throw new BusinessException("Staff is not actively employed in this store", HttpStatus.FORBIDDEN);
        }
        
        List<LeaveRequest> overlapping = leaveRequestRepository.findOverlappingRequests(staffId, request.getStartDate(), request.getEndDate());
        if (!overlapping.isEmpty()) {
            throw new BusinessException("Leave request overlaps with an existing pending or approved request", HttpStatus.CONFLICT);
        }

        LeaveRequest leaveRequest = LeaveRequest.builder()
                .staff(staff)
                .store(store)
                .leaveType(request.getLeaveType())
                .status(LeaveStatus.PENDING)
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .reason(request.getReason())
                .build();

        leaveRequest = leaveRequestRepository.save(leaveRequest);
        try {
            realtimeEventPublisher.publishStoreEvent(storeId, "requests", java.util.Map.of("action", "LEAVE_CREATED", "leaveId", leaveRequest.getId()));
        } catch (Exception ignored) {}

        return mapToDTO(leaveRequest);
    }

    public List<LeaveRequestDTO> getLeaveRequests(UUID storeId, LeaveStatus status) {
        List<LeaveRequest> requests;
        if (status != null) {
            requests = leaveRequestRepository.findByStoreIdAndStatus(storeId, status);
        } else {
            requests = leaveRequestRepository.findByStoreId(storeId);
        }
        return requests.stream().map(this::mapToDTO).collect(Collectors.toList());
    }

    public List<LeaveRequestDTO> getMyLeaveRequests(UUID staffId) {
        return leaveRequestRepository.findByStaffId(staffId).stream()
                .map(this::mapToDTO).collect(Collectors.toList());
    }

    @Transactional
    public void cancelLeaveRequest(UUID storeId, UUID leaveId, UUID staffId) {
        LeaveRequest leaveRequest = leaveRequestRepository.findById(leaveId)
                .orElseThrow(() -> new BusinessException("Leave request not found", HttpStatus.NOT_FOUND));

        if (!leaveRequest.getStore().getId().equals(storeId)) {
            throw new BusinessException("Leave request does not belong to this store", HttpStatus.FORBIDDEN);
        }

        if (!leaveRequest.getStaff().getId().equals(staffId)) {
            throw new BusinessException("You can only cancel your own leave requests", HttpStatus.FORBIDDEN);
        }

        if (leaveRequest.getStatus() != LeaveStatus.PENDING) {
            throw new BusinessException("Only pending leave requests can be cancelled", HttpStatus.BAD_REQUEST);
        }

        leaveRequestRepository.delete(leaveRequest);
        try {
            realtimeEventPublisher.publishStoreEvent(storeId, "requests", java.util.Map.of("action", "LEAVE_CANCELLED", "leaveId", leaveId));
        } catch (Exception ignored) {}
    }

    @Transactional
    public LeaveApproveResponse approveLeaveRequest(UUID storeId, UUID leaveId, UUID managerId) {
        LeaveRequest leaveRequest = leaveRequestRepository.findById(leaveId)
                .orElseThrow(() -> new BusinessException("Leave request not found", HttpStatus.NOT_FOUND));

        if (!leaveRequest.getStore().getId().equals(storeId)) {
            throw new BusinessException("Leave request does not belong to this store", HttpStatus.FORBIDDEN);
        }

        if (leaveRequest.getStatus() != LeaveStatus.PENDING) {
            throw new BusinessException("Leave request is not PENDING", HttpStatus.BAD_REQUEST);
        }

        User manager = userRepository.findById(managerId)
                .orElseThrow(() -> new BusinessException("Manager not found", HttpStatus.NOT_FOUND));

        leaveRequest.setStatus(LeaveStatus.APPROVED);
        leaveRequest.setApprovedBy(manager);
        leaveRequest.setApprovedAt(OffsetDateTime.now());
        leaveRequest = leaveRequestRepository.save(leaveRequest);
        auditLogService.log(managerId, "APPROVE_LEAVE", "LeaveRequest", leaveId, 
                java.util.Map.of("status", "PENDING"), 
                java.util.Map.of("status", "APPROVED"));

        // Generate Blackout Dates for each day
        LocalDate currentDate = leaveRequest.getStartDate();
        while (!currentDate.isAfter(leaveRequest.getEndDate())) {
            BlackoutDate blackout = BlackoutDate.builder()
                    .staffId(leaveRequest.getStaff().getId())
                    .date(currentDate)
                    .reason("Approved Leave: " + (leaveRequest.getReason() != null ? leaveRequest.getReason() : leaveRequest.getLeaveType().name()))
                    .leaveRequestId(leaveRequest.getId())
                    .build();
            blackoutDateRepository.save(blackout);
            currentDate = currentDate.plusDays(1);
        }

        // Unassign staff from conflicting shifts during leave and mark shifts open on Marketplace
        List<com.shiftsync.shift.entity.ShiftAssignment> conflictingAssignments = shiftAssignmentRepository.findByStaffIdAndShift_ShiftDateBetween(
                leaveRequest.getStaff().getId(), 
                leaveRequest.getStartDate(), 
                leaveRequest.getEndDate()
        );

        int unassignedCount = 0;
        for (com.shiftsync.shift.entity.ShiftAssignment sa : conflictingAssignments) {
            com.shiftsync.shift.entity.Shift shift = sa.getShift();
            shiftAssignmentRepository.delete(sa);
            unassignedCount++;

            if (shift.getStatus() == com.shiftsync.shift.enums.ShiftStatus.PUBLISHED) {
                shift.setOpen(true);
                String note = "Nhu cầu phát sinh: Nhân viên " + leaveRequest.getStaff().getFullName() + " nghỉ phép đã duyệt.";
                shift.setNote(note);
                if (shift.getAvailabilityDeadline() == null || shift.getAvailabilityDeadline().isBefore(java.time.ZonedDateTime.now())) {
                    java.time.ZonedDateTime deadline = shift.getShiftDate().atTime(shift.getStartTime()).atZone(java.time.ZoneId.of("Asia/Ho_Chi_Minh"));
                    shift.setAvailabilityDeadline(deadline);
                }
                shiftRepository.save(shift);
            }
        }

        String warning = null;
        if (unassignedCount > 0) {
            warning = "Đã tự động hủy phân công nhân viên khỏi " + unassignedCount + " ca làm và mở nhu cầu tuyển ca trên Marketplace.";
        }

        notificationService.sendNotification(
            leaveRequest.getStaff().getId(),
            com.shiftsync.notification.entity.NotificationType.LEAVE_REQUEST_UPDATED,
            "Leave Request Approved",
            "Your leave request has been approved.",
            null
        );

        try {
            realtimeEventPublisher.publishStoreEvent(storeId, "requests", java.util.Map.of("action", "LEAVE_APPROVED", "leaveId", leaveId));
            if (unassignedCount > 0) {
                realtimeEventPublisher.publishStoreEvent(storeId, "marketplace", java.util.Map.of("action", "WORKFORCE_NEED_CREATED", "leaveId", leaveId));
                realtimeEventPublisher.publishStoreEvent(storeId, "shifts", java.util.Map.of("action", "SHIFT_UNASSIGNED", "leaveId", leaveId));
            }
        } catch (Exception ignored) {}

        return LeaveApproveResponse.builder()
                .leaveRequest(mapToDTO(leaveRequest))
                .warning(warning)
                .build();
    }

    @Transactional
    public LeaveRequestDTO rejectLeaveRequest(UUID storeId, UUID leaveId, UUID managerId, String rejectionReason) {
        LeaveRequest leaveRequest = leaveRequestRepository.findById(leaveId)
                .orElseThrow(() -> new BusinessException("Leave request not found", HttpStatus.NOT_FOUND));

        if (!leaveRequest.getStore().getId().equals(storeId)) {
            throw new BusinessException("Leave request does not belong to this store", HttpStatus.FORBIDDEN);
        }

        if (leaveRequest.getStatus() != LeaveStatus.PENDING) {
            throw new BusinessException("Leave request is not PENDING", HttpStatus.BAD_REQUEST);
        }

        User manager = userRepository.findById(managerId)
                .orElseThrow(() -> new BusinessException("Manager not found", HttpStatus.NOT_FOUND));

        leaveRequest.setStatus(LeaveStatus.REJECTED);
        leaveRequest.setApprovedBy(manager);
        leaveRequest.setApprovedAt(OffsetDateTime.now());
        if (rejectionReason != null && !rejectionReason.isBlank()) {
            leaveRequest.setRejectionReason(rejectionReason.trim());
        }
        leaveRequest = leaveRequestRepository.save(leaveRequest);

        auditLogService.log(managerId, "REJECT_LEAVE", "LeaveRequest", leaveId, 
                java.util.Map.of("status", "PENDING"), 
                java.util.Map.of("status", "REJECTED", "rejectionReason", rejectionReason != null ? rejectionReason : ""));

        notificationService.sendNotification(
            leaveRequest.getStaff().getId(),
            com.shiftsync.notification.entity.NotificationType.LEAVE_REQUEST_UPDATED,
            "Leave Request Rejected",
            "Your leave request has been rejected." + (rejectionReason != null && !rejectionReason.isBlank() ? " Reason: " + rejectionReason : ""),
            null
        );

        try {
            realtimeEventPublisher.publishStoreEvent(storeId, "requests", java.util.Map.of("action", "LEAVE_REJECTED", "leaveId", leaveId));
        } catch (Exception ignored) {}

        return mapToDTO(leaveRequest);
    }

    @Transactional
    public LeaveRequestDTO updateLeaveReason(UUID storeId, UUID leaveId, UUID userId, String newReason) {
        LeaveRequest leaveRequest = leaveRequestRepository.findById(leaveId)
                .orElseThrow(() -> new BusinessException("Leave request not found", HttpStatus.NOT_FOUND));

        if (!leaveRequest.getStore().getId().equals(storeId)) {
            throw new BusinessException("Leave request does not belong to this store", HttpStatus.FORBIDDEN);
        }

        leaveRequest.setReason(newReason);
        leaveRequest = leaveRequestRepository.save(leaveRequest);

        auditLogService.log(userId, "UPDATE_LEAVE_REASON", "LeaveRequest", leaveId,
                java.util.Map.of("action", "UPDATE_REASON"),
                java.util.Map.of("reason", newReason != null ? newReason : ""));

        try {
            realtimeEventPublisher.publishStoreEvent(storeId, "requests", java.util.Map.of("action", "LEAVE_UPDATED", "leaveId", leaveId));
        } catch (Exception ignored) {}

        return mapToDTO(leaveRequest);
    }

    @Transactional(readOnly = true)
    public com.shiftsync.leave.dto.LeaveImpactDTO getLeaveImpact(UUID storeId, UUID leaveId) {
        LeaveRequest leaveRequest = leaveRequestRepository.findById(leaveId)
                .orElseThrow(() -> new BusinessException("Leave request not found", HttpStatus.NOT_FOUND));

        if (!leaveRequest.getStore().getId().equals(storeId)) {
            throw new BusinessException("Leave request does not belong to this store", HttpStatus.FORBIDDEN);
        }

        List<com.shiftsync.shift.entity.ShiftAssignment> conflictingAssignments = shiftAssignmentRepository.findByStaffIdAndShift_ShiftDateBetween(
                leaveRequest.getStaff().getId(),
                leaveRequest.getStartDate(),
                leaveRequest.getEndDate()
        );

        List<com.shiftsync.leave.dto.LeaveImpactDTO.ImpactedShiftDTO> impactedShifts = conflictingAssignments.stream()
                .map(sa -> {
                    com.shiftsync.shift.entity.Shift shift = sa.getShift();
                    String skillName = (shift.getRequirements() != null && !shift.getRequirements().isEmpty() && shift.getRequirements().get(0).getSkill() != null)
                            ? shift.getRequirements().get(0).getSkill().getName()
                            : null;
                    return com.shiftsync.leave.dto.LeaveImpactDTO.ImpactedShiftDTO.builder()
                            .shiftId(shift.getId())
                            .shiftDate(shift.getShiftDate())
                            .startTime(shift.getStartTime())
                            .endTime(shift.getEndTime())
                            .storeId(shift.getStore() != null ? shift.getStore().getId() : null)
                            .storeName(shift.getStore() != null ? shift.getStore().getName() : null)
                            .skillName(skillName)
                            .build();
                })
                .toList();

        return com.shiftsync.leave.dto.LeaveImpactDTO.builder()
                .leaveRequestId(leaveRequest.getId())
                .staffId(leaveRequest.getStaff().getId())
                .staffName(leaveRequest.getStaff().getFullName())
                .startDate(leaveRequest.getStartDate())
                .endDate(leaveRequest.getEndDate())
                .totalConflictingShifts(impactedShifts.size())
                .conflictingShifts(impactedShifts)
                .build();
    }

    private LeaveRequestDTO mapToDTO(LeaveRequest request) {
        return LeaveRequestDTO.builder()
                .id(request.getId())
                .staffId(request.getStaff().getId())
                .staffName(request.getStaff().getFullName())
                .storeId(request.getStore().getId())
                .leaveType(request.getLeaveType())
                .status(request.getStatus())
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .reason(request.getReason())
                .rejectionReason(request.getRejectionReason())
                .approvedBy(request.getApprovedBy() != null ? request.getApprovedBy().getId() : null)
                .approvedAt(request.getApprovedAt())
                .createdAt(request.getCreatedAt())
                .build();
    }
}
