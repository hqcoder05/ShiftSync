import os
import glob
import re

test_files = glob.glob("src/test/java/com/shiftsync/**/*.java", recursive=True)

for file in test_files:
    with open(file, "r", encoding="utf-8") as f:
        content = f.read()

    # Import replacement
    content = content.replace("import com.shiftsync.employment.enums.EmploymentType;", "import com.shiftsync.employment.entity.ContractType;")
    
    # ContractType construction
    ct_mock = 'ContractType.builder().id(java.util.UUID.randomUUID()).name("FULL_TIME").maxWeeklyHours(48).otMultiplier(new java.math.BigDecimal("1.50")).defaultHourlyRate(new java.math.BigDecimal("20.00")).build()'
    
    content = re.sub(r'EmploymentType\.FULL_TIME', ct_mock, content)
    content = re.sub(r'EmploymentType\.PART_TIME', ct_mock.replace("FULL_TIME", "PART_TIME").replace("48", "24"), content)
    
    # .employmentType( -> .contractType(
    content = content.replace(".employmentType(", ".contractType(")
    
    with open(file, "w", encoding="utf-8") as f:
        f.write(content)
