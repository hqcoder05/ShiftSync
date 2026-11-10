package com.shiftsync.availability.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.shiftsync.availability.dto.AvailabilityResponse;
import com.shiftsync.availability.dto.AvailabilityWeekResponse;
import com.shiftsync.shared.config.JacksonConfig;
import java.time.*;
import java.util.List;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class AvailabilityWeekSerializationTest {
    @Test void applicationMapperReturnsCalendarAndClockStringsRequiredByMobileAndWeb() throws Exception {
        var mapper = new JacksonConfig().objectMapper();
        var slot = AvailabilityResponse.builder().dayOfWeek((short) 1)
                .startTime(LocalTime.MIDNIGHT).endTime(LocalTime.of(23, 59, 59)).build();
        var response = AvailabilityWeekResponse.builder().weekStart(LocalDate.of(2026, 10, 26))
                .submittedAt(Instant.parse("2026-10-22T02:30:00Z"))
                .deadlineAt(AvailabilityDeadline.deadlineAt(LocalDate.of(2026, 10, 26)))
                .source("REGISTERED").slots(List.of(slot)).build();
        JsonNode json = mapper.readTree(mapper.writeValueAsString(response));
        assertEquals("2026-10-26", json.get("weekStart").asText());
        assertEquals("00:00:00", json.get("slots").get(0).get("startTime").asText());
        assertEquals("23:59:59", json.get("slots").get(0).get("endTime").asText());
        assertEquals("2026-10-22T02:30:00Z", json.get("submittedAt").asText());
        assertEquals("2026-10-23T23:59:59.999+07:00", json.get("deadlineAt").asText());
    }
}
