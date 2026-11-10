package com.shiftsync.auth.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.*;
import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserPersonalInfoRequest {
    @Pattern(regexp = "^(?:|(?:0|\\+84)(?:3|5|7|8|9)\\d{8})$", message = "Số điện thoại Việt Nam chưa đúng định dạng.")
    private String phone;
    @com.fasterxml.jackson.annotation.JsonFormat(shape = com.fasterxml.jackson.annotation.JsonFormat.Shape.STRING, pattern = "uuuu-MM-dd", lenient = com.fasterxml.jackson.annotation.OptBoolean.FALSE)
    private LocalDate birthDate;
    @Size(max = 160, message = "Nơi sinh tối đa 160 ký tự.")
    private String birthPlace;
    @Pattern(regexp = "^(?:Nam|Nữ|Khác)?$", message = "Giới tính không hợp lệ.")
    private String gender;
}
