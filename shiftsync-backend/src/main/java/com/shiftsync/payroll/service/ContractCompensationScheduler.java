package com.shiftsync.payroll.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.shiftsync.employment.repository.ContractTypeRepository;
import com.shiftsync.shared.exception.BusinessException;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/** Internal scheduling operation; the caller must authorize the manager and own the transaction. */
@Service
@RequiredArgsConstructor
public class ContractCompensationScheduler {
    private final ContractTypeRepository contracts;
    private final CompensationPeriodGuard guard;
    private final CompensationRevisionResolver resolver;
    private final CompensationRevisionWriter writer;
    private final ObjectMapper json;

    @Transactional(propagation = Propagation.MANDATORY)
    public LocalDate schedule(UUID storeId, UUID contractId, BigDecimal rate, int weeklyHours,
                              BigDecimal multiplier, LocalDate requestedDate, UUID actorId) {
        if (storeId == null || contractId == null || rate == null || rate.signum() <= 0
                || weeklyHours < 1 || multiplier == null || multiplier.compareTo(BigDecimal.ONE) < 0) {
            throw new BusinessException("Điều khoản hợp đồng không hợp lệ", HttpStatus.BAD_REQUEST);
        }
        guard.lockStores(List.of(storeId));
        if (contracts.findByIdAndStoreId(contractId, storeId).isEmpty()) {
            throw new BusinessException("Loại hợp đồng không thuộc chi nhánh", HttpStatus.NOT_FOUND);
        }
        LocalDate date = CompensationEffectiveDate.resolve(requestedDate, Clock.systemUTC());
        resolver.requireAt("contract_type", contractId, date, CompensationRevisionResolver.ContractTerms.class);
        try {
            String values = json.writeValueAsString(new CompensationRevisionResolver.ContractTerms(rate, weeklyHours, multiplier));
            writer.insert("contract_type", contractId, List.of(storeId), date, values, actorId);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Không thể tạo dữ liệu điều khoản hợp đồng", e);
        }
        return date;
    }
}
