with open('src/main/java/com/shiftsync/availability/entity/BlackoutDate.java', 'r') as f:
    content = f.read()

content = content.replace(
    'private String reason;\n}',
    'private String reason;\n\n    @Column(name = "leave_request_id")\n    private UUID leaveRequestId;\n}'
)

with open('src/main/java/com/shiftsync/availability/entity/BlackoutDate.java', 'w') as f:
    f.write(content)
