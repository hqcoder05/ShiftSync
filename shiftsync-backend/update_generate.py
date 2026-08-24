import sys

file_path = 'src/main/java/com/shiftsync/payroll/service/PayrollCalculationService.java'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

target = "if (payrollPeriodRepository.existsByStoreIdAndStartDateAndEndDate(storeId, startDate, endDate)) {"
replacement = """
        java.util.Optional<PayrollPeriod> existingOpt = payrollPeriodRepository.findByStoreIdAndStartDateAndEndDate(storeId, startDate, endDate);
        if (existingOpt.isPresent()) {
            if (existingOpt.get().getStatus() != com.shiftsync.payroll.enums.PayrollPeriodStatus.DRAFT) {
                throw new BusinessException("Cannot regenerate payroll. Period is already " + existingOpt.get().getStatus(), HttpStatus.CONFLICT);
            }
            // Delete old payrolls for this period so we can regenerate
            payrollRepository.deleteByPayrollPeriod(existingOpt.get());
        }
"""
if target in content:
    content = content.replace(target + "\n            throw new BusinessException(\"Payroll period already exists for this date range.\", HttpStatus.CONFLICT);\n        }", replacement)
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Modified generatePayroll")
else:
    print("Target not found")
