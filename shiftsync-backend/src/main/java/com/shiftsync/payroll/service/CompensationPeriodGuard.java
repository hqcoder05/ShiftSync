package com.shiftsync.payroll.service;

import com.shiftsync.payroll.enums.PayrollPeriodStatus;
import com.shiftsync.payroll.repository.PayrollPeriodRepository;
import com.shiftsync.shared.exception.BusinessException;
import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

/** Checks the half-open date interval affected by a proposed revision. */
@Component
@RequiredArgsConstructor
public class CompensationPeriodGuard {
    private final PayrollPeriodRepository periods;
    private final com.shiftsync.store.repository.StoreRepository stores;

    public void check(Collection<UUID> storeIds, LocalDate from, LocalDate nextRevision) {
        if (storeIds == null || storeIds.isEmpty() || storeIds.stream().anyMatch(java.util.Objects::isNull) || from == null
                || (nextRevision != null && !nextRevision.isAfter(from))) {
            throw new IllegalArgumentException("Khoảng hiệu lực hoặc danh sách chi nhánh không hợp lệ");
        }
        LocalDate endExclusive = nextRevision == null ? LocalDate.of(9999, 12, 31) : nextRevision;
        for (UUID storeId : storeIds.stream().distinct().sorted().toList()) {
            if (periods.existsLockedOverlappingRevision(storeId, from, endExclusive,
                    List.of(PayrollPeriodStatus.CONFIRMED, PayrollPeriodStatus.PAID))) {
                throw new BusinessException("Thay đổi ảnh hưởng kỳ lương đã xác nhận hoặc đã thanh toán", HttpStatus.CONFLICT);
            }
        }
    }

    /** Acquire store locks in a stable order before checking or writing revisions. */
    @org.springframework.transaction.annotation.Transactional(propagation = org.springframework.transaction.annotation.Propagation.MANDATORY)
    public void lockAndCheck(Collection<UUID> storeIds, LocalDate from, LocalDate nextRevision) {
        lockStores(storeIds);
        check(storeIds, from, nextRevision);
    }

    @org.springframework.transaction.annotation.Transactional(propagation = org.springframework.transaction.annotation.Propagation.MANDATORY)
    public void lockStores(Collection<UUID> storeIds) {
        if (storeIds == null || storeIds.isEmpty() || storeIds.stream().anyMatch(java.util.Objects::isNull)) {
            throw new IllegalArgumentException("Danh sách chi nhánh không hợp lệ");
        }
        var ordered = storeIds.stream().distinct().sorted().toList();
        for (UUID id : ordered) {
            stores.findByIdForUpdate(id).orElseThrow(() -> new BusinessException("Không tìm thấy chi nhánh", HttpStatus.NOT_FOUND));
        }
    }
}
