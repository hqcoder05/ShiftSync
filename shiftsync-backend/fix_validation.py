import os
import re

path = "src/main/java/com/shiftsync/shift/service/ShiftValidationService.java"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Imports
content = content.replace("import org.springframework.stereotype.Service;", "import org.springframework.stereotype.Service;\nimport com.shiftsync.employment.repository.EmploymentRepository;\nimport com.shiftsync.employment.entity.Employment;")

# Add repository
content = content.replace("private final ShiftAssignmentRepository shiftAssignmentRepository;", "private final ShiftAssignmentRepository shiftAssignmentRepository;\n    private final EmploymentRepository employmentRepository;")

# Constructor
content = content.replace("public ShiftValidationService(ShiftAssignmentRepository shiftAssignmentRepository) {", "public ShiftValidationService(ShiftAssignmentRepository shiftAssignmentRepository, EmploymentRepository employmentRepository) {")
content = content.replace("this.shiftAssignmentRepository = shiftAssignmentRepository;", "this.shiftAssignmentRepository = shiftAssignmentRepository;\n        this.employmentRepository = employmentRepository;")

# Method body
replacement = """
        Employment employment = employmentRepository.findByUserIdAndStoreIdAndStatus(staffId, newShift.getStore().getId(), com.shiftsync.employment.enums.EmploymentStatus.ACTIVE)
                .stream().findFirst()
                .orElseThrow(() -> new BusinessException("Active employment not found for staff in this store", HttpStatus.BAD_REQUEST));
        int MAX_WEEKLY_HOURS = employment.getContractType().getMaxWeeklyHours();
"""
content = re.sub(r'int MAX_WEEKLY_HOURS = 48;\s*// Can be fetched from StoreConfiguration later', replacement, content)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
