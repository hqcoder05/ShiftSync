package com.shiftsync.leave.service;

import com.shiftsync.auth.entity.User;
import com.shiftsync.auth.repository.UserRepository;
import com.shiftsync.employment.entity.ContractType;
import com.shiftsync.employment.entity.Employment;
import com.shiftsync.employment.enums.EmploymentStatus;
import com.shiftsync.employment.repository.EmploymentRepository;
import com.shiftsync.leave.dto.LeaveBalanceDTO;
import com.shiftsync.leave.dto.LeaveTypeDTO;
import com.shiftsync.leave.entity.LeaveBalance;
import com.shiftsync.leave.entity.LeaveRequest;
import com.shiftsync.leave.enums.LeaveStatus;
import com.shiftsync.leave.enums.LeaveType;
import com.shiftsync.leave.repository.LeaveBalanceRepository;
import com.shiftsync.leave.repository.LeaveRequestRepository;
import com.shiftsync.shared.exception.BusinessException;
import com.shiftsync.shared.security.SystemRole;
import com.shiftsync.store.entity.Store;
import com.shiftsync.store.repository.StoreRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class LeaveBalanceServiceTest {

    @Mock
    private LeaveBalanceRepository leaveBalanceRepository;

    @Mock
    private LeaveRequestRepository leaveRequestRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private StoreRepository storeRepository;

    @Mock
    private EmploymentRepository employmentRepository;

    @InjectMocks
    private LeaveBalanceService leaveBalanceService;

    private UUID storeId;
    private UUID staffId;
    private User staff;
    private Store store;

    @BeforeEach
    void setUp() {
        storeId = UUID.randomUUID();
        staffId = UUID.randomUUID();
        staff = User.builder().id(staffId).fullName("John Doe").email("john@example.com").build();
        store = Store.builder().id(storeId).name("Flagship Store").build();
        lenient().when(userRepository.findById(staffId)).thenReturn(Optional.of(staff));
        lenient().when(employmentRepository.existsByUserIdAndStoreIdAndStatus(staffId, storeId, EmploymentStatus.ACTIVE))
                .thenReturn(true);
    }

    @Test
    void testGetLeaveTypes() {
        List<LeaveTypeDTO> types = leaveBalanceService.getLeaveTypes();
        assertNotNull(types);
        assertEquals(6, types.size());
        assertTrue(types.stream().anyMatch(t -> t.getCode() == LeaveType.ANNUAL && t.isDeductsAnnualBalance()));
        assertTrue(types.stream().anyMatch(t -> t.getCode() == LeaveType.UNPAID && !t.isDeductsAnnualBalance()));
    }

    @Test
    void testGetOrCreateBalance_ExistingBalance() {
        LeaveBalance existing = LeaveBalance.builder()
                .id(UUID.randomUUID())
                .staff(staff)
                .store(store)
                .year(2026)
                .annualEntitlement(12)
                .usedDays(3)
                .carryOverDays(0)
                .build();

        when(leaveBalanceRepository.findByStaffIdAndStoreIdAndYear(staffId, storeId, 2026))
                .thenReturn(Optional.of(existing));

        LeaveBalanceDTO dto = leaveBalanceService.getMyBalance(storeId, staffId, 2026);
        assertNotNull(dto);
        assertEquals(12, dto.getAnnualEntitlement());
        assertEquals(3, dto.getUsedDays());
        assertEquals(9, dto.getRemainingDays());
    }

    @Test
    void testGetOrCreateBalance_NewBalance_FullTime() {
        when(leaveBalanceRepository.findByStaffIdAndStoreIdAndYear(staffId, storeId, 2026))
                .thenReturn(Optional.empty());
        when(userRepository.findById(staffId)).thenReturn(Optional.of(staff));
        when(storeRepository.findById(storeId)).thenReturn(Optional.of(store));

        ContractType contractType = ContractType.builder().id(UUID.randomUUID()).name("FULL_TIME").build();
        Employment emp = Employment.builder()
                .id(UUID.randomUUID())
                .user(staff)
                .store(store)
                .contractType(contractType)
                .status(EmploymentStatus.ACTIVE)
                .joinedDate(LocalDate.now())
                .hourlyRate(BigDecimal.valueOf(30))
                .build();

        when(employmentRepository.findByUserIdAndStoreIdAndStatus(staffId, storeId, EmploymentStatus.ACTIVE)).thenReturn(List.of(emp));
        when(leaveBalanceRepository.save(any(LeaveBalance.class))).thenAnswer(inv -> inv.getArgument(0));

        LeaveBalanceDTO dto = leaveBalanceService.getMyBalance(storeId, staffId, 2026);
        assertNotNull(dto);
        assertEquals(12, dto.getAnnualEntitlement());
        assertEquals(0, dto.getUsedDays());
        assertEquals(12, dto.getRemainingDays());
    }

    @Test
    void testDeductAnnualLeave_Success() {
        LeaveBalance balance = LeaveBalance.builder()
                .id(UUID.randomUUID())
                .staff(staff)
                .store(store)
                .year(2026)
                .annualEntitlement(12)
                .usedDays(2)
                .carryOverDays(0)
                .build();

        when(leaveBalanceRepository.findByStaffIdAndStoreIdAndYear(staffId, storeId, 2026))
                .thenReturn(Optional.of(balance));
        when(leaveBalanceRepository.save(any(LeaveBalance.class))).thenAnswer(inv -> inv.getArgument(0));

        leaveBalanceService.deductAnnualLeave(storeId, staffId, 2026, 3);
        assertEquals(5, balance.getUsedDays());
        assertEquals(7, balance.getRemainingDays());
    }

    @Test
    void testDeductAnnualLeave_InsufficientBalance_ThrowsConflict() {
        LeaveBalance balance = LeaveBalance.builder()
                .id(UUID.randomUUID())
                .staff(staff)
                .store(store)
                .year(2026)
                .annualEntitlement(12)
                .usedDays(10) // remaining is 2
                .carryOverDays(0)
                .build();

        when(leaveBalanceRepository.findByStaffIdAndStoreIdAndYear(staffId, storeId, 2026))
                .thenReturn(Optional.of(balance));

        BusinessException ex = assertThrows(BusinessException.class, () ->
                leaveBalanceService.deductAnnualLeave(storeId, staffId, 2026, 3)
        );

        assertEquals(HttpStatus.CONFLICT, ex.getStatus());
        assertTrue(ex.getMessage().contains("Số dư phép năm không đủ"));
    }

    @Test
    void testReverseAnnualLeave_Success() {
        LeaveBalance balance = LeaveBalance.builder()
                .id(UUID.randomUUID())
                .staff(staff)
                .store(store)
                .year(2026)
                .annualEntitlement(12)
                .usedDays(5)
                .carryOverDays(0)
                .build();

        when(leaveBalanceRepository.findByStaffIdAndStoreIdAndYear(staffId, storeId, 2026))
                .thenReturn(Optional.of(balance));
        when(leaveBalanceRepository.save(any(LeaveBalance.class))).thenAnswer(inv -> inv.getArgument(0));

        leaveBalanceService.reverseAnnualLeave(storeId, staffId, 2026, 2);
        assertEquals(3, balance.getUsedDays());
        assertEquals(9, balance.getRemainingDays());
    }

    @Test
    void pendingAnnualDaysComeFromRequestsWithoutReservingRemainingBalance() {
        LeaveBalance balance = balance(staff, 2026);
        balance.setPendingDays(99);
        when(leaveBalanceRepository.findByStaffIdAndStoreIdAndYear(staffId, storeId, 2026))
                .thenReturn(Optional.of(balance));
        when(leaveRequestRepository.findPendingAnnualLeaveInPeriod(storeId, staffId,
                LocalDate.of(2026, 1, 1), LocalDate.of(2026, 12, 31)))
                .thenReturn(List.of(pending(staff, LocalDate.of(2026, 10, 26), LocalDate.of(2026, 10, 27))));

        LeaveBalanceDTO result = leaveBalanceService.getMyBalance(storeId, staffId, 2026);

        assertEquals(2, result.getPendingDays());
        assertEquals(3, result.getUsedDays());
        assertEquals(9, result.getRemainingDays());
        assertEquals(99, balance.getPendingDays(), "A balance read must not overwrite the legacy persisted counter");
        verify(leaveBalanceRepository, never()).save(any());
    }

    @Test
    void crossYearRequestsOnlyCountTheDaysWithinEachRequestedYear() {
        LeaveRequest spanning = pending(staff, LocalDate.of(2026, 12, 30), LocalDate.of(2027, 1, 2));
        for (int year : List.of(2026, 2027)) {
            when(leaveBalanceRepository.findByStaffIdAndStoreIdAndYear(staffId, storeId, year))
                    .thenReturn(Optional.of(balance(staff, year)));
            when(leaveRequestRepository.findPendingAnnualLeaveInPeriod(storeId, staffId,
                    LocalDate.of(year, 1, 1), LocalDate.of(year, 12, 31))).thenReturn(List.of(spanning));
            assertEquals(2, leaveBalanceService.getMyBalance(storeId, staffId, year).getPendingDays());
        }
    }

    @Test
    void pendingDaysCountInclusiveLeapDaysAndSingleDays() {
        when(leaveBalanceRepository.findByStaffIdAndStoreIdAndYear(staffId, storeId, 2028))
                .thenReturn(Optional.of(balance(staff, 2028)));
        when(leaveRequestRepository.findPendingAnnualLeaveInPeriod(storeId, staffId,
                LocalDate.of(2028, 1, 1), LocalDate.of(2028, 12, 31)))
                .thenReturn(List.of(pending(staff, LocalDate.of(2028, 2, 28), LocalDate.of(2028, 3, 1)),
                        pending(staff, LocalDate.of(2028, 12, 31), LocalDate.of(2028, 12, 31))));

        assertEquals(4, leaveBalanceService.getMyBalance(storeId, staffId, 2028).getPendingDays());
    }

    @Test
    void storeBalanceListUsesOneScopedRequestReadAndKeepsStaffTotalsSeparate() {
        User colleague = User.builder().id(UUID.randomUUID()).fullName("Colleague").build();
        when(leaveBalanceRepository.findByStoreIdAndYear(storeId, 2026))
                .thenReturn(List.of(balance(staff, 2026), balance(colleague, 2026)));
        when(leaveRequestRepository.findPendingAnnualLeaveInPeriod(storeId, null,
                LocalDate.of(2026, 1, 1), LocalDate.of(2026, 12, 31)))
                .thenReturn(List.of(pending(staff, LocalDate.of(2026, 10, 1), LocalDate.of(2026, 10, 2)),
                        pending(colleague, LocalDate.of(2026, 11, 1), LocalDate.of(2026, 11, 3))));

        List<LeaveBalanceDTO> result = leaveBalanceService.getStoreBalances(storeId, 2026);

        assertEquals(2, result.get(0).getPendingDays());
        assertEquals(3, result.get(1).getPendingDays());
        assertEquals(staffId, result.get(0).getStaffId());
        assertEquals(colleague.getId(), result.get(1).getStaffId());
        verify(leaveRequestRepository).findPendingAnnualLeaveInPeriod(storeId, null,
                LocalDate.of(2026, 1, 1), LocalDate.of(2026, 12, 31));
        verifyNoMoreInteractions(leaveRequestRepository);
    }

    @ParameterizedTest
    @EnumSource(value = SystemRole.class, names = {"STAFF", "MANAGER"})
    void inactiveStoreMembershipIsRejectedBeforeAnyBalanceReadOrCreation(SystemRole role) {
        staff.setSystemRole(role);
        UUID foreignStore = UUID.randomUUID();

        BusinessException error = assertThrows(BusinessException.class,
                () -> leaveBalanceService.getMyBalance(foreignStore, staffId, 2026));

        assertEquals(HttpStatus.FORBIDDEN, error.getStatus());
        verify(employmentRepository).existsByUserIdAndStoreIdAndStatus(staffId, foreignStore, EmploymentStatus.ACTIVE);
        verifyNoInteractions(leaveBalanceRepository, leaveRequestRepository, storeRepository);
    }

    @Test
    void persistedAdministratorRoleCanReadBalanceWithoutStoreEmployment() {
        staff.setSystemRole(SystemRole.ADMIN);
        when(leaveBalanceRepository.findByStaffIdAndStoreIdAndYear(staffId, storeId, 2026))
                .thenReturn(Optional.of(balance(staff, 2026)));

        assertEquals(staffId, leaveBalanceService.getMyBalance(storeId, staffId, 2026).getStaffId());
        verify(employmentRepository, never()).existsByUserIdAndStoreIdAndStatus(any(), any(), any());
    }

    @Test
    void unknownAuthenticatedUserCannotCreateABalance() {
        when(userRepository.findById(staffId)).thenReturn(Optional.empty());

        BusinessException error = assertThrows(BusinessException.class,
                () -> leaveBalanceService.getMyBalance(storeId, staffId, 2026));

        assertEquals(HttpStatus.NOT_FOUND, error.getStatus());
        verifyNoInteractions(leaveBalanceRepository, leaveRequestRepository, storeRepository, employmentRepository);
    }

    private LeaveBalance balance(User person, int year) {
        return LeaveBalance.builder().id(UUID.randomUUID()).staff(person).store(store).year(year)
                .annualEntitlement(12).usedDays(3).build();
    }

    private LeaveRequest pending(User person, LocalDate start, LocalDate end) {
        return LeaveRequest.builder().id(UUID.randomUUID()).staff(person).store(store)
                .leaveType(LeaveType.ANNUAL).status(LeaveStatus.PENDING).startDate(start).endDate(end).build();
    }
}
