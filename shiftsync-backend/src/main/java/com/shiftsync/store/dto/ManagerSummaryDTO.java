package com.shiftsync.store.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;

import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Summary of a Manager assigned to a store")
public class ManagerSummaryDTO {

    @Schema(description = "Manager user ID (UUID)")
    private UUID id;

    @Schema(description = "Manager full name", example = "Store Manager Alice")
    private String fullName;

    @Schema(description = "Manager email address", example = "manager@shiftsync.com")
    private String email;

    @Schema(description = "Manager phone number", example = "0901234567")
    private String phone;

    @Schema(description = "Manager avatar identifier", example = "avatar_01")
    private String avatarId;
}
