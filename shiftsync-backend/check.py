import subprocess
out = subprocess.check_output(["docker", "exec", "shiftsync-db", "psql", "-U", "postgres", "-d", "shiftsync", "-c", "SELECT * FROM staff;"])
print(out.decode())
