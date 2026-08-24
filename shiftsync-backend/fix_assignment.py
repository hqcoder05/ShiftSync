import sys
import re

file_path = 'src/main/java/com/shiftsync/shift/service/ShiftAssignmentService.java'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix assignStaff
content = re.sub(r'(public ShiftAssignmentResponseDTO assignStaff\(UUID storeId, UUID shiftId, ShiftAssignmentCreateRequest request\) \{[\s\S]*?Shift shift = shiftRepository\.findByIdAndStoreId\(shiftId, storeId\)[\s\S]*?\.orElseThrow\(\(\) -> new BusinessException\("Shift not found", HttpStatus\.NOT_FOUND\)\);)', r'\1\n        checkDateNotLocked(storeId, shift.getShiftDate());', content)

# Fix deleteAssignment
content = re.sub(r'(public void deleteAssignment\(UUID storeId, UUID shiftId, UUID assignmentId\) \{[\s\S]*?ShiftAssignment assignment = shiftAssignmentRepository\.findById\(assignmentId\)[\s\S]*?\.orElseThrow\(\(\) -> new BusinessException\("Assignment not found", HttpStatus\.NOT_FOUND\)\);)', r'\1\n        checkDateNotLocked(storeId, assignment.getShift().getShiftDate());', content)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed ShiftAssignmentService")
