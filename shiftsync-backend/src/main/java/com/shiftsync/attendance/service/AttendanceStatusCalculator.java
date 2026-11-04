package com.shiftsync.attendance.service;

import com.shiftsync.attendance.enums.AttendanceStatus;
import com.shiftsync.shared.exception.BusinessException;
import com.shiftsync.shift.entity.Shift;
import com.shiftsync.store.entity.StoreConfiguration;
import java.time.*;
import org.springframework.http.HttpStatus;

final class AttendanceStatusCalculator {
    private AttendanceStatusCalculator() {}
    static AttendanceStatus calculate(Shift shift, OffsetDateTime checkIn, OffsetDateTime checkOut, StoreConfiguration config) {
        if (checkIn != null && checkOut != null && checkOut.isBefore(checkIn))
            throw new BusinessException("Giờ ra không thể trước giờ vào", HttpStatus.BAD_REQUEST);
        var zone=ZoneId.of("Asia/Ho_Chi_Minh");
        var start=shift.getShiftDate().atTime(shift.getStartTime());
        int late=config != null && config.getLateGraceMinutes()!=null ? config.getLateGraceMinutes() : 5;
        int early=config != null && config.getEarlyLeaveGraceMinutes()!=null ? config.getEarlyLeaveGraceMinutes() : 5;
        if (checkIn != null && checkIn.atZoneSameInstant(zone).toLocalDateTime().isAfter(start.plusMinutes(late))) return AttendanceStatus.LATE;
        if (checkOut != null && shift.getEndTime()!=null) {
            var end=shift.getShiftDate().atTime(shift.getEndTime());
            if (!end.isAfter(start)) end=end.plusDays(1);
            if (checkOut.atZoneSameInstant(zone).toLocalDateTime().isBefore(end.minusMinutes(early))) return AttendanceStatus.EARLY_LEAVE;
        }
        return AttendanceStatus.PRESENT;
    }
}
