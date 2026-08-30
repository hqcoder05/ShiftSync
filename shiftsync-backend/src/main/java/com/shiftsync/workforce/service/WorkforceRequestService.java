package com.shiftsync.workforce.service;

import com.shiftsync.audit.service.AuditLogService;
import com.shiftsync.auth.entity.User;
import com.shiftsync.auth.repository.UserRepository;
import com.shiftsync.employment.enums.EmploymentStatus;
import com.shiftsync.employment.repository.EmploymentRepository;
import com.shiftsync.notification.service.NotificationService;
import com.shiftsync.notification.entity.NotificationType;
import com.shiftsync.shared.exception.BusinessException;
import com.shiftsync.shift.entity.Shift;
import com.shiftsync.shift.entity.ShiftAssignment;
import com.shiftsync.shift.enums.AssignmentSource;
import com.shiftsync.shift.repository.ShiftAssignmentRepository;
import com.shiftsync.shift.repository.ShiftRepository;
import com.shiftsync.shift.service.ShiftAssignmentValidator;
import com.shiftsync.store.entity.Store;
import com.shiftsync.store.repository.StoreRepository;
import com.shiftsync.workforce.dto.*;
import com.shiftsync.workforce.entity.WorkforceProposal;
import com.shiftsync.workforce.entity.WorkforceRequest;
import com.shiftsync.workforce.enums.WorkforceProposalStatus;
import com.shiftsync.workforce.enums.WorkforceRequestStatus;
import com.shiftsync.workforce.repository.WorkforceProposalRepository;
import com.shiftsync.workforce.repository.WorkforceRequestRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class WorkforceRequestService {

    private final WorkforceRequestRepository workforceRequestRepository;
    private final WorkforceProposalRepository workforceProposalRepository;
    private final StoreRepository storeRepository;
    private final ShiftRepository shiftRepository;
    private final UserRepository userRepository;
    private final EmploymentRepository employmentRepository;
    private final ShiftAssignmentValidator shiftAssignmentValidator;
    private final ShiftAssignmentRepository shiftAssignmentRepository;
    private final AuditLogService auditLogService;
    private final NotificationService notificationService;

    @Transactional
    public WorkforceRequestResponseDTO createRequest(UUID requestingStoreId, WorkforceRequestCreateDTO dto, UUID creatorId) {
        if (requestingStoreId.equals(dto.getTargetStoreId())) {
            throw new BusinessException("Target store must be different from requesting store", HttpStatus.BAD_REQUEST);
        }

        Store requestingStore = storeRepository.findById(requestingStoreId)
                .orElseThrow(() -> new BusinessException("Requesting store not found", HttpStatus.NOT_FOUND));
        
        Store targetStore = storeRepository.findById(dto.getTargetStoreId())
                .orElseThrow(() -> new BusinessException("Target store not found", HttpStatus.NOT_FOUND));

        Shift shift = shiftRepository.findByIdAndStoreId(dto.getShiftId(), requestingStoreId)
                .orElseThrow(() -> new BusinessException("Shift not found in requesting store", HttpStatus.NOT_FOUND));

        User creator = userRepository.findById(creatorId)
                .orElseThrow(() -> new BusinessException("User not found", HttpStatus.NOT_FOUND));

        WorkforceRequest request = WorkforceRequest.builder()
                .requestingStore(requestingStore)
                .targetStore(targetStore)
                .shift(shift)
                .status(WorkforceRequestStatus.PENDING)
                .createdBy(creator)
                .build();

        request = workforceRequestRepository.save(request);

        auditLogService.log(creatorId, "CREATE_WORKFORCE_REQUEST", "WorkforceRequest", request.getId(), null, mapToDTO(request));
        
        notifyStoreManagers(targetStore.getId(), "Workforce Request Received", "Store " + requestingStore.getName() + " is requesting staff.");

        return mapToDTO(request);
    }

    @Transactional
    public void cancelRequest(UUID storeId, UUID requestId, UUID actorId) {
        WorkforceRequest request = getRequest(requestId);
        if (!request.getRequestingStore().getId().equals(storeId)) {
            throw new BusinessException("Access denied", HttpStatus.FORBIDDEN);
        }

        if (request.getStatus() != WorkforceRequestStatus.PENDING && request.getStatus() != WorkforceRequestStatus.PROPOSAL_SENT) {
            throw new BusinessException("Cannot cancel request in status: " + request.getStatus(), HttpStatus.BAD_REQUEST);
        }

        WorkforceRequestResponseDTO beforeData = mapToDTO(request);
        request.setStatus(WorkforceRequestStatus.CANCELLED);
        workforceRequestRepository.save(request);
        auditLogService.log(actorId, "CANCEL_WORKFORCE_REQUEST", "WorkforceRequest", request.getId(), beforeData, mapToDTO(request));
    }

    @Transactional
    public void rejectRequest(UUID targetStoreId, UUID requestId, UUID actorId) {
        WorkforceRequest request = getRequest(requestId);
        if (!request.getTargetStore().getId().equals(targetStoreId)) {
            throw new BusinessException("Access denied", HttpStatus.FORBIDDEN);
        }

        if (request.getStatus() != WorkforceRequestStatus.PENDING && request.getStatus() != WorkforceRequestStatus.PROPOSAL_SENT) {
            throw new BusinessException("Cannot reject request in status: " + request.getStatus(), HttpStatus.BAD_REQUEST);
        }

        WorkforceRequestResponseDTO beforeData = mapToDTO(request);
        request.setStatus(WorkforceRequestStatus.MANAGER_REJECTED);
        workforceRequestRepository.save(request);
        auditLogService.log(actorId, "REJECT_WORKFORCE_REQUEST", "WorkforceRequest", request.getId(), beforeData, mapToDTO(request));

        notifyStoreManagers(request.getRequestingStore().getId(), "Workforce Request Rejected", "Store " + request.getTargetStore().getName() + " rejected your workforce request.");
    }

    @Transactional
    public WorkforceProposalResponseDTO proposeStaff(UUID targetStoreId, UUID requestId, WorkforceProposalCreateDTO dto, UUID actorId) {
        WorkforceRequest request = getRequest(requestId);
        if (!request.getTargetStore().getId().equals(targetStoreId)) {
            throw new BusinessException("Access denied", HttpStatus.FORBIDDEN);
        }

        if (request.getStatus() != WorkforceRequestStatus.PENDING && request.getStatus() != WorkforceRequestStatus.PROPOSAL_SENT) {
            throw new BusinessException("Cannot propose staff for request in status: " + request.getStatus(), HttpStatus.BAD_REQUEST);
        }

        User staff = userRepository.findById(dto.getStaffId())
                .orElseThrow(() -> new BusinessException("Staff not found", HttpStatus.NOT_FOUND));

        User actor = userRepository.findById(actorId).orElseThrow();

        boolean isActive = employmentRepository.existsByUserIdAndStoreIdAndStatus(staff.getId(), targetStoreId, EmploymentStatus.ACTIVE);
        if (!isActive) {
            throw new BusinessException("Staff is not active at your store", HttpStatus.BAD_REQUEST);
        }

        shiftAssignmentValidator.validateEligibility(request.getShift(), staff.getId());

        WorkforceProposal proposal = WorkforceProposal.builder()
                .workforceRequest(request)
                .staff(staff)
                .status(WorkforceProposalStatus.PENDING)
                .proposedBy(actor)
                .build();

        proposal = workforceProposalRepository.save(proposal);

        WorkforceRequestResponseDTO beforeData = mapToDTO(request);
        request.setStatus(WorkforceRequestStatus.PROPOSAL_SENT);
        workforceRequestRepository.save(request);

        auditLogService.log(actorId, "PROPOSE_STAFF", "WorkforceProposal", proposal.getId(), null, mapProposalToDTO(proposal));
        auditLogService.log(actorId, "UPDATE_WORKFORCE_REQUEST_STATUS", "WorkforceRequest", request.getId(), beforeData, mapToDTO(request));

        notificationService.sendNotification(
            staff.getId(),
            NotificationType.WORKFORCE_REQUEST_UPDATED,
            "Workforce Proposal",
            "You have been proposed to help at " + request.getRequestingStore().getName(),
            java.util.Map.of("requestId", request.getId().toString())
        );

        return mapProposalToDTO(proposal);
    }

    @Transactional
    public void respondToProposal(UUID proposalId, boolean isAccepted, UUID staffId) {
        WorkforceProposal proposal = workforceProposalRepository.findById(proposalId)
                .orElseThrow(() -> new BusinessException("Proposal not found", HttpStatus.NOT_FOUND));
        
        if (!proposal.getStaff().getId().equals(staffId)) {
            throw new BusinessException("Access denied", HttpStatus.FORBIDDEN);
        }

        if (proposal.getStatus() != WorkforceProposalStatus.PENDING) {
            throw new BusinessException("Proposal is already responded", HttpStatus.BAD_REQUEST);
        }

        WorkforceRequest request = proposal.getWorkforceRequest();
        
        if (request.getStatus() == WorkforceRequestStatus.COMPLETED || request.getStatus() == WorkforceRequestStatus.CANCELLED) {
            throw new BusinessException("Workforce request is no longer open", HttpStatus.BAD_REQUEST);
        }

        WorkforceProposalResponseDTO beforeProposal = mapProposalToDTO(proposal);

        if (isAccepted) {
            shiftAssignmentValidator.validateEligibility(request.getShift(), staffId);

            proposal.setStatus(WorkforceProposalStatus.ACCEPTED);
            proposal.setRespondedAt(OffsetDateTime.now());
            workforceProposalRepository.save(proposal);

            WorkforceRequestResponseDTO beforeRequest = mapToDTO(request);
            request.setStatus(WorkforceRequestStatus.COMPLETED);
            workforceRequestRepository.save(request);

            ShiftAssignment assignment = ShiftAssignment.builder()
                .shift(request.getShift())
                .staff(proposal.getStaff())
                .source(AssignmentSource.MANUAL)
                .build();
            shiftAssignmentRepository.save(assignment);

            auditLogService.log(staffId, "RESPOND_PROPOSAL", "WorkforceProposal", proposal.getId(), beforeProposal, mapProposalToDTO(proposal));
            auditLogService.log(staffId, "WORKFORCE_REQUEST_COMPLETED", "WorkforceRequest", request.getId(), beforeRequest, mapToDTO(request));

            notifyStoreManagers(request.getRequestingStore().getId(), "Workforce Request Completed", proposal.getStaff().getFullName() + " accepted to help.");
            notifyStoreManagers(request.getTargetStore().getId(), "Workforce Proposal Accepted", proposal.getStaff().getFullName() + " accepted your proposal.");
        } else {
            proposal.setStatus(WorkforceProposalStatus.DECLINED);
            proposal.setRespondedAt(OffsetDateTime.now());
            workforceProposalRepository.save(proposal);
            auditLogService.log(staffId, "RESPOND_PROPOSAL", "WorkforceProposal", proposal.getId(), beforeProposal, mapProposalToDTO(proposal));
            
            notifyStoreManagers(request.getTargetStore().getId(), "Workforce Proposal Declined", proposal.getStaff().getFullName() + " declined your proposal.");
        }
    }

    private void notifyStoreManagers(UUID storeId, String title, String body) {
        // Find users who have active employment in this store and SystemRole.MANAGER
        List<com.shiftsync.employment.entity.Employment> employments = employmentRepository.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE);
        for (com.shiftsync.employment.entity.Employment e : employments) {
            if (e.getUser().getSystemRole() == com.shiftsync.shared.security.SystemRole.MANAGER) {
                notificationService.sendNotification(
                    e.getUser().getId(),
                    NotificationType.WORKFORCE_REQUEST_UPDATED,
                    title,
                    body,
                    java.util.Map.of()
                );
            }
        }
    }

    @Transactional(readOnly = true)
    public List<WorkforceRequestResponseDTO> getIncomingRequests(UUID storeId) {
        return workforceRequestRepository.findByTargetStoreIdOrderByCreatedAtDesc(storeId).stream()
                .map(this::mapToDTO).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<WorkforceRequestResponseDTO> getOutgoingRequests(UUID storeId) {
        return workforceRequestRepository.findByRequestingStoreIdOrderByCreatedAtDesc(storeId).stream()
                .map(this::mapToDTO).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<WorkforceProposalResponseDTO> getMyProposals(UUID staffId) {
        return workforceProposalRepository.findByStaffIdOrderByCreatedAtDesc(staffId).stream()
                .map(this::mapProposalToDTO).collect(Collectors.toList());
    }

    private WorkforceRequest getRequest(UUID id) {
        return workforceRequestRepository.findById(id).orElseThrow(() -> new BusinessException("Workforce request not found", HttpStatus.NOT_FOUND));
    }

    private WorkforceRequestResponseDTO mapToDTO(WorkforceRequest request) {
        List<WorkforceProposalResponseDTO> proposals = request.getProposals() != null ? 
            request.getProposals().stream().map(this::mapProposalToDTO).collect(Collectors.toList()) : null;

        return WorkforceRequestResponseDTO.builder()
                .id(request.getId())
                .requestingStoreId(request.getRequestingStore().getId())
                .targetStoreId(request.getTargetStore().getId())
                .shiftId(request.getShift().getId())
                .status(request.getStatus())
                .createdBy(request.getCreatedBy().getId())
                .createdAt(request.getCreatedAt())
                .updatedAt(request.getUpdatedAt())
                .proposals(proposals)
                .build();
    }

    private WorkforceProposalResponseDTO mapProposalToDTO(WorkforceProposal proposal) {
        return WorkforceProposalResponseDTO.builder()
                .id(proposal.getId())
                .workforceRequestId(proposal.getWorkforceRequest().getId())
                .staffId(proposal.getStaff().getId())
                .status(proposal.getStatus())
                .proposedBy(proposal.getProposedBy().getId())
                .createdAt(proposal.getCreatedAt())
                .respondedAt(proposal.getRespondedAt())
                .build();
    }
}

