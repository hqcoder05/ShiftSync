package com.shiftsync.auth.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Response containing security tokens and user metadata")
public class AuthResponse {

    @Schema(description = "JWT Access Token", example = "eyJhbGciOiJIUzUxMiJ9...")
    private String accessToken;

    @Schema(description = "Refresh Token (UUID)", example = "af8b3543-ea33-41bd-8e89-a3d3bbc980e9")
    private String refreshToken;

    @Schema(description = "User email address", example = "staff_auth@shiftsync.com")
    private String email;

    @Schema(description = "User system role", example = "STAFF")
    private String role;
    
    @Builder.Default
    @Schema(description = "Token type", example = "Bearer")
    private String tokenType = "Bearer";
}
