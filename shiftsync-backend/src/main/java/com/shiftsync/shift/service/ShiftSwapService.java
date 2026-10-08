package com.shiftsync.shift.service;
import com.shiftsync.audit.service.AuditLogService;

import com.shiftsync.auth.entity.User;
import com.shiftsync.auth.repository.UserRepository;
import com.shiftsync.shared.exception.BusinessException;
import com.shiftsync.shift.entity.ShiftAssignment;
import com.shiftsync.shift.entity.ShiftSwapRequest;
import com.shiftsync.shift.enums.AssignmentSource;
import com.shiftsync.shift.enums.SwapStatus;
import com.shiftsync.shift.repository.ShiftAssignmentRepository;
import com.shiftsync.shift.repository.ShiftSwapRequestRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Slf4j
@Service
public class ShiftSwapService {
    private final AuditLogService auditLogService;
    private final ShiftSwapRequestRepository shiftSwapRequestRepository;
    private final ShiftAssignmentRepository shiftAssignmentRepository;
    private final UserRepository userRepository;
    private final ShiftValidationService shiftValidationService;
    private final com.shiftsync.notification.service.NotificationService notificationService;
    private final com.shiftsync.employment.repository.EmploymentRepository employmentRepository;
    private final com.shiftsync.attendance.repository.AttendanceRepository attendanceRepository;
    private final com.shiftsync.leave.repository.LeaveRequestRepository leaveRequestRepository;

    @org.springframework.beans.factory.annotation.Autowired
    public ShiftSwapService(
            AuditLogService auditLogService,
            ShiftSwapRequestRepository shiftSwapRequestRepository,
            ShiftAssignmentRepository shiftAssignmentRepository,
            UserRepository userRepository,
            ShiftValidationService shiftValidationService,
            com.shiftsync.notification.service.NotificationService notificationService,
            @org.springframework.beans.factory.annotation.Autowired(required = false) com.shiftsync.employment.repository.EmploymentRepository employmentRepository,
            @org.springframework.beans.factory.annotation.Autowired(required = false) com.shiftsync.attendance.repository.AttendanceRepository attendanceRepository,
            @org.springframework.beans.factory.annotation.Autowired(required = false) com.shiftsync.leave.repository.LeaveRequestRepository leaveRequestRepository
    ) {
        this.auditLogService = auditLogService;
        this.shiftSwapRequestRepository = shiftSwapRequestRepository;
        this.shiftAssignmentRepository = shiftAssignmentRepository;
        this.userRepository = userRepository;
        this.shiftValidationService = shiftValidationService;
        this.notificationService = notificationService;
        this.employmentRepository = employmentRepository;
        this.attendanceRepository = attendanceRepository;
        this.leaveRequestRepository = leaveRequestRepository;
    }

    public ShiftSwapService(
            AuditLogService auditLogService,
            ShiftSwapRequestRepository shiftSwapRequestRepository,
            ShiftAssignmentRepository shiftAssignmentRepository,
            UserRepository userRepository,
            ShiftValidationService shiftValidationService,
            com.shiftsync.notification.service.NotificationService notificationService
    ) {
        this(auditLogService, shiftSwapRequestRepository, shiftAssignmentRepository, userRepository,
             shiftValidationService, notificationService, null, null, null);
    }

    @Transactional(rollbackFor = Exception.class)
    public ShiftSwapRequest createSwapRequest(UUID fromStaffId, UUID fromShiftId, UUID toStaffId, UUID toShiftId) {
        if (fromStaffId.equals(toStaffId)) {
            throw new BusinessException("Cannot swap with yourself", HttpStatus.BAD_REQUEST);
        }

        ShiftAssignment fromAssignment = shiftAssignmentRepository.findByShiftIdAndStaffId(fromShiftId, fromStaffId)
                .orElseThrow(() -> new BusinessException("You are not assigned to the source shift", HttpStatus.BAD_REQUEST));

        ShiftAssignment toAssignment = shiftAssignmentRepository.findByShiftIdAndStaffId(toShiftId, toStaffId)
                .orElseThrow(() -> new BusinessException("Target staff is not assigned to the target shift", HttpStatus.BAD_REQUEST));

        if (!fromAssignment.getShift().getStore().getId().equals(toAssignment.getShift().getStore().getId())) {
            throw new BusinessException("Shifts must belong to the same store", HttpStatus.BAD_REQUEST);
        }

        if (fromAssignment.getShift().getStatus() != com.shiftsync.shift.enums.ShiftStatus.PUBLISHED || 
            toAssignment.getShift().getStatus() != com.shiftsync.shift.enums.ShiftStatus.PUBLISHED) {
            throw new BusinessException("Only published shifts can be swapped", HttpStatus.BAD_REQUEST);
        }

        if (attendanceRepository != null && 
            (attendanceRepository.existsByShiftAssignmentId(fromAssignment.getId()) || 
             attendanceRepository.existsByShiftAssignmentId(toAssignment.getId()))) {
            throw new BusinessException("Cannot swap shifts that have already started or recorded attendance", HttpStatus.BAD_REQUEST);
        }

        if (shiftSwapRequestRepository.existsByFromShiftIdAndStatus(fromShiftId, SwapStatus.PENDING)) {
            throw new BusinessException("A pending swap request already exists for this shift", HttpStatus.CONFLICT);
        }
        if (shiftSwapRequestRepository.existsByToShiftIdAndStatus(toShiftId, SwapStatus.PENDING)) {
            throw new BusinessException("Target shift already has a pending swap request", HttpStatus.CONFLICT);
        }

        User fromStaff = userRepository.findById(fromStaffId)
                .orElseThrow(() -> new BusinessException("Source staff not found", HttpStatus.NOT_FOUND));
        User toStaff = userRepository.findById(toStaffId)
                .orElseThrow(() -> new BusinessException("Target staff not found", HttpStatus.NOT_FOUND));

        ShiftSwapRequest request = ShiftSwapRequest.builder()
                .fromStaff(fromStaff)
                .fromShift(fromAssignment.getShift())
                .toStaff(toStaff)
                .toShift(toAssignment.getShift())
                .status(SwapStatus.PENDING)
                .build();

        ShiftSwapRequest saved = shiftSwapRequestRepository.save(request);

        try {
            notificationService.sendNotification(
                toStaff.getId(),
                com.shiftsync.notification.entity.NotificationType.SHIFT_SWAP_UPDATED,
                "Yêu cầu đổi ca mới",
                fromStaff.getFullName() + " muốn đổi ca với bạn (" + fromAssignment.getShift().getShiftDate() + ").",
                java.util.Map.of("swapRequestId", saved.getId().toString(), "type", "SWAP_REQUEST")
            );
        } catch (Exception e) {
            log.warn("Failed to send notification for new swap request: {}", e.getMessage());
        }

        return saved;

    }

    @Transactional(rollbackFor = Exception.class)
    public void respondToSwapRequest(UUID requestId, UUID toStaffId, boolean accept) {
        ShiftSwapRequest request = shiftSwapRequestRepository.findById(requestId)
                .orElseThrow(() -> new BusinessException("Swap request not found", HttpStatus.NOT_FOUND));

        if (!request.getToStaff().getId().equals(toStaffId)) {
            throw new BusinessException("You are not the target of this swap request", HttpStatus.FORBIDDEN);
        }

        if (request.getStatus() != SwapStatus.PENDING) {
            throw new BusinessException("This request has already been processed", HttpStatus.BAD_REQUEST);
        }

        if (!accept) {
            request.setStatus(SwapStatus.REJECTED);
            shiftSwapRequestRepository.save(request);
            
            try {
                notificationService.sendNotification(
                    request.getFromStaff().getId(),
                    com.shiftsync.notification.entity.NotificationType.SHIFT_SWAP_UPDATED,
                    "Yêu cầu đổi ca bị từ chối",
                    request.getToStaff().getFullName() + " đã từ chối yêu cầu đổi ca của bạn.",
                    java.util.Map.of("swapRequestId", request.getId().toString(), "status", "REJECTED")
                );
            } catch (Exception e) {
                log.warn("Failed to send swap reject notification: {}", e.getMessage());
            }
            return;
        }

        request.setEmployeeAccepted(true);
        shiftSwapRequestRepository.save(request);

        try {
            notificationService.sendNotification(
                request.getFromStaff().getId(),
                com.shiftsync.notification.entity.NotificationType.SHIFT_SWAP_UPDATED,
                "Đồng nghiệp đã đồng ý đổi ca",
                request.getToStaff().getFullName() + " đã chấp nhận yêu cầu đổi ca. Đang chờ Quản lý phê duyệt.",
                java.util.Map.of("swapRequestId", request.getId().toString(), "status", "ACCEPTED")
            );
        } catch (Exception e) {
            log.warn("Failed to send swap accepted notification: {}", e.getMessage());
        }
    }

    @Transactional(rollbackFor = Exception.class)
    public void managerApproveSwapRequest(UUID requestId, UUID managerId) {
        ShiftSwapRequest request = shiftSwapRequestRepository.findById(requestId)
                .orElseThrow(() -> new BusinessException("Swap request not found", HttpStatus.NOT_FOUND));

        if (request.getStatus() != SwapStatus.PENDING) {
            throw new BusinessException("This request has already been processed", HttpStatus.BAD_REQUEST);
        }

        if (!request.isEmployeeAccepted()) {
            throw new BusinessException("Employee has not accepted this swap yet", HttpStatus.BAD_REQUEST);
        }

        User manager = userRepository.findById(managerId)
                .orElseThrow(() -> new BusinessException("Manager not found", HttpStatus.NOT_FOUND));

        UUID shiftStoreId = request.getFromShift().getStore().getId();
        if (manager.getSystemRole() != com.shiftsync.shared.security.SystemRole.ADMIN) {
            if (employmentRepository != null && !employmentRepository.existsByUserIdAndStoreIdAndStatus(managerId, shiftStoreId, com.shiftsync.employment.enums.EmploymentStatus.ACTIVE)) {
                throw new BusinessException("Manager does not belong to this store", HttpStatus.FORBIDDEN);
            }
        }

        if (request.getFromShift().getStatus() != com.shiftsync.shift.enums.ShiftStatus.PUBLISHED || 
            request.getToShift().getStatus() != com.shiftsync.shift.enums.ShiftStatus.PUBLISHED) {
            throw new BusinessException("One or both shifts are no longer published", HttpStatus.BAD_REQUEST);
        }

        java.time.LocalDateTime now = java.time.LocalDateTime.now();
        java.time.LocalDateTime fromStart = java.time.LocalDateTime.of(request.getFromShift().getShiftDate(), request.getFromShift().getStartTime());
        java.time.LocalDateTime toStart = java.time.LocalDateTime.of(request.getToShift().getShiftDate(), request.getToShift().getStartTime());

        if (fromStart.isBefore(now) || toStart.isBefore(now)) {
            throw new BusinessException("Cannot approve a swap for shifts that have already started or occurred in the past.", HttpStatus.BAD_REQUEST);
        }

        // Leave conflict check on swapped dates
        if (leaveRequestRepository != null) {
            boolean fromStaffOnLeave = leaveRequestRepository.findOverlappingRequests(
                    request.getFromStaff().getId(), request.getToShift().getShiftDate(), request.getToShift().getShiftDate())
                    .stream().anyMatch(l -> l.getStatus() == com.shiftsync.leave.enums.LeaveStatus.APPROVED);
            if (fromStaffOnLeave) {
                throw new BusinessException(request.getFromStaff().getFullName() + " has approved leave on target shift date", HttpStatus.BAD_REQUEST);
            }

            boolean toStaffOnLeave = leaveRequestRepository.findOverlappingRequests(
                    request.getToStaff().getId(), request.getFromShift().getShiftDate(), request.getFromShift().getShiftDate())
                    .stream().anyMatch(l -> l.getStatus() == com.shiftsync.leave.enums.LeaveStatus.APPROVED);
            if (toStaffOnLeave) {
                throw new BusinessException(request.getToStaff().getFullName() + " has approved leave on target shift date", HttpStatus.BAD_REQUEST);
            }
        }

        // Perform Conflict Checking (Security Check from Auditor)
        // 1. Validate A's new shift (toShift) against A's existing shifts (excluding the shift they are giving away)
        shiftValidationService.validateNoOverlapAndWeeklyHours(request.getToShift(), request.getFromStaff().getId(), request.getFromShift().getId());

        // 2. Validate B's new shift (fromShift) against B's existing shifts (excluding the shift they are giving away)
        shiftValidationService.validateNoOverlapAndWeeklyHours(request.getFromShift(), request.getToStaff().getId(), request.getToShift().getId());

        // Swap the assignments
        ShiftAssignment fromAssignment = shiftAssignmentRepository.findByShiftIdAndStaffId(request.getFromShift().getId(), request.getFromStaff().getId())
                .orElseThrow(() -> new BusinessException("Original assignment not found for fromStaff", HttpStatus.NOT_FOUND));

        ShiftAssignment toAssignment = shiftAssignmentRepository.findByShiftIdAndStaffId(request.getToShift().getId(), request.getToStaff().getId())
                .orElseThrow(() -> new BusinessException("Original assignment not found for toStaff", HttpStatus.NOT_FOUND));

        if (attendanceRepository != null && 
            (attendanceRepository.existsByShiftAssignmentId(fromAssignment.getId()) || 
             attendanceRepository.existsByShiftAssignmentId(toAssignment.getId()))) {
            throw new BusinessException("Cannot swap shifts that have already started or recorded attendance", HttpStatus.BAD_REQUEST);
        }

        fromAssignment.setStaff(request.getToStaff());
        fromAssignment.setSource(AssignmentSource.SWAP);

        toAssignment.setStaff(request.getFromStaff());
        toAssignment.setSource(AssignmentSource.SWAP);

        shiftAssignmentRepository.save(fromAssignment);
        shiftAssignmentRepository.save(toAssignment);

        request.setStatus(SwapStatus.APPROVED);
        request.setApprovedBy(manager);
        shiftSwapRequestRepository.save(request);
        auditLogService.log(managerId, "APPROVE_SWAP", "ShiftSwapRequest", requestId, 
                java.util.Map.of("status", "PENDING"), 
                java.util.Map.of("status", "APPROVED"));


        try {
            notificationService.sendNotification(
                request.getFromStaff().getId(),
                com.shiftsync.notification.entity.NotificationType.SHIFT_SWAP_UPDATED,
                "Đổi ca thành công",
                "Yêu cầu đổi ca của bạn đã được Quản lý phê duyệt thành công.",
                java.util.Map.of("swapRequestId", requestId.toString(), "status", "APPROVED")
            );
            if (request.getToStaff() != null) {
                notificationService.sendNotification(
                    request.getToStaff().getId(),
                    com.shiftsync.notification.entity.NotificationType.SHIFT_SWAP_UPDATED,
                    "Đổi ca thành công",
                    "Yêu cầu đổi ca với " + request.getFromStaff().getFullName() + " đã được Quản lý phê duyệt thành công.",
                    java.util.Map.of("swapRequestId", requestId.toString(), "status", "APPROVED")
                );
            }
        } catch (Exception e) {
            log.warn("Failed to send approval notification for swap {}: {}", requestId, e.getMessage());
        }
    }

    @Transactional(rollbackFor = Exception.class)
    public void managerRejectSwapRequest(UUID requestId, UUID managerId) {
        ShiftSwapRequest request = shiftSwapRequestRepository.findById(requestId)
                .orElseThrow(() -> new BusinessException("Swap request not found", HttpStatus.NOT_FOUND));

        if (request.getStatus() != SwapStatus.PENDING) {
            throw new BusinessException("This request has already been processed", HttpStatus.BAD_REQUEST);
        }

        User manager = userRepository.findById(managerId)
                .orElseThrow(() -> new BusinessException("Manager not found", HttpStatus.NOT_FOUND));

        UUID shiftStoreId = request.getFromShift().getStore().getId();
        if (manager.getSystemRole() != com.shiftsync.shared.security.SystemRole.ADMIN) {
            if (employmentRepository != null && !employmentRepository.existsByUserIdAndStoreIdAndStatus(managerId, shiftStoreId, com.shiftsync.employment.enums.EmploymentStatus.ACTIVE)) {
                throw new BusinessException("Manager does not belong to this store", HttpStatus.FORBIDDEN);
            }
        }

        request.setStatus(SwapStatus.REJECTED);
        request.setApprovedBy(manager); // Track who rejected it
        shiftSwapRequestRepository.save(request);

        auditLogService.log(managerId, "REJECT_SWAP", "ShiftSwapRequest", requestId, 
                java.util.Map.of("status", "PENDING"), 
                java.util.Map.of("status", "REJECTED"));

        notificationService.sendNotification(
            request.getFromStaff().getId(),
            com.shiftsync.notification.entity.NotificationType.SHIFT_SWAP_UPDATED,
            "Shift Swap Rejected",
            "Your shift swap request has been rejected by the manager.",
            null
        );
        
        if (request.getToStaff() != null) {
            notificationService.sendNotification(
                request.getToStaff().getId(),
                com.shiftsync.notification.entity.NotificationType.SHIFT_SWAP_UPDATED,
                "Shift Swap Rejected",
                "The shift swap request has been rejected by the manager.",
                null
            );
        }
    }

    @Transactional(rollbackFor = Exception.class)
    public void cancelSwapRequest(UUID requestId, UUID userId) {
        ShiftSwapRequest request = shiftSwapRequestRepository.findById(requestId)
                .orElseThrow(() -> new BusinessException("Swap request not found", HttpStatus.NOT_FOUND));

        if (request.getStatus() != SwapStatus.PENDING) {
            throw new BusinessException("This request has already been processed", HttpStatus.BAD_REQUEST);
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException("User not found", HttpStatus.NOT_FOUND));

        boolean isParty = request.getFromStaff().getId().equals(userId) || 
                (request.getToStaff() != null && request.getToStaff().getId().equals(userId));
        boolean isManager = user.getSystemRole() == com.shiftsync.shared.security.SystemRole.MANAGER || 
                user.getSystemRole() == com.shiftsync.shared.security.SystemRole.ADMIN;

        if (!isParty && !isManager) {
            throw new BusinessException("You are not authorized to cancel this request", HttpStatus.FORBIDDEN);
        }

        if (isManager && user.getSystemRole() != com.shiftsync.shared.security.SystemRole.ADMIN) {
            UUID shiftStoreId = request.getFromShift().getStore().getId();
            if (employmentRepository != null && !employmentRepository.existsByUserIdAndStoreIdAndStatus(userId, shiftStoreId, com.shiftsync.employment.enums.EmploymentStatus.ACTIVE)) {
                throw new BusinessException("Manager does not belong to this store", HttpStatus.FORBIDDEN);
            }
        }

        request.setStatus(SwapStatus.CANCELLED);
        shiftSwapRequestRepository.save(request);

        auditLogService.log(userId, "CANCEL_SWAP", "ShiftSwapRequest", requestId, 
                java.util.Map.of("status", "PENDING"), 
                java.util.Map.of("status", "CANCELLED"));

        UUID notifyTarget = request.getFromStaff().getId().equals(userId) 
                ? (request.getToStaff() != null ? request.getToStaff().getId() : null)
                : request.getFromStaff().getId();
        if (notifyTarget != null) {
            notificationService.sendNotification(
                notifyTarget,
                com.shiftsync.notification.entity.NotificationType.SHIFT_SWAP_UPDATED,
                "Shift Swap Cancelled",
                "The shift swap request has been cancelled.",
                null
            );
        }
    }

    @Transactional(readOnly = true)
    public java.util.List<com.shiftsync.shift.dto.ShiftSwapRequestDTO> getMySwapRequests(UUID staffId) {
        return shiftSwapRequestRepository.findByFromStaffIdOrToStaffId(staffId, staffId).stream()
                .map(this::mapToDTO)
                .toList();
    }

    @Transactional(readOnly = true)
    public java.util.List<com.shiftsync.shift.dto.ShiftSwapRequestDTO> getStoreSwapRequests(UUID storeId, SwapStatus status) {
        java.util.List<ShiftSwapRequest> requests;
        if (status != null) {
            requests = shiftSwapRequestRepository.findByFromShiftId_StoreIdAndStatus(storeId, status);
        } else {
            requests = shiftSwapRequestRepository.findByFromShiftId_StoreId(storeId);
        }
        return requests.stream()
                .map(this::mapToDTO)
                .toList();
    }

    private com.shiftsync.shift.dto.ShiftSwapRequestDTO mapToDTO(ShiftSwapRequest swap) {
        return com.shiftsync.shift.dto.ShiftSwapRequestDTO.builder()
                .id(swap.getId())
                .fromStaffId(swap.getFromStaff() != null ? swap.getFromStaff().getId() : null)
                .fromStaffName(swap.getFromStaff() != null ? swap.getFromStaff().getFullName() : null)
                .fromShiftId(swap.getFromShift() != null ? swap.getFromShift().getId() : null)
                .fromShiftDate(swap.getFromShift() != null ? swap.getFromShift().getShiftDate() : null)
                .fromShiftStartTime(swap.getFromShift() != null ? swap.getFromShift().getStartTime() : null)
                .fromShiftEndTime(swap.getFromShift() != null ? swap.getFromShift().getEndTime() : null)
                .toStaffId(swap.getToStaff() != null ? swap.getToStaff().getId() : null)
                .toStaffName(swap.getToStaff() != null ? swap.getToStaff().getFullName() : null)
                .toShiftId(swap.getToShift() != null ? swap.getToShift().getId() : null)
                .toShiftDate(swap.getToShift() != null ? swap.getToShift().getShiftDate() : null)
                .toShiftStartTime(swap.getToShift() != null ? swap.getToShift().getStartTime() : null)
                .toShiftEndTime(swap.getToShift() != null ? swap.getToShift().getEndTime() : null)
                .status(swap.getStatus())
                .approvedById(swap.getApprovedBy() != null ? swap.getApprovedBy().getId() : null)
                .employeeAccepted(swap.isEmployeeAccepted())
                .build();
    }
}
