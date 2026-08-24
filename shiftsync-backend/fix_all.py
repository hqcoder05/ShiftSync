import sys
import re

file_path = 'src/main/java/com/shiftsync/shift/service/ShiftService.java'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix updateShift
content = re.sub(r'(public ShiftDTO updateShift\(UUID storeId, UUID shiftId, ShiftCreateRequest request\) \{[\s\S]*?\.orElseThrow\(\(\) -> new BusinessException\("Shift not found", HttpStatus\.NOT_FOUND\)\);)', r'\1\n        checkDateNotLocked(storeId, shift.getShiftDate());\n        checkDateNotLocked(storeId, request.getShiftDate());', content)

# Fix deleteShift
content = re.sub(r'(public void deleteShift\(UUID storeId, UUID shiftId\) \{[\s\S]*?\.orElseThrow\(\(\) -> new BusinessException\("Shift not found", HttpStatus\.NOT_FOUND\)\);)', r'\1\n        checkDateNotLocked(storeId, shift.getShiftDate());', content)

# Fix setShiftRequirements
content = re.sub(r'(public ShiftDTO setShiftRequirements\(UUID storeId, UUID shiftId, List<ShiftRequirementRequest> requirements\) \{[\s\S]*?\.orElseThrow\(\(\) -> new BusinessException\("Shift not found", HttpStatus\.NOT_FOUND\)\);)', r'\1\n        checkDateNotLocked(storeId, shift.getShiftDate());', content)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed all methods in ShiftService")
