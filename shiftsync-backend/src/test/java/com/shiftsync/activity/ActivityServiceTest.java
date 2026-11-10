package com.shiftsync.activity;

import com.shiftsync.employment.entity.Employment;
import com.shiftsync.employment.enums.EmploymentStatus;
import com.shiftsync.employment.repository.EmploymentRepository;
import com.shiftsync.shared.exception.BusinessException;
import com.shiftsync.store.entity.Store;
import org.junit.jupiter.api.Test;
import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

class ActivityServiceTest {
    ActivityRepository repository = mock(ActivityRepository.class);
    EmploymentRepository employments = mock(EmploymentRepository.class);
    ActivityService service = new ActivityService(repository, employments);
    UUID user = UUID.randomUUID(), store = UUID.randomUUID();

    void membership() {
        when(employments.findByUserIdAndStatus(user, EmploymentStatus.ACTIVE))
                .thenReturn(List.of(Employment.builder().store(Store.builder().id(store).build()).build()));
    }
    @Test void unknownStoreFailsBeforeReadingAnyActivities() {
        membership();
        BusinessException error = assertThrows(BusinessException.class, () -> service.mine(user, UUID.randomUUID(), 20, null));
        assertEquals(403, error.getStatus().value()); verifyNoInteractions(repository);
    }
    @Test void noMembershipProducesAnEmptyPersonalPage() {
        when(employments.findByUserIdAndStatus(user, EmploymentStatus.ACTIVE)).thenReturn(List.of());
        assertEquals(new ActivityPage(List.of(), null), service.mine(user, null, 30, null));
        verifyNoInteractions(repository);
    }
    @Test void paginationUsesStableTimestampAndIdAndDoesNotReturnTheExtraRow() {
        membership(); OffsetDateTime at = OffsetDateTime.parse("2026-10-28T10:00:00Z");
        ActivityItem first = event(at, "attendance-in:"+UUID.randomUUID()), second = event(at.minusHours(1), "claim:"+UUID.randomUUID());
        when(repository.find(eq(user), eq(List.of(store)), isNull(), isNull(), eq(2))).thenReturn(List.of(first, second));
        ActivityPage page = service.mine(user, store, 1, null);
        assertEquals(List.of(first), page.items()); assertNotNull(page.nextCursor());
        when(repository.find(eq(user), eq(List.of(store)), eq(at), eq(first.id()), eq(2))).thenReturn(List.of(second));
        ActivityPage next = service.mine(user, store, 1, page.nextCursor());
        assertEquals(List.of(second), next.items()); assertNull(next.nextCursor());
    }
    @Test void malformedAndOversizedCursorsAndLimitAreRejected() {
        membership();
        for (String cursor : List.of("invalid", "x".repeat(1025), Base64.getUrlEncoder().encodeToString("2026-10-28T00:00:00Z|unsafe'id".getBytes(StandardCharsets.UTF_8)))) {
            assertEquals(400, assertThrows(BusinessException.class, () -> service.mine(user, store, 30, cursor)).getStatus().value());
        }
        assertThrows(BusinessException.class, () -> service.mine(user, store, 101, null)); verifyNoInteractions(repository);
    }
    private ActivityItem event(OffsetDateTime at, String id) {
        return new ActivityItem(id, "ATTENDANCE_IN", "Vào ca", "", at, store, "Chi nhánh", UUID.randomUUID(), "Attendance", Map.of());
    }
}
