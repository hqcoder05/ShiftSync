package com.shiftsync.request.dto;

import lombok.*;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StaffRequestDTO {
    private UUID id;
    private String requesterName;
    private String avatarKey;
    private String requestType;
    private String typeCategory;
    private String status;
    private String requestDate;  // formatted dd-MM-yyyy e.g. "04-08-2026"
    private String requestTime;  // formatted e.g. "Ngày 04 tháng 08 năm 2026 vào 11h:32p"
    private String recipient;
    private LocalDate startDate;
    private LocalDate endDate;
    private String shiftInfo;
    private String content;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}
