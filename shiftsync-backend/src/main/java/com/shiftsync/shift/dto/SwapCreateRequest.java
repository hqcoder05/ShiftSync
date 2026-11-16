package com.shiftsync.shift.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;
import java.util.UUID;

@Data
public class SwapCreateRequest {
    @NotNull(message = "From shift ID is required")
    private UUID fromShiftId;

    private UUID toStaffId;

    @Size(max = 3, message = "Tối đa chỉ được chọn 3 đồng nghiệp")
    private List<UUID> toStaffIds;

    private UUID toShiftId;
}
