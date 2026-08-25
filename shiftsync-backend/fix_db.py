import psycopg2

conn = psycopg2.connect(
    dbname="shiftsync",
    user="postgres",
    password="postgres",
    host="localhost",
    port=5432
)
conn.autocommit = True
cur = conn.cursor()
try:
    cur.execute("DROP TABLE workforce_proposal CASCADE;")
except Exception as e:
    print(e)

try:
    cur.execute("DROP TABLE workforce_request CASCADE;")
except Exception as e:
    print(e)
    
try:
    cur.execute("DROP TYPE workforce_request_status_enum CASCADE;")
except Exception as e:
    print(e)

try:
    cur.execute("DROP TYPE workforce_proposal_status_enum CASCADE;")
except Exception as e:
    print(e)

try:
    cur.execute("DELETE FROM flyway_schema_history WHERE version = '19';")
except Exception as e:
    print(e)
