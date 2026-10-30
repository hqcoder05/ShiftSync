package com.shiftsync.shift.service;

import com.shiftsync.auth.entity.User;
import com.shiftsync.availability.entity.Availability;
import com.shiftsync.availability.entity.BlackoutDate;
import com.shiftsync.availability.repository.*;
import com.shiftsync.employment.entity.*;
import com.shiftsync.employment.enums.EmploymentStatus;
import com.shiftsync.employment.repository.EmploymentRepository;
import com.shiftsync.leave.entity.LeaveRequest;
import com.shiftsync.leave.enums.LeaveStatus;
import com.shiftsync.leave.repository.LeaveRequestRepository;
import com.shiftsync.shared.exception.BusinessException;
import com.shiftsync.shared.security.SystemRole;
import com.shiftsync.shift.dto.AutoScheduleRequest;
import com.shiftsync.shift.entity.Shift;
import com.shiftsync.shift.enums.ShiftStatus;
import com.shiftsync.shift.repository.*;
import com.shiftsync.skill.repository.*;
import com.shiftsync.store.entity.Store;
import com.shiftsync.store.repository.*;
import org.junit.jupiter.api.Test;
import java.time.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class OvernightSchedulingRegressionTest {
    private final UUID storeId = UUID.randomUUID(), staffId = UUID.randomUUID();
    private final LocalDate sunday = LocalDate.of(2026, 11, 1), monday = sunday.plusDays(1);
    private final ShiftRepository shifts = mock(ShiftRepository.class);
    private final ShiftAssignmentRepository assignments = mock(ShiftAssignmentRepository.class);
    private final EmploymentRepository employments = mock(EmploymentRepository.class);
    private final AvailabilityRepository availability = mock(AvailabilityRepository.class);
    private final BlackoutDateRepository blackouts = mock(BlackoutDateRepository.class);
    private final LeaveRequestRepository leaves = mock(LeaveRequestRepository.class);
    private final StaffSkillRepository skills = mock(StaffSkillRepository.class);

    private Shift night(LocalTime end) {
        return Shift.builder().id(UUID.randomUUID()).store(Store.builder().id(storeId).build())
                .shiftDate(sunday).startTime(LocalTime.of(22, 0)).endTime(end)
                .status(ShiftStatus.DRAFT).requirements(List.of()).build();
    }
    private LeaveRequest leave(LocalDate date, LeaveStatus status) {
        return LeaveRequest.builder().staff(User.builder().id(staffId).build())
                .store(Store.builder().id(UUID.randomUUID()).build()) // another store
                .status(status).startDate(date).endDate(date).build();
    }
    private AutoScheduleService scheduler(Shift shift) {
        User staff = User.builder().id(staffId).systemRole(SystemRole.STAFF).build();
        when(shifts.findByStoreIdAndShiftDateBetween(storeId, sunday, sunday)).thenReturn(List.of(shift));
        when(employments.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE)).thenReturn(List.of(
                Employment.builder().user(staff).contractType(ContractType.builder().maxWeeklyHours(48).build()).build()));
        when(availability.findByUser_IdIn(anyList())).thenReturn(List.of(Availability.builder()
                .user(staff).dayOfWeek((short)0).startTime(LocalTime.of(22, 0)).endTime(shift.getEndTime()).build()));
        return new AutoScheduleService(shifts, assignments, employments, skills, availability, blackouts,
                mock(StoreConfigurationRepository.class), mock(SchedulerConfigurationRepository.class), null, null, null, leaves);
    }
    private AutoScheduleRequest request() {
        var request = new AutoScheduleRequest(); request.setStartDate(sunday); request.setEndDate(sunday); return request;
    }
    @Test void schedulerLoadsLeaveOnFollowingDayEvenWhenRequestEndsSundayAndLeaveBelongsToAnotherStore() {
        var scheduler = scheduler(night(LocalTime.of(6, 0)));
        when(leaves.findByStaffIdsAndStatusInPeriod(List.of(staffId), LeaveStatus.APPROVED, sunday, monday))
                .thenReturn(List.of(leave(monday, LeaveStatus.APPROVED)));
        var result = scheduler.autoSchedule(storeId, request());
        assertEquals(0, result.getNewAssignmentsCreated());
        assertEquals(1, result.getShortageSlots());
        verify(leaves).findByStaffIdsAndStatusInPeriod(List.of(staffId), LeaveStatus.APPROVED, sunday, monday);
        verify(assignments, never()).saveAll(any());
    }
    @Test void schedulerLoadsBlackoutOnFollowingDayBeyondRequestWindow() {
        var scheduler = scheduler(night(LocalTime.of(6, 0)));
        when(blackouts.findByStaffIdInAndDateBetween(List.of(staffId), sunday, monday))
                .thenReturn(List.of(BlackoutDate.builder().staffId(staffId).date(monday).build()));
        var result = scheduler.autoSchedule(storeId, request());
        assertEquals(0, result.getNewAssignmentsCreated());
        assertEquals(1, result.getShortageSlots());
        verify(blackouts).findByStaffIdInAndDateBetween(List.of(staffId), sunday, monday);
    }
    @Test void schedulerCanAssignOvernightWhenNeitherDateIsBlocked() {
        var result = scheduler(night(LocalTime.of(6, 0))).autoSchedule(storeId, request());
        assertEquals(1, result.getNewAssignmentsCreated());
        verify(assignments).saveAll(anyList());
    }
    private ShiftAssignmentValidator validator() {
        when(availability.findByUserId(staffId)).thenReturn(List.of(Availability.builder()
                .dayOfWeek((short)0).startTime(LocalTime.of(22,0)).endTime(LocalTime.of(6,0)).build()));
        return new ShiftAssignmentValidator(availability, blackouts, assignments, skills,
                mock(SkillRepository.class), mock(ShiftValidationService.class), leaves);
    }
    @Test void manualAndEligiblePathsRejectApprovedLeaveOnEndDateEvenWithAvailabilityOverride() {
        var validator = validator(); var shift = night(LocalTime.of(6, 0));
        when(leaves.findOverlappingRequests(staffId, sunday, monday)).thenReturn(List.of(leave(monday, LeaveStatus.APPROVED)));
        assertFalse(validator.isEligible(shift, staffId));
        assertThrows(BusinessException.class, () -> validator.validateEligibility(shift, staffId));
        assertThrows(BusinessException.class, () -> validator.validateEligibility(shift, staffId, true));
    }
    @Test void manualAndEligiblePathsRejectBlackoutOnEndDate() {
        var validator = validator(); var shift = night(LocalTime.of(6, 0));
        when(blackouts.existsByStaffIdAndDate(staffId, monday)).thenReturn(true);
        assertFalse(validator.isEligible(shift, staffId));
        assertThrows(BusinessException.class, () -> validator.validateEligibility(shift, staffId));
    }
    @Test void midnightEndDoesNotBlockForFollowingDayLeaveOrBlackout() {
        var validator = validator(); var shift = night(LocalTime.MIDNIGHT);
        assertTrue(validator.isEligible(shift, staffId));
        assertDoesNotThrow(() -> validator.validateEligibility(shift, staffId));
        verify(leaves, never()).findOverlappingRequests(staffId, sunday, monday);
        verify(blackouts, never()).existsByStaffIdAndDate(staffId, monday);
    }
    @Test void pendingLeaveDoesNotBlockOvernightAssignment() {
        var validator = validator(); var shift = night(LocalTime.of(6, 0));
        when(leaves.findOverlappingRequests(staffId, sunday, monday)).thenReturn(List.of(leave(monday, LeaveStatus.PENDING)));
        assertTrue(validator.isEligible(shift, staffId));
        assertDoesNotThrow(() -> validator.validateEligibility(shift, staffId));
    }
}
