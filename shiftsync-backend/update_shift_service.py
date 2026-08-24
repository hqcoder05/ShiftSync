import sys
import re

file_path = 'src/main/java/com/shiftsync/shift/service/ShiftService.java'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

import_statement = "import com.shiftsync.payroll.repository.PayrollPeriodRepository;\nimport com.shiftsync.payroll.enums.PayrollPeriodStatus;\nimport java.util.Arrays;\n"
content = content.replace("import com.shiftsync.shared.exception.BusinessException;", import_statement + "import com.shiftsync.shared.exception.BusinessException;")

content = content.replace("private final SkillRepository skillRepository;", "private final SkillRepository skillRepository;\n    private final PayrollPeriodRepository payrollPeriodRepository;")

check_method = '''
    private void checkDateNotLocked(UUID storeId, java.time.LocalDate date) {
        if (payrollPeriodRepository.existsByStoreIdAndStartDateLessThanEqualAndEndDateGreaterThanEqualAndStatusIn(
                storeId, date, date, Arrays.asList(PayrollPeriodStatus.CONFIRMED, PayrollPeriodStatus.PAID))) {
            throw new BusinessException("Cannot modify shift because its date falls in a LOCKED/PAID payroll period.", HttpStatus.BAD_REQUEST);
        }
    }
'''

content = content.replace("public List<ShiftDTO> getShiftsByStoreId", check_method + "\n    public List<ShiftDTO> getShiftsByStoreId")

# Add check to createShift
content = re.sub(r'(public ShiftDTO createShift\(UUID storeId, ShiftCreateRequest request\) \{[^\{]*verifyStoreExists\(storeId\);)', r'\1\n        checkDateNotLocked(storeId, request.getShiftDate());', content)

# Add check to updateShift
content = re.sub(r'(public ShiftDTO updateShift\(UUID storeId, UUID shiftId, ShiftCreateRequest request\) \{[\s\S]*?Shift shift = shiftRepository\.findById\(shiftId\)[\s\S]*?\.orElseThrow[^\;]*;)', r'\1\n        checkDateNotLocked(storeId, shift.getShiftDate());\n        checkDateNotLocked(storeId, request.getShiftDate());', content)

# Add check to deleteShift
content = re.sub(r'(public void deleteShift\(UUID storeId, UUID shiftId\) \{[\s\S]*?Shift shift = shiftRepository\.findById\(shiftId\)[\s\S]*?\.orElseThrow[^\;]*;)', r'\1\n        checkDateNotLocked(storeId, shift.getShiftDate());', content)

# Add check to setShiftRequirements
content = re.sub(r'(public ShiftDTO setShiftRequirements\(UUID storeId, UUID shiftId, List<ShiftRequirementRequest> requirements\) \{[\s\S]*?Shift shift = shiftRepository\.findById\(shiftId\)[\s\S]*?\.orElseThrow[^\;]*;)', r'\1\n        checkDateNotLocked(storeId, shift.getShiftDate());', content)

# Add check to publishShifts (need to loop through shifts and check)
# It fetches unnotified shifts
# We can check during the loop
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Injected checkDateNotLocked to ShiftService")
