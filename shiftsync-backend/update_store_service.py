import re
with open('src/main/java/com/shiftsync/store/service/StoreService.java', 'r') as f:
    content = f.read()

content = re.sub(r'if \(storeRepository\.hasRelatedRecords.*?throw new BusinessException.*?;[\r\n\s]*\}', '', content, flags=re.DOTALL)

with open('src/main/java/com/shiftsync/store/service/StoreService.java', 'w') as f:
    f.write(content)
