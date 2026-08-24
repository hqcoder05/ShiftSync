import sys

file_path = 'src/main/java/com/shiftsync/attendance/service/AttendanceService.java'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

if "import com.shiftsync.payroll.repository.PayrollPeriodRepository;" not in content:
    content = content.replace("import com.shiftsync.shared.exception.BusinessException;", "import com.shiftsync.shared.exception.BusinessException;\nimport com.shiftsync.payroll.repository.PayrollPeriodRepository;\nimport com.shiftsync.payroll.enums.PayrollPeriodStatus;\nimport java.util.Arrays;")

if "private final PayrollPeriodRepository payrollPeriodRepository;" not in content:
    content = content.replace("private final QRCodeService qrCodeService;", "private final QRCodeService qrCodeService;\n    private final PayrollPeriodRepository payrollPeriodRepository;")

check_method = '''
    private void checkDateNotLocked(java.util.UUID storeId, java.time.LocalDate date) {
        if (payrollPeriodRepository.existsByStoreIdAndStartDateLessThanEqualAndEndDateGreaterThanEqualAndStatusIn(
                storeId, date, date, Arrays.asList(PayrollPeriodStatus.CONFIRMED, PayrollPeriodStatus.PAID))) {
            throw new BusinessException("Cannot modify attendance because its date falls in a LOCKED/PAID payroll period.", org.springframework.http.HttpStatus.BAD_REQUEST);
        }
    }
'''

if "checkDateNotLocked" not in content:
    content = content.replace("public QrResponseDTO processQrCode", check_method + "\n    public QrResponseDTO processQrCode")
    content = content.replace("Shift shift = shiftAssignment.getShift();", "Shift shift = shiftAssignment.getShift();\n        checkDateNotLocked(shift.getStore().getId(), shift.getShiftDate());")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
