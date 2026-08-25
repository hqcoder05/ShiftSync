import os

path = "src/main/java/com/shiftsync/employment/repository/EmploymentRepository.java"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace("List<Employment> findByUserIdAndStatus(UUID staffId, EmploymentStatus status);", "List<Employment> findByUserIdAndStatus(UUID staffId, EmploymentStatus status);\n\n    List<Employment> findByUserIdAndStoreIdAndStatus(UUID userId, UUID storeId, EmploymentStatus status);")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
