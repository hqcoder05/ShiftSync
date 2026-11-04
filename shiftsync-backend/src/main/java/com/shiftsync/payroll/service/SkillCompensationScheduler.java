package com.shiftsync.payroll.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.shiftsync.shared.exception.BusinessException;
import com.shiftsync.shift.repository.ShiftAssignmentRepository;
import com.shiftsync.skill.repository.SkillRepository;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/** Caller authorizes the manager and supplies a serializable transaction. */
@Service
@RequiredArgsConstructor
public class SkillCompensationScheduler {
    private final SkillRepository skills;
    private final ShiftAssignmentRepository assignments;
    private final CompensationPeriodGuard guard;
    private final CompensationRevisionResolver resolver;
    private final CompensationRevisionWriter writer;
    private final ObjectMapper json;

    @Transactional(propagation = Propagation.MANDATORY)
    public LocalDate schedule(UUID storeId, UUID skillId, BigDecimal rate, LocalDate requestedDate, UUID actorId) {
        if (storeId == null || skillId == null || rate == null || rate.signum() < 0)
            throw new BusinessException("Mức lương vị trí không hợp lệ", HttpStatus.BAD_REQUEST);
        if (!Integer.valueOf(java.sql.Connection.TRANSACTION_SERIALIZABLE).equals(TransactionSynchronizationManager.getCurrentTransactionIsolationLevel()))
            throw new IllegalStateException("Lập lịch lương vị trí yêu cầu giao dịch SERIALIZABLE");
        Set<UUID> affected = new HashSet<>(assignments.findSupportPayrollStoresForSkill(skillId));
        affected.add(storeId);
        guard.lockStores(affected);
        if (skills.findByIdAndStoreId(skillId, storeId).isEmpty())
            throw new BusinessException("Vị trí không thuộc chi nhánh", HttpStatus.NOT_FOUND);
        LocalDate date = CompensationEffectiveDate.resolve(requestedDate, Clock.systemUTC());
        resolver.requireAt("skill", skillId, date, CompensationRevisionResolver.SkillTerms.class);
        try {
            writer.insert("skill", skillId, affected, date,
                    json.writeValueAsString(new CompensationRevisionResolver.SkillTerms(rate)), actorId);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Không thể tạo dữ liệu lương vị trí", e);
        }
        return date;
    }
}
