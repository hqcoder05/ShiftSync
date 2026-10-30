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
import com.shiftsync.employment.dto.EmploymentDTO;
import com.shiftsync.shared.security.SystemRole;
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
    private final com.shiftsync.skill.repository.SkillRepository skillRepository;
    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private com.shiftsync.shared.transaction.SerializableRetry serializableRetry;

    @Transactional(isolation = org.springframework.transaction.annotation.Isolation.SERIALIZABLE)
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

        if (hasStarted(shift)) {
            throw new BusinessException("Cannot request workforce support for a shift that has already started or occurred in the past.", HttpStatus.BAD_REQUEST);
        }

        com.shiftsync.skill.entity.Skill skill = null;
        if (dto.getSkillId() != null) {
            skill = skillRepository.findById(dto.getSkillId())
                    .orElseThrow(() -> new BusinessException("Skill not found", HttpStatus.NOT_FOUND));
            if (!skill.getStore().getId().equals(requestingStoreId)) {
                throw new BusinessException("Skill does not belong to requesting store", HttpStatus.BAD_REQUEST);
            }
        }

        User creator = userRepository.findById(creatorId)
                .orElseThrow(() -> new BusinessException("User not found", HttpStatus.NOT_FOUND));

        WorkforceRequest request = WorkforceRequest.builder()
                .requestingStore(requestingStore)
                .targetStore(targetStore)
                .shift(shift)
                .skill(skill)
                .neededCount(dto.getNeededCount() != null ? dto.getNeededCount() : 1)
                .status(WorkforceRequestStatus.PENDING)
                .createdBy(creator)
                .build();

        request = workforceRequestRepository.save(request);

        auditLogService.log(creatorId, "CREATE_WORKFORCE_REQUEST", "WorkforceRequest", request.getId(), null, mapToDTO(request));
        
        notifyStoreManagers(targetStore.getId(), "Workforce Request Received", "Store " + requestingStore.getName() + " is requesting staff.");

        return mapToDTO(request);
    }

    @Transactional(isolation = org.springframework.transaction.annotation.Isolation.SERIALIZABLE, noRollbackFor = BusinessException.class)
    public void cancelRequest(UUID storeId, UUID requestId, UUID actorId) {
        WorkforceRequest request = getRequest(requestId);
        expireIfPast(request);
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

    @Transactional(isolation = org.springframework.transaction.annotation.Isolation.SERIALIZABLE, noRollbackFor = BusinessException.class)
    public void rejectRequest(UUID targetStoreId, UUID requestId, UUID actorId) {
        WorkforceRequest request = getRequest(requestId);
        expireIfPast(request);
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

    @Transactional(isolation = org.springframework.transaction.annotation.Isolation.SERIALIZABLE, noRollbackFor = BusinessException.class)
    public WorkforceProposalResponseDTO proposeStaff(UUID targetStoreId, UUID requestId, WorkforceProposalCreateDTO dto, UUID actorId) {
        WorkforceRequest request = getRequest(requestId);
        expireIfPast(request);
        if (!request.getTargetStore().getId().equals(targetStoreId)) {
            throw new BusinessException("Access denied", HttpStatus.FORBIDDEN);
        }

        if (request.getStatus() != WorkforceRequestStatus.PENDING && request.getStatus() != WorkforceRequestStatus.PROPOSAL_SENT) {
            throw new BusinessException("Cannot propose staff for request in status: " + request.getStatus(), HttpStatus.BAD_REQUEST);
        }

        User staff = userRepository.findById(dto.getStaffId())
                .orElseThrow(() -> new BusinessException("Staff not found", HttpStatus.NOT_FOUND));

        User actor = userRepository.findById(actorId)
                .orElseThrow(() -> new BusinessException("Actor not found", HttpStatus.NOT_FOUND));

        boolean isActive = employmentRepository.existsByUserIdAndStoreIdAndStatus(staff.getId(), targetStoreId, EmploymentStatus.ACTIVE);
        if (!isActive) {
            throw new BusinessException("Staff is not active at your store", HttpStatus.BAD_REQUEST);
        }

        if (staff.getSystemRole() != com.shiftsync.shared.security.SystemRole.STAFF) {
            throw new BusinessException("Only employees with STAFF role can be proposed for workforce requests", HttpStatus.BAD_REQUEST);
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

    @Transactional(propagation = org.springframework.transaction.annotation.Propagation.NEVER)
    public void respondToProposal(UUID proposalId, boolean isAccepted, UUID staffId) {
        if (serializableRetry == null) {
            respondToProposalInTransaction(proposalId, isAccepted, staffId);
            return;
        }
        BusinessException failure = serializableRetry.execute(() -> {
            try {
                respondToProposalInTransaction(proposalId, isAccepted, staffId);
                return null;
            } catch (ExpiredRequestException ex) {
                return ex;
            }
        });
        if (failure != null) throw failure;
    }

    private void respondToProposalInTransaction(UUID proposalId, boolean isAccepted, UUID staffId) {
        WorkforceProposal proposal = workforceProposalRepository.findById(proposalId)
                .orElseThrow(() -> new BusinessException("Proposal not found", HttpStatus.NOT_FOUND));
        
        if (!proposal.getStaff().getId().equals(staffId)) {
            throw new BusinessException("Access denied", HttpStatus.FORBIDDEN);
        }

        if (proposal.getStatus() != WorkforceProposalStatus.PENDING) {
            throw new BusinessException("Proposal is already responded", HttpStatus.BAD_REQUEST);
        }

        WorkforceRequest request = workforceRequestRepository.findByIdForUpdate(proposal.getWorkforceRequest().getId())
            .orElseThrow(() -> new BusinessException("Workforce request not found", HttpStatus.NOT_FOUND));

        expireIfPast(request);
        
        if (request.getStatus() == WorkforceRequestStatus.COMPLETED || request.getStatus() == WorkforceRequestStatus.CANCELLED) {
            throw new BusinessException("Workforce request is no longer open", HttpStatus.BAD_REQUEST);
        }

        WorkforceProposalResponseDTO beforeProposal = mapProposalToDTO(proposal);

        if (isAccepted) {
            long acceptedCount = workforceProposalRepository.countByWorkforceRequestIdAndStatus(request.getId(), WorkforceProposalStatus.ACCEPTED);
            if (acceptedCount >= request.getNeededCount()) {
                throw new BusinessException("Workforce request is already fully fulfilled", HttpStatus.BAD_REQUEST);
            }

            shiftAssignmentValidator.validateEligibility(request.getShift(), staffId);

            proposal.setStatus(WorkforceProposalStatus.ACCEPTED);
            proposal.setRespondedAt(OffsetDateTime.now());
            workforceProposalRepository.save(proposal);

            WorkforceRequestResponseDTO beforeRequest = mapToDTO(request);
            long newAcceptedCount = workforceProposalRepository.countByWorkforceRequestIdAndStatus(request.getId(), WorkforceProposalStatus.ACCEPTED);
            if (newAcceptedCount >= request.getNeededCount()) {
                request.setStatus(WorkforceRequestStatus.COMPLETED);
            }
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

    @Transactional(isolation = org.springframework.transaction.annotation.Isolation.SERIALIZABLE)
    public List<WorkforceRequestResponseDTO> getIncomingRequests(UUID storeId) {
        List<WorkforceRequest> requests = workforceRequestRepository.findByTargetStoreIdOrderByCreatedAtDesc(storeId);
        requests.forEach(this::expireIfPastSilently);
        return requests.stream()
                .map(this::mapToDTO).collect(Collectors.toList());
    }

    @Transactional(isolation = org.springframework.transaction.annotation.Isolation.SERIALIZABLE)
    public List<WorkforceRequestResponseDTO> getOutgoingRequests(UUID storeId) {
        List<WorkforceRequest> requests = workforceRequestRepository.findByRequestingStoreIdOrderByCreatedAtDesc(storeId);
        requests.forEach(this::expireIfPastSilently);
        return requests.stream()
                .map(this::mapToDTO).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<WorkforceProposalResponseDTO> getMyProposals(UUID staffId) {
        return workforceProposalRepository.findByStaffIdOrderByCreatedAtDesc(staffId).stream()
                .map(this::mapProposalToDTO).collect(Collectors.toList());
    }

    @Transactional(isolation = org.springframework.transaction.annotation.Isolation.SERIALIZABLE, noRollbackFor = BusinessException.class)
    public List<EmploymentDTO> getEligibleStaffForRequest(UUID targetStoreId, UUID requestId) {
        WorkforceRequest request = getRequest(requestId);
        expireIfPast(request);
        if (!request.getTargetStore().getId().equals(targetStoreId)) {
            throw new BusinessException("Access denied", HttpStatus.FORBIDDEN);
        }

        List<com.shiftsync.employment.entity.Employment> employments =
                employmentRepository.findByStoreIdAndStatus(targetStoreId, EmploymentStatus.ACTIVE);

        List<EmploymentDTO> eligibleList = new java.util.ArrayList<>();
        for (com.shiftsync.employment.entity.Employment emp : employments) {
            User user = emp.getUser();
            if (user == null || user.getSystemRole() != SystemRole.STAFF) {
                continue;
            }

            if (shiftAssignmentValidator.isEligible(request.getShift(), user.getId())) {
                eligibleList.add(EmploymentDTO.builder()
                        .id(emp.getId())
                        .staffId(user.getId())
                        .staffFullName(user.getFullName())
                        .staffEmail(user.getEmail())
                        .storeId(targetStoreId)
                        .storeName(emp.getStore() != null ? emp.getStore().getName() : null)
                        .systemRole(user.getSystemRole().name())
                        .hourlyRate(emp.getHourlyRate())
                        .status(emp.getStatus())
                        .build());
            }
        }
        return eligibleList;
    }

    private WorkforceRequest getRequest(UUID id) {
        return workforceRequestRepository.findById(id).orElseThrow(() -> new BusinessException("Workforce request not found", HttpStatus.NOT_FOUND));
    }

    private boolean hasStarted(Shift shift) {
        if (shift == null || shift.getShiftDate() == null || shift.getStartTime() == null) {
            return false;
        }
        java.time.LocalDateTime now = java.time.LocalDateTime.now(java.time.ZoneId.of("Asia/Ho_Chi_Minh"));
        return !java.time.LocalDateTime.of(shift.getShiftDate(), shift.getStartTime()).isAfter(now);
    }

    private void expireIfPast(WorkforceRequest request) {
        if (isActionable(request) && hasStarted(request.getShift())) {
            request.setStatus(WorkforceRequestStatus.EXPIRED);
            workforceRequestRepository.save(request);
            throw new ExpiredRequestException();
        }
    }

    private static final class ExpiredRequestException extends BusinessException {
        private ExpiredRequestException() {
            super("This workforce request has expired because its shift has already started.", HttpStatus.CONFLICT);
        }
    }

    private void expireIfPastSilently(WorkforceRequest request) {
        if (isActionable(request) && hasStarted(request.getShift())) {
            request.setStatus(WorkforceRequestStatus.EXPIRED);
            workforceRequestRepository.save(request);
        }
    }

    private boolean isActionable(WorkforceRequest request) {
        return request.getStatus() == WorkforceRequestStatus.PENDING
                || request.getStatus() == WorkforceRequestStatus.PROPOSAL_SENT;
    }

    private WorkforceRequestResponseDTO mapToDTO(WorkforceRequest request) {
        List<WorkforceProposalResponseDTO> proposals = request.getProposals() != null ? 
            request.getProposals().stream().map(this::mapProposalToDTO).collect(Collectors.toList()) : null;

        return WorkforceRequestResponseDTO.builder()
                .id(request.getId())
                .requestingStoreId(request.getRequestingStore().getId())
                .requestingStoreName(request.getRequestingStore().getName())
                .targetStoreId(request.getTargetStore().getId())
                .targetStoreName(request.getTargetStore().getName())
                .shiftId(request.getShift().getId())
                .shiftDate(request.getShift().getShiftDate())
                .shiftStartTime(request.getShift().getStartTime())
                .shiftEndTime(request.getShift().getEndTime())
                .skillId(request.getSkill() != null ? request.getSkill().getId() : null)
                .skillName(request.getSkill() != null ? request.getSkill().getName() : null)
                .neededCount(request.getNeededCount())
                .status(request.getStatus())
                .createdBy(request.getCreatedBy().getId())
                .creatorName(request.getCreatedBy().getFullName())
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
                .staffName(proposal.getStaff().getFullName())
                .staffEmail(proposal.getStaff().getEmail())
                .status(proposal.getStatus())
                .proposedBy(proposal.getProposedBy().getId())
                .proposedByName(proposal.getProposedBy().getFullName())
                .createdAt(proposal.getCreatedAt())
                .respondedAt(proposal.getRespondedAt())
                .build();
    }
}

