import re
with open('src/main/java/com/shiftsync/store/service/StoreService.java', 'r') as f:
    content = f.read()

delete_method = '''    @Transactional
    public void deleteStore(UUID id) {
        Store store = storeRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Store not found", HttpStatus.NOT_FOUND));

        if (storeRepository.hasActiveEmployees(id)) {
            throw new BusinessException("Cannot delete Store: Store has active employees.", HttpStatus.CONFLICT);
        }
        if (storeRepository.hasFuturePublishedShifts(id)) {
            throw new BusinessException("Cannot delete Store: Store has future published shifts.", HttpStatus.CONFLICT);
        }

        storeRepository.delete(store);
    }'''

content = re.sub(r'    @Transactional\s+public void deleteStore.*?storeRepository\.delete\(store\);\s+}', delete_method, content, flags=re.DOTALL)

with open('src/main/java/com/shiftsync/store/service/StoreService.java', 'w') as f:
    f.write(content)
