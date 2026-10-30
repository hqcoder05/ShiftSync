package com.shiftsync.availability.service;

import com.shiftsync.availability.entity.Availability;
import java.time.*;
import java.util.*;

/** Recurring weekly availability. dayOfWeek identifies the day the interval starts. */
public final class AvailabilityCoverage {
    private AvailabilityCoverage() {}
    private record Window(LocalDateTime start, LocalDateTime end) {}

    private static Window window(LocalDate day, LocalTime start, LocalTime end) {
        return new Window(day.atTime(start), (end.isBefore(start) ? day.plusDays(1) : day).atTime(end));
    }

    public static boolean covers(List<Availability> slots, LocalDate date, LocalTime start, LocalTime end, int toleranceMinutes) {
        if (slots == null || date == null || start == null || end == null || start.equals(end)) return false;
        if (toleranceMinutes < 0 || toleranceMinutes > 60) throw new IllegalArgumentException("Availability tolerance must be between 0 and 60 minutes");
        Window shift = window(date, start, end);
        List<Window> windows = new ArrayList<>();
        // Previous day's overnight slot may cover a morning shift. The next day's
        // slot may continue an adjacent interval across midnight.
        for (LocalDate day = date.minusDays(1); !day.isAfter(date.plusDays(1)); day = day.plusDays(1)) {
            short dow = (short)(day.getDayOfWeek().getValue() % 7);
            for (Availability slot : slots) {
                if (slot.getDayOfWeek() != null && slot.getDayOfWeek() == dow
                        && slot.getStartTime() != null && slot.getEndTime() != null
                        && !slot.getStartTime().equals(slot.getEndTime())) {
                    windows.add(window(day, slot.getStartTime(), slot.getEndTime()));
                }
            }
        }
        windows.sort(Comparator.comparing(Window::start).thenComparing(Window::end));
        List<Window> merged = new ArrayList<>();
        for (Window current : windows) {
            if (merged.isEmpty() || current.start().isAfter(merged.getLast().end())) merged.add(current);
            else {
                Window previous = merged.removeLast();
                merged.add(new Window(previous.start(), previous.end().isAfter(current.end()) ? previous.end() : current.end()));
            }
        }
        return merged.stream().anyMatch(available ->
                !shift.start().isBefore(available.start().minusMinutes(toleranceMinutes))
                && !shift.end().isAfter(available.end().plusMinutes(toleranceMinutes)));
    }

    public static boolean overlaps(List<Availability> slots, short dayOfWeek, LocalTime start, LocalTime end, UUID excludedId) {
        LocalDate sunday = LocalDate.of(2026, 1, 4);
        Window proposed = window(sunday.plusDays(dayOfWeek), start, end);
        for (Availability slot : slots) {
            if (excludedId != null && excludedId.equals(slot.getId())) continue;
            for (int offset : new int[]{-7, 0, 7}) {
                Window existing = window(sunday.plusDays(slot.getDayOfWeek() + offset), slot.getStartTime(), slot.getEndTime());
                if (proposed.start().isBefore(existing.end()) && existing.start().isBefore(proposed.end())) return true;
            }
        }
        return false;
    }
}
