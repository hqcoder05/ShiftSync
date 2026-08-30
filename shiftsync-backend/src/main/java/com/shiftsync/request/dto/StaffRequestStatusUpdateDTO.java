package com.shiftsync.request.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StaffRequestStatusUpdateDTO {

    @jakarta.validation.constraints.NotNull(message = "Status is required")
    private com.shiftsync.request.enums.RequestStatus status;
}
