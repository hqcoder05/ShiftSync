import os

path = "src/main/java/com/shiftsync/shift/service/AutoScheduleService.java"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

replacement = """int getMaxWeeklyHours() {
            return employment.getContractType().getMaxWeeklyHours();
        }"""

# Since Python regex can be tricky with newlines, I'll use string replacement
old_code = """int getMaxWeeklyHours() {
            return switch (employment.getEmploymentType()) {
                case FULL_TIME -> 48;
                case PART_TIME -> 24;
                case INTERN -> 20;
                case SEASONAL -> 40;
            };
        }"""

content = content.replace(old_code, replacement)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
