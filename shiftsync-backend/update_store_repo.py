import re
with open('src/main/java/com/shiftsync/store/repository/StoreRepository.java', 'r') as f:
    content = f.read()

old_has = '''    @Query(value = "SELECT EXISTS (" +
            "SELECT 1 FROM employment WHERE store_id = :storeId AND status = 'ACTIVE' " +
            "UNION ALL " +
            "SELECT 1 FROM shift WHERE store_id = :storeId " +
            "UNION ALL " +
            "SELECT 1 FROM payroll_period WHERE store_id = :storeId " +
            "UNION ALL " +
            "SELECT 1 FROM store_configuration WHERE store_id = :storeId " +
            "UNION ALL " +
            "SELECT 1 FROM scheduler_configuration WHERE store_id = :storeId" +
            ")", nativeQuery = true)
    boolean hasRelatedRecords(@Param("storeId") UUID storeId);'''

new_queries = '''    @Query(value = "SELECT EXISTS (SELECT 1 FROM employment WHERE store_id = :storeId AND status = 'ACTIVE')", nativeQuery = true)
    boolean hasActiveEmployees(@Param("storeId") UUID storeId);

    @Query(value = "SELECT EXISTS (" +
            "SELECT 1 FROM shift WHERE store_id = :storeId AND status = 'PUBLISHED' " +
            "AND shift_date >= CURRENT_DATE" +
            ")", nativeQuery = true)
    boolean hasFuturePublishedShifts(@Param("storeId") UUID storeId);'''

if "hasRelatedRecords" in content:
    content = content.replace(old_has, new_queries)
else:
    content = content[:-2] + new_queries + "\n}\n"

with open('src/main/java/com/shiftsync/store/repository/StoreRepository.java', 'w') as f:
    f.write(content)
