with open('src/main/java/com/shiftsync/auth/entity/User.java', 'r') as f:
    content = f.read()

content = content.replace('public class User {',
'@org.hibernate.annotations.Where(clause = "deleted = false")\npublic class User {')

with open('src/main/java/com/shiftsync/auth/entity/User.java', 'w') as f:
    f.write(content)
