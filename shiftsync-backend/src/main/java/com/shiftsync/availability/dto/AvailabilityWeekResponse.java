package com.shiftsync.availability.dto;

import lombok.Builder;
import lombok.Data;
import com.fasterxml.jackson.annotation.JsonFormat;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.UUID;

@Data @Builder
public class AvailabilityWeekResponse {
    private UUID staffId;
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    private LocalDate weekStart;
    private long revision;
    /** REGISTERED, TEMPLATE (not submitted), or UNRECORDED (no historical data inferred). */
    private String source;
    @JsonFormat(shape = JsonFormat.Shape.STRING)
    private Instant submittedAt;
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss.SSSXXX")
    private ZonedDateTime deadlineAt;
    private boolean editable;
    private List<AvailabilityResponse> slots;
}
