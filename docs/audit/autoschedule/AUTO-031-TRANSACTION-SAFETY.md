# AUTO-031 — PostgreSQL transaction safety

## Implementation

Schedule mutation entry points now use PostgreSQL SERIALIZABLE isolation: automatic
scheduling, manual assignments, shift edits, swap approval, marketplace publication
and claims, workforce support acceptance, leave approval, quota generation and spatial
allocation. Marketplace claims use the configured SERIALIZABLE TransactionTemplate
inside their existing Redis lock. Spring rejects joining a weaker outer transaction.

Conflicting transactions may fail with a concurrency exception; HTTP returns 409 and
CONCURRENT_MODIFICATION, asking the user to reload and retry. There is no automatic
server retry. SERIALIZABLE protects interacting database reads/writes, including
cross-store scheduling, without relying solely on a per-store lock. This does not
establish correctness of unrelated writers that bypass these transaction boundaries.

Real integration tests exposed an additional rollback bug: missing 3D configuration
raised BusinessException in a nested transaction and marked the entire schedule
rollback-only even though the scheduler caught it. Spatial precondition failures now
use noRollbackFor=BusinessException; the scheduler catches only BusinessException.
Unexpected database/runtime errors propagate and roll back the complete schedule.
All current spatial BusinessException branches occur before writes.

## Evidence, 2026-10-29

SchedulingPostgresIntegrationTest: 12 tests passed against PostgreSQL, covering:

- Two automatic schedulers competing for the same demand.
- Automatic/manual assignments of different employees competing for one slot.
- Two manual assignments of different employees competing for one slot.
- One employee scheduled concurrently at two stores.
- Marketplace claim versus automatic scheduling across stores.
- Swap approval versus automatic scheduling across stores.
- Injected failure after deleting prior AUTO assignments restores the original rows.
- Dry-run leaves assignments unchanged and rolls back generated quota shifts.
- Cross-store approved leave query includes the overnight end date.
- Missing spatial configuration preserves a valid schedule and reports PARTIAL.
- A weaker outer transaction cannot silently downgrade isolation.

Races synchronize at the first assignment write after independent validation. Tests
assert exactly one commit, a database conflict for the loser, and final row counts.
The repository spy delegates to real JPA operations; Redisson and notifications are
mocked. These are database correctness tests, not Redis integration or load tests.

Run with `powershell -File scripts/test-scheduler-postgres.ps1` from the repository.
The opt-in suite is skipped in ordinary unit-test runs. Its datasource is fixed to
shiftsync_scheduler_test on local port 55432. Fixtures use random IDs and clean only
their own records; the operational shiftsync database is not reset.

Additional regression run: 334 executed tests passed, 12 opt-in PostgreSQL tests
skipped, zero failures/errors across 22 selected test classes. HTTP tests verify
serialization/optimistic conflicts return 409 without exposing database details.

## Remaining validation

No throughput/latency measurement under SERIALIZABLE yet. Concurrent edits to
availability, contracts and configuration need explicit interaction scenarios.
External notification delivery is not transactional and is outside these tests.
This milestone does not prove enterprise scale, optimality or labor-law compliance.
