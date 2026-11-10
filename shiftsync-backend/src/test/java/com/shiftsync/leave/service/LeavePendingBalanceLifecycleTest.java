package com.shiftsync.leave.service;

import com.shiftsync.audit.service.AuditLogService;
import com.shiftsync.auth.entity.User;
import com.shiftsync.auth.repository.UserRepository;
import com.shiftsync.availability.repository.BlackoutDateRepository;
import com.shiftsync.employment.enums.EmploymentStatus;
import com.shiftsync.employment.repository.EmploymentRepository;
import com.shiftsync.leave.dto.LeaveCreateRequest;
import com.shiftsync.leave.entity.LeaveBalance;
import com.shiftsync.leave.entity.LeaveRequest;
import com.shiftsync.leave.enums.LeaveStatus;
import com.shiftsync.leave.enums.LeaveType;
import com.shiftsync.leave.repository.LeaveBalanceRepository;
import com.shiftsync.leave.repository.LeaveRequestRepository;
import com.shiftsync.notification.service.NotificationService;
import com.shiftsync.shared.websocket.RealtimeEventPublisher;
import com.shiftsync.shift.repository.ShiftAssignmentRepository;
import com.shiftsync.shift.repository.ShiftRepository;
import com.shiftsync.store.entity.Store;
import com.shiftsync.store.repository.StoreRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class LeavePendingBalanceLifecycleTest {
    private enum Decision { APPROVE, REJECT, CANCEL }

    private final LeaveRequestRepository requests = mock(LeaveRequestRepository.class);
    private final LeaveBalanceRepository balances = mock(LeaveBalanceRepository.class);
    private final UserRepository users = mock(UserRepository.class);
    private final StoreRepository stores = mock(StoreRepository.class);
    private final EmploymentRepository employments = mock(EmploymentRepository.class);
    private final ShiftAssignmentRepository assignments = mock(ShiftAssignmentRepository.class);
    private final Map<UUID, LeaveRequest> rows = new HashMap<>();
    private final User staff = User.builder().id(UUID.randomUUID()).fullName("Staff").build();
    private final User manager = User.builder().id(UUID.randomUUID()).fullName("Manager").build();
    private final Store store = Store.builder().id(UUID.randomUUID()).name("Own store").build();
    private final int year = LocalDate.now().getYear() + 1;
    private final LocalDate start = LocalDate.of(year, 6, 10);
    private final LeaveBalance balance = LeaveBalance.builder().id(UUID.randomUUID()).staff(staff).store(store)
            .year(year).annualEntitlement(12).usedDays(3).pendingDays(99).build();
    private LeaveBalanceService balanceService;
    private LeaveRequestService requestService;

    @BeforeEach
    void setUp() {
        balanceService = new LeaveBalanceService(balances, requests, users, stores, employments);
        requestService = new LeaveRequestService(mock(AuditLogService.class), requests, users, stores,
                employments, mock(BlackoutDateRepository.class), assignments, mock(ShiftRepository.class),
                mock(NotificationService.class), mock(RealtimeEventPublisher.class), balanceService);
        when(balances.findByStaffIdAndStoreIdAndYear(staff.getId(), store.getId(), year)).thenReturn(Optional.of(balance));
        when(balances.save(any())).thenAnswer(call -> call.getArgument(0));
        when(users.findById(staff.getId())).thenReturn(Optional.of(staff));
        when(users.findById(manager.getId())).thenReturn(Optional.of(manager));
        when(stores.findById(store.getId())).thenReturn(Optional.of(store));
        when(employments.existsByUserIdAndStoreIdAndStatus(staff.getId(), store.getId(), EmploymentStatus.ACTIVE)).thenReturn(true);
        when(requests.findById(any())).thenAnswer(call -> Optional.ofNullable(rows.get(call.getArgument(0))));
        when(requests.save(any())).thenAnswer(call -> {
            LeaveRequest request = call.getArgument(0);
            if (request.getId() == null) request.setId(UUID.randomUUID());
            rows.put(request.getId(), request);
            return request;
        });
        doAnswer(call -> { rows.remove(((LeaveRequest) call.getArgument(0)).getId()); return null; })
                .when(requests).delete(any(LeaveRequest.class));
        when(requests.findPendingAnnualLeaveInPeriod(any(), nullable(UUID.class), any(), any())).thenAnswer(call -> {
            UUID storeId = call.getArgument(0), staffId = call.getArgument(1);
            LocalDate from = call.getArgument(2), to = call.getArgument(3);
            return rows.values().stream().filter(request -> request.getStore().getId().equals(storeId)
                    && (staffId == null || request.getStaff().getId().equals(staffId))
                    && request.getLeaveType() == LeaveType.ANNUAL && request.getStatus() == LeaveStatus.PENDING
                    && !request.getStartDate().isAfter(to) && !request.getEndDate().isBefore(from)).toList();
        });
        when(assignments.findByStaffIdAndShift_ShiftDateBetween(any(), any(), any())).thenReturn(List.of());
    }

    @ParameterizedTest
    @EnumSource(Decision.class)
    void realRequestTransitionsImmediatelyRemovePendingAnnualDays(Decision decision) {
        LeaveCreateRequest create = new LeaveCreateRequest();
        create.setLeaveType(LeaveType.ANNUAL);
        create.setStartDate(start);
        create.setEndDate(start.plusDays(1));
        create.setReason("Annual leave");
        UUID id = requestService.createLeaveRequest(store.getId(), staff.getId(), create).getId();
        assertEquals(2, balanceService.getMyBalance(store.getId(), staff.getId(), year).getPendingDays());
        assertEquals(9, balanceService.getMyBalance(store.getId(), staff.getId(), year).getRemainingDays());

        switch (decision) {
            case APPROVE -> requestService.approveLeaveRequest(store.getId(), id, manager.getId());
            case REJECT -> requestService.rejectLeaveRequest(store.getId(), id, manager.getId(), "Declined");
            case CANCEL -> requestService.cancelLeaveRequest(store.getId(), id, staff.getId());
        }

        var current = balanceService.getMyBalance(store.getId(), staff.getId(), year);
        assertEquals(0, current.getPendingDays());
        assertEquals(decision == Decision.APPROVE ? 5 : 3, current.getUsedDays());
        assertEquals(decision == Decision.APPROVE ? 7 : 9, current.getRemainingDays());
        assertEquals(99, balance.getPendingDays());
    }

    @Test
    void unrelatedStoreStaffYearTypeAndStatusDoNotContribute() {
        add(store, staff, LeaveType.ANNUAL, LeaveStatus.PENDING, start, start.plusDays(1));
        add(Store.builder().id(UUID.randomUUID()).build(), staff, LeaveType.ANNUAL, LeaveStatus.PENDING, start, start.plusDays(4));
        add(store, User.builder().id(UUID.randomUUID()).build(), LeaveType.ANNUAL, LeaveStatus.PENDING, start, start.plusDays(5));
        add(store, staff, LeaveType.ANNUAL, LeaveStatus.PENDING, start.minusYears(1), start.minusYears(1).plusDays(6));
        add(store, staff, LeaveType.SICK, LeaveStatus.PENDING, start, start.plusDays(7));
        add(store, staff, LeaveType.ANNUAL, LeaveStatus.APPROVED, start, start.plusDays(8));
        add(store, staff, LeaveType.ANNUAL, LeaveStatus.REJECTED, start, start.plusDays(9));

        assertEquals(2, balanceService.getMyBalance(store.getId(), staff.getId(), year).getPendingDays());
        verify(requests).findPendingAnnualLeaveInPeriod(store.getId(), staff.getId(),
                LocalDate.of(year, 1, 1), LocalDate.of(year, 12, 31));
    }

    private void add(Store branch, User person, LeaveType type, LeaveStatus status, LocalDate from, LocalDate to) {
        LeaveRequest request = LeaveRequest.builder().id(UUID.randomUUID()).store(branch).staff(person)
                .leaveType(type).status(status).startDate(from).endDate(to).build();
        rows.put(request.getId(), request);
    }
}
