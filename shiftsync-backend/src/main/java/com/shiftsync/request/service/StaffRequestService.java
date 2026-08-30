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

    @PostConstruct
    @Transactional
    public void initDefaultDataIfEmpty() {
        try {
            if (staffRequestRepository.count() == 0) {
                log.info("Seeding initial mock staff requests matching Figma design...");
                
                List<StaffRequest> initialRequests = List.of(
                    StaffRequest.builder()
                        .requesterName("Vivi.an")
                        .avatarKey("vivi")
                        .requestType("YÃƒÂªu cÃ¡ÂºÂ§u hÃ¡Â»â€” trÃ¡Â»Â£")
                        .typeCategory("support")
                        .status(com.shiftsync.request.enums.RequestStatus.PENDING)
                        .recipient("QuÃ¡ÂºÂ£n lÃƒÂ½ cÃ¡Â»Â­a hÃƒÂ ng (Store Manager)")
                        .startDate(LocalDate.of(2026, 8, 8))
                        .endDate(LocalDate.of(2026, 8, 8))
                        .shiftInfo("Ca A (06:00 - 12:00)")
                        .content("YÃƒÂªu cÃ¡ÂºÂ§u hÃ¡Â»â€” trÃ¡Â»Â£ nhÃƒÂ¢n viÃƒÂªn\nNgÃ†Â°Ã¡Â»Âi gÃ¡Â»Â­i: Vivi (QuÃ¡ÂºÂ£n lÃƒÂ½)\n\nChÃƒÂ o anh/chÃ¡Â»â€¹ quÃ¡ÂºÂ£n lÃƒÂ½, hiÃ¡Â»â€¡n tÃ¡ÂºÂ¡i quÃƒÂ¡n em Ã„â€˜ang thiÃ¡ÂºÂ¿u nhÃƒÂ¢n sÃ¡Â»Â± trong ca lÃƒÂ m sÃ¡ÂºÂ¯p tÃ¡Â»â€ºi nÃƒÂªn cÃ¡ÂºÂ§n hÃ¡Â»â€” trÃ¡Â»Â£ thÃƒÂªm 1 nhÃƒÂ¢n viÃƒÂªn tÃ¡Â»Â« quÃƒÂ¡n khÃƒÂ¡c sang phÃ¡Â»Â¥ giÃƒÂºp Ã„â€˜Ã¡Â»Æ’ Ã„â€˜Ã¡ÂºÂ£m bÃ¡ÂºÂ£o hoÃ¡ÂºÂ¡t Ã„â€˜Ã¡Â»â„¢ng phÃ¡Â»Â¥c vÃ¡Â»Â¥ khÃƒÂ¡ch hÃƒÂ ng Ã„â€˜Ã†Â°Ã¡Â»Â£c Ã¡Â»â€¢n Ã„â€˜Ã¡Â»â€¹nh.\n\nQuÃƒÂ¡n cÃ¡ÂºÂ§n hÃ¡Â»â€” trÃ¡Â»Â£ nhÃƒÂ¢n viÃƒÂªn vÃƒÂ o ngÃƒÂ y 08/08/2026, ca A tÃ¡Â»Â« 06:00 Ã„â€˜Ã¡ÂºÂ¿n 12:00.\nRÃ¡ÂºÂ¥t mong anh/chÃ¡Â»â€¹ hÃ¡Â»â€” trÃ¡Â»Â£ sÃ¡ÂºÂ¯p xÃ¡ÂºÂ¿p mÃ¡Â»â„¢t nhÃƒÂ¢n viÃƒÂªn phÃƒÂ¹ hÃ¡Â»Â£p tÃ¡Â»Â« quÃƒÂ¡n khÃƒÂ¡c sang hÃ¡Â»â€” trÃ¡Â»Â£ quÃƒÂ¡n em trong ca nÃƒÂ y.\n\nCÃ¡ÂºÂ£m Ã†Â¡n anh/chÃ¡Â»â€¹ Ã„â€˜ÃƒÂ£ hÃ¡Â»â€” trÃ¡Â»Â£!\nVivi Ã¢â‚¬â€œ QuÃ¡ÂºÂ£n lÃƒÂ½ quÃƒÂ¡n")
                        .createdAt(OffsetDateTime.now().minusHours(4))
                        .build(),
                    StaffRequest.builder()
                        .requesterName("Mew. Ama")
                        .avatarKey("mew")
                        .requestType("YÃƒÂªu cÃ¡ÂºÂ§u nghÃ¡Â»â€°")
                        .typeCategory("leave")
                        .status(com.shiftsync.request.enums.RequestStatus.PENDING)
                        .recipient("QuÃ¡ÂºÂ£n lÃƒÂ½ trÃ¡Â»Â±c tiÃ¡ÂºÂ¿p")
                        .startDate(LocalDate.of(2026, 8, 6))
                        .endDate(LocalDate.of(2026, 8, 7))
                        .shiftInfo("CÃ¡ÂºÂ£ ngÃƒÂ y")
                        .content("KÃƒÂ­nh gÃ¡Â»Â­i QuÃ¡ÂºÂ£n lÃƒÂ½ cÃ¡Â»Â­a hÃƒÂ ng,\n\nEm xin phÃƒÂ©p Ã„â€˜Ã†Â°Ã¡Â»Â£c nghÃ¡Â»â€° phÃƒÂ©p 2 ngÃƒÂ y (06/08/2026 - 07/08/2026) do gia Ã„â€˜ÃƒÂ¬nh cÃƒÂ³ viÃ¡Â»â€¡c quan trÃ¡Â»Âng cÃ¡ÂºÂ§n giÃ¡ÂºÂ£i quyÃ¡ÂºÂ¿t Ã¡Â»Å¸ quÃƒÂª.\nEm Ã„â€˜ÃƒÂ£ hoÃƒÂ n thÃƒÂ nh bÃƒÂ n giao cÃƒÂ´ng viÃ¡Â»â€¡c ca trÃ¡Â»Â±c tuÃ¡ÂºÂ§n nÃƒÂ y cho cÃƒÂ¡c bÃ¡ÂºÂ¡n trong nhÃƒÂ³m vÃƒÂ  sÃ¡ÂºÂ½ quay trÃ¡Â»Å¸ lÃ¡ÂºÂ¡i lÃƒÂ m viÃ¡Â»â€¡c Ã„â€˜ÃƒÂºng giÃ¡Â»Â vÃƒÂ o ngÃƒÂ y 08/08/2026.\n\nMong quÃ¡ÂºÂ£n lÃƒÂ½ xem xÃƒÂ©t vÃƒÂ  phÃƒÂª duyÃ¡Â»â€¡t giÃƒÂºp em Ã¡ÂºÂ¡!\nEm xin cÃ¡ÂºÂ£m Ã†Â¡n!")
                        .createdAt(OffsetDateTime.now().minusHours(6))
                        .build(),
                    StaffRequest.builder()
                        .requesterName("Thia. Ago")
                        .avatarKey("thia")
                        .requestType("YÃƒÂªu cÃ¡ÂºÂ§u Ã„â€˜Ã¡Â»â€¢i ca")
                        .typeCategory("swap")
                        .status(com.shiftsync.request.enums.RequestStatus.PENDING)
                        .recipient("QuÃ¡ÂºÂ£n lÃƒÂ½ ca")
                        .startDate(LocalDate.of(2026, 8, 3))
                        .endDate(LocalDate.of(2026, 8, 3))
                        .shiftInfo("Ca ChiÃ¡Â»Âu Ã¢â€¡â€ž Ca SÃƒÂ¡ng")
                        .content("KÃƒÂ­nh gÃ¡Â»Â­i QuÃ¡ÂºÂ£n lÃƒÂ½,\n\nEm viÃ¡ÂºÂ¿t Ã„â€˜Ã†Â¡n nÃƒÂ y xin phÃƒÂ©p hoÃƒÂ¡n Ã„â€˜Ã¡Â»â€¢i ca lÃƒÂ m viÃ¡Â»â€¡c ngÃƒÂ y 03/08/2026 tÃ¡Â»Â« Ca ChiÃ¡Â»Âu (14:00 - 22:00) sang Ca SÃƒÂ¡ng (06:00 - 14:00) vÃ¡Â»â€ºi bÃ¡ÂºÂ¡n Paul. Lee do em cÃƒÂ³ lÃ¡Â»â€¹ch thi hÃ¡Â»Âc phÃ¡ÂºÂ§n tÃ¡ÂºÂ¡i trÃ†Â°Ã¡Â»Âng vÃƒÂ o buÃ¡Â»â€¢i chiÃ¡Â»Âu.\nBÃ¡ÂºÂ¡n Paul. Lee Ã„â€˜ÃƒÂ£ Ã„â€˜Ã¡Â»â€œng ÃƒÂ½ hÃ¡Â»â€” trÃ¡Â»Â£ vÃƒÂ  nhÃ¡ÂºÂ­n ca chiÃ¡Â»Âu thay em.\n\nKÃƒÂ­nh mong Ban quÃ¡ÂºÂ£n lÃƒÂ½ phÃƒÂª duyÃ¡Â»â€¡t hoÃƒÂ¡n Ã„â€˜Ã¡Â»â€¢i ca trÃ¡Â»Â±c.\nTrÃƒÂ¢n trÃ¡Â»Âng!")
                        .createdAt(OffsetDateTime.now().minusDays(2))
                        .build(),
                    StaffRequest.builder()
                        .requesterName("Dilan. Jon")
                        .avatarKey("dilan")
                        .requestType("YÃƒÂªu cÃ¡ÂºÂ§u Ã„â€˜Ã¡Â»â€¢i ca")
                        .typeCategory("swap")
                        .status(com.shiftsync.request.enums.RequestStatus.PENDING)
                        .recipient("QuÃ¡ÂºÂ£n lÃƒÂ½ cÃ¡Â»Â­a hÃƒÂ ng")
                        .startDate(LocalDate.of(2026, 8, 5))
                        .endDate(LocalDate.of(2026, 8, 5))
                        .shiftInfo("Ca TÃ¡Â»â€˜i Ã¢â€¡â€ž Ca SÃƒÂ¡ng")
                        .content("KÃƒÂ­nh gÃ¡Â»Â­i QuÃ¡ÂºÂ£n lÃƒÂ½,\n\nEm xin phÃƒÂ©p Ã„â€˜Ã¡Â»â€¢i ca lÃƒÂ m viÃ¡Â»â€¡c ngÃƒÂ y 05/08/2026 tÃ¡Â»Â« Ca TÃ¡Â»â€˜i sang Ca SÃƒÂ¡ng. Em Ã„â€˜ÃƒÂ£ trao Ã„â€˜Ã¡Â»â€¢i vÃƒÂ  thÃ¡Â»â€˜ng nhÃ¡ÂºÂ¥t vÃ¡Â»â€ºi bÃ¡ÂºÂ¡n trong ca cÃƒÂ¹ng chi nhÃƒÂ¡nh Ã„â€˜Ã¡Â»Æ’ Ã„â€˜Ã¡ÂºÂ£m bÃ¡ÂºÂ£o Ã„â€˜Ã¡Â»Â§ quÃƒÂ¢n sÃ¡Â»â€˜ phÃ¡Â»Â¥c vÃ¡Â»Â¥ khÃƒÂ¡ch hÃƒÂ ng.\n\nKÃƒÂ­nh nhÃ¡Â»Â QuÃ¡ÂºÂ£n lÃƒÂ½ duyÃ¡Â»â€¡t giÃƒÂºp em. Em cÃ¡ÂºÂ£m Ã†Â¡n!")
                        .createdAt(OffsetDateTime.now().minusDays(3))
                        .build()
                );

                staffRequestRepository.saveAll(initialRequests);
                log.info("Successfully seeded {} staff requests.", initialRequests.size());
            }
        } catch (Exception e) {
            log.warn("Notice: Initial requests seed skipped or already existing: {}", e.getMessage());
        }
    }

    @Transactional(readOnly = true)
    public List<StaffRequestDTO> getAllRequests(com.shiftsync.request.enums.RequestStatus status, String typeCategory, String search) {
        List<StaffRequest> list = staffRequestRepository.findAllByOrderByCreatedAtDesc();

        return list.stream()
            .filter(r -> status == null || r.getStatus() == status)
            .filter(r -> typeCategory == null || typeCategory.isBlank() || r.getTypeCategory().equalsIgnoreCase(typeCategory.trim()))
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
            String rt = dto.getRequestType().toLowerCase();
            if (rt.contains("nghÃ¡Â»â€°")) category = "leave";
            else if (rt.contains("Ã„â€˜Ã¡Â»â€¢i") || rt.contains("hoÃƒÂ¡n")) category = "swap";
            else if (rt.contains("vÃ¡ÂºÂ¯ng")) category = "absence";
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
            .shiftInfo(dto.getShiftInfo() != null ? dto.getShiftInfo() : "Ca tiÃƒÂªu chuÃ¡ÂºÂ©n")
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
        String requestTime = String.format("NgÃƒÂ y %02d thÃƒÂ¡ng %02d nÃ„Æ’m %d vÃƒÂ o %02dh:%02dp",
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
