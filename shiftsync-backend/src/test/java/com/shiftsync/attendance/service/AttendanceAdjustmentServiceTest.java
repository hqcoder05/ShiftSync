package com.shiftsync.attendance.service;

import com.shiftsync.attendance.dto.AdjustmentCreateRequest;
import com.shiftsync.attendance.dto.AdjustmentResponseDTO;
import com.shiftsync.attendance.entity.Attendance;
import com.shiftsync.attendance.entity.AttendanceAdjustmentRequest;
import com.shiftsync.attendance.enums.AdjustmentStatus;
import com.shiftsync.attendance.repository.AttendanceAdjustmentRequestRepository;
import com.shiftsync.attendance.repository.AttendanceRepository;
import com.shiftsync.auth.entity.User;
import com.shiftsync.auth.repository.UserRepository;
import com.shiftsync.payroll.repository.PayrollPeriodRepository;
import com.shiftsync.shared.exception.BusinessException;
import com.shiftsync.shift.entity.Shift;
import com.shiftsync.shift.entity.ShiftAssignment;
import com.shiftsync.shift.repository.ShiftAssignmentRepository;
import com.shiftsync.store.repository.StoreConfigurationRepository;
import com.shiftsync.shift.repository.ShiftRepository;
import com.shiftsync.store.entity.Store;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class AttendanceAdjustmentServiceTest {

    @Mock
    private AttendanceAdjustmentRequestRepository requestRepository;
    @Mock
    private AttendanceRepository attendanceRepository;
    @Mock
    private ShiftRepository shiftRepository;
    @Mock
    private ShiftAssignmentRepository shiftAssignmentRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private PayrollPeriodRepository payrollPeriodRepository;
    @Mock
    private StoreConfigurationRepository storeConfigurationRepository;

    @InjectMocks
    private AttendanceAdjustmentService service;

    private User staff;
    private User manager;
    private Store store;
    private Shift shift;
    private ShiftAssignment assignment;

    @BeforeEach
    void setUp() {
        staff = User.builder().id(UUID.randomUUID()).fullName("Staff 1").build();
        manager = User.builder().id(UUID.randomUUID()).fullName("Manager 1").build();
        store = Store.builder().id(UUID.randomUUID()).build();
        shift = Shift.builder().id(UUID.randomUUID()).store(store).shiftDate(LocalDate.now()).startTime(java.time.LocalTime.of(9, 0)).build();
        assignment = ShiftAssignment.builder().id(UUID.randomUUID()).staff(staff).shift(shift).build();
    }

    @Test
    void createRequest_Success() {
        AdjustmentCreateRequest dto = new AdjustmentCreateRequest();
        dto.setShiftId(shift.getId());
        dto.setRequestedCheckIn(OffsetDateTime.now());
        dto.setRequestedCheckOut(OffsetDateTime.now().plusHours(4));
        dto.setReason("Forgot to check in");

        when(userRepository.findById(staff.getId())).thenReturn(Optional.of(staff));
        when(shiftRepository.findById(shift.getId())).thenReturn(Optional.of(shift));
        when(payrollPeriodRepository.existsByStoreIdAndStartDateLessThanEqualAndEndDateGreaterThanEqualAndStatusIn(any(), any(), any(), any())).thenReturn(false);
        
        AttendanceAdjustmentRequest savedRequest = AttendanceAdjustmentRequest.builder()
                .id(UUID.randomUUID())
                .staff(staff)
                .shift(shift)
                .status(AdjustmentStatus.PENDING)
                .build();
                
        when(requestRepository.save(any())).thenReturn(savedRequest);

        AdjustmentResponseDTO result = service.createRequest(staff.getId(), dto);

        assertNotNull(result);
        assertEquals(AdjustmentStatus.PENDING, result.getStatus());
        verify(requestRepository, times(1)).save(any());
    }

    @Test
    void createRequest_LockedPeriod() {
        AdjustmentCreateRequest dto = new AdjustmentCreateRequest();
        dto.setShiftId(shift.getId());

        when(userRepository.findById(staff.getId())).thenReturn(Optional.of(staff));
        when(shiftRepository.findById(shift.getId())).thenReturn(Optional.of(shift));
        when(payrollPeriodRepository.existsByStoreIdAndStartDateLessThanEqualAndEndDateGreaterThanEqualAndStatusIn(any(), any(), any(), any())).thenReturn(true);

        BusinessException ex = assertThrows(BusinessException.class, () -> service.createRequest(staff.getId(), dto));
        assertTrue(ex.getMessage().contains("submit adjustment"));
    }

    @Test
    void approveRequest_WithExistingAttendance() {
        Attendance attendance = Attendance.builder().id(UUID.randomUUID()).shiftAssignment(assignment).build();
        AttendanceAdjustmentRequest request = AttendanceAdjustmentRequest.builder()
                .id(UUID.randomUUID())
                .shift(shift)
                .staff(staff)
                .attendance(attendance)
                .status(AdjustmentStatus.PENDING)
                .requestedCheckIn(OffsetDateTime.now())
                .build();

        when(requestRepository.findById(request.getId())).thenReturn(Optional.of(request));
        when(payrollPeriodRepository.existsByStoreIdAndStartDateLessThanEqualAndEndDateGreaterThanEqualAndStatusIn(any(), any(), any(), any())).thenReturn(false);
        when(userRepository.findById(manager.getId())).thenReturn(Optional.of(manager));
        when(storeConfigurationRepository.findByStoreId(any())).thenReturn(Optional.of(new com.shiftsync.store.entity.StoreConfiguration()));
        when(requestRepository.save(any())).thenReturn(request);

        AdjustmentResponseDTO result = service.approveRequest(store.getId(), request.getId(), manager.getId());

        assertEquals(AdjustmentStatus.APPROVED, result.getStatus());
        verify(attendanceRepository, times(1)).save(attendance);
        assertNotNull(attendance.getCheckInTime());
    }

    @Test
    void approveRequest_WithoutExistingAttendance() {
        AttendanceAdjustmentRequest request = AttendanceAdjustmentRequest.builder()
                .id(UUID.randomUUID())
                .shift(shift)
                .staff(staff)
                .attendance(null)
                .status(AdjustmentStatus.PENDING)
                .requestedCheckIn(OffsetDateTime.now())
                .build();

        when(requestRepository.findById(request.getId())).thenReturn(Optional.of(request));
        when(payrollPeriodRepository.existsByStoreIdAndStartDateLessThanEqualAndEndDateGreaterThanEqualAndStatusIn(any(), any(), any(), any())).thenReturn(false);
        when(userRepository.findById(manager.getId())).thenReturn(Optional.of(manager));
        when(shiftAssignmentRepository.findByShiftIdAndStaffId(shift.getId(), staff.getId())).thenReturn(Optional.of(assignment));
        when(storeConfigurationRepository.findByStoreId(any())).thenReturn(Optional.of(new com.shiftsync.store.entity.StoreConfiguration()));
        
        Attendance createdAttendance = Attendance.builder().id(UUID.randomUUID()).shiftAssignment(assignment).build();
        when(attendanceRepository.save(any())).thenReturn(createdAttendance);
        when(requestRepository.save(any())).thenReturn(request);

        AdjustmentResponseDTO result = service.approveRequest(store.getId(), request.getId(), manager.getId());

        assertEquals(AdjustmentStatus.APPROVED, result.getStatus());
        verify(attendanceRepository, times(1)).save(any()); // Creates new attendance
        assertEquals(createdAttendance.getId(), request.getAttendance().getId());
    }

    @Test
    void rejectRequest() {
        AttendanceAdjustmentRequest request = AttendanceAdjustmentRequest.builder()
                .id(UUID.randomUUID())
                .shift(shift)
                .staff(staff)
                .status(AdjustmentStatus.PENDING)
                .build();

        when(requestRepository.findById(request.getId())).thenReturn(Optional.of(request));
        when(payrollPeriodRepository.existsByStoreIdAndStartDateLessThanEqualAndEndDateGreaterThanEqualAndStatusIn(any(), any(), any(), any())).thenReturn(false);
        when(userRepository.findById(manager.getId())).thenReturn(Optional.of(manager));
        when(requestRepository.save(any())).thenReturn(request);

        AdjustmentResponseDTO result = service.rejectRequest(store.getId(), request.getId(), manager.getId());

        assertEquals(AdjustmentStatus.REJECTED, result.getStatus());
        verify(attendanceRepository, never()).save(any()); // Attendance not modified
    }
}
