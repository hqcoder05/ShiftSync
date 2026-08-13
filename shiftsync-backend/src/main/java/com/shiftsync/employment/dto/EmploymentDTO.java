package com.shiftsync.employment.dto;

import com.shiftsync.employment.enums.EmploymentStatus;
import com.shiftsync.employment.enums.EmploymentType;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
public class EmploymentDTO {
    private UUID id;
    private UUID staffId;
    private String staffFullName;
    private String staffEmail;
    private UUID storeId;
    private String storeName;
    private EmploymentType employmentType;
    private BigDecimal hourlyRate;
    private EmploymentStatus status;
    private LocalDate joinedDate;
    private LocalDate leftDate;
}
