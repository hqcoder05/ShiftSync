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
                        .requestType("Yêu cầu hỗ trợ")
                        .typeCategory("support")
                        .status("Đang chờ phê duyệt")
                        .recipient("Quản lý cửa hàng (Store Manager)")
                        .startDate(LocalDate.of(2026, 8, 8))
                        .endDate(LocalDate.of(2026, 8, 8))
                        .shiftInfo("Ca A (06:00 - 12:00)")
                        .content("Yêu cầu hỗ trợ nhân viên\nNgười gửi: Vivi (Quản lý)\n\nChào anh/chị quản lý, hiện tại quán em đang thiếu nhân sự trong ca làm sắp tới nên cần hỗ trợ thêm 1 nhân viên từ quán khác sang phụ giúp để đảm bảo hoạt động phục vụ khách hàng được ổn định.\n\nQuán cần hỗ trợ nhân viên vào ngày 08/08/2026, ca A từ 06:00 đến 12:00.\nRất mong anh/chị hỗ trợ sắp xếp một nhân viên phù hợp từ quán khác sang hỗ trợ quán em trong ca này.\n\nCảm ơn anh/chị đã hỗ trợ!\nVivi – Quản lý quán")
                        .createdAt(OffsetDateTime.now().minusHours(4))
                        .build(),
                    StaffRequest.builder()
                        .requesterName("Mew. Ama")
                        .avatarKey("mew")
                        .requestType("Yêu cầu nghỉ")
                        .typeCategory("leave")
                        .status("Đang chờ phê duyệt")
                        .recipient("Quản lý trực tiếp")
                        .startDate(LocalDate.of(2026, 8, 6))
                        .endDate(LocalDate.of(2026, 8, 7))
                        .shiftInfo("Cả ngày")
                        .content("Kính gửi Quản lý cửa hàng,\n\nEm xin phép được nghỉ phép 2 ngày (06/08/2026 - 07/08/2026) do gia đình có việc quan trọng cần giải quyết ở quê.\nEm đã hoàn thành bàn giao công việc ca trực tuần này cho các bạn trong nhóm và sẽ quay trở lại làm việc đúng giờ vào ngày 08/08/2026.\n\nMong quản lý xem xét và phê duyệt giúp em ạ!\nEm xin cảm ơn!")
                        .createdAt(OffsetDateTime.now().minusHours(6))
                        .build(),
                    StaffRequest.builder()
                        .requesterName("Thia. Ago")
                        .avatarKey("thia")
                        .requestType("Yêu cầu đổi ca")
                        .typeCategory("swap")
                        .status("Đã phê duyệt")
                        .recipient("Quản lý ca")
                        .startDate(LocalDate.of(2026, 8, 3))
                        .endDate(LocalDate.of(2026, 8, 3))
                        .shiftInfo("Ca Chiều ⇄ Ca Sáng")
                        .content("Kính gửi Quản lý,\n\nEm viết đơn này xin phép hoán đổi ca làm việc ngày 03/08/2026 từ Ca Chiều (14:00 - 22:00) sang Ca Sáng (06:00 - 14:00) với bạn Paul. Lee do em có lịch thi học phần tại trường vào buổi chiều.\nBạn Paul. Lee đã đồng ý hỗ trợ và nhận ca chiều thay em.\n\nKính mong Ban quản lý phê duyệt hoán đổi ca trực.\nTrân trọng!")
                        .createdAt(OffsetDateTime.now().minusDays(2))
                        .build(),
                    StaffRequest.builder()
                        .requesterName("Dilan. Jon")
                        .avatarKey("dilan")
                        .requestType("Yêu cầu đổi ca")
                        .typeCategory("swap")
                        .status("Đã phê duyệt")
                        .recipient("Quản lý cửa hàng")
                        .startDate(LocalDate.of(2026, 8, 5))
                        .endDate(LocalDate.of(2026, 8, 5))
                        .shiftInfo("Ca Tối ⇄ Ca Sáng")
                        .content("Kính gửi Quản lý,\n\nEm xin phép đổi ca làm việc ngày 05/08/2026 từ Ca Tối sang Ca Sáng. Em đã trao đổi và thống nhất với bạn trong ca cùng chi nhánh để đảm bảo đủ quân số phục vụ khách hàng.\n\nKính nhờ Quản lý duyệt giúp em. Em cảm ơn!")
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
    public List<StaffRequestDTO> getAllRequests(String status, String typeCategory, String search) {
        List<StaffRequest> list = staffRequestRepository.findAllByOrderByCreatedAtDesc();

        return list.stream()
            .filter(r -> status == null || status.isBlank() || r.getStatus().equalsIgnoreCase(status.trim()))
            .filter(r -> typeCategory == null || typeCategory.isBlank() || r.getTypeCategory().equalsIgnoreCase(typeCategory.trim()))
            .filter(r -> {
                if (search == null || search.isBlank()) return true;
                String q = search.toLowerCase().trim();
                boolean matchName = r.getRequesterName() != null && r.getRequesterName().toLowerCase().contains(q);
                boolean matchType = r.getRequestType() != null && r.getRequestType().toLowerCase().contains(q);
                boolean matchContent = r.getContent() != null && r.getContent().toLowerCase().contains(q);
                boolean matchStatus = r.getStatus() != null && r.getStatus().toLowerCase().contains(q);
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
            .status("Đang chờ phê duyệt")
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
    public StaffRequestDTO updateRequestStatus(UUID id, String newStatus) {
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
