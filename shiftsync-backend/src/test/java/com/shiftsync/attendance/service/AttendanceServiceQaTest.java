package com.shiftsync.attendance.service;

import com.shiftsync.attendance.dto.AttendanceUpdateRequest;
import com.shiftsync.attendance.entity.Attendance;
import com.shiftsync.attendance.repository.AttendanceRepository;
import com.shiftsync.auth.entity.User;
import com.shiftsync.shared.exception.BusinessException;
import com.shiftsync.shift.entity.Shift;
import com.shiftsync.shift.entity.ShiftAssignment;
import com.shiftsync.store.entity.Store;
import com.shiftsync.store.entity.StoreConfiguration;
import com.shiftsync.store.repository.StoreConfigurationRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AttendanceServiceQaTest {

    @Mock
    private AttendanceRepository attendanceRepository;

    @Mock
    private StoreConfigurationRepository storeConfigurationRepository;

    @Mock
    private com.shiftsync.payroll.service.PayrollCalculationService payrollCalculationService;

    @InjectMocks
    private AttendanceService attendanceService;

    @Test
    void testUpdateAttendance_CheckOutBeforeCheckIn_Accepted() {
        UUID storeId = UUID.randomUUID();
        UUID attendanceId = UUID.randomUUID();

        Store store = Store.builder().id(storeId).build();
        User staff = User.builder().id(UUID.randomUUID()).build();
        Shift shift = Shift.builder().store(store).shiftDate(LocalDate.now()).startTime(LocalTime.of(8, 0)).build();
        ShiftAssignment assignment = ShiftAssignment.builder().shift(shift).staff(staff).build();
        
        Attendance attendance = Attendance.builder()
                .id(attendanceId)
                .shiftAssignment(assignment)
                .build();

        when(attendanceRepository.findById(attendanceId)).thenReturn(Optional.of(attendance));

        AttendanceUpdateRequest updateRequest = new AttendanceUpdateRequest();
        updateRequest.setCheckInTime(OffsetDateTime.now().withHour(14));
        updateRequest.setCheckOutTime(OffsetDateTime.now().withHour(10));

        assertThrows(BusinessException.class, () -> {
            attendanceService.updateAttendance(storeId, attendanceId, updateRequest);
        }, "Updating attendance with CheckOut < CheckIn MUST throw an exception!");
    }
}
