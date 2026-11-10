package com.shiftsync.attendance.service;

import com.shiftsync.attendance.entity.Attendance;
import com.shiftsync.attendance.enums.AttendanceStatus;
import com.shiftsync.attendance.repository.AttendanceRepository;
import com.shiftsync.auth.entity.User;
import com.shiftsync.payroll.service.PayrollCalculationService;
import com.shiftsync.shared.exception.BusinessException;
import com.shiftsync.shared.security.JwtTokenProvider;
import com.shiftsync.shared.websocket.RealtimeEventPublisher;
import com.shiftsync.shift.entity.Shift;
import com.shiftsync.shift.entity.ShiftAssignment;
import com.shiftsync.shift.enums.ShiftStatus;
import com.shiftsync.shift.repository.ShiftAssignmentRepository;
import com.shiftsync.shift.repository.ShiftRepository;
import com.shiftsync.store.entity.Store;
import com.shiftsync.store.entity.StoreConfiguration;
import com.shiftsync.store.repository.StoreConfigurationRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AttendanceOfflineReplayTest {
    private static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final byte[] PHOTO = new byte[]{1, 2, 3};

    @Mock private AttendanceRepository attendanceRepository;
    @Mock private ShiftAssignmentRepository shiftAssignmentRepository;
    @Mock private ShiftRepository shiftRepository;
    @Mock private StoreConfigurationRepository storeConfigurationRepository;
    @Mock private JwtTokenProvider jwtTokenProvider;
    @Mock private RealtimeEventPublisher realtimeEventPublisher;
    @Mock private PayrollCalculationService payrollCalculationService;
    @Mock private EntityManager entityManager;
    @InjectMocks private AttendanceService service;

    private UUID staffId;
    private Shift shift;
    private ShiftAssignment assignment;
    private AtomicReference<Attendance> storedAttendance;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(service, "entityManager", entityManager);
        staffId = UUID.randomUUID();
        Store store = Store.builder().id(UUID.randomUUID()).name("Test store")
                .latitude(BigDecimal.TEN).longitude(BigDecimal.valueOf(106)).build();
        shift = Shift.builder().id(UUID.randomUUID()).store(store)
                .shiftDate(LocalDate.now(BUSINESS_ZONE).minusDays(2))
                .startTime(LocalTime.of(8, 0)).endTime(LocalTime.of(16, 0))
                .status(ShiftStatus.PUBLISHED).build();
        assignment = ShiftAssignment.builder().id(UUID.randomUUID()).shift(shift)
                .staff(User.builder().id(staffId).fullName("Staff").build()).build();
        storedAttendance = new AtomicReference<>();
        lenient().when(shiftAssignmentRepository.findByShiftIdAndStaffId(shift.getId(), staffId))
                .thenReturn(Optional.of(assignment));
        lenient().when(storeConfigurationRepository.findByStoreId(store.getId()))
                .thenReturn(Optional.of(new StoreConfiguration()));
        lenient().when(attendanceRepository.findByShiftAssignmentId(assignment.getId()))
                .thenAnswer(invocation -> Optional.ofNullable(storedAttendance.get()));
        lenient().when(attendanceRepository.save(any(Attendance.class))).thenAnswer(invocation -> {
            Attendance attendance = invocation.getArgument(0);
            storedAttendance.set(attendance);
            return attendance;
        });
    }

    private OffsetDateTime at(int hour, int minute) {
        return shift.getShiftDate().atTime(hour, minute).atZone(BUSINESS_ZONE).toOffsetDateTime();
    }

    private Attendance submit(String action, OffsetDateTime capturedAt) {
        return service.submitSelfie(staffId, shift.getId(), 10, 106, PHOTO, action, capturedAt);
    }

    @Test
    void delayedUploadUsesCaptureInstantAndVietnamTimeForWindowAndStatus() {
        OffsetDateTime capturedAtUtc = at(8, 10).withOffsetSameInstant(ZoneOffset.UTC);

        Attendance attendance = submit("CHECK_IN", capturedAtUtc);

        assertEquals(capturedAtUtc.toInstant(), attendance.getCheckInTime().toInstant());
        assertEquals(ZoneOffset.ofHours(7), attendance.getCheckInTime().getOffset());
        assertEquals(AttendanceStatus.LATE, attendance.getStatus());
        assertArrayEquals(PHOTO, attendance.getCheckInPhoto());
        var order = inOrder(shiftAssignmentRepository, entityManager, attendanceRepository);
        order.verify(shiftAssignmentRepository).findByShiftIdAndStaffId(shift.getId(), staffId);
        order.verify(entityManager).lock(assignment, LockModeType.PESSIMISTIC_WRITE);
        order.verify(attendanceRepository).findByShiftAssignmentId(assignment.getId());
    }

    @Test
    void retriesNeverTurnCheckInIntoCheckOutOrOverwriteCaptureTimes() {
        Attendance first = submit("CHECK_IN", at(8, 0));
        assertSame(first, submit("CHECK_IN", at(8, 1)));
        assertNull(first.getCheckOutTime());

        assertSame(first, submit("CHECK_OUT", at(16, 0)));
        assertSame(first, submit("CHECK_IN", at(8, 2)));
        assertSame(first, submit("CHECK_OUT", at(16, 1)));

        assertEquals(at(8, 0), first.getCheckInTime());
        assertEquals(at(16, 0), first.getCheckOutTime());
        verify(attendanceRepository, times(2)).save(first);
        verify(entityManager, times(5)).lock(assignment, LockModeType.PESSIMISTIC_WRITE);
    }

    @Test
    void checkOutWaitsForCheckInInsteadOfCreatingCheckIn() {
        BusinessException ex = assertThrows(BusinessException.class, () -> submit("CHECK_OUT", at(16, 0)));

        assertEquals(HttpStatus.CONFLICT, ex.getStatus());
        verify(attendanceRepository, never()).save(any());
    }

    @Test
    void originalCaptureOutsideCheckInWindowIsRejectedEvenOnDelayedUpload() {
        BusinessException ex = assertThrows(BusinessException.class, () -> submit("CHECK_IN", at(8, 31)));

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
        assertTrue(ex.getMessage().contains("Too late"));
        verify(attendanceRepository, never()).save(any());
    }

    @Test
    void futureCaptureBeyondClockToleranceIsRejected() {
        BusinessException ex = assertThrows(BusinessException.class,
                () -> submit("CHECK_IN", OffsetDateTime.now(BUSINESS_ZONE).plusMinutes(3)));

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
        verifyNoInteractions(shiftAssignmentRepository, attendanceRepository);
    }

    @Test
    void capturedTimeRequiresExplicitAction() {
        assertThrows(BusinessException.class, () -> submit(null, at(8, 0)));
        assertThrows(BusinessException.class, () -> submit("REPLAY", at(8, 0)));
        verifyNoInteractions(shiftAssignmentRepository, attendanceRepository);
    }

    @Test
    void lockedPayrollStillPreventsDelayedAttendanceWrites() {
        when(payrollCalculationService.isDateLocked(shift.getStore().getId(), shift.getShiftDate())).thenReturn(true);

        BusinessException ex = assertThrows(BusinessException.class, () -> submit("CHECK_IN", at(8, 0)));

        assertEquals(HttpStatus.FORBIDDEN, ex.getStatus());
        verify(attendanceRepository, never()).save(any());
    }

    @Test
    void assignmentOwnershipIsRequiredForReplay() {
        when(shiftAssignmentRepository.findByShiftIdAndStaffId(shift.getId(), staffId)).thenReturn(Optional.empty());

        BusinessException ex = assertThrows(BusinessException.class, () -> submit("CHECK_IN", at(8, 0)));

        assertEquals(HttpStatus.FORBIDDEN, ex.getStatus());
        verifyNoInteractions(entityManager, attendanceRepository);
    }

    @Test
    void geofenceAndFiniteCoordinatesRemainMandatory() {
        assertThrows(BusinessException.class, () -> service.submitSelfie(
                staffId, shift.getId(), 11, 106, PHOTO, "CHECK_IN", at(8, 0)));
        assertThrows(BusinessException.class, () -> service.submitSelfie(
                staffId, shift.getId(), Double.NaN, 106, PHOTO, "CHECK_IN", at(8, 0)));
        assertThrows(BusinessException.class, () -> service.submitSelfie(
                staffId, shift.getId(), 10, Double.POSITIVE_INFINITY, PHOTO, "CHECK_IN", at(8, 0)));

        verify(attendanceRepository, never()).save(any());
    }

    @Test
    void replayCannotCheckOutBeforeItsCheckIn() {
        shift.setEndTime(LocalTime.of(8, 20));
        Attendance attendance = submit("CHECK_IN", at(8, 25));

        assertThrows(BusinessException.class, () -> submit("CHECK_OUT", at(8, 15)));

        assertNull(attendance.getCheckOutTime());
        verify(attendanceRepository).save(attendance);
    }

    @Test
    void overnightCheckOutPreservesFollowingDayCaptureTime() {
        shift.setStartTime(LocalTime.of(22, 0));
        shift.setEndTime(LocalTime.of(6, 0));
        Attendance attendance = submit("CHECK_IN", at(22, 0));
        OffsetDateTime nextMorning = at(6, 0).plusDays(1);

        submit("CHECK_OUT", nextMorning);

        assertEquals(nextMorning, attendance.getCheckOutTime());
        assertEquals(AttendanceStatus.PRESENT, attendance.getStatus());
    }

    @Test
    void readingUtcDatabaseTimestampsCalculatesLatenessInVietnamTime() {
        Attendance attendance = Attendance.builder().id(UUID.randomUUID()).shiftAssignment(assignment)
                .checkInTime(at(8, 10).withOffsetSameInstant(ZoneOffset.UTC)).status(AttendanceStatus.LATE).build();
        when(attendanceRepository.findByShiftAssignment_Staff_IdOrderByCheckInTimeDesc(staffId)).thenReturn(List.of(attendance));

        var result = service.getMyAttendance(staffId);

        assertEquals(10L, result.getFirst().getLateMinutes());
    }
}
