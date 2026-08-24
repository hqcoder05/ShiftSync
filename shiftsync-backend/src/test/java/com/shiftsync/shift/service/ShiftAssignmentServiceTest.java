package com.shiftsync.shift.service;

import com.shiftsync.auth.entity.User;
import com.shiftsync.auth.repository.UserRepository;
import com.shiftsync.availability.repository.AvailabilityRepository;
import com.shiftsync.availability.repository.BlackoutDateRepository;
import com.shiftsync.employment.enums.EmploymentStatus;
import com.shiftsync.employment.repository.EmploymentRepository;
import com.shiftsync.payroll.repository.PayrollPeriodRepository;
import com.shiftsync.shared.exception.BusinessException;
import com.shiftsync.shift.dto.ShiftAssignmentResponseDTO;
import com.shiftsync.shift.entity.Shift;
import com.shiftsync.shift.entity.ShiftAssignment;
import com.shiftsync.shift.entity.ShiftSkillRequirement;
import com.shiftsync.shift.enums.AssignmentSource;
import com.shiftsync.shift.repository.ShiftAssignmentRepository;
import com.shiftsync.shift.repository.ShiftRepository;
import com.shiftsync.store.entity.Store;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ShiftAssignmentServiceTest {

    @Mock private ShiftRepository shiftRepository;
    @Mock private ShiftAssignmentRepository shiftAssignmentRepository;
    @Mock private AvailabilityRepository availabilityRepository;
    @Mock private BlackoutDateRepository blackoutDateRepository;
    @Mock private EmploymentRepository employmentRepository;
    @Mock private UserRepository userRepository;
    @Mock private PayrollPeriodRepository payrollPeriodRepository;
    @Mock private ShiftValidationService shiftValidationService;

    @InjectMocks
    private ShiftAssignmentService service;

    private UUID storeId;
    private UUID shiftId;
    private UUID staffId;
    private Shift shift;
    private User staff;

    @BeforeEach
    void setup() {
        storeId = UUID.randomUUID();
        shiftId = UUID.randomUUID();
        staffId = UUID.randomUUID();

        Store store = Store.builder().id(storeId).build();
        shift = Shift.builder()
                .id(shiftId)
                .store(store)
                .shiftDate(LocalDate.now())
                .startTime(LocalTime.of(9, 0))
                .endTime(LocalTime.of(17, 0))
                .requirements(List.of(
                        ShiftSkillRequirement.builder().requiredCount(2).build()
                ))
                .build();
        staff = User.builder().id(staffId).build();
    }

    @Test
    void assignStaffToShift_Success() {
        when(shiftRepository.findByIdAndStoreId(shiftId, storeId)).thenReturn(Optional.of(shift));
        when(payrollPeriodRepository.existsByStoreIdAndStartDateLessThanEqualAndEndDateGreaterThanEqualAndStatusIn(any(), any(), any(), any())).thenReturn(false);
        when(userRepository.findById(staffId)).thenReturn(Optional.of(staff));
        
        when(employmentRepository.existsByUserIdAndStoreIdAndStatus(staffId, storeId, EmploymentStatus.ACTIVE)).thenReturn(true);
        when(shiftAssignmentRepository.existsByShiftIdAndStaffId(shiftId, staffId)).thenReturn(false);
        
        doNothing().when(shiftValidationService).validateNoOverlapAndWeeklyHours(shift, staffId, null);
        
        when(availabilityRepository.coversShiftTime(eq(staffId), anyShort(), any(), any())).thenReturn(true);
        when(blackoutDateRepository.existsByStaffIdAndDate(staffId, shift.getShiftDate())).thenReturn(false);
        
        when(shiftAssignmentRepository.countByShiftId(shiftId)).thenReturn(1L); // 1 assigned, 2 max

        ShiftAssignment savedAssignment = ShiftAssignment.builder()
                .id(UUID.randomUUID())
                .shift(shift)
                .staff(staff)
                .source(AssignmentSource.MANUAL)
                .build();
        when(shiftAssignmentRepository.save(any(ShiftAssignment.class))).thenReturn(savedAssignment);

        ShiftAssignmentResponseDTO result = service.assignStaffToShift(storeId, shiftId, staffId);
        
        assertNotNull(result);
        assertEquals(savedAssignment.getId(), result.getId());
        assertEquals(AssignmentSource.MANUAL, result.getSource());
    }

    @Test
    void assignStaffToShift_EmploymentInactive_ThrowsException() {
        when(shiftRepository.findByIdAndStoreId(shiftId, storeId)).thenReturn(Optional.of(shift));
        when(payrollPeriodRepository.existsByStoreIdAndStartDateLessThanEqualAndEndDateGreaterThanEqualAndStatusIn(any(), any(), any(), any())).thenReturn(false);
        when(userRepository.findById(staffId)).thenReturn(Optional.of(staff));
        
        when(employmentRepository.existsByUserIdAndStoreIdAndStatus(staffId, storeId, EmploymentStatus.ACTIVE)).thenReturn(false);

        BusinessException ex = assertThrows(BusinessException.class, () -> service.assignStaffToShift(storeId, shiftId, staffId));
        assertTrue(ex.getMessage().contains("Employment Inactive"));
    }
    
    @Test
    void assignStaffToShift_NotAvailable_ThrowsException() {
        when(shiftRepository.findByIdAndStoreId(shiftId, storeId)).thenReturn(Optional.of(shift));
        when(payrollPeriodRepository.existsByStoreIdAndStartDateLessThanEqualAndEndDateGreaterThanEqualAndStatusIn(any(), any(), any(), any())).thenReturn(false);
        when(userRepository.findById(staffId)).thenReturn(Optional.of(staff));
        
        when(employmentRepository.existsByUserIdAndStoreIdAndStatus(staffId, storeId, EmploymentStatus.ACTIVE)).thenReturn(true);
        when(shiftAssignmentRepository.existsByShiftIdAndStaffId(shiftId, staffId)).thenReturn(false);
        
        when(availabilityRepository.coversShiftTime(eq(staffId), anyShort(), any(), any())).thenReturn(false);

        BusinessException ex = assertThrows(BusinessException.class, () -> service.assignStaffToShift(storeId, shiftId, staffId));
        assertTrue(ex.getMessage().contains("outside registered availability"));
    }

    @Test
    void assignStaffToShift_BlackoutDate_ThrowsException() {
        // Fix for previously reported bug: Blackout Date should call blackoutDateRepository instead of wrong repo
        when(shiftRepository.findByIdAndStoreId(shiftId, storeId)).thenReturn(Optional.of(shift));
        when(payrollPeriodRepository.existsByStoreIdAndStartDateLessThanEqualAndEndDateGreaterThanEqualAndStatusIn(any(), any(), any(), any())).thenReturn(false);
        when(userRepository.findById(staffId)).thenReturn(Optional.of(staff));
        
        when(employmentRepository.existsByUserIdAndStoreIdAndStatus(staffId, storeId, EmploymentStatus.ACTIVE)).thenReturn(true);
        when(shiftAssignmentRepository.existsByShiftIdAndStaffId(shiftId, staffId)).thenReturn(false);
        when(availabilityRepository.coversShiftTime(eq(staffId), anyShort(), any(), any())).thenReturn(true);
        
        when(blackoutDateRepository.existsByStaffIdAndDate(staffId, shift.getShiftDate())).thenReturn(true);

        BusinessException ex = assertThrows(BusinessException.class, () -> service.assignStaffToShift(storeId, shiftId, staffId));
        assertTrue(ex.getMessage().contains("blackout date"));
        
        verify(blackoutDateRepository, times(1)).existsByStaffIdAndDate(staffId, shift.getShiftDate());
    }

    @Test
    void assignStaffToShift_SlotFull_ThrowsException() {
        when(shiftRepository.findByIdAndStoreId(shiftId, storeId)).thenReturn(Optional.of(shift));
        when(payrollPeriodRepository.existsByStoreIdAndStartDateLessThanEqualAndEndDateGreaterThanEqualAndStatusIn(any(), any(), any(), any())).thenReturn(false);
        when(userRepository.findById(staffId)).thenReturn(Optional.of(staff));
        
        when(employmentRepository.existsByUserIdAndStoreIdAndStatus(staffId, storeId, EmploymentStatus.ACTIVE)).thenReturn(true);
        when(shiftAssignmentRepository.existsByShiftIdAndStaffId(shiftId, staffId)).thenReturn(false);
        when(availabilityRepository.coversShiftTime(eq(staffId), anyShort(), any(), any())).thenReturn(true);
        when(blackoutDateRepository.existsByStaffIdAndDate(staffId, shift.getShiftDate())).thenReturn(false);
        
        when(shiftAssignmentRepository.countByShiftId(shiftId)).thenReturn(2L); // 2 assigned, 2 max -> FULL

        BusinessException ex = assertThrows(BusinessException.class, () -> service.assignStaffToShift(storeId, shiftId, staffId));
        assertTrue(ex.getMessage().contains("capacity reached"));
    }
}
