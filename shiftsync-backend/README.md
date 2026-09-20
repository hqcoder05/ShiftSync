# ShiftSync Backend

## AutoSchedule

AutoSchedule filters candidates through hard constraints before applying configured soft scoring. The current verified contract is:

- Skill and skill expiry are hard constraints.
- Availability is a hard constraint; eligible candidates receive `availabilityScore = 1.0`.
- Leave, blackout, overlap, minimum rest, weekly and contract limits are enforced before assignment.
- Monthly fairness uses global employee workload, including qualifying cross-store workforce-sharing assignments.
- Local Repair preserves hard constraints and may rescue coverage before applying soft fairness/score preferences.
- Spatial allocation is reported separately from staffing coverage.

## Marketplace and shift swap

Open Shift claims use the backend's concurrency protection and create an `OPEN_SHIFT` assignment when the claim is valid. Shift swap remains a two-step flow: the other employee accepts, then a manager approves.

## Verification status

The current backend suite is **GREEN WITH DOCUMENTED INFRASTRUCTURE GAPS**:

- 384 total tests;
- 381 executed successfully;
- 0 failures;
- 0 errors;
- 3 explicitly skipped tests requiring live PostgreSQL and Redis.

There is no complete real-infrastructure integration suite in the repository. See the repository-level [current system status](../SHIFTSYNC_CURRENT_SYSTEM_STATUS.md).