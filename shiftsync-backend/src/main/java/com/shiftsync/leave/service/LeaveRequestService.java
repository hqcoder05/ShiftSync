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
    private final LeaveRequestRepository leaveRequestRepository;
    private final UserRepository userRepository;
    private final StoreRepository storeRepository;
    private final BlackoutDateRepository blackoutDateRepository;
    private final ShiftAssignmentRepository shiftAssignmentRepository;

    @Transactional
    public LeaveRequestDTO createLeaveRequest(UUID storeId, UUID staffId, LeaveCreateRequest request) {
        User staff = userRepository.findById(staffId)
                .orElseThrow(() -> new BusinessException("Staff not found", HttpStatus.NOT_FOUND));
        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new BusinessException("Store not found", HttpStatus.NOT_FOUND));

        if (request.getStartDate().isAfter(request.getEndDate())) {
            throw new BusinessException("Start date must be before or equal to end date", HttpStatus.BAD_REQUEST);
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

        // Check for conflicting published shifts
        List<UUID> conflictingShifts = shiftAssignmentRepository.findConflictingPublishedShiftIds(
                leaveRequest.getStaff().getId(), 
                leaveRequest.getStartDate(), 
                leaveRequest.getEndDate()
        );

        String warning = null;
        if (!conflictingShifts.isEmpty()) {
            warning = "Staff has " + conflictingShifts.size() + " published shifts conflicting with this leave: " + conflictingShifts.toString();
        }

        return LeaveApproveResponse.builder()
                .leaveRequest(mapToDTO(leaveRequest))
                .warning(warning)
                .build();
    }

    @Transactional
    public LeaveRequestDTO rejectLeaveRequest(UUID storeId, UUID leaveId, UUID managerId) {
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
        return mapToDTO(leaveRequestRepository.save(leaveRequest));
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
                .approvedBy(request.getApprovedBy() != null ? request.getApprovedBy().getId() : null)
                .approvedAt(request.getApprovedAt())
                .createdAt(request.getCreatedAt())
                .build();
    }
}
