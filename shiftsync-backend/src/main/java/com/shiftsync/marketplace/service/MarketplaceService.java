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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZonedDateTime;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class MarketplaceService {

    private final ShiftRepository shiftRepository;
    private final ShiftAssignmentRepository shiftAssignmentRepository;
    private final RedissonClient redissonClient;
    private final com.shiftsync.shift.service.ShiftValidationService shiftValidationService;
    private final com.shiftsync.auth.repository.UserRepository userRepository;

    @Transactional(rollbackFor = Exception.class)
    public void publishToMarketplace(UUID storeId, UUID shiftId) {
        Shift shift = shiftRepository.findByIdAndStoreId(shiftId, storeId)
                .orElseThrow(() -> new BusinessException("Shift not found", HttpStatus.NOT_FOUND));

        if (shift.getStatus() != ShiftStatus.PUBLISHED) {
            throw new BusinessException("Only PUBLISHED shifts can be published to Marketplace", HttpStatus.BAD_REQUEST);
        }
        
        if (shift.isOpen()) {
            throw new BusinessException("Shift is already on Marketplace", HttpStatus.BAD_REQUEST);
        }

        // Check if understaffed
        int requiredCount = shift.getRequirements().stream()
                .mapToInt(ShiftSkillRequirement::getRequiredCount)
                .sum();
                
        int assignedCount = (int) shiftAssignmentRepository.countByShiftId(shiftId);
        if (assignedCount >= requiredCount) {
            throw new BusinessException("Shift is already fully staffed. Cannot publish to Marketplace.", HttpStatus.BAD_REQUEST);
        }

        shift.setOpen(true);
        shiftRepository.save(shift);
    }

    @Transactional(rollbackFor = Exception.class)
    public void unpublishFromMarketplace(UUID storeId, UUID shiftId) {
        Shift shift = shiftRepository.findByIdAndStoreId(shiftId, storeId)
                .orElseThrow(() -> new BusinessException("Shift not found", HttpStatus.NOT_FOUND));

        if (!shift.isOpen()) {
            throw new BusinessException("Shift is not on Marketplace", HttpStatus.BAD_REQUEST);
        }

        shift.setOpen(false);
        shiftRepository.save(shift);
    }

    @Transactional(readOnly = true)
    public List<Shift> getOpenShifts(UUID storeId) {
        // Return open shifts that are PUBLISHED and deadline has not passed
        ZonedDateTime now = ZonedDateTime.now();
        List<Shift> openShifts = shiftRepository.findByStoreIdAndStatusAndIsOpenTrue(storeId, ShiftStatus.PUBLISHED);
        
        return openShifts.stream()
                .filter(s -> s.getRegistrationDeadline().isAfter(now))
                .collect(Collectors.toList());
    }

    @Transactional(rollbackFor = Exception.class)
    public void claimOpenShift(UUID storeId, UUID shiftId, UUID staffId) {
        RLock lock = redissonClient.getLock("shift_claim_lock:" + shiftId);
        try {
            // Wait up to 5 seconds to acquire lock, lease for 10 seconds
            if (!lock.tryLock(5, 10, TimeUnit.SECONDS)) {
                throw new BusinessException("Hệ thống đang xử lý, vui lòng thử lại sau", HttpStatus.TOO_MANY_REQUESTS);
            }

            // Inside lock
            Shift shift = shiftRepository.findByIdAndStoreId(shiftId, storeId)
                    .orElseThrow(() -> new BusinessException("Shift not found", HttpStatus.NOT_FOUND));

            if (!shift.isOpen()) {
                throw new BusinessException("Ca này không còn trên Marketplace", HttpStatus.BAD_REQUEST);
            }

            if (shiftAssignmentRepository.existsByShiftIdAndStaffId(shiftId, staffId)) {
                throw new BusinessException("Bạn đã được phân công ca này rồi", HttpStatus.CONFLICT);
            }

            int requiredCount = shift.getRequirements().stream()
                    .mapToInt(ShiftSkillRequirement::getRequiredCount)
                    .sum();
            int assignedCount = (int) shiftAssignmentRepository.countByShiftId(shiftId);

            if (assignedCount >= requiredCount) {
                throw new BusinessException("Ca này đã có người nhanh tay nhận mất!", HttpStatus.CONFLICT);
            }

            // Validate conflicts
            shiftValidationService.validateNoOverlapAndWeeklyHours(shift, staffId, null);

            com.shiftsync.auth.entity.User staff = userRepository.findById(staffId)
                    .orElseThrow(() -> new BusinessException("User not found", HttpStatus.NOT_FOUND));

            // Create assignment
            ShiftAssignment assignment = ShiftAssignment.builder()
                    .shift(shift)
                    .staff(staff)
                    .source(com.shiftsync.shift.enums.AssignmentSource.OPEN_SHIFT)
                    .build();
            shiftAssignmentRepository.save(assignment);

            // Close market if full
            assignedCount++;
            if (assignedCount >= requiredCount) {
                shift.setOpen(false);
                shiftRepository.save(shift);
            }

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new BusinessException("Lỗi hệ thống khi lấy lock", HttpStatus.INTERNAL_SERVER_ERROR);
        } finally {
            if (lock.isHeldByCurrentThread()) {
                lock.unlock();
            }
        }
    }
}
