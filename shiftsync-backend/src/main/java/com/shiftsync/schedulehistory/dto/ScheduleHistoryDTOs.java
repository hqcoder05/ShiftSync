package com.shiftsync.schedulehistory.dto;

import java.time.*;
import java.util.*;

public final class ScheduleHistoryDTOs {
    private ScheduleHistoryDTOs() { }
    public record ShiftSnapshot(LocalDate shiftDate, LocalTime startTime, LocalTime endTime, String status, List<String> zones, List<UUID> zoneIds) { }
    public record HistoryDTO(UUID id, UUID storeId, UUID shiftId, UUID actorId, String actorName,
            OffsetDateTime changedAt, String reason, ShiftSnapshot before, ShiftSnapshot after) { }
}
