import sys

file_path = 'src/main/java/com/shiftsync/payroll/repository/PayrollPeriodRepository.java'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()
if "boolean existsByStoreIdAndStartDateLessThanEqualAndEndDateGreaterThanEqualAndStatusIn" not in content:
    content = content.replace("java.util.Optional<PayrollPeriod> findByStoreIdAndStartDateAndEndDate(UUID storeId, LocalDate startDate, LocalDate endDate);", "java.util.Optional<PayrollPeriod> findByStoreIdAndStartDateAndEndDate(UUID storeId, LocalDate startDate, LocalDate endDate);\n    boolean existsByStoreIdAndStartDateLessThanEqualAndEndDateGreaterThanEqualAndStatusIn(UUID storeId, LocalDate date1, LocalDate date2, List<com.shiftsync.payroll.enums.PayrollPeriodStatus> statuses);")
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

file_path = 'src/main/java/com/shiftsync/payroll/service/PayrollCalculationService.java'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

method_code = '''
    @Transactional(readOnly = true)
    public boolean isDateLocked(java.util.UUID storeId, java.time.LocalDate date) {
        return payrollPeriodRepository.existsByStoreIdAndStartDateLessThanEqualAndEndDateGreaterThanEqualAndStatusIn(
                storeId, date, date, java.util.Arrays.asList(com.shiftsync.payroll.enums.PayrollPeriodStatus.CONFIRMED, com.shiftsync.payroll.enums.PayrollPeriodStatus.PAID));
    }
'''

last_brace_index = content.rfind('}')
if last_brace_index != -1:
    new_content = content[:last_brace_index] + method_code + '\n}\n'
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Added isDateLocked to PayrollCalculationService")
else:
    print("Could not find closing brace")
