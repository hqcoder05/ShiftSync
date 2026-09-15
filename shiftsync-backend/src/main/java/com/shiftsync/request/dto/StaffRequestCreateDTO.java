package com.shiftsync.request.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StaffRequestCreateDTO {

    private String requesterName;
    private String avatarKey;

    private String requestType;
    private String type;

    private String typeCategory;
    private String recipient;
    private LocalDate startDate;
    private LocalDate endDate;
    private String shiftInfo;

    private String content;
    private String reason;
}
