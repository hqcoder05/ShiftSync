package com.shiftsync.shift.service;

import com.shiftsync.attendance.entity.Attendance;
import com.shiftsync.attendance.repository.AttendanceRepository;
import com.shiftsync.attendance.service.AttendanceService;
import com.shiftsync.audit.service.AuditLogService;
import com.shiftsync.auth.entity.User;
import com.shiftsync.auth.repository.UserRepository;
import com.shiftsync.availability.repository.AvailabilityRepository;
import com.shiftsync.availability.repository.BlackoutDateRepository;
import com.shiftsync.employment.enums.EmploymentStatus;
import com.shiftsync.employment.repository.EmploymentRepository;
import com.shiftsync.leave.entity.LeaveRequest;
import com.shiftsync.leave.enums.LeaveStatus;
import com.shiftsync.leave.repository.LeaveRequestRepository;
import com.shiftsync.marketplace.service.MarketplaceService;
import com.shiftsync.notification.service.NotificationService;
import com.shiftsync.payroll.repository.PayrollPeriodRepository;
import com.shiftsync.shared.exception.BusinessException;
import com.shiftsync.shared.security.JwtTokenProvider;
import com.shiftsync.shared.security.SystemRole;
import com.shiftsync.shift.dto.ShiftCreateRequest;
import com.shiftsync.shift.entity.Shift;
import com.shiftsync.shift.entity.ShiftAssignment;
import com.shiftsync.shift.entity.ShiftSwapRequest;
import com.shiftsync.shift.enums.ShiftStatus;
import com.shiftsync.shift.enums.SwapStatus;
import com.shiftsync.shift.repository.ShiftAssignmentRepository;
import com.shiftsync.shift.repository.ShiftRepository;
import com.shiftsync.shift.repository.ShiftSwapRequestRepository;
import com.shiftsync.shift.repository.ShiftTemplateRepository;
import com.shiftsync.skill.repository.SkillRepository;
import com.shiftsync.skill.repository.StaffSkillRepository;
import com.shiftsync.store.entity.Store;
import com.shiftsync.store.entity.StoreConfiguration;
import com.shiftsync.store.repository.StoreConfigurationRepository;
import com.shiftsync.store.repository.StoreRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.redisson.api.RLock;
import org.redisson.api.RedissonClient;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.TransactionStatus;
import org.springframework.transaction.support.TransactionCallback;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Consumer;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class ShiftScheduleExceptionAuditTest {

    @Mock private AuditLogService auditLogService;
    @Mock private ShiftRepository shiftRepository;
    @Mock private StoreRepository storeRepository;
    @Mock private StoreConfigurationRepository storeConfigRepository;
    @Mock private ShiftTemplateRepository shiftTemplateRepository;
    @Mock private SkillRepository skillRepository;
    @Mock private ShiftAssignmentRepository shiftAssignmentRepository;
    @Mock private UserRepository userRepository;
    @Mock private PayrollPeriodRepository payrollPeriodRepository;
    @Mock private NotificationService notificationService;
    @Mock private com.shiftsync.layout.repository.StoreZoneRepository storeZoneRepository;
    @Mock private StaffSkillRepository staffSkillRepository;
    @Mock private EmploymentRepository employmentRepository;
    @Mock private ShiftAssignmentValidator shiftAssignmentValidator;
    @Mock private ShiftValidationService shiftValidationService;
    @Mock private AttendanceRepository attendanceRepository;
    @Mock private LeaveRequestRepository leaveRequestRepository;
    @Mock private ShiftSwapRequestRepository shiftSwapRequestRepository;
    @Mock private JwtTokenProvider jwtTokenProvider;
    @Mock private com.shiftsync.shared.websocket.RealtimeEventPublisher realtimeEventPublisher;
    @Mock private RedissonClient redissonClient;
    @Mock private TransactionTemplate transactionTemplate;
    @Mock private com.shiftsync.payroll.service.PayrollCalculationService payrollCalculationService;

    private ShiftService shiftService;
    private ShiftAssignmentService shiftAssignmentService;
    private ShiftSwapService shiftSwapService;
    private AttendanceService attendanceService;
    private MarketplaceService marketplaceService;

    private UUID storeId;
    private UUID storeBId;
    private UUID managerId;
    private UUID staffAId;
    private UUID staffBId;
    private Store store;
    private Store storeB;
    private User manager;
    private User staffA;
    private User staffB;

    @BeforeEach
    void setUp() {
        storeId = UUID.randomUUID();
        storeBId = UUID.randomUUID();
        managerId = UUID.randomUUID();
        staffAId = UUID.randomUUID();
        staffBId = UUID.randomUUID();

        store = Store.builder().id(storeId).openTime(LocalTime.of(7, 0)).closeTime(LocalTime.of(22, 0)).build();
        storeB = Store.builder().id(storeBId).openTime(LocalTime.of(7, 0)).closeTime(LocalTime.of(22, 0)).build();

        manager = User.builder().id(managerId).fullName("Store Manager").systemRole(SystemRole.MANAGER).build();
        staffA = User.builder().id(staffAId).fullName("Staff Alice").systemRole(SystemRole.STAFF).build();
        staffB = User.builder().id(staffBId).fullName("Staff Bob").systemRole(SystemRole.STAFF).build();

        shiftAssignmentService = new ShiftAssignmentService(
                shiftRepository, shiftAssignmentRepository, employmentRepository, userRepository,
                payrollPeriodRepository, notificationService, shiftAssignmentValidator,
                staffSkillRepository, storeZoneRepository, skillRepository, attendanceRepository
        );

        shiftService = new ShiftService(
                auditLogService, shiftRepository, storeRepository, storeConfigRepository,
                shiftTemplateRepository, skillRepository, shiftAssignmentRepository, userRepository,
                payrollPeriodRepository, notificationService, storeZoneRepository, staffSkillRepository,
                employmentRepository, shiftAssignmentValidator, shiftAssignmentService, attendanceRepository
        );

        shiftSwapService = new ShiftSwapService(
                auditLogService, shiftSwapRequestRepository, shiftAssignmentRepository, userRepository,
                shiftValidationService, notificationService, employmentRepository, attendanceRepository, leaveRequestRepository
        );

        attendanceService = new AttendanceService(
                attendanceRepository, shiftAssignmentRepository, shiftRepository,
                storeConfigRepository, jwtTokenProvider, realtimeEventPublisher, payrollCalculationService
        );

        marketplaceService = new MarketplaceService(
                shiftRepository, shiftAssignmentRepository, redissonClient,
                shiftValidationService, shiftAssignmentValidator, userRepository,
                employmentRepository, staffSkillRepository, notificationService, transactionTemplate
        );
    }

    @Nested
    @DisplayName("1. Shift CRUD & Collision Exceptions")
    class ShiftCrudExceptions {

        @Test
        @DisplayName("createShift: Fails with 409 CONFLICT if duplicate shift exists at same store, date and time")
        void createShift_DuplicateIdentity_ThrowsConflict() {
            LocalDate date = LocalDate.now().plusDays(1);
            LocalTime start = LocalTime.of(8, 0);
            LocalTime end = LocalTime.of(16, 0);

            ShiftCreateRequest request = new ShiftCreateRequest();
            request.setShiftDate(date);
            request.setStartTime(start);
            request.setEndTime(end);

            when(payrollPeriodRepository.existsByStoreIdAndStartDateLessThanEqualAndEndDateGreaterThanEqualAndStatusIn(any(), any(), any(), any())).thenReturn(false);
            when(storeRepository.findById(storeId)).thenReturn(Optional.of(store));
            when(shiftRepository.findByStoreIdAndShiftDateAndStartTimeAndEndTime(storeId, date, start, end))
                    .thenReturn(Optional.of(Shift.builder().id(UUID.randomUUID()).build()));

            BusinessException ex = assertThrows(BusinessException.class, () -> shiftService.createShift(storeId, request));
            assertEquals(HttpStatus.CONFLICT, ex.getStatus());
            assertTrue(ex.getMessage().contains("identical date and time already exists"));
        }

        @Test
        @DisplayName("updateShift: Cannot modify COMPLETED or CANCELLED shifts")
        void updateShift_CompletedOrCancelled_ThrowsBadRequest() {
            UUID shiftId = UUID.randomUUID();
            Shift completedShift = Shift.builder().id(shiftId).store(store).status(ShiftStatus.COMPLETED).build();

            when(shiftRepository.findByIdAndStoreId(shiftId, storeId)).thenReturn(Optional.of(completedShift));

            ShiftCreateRequest req = new ShiftCreateRequest();
            req.setNote("New note");

            BusinessException ex = assertThrows(BusinessException.class, () -> shiftService.updateShift(storeId, shiftId, req));
            assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
            assertTrue(ex.getMessage().contains("Cannot modify a COMPLETED shift"));
        }

        @Test
        @DisplayName("updateShift: Fails with 409 CONFLICT if moving shift to date/time colliding with another existing shift")
        void updateShift_CollisionWithAnotherShift_ThrowsConflict() {
            UUID shiftId = UUID.randomUUID();
            UUID otherShiftId = UUID.randomUUID();
            LocalDate oldDate = LocalDate.now().plusDays(1);
            LocalDate newDate = LocalDate.now().plusDays(2);
            LocalTime start = LocalTime.of(8, 0);
            LocalTime end = LocalTime.of(16, 0);

            Shift shift = Shift.builder().id(shiftId).store(store).shiftDate(oldDate).startTime(start).endTime(end).status(ShiftStatus.DRAFT).build();
            Shift collisionShift = Shift.builder().id(otherShiftId).store(store).shiftDate(newDate).startTime(start).endTime(end).build();

            when(shiftRepository.findByIdAndStoreId(shiftId, storeId)).thenReturn(Optional.of(shift));
            when(shiftRepository.findByStoreIdAndShiftDateAndStartTimeAndEndTime(storeId, newDate, start, end))
                    .thenReturn(Optional.of(collisionShift));

            ShiftCreateRequest req = new ShiftCreateRequest();
            req.setShiftDate(newDate);

            BusinessException ex = assertThrows(BusinessException.class, () -> shiftService.updateShift(storeId, shiftId, req));
            assertEquals(HttpStatus.CONFLICT, ex.getStatus());
            assertTrue(ex.getMessage().contains("identical date and time already exists"));
        }

        @Test
        @DisplayName("updateShift: Cannot modify date or time if shift already has attendance recorded")
        void updateShift_HasAttendance_ThrowsBadRequest() {
            UUID shiftId = UUID.randomUUID();
            LocalDate oldDate = LocalDate.now();
            LocalTime start = LocalTime.of(8, 0);
            LocalTime end = LocalTime.of(16, 0);

            Shift shift = Shift.builder().id(shiftId).store(store).shiftDate(oldDate).startTime(start).endTime(end).status(ShiftStatus.PUBLISHED).build();

            when(shiftRepository.findByIdAndStoreId(shiftId, storeId)).thenReturn(Optional.of(shift));
            when(shiftRepository.findByStoreIdAndShiftDateAndStartTimeAndEndTime(any(), any(), any(), any())).thenReturn(Optional.empty());
            when(attendanceRepository.existsByShiftAssignment_Shift_Id(shiftId)).thenReturn(true);

            ShiftCreateRequest req = new ShiftCreateRequest();
            req.setStartTime(LocalTime.of(9, 0));
            req.setEndTime(LocalTime.of(17, 0));

            BusinessException ex = assertThrows(BusinessException.class, () -> shiftService.updateShift(storeId, shiftId, req));
            assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
            assertTrue(ex.getMessage().contains("existing attendance records"));
        }

        @Test
        @DisplayName("deleteShift: Cannot delete a COMPLETED shift")
        void deleteShift_Completed_ThrowsBadRequest() {
            UUID shiftId = UUID.randomUUID();
            Shift shift = Shift.builder().id(shiftId).store(store).status(ShiftStatus.COMPLETED).build();

            when(shiftRepository.findByIdAndStoreId(shiftId, storeId)).thenReturn(Optional.of(shift));

            BusinessException ex = assertThrows(BusinessException.class, () -> shiftService.deleteShift(storeId, shiftId));
            assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
            assertTrue(ex.getMessage().contains("Cannot delete a completed shift"));
        }

        @Test
        @DisplayName("deleteShift: Cannot delete a shift that already has attendance records")
        void deleteShift_HasAttendance_ThrowsBadRequest() {
            UUID shiftId = UUID.randomUUID();
            Shift shift = Shift.builder().id(shiftId).store(store).status(ShiftStatus.PUBLISHED).build();

            when(shiftRepository.findByIdAndStoreId(shiftId, storeId)).thenReturn(Optional.of(shift));
            when(attendanceRepository.existsByShiftAssignment_Shift_Id(shiftId)).thenReturn(true);

            BusinessException ex = assertThrows(BusinessException.class, () -> shiftService.deleteShift(storeId, shiftId));
            assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
            assertTrue(ex.getMessage().contains("existing attendance records"));
        }
    }

    @Nested
    @DisplayName("2. Shift Assignment & Role Isolation Exceptions")
    class AssignmentExceptions {

        @Test
        @DisplayName("assignStaffToShift: Cannot assign staff to COMPLETED or CANCELLED shift")
        void assignStaff_CompletedShift_ThrowsBadRequest() {
            UUID shiftId = UUID.randomUUID();
            Shift shift = Shift.builder().id(shiftId).store(store).shiftDate(LocalDate.now()).status(ShiftStatus.COMPLETED).build();

            when(shiftRepository.findByIdAndStoreId(shiftId, storeId)).thenReturn(Optional.of(shift));
            when(payrollPeriodRepository.existsByStoreIdAndStartDateLessThanEqualAndEndDateGreaterThanEqualAndStatusIn(any(), any(), any(), any())).thenReturn(false);

            BusinessException ex = assertThrows(BusinessException.class, () -> shiftAssignmentService.assignStaffToShift(storeId, shiftId, staffAId));
            assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
            assertTrue(ex.getMessage().contains("Cannot assign staff to a COMPLETED shift"));
        }

        @Test
        @DisplayName("assignStaffToShift: Cannot assign user with non-STAFF role (e.g. MANAGER)")
        void assignStaff_NonStaffRole_ThrowsBadRequest() {
            UUID shiftId = UUID.randomUUID();
            Shift shift = Shift.builder().id(shiftId).store(store).shiftDate(LocalDate.now()).status(ShiftStatus.PUBLISHED).build();

            when(shiftRepository.findByIdAndStoreId(shiftId, storeId)).thenReturn(Optional.of(shift));
            when(payrollPeriodRepository.existsByStoreIdAndStartDateLessThanEqualAndEndDateGreaterThanEqualAndStatusIn(any(), any(), any(), any())).thenReturn(false);
            when(userRepository.findById(managerId)).thenReturn(Optional.of(manager));

            BusinessException ex = assertThrows(BusinessException.class, () -> shiftAssignmentService.assignStaffToShift(storeId, shiftId, managerId));
            assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
            assertTrue(ex.getMessage().contains("Only users with role STAFF can be assigned"));
        }

        @Test
        @DisplayName("unassignStaffFromShift: Cannot unassign from COMPLETED shift")
        void unassignStaff_CompletedShift_ThrowsBadRequest() {
            UUID shiftId = UUID.randomUUID();
            Shift shift = Shift.builder().id(shiftId).store(store).shiftDate(LocalDate.now()).status(ShiftStatus.COMPLETED).build();

            when(shiftRepository.findByIdAndStoreId(shiftId, storeId)).thenReturn(Optional.of(shift));
            when(payrollPeriodRepository.existsByStoreIdAndStartDateLessThanEqualAndEndDateGreaterThanEqualAndStatusIn(any(), any(), any(), any())).thenReturn(false);

            BusinessException ex = assertThrows(BusinessException.class, () -> shiftAssignmentService.unassignStaffFromShift(storeId, shiftId, staffAId));
            assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
            assertTrue(ex.getMessage().contains("Cannot unassign staff from a completed shift"));
        }

        @Test
        @DisplayName("unassignStaffFromShift: Cannot unassign when attendance already recorded")
        void unassignStaff_HasAttendance_ThrowsBadRequest() {
            UUID shiftId = UUID.randomUUID();
            Shift shift = Shift.builder().id(shiftId).store(store).shiftDate(LocalDate.now()).status(ShiftStatus.PUBLISHED).build();
            ShiftAssignment sa = ShiftAssignment.builder().id(UUID.randomUUID()).shift(shift).staff(staffA).build();

            when(shiftRepository.findByIdAndStoreId(shiftId, storeId)).thenReturn(Optional.of(shift));
            when(payrollPeriodRepository.existsByStoreIdAndStartDateLessThanEqualAndEndDateGreaterThanEqualAndStatusIn(any(), any(), any(), any())).thenReturn(false);
            when(shiftAssignmentRepository.findByShiftId(shiftId)).thenReturn(List.of(sa));
            when(attendanceRepository.existsByShiftAssignmentId(sa.getId())).thenReturn(true);

            BusinessException ex = assertThrows(BusinessException.class, () -> shiftAssignmentService.unassignStaffFromShift(storeId, shiftId, staffAId));
            assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
            assertTrue(ex.getMessage().contains("existing attendance records"));
        }
    }

    @Nested
    @DisplayName("3. Shift Swap Exceptions & Manager Verification")
    class ShiftSwapExceptions {

        @Test
        @DisplayName("managerApproveSwapRequest: Fails if employee has NOT accepted yet")
        void managerApprove_NotAccepted_ThrowsBadRequest() {
            UUID requestId = UUID.randomUUID();
            ShiftSwapRequest req = ShiftSwapRequest.builder()
                    .id(requestId)
                    .status(SwapStatus.PENDING)
                    .employeeAccepted(false)
                    .build();

            when(shiftSwapRequestRepository.findById(requestId)).thenReturn(Optional.of(req));

            BusinessException ex = assertThrows(BusinessException.class, () -> shiftSwapService.managerApproveSwapRequest(requestId, managerId));
            assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
            assertEquals("Employee has not accepted this swap yet", ex.getMessage());
        }

        @Test
        @DisplayName("managerRejectSwapRequest: Manager CAN reject even if employee has not accepted yet (Does NOT throw)")
        void managerReject_NotAccepted_SucceedsWithoutEmployeeAcceptedCheck() {
            UUID requestId = UUID.randomUUID();
            Shift shiftA = Shift.builder().id(UUID.randomUUID()).store(store).status(ShiftStatus.PUBLISHED).build();
            ShiftSwapRequest req = ShiftSwapRequest.builder()
                    .id(requestId)
                    .status(SwapStatus.PENDING)
                    .fromShift(shiftA)
                    .fromStaff(staffA)
                    .toStaff(staffB)
                    .employeeAccepted(false)
                    .build();

            when(shiftSwapRequestRepository.findById(requestId)).thenReturn(Optional.of(req));
            when(userRepository.findById(managerId)).thenReturn(Optional.of(manager));
            when(employmentRepository.existsByUserIdAndStoreIdAndStatus(managerId, storeId, EmploymentStatus.ACTIVE)).thenReturn(true);

            assertDoesNotThrow(() -> shiftSwapService.managerRejectSwapRequest(requestId, managerId));
            assertEquals(SwapStatus.REJECTED, req.getStatus());
            verify(shiftSwapRequestRepository).save(req);
        }

        @Test
        @DisplayName("managerApproveSwapRequest: Cross-store manager cannot approve swap in another store (403 FORBIDDEN)")
        void managerApprove_ForeignStoreManager_ThrowsForbidden() {
            UUID requestId = UUID.randomUUID();
            Shift shiftA = Shift.builder().id(UUID.randomUUID()).store(store).status(ShiftStatus.PUBLISHED).build();
            ShiftSwapRequest req = ShiftSwapRequest.builder()
                    .id(requestId)
                    .status(SwapStatus.PENDING)
                    .fromShift(shiftA)
                    .fromStaff(staffA)
                    .toStaff(staffB)
                    .employeeAccepted(true)
                    .build();

            when(shiftSwapRequestRepository.findById(requestId)).thenReturn(Optional.of(req));
            when(userRepository.findById(managerId)).thenReturn(Optional.of(manager));
            when(employmentRepository.existsByUserIdAndStoreIdAndStatus(managerId, storeId, EmploymentStatus.ACTIVE)).thenReturn(false);

            BusinessException ex = assertThrows(BusinessException.class, () -> shiftSwapService.managerApproveSwapRequest(requestId, managerId));
            assertEquals(HttpStatus.FORBIDDEN, ex.getStatus());
            assertTrue(ex.getMessage().contains("Manager does not belong to this store"));
        }

        @Test
        @DisplayName("managerApproveSwapRequest: Fails if employee has approved leave on swapped date")
        void managerApprove_StaffOnApprovedLeave_ThrowsBadRequest() {
            UUID requestId = UUID.randomUUID();
            LocalDate dateA = LocalDate.now().plusDays(2);
            LocalDate dateB = LocalDate.now().plusDays(3);
            Shift shiftA = Shift.builder().id(UUID.randomUUID()).store(store).shiftDate(dateA).startTime(java.time.LocalTime.of(8,0)).status(ShiftStatus.PUBLISHED).build();
            Shift shiftB = Shift.builder().id(UUID.randomUUID()).store(store).shiftDate(dateB).startTime(java.time.LocalTime.of(8,0)).status(ShiftStatus.PUBLISHED).build();

            ShiftSwapRequest req = ShiftSwapRequest.builder()
                    .id(requestId)
                    .status(SwapStatus.PENDING)
                    .fromShift(shiftA)
                    .fromStaff(staffA)
                    .toShift(shiftB)
                    .toStaff(staffB)
                    .employeeAccepted(true)
                    .build();

            when(shiftSwapRequestRepository.findById(requestId)).thenReturn(Optional.of(req));
            when(userRepository.findById(managerId)).thenReturn(Optional.of(manager));
            when(employmentRepository.existsByUserIdAndStoreIdAndStatus(managerId, storeId, EmploymentStatus.ACTIVE)).thenReturn(true);
            when(leaveRequestRepository.findOverlappingRequests(staffAId, dateB, dateB))
                    .thenReturn(List.of(LeaveRequest.builder().status(LeaveStatus.APPROVED).build()));

            BusinessException ex = assertThrows(BusinessException.class, () -> shiftSwapService.managerApproveSwapRequest(requestId, managerId));
            assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
            assertTrue(ex.getMessage().contains("has approved leave on target shift date"));
        }
    }

    @Nested
    @DisplayName("4. Attendance QR & Live Check-In Exceptions")
    class AttendanceExceptions {

        @Test
        @DisplayName("generateQrForShift: Throws 404 NOT_FOUND if shift does not exist")
        void generateQr_ShiftNotFound_ThrowsNotFound() {
            UUID shiftId = UUID.randomUUID();
            when(shiftRepository.findById(shiftId)).thenReturn(Optional.empty());

            BusinessException ex = assertThrows(BusinessException.class, () -> attendanceService.generateQrForShift(storeId, shiftId));
            assertEquals(HttpStatus.NOT_FOUND, ex.getStatus());
            assertEquals("Shift not found", ex.getMessage());
        }

        @Test
        @DisplayName("generateQrForShift: Throws 403 FORBIDDEN if shift belongs to a different store")
        void generateQr_StoreMismatch_ThrowsForbidden() {
            UUID shiftId = UUID.randomUUID();
            Shift shift = Shift.builder().id(shiftId).store(storeB).build();
            when(shiftRepository.findById(shiftId)).thenReturn(Optional.of(shift));

            BusinessException ex = assertThrows(BusinessException.class, () -> attendanceService.generateQrForShift(storeId, shiftId));
            assertEquals(HttpStatus.FORBIDDEN, ex.getStatus());
            assertTrue(ex.getMessage().contains("Shift does not belong to the specified store"));
        }

        @Test
        @DisplayName("submitSelfie: Cannot check-in to a CANCELLED shift")
        void submitSelfie_CancelledShift_ThrowsBadRequest() {
            UUID shiftId = UUID.randomUUID();
            Shift shift = Shift.builder().id(shiftId).store(store).status(ShiftStatus.CANCELLED).build();
            ShiftAssignment sa = ShiftAssignment.builder().id(UUID.randomUUID()).shift(shift).staff(staffA).build();

            when(shiftAssignmentRepository.findByShiftIdAndStaffId(shiftId, staffAId)).thenReturn(Optional.of(sa));

            BusinessException ex = assertThrows(BusinessException.class, () -> attendanceService.submitSelfie(staffAId, shiftId, 10.0, 106.0, new byte[]{1}));
            assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
            assertTrue(ex.getMessage().contains("Cannot check in for a shift that is CANCELLED"));
        }
    }

    @Nested
    @DisplayName("5. Marketplace Claim Exceptions")
    class MarketplaceExceptions {

        @Test
        @DisplayName("claimOpenShift: Non-STAFF role cannot claim open shifts")
        void claimOpenShift_NonStaffRole_ThrowsBadRequest() {
            UUID shiftId = UUID.randomUUID();
            Shift shift = Shift.builder().id(shiftId).store(store).isOpen(true)
                    .shiftDate(LocalDate.now().plusDays(2)).startTime(LocalTime.of(9, 0)).endTime(LocalTime.of(17, 0))
                    .availabilityDeadline(ZonedDateTime.now().plusDays(1))
                    .requirements(List.of())
                    .build();

            RLock lock = mock(RLock.class);
            when(redissonClient.getLock(anyString())).thenReturn(lock);
            try {
                when(lock.tryLock(anyLong(), anyLong(), any())).thenReturn(true);
            } catch (InterruptedException ignored) {}

            doAnswer(invocation -> {
                Consumer<TransactionStatus> callback = invocation.getArgument(0);
                callback.accept(null);
                return null;
            }).when(transactionTemplate).executeWithoutResult(any());

            when(shiftRepository.findByIdAndStoreId(shiftId, storeId)).thenReturn(Optional.of(shift));
            when(userRepository.findById(managerId)).thenReturn(Optional.of(manager));

            BusinessException ex = assertThrows(BusinessException.class, () -> marketplaceService.claimOpenShift(storeId, shiftId, managerId));
            assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
            assertTrue(ex.getMessage().contains("Only users with role STAFF can claim shifts"));
        }

        @Test
        @DisplayName("claimOpenShift: Inactive or foreign employee cannot claim shift")
        void claimOpenShift_InactiveEmployment_ThrowsBadRequest() {
            UUID shiftId = UUID.randomUUID();
            Shift shift = Shift.builder().id(shiftId).store(store).isOpen(true)
                    .shiftDate(LocalDate.now().plusDays(2)).startTime(LocalTime.of(9, 0)).endTime(LocalTime.of(17, 0))
                    .availabilityDeadline(ZonedDateTime.now().plusDays(1))
                    .requirements(List.of())
                    .build();

            RLock lock = mock(RLock.class);
            when(redissonClient.getLock(anyString())).thenReturn(lock);
            try {
                when(lock.tryLock(anyLong(), anyLong(), any())).thenReturn(true);
            } catch (InterruptedException ignored) {}

            doAnswer(invocation -> {
                Consumer<TransactionStatus> callback = invocation.getArgument(0);
                callback.accept(null);
                return null;
            }).when(transactionTemplate).executeWithoutResult(any());

            when(shiftRepository.findByIdAndStoreId(shiftId, storeId)).thenReturn(Optional.of(shift));
            when(userRepository.findById(staffAId)).thenReturn(Optional.of(staffA));
            when(employmentRepository.existsByUserIdAndStoreIdAndStatus(staffAId, storeId, EmploymentStatus.ACTIVE)).thenReturn(false);

            BusinessException ex = assertThrows(BusinessException.class, () -> marketplaceService.claimOpenShift(storeId, shiftId, staffAId));
            assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
            assertTrue(ex.getMessage().contains("Employment Inactive: Staff does not work at this store"));
        }
    }
}
