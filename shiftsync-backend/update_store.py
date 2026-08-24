import re
with open('src/main/java/com/shiftsync/store/entity/Store.java', 'r') as f:
    content = f.read()

content = content.replace('import jakarta.persistence.*;\nimport lombok.*;',
'import jakarta.persistence.*;\nimport lombok.*;\nimport org.hibernate.annotations.SQLDelete;\nimport org.hibernate.annotations.SQLRestriction;')

content = content.replace('@Builder\npublic class Store',
'@Builder\n@SQLDelete(sql = "UPDATE store SET deleted = true WHERE id = ?")\n@SQLRestriction("deleted = false")\npublic class Store')

content = content.replace('public class Store {',
'''public class Store {

    @Column(name = "deleted", nullable = false)
    @Builder.Default
    private boolean deleted = false;''')

with open('src/main/java/com/shiftsync/store/entity/Store.java', 'w') as f:
    f.write(content)
