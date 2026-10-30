package com.shiftsync.shift.service;

import com.shiftsync.shift.entity.Shift;
import java.time.LocalDate;
import java.time.LocalTime;

/** Dates actually worked in the half-open interval [start, end). */
final class ShiftDateRange {
    private ShiftDateRange() {}

    static LocalDate lastWorkingDate(Shift shift) {
        return shift.getEndTime().isBefore(shift.getStartTime())
                && !shift.getEndTime().equals(LocalTime.MIDNIGHT)
                ? shift.getShiftDate().plusDays(1) : shift.getShiftDate();
    }

    static boolean includes(Shift shift, LocalDate date) {
        return date != null && !date.isBefore(shift.getShiftDate())
                && !date.isAfter(lastWorkingDate(shift));
    }
}
