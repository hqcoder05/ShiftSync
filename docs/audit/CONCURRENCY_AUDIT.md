# SHIFT SYNC: CONCURRENCY & RACE CONDITION AUDIT

## 1. Executive Summary
A comprehensive static audit was performed across the core domains of ShiftSync to evaluate concurrency safety, transactional integrity, and protection against race conditions. 

The audit revealed that the backend relies almost entirely on default PostgreSQL `Read Committed` isolation and `@Transactional` boundaries, which do **not** acquire row locks during `SELECT` statements. Because of this, read-modify-write patterns throughout the application are highly vulnerable to concurrent race conditions, lost updates, and double allocations. 

While some domains (like Leave Balances) correctly employ Optimistic Locking (`@Version`) and Marketplace Claims utilize Redisson distributed locks, these mechanisms are sometimes bypassed by adjacent features or are absent entirely in critical areas like Payroll, Shift Assignment, Shift Swaps, and Attendance.

**5 High-Severity Vulnerabilities** were identified where data invariants can be irreparably broken via concurrent HTTP requests.

---

## 2. Concurrency Model & Existing Locking Mechanisms
- **Relational DB Isolation:** Default (Read Committed).
- **Pessimistic Locking (`SELECT FOR UPDATE`):** Not used anywhere in the scanned repositories.
- **Optimistic Locking (`@Version`):** Present on `LeaveBalance` entity, providing excellent protection against double-deduction. However, absent on `Shift`, `ShiftAssignment`, `ShiftSwapRequest`, and `LeaveRequest`.
- **Distributed Locking:** Redisson lock (`shift_claim_lock`) is used effectively in `MarketplaceService.claimOpenShift`, enclosing the transaction boundary perfectly.
- **Unique Constraints:** Used on `ShiftAssignment(shift_id, staff_id)`, which protects against double-assigning the same staff to the same shift. Lacking in `Attendance` and `PayrollPeriod`.

---

## 3. Findings

### [CON-001] Permanent Loss of Leave Balance via Concurrent Approve/Cancel
- **Severity:** Critical
- **Domain:** LEAVE BALANCE
- **File:** `LeaveRequestService.java`
- **Method:** `approveLeaveRequest` vs `cancelLeaveRequest`
- **Shared Resource:** `LeaveRequest` state and `LeaveBalance`
- **Race Window:** Between reading the `LeaveRequest` status and executing the balance mutation / deletion.
- **Exact Interleaving:**
  1. **Manager (T1)** calls `approveLeaveRequest`. Reads `LeaveRequest` (Status = PENDING).
  2. **Staff (T2)** calls `cancelLeaveRequest`. Reads `LeaveRequest` (Status = PENDING).
  3. **T1** deducts annual leave balance (increases `usedDays`), updates status to `APPROVED`, saves, and commits.
  4. **T2** proceeds. Because T2 read `Status = PENDING`, the check `if (status == APPROVED)` evaluates to FALSE. 
  5. **T2** skips refunding the annual leave balance, deletes the `LeaveRequest` from the database entirely, and commits.
- **Broken Invariant:** Leave balance deductions must perfectly match persisted `APPROVED` leave requests.
- **Resulting Persisted State:** The employee loses the annual leave days from their balance, but the request is permanently deleted, offering them no actual time off and no way to refund the lost balance.
- **Existing Protection:** `@Transactional` (insufficient for read-modify-write).
- **Recommended Mitigation:** Add `@Version` to `LeaveRequest` for optimistic locking, ensuring T2 fails if T1 modifies the request. Alternatively, use `SELECT ... FOR UPDATE` when fetching `LeaveRequest`.

### [CON-002] Double Payroll Generation for the Same Store/Period
- **Severity:** High
- **Domain:** PAYROLL
- **File:** `PayrollCalculationService.java`
- **Method:** `generatePayroll`
- **Shared Resource:** `PayrollPeriod` and `Payroll` tables.
- **Race Window:** Between `findByStoreIdAndStartDateAndEndDate` checking for existence and `payrollPeriodRepository.save`.
- **Exact Interleaving:**
  1. **Admin A (T1)** clicks Generate Payroll. `findBy...` returns empty.
  2. **Admin B (T2)** clicks Generate Payroll concurrently. `findBy...` returns empty.
  3. **T1** creates and saves a new `PayrollPeriod` (ID: 1) and generates `Payroll` records.
  4. **T2** creates and saves a new `PayrollPeriod` (ID: 2) and generates `Payroll` records.
- **Broken Invariant:** A store has exactly one `PayrollPeriod` for a specific start and end date.
- **Resulting Persisted State:** Duplicate `PayrollPeriod`s exist. Employees receive duplicate `Payroll` records for the exact same timeframe, potentially resulting in double payments upon export.
- **Existing Protection:** None. The table `payroll_period` lacks a unique constraint on `(store_id, start_date, end_date)`.
- **Recommended Mitigation:** Add a database `@UniqueConstraint` on `(store_id, start_date, end_date)` to enforce database-level atomicity.

### [CON-003] Duplicate Shift Assignments via Auto-Schedule Race
- **Severity:** High
- **Domain:** AUTO-SCHEDULE
- **File:** `AutoScheduleService.java`
- **Method:** `autoSchedule`
- **Shared Resource:** `ShiftAssignment` entities for DRAFT shifts.
- **Race Window:** The entire multi-second execution of the auto-schedule algorithm.
- **Exact Interleaving:**
  1. **T1** triggers `autoSchedule`. Fetches DRAFT shifts. Clears existing assignments.
  2. **T2** triggers `autoSchedule` a moment later. Fetches DRAFT shifts. Clears existing assignments (or does nothing if T1 already did).
  3. **T1** calculates that Shift A requires 1 cashier. Assigns Staff X. Saves `ShiftAssignment`.
  4. **T2** calculates that Shift A requires 1 cashier. Because T2 calculates in memory based on the state it read, it also determines 1 cashier is needed. It assigns Staff Y. Saves `ShiftAssignment`.
- **Broken Invariant:** Auto-schedule should respect the exact `requiredCount` headcount demands of the shift.
- **Resulting Persisted State:** DRAFT shifts receive double the requested assignments (e.g., 2 cashiers for a shift needing 1).
- **Existing Protection:** None.
- **Recommended Mitigation:** Acquire a distributed lock (Redisson) on the `storeId` and scheduling week before executing the algorithm.

### [CON-004] Overlapping Shifts via Concurrent Swap Approvals
- **Severity:** High
- **Domain:** SHIFT SWAP
- **File:** `ShiftSwapService.java`
- **Method:** `managerApproveSwapRequest`
- **Shared Resource:** `ShiftAssignment`
- **Race Window:** Between `shiftAssignmentRepository.findBy...` and `.save()`.
- **Exact Interleaving:**
  1. Staff A offers to give away Shift 1. Creates two swaps: Swap X (with Staff B's Shift 2) and Swap Y (with Staff C's Shift 3).
  2. **Manager (T1)** approves Swap X. Reads Shift 1 assigned to A, Shift 2 assigned to B. Validates no overlap for A taking Shift 2.
  3. **Manager (T2)** approves Swap Y. Reads Shift 1 assigned to A, Shift 3 assigned to C. Validates no overlap for A taking Shift 3.
  4. **T1** swaps assignments: Shift 1 -> B, Shift 2 -> A. Commits.
  5. **T2** swaps assignments: Shift 1 -> C, Shift 3 -> A. Commits (overwriting Shift 1's assignee to C).
- **Broken Invariant:** Staff members cannot have overlapping shift assignments. A swap is a 1-to-1 exchange.
- **Resulting Persisted State:** Staff A successfully acquires BOTH Shift 2 and Shift 3, which were never validated against each other for overlapping hours. Staff B loses Shift 2 but gets nothing. Staff C gets Shift 1.
- **Existing Protection:** `ShiftAssignment` has no `@Version`.
- **Recommended Mitigation:** Add `@Version` to `ShiftAssignment` so T2 fails upon updating Shift 1, or use `SELECT ... FOR UPDATE` on the assignments.

### [CON-005] Duplicate Attendance Records (Double Check-In)
- **Severity:** Medium
- **Domain:** ATTENDANCE
- **File:** `AttendanceService.java`
- **Method:** `scanQr` / `submitSelfie`
- **Shared Resource:** `Attendance` table.
- **Race Window:** Between `attendanceRepository.findByShiftAssignmentId` returning empty and `attendanceRepository.save`.
- **Exact Interleaving:**
  1. Employee rapidly submits two requests simultaneously (e.g., double tap on App).
  2. **T1** checks `findByShiftAssignmentId` -> empty.
  3. **T2** checks `findByShiftAssignmentId` -> empty.
  4. **T1** saves `Attendance(status=PRESENT)`.
  5. **T2** saves `Attendance(status=PRESENT)`.
- **Broken Invariant:** A shift assignment should have at most 1 attendance record.
- **Resulting Persisted State:** Multiple `Attendance` rows exist for the same assignment, causing `NonUniqueResultException` crashes elsewhere in the app when querying via `findByShiftAssignmentId`.
- **Existing Protection:** None.
- **Recommended Mitigation:** Add a database `UNIQUE CONSTRAINT` on `shift_assignment_id` in the `attendance` table.

---

## 4. Safe Areas / Existing Good Practices
1. **Marketplace Lock:** `MarketplaceService.claimOpenShift` correctly implements a Redisson distributed lock (`shift_claim_lock`) that wraps the entire Read-Validate-Write transaction. This perfectly prevents double-claiming an open shift by staff on the marketplace.
2. **Leave Balance Protection:** `LeaveBalance` utilizes `@Version`. If two requests attempt to deduct from the same balance simultaneously, one will throw an `ObjectOptimisticLockingFailureException`, preventing double deduction.
3. **Double Manual Assignment Prevention:** The `shift_assignment` table enforces a `UNIQUE(shift_id, staff_id)` constraint, preventing the same staff member from being assigned to the same shift twice.

---

## 5. Runtime Verification Scenarios (For QA/Testing Phase)
1. **[CON-001]** Use multiple threads to simultaneously trigger `/approve` and `/cancel` on the same `LeaveRequest` ID. Assert that either the balance remains unchanged and the request is deleted, OR the balance is deducted and the request is APPROVED. The balance must never be permanently lost.
2. **[CON-002]** Fire two concurrent POST requests to generate payroll for the same dates. Assert that the second request returns a `500` or `4xx` due to constraint violation, and only ONE `PayrollPeriod` is created.
3. **[CON-004]** Create two `ShiftSwapRequest`s giving away the same shift. Approve both concurrently. Assert that one fails with an Optimistic Locking or locking exception.
4. **[CON-005]** Fire two concurrent Check-In requests for the same shift assignment. Assert that the second request throws a constraint violation and only 1 attendance row exists in the DB.
