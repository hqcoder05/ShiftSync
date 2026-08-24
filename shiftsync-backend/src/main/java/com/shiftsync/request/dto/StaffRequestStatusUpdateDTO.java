package com.shiftsync.request.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StaffRequestStatusUpdateDTO {

    @NotBlank(message = "Status is required")
    private String status; // 'Đã phê duyệt' | 'Đã từ chối' | 'Đang chờ phê duyệt'
}
