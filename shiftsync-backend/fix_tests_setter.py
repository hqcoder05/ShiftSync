import os
import glob
import re

test_files = glob.glob("src/test/java/com/shiftsync/**/*.java", recursive=True)

for file in test_files:
    with open(file, "r", encoding="utf-8") as f:
        content = f.read()
    
    content = content.replace("setEmploymentType(", "setContractType(")
    
    with open(file, "w", encoding="utf-8") as f:
        f.write(content)
