import re
with open('src/main/java/com/shiftsync/auth/service/UserService.java', 'r') as f:
    content = f.read()

content = re.sub(r'if \(userRepository\.hasRelatedRecords.*?throw new BusinessException.*?;[\r\n\s]*\}', '', content, flags=re.DOTALL)

with open('src/main/java/com/shiftsync/auth/service/UserService.java', 'w') as f:
    f.write(content)
