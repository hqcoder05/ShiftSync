package com.shiftsync.shift.service;

import com.shiftsync.auth.repository.UserRepository;
import com.shiftsync.employment.repository.EmploymentRepository;
import com.shiftsync.payroll.repository.PayrollPeriodRepository;
import com.shiftsync.schedulehistory.entity.ScheduleChange;
import com.shiftsync.schedulehistory.repository.ScheduleChangeRepository;
import com.shiftsync.schedulehistory.service.ScheduleHistoryService;
import com.shiftsync.shift.dto.ShiftCreateRequest;
import com.shiftsync.shift.entity.*;
import com.shiftsync.shift.enums.ShiftStatus;
import com.shiftsync.shift.repository.*;
import com.shiftsync.store.entity.Store;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import java.time.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ShiftServiceHistoryHookTest {
    @Mock ShiftRepository shifts;
    @Mock ShiftAssignmentRepository assignments;
    @Mock PayrollPeriodRepository payroll;
    @InjectMocks ShiftService service;
    ScheduleChangeRepository history = mock(ScheduleChangeRepository.class);
    UUID storeId = UUID.randomUUID(), shiftId = UUID.randomUUID();
    LocalDate originalDate = LocalDate.of(2026, 10, 28);
    Shift shift;
    @BeforeEach void setup() {
        ReflectionTestUtils.setField(service, "scheduleHistoryService", new ScheduleHistoryService(history, mock(EmploymentRepository.class), mock(UserRepository.class)));
        shift = Shift.builder().id(shiftId).store(Store.builder().id(storeId).build()).shiftDate(originalDate)
                .startTime(LocalTime.of(8, 0)).endTime(LocalTime.of(16, 0)).status(ShiftStatus.PUBLISHED).build();
        when(shifts.findByIdAndStoreId(shiftId, storeId)).thenReturn(Optional.of(shift));
    }
    @Test void actualUpdateRouteRecordsOriginalAndSavedValues() {
        when(shifts.save(shift)).thenReturn(shift);
        ShiftCreateRequest request = new ShiftCreateRequest();
        request.setShiftDate(originalDate.plusDays(1)); request.setStartTime(LocalTime.of(9, 0)); request.setEndTime(LocalTime.of(17, 0));
        request.setChangeReason("Điều chỉnh giờ mở cửa");
        service.updateShift(storeId, shiftId, request);
        ArgumentCaptor<ScheduleChange> saved = ArgumentCaptor.forClass(ScheduleChange.class);
        verify(history).save(saved.capture());
        assertEquals(originalDate, saved.getValue().getBefore().shiftDate());
        assertEquals(LocalTime.of(8, 0), saved.getValue().getBefore().startTime());
        assertEquals(originalDate.plusDays(1), saved.getValue().getAfter().shiftDate());
        assertEquals(LocalTime.of(9, 0), saved.getValue().getAfter().startTime());
        assertEquals("Điều chỉnh giờ mở cửa", saved.getValue().getReason());
    }
    @Test void publishedCancellationRecordsStatusChange() {
        when(assignments.findByShiftId(shiftId)).thenReturn(List.of(ShiftAssignment.builder().staff(com.shiftsync.auth.entity.User.builder().id(UUID.randomUUID()).build()).build()));
        service.deleteShift(storeId, shiftId, "Đóng cửa bảo trì");
        ArgumentCaptor<ScheduleChange> saved = ArgumentCaptor.forClass(ScheduleChange.class);
        verify(history).save(saved.capture());
        assertEquals("PUBLISHED", saved.getValue().getBefore().status());
        assertEquals("CANCELLED", saved.getValue().getAfter().status());
        verify(shifts, never()).delete(any());
    }
}
