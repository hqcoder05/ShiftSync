package com.shiftsync.leave.service;

import com.shiftsync.auth.entity.User;
import com.shiftsync.auth.repository.UserRepository;
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
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class LeaveBalanceService {

    private final LeaveBalanceRepository leaveBalanceRepository;
    private final UserRepository userRepository;
    private final StoreRepository storeRepository;
    private final EmploymentRepository employmentRepository;

    public List<LeaveTypeDTO> getLeaveTypes() {
        return Arrays.asList(
                LeaveTypeDTO.builder()
                        .code(LeaveType.ANNUAL)
                        .name("Nghỉ phép năm")
                        .description("Nghỉ phép theo chế độ hàng năm, hưởng nguyên lương và khấu trừ vào quỹ phép năm.")
                        .isPaid(true)
                        .deductsAnnualBalance(true)
                        .requiresApproval(true)
                        .build(),
                LeaveTypeDTO.builder()
                        .code(LeaveType.SICK)
                        .name("Nghỉ ốm / Bệnh")
                        .description("Nghỉ do lý do sức khỏe/ốm đau theo chế độ bảo hiểm xã hội, không trừ quỹ phép năm.")
                        .isPaid(false)
                        .deductsAnnualBalance(false)
                        .requiresApproval(true)
                        .build(),
                LeaveTypeDTO.builder()
                        .code(LeaveType.EMERGENCY)
                        .name("Nghỉ việc riêng / Khẩn cấp")
                        .description("Nghỉ việc gia đình có việc hiếu hỷ hoặc khẩn cấp, không trừ quỹ phép năm.")
                        .isPaid(true)
                        .deductsAnnualBalance(false)
                        .requiresApproval(true)
                        .build(),
                LeaveTypeDTO.builder()
                        .code(LeaveType.UNPAID)
                        .name("Nghỉ không lương")
                        .description("Nghỉ việc riêng không hưởng lương theo thỏa thuận, không trừ quỹ phép năm.")
                        .isPaid(false)
                        .deductsAnnualBalance(false)
                        .requiresApproval(true)
                        .build()
        );
    }

    @Transactional
    public LeaveBalance getOrCreateBalance(UUID storeId, UUID staffId, int year) {
        return leaveBalanceRepository.findByStaffIdAndStoreIdAndYear(staffId, storeId, year)
                .orElseGet(() -> {
                    User staff = userRepository.findById(staffId)
                            .orElseThrow(() -> new BusinessException("Staff not found", HttpStatus.NOT_FOUND));
                    Store store = storeRepository.findById(storeId)
                            .orElseThrow(() -> new BusinessException("Store not found", HttpStatus.NOT_FOUND));

                    int entitlement = 12; // Standard 12 days/year per Vietnam Labor Code (BLLD 2019 Dieu 113)

                    // Check employment contract type if exists
                    List<Employment> employments = employmentRepository.findByUserIdAndStoreIdAndStatus(staffId, storeId, EmploymentStatus.ACTIVE);
                    if (!employments.isEmpty()) {
                        Employment activeEmp = employments.get(0);
                        if (activeEmp.getContractType() != null && "PART_TIME".equalsIgnoreCase(activeEmp.getContractType().getName())) {
                            entitlement = 6; // Pro-rated for part-time
                        }
                    }

                    LeaveBalance newBalance = LeaveBalance.builder()
                            .staff(staff)
                            .store(store)
                            .year(year)
                            .annualEntitlement(entitlement)
                            .carryOverDays(0)
                            .usedDays(0)
                            .pendingDays(0)
                            .updatedAt(OffsetDateTime.now())
                            .build();

                    return leaveBalanceRepository.save(newBalance);
                });
    }

    @Transactional
    public LeaveBalanceDTO getMyBalance(UUID storeId, UUID staffId, Integer year) {
        int targetYear = (year != null && year > 2000) ? year : LocalDate.now().getYear();
        LeaveBalance balance = getOrCreateBalance(storeId, staffId, targetYear);
        return mapToDTO(balance);
    }

    @Transactional
    public List<LeaveBalanceDTO> getStoreBalances(UUID storeId, Integer year) {
        int targetYear = (year != null && year > 2000) ? year : LocalDate.now().getYear();
        List<LeaveBalance> balances = leaveBalanceRepository.findByStoreIdAndYear(storeId, targetYear);
        return balances.stream().map(this::mapToDTO).collect(Collectors.toList());
    }

    @Transactional
    public void deductAnnualLeave(UUID storeId, UUID staffId, int year, int requestedDays) {
        LeaveBalance balance = getOrCreateBalance(storeId, staffId, year);
        int remaining = balance.getRemainingDays();

        if (remaining < requestedDays) {
            throw new BusinessException(
                    String.format("Số dư phép năm không đủ để duyệt đơn. Quỹ phép còn lại: %d ngày, Yêu cầu: %d ngày.", remaining, requestedDays),
                    HttpStatus.CONFLICT
            );
        }

        balance.setUsedDays(balance.getUsedDays() + requestedDays);
        balance.setUpdatedAt(OffsetDateTime.now());
        leaveBalanceRepository.save(balance);
        log.info("Deducted {} annual leave days for staff {} in store {}. Remaining: {}", requestedDays, staffId, storeId, balance.getRemainingDays());
    }

    @Transactional
    public void reverseAnnualLeave(UUID storeId, UUID staffId, int year, int requestedDays) {
        leaveBalanceRepository.findByStaffIdAndStoreIdAndYear(staffId, storeId, year).ifPresent(balance -> {
            balance.setUsedDays(Math.max(0, balance.getUsedDays() - requestedDays));
            balance.setUpdatedAt(OffsetDateTime.now());
            leaveBalanceRepository.save(balance);
            log.info("Reversed {} annual leave days for staff {} in store {}. Remaining: {}", requestedDays, staffId, storeId, balance.getRemainingDays());
        });
    }

    public LeaveBalanceDTO mapToDTO(LeaveBalance b) {
        return LeaveBalanceDTO.builder()
                .id(b.getId())
                .staffId(b.getStaff().getId())
                .staffName(b.getStaff().getFullName())
                .storeId(b.getStore().getId())
                .storeName(b.getStore().getName())
                .year(b.getYear())
                .annualEntitlement(b.getAnnualEntitlement())
                .carryOverDays(b.getCarryOverDays())
                .usedDays(b.getUsedDays())
                .pendingDays(b.getPendingDays())
                .remainingDays(b.getRemainingDays())
                .updatedAt(b.getUpdatedAt())
                .build();
    }
}