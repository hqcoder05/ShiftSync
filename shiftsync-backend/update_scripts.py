with open('test_bug_fix_blackout.ps1', 'r') as f:
    content = f.read()
content = content.replace('manager@shiftsync.com', 'admin@shiftsync.com')
with open('test_bug_fix_blackout.ps1', 'w') as f:
    f.write(content)

with open('test_leave_management.ps1', 'r') as f:
    content = f.read()
content = content.replace('manager@shiftsync.com', 'admin@shiftsync.com')
with open('test_leave_management.ps1', 'w') as f:
    f.write(content)
