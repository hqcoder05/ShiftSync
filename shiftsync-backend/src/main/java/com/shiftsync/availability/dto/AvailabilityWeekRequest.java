package com.shiftsync.availability.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.Data;
import java.util.List;

@Data
public class AvailabilityWeekRequest {
    @NotNull @Min(0)
    private Long revision;
    @NotNull @Size(max = 70)
    private List<@Valid AvailabilityRequest> slots;
}
