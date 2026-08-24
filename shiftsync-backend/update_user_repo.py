import re
with open('src/main/java/com/shiftsync/auth/repository/UserRepository.java', 'r') as f:
    content = f.read()

new_queries = '''    @Query(value = "SELECT EXISTS (" +
            "SELECT 1 FROM employment e " +
            "JOIN staff u ON e.staff_id = u.id " +
            "WHERE e.staff_id = :userId AND e.status = 'ACTIVE' AND u.system_role = 'MANAGER' " +
            "AND NOT EXISTS (" +
            "    SELECT 1 FROM employment e2 " +
            "    JOIN staff u2 ON e2.staff_id = u2.id " +
            "    WHERE e2.store_id = e.store_id AND e2.status = 'ACTIVE' AND u2.system_role = 'MANAGER' AND u2.id != :userId AND u2.deleted = false" +
            "))", nativeQuery = true)
    boolean isSoleManagerOfAnyStore(@Param("userId") UUID userId);

    @Query(value = "SELECT EXISTS (SELECT 1 FROM employment WHERE staff_id = :userId AND status = 'ACTIVE')", nativeQuery = true)
    boolean hasActiveEmployment(@Param("userId") UUID userId);

    @Query(value = "SELECT EXISTS (" +
            "SELECT 1 FROM shift_assignment sa " +
            "JOIN shift s ON sa.shift_id = s.id " +
            "WHERE sa.staff_id = :userId AND s.status = 'PUBLISHED' " +
            "AND s.shift_date >= CURRENT_DATE AND sa.deleted = false" +
            ")", nativeQuery = true)
    boolean hasFuturePublishedShifts(@Param("userId") UUID userId);'''

content = re.sub(r'    @Query\(value = "SELECT EXISTS \(" \+.*?boolean hasRelatedRecords\(@Param\("userId"\) UUID userId\);', new_queries, content, flags=re.DOTALL)

with open('src/main/java/com/shiftsync/auth/repository/UserRepository.java', 'w') as f:
    f.write(content)
