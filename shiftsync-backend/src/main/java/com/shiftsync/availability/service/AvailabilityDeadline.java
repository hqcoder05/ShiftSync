package com.shiftsync.availability.service;

import com.shiftsync.shared.exception.BusinessException;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import org.springframework.http.HttpStatus;

/** Recurring availability may be edited until Friday 23:59 for the following week. */
public final class AvailabilityDeadline {
    public static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private AvailabilityDeadline() {}

    public static LocalDate nextWeekStart(ZonedDateTime now) {
        return now.withZoneSameInstant(BUSINESS_ZONE).toLocalDate()
                .with(java.time.temporal.TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY)).plusWeeks(1);
    }

    public static ZonedDateTime deadlineAt(LocalDate weekStart) {
        return weekStart.minusDays(2).atStartOfDay(BUSINESS_ZONE).minusNanos(1);
    }

    public static boolean isEditable(LocalDate weekStart, ZonedDateTime now) {
        return weekStart.equals(nextWeekStart(now)) && !now.toInstant().isAfter(deadlineAt(weekStart).toInstant());
    }

    public static void requireOpen(LocalDate weekStart, ZonedDateTime now) {
        if (!isEditable(weekStart, now)) {
            throw new BusinessException("Chỉ đăng ký tuần kế tiếp trước 23:59 Thứ Sáu (giờ Việt Nam). Tuần đã chốt hoặc chưa mở không thể chỉnh sửa.", HttpStatus.CONFLICT);
        }
    }

    public static boolean isClosed(ZonedDateTime now) {
        DayOfWeek day = now.withZoneSameInstant(BUSINESS_ZONE).getDayOfWeek();
        return day == DayOfWeek.SATURDAY || day == DayOfWeek.SUNDAY;
    }

    public static void requireOpen() {
        if (isClosed(ZonedDateTime.now(BUSINESS_ZONE))) {
            throw new BusinessException("Đã hết hạn đăng ký lịch rảnh: 23:59 Thứ Sáu cho tuần kế tiếp. Mở đăng ký lại vào Thứ Hai.", HttpStatus.CONFLICT);
        }
    }
}
