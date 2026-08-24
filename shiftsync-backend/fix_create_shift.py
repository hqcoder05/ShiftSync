import sys

file_path = 'src/main/java/com/shiftsync/shift/service/ShiftService.java'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

target = "public ShiftDTO createShift(UUID storeId, ShiftCreateRequest request) {"
replacement = target + "\n        checkDateNotLocked(storeId, request.getShiftDate());"
content = content.replace(target, replacement)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed createShift")
