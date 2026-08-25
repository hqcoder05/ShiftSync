import os
import re

path = "src/main/java/com/shiftsync/payroll/service/PayrollCalculationService.java"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace('private static final BigDecimal OT_MULTIPLIER = new BigDecimal("1.50");', '')

# addSegment needs otMultiplier
content = content.replace(
    'void addSegment(double segmentHours, LocalDate date, int maxWeeklyHours, BigDecimal hourlyRate, Map<LocalDate, BigDecimal> holidayMap)',
    'void addSegment(double segmentHours, LocalDate date, int maxWeeklyHours, BigDecimal hourlyRate, Map<LocalDate, BigDecimal> holidayMap, BigDecimal OT_MULTIPLIER)'
)
content = content.replace(
    'totalAcc.addSegment(durationHours, day1, maxWeeklyHours, hourlyRate, holidayMap);',
    'totalAcc.addSegment(durationHours, day1, maxWeeklyHours, hourlyRate, holidayMap, emp.getContractType().getOtMultiplier());'
)
content = content.replace(
    'totalAcc.addSegment(day1Hours, day1, maxWeeklyHours, hourlyRate, holidayMap);',
    'totalAcc.addSegment(day1Hours, day1, maxWeeklyHours, hourlyRate, holidayMap, emp.getContractType().getOtMultiplier());'
)
content = content.replace(
    'totalAcc.addSegment(day2Hours, day2, maxWeeklyHours, hourlyRate, holidayMap);',
    'totalAcc.addSegment(day2Hours, day2, maxWeeklyHours, hourlyRate, holidayMap, emp.getContractType().getOtMultiplier());'
)

# getMaxWeeklyHours
old_get_max = """private int getMaxWeeklyHours(Employment employment) {
        return switch (employment.getEmploymentType()) {
            case FULL_TIME -> 48;
            case PART_TIME -> 24;
            case SEASONAL -> 40;
            case INTERN -> 20;
        };
    }"""
content = content.replace(old_get_max, "")

content = content.replace(
    "int maxWeeklyHours = getMaxWeeklyHours(emp);",
    "int maxWeeklyHours = emp.getContractType().getMaxWeeklyHours();"
)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
