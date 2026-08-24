package com.shiftsync.leave.dto;

import com.shiftsync.leave.enums.LeaveType;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;

@Data
public class LeaveCreateRequest {
    @NotNull
    private LeaveType leaveType;
    
    @NotNull
    private LocalDate startDate;
    
    @NotNull
    private LocalDate endDate;
    
    private String reason;
}
