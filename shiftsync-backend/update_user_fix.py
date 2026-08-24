import re
with open('src/main/java/com/shiftsync/auth/entity/User.java', 'r') as f:
    content = f.read()

content = content.replace('@org.hibernate.annotations.Where(clause = "deleted = false")', '@SQLRestriction("deleted = false")')
content = content.replace('@SQLDelete(sql = "UPDATE staff SET deleted = true WHERE id = ?")', '@SQLDelete(sql = "UPDATE staff SET deleted = true WHERE id = ? and version = ?")')

with open('src/main/java/com/shiftsync/auth/entity/User.java', 'w') as f:
    f.write(content)
