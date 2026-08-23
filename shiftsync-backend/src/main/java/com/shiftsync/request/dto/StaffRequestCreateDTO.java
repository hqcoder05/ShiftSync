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

    @NotBlank(message = "Request type is required")
    private String requestType;

    private String typeCategory;
    private String recipient;
    private LocalDate startDate;
    private LocalDate endDate;
    private String shiftInfo;

    @NotBlank(message = "Content / message is required")
    private String content;
}
