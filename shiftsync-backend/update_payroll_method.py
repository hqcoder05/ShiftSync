import sys
import re

file_path = 'src/main/java/com/shiftsync/payroll/service/PayrollCalculationService.java'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

method_code = '''
    @Transactional
    public void updatePayrollPeriodStatus(java.util.UUID storeId, java.util.UUID periodId, com.shiftsync.payroll.enums.PayrollPeriodStatus newStatus) {
        PayrollPeriod period = payrollPeriodRepository.findById(periodId)
                .orElseThrow(() -> new BusinessException("Payroll period not found.", HttpStatus.NOT_FOUND));

        if (!period.getStore().getId().equals(storeId)) {
            throw new BusinessException("Payroll period does not belong to this store.", HttpStatus.FORBIDDEN);
        }

        // Validate One-way state transition: DRAFT -> CONFIRMED -> PAID
        if (period.getStatus() == com.shiftsync.payroll.enums.PayrollPeriodStatus.PAID) {
            throw new BusinessException("Cannot change status of a PAID payroll period.", HttpStatus.BAD_REQUEST);
        }
        if (period.getStatus() == com.shiftsync.payroll.enums.PayrollPeriodStatus.CONFIRMED && newStatus == com.shiftsync.payroll.enums.PayrollPeriodStatus.DRAFT) {
            throw new BusinessException("Cannot revert CONFIRMED payroll period back to DRAFT.", HttpStatus.BAD_REQUEST);
        }
        if (period.getStatus() == com.shiftsync.payroll.enums.PayrollPeriodStatus.DRAFT && newStatus == com.shiftsync.payroll.enums.PayrollPeriodStatus.PAID) {
            throw new BusinessException("Cannot skip CONFIRMED state. Must confirm before paying.", HttpStatus.BAD_REQUEST);
        }

        period.setStatus(newStatus);
        payrollPeriodRepository.save(period);
    }
'''

# Find the last closing brace
last_brace_index = content.rfind('}')
if last_brace_index != -1:
    new_content = content[:last_brace_index] + method_code + '\n}\n'
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Added updatePayrollPeriodStatus to PayrollCalculationService")
else:
    print("Could not find closing brace")
