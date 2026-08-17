package com.shiftsync.auth.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Request body for refreshing token")
public class RefreshRequest {

    @NotBlank(message = "Refresh token is required")
    @Schema(description = "Active refresh token UUID", example = "af8b3543-ea33-41bd-8e89-a3d3bbc980e9")
    private String refreshToken;
}
