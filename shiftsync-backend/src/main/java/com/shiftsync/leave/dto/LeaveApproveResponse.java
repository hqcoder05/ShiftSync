package com.shiftsync.leave.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class LeaveApproveResponse {
    private LeaveRequestDTO leaveRequest;
    private String warning;
}
