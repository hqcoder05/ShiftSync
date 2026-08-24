package com.shiftsync.auth.dto;

import com.shiftsync.shared.security.SystemRole;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;

import java.time.OffsetDateTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Data Transfer Object for User profiles")
public class UserDTO {

    @Schema(description = "User unique identifier (UUID)", example = "1466b30e-a37d-4f81-8532-06cc32461040")
    private UUID id;

    @Schema(description = "Full name of the user", example = "Nguyen Van A")
    private String fullName;

    @Schema(description = "Unique email address", example = "staff_auth@shiftsync.com")
    private String email;

    @Schema(description = "User contact phone number", example = "0987654321")
    private String phone;

    @Schema(description = "Assigned system role", example = "STAFF")
    private SystemRole systemRole;

    @Schema(description = "User profile creation date-time", example = "2026-08-04T10:00:00+07:00")
    private OffsetDateTime createdAt;

    @Schema(description = "User profile last update date-time", example = "2026-08-04T10:00:00+07:00")
    private OffsetDateTime updatedAt;
}
