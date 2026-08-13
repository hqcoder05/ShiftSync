package com.shiftsync.auth.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Request body for updating a user profile")
public class UserUpdateRequest {

    @NotBlank(message = "Full name is required")
    @Schema(description = "Full name of the user", example = "Nguyen Van A Updated")
    private String fullName;

    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    @Schema(description = "User unique email address", example = "staff_auth@shiftsync.com")
    private String email;

    @Schema(description = "User contact phone number", example = "0987654321")
    private String phone;

    @Size(min = 8, message = "Password must be at least 8 characters long")
    @Pattern(regexp = "^(?=.*[A-Za-z])(?=.*\\d)[A-Za-z\\d@$!%*?&]{8,}$", message = "Password must contain at least one letter and one number")
    @Schema(description = "Optional new password. Leave empty if password is unchanged.", example = "newPassword123")
    private String password;
}
