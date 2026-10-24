"""Run migration/JPA/concurrency tests in a fresh disposable DB, never the app DB."""
import json, os, subprocess, uuid
from pathlib import Path

root = Path(__file__).resolve().parents[1]
database = 'shiftsync_design_test_' + uuid.uuid4().hex[:12]
config = json.loads(subprocess.check_output(['docker','inspect','shiftsync-db'], text=True))[0]
settings = dict(value.split('=',1) for value in config['Config']['Env'] if '=' in value)
user = settings.get('POSTGRES_USER','postgres')
environment = os.environ.copy()
environment.update(SHIFTSYNC_DESIGN_TEST_DB=database, SHIFTSYNC_DESIGN_TEST_USER=user,
                   SHIFTSYNC_DESIGN_TEST_PASSWORD=settings.get('POSTGRES_PASSWORD','postgres'))
print('Isolated test database: '+database,flush=True)
subprocess.run(['docker','exec','shiftsync-db','createdb','-U',user,database],check=True)
try:
    log = root/'shiftsync-backend/target/store-design-postgres.log'
    with log.open('w',encoding='utf-8') as output:
        result = subprocess.run(['mvn.cmd','-q','-Dtest=StoreDesignDatabaseTest','test'],
                                cwd=root/'shiftsync-backend',env=environment,stdout=output,stderr=subprocess.STDOUT)
    if result.returncode:
        print('\n'.join(log.read_text(encoding='utf-8',errors='replace').splitlines()[-50:]))
    else:
        print((root/'shiftsync-backend/target/surefire-reports/com.shiftsync.layout.StoreDesignDatabaseTest.txt').read_text())
finally:
    # Exact database created above; cannot target the application database.
    assert database.startswith('shiftsync_design_test_') and len(database)==len('shiftsync_design_test_')+12
    subprocess.run(['docker','exec','shiftsync-db','dropdb','-U',user,'--force',database],check=True)
raise SystemExit(result.returncode)
