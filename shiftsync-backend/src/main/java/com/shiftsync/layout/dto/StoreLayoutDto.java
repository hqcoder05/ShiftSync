package com.shiftsync.layout.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StoreLayoutDto {
    private UUID id;
    private UUID storeId;
    private Double length;
    private Double width;
    private Double height;
}
