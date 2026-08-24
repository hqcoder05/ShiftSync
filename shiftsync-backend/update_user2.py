with open('src/main/java/com/shiftsync/auth/entity/User.java', 'r') as f:
    content = f.read()

content = content.replace('@SQLRestriction("deleted = false")', '')

with open('src/main/java/com/shiftsync/auth/entity/User.java', 'w') as f:
    f.write(content)
