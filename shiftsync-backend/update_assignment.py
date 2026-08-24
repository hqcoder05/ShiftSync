import re
with open('src/main/java/com/shiftsync/shift/entity/ShiftAssignment.java', 'r') as f:
    content = f.read()

content = content.replace('import jakarta.persistence.*;\nimport lombok.*;',
'import jakarta.persistence.*;\nimport lombok.*;\nimport org.hibernate.annotations.SQLDelete;\nimport org.hibernate.annotations.SQLRestriction;')

content = content.replace('@Builder\npublic class ShiftAssignment',
'@Builder\n@SQLDelete(sql = "UPDATE shift_assignment SET deleted = true WHERE id = ?")\n@SQLRestriction("deleted = false")\npublic class ShiftAssignment')

content = content.replace('public class ShiftAssignment {',
'''public class ShiftAssignment {

    @Column(name = "deleted", nullable = false)
    @Builder.Default
    private boolean deleted = false;''')

with open('src/main/java/com/shiftsync/shift/entity/ShiftAssignment.java', 'w') as f:
    f.write(content)
