with open('test_bug_fix_blackout.ps1', 'r') as f:
    content = f.read()
content = content.replace('08:00:00', '10:00:00').replace('16:00:00', '14:00:00')
with open('test_bug_fix_blackout.ps1', 'w') as f:
    f.write(content)

with open('test_leave_management.ps1', 'r') as f:
    content = f.read()
content = content.replace('08:00:00', '10:00:00').replace('16:00:00', '14:00:00')
with open('test_leave_management.ps1', 'w') as f:
    f.write(content)
