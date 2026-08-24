import sys

file_path = 'src/main/java/com/shiftsync/shift/service/ShiftAssignmentService.java'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

target = "Shift shift = shiftRepository.findByIdAndStoreId(shiftId, storeId)\n                .orElseThrow(() -> new BusinessException(\"Shift not found\", HttpStatus.NOT_FOUND));"
replacement = target + "\n        checkDateNotLocked(storeId, shift.getShiftDate());"
if "checkDateNotLocked(storeId, shift.getShiftDate());" not in content:
    content = content.replace(target, replacement)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed ShiftAssignmentService assignStaffToShift")
