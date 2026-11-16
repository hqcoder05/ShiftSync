package com.shiftsync.shift.service;

import com.shiftsync.attendance.repository.AttendanceRepository;
import com.shiftsync.audit.service.AuditLogService;
import com.shiftsync.auth.entity.User;
import com.shiftsync.auth.repository.UserRepository;
import com.shiftsync.employment.enums.EmploymentStatus;
import com.shiftsync.employment.repository.EmploymentRepository;
import com.shiftsync.leave.entity.LeaveRequest;
import com.shiftsync.leave.enums.LeaveStatus;
import com.shiftsync.leave.repository.LeaveRequestRepository;
import com.shiftsync.notification.service.NotificationService;
import com.shiftsync.payroll.enums.PayrollPeriodStatus;
import com.shiftsync.payroll.repository.PayrollPeriodRepository;
import com.shiftsync.shared.exception.BusinessException;
import com.shiftsync.shared.security.SystemRole;
import com.shiftsync.shift.dto.ShiftSwapRequestDTO;
import com.shiftsync.shift.entity.Shift;
import com.shiftsync.shift.entity.ShiftAssignment;
import com.shiftsync.shift.entity.ShiftSwapRequest;
import com.shiftsync.shift.enums.AssignmentSource;
import com.shiftsync.shift.enums.ShiftStatus;
import com.shiftsync.shift.enums.SwapStatus;
import com.shiftsync.shift.repository.ShiftAssignmentRepository;
import com.shiftsync.shift.repository.ShiftSwapRequestRepository;
import com.shiftsync.store.entity.Store;
import com.shiftsync.store.repository.StoreRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ShiftSwapServiceTest {

    @Mock private ShiftSwapRequestRepository shiftSwapRequestRepository;
    @Mock private ShiftAssignmentRepository shiftAssignmentRepository;
    @Mock private UserRepository userRepository;
    @Mock private ShiftValidationService shiftValidationService;
    @Mock private AuditLogService auditLogService;
    @Mock private NotificationService notificationService;
    @Mock private EmploymentRepository employmentRepository;
    @Mock private AttendanceRepository attendanceRepository;
    @Mock private LeaveRequestRepository leaveRequestRepository;
    @Mock private ShiftAssignmentValidator assignmentValidator;
    @Mock private PayrollPeriodRepository payrollPeriods;
    @Mock private StoreRepository payrollStores;

    private ShiftSwapService shiftSwapService;

    private UUID storeId;
    private Store store;
    private UUID staffAId;
    private UUID staffBId;
    private User staffA;
    private User staffB;
    private Shift futureShiftA;
    private Shift futureShiftB;
    private ShiftAssignment assignmentA;
    private ShiftAssignment assignmentB;

    @BeforeEach
    void setUp() {
        shiftSwapService = new ShiftSwapService(
                auditLogService,
                shiftSwapRequestRepository,
                shiftAssignmentRepository,
                userRepository,
                shiftValidationService,
                notificationService,
                employmentRepository,
                attendanceRepository,
                leaveRequestRepository,
                assignmentValidator
        );
        ReflectionTestUtils.setField(shiftSwapService, "payrollPeriods", payrollPeriods);
        ReflectionTestUtils.setField(shiftSwapService, "payrollStores", payrollStores);

        storeId = UUID.randomUUID();
        store = Store.builder().id(storeId).name("Test Store").build();

        staffAId = UUID.randomUUID();
        staffBId = UUID.randomUUID();
        staffA = User.builder().id(staffAId).fullName("Staff A").systemRole(SystemRole.STAFF).build();
        staffB = User.builder().id(staffBId).fullName("Staff B").systemRole(SystemRole.STAFF).build();

        futureShiftA = Shift.builder()
                .id(UUID.randomUUID())
                .store(store)
                .shiftDate(LocalDate.now().plusDays(2))
                .startTime(LocalTime.of(8, 0))
                .endTime(LocalTime.of(12, 0))
                .status(ShiftStatus.PUBLISHED)
                .build();

        futureShiftB = Shift.builder()
                .id(UUID.randomUUID())
                .store(store)
                .shiftDate(LocalDate.now().plusDays(3))
                .startTime(LocalTime.of(13, 0))
                .endTime(LocalTime.of(17, 0))
                .status(ShiftStatus.PUBLISHED)
                .build();

        assignmentA = ShiftAssignment.builder()
                .id(UUID.randomUUID())
                .shift(futureShiftA)
                .staff(staffA)
                .source(AssignmentSource.MANUAL)
                .build();

        assignmentB = ShiftAssignment.builder()
                .id(UUID.randomUUID())
                .shift(futureShiftB)
                .staff(staffB)
                .source(AssignmentSource.MANUAL)
                .build();
    }

    @Test
    void managerApproveSwapRequest_NotPending_ThrowsException() {
        UUID requestId = UUID.randomUUID();
        ShiftSwapRequest req = new ShiftSwapRequest();
        req.setId(requestId);
        req.setStatus(SwapStatus.APPROVED);

        when(shiftSwapRequestRepository.findById(requestId)).thenReturn(Optional.of(req));

        assertThrows(BusinessException.class,
                () -> shiftSwapService.managerApproveSwapRequest(requestId, UUID.randomUUID()));
    }

    @Test
    void createSwapRequest_MultiSlotShift_AllowsDifferentStaffOnSameShift() {
        when(shiftAssignmentRepository.findByShiftIdAndStaffId(futureShiftA.getId(), staffAId))
                .thenReturn(Optional.of(assignmentA));
        when(shiftAssignmentRepository.findByShiftIdAndStaffId(futureShiftB.getId(), staffBId))
                .thenReturn(Optional.of(assignmentB));
        when(shiftSwapRequestRepository.findByStatusAndShiftAndStaff(SwapStatus.PENDING, futureShiftA.getId(), staffAId))
                .thenReturn(List.of());
        when(shiftSwapRequestRepository.findByStatusAndShiftAndStaff(SwapStatus.PENDING, futureShiftB.getId(), staffBId))
                .thenReturn(List.of());
        when(userRepository.findById(staffAId)).thenReturn(Optional.of(staffA));
        when(userRepository.findById(staffBId)).thenReturn(Optional.of(staffB));
        when(shiftSwapRequestRepository.save(any(ShiftSwapRequest.class)))
                .thenAnswer(inv -> {
                    ShiftSwapRequest r = inv.getArgument(0);
                    r.setId(UUID.randomUUID());
                    return r;
                });

        ShiftSwapRequest created = shiftSwapService.createSwapRequest(staffAId, futureShiftA.getId(), staffBId, futureShiftB.getId());

        assertNotNull(created.getId());
        assertEquals(SwapStatus.PENDING, created.getStatus());
        verify(shiftSwapRequestRepository).findByStatusAndShiftAndStaff(SwapStatus.PENDING, futureShiftA.getId(), staffAId);
        verify(shiftSwapRequestRepository).findByStatusAndShiftAndStaff(SwapStatus.PENDING, futureShiftB.getId(), staffBId);
    }

    @Test
    void createSwapRequest_CrossConflictActivePending_ThrowsConflict() {
        ShiftSwapRequest existing = ShiftSwapRequest.builder()
                .id(UUID.randomUUID())
                .fromShift(futureShiftB)
                .toShift(futureShiftA)
                .fromStaff(staffB)
                .toStaff(staffA)
                .status(SwapStatus.PENDING)
                .build();

        when(shiftAssignmentRepository.findByShiftIdAndStaffId(futureShiftA.getId(), staffAId))
                .thenReturn(Optional.of(assignmentA));
        when(shiftAssignmentRepository.findByShiftIdAndStaffId(futureShiftB.getId(), staffBId))
                .thenReturn(Optional.of(assignmentB));
        when(shiftSwapRequestRepository.findByStatusAndShiftAndStaff(SwapStatus.PENDING, futureShiftA.getId(), staffAId))
                .thenReturn(List.of(existing));

        BusinessException ex = assertThrows(BusinessException.class,
                () -> shiftSwapService.createSwapRequest(staffAId, futureShiftA.getId(), staffBId, futureShiftB.getId()));

        assertEquals(HttpStatus.CONFLICT, ex.getStatus());
        verify(shiftSwapRequestRepository, never()).save(any());
    }

    @Test
    void createSwapRequest_IgnoresAndExpiresStalePendingRequest() {
        Shift pastShift = Shift.builder()
                .id(UUID.randomUUID())
                .store(store)
                .shiftDate(LocalDate.now().minusDays(1))
                .startTime(LocalTime.of(8, 0))
                .status(ShiftStatus.PUBLISHED)
                .build();
        ShiftSwapRequest stale = ShiftSwapRequest.builder()
                .id(UUID.randomUUID())
                .fromShift(futureShiftA)
                .toShift(pastShift)
                .fromStaff(staffA)
                .toStaff(staffB)
                .status(SwapStatus.PENDING)
                .build();

        when(shiftAssignmentRepository.findByShiftIdAndStaffId(futureShiftA.getId(), staffAId))
                .thenReturn(Optional.of(assignmentA));
        when(shiftAssignmentRepository.findByShiftIdAndStaffId(futureShiftB.getId(), staffBId))
                .thenReturn(Optional.of(assignmentB));
        when(shiftSwapRequestRepository.findByStatusAndShiftAndStaff(SwapStatus.PENDING, futureShiftA.getId(), staffAId))
                .thenReturn(List.of(stale));
        when(shiftSwapRequestRepository.findByStatusAndShiftAndStaff(SwapStatus.PENDING, futureShiftB.getId(), staffBId))
                .thenReturn(List.of());
        when(userRepository.findById(staffAId)).thenReturn(Optional.of(staffA));
        when(userRepository.findById(staffBId)).thenReturn(Optional.of(staffB));
        when(shiftSwapRequestRepository.save(any(ShiftSwapRequest.class)))
                .thenAnswer(inv -> {
                    ShiftSwapRequest r = inv.getArgument(0);
                    if (r.getId() == null) r.setId(UUID.randomUUID());
                    return r;
                });

        ShiftSwapRequest created = shiftSwapService.createSwapRequest(staffAId, futureShiftA.getId(), staffBId, futureShiftB.getId());

        assertEquals(SwapStatus.EXPIRED, stale.getStatus());
        assertEquals(SwapStatus.PENDING, created.getStatus());
    }

    @Test
    void createSwapRequest_SkillMismatch_FailsEarly() {
        UUID requiredSkillId = UUID.randomUUID();
        assignmentA.setRequiredSkillId(requiredSkillId);

        when(shiftAssignmentRepository.findByShiftIdAndStaffId(futureShiftA.getId(), staffAId))
                .thenReturn(Optional.of(assignmentA));
        when(shiftAssignmentRepository.findByShiftIdAndStaffId(futureShiftB.getId(), staffBId))
                .thenReturn(Optional.of(assignmentB));
        when(shiftSwapRequestRepository.findByStatusAndShiftAndStaff(eq(SwapStatus.PENDING), any(), any()))
                .thenReturn(List.of());
        when(userRepository.findById(staffAId)).thenReturn(Optional.of(staffA));
        when(userRepository.findById(staffBId)).thenReturn(Optional.of(staffB));
        doThrow(new BusinessException("Nhân viên không có kỹ năng hợp lệ cho vị trí đổi ca", HttpStatus.CONFLICT))
                .when(assignmentValidator).validateSwapSkill(futureShiftA, staffBId, requiredSkillId);

        BusinessException ex = assertThrows(BusinessException.class,
                () -> shiftSwapService.createSwapRequest(staffAId, futureShiftA.getId(), staffBId, futureShiftB.getId()));

        assertEquals(HttpStatus.CONFLICT, ex.getStatus());
        verify(shiftSwapRequestRepository, never()).save(any());
    }

    @Test
    void createSwapRequest_ApprovedLeave_FailsEarly() {
        LeaveRequest approvedLeave = LeaveRequest.builder()
                .id(UUID.randomUUID())
                .status(LeaveStatus.APPROVED)
                .build();

        when(shiftAssignmentRepository.findByShiftIdAndStaffId(futureShiftA.getId(), staffAId))
                .thenReturn(Optional.of(assignmentA));
        when(shiftAssignmentRepository.findByShiftIdAndStaffId(futureShiftB.getId(), staffBId))
                .thenReturn(Optional.of(assignmentB));
        when(shiftSwapRequestRepository.findByStatusAndShiftAndStaff(eq(SwapStatus.PENDING), any(), any()))
                .thenReturn(List.of());
        when(userRepository.findById(staffAId)).thenReturn(Optional.of(staffA));
        when(userRepository.findById(staffBId)).thenReturn(Optional.of(staffB));
        when(leaveRequestRepository.findOverlappingRequests(eq(staffAId), any(), any()))
                .thenReturn(List.of(approvedLeave));

        BusinessException ex = assertThrows(BusinessException.class,
                () -> shiftSwapService.createSwapRequest(staffAId, futureShiftA.getId(), staffBId, futureShiftB.getId()));

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
        verify(shiftSwapRequestRepository, never()).save(any());
    }

    @Test
    void createSwapRequest_OverlapOrWeeklyLimit_FailsEarly() {
        when(shiftAssignmentRepository.findByShiftIdAndStaffId(futureShiftA.getId(), staffAId))
                .thenReturn(Optional.of(assignmentA));
        when(shiftAssignmentRepository.findByShiftIdAndStaffId(futureShiftB.getId(), staffBId))
                .thenReturn(Optional.of(assignmentB));
        when(shiftSwapRequestRepository.findByStatusAndShiftAndStaff(eq(SwapStatus.PENDING), any(), any()))
                .thenReturn(List.of());
        when(userRepository.findById(staffAId)).thenReturn(Optional.of(staffA));
        when(userRepository.findById(staffBId)).thenReturn(Optional.of(staffB));
        doThrow(new BusinessException("Ca làm việc bị trùng giờ", HttpStatus.CONFLICT))
                .when(shiftValidationService).validateNoOverlapAndWeeklyHours(futureShiftB, staffAId, futureShiftA.getId());

        BusinessException ex = assertThrows(BusinessException.class,
                () -> shiftSwapService.createSwapRequest(staffAId, futureShiftA.getId(), staffBId, futureShiftB.getId()));

        assertEquals(HttpStatus.CONFLICT, ex.getStatus());
        verify(shiftSwapRequestRepository, never()).save(any());
    }

    @Test
    void createSwapRequest_WorkforceSharingAssignment_ThrowsConflict() {
        assignmentA.setSource(AssignmentSource.WORKFORCE_SHARING);

        when(shiftAssignmentRepository.findByShiftIdAndStaffId(futureShiftA.getId(), staffAId))
                .thenReturn(Optional.of(assignmentA));

        BusinessException ex = assertThrows(BusinessException.class,
                () -> shiftSwapService.createSwapRequest(staffAId, futureShiftA.getId(), staffBId, futureShiftB.getId()));

        assertEquals(HttpStatus.CONFLICT, ex.getStatus());
    }

    @Test
    void createSwapRequest_OneWayGiveaway_NullToShift_Succeeds() {
        when(shiftAssignmentRepository.findByShiftIdAndStaffId(futureShiftA.getId(), staffAId))
                .thenReturn(Optional.of(assignmentA));
        when(employmentRepository.existsByUserIdAndStoreIdAndStatus(staffBId, storeId, EmploymentStatus.ACTIVE))
                .thenReturn(true);
        when(shiftSwapRequestRepository.findByStatusAndShiftAndStaff(SwapStatus.PENDING, futureShiftA.getId(), staffAId))
                .thenReturn(List.of());
        when(userRepository.findById(staffAId)).thenReturn(Optional.of(staffA));
        when(userRepository.findById(staffBId)).thenReturn(Optional.of(staffB));
        when(shiftSwapRequestRepository.save(any(ShiftSwapRequest.class)))
                .thenAnswer(inv -> {
                    ShiftSwapRequest r = inv.getArgument(0);
                    r.setId(UUID.randomUUID());
                    return r;
                });

        ShiftSwapRequest created = shiftSwapService.createSwapRequest(staffAId, futureShiftA.getId(), staffBId, null);

        assertNotNull(created.getId());
        assertNull(created.getToShift());
        assertEquals(SwapStatus.PENDING, created.getStatus());
        verify(shiftValidationService).validateNoOverlap(futureShiftA, staffBId, null);
        verify(shiftValidationService, never()).validateNoOverlapAndWeeklyHours(any(), any(), any());
        verify(assignmentValidator, never()).validateAvailabilityAndTimeOff(any(), any());
    }

    @Test
    void managerApproveSwapRequest_OneWayGiveaway_TransfersAssignment() {
        UUID requestId = UUID.randomUUID();
        UUID managerId = UUID.randomUUID();
        User manager = User.builder().id(managerId).systemRole(SystemRole.MANAGER).build();
        ShiftSwapRequest request = ShiftSwapRequest.builder()
                .id(requestId)
                .fromStaff(staffA)
                .toStaff(staffB)
                .fromShift(futureShiftA)
                .toShift(null)
                .status(SwapStatus.PENDING)
                .employeeAccepted(true)
                .build();

        when(shiftSwapRequestRepository.findById(requestId)).thenReturn(Optional.of(request));
        when(userRepository.findById(managerId)).thenReturn(Optional.of(manager));
        when(employmentRepository.existsByUserIdAndStoreIdAndStatus(any(), eq(storeId), eq(EmploymentStatus.ACTIVE)))
                .thenReturn(true);
        when(payrollStores.findByIdForUpdate(storeId)).thenReturn(Optional.of(store));
        when(shiftAssignmentRepository.findByShiftIdAndStaffId(futureShiftA.getId(), staffAId))
                .thenReturn(Optional.of(assignmentA));

        shiftSwapService.managerApproveSwapRequest(requestId, managerId);

        assertEquals(staffB, assignmentA.getStaff());
        assertEquals(AssignmentSource.SWAP, assignmentA.getSource());
        assertEquals(SwapStatus.APPROVED, request.getStatus());
        verify(shiftAssignmentRepository).save(assignmentA);
    }

    @Test
    void managerApproveSwapRequest_PayrollLocked_ThrowsConflict() {
        UUID requestId = UUID.randomUUID();
        UUID managerId = UUID.randomUUID();
        User manager = User.builder().id(managerId).systemRole(SystemRole.MANAGER).build();
        ShiftSwapRequest request = ShiftSwapRequest.builder()
                .id(requestId)
                .fromStaff(staffA)
                .toStaff(staffB)
                .fromShift(futureShiftA)
                .toShift(futureShiftB)
                .status(SwapStatus.PENDING)
                .employeeAccepted(true)
                .build();

        when(shiftSwapRequestRepository.findById(requestId)).thenReturn(Optional.of(request));
        when(userRepository.findById(managerId)).thenReturn(Optional.of(manager));
        when(employmentRepository.existsByUserIdAndStoreIdAndStatus(any(), eq(storeId), eq(EmploymentStatus.ACTIVE)))
                .thenReturn(true);
        when(payrollStores.findByIdForUpdate(storeId)).thenReturn(Optional.of(store));
        when(payrollPeriods.existsByStoreIdAndStartDateLessThanEqualAndEndDateGreaterThanEqualAndStatusIn(
                eq(storeId), any(), any(), eq(List.of(PayrollPeriodStatus.CONFIRMED, PayrollPeriodStatus.PAID))))
                .thenReturn(true);

        BusinessException ex = assertThrows(BusinessException.class,
                () -> shiftSwapService.managerApproveSwapRequest(requestId, managerId));

        assertEquals(HttpStatus.CONFLICT, ex.getStatus());
    }

    @Test
    void getMySwapRequests_MapsCreatedAtAndReadOnlyExpiry() {
        OffsetDateTime created = OffsetDateTime.now().minusHours(2);
        Shift pastShift = Shift.builder()
                .id(UUID.randomUUID())
                .store(store)
                .shiftDate(LocalDate.now().minusDays(1))
                .startTime(LocalTime.of(8, 0))
                .endTime(LocalTime.of(12, 0))
                .status(ShiftStatus.PUBLISHED)
                .build();
        ShiftSwapRequest stale = ShiftSwapRequest.builder()
                .id(UUID.randomUUID())
                .fromStaff(staffA)
                .toStaff(staffB)
                .fromShift(pastShift)
                .toShift(futureShiftB)
                .status(SwapStatus.PENDING)
                .createdAt(created)
                .build();

        when(shiftSwapRequestRepository.findByFromStaffIdOrToStaffId(staffAId, staffAId))
                .thenReturn(List.of(stale));

        List<ShiftSwapRequestDTO> result = shiftSwapService.getMySwapRequests(staffAId);

        assertEquals(1, result.size());
        assertEquals(SwapStatus.EXPIRED, result.getFirst().getStatus());
        assertEquals(created, result.getFirst().getCreatedAt());
        verify(shiftSwapRequestRepository, never()).save(any());
    }

    @Test
    void createMultiGiveawayRequests_UpToThreeSucceeds_FourthRejected() {
        UUID staffCId = UUID.randomUUID();
        UUID staffDId = UUID.randomUUID();
        UUID staffEId = UUID.randomUUID();
        User staffC = User.builder().id(staffCId).fullName("Staff C").systemRole(SystemRole.STAFF).build();
        User staffD = User.builder().id(staffDId).fullName("Staff D").systemRole(SystemRole.STAFF).build();

        when(shiftAssignmentRepository.findByShiftIdAndStaffId(futureShiftA.getId(), staffAId))
                .thenReturn(Optional.of(assignmentA));
        when(employmentRepository.existsByUserIdAndStoreIdAndStatus(any(), eq(storeId), eq(EmploymentStatus.ACTIVE)))
                .thenReturn(true);
        when(userRepository.findById(staffAId)).thenReturn(Optional.of(staffA));
        when(userRepository.findById(staffBId)).thenReturn(Optional.of(staffB));
        when(userRepository.findById(staffCId)).thenReturn(Optional.of(staffC));
        when(userRepository.findById(staffDId)).thenReturn(Optional.of(staffD));

        List<ShiftSwapRequest> activePool = new java.util.ArrayList<>();
        when(shiftSwapRequestRepository.findByStatusAndShiftAndStaff(SwapStatus.PENDING, futureShiftA.getId(), staffAId))
                .thenAnswer(inv -> List.copyOf(activePool));
        when(shiftSwapRequestRepository.save(any(ShiftSwapRequest.class)))
                .thenAnswer(inv -> {
                    ShiftSwapRequest r = inv.getArgument(0);
                    r.setId(UUID.randomUUID());
                    activePool.add(r);
                    return r;
                });

        List<ShiftSwapRequest> created = shiftSwapService.createMultiGiveawayRequests(
                staffAId, futureShiftA.getId(), List.of(staffBId, staffCId, staffDId));

        assertEquals(3, created.size());

        BusinessException fourthErr = assertThrows(BusinessException.class, () ->
                shiftSwapService.createSwapRequest(staffAId, futureShiftA.getId(), staffEId, null));
        assertTrue(fourthErr.getMessage().contains("3"));

        BusinessException batchErr = assertThrows(BusinessException.class, () ->
                shiftSwapService.createMultiGiveawayRequests(
                        staffAId, futureShiftA.getId(), List.of(staffBId, staffCId, staffDId, staffEId)));
        assertTrue(batchErr.getMessage().contains("3"));
    }

    @Test
    void managerApproveSwapRequest_OneWayGiveaway_CancelsSiblingPendingRequests() {
        UUID requestId = UUID.randomUUID();
        UUID siblingId = UUID.randomUUID();
        UUID managerId = UUID.randomUUID();
        UUID staffCId = UUID.randomUUID();
        User manager = User.builder().id(managerId).systemRole(SystemRole.MANAGER).build();
        User staffC = User.builder().id(staffCId).fullName("Staff C").systemRole(SystemRole.STAFF).build();

        ShiftSwapRequest chosen = ShiftSwapRequest.builder()
                .id(requestId).fromStaff(staffA).toStaff(staffB).fromShift(futureShiftA).toShift(null)
                .status(SwapStatus.PENDING).employeeAccepted(true).build();
        ShiftSwapRequest sibling = ShiftSwapRequest.builder()
                .id(siblingId).fromStaff(staffA).toStaff(staffC).fromShift(futureShiftA).toShift(null)
                .status(SwapStatus.PENDING).employeeAccepted(false).build();

        when(shiftSwapRequestRepository.findById(requestId)).thenReturn(Optional.of(chosen));
        when(userRepository.findById(managerId)).thenReturn(Optional.of(manager));
        when(employmentRepository.existsByUserIdAndStoreIdAndStatus(any(), eq(storeId), eq(EmploymentStatus.ACTIVE)))
                .thenReturn(true);
        when(payrollStores.findByIdForUpdate(storeId)).thenReturn(Optional.of(store));
        when(shiftAssignmentRepository.findByShiftIdAndStaffId(futureShiftA.getId(), staffAId))
                .thenReturn(Optional.of(assignmentA));
        when(shiftSwapRequestRepository.findByStatusAndShiftAndStaff(SwapStatus.PENDING, futureShiftA.getId(), staffAId))
                .thenReturn(List.of(chosen, sibling));

        shiftSwapService.managerApproveSwapRequest(requestId, managerId);

        assertEquals(SwapStatus.APPROVED, chosen.getStatus());
        assertEquals(SwapStatus.CANCELLED, sibling.getStatus());
        verify(shiftSwapRequestRepository).save(sibling);
    }

    @Test
    void toDTO_PopulatesFullFieldsIncludingCreatedAtAndDates() {
        OffsetDateTime created = OffsetDateTime.now();
        ShiftSwapRequest swap = ShiftSwapRequest.builder()
                .id(UUID.randomUUID())
                .fromStaff(staffA)
                .toStaff(staffB)
                .fromShift(futureShiftA)
                .toShift(futureShiftB)
                .status(SwapStatus.PENDING)
                .employeeAccepted(false)
                .createdAt(created)
                .build();

        ShiftSwapRequestDTO dto = shiftSwapService.toDTO(swap, staffAId);

        assertEquals(swap.getId(), dto.getId());
        assertEquals(created, dto.getCreatedAt());
        assertEquals(futureShiftA.getShiftDate(), dto.getFromShiftDate());
        assertEquals(futureShiftB.getShiftDate(), dto.getToShiftDate());
        assertEquals("Staff A", dto.getFromStaffName());
        assertEquals("Staff B", dto.getToStaffName());
    }
}
