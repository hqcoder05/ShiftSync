package com.shiftsync.availability.mapper;

import com.shiftsync.availability.dto.AvailabilityResponse;
import com.shiftsync.availability.entity.Availability;

public class AvailabilityMapper {

    public static AvailabilityResponse toDTO(Availability availability) {
        if (availability == null) {
            return null;
        }

        return AvailabilityResponse.builder()
                .id(availability.getId())
                .staffId(availability.getUser().getId())
                .dayOfWeek(availability.getDayOfWeek())
                .startTime(availability.getStartTime())
                .endTime(availability.getEndTime())
                .build();
    }
}
