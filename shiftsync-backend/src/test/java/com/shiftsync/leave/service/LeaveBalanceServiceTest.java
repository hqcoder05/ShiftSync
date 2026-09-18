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
import com.shiftsync.leave.enums.LeaveType;
import com.shiftsync.leave.repository.LeaveBalanceRepository;
import com.shiftsync.shared.exception.BusinessException;
import com.shiftsync.store.entity.Store;
import com.shiftsync.store.repository.StoreRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
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
    }

    @Test
    void testGetLeaveTypes() {
        List<LeaveTypeDTO> types = leaveBalanceService.getLeaveTypes();
        assertNotNull(types);
        assertEquals(4, types.size());
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
}