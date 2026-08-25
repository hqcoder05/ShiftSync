import os
import re

path = "src/main/java/com/shiftsync/employment/service/EmploymentService.java"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace(".employmentType(request.getEmploymentType())", "")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
