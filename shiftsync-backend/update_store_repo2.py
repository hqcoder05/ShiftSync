import re
with open('src/main/java/com/shiftsync/store/repository/StoreRepository.java', 'r') as f:
    content = f.read()

new_queries = '''    @Query(value = "SELECT EXISTS (SELECT 1 FROM employment WHERE store_id = :storeId AND status = 'ACTIVE')", nativeQuery = true)
    boolean hasActiveEmployees(@Param("storeId") UUID storeId);

    @Query(value = "SELECT EXISTS (" +
            "SELECT 1 FROM shift WHERE store_id = :storeId AND status = 'PUBLISHED' " +
            "AND shift_date >= CURRENT_DATE" +
            ")", nativeQuery = true)
    boolean hasFuturePublishedShifts(@Param("storeId") UUID storeId);'''

content = re.sub(r'    @Query\(value = "SELECT EXISTS \(" \+.*?boolean hasRelatedRecords\(@Param\("storeId"\) UUID storeId\);', new_queries, content, flags=re.DOTALL)

with open('src/main/java/com/shiftsync/store/repository/StoreRepository.java', 'w') as f:
    f.write(content)
