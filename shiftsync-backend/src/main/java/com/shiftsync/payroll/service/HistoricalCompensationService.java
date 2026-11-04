package com.shiftsync.payroll.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.shiftsync.payroll.dto.HistoricalCompensationRequest;
import com.shiftsync.payroll.dto.UntrackedCompensationReconciliationRequest;
import com.shiftsync.payroll.repository.CompensationRevisionRepository;
import com.shiftsync.shared.exception.BusinessException;
import com.shiftsync.shift.repository.ShiftAssignmentRepository;
import java.time.LocalDate;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

/** Adds explicitly evidenced terms before the earliest known baseline. */
@Service
@RequiredArgsConstructor
public class HistoricalCompensationService {
    private final JdbcTemplate jdbc;
    private final ShiftAssignmentRepository assignments;
    private final CompensationPeriodGuard guard;
    private final CompensationRevisionRepository revisions;
    private final CompensationRevisionWriter writer;
    private final ObjectMapper json;
    private final CompensationRevisionResolver resolver;

    public record HistoryItem(UUID revisionId, LocalDate effectiveDate, java.util.Map<String, Object> terms,
                              UUID createdBy, UUID reconciledBy, String evidence) {}
    public record UntrackedItem(long historyId, java.time.OffsetDateTime recordedAt,
                                java.util.Map<String, Object> oldTerms, java.util.Map<String, Object> newTerms) {}
    public record HistoryResult(boolean untrackedChanges, List<HistoryItem> revisions, List<UntrackedItem> untrackedItems) {}

    @Transactional(readOnly = true)
    public HistoryResult history(UUID storeId, String type, UUID entityId) {
        requireOwned(storeId, type, entityId);
        var rows = jdbc.query("""
                SELECT r.id,r.effective_date,r.values_json::text,r.created_by,e.actor_id,e.evidence
                FROM payroll_effective_revision r LEFT JOIN payroll_reconciliation_evidence e ON e.revision_id=r.id
                WHERE r.entity_type=? AND r.entity_id=? ORDER BY r.effective_date
                """, (rs, row) -> {
            try {
                return new HistoryItem(rs.getObject(1, UUID.class), rs.getObject(2, LocalDate.class),
                        json.readValue(rs.getString(3), new com.fasterxml.jackson.core.type.TypeReference<java.util.Map<String, Object>>() {}),
                        rs.getObject(4, UUID.class), rs.getObject(5, UUID.class), rs.getString(6));
            } catch (JsonProcessingException e) {
                throw new IllegalStateException("Không thể đọc lịch sử điều khoản lương", e);
            }
        }, type, entityId);
        var untracked = revisions.findUntrackedChanges(type, entityId).stream().map(change -> {
            try {
                var mapType = new com.fasterxml.jackson.core.type.TypeReference<java.util.Map<String, Object>>() {};
                return new UntrackedItem(change.historyId(), change.recordedAt(),
                        json.readValue(change.oldTerms(), mapType), json.readValue(change.newTerms(), mapType));
            } catch (JsonProcessingException e) {
                throw new IllegalStateException("Không thể đọc thay đổi lương chưa đối soát", e);
            }
        }).toList();
        return new HistoryResult(!untracked.isEmpty(), rows, untracked);
    }

    private void requireOwned(UUID storeId, String type, UUID entityId) {
        if (storeId == null || entityId == null || type == null || !Set.of("employment", "contract_type", "skill").contains(type))
            throw new BusinessException("Loại hoặc đối tượng điều khoản lương không hợp lệ", HttpStatus.BAD_REQUEST);
        // Table names come exclusively from the fixed whitelist above.
        Integer owned = jdbc.queryForObject("SELECT count(*) FROM " + type + " WHERE id=? AND store_id=?", Integer.class, entityId, storeId);
        if (owned == null || owned != 1) throw new BusinessException("Không tìm thấy dữ liệu thuộc chi nhánh", HttpStatus.NOT_FOUND);
    }

    /** All outstanding edits must be reviewed in recorded order and committed atomically. */
    @Transactional(isolation = Isolation.SERIALIZABLE)
    public List<UUID> reconcileUntracked(UUID storeId, String type, UUID entityId,
            UntrackedCompensationReconciliationRequest input, UUID actorId) {
        if (storeId == null || entityId == null || actorId == null || type == null
                || !Set.of("employment", "contract_type", "skill").contains(type)
                || input == null || input.getChanges() == null || input.getChanges().isEmpty()) {
            throw new BusinessException("Danh sách thay đổi đối soát không hợp lệ", HttpStatus.BAD_REQUEST);
        }
        Set<UUID> affected = new HashSet<>();
        affected.add(storeId);
        if ("skill".equals(type)) affected.addAll(assignments.findSupportPayrollStoresForSkill(entityId));
        guard.lockStores(affected);
        requireOwned(storeId, type, entityId);
        var changes = revisions.findUntrackedChanges(type, entityId);
        if (changes.isEmpty() || changes.size() != input.getChanges().size()) {
            throw new BusinessException("Cần đối soát đầy đủ các thay đổi chưa ghi ngày", HttpStatus.CONFLICT);
        }
        LocalDate previous = null;
        var result = new java.util.ArrayList<UUID>();
        for (int i = 0; i < changes.size(); i++) {
            var change = changes.get(i);
            var chosen = input.getChanges().get(i);
            if (chosen == null || chosen.getHistoryId() == null || chosen.getHistoryId().longValue() != change.historyId()
                    || chosen.getEffectiveDate() == null || chosen.getEvidence() == null
                    || chosen.getEvidence().trim().length() < 10 || chosen.getEvidence().trim().length() > 2000) {
                throw new BusinessException("Mỗi thay đổi cần mã, ngày và căn cứ hợp lệ theo đúng thứ tự", HttpStatus.BAD_REQUEST);
            }
            LocalDate day = chosen.getEffectiveDate();
            if (day.equals(LocalDate.MIN) || day.isAfter(LocalDate.now(CompensationEffectiveDate.BUSINESS_ZONE)) || (previous != null && !day.isAfter(previous))) {
                throw new BusinessException("Ngày hiệu lực phải tăng dần và không ở tương lai", HttpStatus.BAD_REQUEST);
            }
            String before = revisions.findEffectiveValues(type, entityId, day.minusDays(1))
                    .orElseThrow(() -> new BusinessException("Thiếu mốc lương trước ngày đối soát; cần bổ sung lịch sử trước", HttpStatus.CONFLICT));
            resolver.validateNewRevision(type, change.oldTerms());
            resolver.validateNewRevision(type, change.newTerms());
            if (!sameTerms(type, before, change.oldTerms())) {
                throw new BusinessException("Mức lương trước thay đổi không khớp lịch sử tại ngày đã chọn", HttpStatus.CONFLICT);
            }
            if ("employment".equals(type)) {
                try {
                    UUID contract = UUID.fromString(json.readTree(change.newTerms()).get("contractTypeId").asText());
                    Integer belongs = jdbc.queryForObject("SELECT count(*) FROM contract_type WHERE id=? AND store_id=?", Integer.class, contract, storeId);
                    if (belongs == null || belongs != 1) throw new BusinessException("Hợp đồng lịch sử không thuộc chi nhánh", HttpStatus.CONFLICT);
                } catch (JsonProcessingException | IllegalArgumentException e) {
                    throw new BusinessException("Hợp đồng lịch sử không hợp lệ", HttpStatus.CONFLICT);
                }
            }
            var next = revisions.findNextEffectiveDate(type, entityId, day).orElse(null);
            guard.check(affected, day, next);
            UUID revision = UUID.randomUUID();
            revisions.insert(revision, type, entityId, day, change.newTerms(), actorId);
            jdbc.update("INSERT INTO payroll_reconciliation_evidence(revision_id,actor_id,evidence) VALUES (?,?,?)", revision, actorId, chosen.getEvidence().trim());
            jdbc.update("INSERT INTO payroll_untracked_reconciliation(history_id,revision_id) VALUES (?,?)", change.historyId(), revision);
            result.add(revision);
            previous = day;
        }
        return result;
    }

    private boolean sameTerms(String type, String first, String second) {
        try {
            var left = json.readTree(first); var right = json.readTree(second);
            List<String> fields = switch (type) {
                case "employment" -> List.of("contractTypeId", "hourlyRate");
                case "contract_type" -> List.of("defaultHourlyRate", "maxWeeklyHours", "otMultiplier");
                case "skill" -> List.of("hourlyRate");
                default -> throw new IllegalArgumentException("Loại điều khoản không hợp lệ");
            };
            for (String field : fields) {
                var a = left.get(field); var b = right.get(field);
                if (a == null || b == null || a.isNull() || b.isNull()) return false;
                if ("contractTypeId".equals(field)) {
                    if (!a.asText().equals(b.asText())) return false;
                } else if (a.decimalValue().compareTo(b.decimalValue()) != 0) return false;
            }
            return true;
        } catch (JsonProcessingException e) {
            throw new BusinessException("Dữ liệu lịch sử lương không hợp lệ", HttpStatus.CONFLICT);
        }
    }

    @Transactional(isolation = Isolation.SERIALIZABLE)
    public UUID reconcile(UUID storeId, String type, UUID entityId, HistoricalCompensationRequest request, UUID actorId) {
        if (storeId == null || entityId == null || actorId == null || request == null || request.getEffectiveDate() == null
                || request.getEvidence() == null || request.getEvidence().trim().length() < 10
                || request.getEvidence().trim().length() > 2000) {
            throw new BusinessException("Cần cung cấp ngày hiệu lực và căn cứ đối soát từ 10 đến 2000 ký tự", HttpStatus.BAD_REQUEST);
        }
        if (type == null || !Set.of("employment", "contract_type", "skill").contains(type)) {
            throw new BusinessException("Loại điều khoản lương không hợp lệ", HttpStatus.BAD_REQUEST);
        }
        if (request.getEffectiveDate().isAfter(LocalDate.now(CompensationEffectiveDate.BUSINESS_ZONE))) {
            throw new BusinessException("Ngày đối soát lịch sử không được ở tương lai", HttpStatus.BAD_REQUEST);
        }

        Set<UUID> affected = new HashSet<>();
        affected.add(storeId);
        if ("skill".equals(type)) affected.addAll(assignments.findSupportPayrollStoresForSkill(entityId));
        guard.lockStores(affected);

        requireOwned(storeId, type, entityId);
        LocalDate first = revisions.findFirstEffectiveDate(type, entityId)
                .orElseThrow(() -> new BusinessException("Thiếu dữ liệu gốc để đối soát", HttpStatus.CONFLICT));
        if (!request.getEffectiveDate().isBefore(first)) {
            throw new BusinessException("Ngày đối soát phải trước lịch sử đã biết đầu tiên", HttpStatus.CONFLICT);
        }

        Object terms;
        switch (type) {
            case "employment" -> {
                if (request.getContractTypeId() == null || request.getMaxWeeklyHours() != null || request.getOtMultiplier() != null)
                    throw new BusinessException("Điều khoản nhân viên không hợp lệ", HttpStatus.BAD_REQUEST);
                Integer contractOwned = jdbc.queryForObject("SELECT count(*) FROM contract_type WHERE id=? AND store_id=?",
                        Integer.class, request.getContractTypeId(), storeId);
                if (contractOwned == null || contractOwned != 1)
                    throw new BusinessException("Hợp đồng không thuộc chi nhánh", HttpStatus.BAD_REQUEST);
                terms = new CompensationRevisionResolver.EmploymentTerms(request.getContractTypeId(), request.getHourlyRate());
            }
            case "contract_type" -> {
                if (request.getContractTypeId() != null || request.getMaxWeeklyHours() == null)
                    throw new BusinessException("Điều khoản loại hợp đồng không hợp lệ", HttpStatus.BAD_REQUEST);
                terms = new CompensationRevisionResolver.ContractTerms(request.getHourlyRate(), request.getMaxWeeklyHours(), request.getOtMultiplier());
            }
            case "skill" -> {
                if (request.getContractTypeId() != null || request.getMaxWeeklyHours() != null || request.getOtMultiplier() != null)
                    throw new BusinessException("Điều khoản vị trí không hợp lệ", HttpStatus.BAD_REQUEST);
                terms = new CompensationRevisionResolver.SkillTerms(request.getHourlyRate());
            }
            default -> throw new IllegalStateException("Loại điều khoản không hợp lệ");
        }
        try {
            UUID revisionId = writer.insert(type, entityId, affected, request.getEffectiveDate(), json.writeValueAsString(terms), actorId);
            jdbc.update("INSERT INTO payroll_reconciliation_evidence(revision_id,actor_id,evidence) VALUES (?,?,?)",
                    revisionId, actorId, request.getEvidence().trim());
            return revisionId;
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Không thể lưu căn cứ điều khoản lương", e);
        }
    }
}
