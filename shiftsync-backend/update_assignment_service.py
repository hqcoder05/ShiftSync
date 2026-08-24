import sys
import re

file_path = 'src/main/java/com/shiftsync/shift/service/ShiftAssignmentService.java'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

import_statement = "import com.shiftsync.payroll.repository.PayrollPeriodRepository;\nimport com.shiftsync.payroll.enums.PayrollPeriodStatus;\nimport java.util.Arrays;\n"
content = content.replace("import com.shiftsync.shared.exception.BusinessException;", import_statement + "import com.shiftsync.shared.exception.BusinessException;")

content = content.replace("private final UserRepository userRepository;", "private final UserRepository userRepository;\n    private final PayrollPeriodRepository payrollPeriodRepository;")

check_method = '''
    private void checkDateNotLocked(UUID storeId, java.time.LocalDate date) {
        if (payrollPeriodRepository.existsByStoreIdAndStartDateLessThanEqualAndEndDateGreaterThanEqualAndStatusIn(
                storeId, date, date, Arrays.asList(PayrollPeriodStatus.CONFIRMED, PayrollPeriodStatus.PAID))) {
            throw new BusinessException("Cannot modify assignment because its date falls in a LOCKED/PAID payroll period.", HttpStatus.BAD_REQUEST);
        }
    }
'''

content = content.replace("public ShiftAssignmentResponseDTO assignStaff", check_method + "\n    public ShiftAssignmentResponseDTO assignStaff")

# Add check to assignStaff
content = re.sub(r'(public ShiftAssignmentResponseDTO assignStaff\(UUID storeId, UUID shiftId, ShiftAssignmentCreateRequest request\) \{[\s\S]*?Shift shift = shiftRepository\.findById\(shiftId\)[\s\S]*?\.orElseThrow[^\;]*;)', r'\1\n        checkDateNotLocked(storeId, shift.getShiftDate());', content)

# Add check to deleteAssignment
content = re.sub(r'(public void deleteAssignment\(UUID storeId, UUID shiftId, UUID assignmentId\) \{[\s\S]*?ShiftAssignment assignment = shiftAssignmentRepository\.findById\(assignmentId\)[\s\S]*?\.orElseThrow[^\;]*;)', r'\1\n        checkDateNotLocked(storeId, assignment.getShift().getShiftDate());', content)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Injected checkDateNotLocked to ShiftAssignmentService")
