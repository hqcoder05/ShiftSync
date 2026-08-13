package com.shiftsync.shift.service;

import com.shiftsync.auth.entity.User;
import com.shiftsync.auth.repository.UserRepository;
import com.shiftsync.shared.exception.BusinessException;
import com.shiftsync.shift.entity.Shift;
import com.shiftsync.shift.entity.ShiftAssignment;
import com.shiftsync.shift.entity.ShiftSwapRequest;
import com.shiftsync.shift.enums.AssignmentSource;
import com.shiftsync.shift.enums.SwapStatus;
import com.shiftsync.shift.repository.ShiftAssignmentRepository;
import com.shiftsync.shift.repository.ShiftRepository;
import com.shiftsync.shift.repository.ShiftSwapRequestRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ShiftSwapService {

    private final ShiftSwapRequestRepository shiftSwapRequestRepository;
    private final ShiftAssignmentRepository shiftAssignmentRepository;
    private final ShiftRepository shiftRepository;
    private final UserRepository userRepository;
    private final ShiftValidationService shiftValidationService;

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

        User fromStaff = userRepository.findById(fromStaffId).orElseThrow();
        User toStaff = userRepository.findById(toStaffId).orElseThrow();

        ShiftSwapRequest request = ShiftSwapRequest.builder()
                .fromStaff(fromStaff)
                .fromShift(fromAssignment.getShift())
                .toStaff(toStaff)
                .toShift(toAssignment.getShift())
                .status(SwapStatus.PENDING)
                .build();

        return shiftSwapRequestRepository.save(request);
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
            return;
        }

        request.setEmployeeAccepted(true);
        shiftSwapRequestRepository.save(request);
    }

    @Transactional(rollbackFor = Exception.class)
    public void managerApproveSwapRequest(UUID requestId, UUID managerId) {
        ShiftSwapRequest request = shiftSwapRequestRepository.findById(requestId)
                .orElseThrow(() -> new BusinessException("Swap request not found", HttpStatus.NOT_FOUND));

        if (!request.isEmployeeAccepted()) {
            throw new BusinessException("Employee has not accepted this swap yet", HttpStatus.BAD_REQUEST);
        }

        if (request.getStatus() != SwapStatus.PENDING) {
            throw new BusinessException("This request has already been processed", HttpStatus.BAD_REQUEST);
        }

        User manager = userRepository.findById(managerId).orElseThrow();

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

        fromAssignment.setStaff(request.getToStaff());
        fromAssignment.setSource(AssignmentSource.SWAP);

        toAssignment.setStaff(request.getFromStaff());
        toAssignment.setSource(AssignmentSource.SWAP);

        shiftAssignmentRepository.save(fromAssignment);
        shiftAssignmentRepository.save(toAssignment);

        request.setStatus(SwapStatus.APPROVED);
        request.setApprovedBy(manager);
        shiftSwapRequestRepository.save(request);
    }
}
