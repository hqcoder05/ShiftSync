import re
with open('src/main/java/com/shiftsync/shift/service/ShiftAssignmentService.java', 'r') as f:
    content = f.read()

content = content.replace(
    '''        boolean hasBlackout = blackoutDateRepository.existsByStaffIdAndDate(staffId, shift.getShiftDate());
        if (hasBlackout) {
            throw new BusinessException("Staff not available: Shift time is outside registered availability", HttpStatus.BAD_REQUEST);
        }''',
    '''        boolean hasBlackout = blackoutDateRepository.existsByStaffIdAndDate(staffId, shift.getShiftDate());
        if (hasBlackout) {
            throw new BusinessException("Staff not available: Has blackout date on shift day", HttpStatus.BAD_REQUEST);
        }'''
)

with open('src/main/java/com/shiftsync/shift/service/ShiftAssignmentService.java', 'w') as f:
    f.write(content)
