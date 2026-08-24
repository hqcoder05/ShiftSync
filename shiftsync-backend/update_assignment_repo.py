with open('src/main/java/com/shiftsync/shift/repository/ShiftAssignmentRepository.java', 'r') as f:
    content = f.read()

new_query = '''    @Query("SELECT sa.shift.id FROM ShiftAssignment sa WHERE sa.staff.id = :staffId AND sa.shift.status = 'PUBLISHED' AND sa.shift.shiftDate >= :startDate AND sa.shift.shiftDate <= :endDate")
    List<UUID> findConflictingPublishedShiftIds(@Param("staffId") UUID staffId, @Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);
}'''
content = content.replace('}', new_query)

with open('src/main/java/com/shiftsync/shift/repository/ShiftAssignmentRepository.java', 'w') as f:
    f.write(content)
