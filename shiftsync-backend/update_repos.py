import sys

# 1. Update PayrollPeriodRepository
file_path = 'src/main/java/com/shiftsync/payroll/repository/PayrollPeriodRepository.java'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()
if "Optional<PayrollPeriod> findByStoreIdAndStartDateAndEndDate" not in content:
    content = content.replace("boolean existsByStoreIdAndStartDateAndEndDate(UUID storeId, LocalDate startDate, LocalDate endDate);", "boolean existsByStoreIdAndStartDateAndEndDate(UUID storeId, LocalDate startDate, LocalDate endDate);\n    java.util.Optional<PayrollPeriod> findByStoreIdAndStartDateAndEndDate(UUID storeId, LocalDate startDate, LocalDate endDate);")
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

# 2. Update PayrollRepository
file_path = 'src/main/java/com/shiftsync/payroll/repository/PayrollRepository.java'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()
if "void deleteByPayrollPeriod" not in content:
    content = content.replace("List<Payroll> findByPayrollPeriodId(UUID payrollPeriodId);", "List<Payroll> findByPayrollPeriodId(UUID payrollPeriodId);\n    void deleteByPayrollPeriod(com.shiftsync.payroll.entity.PayrollPeriod payrollPeriod);")
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

print("Updated Repositories")
