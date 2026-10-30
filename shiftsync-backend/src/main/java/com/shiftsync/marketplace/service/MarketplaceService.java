package com.shiftsync.marketplace.service;

import com.shiftsync.shared.exception.BusinessException;
import com.shiftsync.shift.entity.Shift;
import com.shiftsync.shift.entity.ShiftAssignment;
import com.shiftsync.shift.entity.ShiftSkillRequirement;
import com.shiftsync.shift.enums.ShiftStatus;
import com.shiftsync.shift.repository.ShiftAssignmentRepository;
import com.shiftsync.shift.repository.ShiftRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.redisson.api.RLock;
import org.redisson.api.RedissonClient;
import org.springframework.http.HttpStatus;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class MarketplaceService {

    private static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private final ShiftRepository shiftRepository;
    private final ShiftAssignmentRepository shiftAssignmentRepository;
    private final RedissonClient redissonClient;
    private final com.shiftsync.shift.service.ShiftValidationService shiftValidationService;
    private final com.shiftsync.shift.service.ShiftAssignmentValidator shiftAssignmentValidator;
    private final com.shiftsync.auth.repository.UserRepository userRepository;
    private final com.shiftsync.employment.repository.EmploymentRepository employmentRepository;
    private final com.shiftsync.skill.repository.StaffSkillRepository staffSkillRepository;
    private final com.shiftsync.notification.service.NotificationService notificationService;
    private final TransactionTemplate transactionTemplate;
    @Autowired(required = false)
    private com.shiftsync.shared.websocket.RealtimeEventPublisher realtimeEventPublisher;

    @Transactional(isolation = org.springframework.transaction.annotation.Isolation.SERIALIZABLE, rollbackFor = Exception.class)
    public void publishToMarketplace(UUID storeId, UUID shiftId) {
        Shift shift = shiftRepository.findByIdAndStoreId(shiftId, storeId)
                .orElseThrow(() -> new BusinessException("Shift not found", HttpStatus.NOT_FOUND));

        if (shift.getStatus() == ShiftStatus.DRAFT) {
            shift.setStatus(ShiftStatus.PUBLISHED);
        } else if (shift.getStatus() != ShiftStatus.PUBLISHED) {
            throw new BusinessException("Cancelled or completed shifts cannot be published to Marketplace", HttpStatus.BAD_REQUEST);
        }
        
        if (shift.isOpen()) {
            throw new BusinessException("Shift is already on Marketplace", HttpStatus.BAD_REQUEST);
        }

        // Check if understaffed
        int requiredCount = shift.getRequirements().stream()
                .mapToInt(ShiftSkillRequirement::getRequiredCount)
                .sum();
        if (requiredCount == 0) {
            requiredCount = Math.max(1, (int) shiftAssignmentRepository.countByShiftId(shiftId) + 1);
        }
                
        int assignedCount = (int) shiftAssignmentRepository.countByShiftId(shiftId);
        if (assignedCount >= requiredCount) {
            throw new BusinessException("Shift is already fully staffed. Cannot publish to Marketplace.", HttpStatus.BAD_REQUEST);
        }

        shift.setOpen(true);
        if (shift.getAvailabilityDeadline() == null || shift.getAvailabilityDeadline().isBefore(java.time.ZonedDateTime.now())) {
            java.time.ZonedDateTime deadline = shift.getShiftDate().atTime(shift.getStartTime()).atZone(java.time.ZoneId.of("Asia/Ho_Chi_Minh"));
            shift.setAvailabilityDeadline(deadline);
        }
        shiftRepository.save(shift);
        publishMarketplaceEvent(storeId, "OPEN_SHIFT_PUBLISHED", shiftId, null);

                // Hook FR-19: OPEN_SHIFT_AVAILABLE
        // Find all ACTIVE employments in store
        List<com.shiftsync.employment.entity.Employment> activeEmployments = 
            employmentRepository.findByStoreIdAndStatusAndUserSystemRole(storeId, com.shiftsync.employment.enums.EmploymentStatus.ACTIVE, com.shiftsync.shared.security.SystemRole.STAFF);
            
        java.util.Set<UUID> requiredSkillIds = shift.getRequirements().stream()
                .map(r -> r.getSkill().getId())
                .collect(java.util.stream.Collectors.toSet());
                
        java.util.List<UUID> staffIds = activeEmployments.stream().map(e -> e.getUser().getId()).toList();
        java.util.Map<UUID, java.util.List<com.shiftsync.skill.entity.StaffSkill>> skillsMap = staffSkillRepository.findByStaffIdIn(staffIds)
                .stream().collect(java.util.stream.Collectors.groupingBy(com.shiftsync.skill.entity.StaffSkill::getStaffId));
                
        for (com.shiftsync.employment.entity.Employment emp : activeEmployments) {
            boolean eligible = true;
            if (!requiredSkillIds.isEmpty()) {
                java.util.List<com.shiftsync.skill.entity.StaffSkill> staffSkills = skillsMap.getOrDefault(emp.getUser().getId(), java.util.Collections.emptyList());
                boolean hasAnyRequired = staffSkills.stream()
                        .anyMatch(ss -> requiredSkillIds.contains(ss.getSkillId()) && 
                                       (ss.getExpirationDate() == null || !ss.getExpirationDate().isBefore(shift.getShiftDate())));
                if (!hasAnyRequired) {
                    eligible = false;
                }
            }
            
            if (eligible) {
                notificationService.sendNotification(
                    emp.getUser().getId(),
                    com.shiftsync.notification.entity.NotificationType.OPEN_SHIFT_AVAILABLE,
                    "New Open Shift",
                    "A new open shift on " + shift.getShiftDate() + " is available.",
                    null
                );
            }
        }
    }

    @Transactional(isolation = org.springframework.transaction.annotation.Isolation.SERIALIZABLE, rollbackFor = Exception.class)
    public void unpublishFromMarketplace(UUID storeId, UUID shiftId) {
        Shift shift = shiftRepository.findByIdAndStoreId(shiftId, storeId)
                .orElseThrow(() -> new BusinessException("Shift not found", HttpStatus.NOT_FOUND));

        if (!shift.isOpen()) {
            throw new BusinessException("Shift is not on Marketplace", HttpStatus.BAD_REQUEST);
        }

        shift.setOpen(false);
        shiftRepository.save(shift);
        publishMarketplaceEvent(storeId, "OPEN_SHIFT_UNPUBLISHED", shiftId, null);
    }

    @Transactional(readOnly = true)
    public List<Shift> getOpenShifts(UUID storeId) {
        // Return only shifts that are still claimable by time in the business timezone.
        ZonedDateTime now = ZonedDateTime.now(BUSINESS_ZONE);
        List<Shift> openShifts = shiftRepository.findByStoreIdAndStatusAndIsOpenTrue(storeId, ShiftStatus.PUBLISHED);
        
        return openShifts.stream()
                .filter(s -> isClaimableByTime(s, now))
                .collect(Collectors.toList());
    }

    private boolean isClaimableByTime(Shift shift, ZonedDateTime now) {
        boolean deadlineOpen = shift.getAvailabilityDeadline() == null
                || shift.getAvailabilityDeadline().isAfter(now);
        ZonedDateTime shiftStart = shift.getShiftDate()
                .atTime(shift.getStartTime())
                .atZone(BUSINESS_ZONE);
        return deadlineOpen && shiftStart.isAfter(now);
    }

    public void claimOpenShift(UUID storeId, UUID shiftId, UUID staffId) {
        RLock lock = redissonClient.getLock("shift_claim_lock:" + shiftId);
        try {
            // Wait up to 5 seconds to acquire lock, lease for 10 seconds
            if (!lock.tryLock(5, 10, TimeUnit.SECONDS)) {
                throw new BusinessException("Hệ thống đang xử lý, vui lòng thử lại sau", HttpStatus.TOO_MANY_REQUESTS);
            }

            // Inside lock
            transactionTemplate.executeWithoutResult(status -> {
                Shift shift = shiftRepository.findByIdAndStoreId(shiftId, storeId)
                    .orElseThrow(() -> new BusinessException("Shift not found", HttpStatus.NOT_FOUND));

            if (!shift.isOpen()) {
                throw new BusinessException("Ca này không còn trên Marketplace", HttpStatus.BAD_REQUEST);
            }

            if (!isClaimableByTime(shift, ZonedDateTime.now(BUSINESS_ZONE))) {
                throw new BusinessException("Ca này đã hết hạn đăng ký hoặc đã bắt đầu", HttpStatus.BAD_REQUEST);
            }

            if (shiftAssignmentRepository.existsByShiftIdAndStaffId(shiftId, staffId)) {
                throw new BusinessException("Bạn đã được phân công ca này rồi", HttpStatus.CONFLICT);
            }

            int requiredCount = shift.getRequirements().stream()
                    .mapToInt(ShiftSkillRequirement::getRequiredCount)
                    .sum();
            int assignedCount = (int) shiftAssignmentRepository.countByShiftId(shiftId);

            if (assignedCount >= Math.max(1, requiredCount)) {
                throw new BusinessException("Ca này đã có người nhanh tay nhận mất!", HttpStatus.CONFLICT);
            }

            // Unified eligibility validation (skill, blackout, leave, weekly hours, capacity)
            // Open Shift claim is voluntary by employee, bypassing recurring availability check
            shiftAssignmentValidator.validateEligibility(shift, staffId, true);

            com.shiftsync.auth.entity.User staff = userRepository.findById(staffId)
                    .orElseThrow(() -> new BusinessException("User not found", HttpStatus.NOT_FOUND));

            if (staff.getSystemRole() != null && staff.getSystemRole() != com.shiftsync.shared.security.SystemRole.STAFF) {
                throw new BusinessException("Only users with role STAFF can claim shifts", HttpStatus.BAD_REQUEST);
            }

            boolean isActive = employmentRepository.existsByUserIdAndStoreIdAndStatus(staffId, storeId, com.shiftsync.employment.enums.EmploymentStatus.ACTIVE);
            if (!isActive) {
                throw new BusinessException("Employment Inactive: Staff does not work at this store or is suspended", HttpStatus.BAD_REQUEST);
            }

            UUID targetSkillId = shiftAssignmentValidator.selectClaimSkill(shift, staffId);

            // Create assignment
            ShiftAssignment assignment = ShiftAssignment.builder()
                    .shift(shift)
                    .staff(staff)
                    .requiredSkillId(targetSkillId)
                    .source(com.shiftsync.shift.enums.AssignmentSource.OPEN_SHIFT)
                    .build();
            shiftAssignmentRepository.save(assignment);

            // Close market if full
            assignedCount++;
            if (requiredCount > 0) {
                if (assignedCount >= requiredCount) {
                    shift.setOpen(false);
                    shiftRepository.save(shift);
                }
            } else {
                shift.setOpen(false);
                shiftRepository.save(shift);
            }
            });
            // TransactionTemplate only returns after the inner transaction commits, so consumers
            // that reload REST data never observe the pre-claim state.
            publishMarketplaceEvent(storeId, "OPEN_SHIFT_CLAIMED", shiftId, staffId);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new BusinessException("Lỗi hệ thống khi lấy lock", HttpStatus.INTERNAL_SERVER_ERROR);
        } finally {
            if (lock.isHeldByCurrentThread()) {
                lock.unlock();
            }
        }
    }

    private void publishMarketplaceEvent(UUID storeId, String action, UUID shiftId, UUID staffId) {
        if (realtimeEventPublisher == null) return;
        java.util.Map<String, Object> data = new java.util.LinkedHashMap<>();
        data.put("shiftId", shiftId == null ? "" : shiftId.toString());
        if (staffId != null) data.put("staffId", staffId.toString());
        Runnable publish = () -> {
            realtimeEventPublisher.publishStoreEvent(storeId, "marketplace", action, data);
            realtimeEventPublisher.publishStoreEvent(storeId, "shifts", action, data);
        };
        publish.run();
    }
}



