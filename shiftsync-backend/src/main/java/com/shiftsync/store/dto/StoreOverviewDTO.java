package com.shiftsync.store.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Admin overview of stores and manager assignments")
public class StoreOverviewDTO {

    @Schema(description = "Total number of stores in the chain", example = "3")
    private long totalStores;

    @Schema(description = "Number of stores with at least one active Manager", example = "3")
    private long assignedStoresCount;

    @Schema(description = "Number of stores without any active Manager", example = "0")
    private long unassignedStoresCount;

    @Schema(description = "Total number of users with role MANAGER", example = "3")
    private long totalManagers;

    @Schema(description = "Number of Managers assigned to at least one store", example = "3")
    private long assignedManagersCount;

    @Schema(description = "Number of Managers not yet assigned to any store", example = "0")
    private long unassignedManagersCount;

    @Schema(description = "Total active staff/users in the system", example = "42")
    private long totalUsers;
}
