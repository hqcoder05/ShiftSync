package com.shiftsync.payroll.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.shiftsync.employment.enums.EmploymentStatus;
import com.shiftsync.employment.repository.ContractTypeRepository;
import com.shiftsync.employment.repository.EmploymentRepository;
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
public class EmploymentCompensationScheduler {
    private final EmploymentRepository employments;
    private final ContractTypeRepository contracts;
    private final CompensationRevisionWriter writer;
    private final CompensationPeriodGuard guard;
    private final CompensationRevisionResolver resolver;
    private final ObjectMapper json;

    @Transactional(propagation = Propagation.MANDATORY)
    public LocalDate schedule(UUID storeId, UUID staffId, UUID contractId, BigDecimal rate,
                              LocalDate requestedDate, UUID actorId) {
        if (storeId == null || staffId == null || contractId == null || rate == null || rate.signum() <= 0) {
            throw new BusinessException("Thiếu thông tin hoặc mức lương không hợp lệ", HttpStatus.BAD_REQUEST);
        }
        guard.lockStores(List.of(storeId));
        var rows = employments.findActiveForCompensationUpdate(staffId, storeId, EmploymentStatus.ACTIVE);
        if (rows.size() != 1) throw new BusinessException("Không xác định được hợp đồng nhân viên đang hoạt động", HttpStatus.CONFLICT);
        var employment = rows.get(0);
        if (contracts.findByIdAndStoreId(contractId, storeId).isEmpty()) {
            throw new BusinessException("Loại hợp đồng không thuộc chi nhánh", HttpStatus.NOT_FOUND);
        }
        LocalDate date = CompensationEffectiveDate.resolve(requestedDate, Clock.systemUTC());
        if (employment.getJoinedDate() == null || date.isBefore(employment.getJoinedDate())
                || (employment.getLeftDate() != null && date.isAfter(employment.getLeftDate()))) {
            throw new BusinessException("Ngày hiệu lực nằm ngoài thời gian làm việc", HttpStatus.BAD_REQUEST);
        }
        // A newly scheduled revision cannot establish what the employee or
        // contract earned before the first trustworthy baseline.
        resolver.requireAt("employment", employment.getId(), date, CompensationRevisionResolver.EmploymentTerms.class);
        resolver.requireAt("contract_type", contractId, date, CompensationRevisionResolver.ContractTerms.class);
        try {
            String values = json.writeValueAsString(new CompensationRevisionResolver.EmploymentTerms(contractId, rate));
            writer.insert("employment", employment.getId(), List.of(storeId), date, values, actorId);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Không thể tạo dữ liệu điều khoản lương", e);
        }
        return date;
    }
}
