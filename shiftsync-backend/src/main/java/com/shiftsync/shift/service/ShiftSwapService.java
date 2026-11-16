package com.shiftsync.shift.service;
import com.shiftsync.audit.service.AuditLogService;

import com.shiftsync.auth.entity.User;
import com.shiftsync.auth.repository.UserRepository;
import com.shiftsync.shared.exception.BusinessException;
import com.shiftsync.shift.entity.Shift;
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
    private final ShiftAssignmentValidator assignmentValidator;
    @org.springframework.beans.factory.annotation.Autowired
    private com.shiftsync.payroll.repository.PayrollPeriodRepository payrollPeriods;
    @org.springframework.beans.factory.annotation.Autowired
    private com.shiftsync.store.repository.StoreRepository payrollStores;
    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private com.shiftsync.payroll.service.CompensationRevisionResolver compensationRevisions;
    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private com.shiftsync.skill.repository.SkillRepository skillRepository;
    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private com.shiftsync.payroll.repository.HolidayRepository holidayRepository;
    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private com.shiftsync.shared.websocket.RealtimeEventPublisher realtimeEventPublisher;

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
            @org.springframework.beans.factory.annotation.Autowired(required = false) com.shiftsync.leave.repository.LeaveRequestRepository leaveRequestRepository,
            ShiftAssignmentValidator assignmentValidator
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
        this.assignmentValidator = assignmentValidator;
    }

    public ShiftSwapService(AuditLogService auditLogService, ShiftSwapRequestRepository requests,
            ShiftAssignmentRepository assignments, UserRepository users, ShiftValidationService validation,
            com.shiftsync.notification.service.NotificationService notifications,
            com.shiftsync.employment.repository.EmploymentRepository employment,
            com.shiftsync.attendance.repository.AttendanceRepository attendance,
            com.shiftsync.leave.repository.LeaveRequestRepository leave) {
        this(auditLogService, requests, assignments, users, validation, notifications, employment, attendance, leave, null);
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

    @Transactional(isolation = org.springframework.transaction.annotation.Isolation.SERIALIZABLE, rollbackFor = Exception.class)
    public java.util.List<ShiftSwapRequest> createMultiGiveawayRequests(UUID fromStaffId, UUID fromShiftId, java.util.List<UUID> toStaffIds) {
        if (toStaffIds == null || toStaffIds.isEmpty()) {
            throw new BusinessException("Vui lòng chọn ít nhất 1 đồng nghiệp để nhường ca", HttpStatus.BAD_REQUEST);
        }
        java.util.List<UUID> distinctRecipients = toStaffIds.stream().filter(java.util.Objects::nonNull).distinct().toList();
        if (distinctRecipients.isEmpty()) {
            throw new BusinessException("Vui lòng chọn ít nhất 1 đồng nghiệp để nhường ca", HttpStatus.BAD_REQUEST);
        }
        if (distinctRecipients.size() > 3) {
            throw new BusinessException("Tối đa chỉ được gửi yêu cầu nhường ca cho 3 người", HttpStatus.BAD_REQUEST);
        }
        java.util.List<ShiftSwapRequest> created = new java.util.ArrayList<>();
        for (UUID recipientId : distinctRecipients) {
            created.add(createSwapRequest(fromStaffId, fromShiftId, recipientId, null));
        }
        return created;
    }

    @Transactional(isolation = org.springframework.transaction.annotation.Isolation.SERIALIZABLE, rollbackFor = Exception.class)
    public ShiftSwapRequest createSwapRequest(UUID fromStaffId, UUID fromShiftId, UUID toStaffId, UUID toShiftId) {
        if (fromStaffId.equals(toStaffId)) {
            throw new BusinessException("Cannot swap with yourself", HttpStatus.BAD_REQUEST);
        }

        ShiftAssignment fromAssignment = shiftAssignmentRepository.findByShiftIdAndStaffId(fromShiftId, fromStaffId)
                .orElseThrow(() -> new BusinessException("You are not assigned to the source shift", HttpStatus.BAD_REQUEST));

        if (fromAssignment.getShift().getStatus() != com.shiftsync.shift.enums.ShiftStatus.PUBLISHED) {
            throw new BusinessException("Only published shifts can be swapped", HttpStatus.BAD_REQUEST);
        }
        if (hasStarted(fromAssignment.getShift())) {
            throw new BusinessException("Cannot create a swap request for shifts that have already started or occurred in the past.", HttpStatus.BAD_REQUEST);
        }
        if (attendanceRepository != null && attendanceRepository.existsByShiftAssignmentId(fromAssignment.getId())) {
            throw new BusinessException("Cannot swap shifts that have already started or recorded attendance", HttpStatus.BAD_REQUEST);
        }
        if (fromAssignment.getSource() == AssignmentSource.WORKFORCE_SHARING) {
            throw new BusinessException("Ca hỗ trợ liên cửa hàng cần được điều phối lại qua yêu cầu hỗ trợ", HttpStatus.CONFLICT);
        }

        ShiftAssignment toAssignment = null;
        if (toShiftId != null) {
            toAssignment = shiftAssignmentRepository.findByShiftIdAndStaffId(toShiftId, toStaffId)
                    .orElseThrow(() -> new BusinessException("Target staff is not assigned to the target shift", HttpStatus.BAD_REQUEST));

            if (!fromAssignment.getShift().getStore().getId().equals(toAssignment.getShift().getStore().getId())) {
                throw new BusinessException("Shifts must belong to the same store", HttpStatus.BAD_REQUEST);
            }
            if (toAssignment.getShift().getStatus() != com.shiftsync.shift.enums.ShiftStatus.PUBLISHED) {
                throw new BusinessException("Only published shifts can be swapped", HttpStatus.BAD_REQUEST);
            }
            if (hasStarted(toAssignment.getShift())) {
                throw new BusinessException("Cannot create a swap request for shifts that have already started or occurred in the past.", HttpStatus.BAD_REQUEST);
            }
            if (attendanceRepository != null && attendanceRepository.existsByShiftAssignmentId(toAssignment.getId())) {
                throw new BusinessException("Cannot swap shifts that have already started or recorded attendance", HttpStatus.BAD_REQUEST);
            }
            if (toAssignment.getSource() == AssignmentSource.WORKFORCE_SHARING) {
                throw new BusinessException("Ca hỗ trợ liên cửa hàng cần được điều phối lại qua yêu cầu hỗ trợ", HttpStatus.CONFLICT);
            }
        } else if (employmentRepository != null
                && !employmentRepository.existsByUserIdAndStoreIdAndStatus(
                        toStaffId, fromAssignment.getShift().getStore().getId(), com.shiftsync.employment.enums.EmploymentStatus.ACTIVE)) {
            throw new BusinessException("Nhân viên nhận ca không còn làm việc tại cửa hàng", HttpStatus.BAD_REQUEST);
        }

        if (toShiftId != null) {
            ensureNoActivePendingSwap(fromShiftId, fromStaffId, "A pending swap request already exists for your shift");
            ensureNoActivePendingSwap(toShiftId, toStaffId, "Target staff already has a pending swap request for this shift");
        } else {
            ensureGiveawayQuotaAndNoDuplicate(fromShiftId, fromStaffId, toStaffId);
        }

        User fromStaff = userRepository.findById(fromStaffId)
                .orElseThrow(() -> new BusinessException("Source staff not found", HttpStatus.NOT_FOUND));
        User toStaff = userRepository.findById(toStaffId)
                .orElseThrow(() -> new BusinessException("Target staff not found", HttpStatus.NOT_FOUND));

        validateSwapConstraints(
                fromAssignment.getShift(),
                toAssignment != null ? toAssignment.getShift() : null,
                fromStaffId,
                toStaffId,
                fromAssignment,
                toAssignment,
                fromStaff.getFullName(),
                toStaff.getFullName()
        );

        ShiftSwapRequest request = ShiftSwapRequest.builder()
                .fromStaff(fromStaff)
                .fromShift(fromAssignment.getShift())
                .toStaff(toStaff)
                .toShift(toAssignment != null ? toAssignment.getShift() : null)
                .status(SwapStatus.PENDING)
                .build();

        ShiftSwapRequest saved = shiftSwapRequestRepository.save(request);
        publishSwapRequestUpdate(saved, "SWAP_CREATED");

        try {
            notificationService.sendNotification(
                toStaff.getId(),
                com.shiftsync.notification.entity.NotificationType.SHIFT_SWAP_UPDATED,
                "Yêu cầu đổi ca mới",
                fromStaff.getFullName() + " muốn đổi ca với bạn (" + fromAssignment.getShift().getShiftDate() + ").",
                java.util.Map.of("swapRequestId", saved.getId().toString(), "type", "SWAP_REQUEST")
            );
        } catch (Exception e) {
            log.warn("Không thể gửi thông báo yêu cầu đổi ca mới: {}", e.getMessage());
        }

        return saved;

    }

    @Transactional(isolation = org.springframework.transaction.annotation.Isolation.SERIALIZABLE, rollbackFor = Exception.class)
    public void respondToSwapRequest(UUID requestId, UUID toStaffId, boolean accept) {
        ShiftSwapRequest request = shiftSwapRequestRepository.findById(requestId)
                .orElseThrow(() -> new BusinessException("Swap request not found", HttpStatus.NOT_FOUND));

        expireIfPast(request);

        if (!request.getToStaff().getId().equals(toStaffId)) {
            throw new BusinessException("You are not the target of this swap request", HttpStatus.FORBIDDEN);
        }

        if (request.getStatus() != SwapStatus.PENDING) {
            throw new BusinessException("This request has already been processed", HttpStatus.BAD_REQUEST);
        }

        if (!accept) {
            request.setStatus(SwapStatus.REJECTED);
            shiftSwapRequestRepository.save(request);
            publishSwapRequestUpdate(request, "SWAP_EMPLOYEE_REJECTED");
            
            try {
                notificationService.sendNotification(
                    request.getFromStaff().getId(),
                    com.shiftsync.notification.entity.NotificationType.SHIFT_SWAP_UPDATED,
                    "Yêu cầu đổi ca bị từ chối",
                    request.getToStaff().getFullName() + " đã từ chối yêu cầu đổi ca của bạn.",
                    java.util.Map.of("swapRequestId", request.getId().toString(), "status", "REJECTED")
                );
            } catch (Exception e) {
                log.warn("Không thể gửi thông báo từ chối đổi ca: {}", e.getMessage());
            }
            return;
        }

        request.setEmployeeAccepted(true);
        shiftSwapRequestRepository.save(request);
        publishSwapRequestUpdate(request, "SWAP_EMPLOYEE_ACCEPTED");

        try {
            notificationService.sendNotification(
                request.getFromStaff().getId(),
                com.shiftsync.notification.entity.NotificationType.SHIFT_SWAP_UPDATED,
                "Đồng nghiệp đã đồng ý đổi ca",
                request.getToStaff().getFullName() + " đã chấp nhận yêu cầu đổi ca. Đang chờ Quản lý phê duyệt.",
                java.util.Map.of("swapRequestId", request.getId().toString(), "status", "ACCEPTED")
            );
        } catch (Exception e) {
            log.warn("Không thể gửi thông báo chấp nhận đổi ca: {}", e.getMessage());
        }
    }

    private void publishSwapRequestUpdate(ShiftSwapRequest request, String action) {
        if (realtimeEventPublisher == null || request == null || request.getFromShift() == null
                || request.getFromShift().getStore() == null) return;
        UUID storeId = request.getFromShift().getStore().getId();
        if (storeId == null) return;
        realtimeEventPublisher.publishStoreEvent(storeId, "requests", action,
                java.util.Map.of(
                        "swapRequestId", request.getId().toString(),
                        "status", request.getStatus().name(),
                        "employeeAccepted", request.isEmployeeAccepted()));
    }

    @Transactional(isolation = org.springframework.transaction.annotation.Isolation.SERIALIZABLE, rollbackFor = Exception.class)
    public void managerApproveSwapRequest(UUID requestId, UUID managerId) {
        ShiftSwapRequest request = shiftSwapRequestRepository.findById(requestId)
                .orElseThrow(() -> new BusinessException("Swap request not found", HttpStatus.NOT_FOUND));

        expireIfPast(request);

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

        if (employmentRepository != null && (!employmentRepository.existsByUserIdAndStoreIdAndStatus(request.getFromStaff().getId(), shiftStoreId, com.shiftsync.employment.enums.EmploymentStatus.ACTIVE)
                || !employmentRepository.existsByUserIdAndStoreIdAndStatus(request.getToStaff().getId(), shiftStoreId, com.shiftsync.employment.enums.EmploymentStatus.ACTIVE))) {
            throw new BusinessException("Nhân viên không còn làm việc tại cửa hàng", HttpStatus.CONFLICT);
        }
        java.util.List<Shift> involvedShifts = request.getToShift() != null
                ? java.util.List.of(request.getFromShift(), request.getToShift())
                : java.util.List.of(request.getFromShift());

        if (payrollPeriods != null) {
            payrollStores.findByIdForUpdate(shiftStoreId)
                    .orElseThrow(() -> new BusinessException("Không tìm thấy chi nhánh", HttpStatus.NOT_FOUND));
            for (Shift shift : involvedShifts) {
                for (var day = shift.getShiftDate(); !day.isAfter(ShiftDateRange.lastWorkingDate(shift)); day = day.plusDays(1)) {
                    if (payrollPeriods.existsByStoreIdAndStartDateLessThanEqualAndEndDateGreaterThanEqualAndStatusIn(shiftStoreId, day, day,
                            java.util.List.of(com.shiftsync.payroll.enums.PayrollPeriodStatus.CONFIRMED, com.shiftsync.payroll.enums.PayrollPeriodStatus.PAID))) {
                        throw new BusinessException("Không thể đổi ca thuộc kỳ lương đã khóa", HttpStatus.CONFLICT);
                    }
                }
            }
        }

        if (request.getFromShift().getStatus() != com.shiftsync.shift.enums.ShiftStatus.PUBLISHED ||
            (request.getToShift() != null && request.getToShift().getStatus() != com.shiftsync.shift.enums.ShiftStatus.PUBLISHED)) {
            throw new BusinessException("One or both shifts are no longer published", HttpStatus.BAD_REQUEST);
        }

        // Swap or transfer the assignments
        ShiftAssignment fromAssignment = shiftAssignmentRepository.findByShiftIdAndStaffId(request.getFromShift().getId(), request.getFromStaff().getId())
                .orElseThrow(() -> new BusinessException("Original assignment not found for fromStaff", HttpStatus.NOT_FOUND));

        ShiftAssignment toAssignment = null;
        if (request.getToShift() != null) {
            toAssignment = shiftAssignmentRepository.findByShiftIdAndStaffId(request.getToShift().getId(), request.getToStaff().getId())
                    .orElseThrow(() -> new BusinessException("Original assignment not found for toStaff", HttpStatus.NOT_FOUND));
        }

        if (fromAssignment.getSource() == AssignmentSource.WORKFORCE_SHARING
                || (toAssignment != null && toAssignment.getSource() == AssignmentSource.WORKFORCE_SHARING)) {
            throw new BusinessException("Ca hỗ trợ liên cửa hàng cần được điều phối lại qua yêu cầu hỗ trợ", HttpStatus.CONFLICT);
        }

        validateSwapConstraints(
                request.getFromShift(),
                request.getToShift(),
                request.getFromStaff().getId(),
                request.getToStaff().getId(),
                fromAssignment,
                toAssignment,
                request.getFromStaff().getFullName(),
                request.getToStaff().getFullName()
        );

        if (attendanceRepository != null &&
            (attendanceRepository.existsByShiftAssignmentId(fromAssignment.getId()) ||
             (toAssignment != null && attendanceRepository.existsByShiftAssignmentId(toAssignment.getId())))) {
            throw new BusinessException("Cannot swap shifts that have already started or recorded attendance", HttpStatus.BAD_REQUEST);
        }

        fromAssignment.setStaff(request.getToStaff());
        fromAssignment.setSource(AssignmentSource.SWAP);
        shiftAssignmentRepository.save(fromAssignment);

        if (toAssignment != null) {
            toAssignment.setStaff(request.getFromStaff());
            toAssignment.setSource(AssignmentSource.SWAP);
            shiftAssignmentRepository.save(toAssignment);
        }

        request.setStatus(SwapStatus.APPROVED);
        request.setApprovedBy(manager);
        shiftSwapRequestRepository.save(request);
        publishSwapRequestUpdate(request, "SWAP_MANAGER_APPROVED");

        if (request.getToShift() == null) {
            java.util.List<ShiftSwapRequest> siblingPending = shiftSwapRequestRepository.findByStatusAndShiftAndStaff(
                    SwapStatus.PENDING, request.getFromShift().getId(), request.getFromStaff().getId());
            for (ShiftSwapRequest sibling : siblingPending) {
                if (!sibling.getId().equals(request.getId())) {
                    sibling.setStatus(SwapStatus.CANCELLED);
                    shiftSwapRequestRepository.save(sibling);
                }
            }
        }
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
            log.warn("Không thể gửi thông báo duyệt đổi ca {}: {}", requestId, e.getMessage());
        }
    }

    @Transactional(isolation = org.springframework.transaction.annotation.Isolation.SERIALIZABLE, rollbackFor = Exception.class)
    public void managerRejectSwapRequest(UUID requestId, UUID managerId) {
        ShiftSwapRequest request = shiftSwapRequestRepository.findById(requestId)
                .orElseThrow(() -> new BusinessException("Swap request not found", HttpStatus.NOT_FOUND));

        expireIfPast(request);

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
        publishSwapRequestUpdate(request, "SWAP_MANAGER_REJECTED");

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

    @Transactional(isolation = org.springframework.transaction.annotation.Isolation.SERIALIZABLE, rollbackFor = Exception.class)
    public void cancelSwapRequest(UUID requestId, UUID userId) {
        ShiftSwapRequest request = shiftSwapRequestRepository.findById(requestId)
                .orElseThrow(() -> new BusinessException("Swap request not found", HttpStatus.NOT_FOUND));

        expireIfPast(request);

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
        publishSwapRequestUpdate(request, "SWAP_CANCELLED");

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
        java.util.List<ShiftSwapRequest> requests = shiftSwapRequestRepository.findByFromStaffIdOrToStaffId(staffId, staffId);
        return requests.stream()
                .map(swap -> mapToDTO(swap, staffId, false))
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
                .map(swap -> mapToDTO(swap, null, true))
                .toList();
    }

    @org.springframework.scheduling.annotation.Scheduled(fixedDelay = 300000)
    @Transactional
    public void expireStalePendingSwaps() {
        java.util.List<ShiftSwapRequest> pending = shiftSwapRequestRepository.findByStatus(SwapStatus.PENDING);
        for (ShiftSwapRequest request : pending) {
            if (isExpired(request)) {
                request.setStatus(SwapStatus.EXPIRED);
                shiftSwapRequestRepository.save(request);
            }
        }
    }

    private void ensureGiveawayQuotaAndNoDuplicate(UUID shiftId, UUID fromStaffId, UUID toStaffId) {
        java.util.List<ShiftSwapRequest> existing = shiftSwapRequestRepository.findByStatusAndShiftAndStaff(SwapStatus.PENDING, shiftId, fromStaffId);
        int activeGiveaways = 0;
        for (ShiftSwapRequest req : existing) {
            if (isExpired(req)) {
                req.setStatus(SwapStatus.EXPIRED);
                shiftSwapRequestRepository.save(req);
                continue;
            }
            if (req.getToShift() != null) {
                throw new BusinessException("A pending swap request already exists for your shift", HttpStatus.CONFLICT);
            }
            if (req.getToStaff() != null && req.getToStaff().getId().equals(toStaffId)) {
                throw new BusinessException("Đã gửi yêu cầu nhường ca cho nhân viên này rồi", HttpStatus.CONFLICT);
            }
            activeGiveaways++;
        }
        if (activeGiveaways >= 3) {
            throw new BusinessException("Tối đa chỉ được gửi yêu cầu nhường ca cho 3 người", HttpStatus.BAD_REQUEST);
        }
    }

    private void ensureNoActivePendingSwap(UUID shiftId, UUID staffId, String conflictMessage) {
        java.util.List<ShiftSwapRequest> existing = shiftSwapRequestRepository.findByStatusAndShiftAndStaff(SwapStatus.PENDING, shiftId, staffId);
        for (ShiftSwapRequest req : existing) {
            if (isExpired(req)) {
                req.setStatus(SwapStatus.EXPIRED);
                shiftSwapRequestRepository.save(req);
            } else {
                throw new BusinessException(conflictMessage, HttpStatus.CONFLICT);
            }
        }
    }

    private void validateSwapConstraints(
            Shift fromShift,
            Shift toShift,
            UUID fromStaffId,
            UUID toStaffId,
            ShiftAssignment fromAssignment,
            ShiftAssignment toAssignment,
            String fromStaffName,
            String toStaffName) {
        if (assignmentValidator != null && toShift != null) {
            assignmentValidator.validateAvailabilityAndTimeOff(toShift, fromStaffId);
            assignmentValidator.validateAvailabilityAndTimeOff(fromShift, toStaffId);
        }

        if (leaveRequestRepository != null) {
            if (toShift != null) {
                boolean fromStaffOnLeave = leaveRequestRepository.findOverlappingRequests(
                        fromStaffId, toShift.getShiftDate(), ShiftDateRange.lastWorkingDate(toShift))
                        .stream().anyMatch(l -> l.getStatus() == com.shiftsync.leave.enums.LeaveStatus.APPROVED);
                if (fromStaffOnLeave) {
                    throw new BusinessException(fromStaffName + " has approved leave on target shift date", HttpStatus.BAD_REQUEST);
                }
            }

            boolean toStaffOnLeave = leaveRequestRepository.findOverlappingRequests(
                    toStaffId, fromShift.getShiftDate(), ShiftDateRange.lastWorkingDate(fromShift))
                    .stream().anyMatch(l -> l.getStatus() == com.shiftsync.leave.enums.LeaveStatus.APPROVED);
            if (toStaffOnLeave) {
                throw new BusinessException(toStaffName + " has approved leave on target shift date", HttpStatus.BAD_REQUEST);
            }
        }

        if (shiftValidationService != null) {
            if (toShift != null) {
                shiftValidationService.validateNoOverlapAndWeeklyHours(toShift, fromStaffId, fromShift.getId());
                shiftValidationService.validateNoOverlapAndWeeklyHours(fromShift, toStaffId, toShift.getId());
            } else {
                // 1-way giveaway allows exceeding weekly hour limit; only check shift overlap
                shiftValidationService.validateNoOverlap(fromShift, toStaffId, null);
            }
        }

        if (assignmentValidator != null) {
            assignmentValidator.validateSwapSkill(fromShift, toStaffId, fromAssignment.getRequiredSkillId());
            if (toShift != null && toAssignment != null) {
                assignmentValidator.validateSwapSkill(toShift, fromStaffId, toAssignment.getRequiredSkillId());
            }
        }
    }

    private boolean hasStarted(Shift shift) {
        if (shift == null || shift.getShiftDate() == null || shift.getStartTime() == null) {
            return false;
        }
        java.time.LocalDateTime now = java.time.LocalDateTime.now(java.time.ZoneId.of("Asia/Ho_Chi_Minh"));
        return !java.time.LocalDateTime.of(shift.getShiftDate(), shift.getStartTime()).isAfter(now);
    }

    private boolean isExpired(ShiftSwapRequest request) {
        return request.getStatus() == SwapStatus.PENDING
                && (hasStarted(request.getFromShift()) || hasStarted(request.getToShift()));
    }

    private void expireIfPast(ShiftSwapRequest request) {
        if (isExpired(request)) {
            request.setStatus(SwapStatus.EXPIRED);
            shiftSwapRequestRepository.save(request);
            throw new BusinessException("This swap request has expired because at least one shift has already started.", HttpStatus.CONFLICT);
        }
    }

    public com.shiftsync.shift.dto.ShiftSwapRequestDTO toDTO(ShiftSwapRequest swap, UUID viewerStaffId) {
        return mapToDTO(swap, viewerStaffId, false);
    }

    private com.shiftsync.shift.dto.ShiftSwapRequestDTO mapToDTO(ShiftSwapRequest swap, UUID viewerStaffId, boolean includeStoreCostDelta) {
        SwapStatus effectiveStatus = isExpired(swap) ? SwapStatus.EXPIRED : swap.getStatus();
        UUID fromStaffId = swap.getFromStaff() != null ? swap.getFromStaff().getId() : null;
        UUID toStaffId = swap.getToStaff() != null ? swap.getToStaff().getId() : null;
        UUID fromSkillId = resolveSkillId(swap.getFromShift(), fromStaffId, toStaffId, swap.getStatus());
        UUID toSkillId = resolveSkillId(swap.getToShift(), toStaffId, fromStaffId, swap.getStatus());
        String fromRoleName = resolveSkillName(fromSkillId);
        String toRoleName = resolveSkillName(toSkillId);

        java.math.BigDecimal myPayDelta = null;
        if (viewerStaffId != null && swap.getFromShift() != null) {
            if (swap.getToShift() != null) {
                if (viewerStaffId.equals(fromStaffId)) {
                    myPayDelta = computeStaffPayDelta(fromStaffId, swap.getFromShift(), fromSkillId, swap.getToShift(), toSkillId);
                } else if (viewerStaffId.equals(toStaffId)) {
                    myPayDelta = computeStaffPayDelta(toStaffId, swap.getToShift(), toSkillId, swap.getFromShift(), fromSkillId);
                }
            } else {
                // 1-way giveaway: fromStaff gives away fromShift (-pay), toStaff receives fromShift (+pay)
                if (viewerStaffId.equals(fromStaffId)) {
                    var lost = estimateShiftPay(fromStaffId, swap.getFromShift(), fromSkillId);
                    if (lost != null) myPayDelta = lost.negate().setScale(0, java.math.RoundingMode.HALF_UP);
                } else if (viewerStaffId.equals(toStaffId)) {
                    var gained = estimateShiftPay(toStaffId, swap.getFromShift(), fromSkillId);
                    if (gained != null) myPayDelta = gained.setScale(0, java.math.RoundingMode.HALF_UP);
                }
            }
        }

        java.math.BigDecimal storeCostDelta = null;
        if (includeStoreCostDelta && fromStaffId != null && toStaffId != null && swap.getFromShift() != null) {
            if (swap.getToShift() != null) {
                java.math.BigDecimal fromDelta = computeStaffPayDelta(fromStaffId, swap.getFromShift(), fromSkillId, swap.getToShift(), toSkillId);
                java.math.BigDecimal toDelta = computeStaffPayDelta(toStaffId, swap.getToShift(), toSkillId, swap.getFromShift(), fromSkillId);
                if (fromDelta != null && toDelta != null) {
                    storeCostDelta = fromDelta.add(toDelta).setScale(0, java.math.RoundingMode.HALF_UP);
                }
            } else {
                var fromCost = estimateShiftPay(fromStaffId, swap.getFromShift(), fromSkillId);
                var toCost = estimateShiftPay(toStaffId, swap.getFromShift(), fromSkillId);
                if (fromCost != null && toCost != null) {
                    storeCostDelta = toCost.subtract(fromCost).setScale(0, java.math.RoundingMode.HALF_UP);
                }
            }
        }

        return com.shiftsync.shift.dto.ShiftSwapRequestDTO.builder()
                .id(swap.getId())
                .fromStaffId(fromStaffId)
                .fromStaffName(swap.getFromStaff() != null ? swap.getFromStaff().getFullName() : null)
                .fromShiftId(swap.getFromShift() != null ? swap.getFromShift().getId() : null)
                .fromShiftDate(swap.getFromShift() != null ? swap.getFromShift().getShiftDate() : null)
                .fromShiftStartTime(swap.getFromShift() != null ? swap.getFromShift().getStartTime() : null)
                .fromShiftEndTime(swap.getFromShift() != null ? swap.getFromShift().getEndTime() : null)
                .toStaffId(toStaffId)
                .toStaffName(swap.getToStaff() != null ? swap.getToStaff().getFullName() : null)
                .toShiftId(swap.getToShift() != null ? swap.getToShift().getId() : null)
                .toShiftDate(swap.getToShift() != null ? swap.getToShift().getShiftDate() : null)
                .toShiftStartTime(swap.getToShift() != null ? swap.getToShift().getStartTime() : null)
                .toShiftEndTime(swap.getToShift() != null ? swap.getToShift().getEndTime() : null)
                .status(effectiveStatus)
                .approvedById(swap.getApprovedBy() != null ? swap.getApprovedBy().getId() : null)
                .employeeAccepted(swap.isEmployeeAccepted())
                .createdAt(swap.getCreatedAt())
                .fromShiftRoleName(fromRoleName)
                .toShiftRoleName(toRoleName)
                .myEstimatedPayDelta(myPayDelta)
                .storeLaborCostDelta(storeCostDelta)
                .build();
    }

    private UUID resolveSkillId(Shift shift, UUID primaryStaffId, UUID fallbackStaffId, SwapStatus status) {
        if (shift == null) return null;
        if (shiftAssignmentRepository != null && shift.getId() != null) {
            UUID targetStaff = status == SwapStatus.APPROVED && fallbackStaffId != null ? fallbackStaffId : primaryStaffId;
            if (targetStaff != null) {
                var found = shiftAssignmentRepository.findByShiftIdAndStaffId(shift.getId(), targetStaff)
                        .map(ShiftAssignment::getRequiredSkillId)
                        .orElse(null);
                if (found != null) return found;
            }
        }
        if (shift.getRequirements() != null && shift.getRequirements().size() == 1 && shift.getRequirements().get(0).getSkill() != null) {
            return shift.getRequirements().get(0).getSkill().getId();
        }
        return null;
    }

    private String resolveSkillName(UUID skillId) {
        if (skillId == null || skillRepository == null) return null;
        return skillRepository.findById(skillId).map(com.shiftsync.skill.entity.Skill::getName).orElse(null);
    }

    private java.math.BigDecimal computeStaffPayDelta(UUID staffId, Shift giveShift, UUID giveSkillId, Shift takeShift, UUID takeSkillId) {
        java.math.BigDecimal givePay = estimateShiftPay(staffId, giveShift, giveSkillId);
        java.math.BigDecimal takePay = estimateShiftPay(staffId, takeShift, takeSkillId);
        if (givePay == null || takePay == null) return null;
        return takePay.subtract(givePay).setScale(0, java.math.RoundingMode.HALF_UP);
    }

    private java.math.BigDecimal estimateShiftPay(UUID staffId, Shift shift, UUID skillId) {
        if (staffId == null || shift == null || shift.getStore() == null || shift.getShiftDate() == null
                || shift.getStartTime() == null || shift.getEndTime() == null
                || employmentRepository == null || compensationRevisions == null) {
            return null;
        }
        try {
            var employments = employmentRepository.findByUserIdAndStoreIdAndStatus(
                    staffId, shift.getStore().getId(), com.shiftsync.employment.enums.EmploymentStatus.ACTIVE);
            if (employments == null || employments.isEmpty()) return null;
            var emp = employments.get(0);
            var terms = compensationRevisions.resolvePayTerms(
                    emp.getId(), emp.getStore().getId(), shift.getStore().getId(), skillId, shift.getShiftDate());
            if (terms == null || terms.hourlyRate() == null) return null;
            long minutes = java.time.Duration.between(ShiftTimeRange.start(shift), ShiftTimeRange.end(shift)).toMinutes();
            if (minutes <= 0) return null;
            java.math.BigDecimal hours = java.math.BigDecimal.valueOf(minutes)
                    .divide(java.math.BigDecimal.valueOf(60), 4, java.math.RoundingMode.HALF_UP);
            java.math.BigDecimal multiplier = java.math.BigDecimal.ONE;
            if (holidayRepository != null) {
                var holidays = holidayRepository.findByHolidayDateBetween(shift.getShiftDate(), shift.getShiftDate());
                if (holidays != null && !holidays.isEmpty() && holidays.get(0).getRateMultiplier() != null) {
                    multiplier = holidays.get(0).getRateMultiplier();
                }
            }
            return hours.multiply(terms.hourlyRate()).multiply(multiplier);
        } catch (Exception e) {
            log.debug("Could not estimate shift pay for swap preview: {}", e.getMessage());
            return null;
        }
    }
}
