package com.shiftsync.shift.service;

import com.shiftsync.shift.entity.Shift;
import java.time.DayOfWeek;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/** Local store time, with half-open boundaries; equal start/end means zero hours. */
final class ShiftTimeRange {
    private ShiftTimeRange() {}

    static LocalDateTime start(Shift shift) {
        return shift.getShiftDate().atTime(shift.getStartTime());
    }

    static LocalDateTime end(Shift shift) {
        var end = shift.getShiftDate().atTime(shift.getEndTime());
        return end.isBefore(start(shift)) ? end.plusDays(1) : end;
    }

    static boolean overlaps(Shift first, Shift second) {
        return start(first).isBefore(end(second)) && start(second).isBefore(end(first));
    }

    static double hours(Shift shift) {
        return Duration.between(start(shift), end(shift)).toNanos() / 3_600_000_000_000.0;
    }

    static boolean hasRequiredRest(List<Shift> schedule, Shift addition, int restHours) {
        Duration required=Duration.ofHours(restHours);
        for(Shift existing:schedule) {
            if(overlaps(existing,addition)) return false;
            Duration gap = !end(existing).isAfter(start(addition))
                    ? Duration.between(end(existing),start(addition))
                    : Duration.between(end(addition),start(existing));
            if(gap.compareTo(required)<0) return false;
        }
        return true;
    }

    static LocalDate weekStart(LocalDate date) {
        return date.with(DayOfWeek.MONDAY);
    }

    static double hoursInWeek(Shift shift, LocalDate dateInWeek) {
        return nanosInWeek(shift, dateInWeek) / 3_600_000_000_000.0;
    }

    static double hoursInMonth(Shift shift, java.time.YearMonth month) {
        var from=start(shift).isAfter(month.atDay(1).atStartOfDay()) ? start(shift) : month.atDay(1).atStartOfDay();
        var to=end(shift).isBefore(month.plusMonths(1).atDay(1).atStartOfDay()) ? end(shift) : month.plusMonths(1).atDay(1).atStartOfDay();
        return to.isAfter(from) ? Duration.between(from,to).toMinutes()/60.0 : 0.0;
    }

    private static long nanosInWeek(Shift shift, LocalDate dateInWeek) {
        var weekStart = weekStart(dateInWeek).atStartOfDay();
        var weekEnd = weekStart.plusWeeks(1);
        var from = start(shift).isAfter(weekStart) ? start(shift) : weekStart;
        var to = end(shift).isBefore(weekEnd) ? end(shift) : weekEnd;
        return to.isAfter(from) ? Duration.between(from, to).toNanos() : 0;
    }

    static boolean fitsWeeklyLimit(List<Shift> schedule, Shift addition, double maxHours) {
        return fitsWeeklyLimit(schedule, addition, ignored -> maxHours);
    }

    static boolean fitsWeeklyLimit(List<Shift> schedule, Shift addition, java.util.function.ToDoubleFunction<LocalDate> maxHoursByDay) {
        LocalDate lastWeek = weekStart(ShiftDateRange.lastWorkingDate(addition));
        for (LocalDate week = weekStart(addition.getShiftDate()); !week.isAfter(lastWeek); week = week.plusWeeks(1)) {
            long totalNanos = nanosInWeek(addition, week);
            for (Shift shift : schedule) totalNanos += nanosInWeek(shift, week);
            LocalDate first = addition.getShiftDate().isAfter(week) ? addition.getShiftDate() : week;
            LocalDate last = ShiftDateRange.lastWorkingDate(addition).isBefore(week.plusDays(6))
                    ? ShiftDateRange.lastWorkingDate(addition) : week.plusDays(6);
            for (LocalDate day = first; !day.isAfter(last); day = day.plusDays(1)) {
                if (totalNanos > maxHoursByDay.applyAsDouble(day) * 3_600_000_000_000.0) return false;
            }
        }
        return true;
    }
}
