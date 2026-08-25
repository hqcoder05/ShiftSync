import os

path = "src/main/java/com/shiftsync/shift/service/ShiftValidationService.java"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace("private final ShiftRepository shiftRepository;", "private final ShiftRepository shiftRepository;\n    private final EmploymentRepository employmentRepository;")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
