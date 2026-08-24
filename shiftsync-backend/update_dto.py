with open('src/main/java/com/shiftsync/shift/dto/ShiftCreateRequest.java', 'r') as f:
    content = f.read()

import re
content = re.sub(r'@NotNull\(message = "Registration deadline is required"\)\s+@Schema\(description = "Registration Deadline \(ISO-8601\)", example = "2023-11-25T23:59:59Z"\)\s+private ZonedDateTime availabilityDeadline;',
'''@Schema(description = "Registration Deadline (ISO-8601)", example = "2023-11-25T23:59:59Z")
    private ZonedDateTime availabilityDeadline;''', content)

with open('src/main/java/com/shiftsync/shift/dto/ShiftCreateRequest.java', 'w') as f:
    f.write(content)
