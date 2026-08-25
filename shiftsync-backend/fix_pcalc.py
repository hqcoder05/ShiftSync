import os
import re

path = "src/main/java/com/shiftsync/payroll/service/PayrollCalculationService.java"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old_get_max = """private int getMaxWeeklyHours(Employment employment) {
        return switch (employment.getEmploymentType()) {
            case FULL_TIME -> 48;
            case PART_TIME -> 24;
            case INTERN -> 20;
            case SEASONAL -> 40;
        };
    }"""
content = content.replace(old_get_max, "")

# if order of cases was different
content = re.sub(r'private int getMaxWeeklyHours.*?};.*?}', '', content, flags=re.DOTALL)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
