package com.shiftsync.quota.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BranchDTO {
    private UUID id;
    private String name;
    private String code;
    private String address;
    private String format;
    private LocalTime openTime;
    private LocalTime closeTime;
}

