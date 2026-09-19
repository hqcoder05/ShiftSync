package com.shiftsync.request.service;

import com.shiftsync.request.dto.StaffRequestCreateDTO;
import com.shiftsync.request.dto.StaffRequestDTO;
import com.shiftsync.request.entity.StaffRequest;
import com.shiftsync.request.repository.StaffRequestRepository;
import com.shiftsync.shared.exception.BusinessException;
import org.springframework.http.HttpStatus;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class StaffRequestService {

    private final StaffRequestRepository staffRequestRepository;

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("dd-MM-yyyy");

    // Real data only from database

    @Transactional(readOnly = true)
    public List<StaffRequestDTO> getAllRequests(com.shiftsync.request.enums.RequestStatus status, String typeCategory, String search) {
        return getAllRequests(status, typeCategory, search, null);
    }

    @Transactional(readOnly = true)
    public List<StaffRequestDTO> getAllRequests(com.shiftsync.request.enums.RequestStatus status, String typeCategory, String search, String requesterNameFilter) {
        List<StaffRequest> list = staffRequestRepository.findAllByOrderByCreatedAtDesc();

        return list.stream()
            .filter(r -> status == null || r.getStatus() == status)
            .filter(r -> typeCategory == null || typeCategory.isBlank() || r.getTypeCategory().equalsIgnoreCase(typeCategory.trim()))
            .filter(r -> requesterNameFilter == null || requesterNameFilter.isBlank() || (r.getRequesterName() != null && r.getRequesterName().equalsIgnoreCase(requesterNameFilter.trim())))
            .filter(r -> {
                if (search == null || search.isBlank()) return true;
                String q = search.toLowerCase().trim();
                boolean matchName = r.getRequesterName() != null && r.getRequesterName().toLowerCase().contains(q);
                boolean matchType = r.getRequestType() != null && r.getRequestType().toLowerCase().contains(q);
                boolean matchContent = r.getContent() != null && r.getContent().toLowerCase().contains(q);
                boolean matchStatus = r.getStatus() != null && r.getStatus().name().toLowerCase().contains(q);
                return matchName || matchType || matchContent || matchStatus;
            })
            .map(this::mapToDTO)
            .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public StaffRequestDTO getRequestById(UUID id) {
        StaffRequest req = staffRequestRepository.findById(id)
            .orElseThrow(() -> new BusinessException("StaffRequest not found with ID: " + id, HttpStatus.NOT_FOUND));
        return mapToDTO(req);
    }

    @Transactional
    public StaffRequestDTO createRequest(StaffRequestCreateDTO dto) {
        String category = dto.getTypeCategory();
        if (category == null || category.isBlank()) {
            String rt = dto.getRequestType() != null ? dto.getRequestType().toLowerCase() : "";
            if (rt.contains("nghỉ")) category = "leave";
            else if (rt.contains("đổi") || rt.contains("hoán")) category = "swap";
            else if (rt.contains("vắng")) category = "absence";
            else category = "support";
        }

        StaffRequest req = StaffRequest.builder()
            .requesterName(dto.getRequesterName() != null ? dto.getRequesterName() : "Paul. Lee")
            .avatarKey(dto.getAvatarKey() != null ? dto.getAvatarKey() : "paul")
            .requestType(dto.getRequestType())
            .typeCategory(category)
            .status(com.shiftsync.request.enums.RequestStatus.PENDING)
            .recipient(dto.getRecipient())
            .startDate(dto.getStartDate() != null ? dto.getStartDate() : LocalDate.now())
            .endDate(dto.getEndDate() != null ? dto.getEndDate() : LocalDate.now())
            .shiftInfo(dto.getShiftInfo() != null ? dto.getShiftInfo() : "Ca tiêu chuẩn")
            .content(dto.getContent())
            .build();

        StaffRequest saved = staffRequestRepository.save(req);
        return mapToDTO(saved);
    }

    @Transactional
    public StaffRequestDTO updateRequestStatus(UUID id, com.shiftsync.request.enums.RequestStatus newStatus) {
        StaffRequest req = staffRequestRepository.findById(id)
            .orElseThrow(() -> new BusinessException("StaffRequest not found with ID: " + id, HttpStatus.NOT_FOUND));

        req.setStatus(newStatus);
        StaffRequest updated = staffRequestRepository.save(req);
        return mapToDTO(updated);
    }

    private StaffRequestDTO mapToDTO(StaffRequest entity) {
        OffsetDateTime created = entity.getCreatedAt() != null ? entity.getCreatedAt() : OffsetDateTime.now();
        
        String requestDate = created.format(DATE_FORMATTER);
        String requestTime = String.format("Ngày %02d tháng %02d năm %d vào %02dh:%02dp",
            created.getDayOfMonth(),
            created.getMonthValue(),
            created.getYear(),
            created.getHour(),
            created.getMinute()
        );

        return StaffRequestDTO.builder()
            .id(entity.getId())
            .requesterName(entity.getRequesterName())
            .avatarKey(entity.getAvatarKey())
            .requestType(entity.getRequestType())
            .typeCategory(entity.getTypeCategory())
            .status(entity.getStatus())
            .requestDate(requestDate)
            .requestTime(requestTime)
            .recipient(entity.getRecipient())
            .startDate(entity.getStartDate())
            .endDate(entity.getEndDate())
            .shiftInfo(entity.getShiftInfo())
            .content(entity.getContent())
            .createdAt(entity.getCreatedAt())
            .updatedAt(entity.getUpdatedAt())
            .build();
    }
}
