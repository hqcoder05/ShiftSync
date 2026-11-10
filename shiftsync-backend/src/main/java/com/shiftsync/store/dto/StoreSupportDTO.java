package com.shiftsync.store.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.UUID;

public record StoreSupportDTO(
        UUID storeId,
        @Pattern(regexp = "^$|^\\+?[0-9]{3,15}$", message = "Hotline cần 3–15 chữ số, có thể bắt đầu bằng +.") String supportPhone,
        @Size(max = 80, message = "Tên liên hệ tối đa 80 ký tự.") String supportLabel) { }
