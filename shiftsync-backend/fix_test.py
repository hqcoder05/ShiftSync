import re

with open("src/test/java/com/shiftsync/shift/service/ShiftAssignmentServiceTest.java", "r", encoding="utf-8") as f:
    content = f.read()

# Replace @InjectMocks with manual setup
content = re.sub(
    r"@InjectMocks\s*private ShiftAssignmentService service;",
    "private ShiftAssignmentValidator shiftAssignmentValidator;\n    private ShiftAssignmentService service;",
    content
)

# Find setup()
setup_code = """
        shiftAssignmentValidator = new ShiftAssignmentValidator(
            availabilityRepository, blackoutDateRepository, shiftAssignmentRepository, staffSkillRepository, shiftValidationService
        );
        service = new ShiftAssignmentService(
            shiftRepository, shiftAssignmentRepository, availabilityRepository, blackoutDateRepository, employmentRepository, userRepository,
            payrollPeriodRepository, shiftValidationService, shiftAssignmentValidator, staffSkillRepository
        );
"""
content = re.sub(
    r"(void setup\(\) \{)",
    r"\1" + setup_code,
    content
)

with open("src/test/java/com/shiftsync/shift/service/ShiftAssignmentServiceTest.java", "w", encoding="utf-8") as f:
    f.write(content)
