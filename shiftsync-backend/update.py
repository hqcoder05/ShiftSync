import re
with open('src/main/java/com/shiftsync/shift/service/ShiftService.java', 'r') as f:
    content = f.read()

content = content.replace('private final StoreRepository storeRepository;',
'private final StoreRepository storeRepository;\n    private final com.shiftsync.store.repository.StoreConfigurationRepository storeConfigRepository;')

s_old = '''        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new BusinessException("Store not found", HttpStatus.NOT_FOUND));

        if (!request.getStartTime().isBefore(request.getEndTime())) {
            throw new BusinessException("Start time must be before end time", HttpStatus.BAD_REQUEST);
        }'''

s_new = '''        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new BusinessException("Store not found", HttpStatus.NOT_FOUND));

        if (!request.getStartTime().isBefore(request.getEndTime())) {
            throw new BusinessException("Start time must be before end time", HttpStatus.BAD_REQUEST);
        }
        
        if (store.getOpenTime() != null && request.getStartTime().isBefore(store.getOpenTime())) {
            throw new BusinessException("Shift start time cannot be before store open time", HttpStatus.BAD_REQUEST);
        }
        
        if (store.getCloseTime() != null && request.getEndTime().isAfter(store.getCloseTime())) {
            throw new BusinessException("Shift end time cannot be after store close time", HttpStatus.BAD_REQUEST);
        }'''

content = content.replace(s_old, s_new)

p_old = '''    @Transactional
    public void publishShifts(UUID storeId, java.time.LocalDate startDate, java.time.LocalDate endDate) {
        verifyStoreExists(storeId);
        List<Shift> shifts = shiftRepository.findByStoreIdAndShiftDateBetween(storeId, startDate, endDate);
        
        int publishedCount = 0;
        for (Shift shift : shifts) {
            if (shift.getStatus() == ShiftStatus.DRAFT) {
                shift.setStatus(ShiftStatus.PUBLISHED);
                publishedCount++;
            }
        }
        
        if (publishedCount > 0) {
            shiftRepository.saveAll(shifts);
        }
    }'''

p_new = '''    @Transactional
    public void publishShifts(UUID storeId, java.time.LocalDate startDate, java.time.LocalDate endDate) {
        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new BusinessException("Store not found", HttpStatus.NOT_FOUND));
        List<Shift> shifts = shiftRepository.findByStoreIdAndShiftDateBetween(storeId, startDate, endDate);
        
        int publishedCount = 0;
        for (Shift shift : shifts) {
            if (shift.getStatus() == ShiftStatus.DRAFT) {
                if (store.getOpenTime() != null && shift.getStartTime().isBefore(store.getOpenTime())) {
                    throw new BusinessException("Shift " + shift.getId() + " start time is before store open time", HttpStatus.BAD_REQUEST);
                }
                if (store.getCloseTime() != null && shift.getEndTime().isAfter(store.getCloseTime())) {
                    throw new BusinessException("Shift " + shift.getId() + " end time is after store close time", HttpStatus.BAD_REQUEST);
                }
                shift.setStatus(ShiftStatus.PUBLISHED);
                publishedCount++;
            }
        }
        
        if (publishedCount > 0) {
            shiftRepository.saveAll(shifts);
        }
    }'''

content = content.replace(p_old, p_new)

with open('src/main/java/com/shiftsync/shift/service/ShiftService.java', 'w') as f:
    f.write(content)
