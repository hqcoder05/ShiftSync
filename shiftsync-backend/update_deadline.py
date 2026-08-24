import re
with open('src/main/java/com/shiftsync/shift/service/ShiftService.java', 'r') as f:
    content = f.read()

s_old = '''        Shift shift = Shift.builder()
                .store(store)
                .shiftTemplate(template)
                .shiftDate(request.getShiftDate())
                .startTime(request.getStartTime())
                .endTime(request.getEndTime())
                .status(ShiftStatus.DRAFT)
                .availabilityDeadline(request.getAvailabilityDeadline())
                .build();'''

s_new = '''        java.time.ZonedDateTime deadline = request.getAvailabilityDeadline();
        if (deadline == null) {
            com.shiftsync.store.entity.StoreConfiguration config = storeConfigRepository.findByStoreId(storeId).orElse(null);
            int deadlineHours = config != null ? config.getAvailabilityDeadlineHours() : 24;
            deadline = java.time.ZonedDateTime.of(request.getShiftDate(), request.getStartTime(), java.time.ZoneId.of("UTC")).minusHours(deadlineHours);
        }

        Shift shift = Shift.builder()
                .store(store)
                .shiftTemplate(template)
                .shiftDate(request.getShiftDate())
                .startTime(request.getStartTime())
                .endTime(request.getEndTime())
                .status(ShiftStatus.DRAFT)
                .availabilityDeadline(deadline)
                .build();'''

content = content.replace(s_old, s_new)

with open('src/main/java/com/shiftsync/shift/service/ShiftService.java', 'w') as f:
    f.write(content)
