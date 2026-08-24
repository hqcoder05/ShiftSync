import re
with open('src/main/java/com/shiftsync/payroll/entity/Payroll.java', 'r') as f:
    content = f.read()

content = content.replace('import jakarta.persistence.*;\nimport lombok.*;',
'import jakarta.persistence.*;\nimport lombok.*;\nimport org.hibernate.annotations.SQLDelete;\nimport org.hibernate.annotations.SQLRestriction;')

content = content.replace('@Builder\npublic class Payroll',
'@Builder\n@SQLDelete(sql = "UPDATE payroll SET deleted = true WHERE id = ?")\n@SQLRestriction("deleted = false")\npublic class Payroll')

content = content.replace('public class Payroll {',
'''public class Payroll {

    @Column(name = "deleted", nullable = false)
    @Builder.Default
    private boolean deleted = false;''')

with open('src/main/java/com/shiftsync/payroll/entity/Payroll.java', 'w') as f:
    f.write(content)
