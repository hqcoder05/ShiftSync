import re
with open('src/main/java/com/shiftsync/attendance/entity/Attendance.java', 'r') as f:
    content = f.read()

content = content.replace('import jakarta.persistence.*;\nimport lombok.*;',
'import jakarta.persistence.*;\nimport lombok.*;\nimport org.hibernate.annotations.SQLDelete;\nimport org.hibernate.annotations.SQLRestriction;')

content = content.replace('@Builder\npublic class Attendance',
'@Builder\n@SQLDelete(sql = "UPDATE attendance SET deleted = true WHERE id = ?")\n@SQLRestriction("deleted = false")\npublic class Attendance')

content = content.replace('public class Attendance {',
'''public class Attendance {

    @Column(name = "deleted", nullable = false)
    @Builder.Default
    private boolean deleted = false;''')

with open('src/main/java/com/shiftsync/attendance/entity/Attendance.java', 'w') as f:
    f.write(content)
