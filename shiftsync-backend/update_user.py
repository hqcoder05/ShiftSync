import re
with open('src/main/java/com/shiftsync/auth/entity/User.java', 'r') as f:
    content = f.read()

content = content.replace('import jakarta.persistence.*;\nimport lombok.*;',
'import jakarta.persistence.*;\nimport lombok.*;\nimport org.hibernate.annotations.SQLDelete;\nimport org.hibernate.annotations.SQLRestriction;')

content = content.replace('@Builder\npublic class User',
'@Builder\n@SQLDelete(sql = "UPDATE staff SET deleted = true WHERE id = ?")\n@SQLRestriction("deleted = false")\npublic class User')

content = content.replace('public class User {',
'''public class User {

    @Column(name = "deleted", nullable = false)
    @Builder.Default
    private boolean deleted = false;''')

with open('src/main/java/com/shiftsync/auth/entity/User.java', 'w') as f:
    f.write(content)
