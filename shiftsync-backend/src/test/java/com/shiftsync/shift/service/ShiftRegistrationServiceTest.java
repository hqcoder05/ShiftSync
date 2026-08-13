package com.shiftsync.shift.service;

import com.shiftsync.auth.entity.User;
import com.shiftsync.auth.repository.UserRepository;
import com.shiftsync.shared.exception.BusinessException;
import com.shiftsync.shift.entity.Shift;
import com.shiftsync.shift.enums.ShiftStatus;
import com.shiftsync.shift.repository.ShiftAssignmentRepository;
import com.shiftsync.shift.repository.ShiftRegistrationRepository;
import com.shiftsync.shift.repository.ShiftRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZonedDateTime;
import java.util.Arrays;
import java.util.Collections;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ShiftRegistrationServiceTest {

    @Mock
    private ShiftRepository shiftRepository;

    @Mock
    private ShiftRegistrationRepository shiftRegistrationRepository;

    @Mock
    private ShiftAssignmentRepository shiftAssignmentRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private ShiftValidationService shiftValidationService;

    @InjectMocks
    private ShiftRegistrationService shiftRegistrationService;

    private UUID storeId;
    private UUID shiftId;
    private UUID staffId;
    private User staff;
    private Shift targetShift;

    @BeforeEach
    void setUp() {
        storeId = UUID.randomUUID();
        shiftId = UUID.randomUUID();
        staffId = UUID.randomUUID();

        staff = User.builder().id(staffId).fullName("Test User").build();

        targetShift = Shift.builder()
                .id(shiftId)
                .shiftDate(LocalDate.of(2023, 11, 15)) // Wednesday
                .startTime(LocalTime.of(8, 0))
                .endTime(LocalTime.of(16, 0)) // 8 hours
                .status(ShiftStatus.PUBLISHED)
                .registrationDeadline(ZonedDateTime.now().plusDays(1))
                .build();
    }

    @Test
    void registerForShift_Success() {
        when(shiftRepository.findByIdAndStoreId(shiftId, storeId)).thenReturn(Optional.of(targetShift));
        when(shiftRegistrationRepository.existsByShiftIdAndStaffId(shiftId, staffId)).thenReturn(false);
        when(shiftAssignmentRepository.existsByShiftIdAndStaffId(shiftId, staffId)).thenReturn(false);

        when(userRepository.findById(staffId)).thenReturn(Optional.of(staff));
        when(shiftRegistrationRepository.save(any())).thenAnswer(i -> {
            com.shiftsync.shift.entity.ShiftRegistration reg = i.getArgument(0);
            reg.setId(UUID.randomUUID());
            return reg;
        });

        var result = shiftRegistrationService.registerForShift(storeId, shiftId, staffId);

        assertNotNull(result);
        assertEquals(staffId, result.getStaffId());
        assertEquals(shiftId, result.getShiftId());
        verify(shiftValidationService).validateNoOverlapAndWeeklyHours(any(), eq(staffId), isNull());
        verify(shiftRegistrationRepository).save(any());
    }

    @Test
    void registerForShift_FailsDueToOverlap() {
        when(shiftRepository.findByIdAndStoreId(shiftId, storeId)).thenReturn(Optional.of(targetShift));
        
        Shift overlappingShift = Shift.builder()
                .id(UUID.randomUUID())
                .shiftDate(LocalDate.of(2023, 11, 15))
                .startTime(LocalTime.of(12, 0))
                .endTime(LocalTime.of(20, 0))
                .build();

        doThrow(new BusinessException("overlaps", HttpStatus.CONFLICT))
                .when(shiftValidationService).validateNoOverlapAndWeeklyHours(any(), eq(staffId), isNull());

        BusinessException ex = assertThrows(BusinessException.class, 
                () -> shiftRegistrationService.registerForShift(storeId, shiftId, staffId));
        
        assertEquals(HttpStatus.CONFLICT, ex.getStatus());
        assertTrue(ex.getMessage().contains("overlaps"));
        verify(shiftRegistrationRepository, never()).save(any());
    }

    @Test
    void registerForShift_FailsDueToMaxWeeklyHours() {
        when(shiftRepository.findByIdAndStoreId(shiftId, storeId)).thenReturn(Optional.of(targetShift));
        
        // Create 5 shifts of 8 hours each = 40 hours. Adding target (8) = 48 -> should pass.
        // Let's create 6 shifts of 8 hours = 48 hours. Adding target (8) = 56 -> should fail.
        Shift existing1 = Shift.builder().shiftDate(LocalDate.of(2023, 11, 13)).startTime(LocalTime.of(8,0)).endTime(LocalTime.of(16,0)).build();
        Shift existing2 = Shift.builder().shiftDate(LocalDate.of(2023, 11, 14)).startTime(LocalTime.of(8,0)).endTime(LocalTime.of(16,0)).build();
        Shift existing3 = Shift.builder().shiftDate(LocalDate.of(2023, 11, 16)).startTime(LocalTime.of(8,0)).endTime(LocalTime.of(16,0)).build();
        Shift existing4 = Shift.builder().shiftDate(LocalDate.of(2023, 11, 17)).startTime(LocalTime.of(8,0)).endTime(LocalTime.of(16,0)).build();
        Shift existing5 = Shift.builder().shiftDate(LocalDate.of(2023, 11, 18)).startTime(LocalTime.of(8,0)).endTime(LocalTime.of(16,0)).build();
        Shift existing6 = Shift.builder().shiftDate(LocalDate.of(2023, 11, 19)).startTime(LocalTime.of(8,0)).endTime(LocalTime.of(16,0)).build();

        doThrow(new BusinessException("exceed the maximum weekly hours", HttpStatus.BAD_REQUEST))
                .when(shiftValidationService).validateNoOverlapAndWeeklyHours(any(), eq(staffId), isNull());

        BusinessException ex = assertThrows(BusinessException.class, 
                () -> shiftRegistrationService.registerForShift(storeId, shiftId, staffId));
        
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
        assertTrue(ex.getMessage().contains("exceed the maximum weekly hours"));
        verify(shiftRegistrationRepository, never()).save(any());
    }
}
