package com.shiftsync.auth.dto;

import com.shiftsync.shared.security.SystemRole;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.util.List;
import java.util.UUID;
import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Request body for creating a new user profile")
public class UserCreateRequest {

    @NotBlank(message = "Họ và tên là bắt buộc")
    @Schema(description = "Full name of the user", example = "Nguyen Van A")
    private String fullName;

    @Pattern(regexp = "MALE|FEMALE|OTHER", message = "Giới tính phải là MALE, FEMALE hoặc OTHER")
    private String gender;

    @NotBlank(message = "Email là bắt buộc")
    @Email(message = "Email không đúng định dạng")
    @Schema(description = "User unique email address", example = "staff_auth@shiftsync.com")
    private String email;

    @NotBlank(message = "Mật khẩu là bắt buộc")
    @Size(min = 8, message = "Mật khẩu phải có ít nhất 8 ký tự")
    @Pattern(regexp = "^(?=.*[A-Za-z])(?=.*\\d)[A-Za-z\\d@$!%*?&]{8,}$", message = "Mật khẩu phải có ít nhất một chữ cái và một chữ số")
    @Schema(description = "User password", example = "password123")
    private String password;

    @Schema(description = "User contact phone number", example = "0987654321")
    private String phone;

    @NotNull(message = "Vai trò hệ thống là bắt buộc")
    @Schema(description = "User system authorization role", example = "STAFF")
    private SystemRole systemRole;

    @Schema(description = "Optional list of skill IDs to assign to staff member upon creation")
    private List<UUID> skillIds;

    @Schema(description = "Optional store ID to assign the staff member to upon creation")
    private UUID storeId;

    @Schema(description = "Optional initial contract type for a staff member")
    private UUID contractTypeId;

    @Schema(description = "Optional employment start date; defaults to the current business date")
    private LocalDate joinedDate;
}
