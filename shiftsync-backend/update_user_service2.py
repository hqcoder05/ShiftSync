import re
with open('src/main/java/com/shiftsync/auth/service/UserService.java', 'r') as f:
    content = f.read()

delete_method = '''    @Transactional
    public void deleteUser(UUID id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new BusinessException("User not found", HttpStatus.NOT_FOUND));

        if (userRepository.isSoleManagerOfAnyStore(id)) {
            throw new BusinessException("Cannot delete User: User is the sole Manager of a Store.", HttpStatus.CONFLICT);
        }
        if (userRepository.hasActiveEmployment(id)) {
            throw new BusinessException("Cannot delete User: User has active employments.", HttpStatus.CONFLICT);
        }
        if (userRepository.hasFuturePublishedShifts(id)) {
            throw new BusinessException("Cannot delete User: User is assigned to future published shifts.", HttpStatus.CONFLICT);
        }

        userRepository.delete(user);
    }'''

content = re.sub(r'    @Transactional\s+public void deleteUser.*?userRepository\.delete\(user\);\s+}', delete_method, content, flags=re.DOTALL)

with open('src/main/java/com/shiftsync/auth/service/UserService.java', 'w') as f:
    f.write(content)
