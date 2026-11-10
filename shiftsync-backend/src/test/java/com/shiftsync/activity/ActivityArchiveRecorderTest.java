package com.shiftsync.activity;

import com.shiftsync.auth.entity.User;
import com.shiftsync.leave.entity.LeaveRequest;
import com.shiftsync.leave.enums.*;
import com.shiftsync.store.entity.Store;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import java.time.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class ActivityArchiveRecorderTest {
    NamedParameterJdbcTemplate jdbc = mock(NamedParameterJdbcTemplate.class);
    ActivityArchiveRecorder recorder = new ActivityArchiveRecorder(jdbc);
    OffsetDateTime created = OffsetDateTime.parse("2026-10-20T08:10:00Z"), reviewed = created.plusDays(1), cancelled = reviewed.plusDays(1);
    LeaveRequest leave = LeaveRequest.builder().id(UUID.randomUUID()).staff(User.builder().id(UUID.randomUUID()).build())
            .store(Store.builder().id(UUID.randomUUID()).build()).leaveType(LeaveType.UNPAID).status(LeaveStatus.APPROVED)
            .startDate(LocalDate.of(2026, 11, 2)).endDate(LocalDate.of(2026, 11, 3)).createdAt(created).approvedAt(reviewed)
            .approvedBy(User.builder().id(UUID.randomUUID()).fullName("Quản lý").build()).build();

    @Test void preservesOriginalActionTimesAndNewCancellationWithoutChangingEventIds() {
        List<Map<String, Object>> writes = new ArrayList<>();
        when(jdbc.update(anyString(), any(MapSqlParameterSource.class))).thenAnswer(call -> {
            writes.add(new LinkedHashMap<>(((MapSqlParameterSource) call.getArgument(1)).getValues())); return 1;
        });
        recorder.preserveCancelledLeave(leave, leave.getStaff().getId(), cancelled);
        assertEquals(List.of("leave-sent:"+leave.getId(), "leave-reviewed:"+leave.getId(), "leave-cancelled:"+leave.getId()), writes.stream().map(row -> row.get("eventId")).toList());
        assertEquals(List.of(created, reviewed, cancelled), writes.stream().map(row -> row.get("at")).toList());
        assertEquals(List.of("REQUEST_SENT", "REQUEST_REVIEWED", "REQUEST_CANCELLED"), writes.stream().map(row -> row.get("type")).toList());
        assertTrue(writes.stream().allMatch(row -> leave.getStaff().getId().equals(row.get("staff")) && leave.getStore().getId().equals(row.get("store"))));
        verify(jdbc, times(3)).update(contains("ON CONFLICT(event_id) DO NOTHING"), any(MapSqlParameterSource.class));
    }
    @Test void unknownOriginalTimestampsDoNotFabricateEvents() {
        leave.setCreatedAt(null); leave.setApprovedAt(null);
        recorder.preserveCancelledLeave(leave, leave.getStaff().getId(), cancelled);
        verify(jdbc).update(anyString(), argThat((MapSqlParameterSource params) -> params.getValue("eventId").equals("leave-cancelled:"+leave.getId()) && params.getValue("at").equals(cancelled)));
    }
}
