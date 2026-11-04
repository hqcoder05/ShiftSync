package com.shiftsync.payroll.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.List;
import lombok.Data;

@Data
public class UntrackedCompensationReconciliationRequest {
    @NotEmpty private List<@Valid Change> changes;

    @Data
    public static class Change {
        @NotNull private Long historyId;
        @NotNull private LocalDate effectiveDate;
        @jakarta.validation.constraints.NotBlank @Size(min=10,max=2000) private String evidence;
    }
}
