package com.shiftsync.payroll.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.shiftsync.payroll.repository.CompensationRevisionRepository;
import com.shiftsync.employment.repository.ContractTypeRepository;
import com.shiftsync.shared.exception.BusinessException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

/** Resolves a complete revision, rather than mixing values from different dates. */
@Service
@RequiredArgsConstructor
public class CompensationRevisionResolver {
    private final CompensationRevisionRepository revisions;
    private final ObjectMapper json;
    private final ContractTypeRepository contracts;
    private final com.shiftsync.skill.repository.SkillRepository skills;

    public record EmploymentTerms(UUID contractTypeId, BigDecimal hourlyRate) {}
    public record ContractTerms(BigDecimal defaultHourlyRate, int maxWeeklyHours, BigDecimal otMultiplier) {}
    public record SkillTerms(BigDecimal hourlyRate) {}
    public record PayTerms(BigDecimal hourlyRate, int maxWeeklyHours, BigDecimal otMultiplier) {}

    public java.util.Optional<LocalDate> nextEffectiveDate(String type, UUID id, LocalDate after) {
        return revisions.findNextEffectiveDate(type, id, after);
    }

    public int weeklyHoursForEmployment(com.shiftsync.employment.entity.Employment employment, LocalDate date) {
        var terms = requireAt("employment", employment.getId(), date, EmploymentTerms.class);
        if (employment.getStore() == null || contracts.findByIdAndStoreId(terms.contractTypeId(), employment.getStore().getId()).isEmpty()) {
            throw new BusinessException("Hợp đồng trong lịch sử không thuộc chi nhánh quản lý; cần đối soát", HttpStatus.CONFLICT);
        }
        return requireAt("contract_type", terms.contractTypeId(), date, ContractTerms.class).maxWeeklyHours();
    }

    /** Resolve all inputs against the same business date, including a changed contract. */
    public PayTerms resolvePayTerms(UUID employmentId, UUID homeStoreId, UUID shiftStoreId, UUID skillId, LocalDate date) {
        EmploymentTerms employment = requireAt("employment", employmentId, date, EmploymentTerms.class);
        if (homeStoreId == null || contracts.findByIdAndStoreId(employment.contractTypeId(), homeStoreId).isEmpty()) {
            throw new BusinessException("Hợp đồng trong lịch sử không thuộc chi nhánh quản lý; cần đối soát", HttpStatus.CONFLICT);
        }
        ContractTerms contract = requireAt("contract_type", employment.contractTypeId(), date, ContractTerms.class);
        BigDecimal rate = employment.hourlyRate();
        if (skillId != null) {
            if (shiftStoreId == null || skills.findByIdAndStoreId(skillId, shiftStoreId).isEmpty()) {
                throw new BusinessException("Vị trí trong lịch sử không thuộc chi nhánh của ca; cần đối soát", HttpStatus.CONFLICT);
            }
            BigDecimal skillRate = requireAt("skill", skillId, date, SkillTerms.class).hourlyRate();
            if (skillRate.signum() > 0) rate = skillRate;
        }
        return new PayTerms(rate, contract.maxWeeklyHours(), contract.otMultiplier());
    }

    public <T> T requireAt(String type, UUID id, LocalDate date, Class<T> target) {
        boolean matchingType = ("employment".equals(type) && target == EmploymentTerms.class)
                || ("contract_type".equals(type) && target == ContractTerms.class)
                || ("skill".equals(type) && target == SkillTerms.class);
        if (!matchingType || id == null || date == null) {
            throw new IllegalArgumentException("Loại hoặc thông tin truy vấn lịch sử lương không hợp lệ");
        }
        if (revisions.hasUntrackedCompensationChange(type, id)) {
            throw new BusinessException("Có thay đổi lương chưa được ghi ngày hiệu lực; cần đối soát trước khi tính lương", HttpStatus.CONFLICT);
        }
        String values = revisions.findEffectiveValues(type, id, date)
                .orElseThrow(() -> new BusinessException("Thiếu lịch sử điều khoản lương cho ngày " + date
                        + "; cần đối soát trước khi tính lương", HttpStatus.CONFLICT));
        return parseAndValidate(values, target, HttpStatus.CONFLICT);
    }

    public void validateNewRevision(String type, String values) {
        Class<?> target = switch (type == null ? "" : type) {
            case "employment" -> EmploymentTerms.class;
            case "contract_type" -> ContractTerms.class;
            case "skill" -> SkillTerms.class;
            default -> throw new BusinessException("Loại điều khoản lương không hợp lệ", HttpStatus.BAD_REQUEST);
        };
        parseAndValidate(values, target, HttpStatus.BAD_REQUEST);
    }

    private <T> T parseAndValidate(String values, Class<T> target, HttpStatus errorStatus) {
        try {
            T result = json.readValue(values, target);
            boolean valid = switch (result) {
                case EmploymentTerms t -> t.contractTypeId() != null && positive(t.hourlyRate());
                case ContractTerms t -> positive(t.defaultHourlyRate()) && t.maxWeeklyHours() > 0
                        && t.otMultiplier() != null && t.otMultiplier().compareTo(BigDecimal.ONE) >= 0;
                case SkillTerms t -> t.hourlyRate() != null && t.hourlyRate().signum() >= 0;
                default -> false;
            };
            if (!valid) throw new IllegalArgumentException("Incomplete compensation revision");
            return result;
        } catch (Exception e) {
            throw new BusinessException("Dữ liệu điều khoản lương không hợp lệ hoặc chưa đầy đủ", errorStatus);
        }
    }

    private static boolean positive(BigDecimal value) {
        return value != null && value.signum() > 0;
    }
}
