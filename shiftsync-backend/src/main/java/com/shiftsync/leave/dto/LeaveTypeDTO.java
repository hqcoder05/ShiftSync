package com.shiftsync.leave.dto;

import com.shiftsync.leave.enums.LeaveType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LeaveTypeDTO {
    private LeaveType code;
    private String name;
    private String description;
    private boolean isPaid;
    private boolean deductsAnnualBalance;
    private boolean requiresApproval;
}
