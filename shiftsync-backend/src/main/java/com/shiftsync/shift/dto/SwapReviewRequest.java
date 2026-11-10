package com.shiftsync.shift.dto;

import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class SwapReviewRequest {
    @Size(max = 2000)
    private String note;
}
