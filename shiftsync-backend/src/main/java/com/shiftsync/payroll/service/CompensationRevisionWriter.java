package com.shiftsync.payroll.service;

import com.shiftsync.payroll.repository.CompensationRevisionRepository;
import java.time.LocalDate;
import java.util.Collection;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/** Internal transaction primitive; caller must validate ownership and complete values. */
@Service
@RequiredArgsConstructor
public class CompensationRevisionWriter {
    private final CompensationRevisionRepository revisions;
    private final CompensationPeriodGuard guard;
    private final CompensationRevisionResolver resolver;

    @Transactional(propagation = Propagation.MANDATORY)
    public UUID insert(String type, UUID entityId, Collection<UUID> affectedStores,
                       LocalDate effectiveDate, String completeValuesJson, UUID actorId) {
        if (entityId == null || effectiveDate == null) {
            throw new com.shiftsync.shared.exception.BusinessException("Thiếu đối tượng hoặc ngày hiệu lực", org.springframework.http.HttpStatus.BAD_REQUEST);
        }
        resolver.validateNewRevision(type, completeValuesJson);
        guard.lockStores(affectedStores);
        if (revisions.hasUntrackedCompensationChange(type, entityId)) {
            throw new com.shiftsync.shared.exception.BusinessException(
                    "Có thay đổi lương cũ chưa được đối soát; không thể tạo lịch mới", org.springframework.http.HttpStatus.CONFLICT);
        }
        LocalDate next = revisions.findNextEffectiveDate(type, entityId, effectiveDate).orElse(null);
        guard.check(affectedStores, effectiveDate, next);
        UUID revisionId = UUID.randomUUID();
        revisions.insert(revisionId, type, entityId, effectiveDate, completeValuesJson, actorId);
        return revisionId;
    }
}
