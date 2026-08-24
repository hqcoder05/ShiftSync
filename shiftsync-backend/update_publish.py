import sys

file_path = 'src/main/java/com/shiftsync/shift/service/ShiftService.java'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

target = "if (shift.getStatus() == ShiftStatus.DRAFT) {"
replacement = """
            checkDateNotLocked(storeId, shift.getShiftDate());
            if (shift.getStatus() == ShiftStatus.DRAFT) {
"""

content = content.replace(target, replacement)
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated publishShifts")
