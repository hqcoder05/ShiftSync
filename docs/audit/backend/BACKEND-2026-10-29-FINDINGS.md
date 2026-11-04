# Backend audit — 2026-10-29

Status: ongoing. These findings are from current source inspection; no exploit requests were sent to a live deployment. This is not a claim that all backend bugs have been found. Existing working-tree changes are included in the inspected state.

## Confirmed source-level findings

### BE-001 — P0: Manager can reset another user's password, including an administrator

- Historical defect: the caller-aware overload discarded caller context, so a manager could read or update any account, including changing an administrator password.
- Remediated: `authorizeUserAccess` permits self and ADMIN access; a manager may access only a staff target with active shared-store membership. Manager modification of non-STAFF targets is rejected before an update occurs. Password changes increment `credentialVersion`, invalidating old sessions.
- `UserPrivilegeAuditTest` sends requests through real MVC/method security and verifies a manager cannot read or reset an administrator, while a shared-store staff profile may be updated without changing its password.

### BE-002 — P0 when dev profile is active: authenticated users can mint refresh tokens for other accounts

- Historical defect: the dev-profile Redis test controller exposed arbitrary writes to the same refresh-token namespace used by authentication.
- Remediated: `RedisTestController` has been removed. Refresh records use the immutable `uid:<UUID>:v:<credentialVersion>` format and invalid/legacy values are rejected before an account is loaded.
- There is no remaining Redis test controller source. `TokenIdentityAuditTest.oldRefreshTokenCannotMintAdminTokenAfterEmailReassignment` verifies a legacy email-valued refresh record is rejected.

### BE-003 — P1: old tokens can transfer to a different account after email reassignment

- Historical defect: access and refresh tokens identified the account by mutable email, allowing an old token to resolve to a different owner after email reassignment.
- Remediated: JWTs and refresh records are bound to immutable user UUIDs; the auth filter reloads by the UUID claim and checks credential version. Password changes advance that version.
- `TokenIdentityAuditTest.oldStaffAccessTokenCannotAuthenticateAsNewAdminOwnerOfEmail` verifies a token whose original UUID no longer exists does not authenticate as the replacement email owner. The corresponding refresh test rejects the legacy identity format.

### BE-004 — P1: store managers can change global holiday payroll rules

- Historical defect: globally scoped holiday rules were mutable by any manager.
- Remediated: all holiday write endpoints (`POST`, `PUT`, `DELETE`) now require `ADMIN`; managers retain read-only access.

### BE-005 — P1: leave approval retains assignments that carry into the leave day

- Historical defect: leave approval queried assignments only by their start date, missing an overnight assignment that began the previous day and continued into approved leave.
- Remediated: `findConflictingAssignments` loads the preceding date through the leave end date, converts each shift to a date-aware interval and filters by actual interval overlap. Completed, attended and payroll-locked conflicts now reject approval before any leave side effects.
- `LeaveAuditCharacterizationTest.approvalChecksPreviousDayForOvernightAssignments` verifies the expanded query range. The leave-focused suite passed 17 tests with no failures/errors on 04/11.

### BE-006 — P2: annual leave spanning years is charged entirely to the starting year

- Historical defect: a request crossing New Year checked, deducted and restored all annual leave against its starting calendar year.
- Remediated: `daysByYear` splits the inclusive date range. Creation validates each annual balance independently; approval deducts and cancellation reverses the matching year/day totals in SERIALIZABLE transactions.
- `LeaveAuditCharacterizationTest.crossYearApprovalChargesEachYearSeparately` verifies a 31/12–01/01 request deducts one day in each year. The leave-focused suite passed 17 tests with no failures/errors on 04/11.

### BE-007 — P1: payroll allocates overnight hours across ISO weeks incorrectly

- Historical defect: a cross-midnight attendance interval was accumulated wholly in its shift-start ISO week, mischarging next-week hours as overtime.
- Remediated: payroll splits work into calendar-day segments, sorts them chronologically and uses the Monday week-start date as the weekly accumulator key.
- `PayrollAuditCharacterizationTest.sundayOvernightHoursAreAllocatedToTheirActualWeeks` verifies Sunday and Monday portions of an overnight interval stay under their own 8-hour test-week caps.

### BE-008 — P1: NaN coordinates bypass selfie attendance geofencing

- Historical defect: Spring accepted `NaN` into a double and the geofence distance comparison could then be bypassed.
- Remediated: `validateGeofence` rejects non-finite coordinates and values outside latitude `[-90,90]` or longitude `[-180,180]` before distance calculation. QR and selfie attendance both use this shared guard.
- `AttendanceGeofenceAuditTest` converts the real `NaN` request value and verifies `NaN`, positive infinity and out-of-range latitude each throw `BusinessException`; valid store coordinates remain accepted. The focused suite passed 2 tests with 0 failures/errors on 04/11.

### BE-009 — P1: employment can reference another store's contract type

- Historical defect: employment assignment previously looked up a contract type without proving that it belonged to the URL store. A manager of store A could have supplied a contract UUID from B, causing payroll and scheduling terms to cross the store boundary.
- Remediated: `EmploymentService.assignStaffToStore` uses `findByIdAndStoreId(contractTypeId, storeId)`. Employment compensation updates delegate to `EmploymentCompensationScheduler.schedule`, which performs the same ownership check before creating a revision. DTO projection also scopes the historical contract lookup to the employment's store, treating an invalid legacy relationship as a reconciliation conflict rather than leaking foreign terms.
- `SchedulingPostgresIntegrationTest.employmentRejectsContractOwnedByAnotherStore` exercises the real assignment service with isolated PostgreSQL and verifies the request is rejected and no employment row is written for the target store. `scheduledEmploymentCompensationPreservesCurrentValuesAndUsesRequestedDate` additionally verifies a foreign contract is rejected by the scheduled-update path.

### BE-010 — P1: QR attendance bypasses the payroll-date lock

- Historical defect: `scanQr` once bypassed the payroll-date check while selfie, update and deletion flows enforced it. A valid QR could therefore write checkout after confirmation and make the payroll snapshot stale.
- Remediated: both QR and selfie flows now enter `validateAttendanceShift` before selecting the attendance row. It locks the receiving store (and the payroll-owning store for workforce-support assignments) in stable order, then checks all affected dates of an overnight shift through `PayrollCalculationService.isDateLocked`.
- `QrPayrollLockAuditTest.lockedPayrollRejectsBothSelfieAndQrCheckout` verifies the QR and selfie paths both reject a locked period without saving attendance. `SchedulingPostgresIntegrationTest.auditSignedQrWritesCheckoutAfterPayrollPaidWhileSelfieIsBlocked` was inverted to assert the same behavior against real isolated PostgreSQL, real QR signing/parsing, geofence validation and paid-period state. The full backend regression on 04/11 passed 900 tests with 0 failures and 0 errors (158 explicit skips).
- The earlier reproduction below is retained as historical evidence only; its statement that QR checkout succeeds no longer describes the current implementation.

### BE-011 — P1: generic staff-request ownership is based on mutable, non-unique full name

- Historical defect: requests were authorized by mutable `requesterName`; equal names could disclose data and a profile rename could orphan a request.
- Remediated by V53, which adds `requester_id` and `store_id`. Creation overwrites caller-controlled requester identity with the authenticated user's UUID and validates that the selected store is an active employment of that user. Read access compares the immutable requester UUID; the display name is presentation only.
- `StaffRequestAuditTest` verifies equal-name users cannot read another user's request and that a renamed owner retains access. Legacy rows whose owner/store cannot be safely recovered remain inaccessible to STAFF/MANAGER rather than being guessed from names; an ADMIN may review them.

### BE-012 — P1: any manager can read and change all generic staff requests across stores

- Historical defect: managers could list, read and update generic requests without proving membership of the request's store.
- Remediated: every list item and detail request passes `canManage`; a MANAGER must have ACTIVE employment at the request's `store_id`. Status mutation performs the same check before the service is called. `StaffRequestControllerTest.managerCannotReadOrModifyAnotherStoreRequest` verifies both denial paths and verifies no status write occurs.

### BE-013 — P1: a pending workforce proposal can be accepted after manager rejection

- Historical defect: a manager rejection left PENDING proposals available for acceptance, which could create an assignment and move a rejected request to COMPLETED.
- Remediated: `respondToProposalInTransaction` locks the parent request and permits responses only while it is explicitly actionable (`PENDING` or `PROPOSAL_SENT`). `MANAGER_REJECTED`, `CANCELLED`, `COMPLETED` and `EXPIRED` requests now reject before any assignment or proposal-status write.
- `WorkforceRoleStateAuditTest.rejectedRequestCannotLaterCreateAnAcceptedSupportAssignment` runs propose → actual manager rejection → staff acceptance attempt and verifies the proposal remains PENDING and no assignment is saved. The focused suite passed 7 tests with 0 failures/errors on 04/11. Existing pending proposals need not be destructively rewritten: their terminal parent prevents every response.

### BE-014 — P1: layout references can cross store boundaries

- Historical defect: zone parents and workstation zones were loaded by global ID, allowing a layout in store A to reference a zone in store B.
- Remediated: all four write paths call `requireZoneInStore`, which returns 404 for an unknown zone and rejects a foreign zone before persistence. Zone updates additionally validate the parent chain for cycles in a SERIALIZABLE transaction.
- `LayoutReferenceAuditTest` now covers foreign references on create-zone, update-zone, create-workstation and update-workstation paths. Its 5 tests passed with 0 failures/errors on 04/11; no foreign relationship is saved.

### BE-015 — P2: persisted zone hierarchy accepts cycles

Remediation verification (03/11): zone updates validate the full parent chain in a SERIALIZABLE transaction. `SchedulingPostgresIntegrationTest.concurrentZoneParentUpdatesCannotCreateCycle` forces two authenticated updates to read opposite zones concurrently, verifies exactly one succeeds and the other reports a serialization conflict or a cycle, and checks that only one parent link persists. This covers a two-zone concurrent cycle against isolated PostgreSQL; it does not establish behavior under every possible external database writer.

- Historical defect: an update could select itself or a descendant as its parent, corrupting the persisted hierarchy into a cycle.
- Remediated: `LayoutController.updateZone` resolves the parent within the requested store, walks its full ancestry under `SERIALIZABLE` isolation and rejects self-parenting, descendants, existing cycles and foreign parents before any field is saved.
- `LayoutReferenceAuditTest.zoneCannotBecomeItsOwnParent` and `zoneCannotBecomeChildOfItsDescendant` cover the direct cases; the isolated PostgreSQL concurrency test above covers competing parent updates.

### BE-016 — P1: payslip list leaks another store's payroll

- Historical defect: the payslip endpoint authorized the URL store but loaded the period by global ID, allowing a manager of A to use B's period UUID.
- Remediated: `getPayslips` first resolves the period through `findByIdAndStoreId(periodId, storeId)`, returning 404 before the payslip repository is queried when the period belongs to another store.
- `PayrollAuditCharacterizationTest.payslipListRejectsPeriodFromAnotherStore` explicitly stubs the scoped lookup as absent and verifies it is called and that `findByPayrollPeriodId` is never reached. The focused suite passed 5 tests with 0 failures/errors on 04/11.

### BE-017 — P1: approved paid leave drops overnight scheduled hours

- Historical defect: paid-leave calculation used `LocalTime` arithmetic for an overnight shift, producing a negative duration and silently dropping its scheduled leave pay.
- Remediated: the calculator constructs date-aware `LocalDateTime` start/end values, advances an overnight end to the following day and clips each assignment to the paid leave calendar date. It also retrieves candidates that started on the previous date, so an overnight shift is not missed at midnight.
- `PayrollAuditCharacterizationTest.paidLeavePaysOnlyTheCoveredPartOfAnOvernightShift` verifies an 08:00–16:00 paid-leave shift pays 8 hours and a 22:00–06:00 shift pays its two hours covered by the leave date, both at the expected rate.

### BE-018 — P1: employees who have left are omitted from historical payroll generation

Remediated in the application (04/11): payroll loads employment episodes overlapping the relevant period and weekly history, emits one payslip per employee, and resolves every paid work or leave segment against its dated employment, contract and skill terms. Updates schedule effective-dated revisions (manager-selected, defaulting to tomorrow in Vietnam); missing, overlapping or untracked history fails with a reconciliation error instead of silently repricing the past. Manual and automatic scheduling, quota estimates, payroll locks and support-store payroll ownership use the same dated terms.

V62–V74 provide audit history, dated revisions, baseline rows, preservation of historical contract references and explicit reconciliation endpoints for data that pre-dates trustworthy history. `SchedulingPostgresIntegrationTest` verifies inactive employees, rehire boundaries, historical payroll, support-store work and lock enforcement; the current isolated PostgreSQL suite completed 169 tests with no failures/errors. Existing production records whose effective dates cannot be evidenced still require an administrator to reconcile them; the system intentionally does not invent historical wages.

### BE-019 — P1: WebSocket subscriptions expose other users' and stores' events

- Historical defect: authenticated sockets could subscribe to arbitrary personal, store and global topics.
- Remediated: the inbound interceptor allows only the caller's `/topic/notifications/{userId}`, `/topic/system`, and the documented store topics (`shifts`, `attendance`, `requests`, `marketplace`) when `StoreAccessService` confirms membership. All other subscriptions are denied. `RealtimeEventPublisher` no longer mirrors private notification payloads onto a global notification destination.
- `WebSocketAuditTest` verifies denial of a foreign personal topic and inaccessible store, while allowing the caller's personal topic and an authorized store topic. This is interceptor-level evidence; a browser/STOMP transport integration test remains useful but is not required to enforce the server-side rule.

### BE-020 — P1: client SEND frames to broker destinations have no authorization guard

- Historical defect: client SEND frames could be forwarded to broker topics and forge realtime events.
- Remediated: the interceptor rejects every client `SEND` frame. The backend currently has no client-owned STOMP application destinations, so a deny-all policy is the correct boundary.
- `WebSocketAuditTest` now verifies both unauthenticated and authenticated clients are denied when sending to broker topics; 4 tests passed with 0 failures/errors on 04/11. Full browser/STOMP transport verification remains a deployment-level follow-up.

### BE-021 — P1: switching accounts leaves a device subscribed to the previous account's push notifications

Remediation in progress (02/11): V59 enforces one owner per token and drops ambiguous existing registrations, which are restored on the next login. Registration transfers ownership atomically; authenticated deregistration only removes the caller's registration, and web logout invokes it before revoking the session. PostgreSQL verifies transfer and scoped removal; the web production build passes. Offline logout, already queued push delivery, multiple browser tabs, and other clients' adoption of deregistration still require end-to-end verification.

- FCM registration looks up `(userId, fcmToken)` and inserts if missing. The database uniqueness constraint is the pair, so the same physical device token can be attached to multiple users.
- AuthService.logout removes authentication tokens but does not detach the FCM device. No user-facing unregister endpoint exists in the inspected controller.
- Scenario: A registers device token T, logs out; B logs in on the same app installation and registers T. Both rows remain. NotificationService selects tokens by recipient user and sends A's future notification bodies to T, now used by B.
- Conditional on the device token persisting across account switches, as the server permits. A full mobile/FCM reproduction was not executed.
- Correction: enforce a device-token ownership lifecycle, move ownership on registration, and provide authenticated device deregistration on logout.

### BE-022 — P1: adjustment approval persists an inverted attendance interval

- Historical defect: an approval that changed only checkout could persist it before the existing check-in, producing a negative interval.
- Remediated: approval resolves the effective check-in and checkout before mutating attendance, then `AttendanceStatusCalculator` rejects an inverted interval. This covers linked attendance and the fallback attendance record that appeared after request submission.
- `AdjustmentAuditCharacterizationTest.approvalRejectsCheckoutEarlierThanExistingCheckin` verifies no attendance save occurs for a partial invalid update. Transactional store/payroll locks protect the approval path from paid-period mutations.

### BE-023 — P2: adjustment approval calculates lateness using the client offset's wall-clock time

- Historical defect: the approval path compared a client-offset wall-clock timestamp with the store's local shift time.
- Remediated: `AttendanceStatusCalculator` converts the effective instant to the configured store zone before calculating late and early-leave status. The same calculator is used by direct attendance updates and adjustment approval.
- `AdjustmentAuditCharacterizationTest.utcCheckinAtTenLocalIsMarkedPresentForNineLocalShift` now verifies 03:00Z (10:00 in Vietnam) is classified LATE for a 09:00 shift.

### BE-024 — P1: managers can replace any employee's entire skill profile across stores

Remediation in progress (02/11): a manager can read or update a profile only for stores where both the manager and employee have active employment. Replacement preserves skills from other stores and rejects IDs outside that scope. `SkillReplacementAuditTest` checks access and preservation; `SchedulingPostgresIntegrationTest.managerSkillEditPreservesForeignSkillsAndExistingMetadata` verifies the behavior with PostgreSQL. The employee screen now reports a failed skill save and avoids saving an incomplete skill list.

- Historical defect: replacement was unrestricted and could delete a target employee's skills belonging to stores the manager did not manage.
- Remediated: a manager must share an active store with the target. The operation resolves requested and existing skills within the permitted store set, leaving foreign-store profile records untouched.
- `SkillReplacementAuditTest.managerCannotRemoveOrAssignAnotherStoresSkills` verifies foreign skills cannot be requested or removed; `unrelatedManagerCannotEditProfile` verifies denial when no store is shared.

### BE-025 — P1: saving unchanged skill IDs destroys proficiency and expiration metadata

Remediation in progress (02/11): replacement applies a membership diff, keeping existing rows and their proficiency and expiry. Unit and isolated PostgreSQL tests verify retention of an EXPERT level and expiry date.

- Historical defect: replacement deleted and recreated every row, resetting unchanged skills' proficiency and expiry metadata.
- Remediated: the service computes a scoped membership diff, deletes only removed records and inserts only new IDs. Existing matching rows are retained unchanged.
- `SkillReplacementAuditTest.unchangedSkillRetainsExpiryAndLevel` verifies an unchanged skill is neither deleted nor inserted and retains its level and expiry.

### BE-026 — P1: cancelled open shifts still accept Marketplace assignments

Concurrency verification (04/11): `SchedulingPostgresIntegrationTest.marketplaceClaimWaitsForPayrollConfirmationAndLeavesShiftUnchanged` pauses payroll confirmation after the store lock is held, then verifies a Marketplace claim waits and fails after confirmation, without creating an assignment or closing the listing. PostgreSQL transactions and persistence are real; Redis locking is mocked, and this test covers confirmation-first ordering only.

- Historical defect: cancellation could leave `is_open=true`, and Marketplace claim checked that flag without requiring `PUBLISHED` status.
- Remediated: within the claim transaction, Marketplace requires both `shift.status == PUBLISHED` and `isOpen`. Staffed cancellation also clears `isOpen` before saving the CANCELLED shift.
- `SchedulingPostgresIntegrationTest.cancelledOpenShiftRejectsMarketplaceClaim` deliberately persists a future CANCELLED shift with `is_open=true`, then verifies real isolated PostgreSQL commits no assignment and leaves the parent CANCELLED. The test uses real transaction/persistence logic; Redis locking and notifications are mocked by the harness.

## PostgreSQL evidence collected this audit

- Executed scripts/test-scheduler-postgres.ps1 on the existing isolated services. Database identity asserted as shiftsync_scheduler_test; business data sources were not used.
- Existing 45 integration cases passed with zero skipped, including auto/manual slot-capacity races, cross-store overlap races, swap-vs-auto and marketplace-vs-auto conflicts, rollback and stored-preview/apply scenarios.
- This supersedes the earlier claim that there is no real PostgreSQL concurrency evidence. It does not establish every concurrency scenario: Redis locks and notification delivery are mocked, and no API load benchmark was run.
- The new focused cancelled-claim test also passed after configuring its mock lock; its first run failed due to missing mock setup, not a product assertion.
- Original suite evidence: target/scheduler-postgres-evidence/TEST-com.shiftsync.shift.service.SchedulingPostgresIntegrationTest.xml (45 tests). Focused evidence: target/scheduler-postgres-evidence/TEST-marketplace-cancelled-audit.xml (1 test).

### BE-027 — P1: splitting payroll periods inside one ISO week changes overtime pay

- Historical defect: period generation discarded earlier work in a touched ISO week, making overtime depend on arbitrary payroll-period boundaries.
- Remediated: generation supplies touched-week history to calculation. Earlier segments consume weekly capacity but only work within the requested period is paid.
- `PayrollAuditCharacterizationTest.splittingPayrollInsideWeekKeepsEarlierHoursForOvertime` verifies Monday's six hours are counted when Tuesday's four-hour period is calculated, yielding two overtime hours.

### BE-028 — P2: payroll merges equal ISO week numbers from different years

- Historical defect: grouping by week number alone merged identical ISO week numbers across different years.
- Remediated: the payroll accumulator key is the actual Monday week-start date, which encodes both week-based year and week number.
- `PayrollAuditCharacterizationTest.sameWeekNumberInDifferentYearsIsNotMerged` verifies two week-44 intervals one year apart have no artificial overtime.

### BE-029 — P2: shift reminders query UTC clock times against local shift fields

- Historical defect: reminder lookup compared UTC wall-clock values to business-local `shiftDate` and `startTime`, producing a seven-hour offset and potentially the wrong date.
- Remediated: the scheduled job computes `now` in `Asia/Ho_Chi_Minh`, passes a date-aware start/end window to the repository and supports a window that crosses midnight.
- `ReminderAuditTest.midnightWindowUsesBothDatesAndFiltersCancelledShifts` verifies the query uses both calendar dates for a 23:55–00:10 window. `SchedulingPostgresIntegrationTest.reminderQueryIncludesBothDatesAndExcludesCancelledAndUpperBound` verifies the database query boundaries.

### BE-030 — P2: reminders are sent for cancelled and unpublished shifts

- Historical defect: retained assignments from cancelled or unpublished shifts could enter reminder delivery.
- Remediated: `findPublishedReminders` filters `shift.status = PUBLISHED`, and the job rechecks `PUBLISHED` immediately before dispatching a notification.
- The same unit and PostgreSQL tests above include a cancelled fixture and verify it is excluded.

### BE-031 — P2: shift-template validation rejects valid overnight schedules

- Historical defect: template validation used same-day `LocalTime` ordering and rejected a valid overnight 22:00–06:00 shift in a 22:00–06:00 store.
- Remediated: creation, update, deactivation and DTO within-hours status all use `OperatingHours.contains`, which models overnight intervals and rejects zero-duration ranges consistently.
- `OvernightOperatingHoursAuditTest.validOvernightTemplateIsAcceptedAndMarkedWithinHours` verifies the template persists and reports within operating hours.

### BE-032 — P2: overnight quota calculations use wrong midpoint and negative hours

- Historical defect: quota midpoint and duration used raw same-day `LocalTime` differences, creating a false 14-hour fallback and negative labor duration for overnight stores.
- Remediated: `HeadcountQuotaService` normalizes an overnight close into the following day for both midpoint and duration calculations.
- `OvernightOperatingHoursAuditTest.quotaUsesActualMidpointAndPositiveDurationForNightStore` verifies a 22:00–06:00 store produces 02:00 and 8 hours.

### BE-033 — P1: approved swaps assign employees to roles they are not qualified to perform

- Historical defect: a manager-approved swap could replace the staff on two assignments while retaining their original role IDs, without proving the incoming employee was qualified for the destination role.
- Remediated: immediately before saving the exchanged assignments, `ShiftSwapService` calls `validateSwapSkill` for each destination assignment. That validation resolves the assignment's exact required role, requires a current non-expired matching skill and rejects an invalid or ambiguous role reference.
- `SchedulingPostgresIntegrationTest.swapRejectsEmployeesWithoutDestinationSkills` creates opposite single-role qualifications on two published shifts, performs the normal create/accept flow and verifies approval is rejected with no active assignment lacking its required skill. It passed against isolated PostgreSQL on 04/11.

### BE-034 — P1: cross-store support work falls outside both stores' payroll calculation

Cross-store leave follow-up (02/11): payroll also retrieves an approved receiving-store leave when its removal provenance identifies a support assignment owned by the home store. Foreign leaves do not compensate ordinary home-store assignments. The PostgreSQL paid-leave regression now covers both submission stores with dual employment and checks that the receiving payroll pays zero while the home payroll pays the eight support hours at the assigned role rate. The full PostgreSQL regression class and three payroll calculator test classes passed after this change (`target/support-leave-regression.log`).

Remediation in progress (02/11): the user selected the employee's home store as payroll owner. Support acceptance now records the source employment on the assignment; V61 backfills identifiable accepted legacy proposals and rejects missing/ambiguous ownership. Payroll attributes support work and removed paid-leave assignments to that employment, excludes duplicate payment at the receiving store even with dual employment, and aggregates weekly overtime with home-store work. The receiving assignment's position rate is used where configured. Mutation guards protect the home payroll period as well as the receiving store's period. Four PostgreSQL regression cases passed with zero failures/errors (`supportAttendanceIsPaidOnceByEmployeesHomeStore`, `supportShiftRemovedByPaidLeaveIsPaidByHomeStore`, `homePayrollLockProtectsSupportAssignmentAndAttendance`, `supportWorkSharesHomeStoreWeeklyOvertimeThreshold`). Historical rate snapshots and all cross-store lifecycle paths still require review; these tests do not close the entire finding.

- WorkforceRequestService.respondToProposal creates an assignment in the requesting store for staff actively employed at the target store. It does not create a requesting-store employment or a separate payroll settlement record.
- PayrollCalculationService.generatePayroll selects active employments for its store and assignments whose shift belongs to that same store. A's generation sees the support shift but omits employee B from its calculation cohort. B's generation sees the employment but excludes the shift performed at A.
- Scenario: employee has only B employment, accepts support at A, completes attendance at A. Generating A and B payroll through the current query paths does not include that work in either person's calculated hours.
- Distinct from BE-018: the contract is still active, but belongs to the other store.
- PostgreSQL execution evidence: SchedulingPostgresIntegrationTest.auditSupportAttendanceIsUnpaidInBothStorePayrolls runs the normal create/propose/accept support flow, persists attendance 09:00–17:00, and invokes generatePayroll for both stores over a two-day period. SQL verifies attendance duration=8h while the sum of the employee's generated total_hours across both stores is 0h. Test passed with real DB/repositories and transaction services; notifications are mocked. Evidence: target/scheduler-postgres-evidence/TEST-support-payroll-audit.xml.
- Initial reproduction used a one-day period and hit chk_payroll_period_dates, whose end date must be strictly after start; corrected fixture uses a two-day period. That failed setup is not evidence for the support-payroll defect; the subsequent successful assertions are.
- Correction: define payroll ownership/settlement for support work and implement it consistently, including historical rate and skill/placement attribution. Simply adding duplicate employment can double-count other work and requires explicit accounting rules.

### BE-035 — P1: default integration-test execution is not isolated from the operational datasource

Remediation in progress (02/11): test resources use dedicated `TEST_DB_*`/`TEST_REDIS_*` configuration and do not load the operational `.env`; CI creates `shiftsync_test`. A test-only environment processor and context guard reject PostgreSQL URLs without a test database name and require explicit opt-in for nonlocal hosts, before datasource beans start. An intentionally unsafe URL targeting a closed port was rejected by the guard before a connection attempt; isolated PostgreSQL tests passed. `TX003AuditIntegrationTest` now cleans up only its own UUID-scoped records instead of deleting all audit logs. Guard coverage of every possible test runner and external override still requires review.

Full-suite follow-up (02/11): `mvn test` on newly created isolated `shiftsync_test_final` (port 55432, isolated Redis) completed with 789 tests, 0 failures, 0 errors and 73 skipped. This does not cover the skipped opt-in tests or prove GitHub Actions status. Log: `shiftsync-backend/target/backend-isolated-final.log`.

Verification follow-up (02/11, 16:04): after restarting the stopped Docker engine, Windows reserved port 55432, so a fresh isolated PostgreSQL 16.4 instance was created at localhost:55482. The default suite on `shiftsync_test_support_verify` passed: 803 tests, 0 failures/errors, 86 skipped (`target/backend-support-verify-port55482.log`). The explicitly enabled `SchedulingPostgresIntegrationTest` then passed all 90 tests without skips on a separate fresh `shiftsync_scheduler_test` database (`target/scheduler-support-verify-port55482.log`), including migrations through V61. The scheduler test configuration now accepts `TEST_DB_PORT`, retaining its dedicated database-name assertion. The first attempted rerun before restoring Docker failed and is not counted as successful evidence. These local runs do not establish GitHub Actions status or resolve the remaining historical rate questions.

- TX003AuditIntegrationTest is a plain @SpringBootTest without datasource override or opt-in guard. Its @BeforeEach invokes auditLogRepository.deleteAll() outside an enclosing test transaction.
- There is no application-test.properties in src/test/resources. Other @ActiveProfiles("test") integration tests consequently also inherit the application's datasource unless external overrides are supplied.
- application.properties defaults to the shiftsync database and loads environment-backed connection settings. Thus ordinary mvn test can connect to an operational database and erase audit logs when this context starts successfully.
- During this audit the first default full-suite attempt failed application-context initialization at Redisson/Netty startup, and TX003's two test cases both report context-load errors, so its destructive setup did not execute. Subsequent full-suite execution explicitly targeted a newly created shiftsync_backend_audit_full database on isolated port 55432.
- Correction: separate unit/integration test execution, require dedicated datasource configuration and database-name assertions before destructive setup, and delete only test-owned rows. A profile named test alone is insufficient without datasource settings.

## Full-suite execution evidence

Infrastructure-test follow-up (02/11): `AuditLogIntegrationTest` and `ShiftsyncBackendApplicationTests` are no longer unconditionally disabled now that dedicated PostgreSQL/Redis configuration and the test database guard exist. The audit test waits for its UUID-scoped event, verifies before/after payloads and removes only its own rows; an older event cannot make it pass. Both tests passed with real PostgreSQL/Redis on `shiftsync_test_sse_verify` (`target/enabled-infrastructure-tests.log`). `PerformanceTest` remains disabled: it selects arbitrary existing data and swallows errors, so enabling it unchanged would provide no meaningful performance or correctness evidence.

### Linux follow-up (supersedes Windows startup as the current suite result)

- Ran the current source in maven:3.9-eclipse-temurin-21 on the isolated Docker network, with read-only source bind mount, a separate target volume, shiftsync_backend_audit_full database and test Redis. Redisson successfully initialized real Redis connections on Linux.
- Result: 693 tests, 3 assertion failures, 2 execution errors, 45 skipped. Thus broad-suite execution is now possible; the previous Windows Netty startup problem is not a universal backend startup failure.
- Failures awaiting root-cause classification: PostFixVerificationTest.testWORKFORCE001_Concurrency (parent remains PROPOSAL_SENT rather than COMPLETED), DigitalTwinConcurrencyIntegrationTest.testConcurrentSwap_DeadlockFreeAndConsistent (one success rather than two), QuotaBudgetPersistenceTest.invalidBudgetDoesNotOverwritePersistedValue (transaction-isolation exception rather than expected business exception).
- Errors awaiting classification: QuotaBudgetPersistenceTest.budgetSurvivesPersistenceContextReloadAndIsStoreScoped (outer transaction incompatible with SERIALIZABLE), NextAuditVerificationTest.testWORKFORCE001_ProposalAcceptanceIgnoresNeededCount (UnexpectedRollbackException).
- These five outcomes are not automatically five product defects. Some tests assume retries/sequential completion or use lower-isolation outer test transactions; each requires source and scenario review.
- Log: target/backend-audit-linux-full-suite.log. XML reports copied from the Linux target volume to target/linux-audit-evidence/. No product code was modified to obtain this result.

- A full default Maven test run discovered 693 cases: 0 assertion failures, 37 errors and 45 skipped. The observed errors are application-context initialization failures, including Redisson's child event loop failing to open a selector/loopback connection. This is not a successful backend verification and does not mean 37 independent product defects.
- A second run used a fresh isolated shiftsync_backend_audit_full database, isolated Redis port 56379, IPv4 preference and ActiveProcessorCount=4. It still encountered the Redisson/Netty startup failure, so changing datasource isolation alone did not resolve broad-suite startup.
- Logs: target/backend-audit-full-suite.log and target/backend-audit-isolated-full-suite.log. The separate scheduler integration tests with mocked Redisson remain valid evidence; they do not establish real Redis lock behavior.

### BE-036 — P2: workforce eligibility rejection loses its business error through transaction rollback

- WorkforceRequestService.respondToProposal uses SERIALIZABLE with noRollbackFor=BusinessException so expiration updates can commit on rejection. It calls ShiftAssignmentValidator.validateEligibility, which is a participating read-only transactional method with default rollback on RuntimeException.
- When eligibility throws BusinessException (e.g. full shift), the inner transaction interceptor marks the shared transaction rollback-only. The outer interceptor attempts to commit due to noRollbackFor and raises UnexpectedRollbackException, replacing the original business exception.
- Linux full-suite evidence: NextAuditVerificationTest.testWORKFORCE001_ProposalAcceptanceIgnoresNeededCount logs `BusinessException: Slot full: Shift requirement capacity reached` and ultimately fails with UnexpectedRollbackException at the second acceptance. Its overly large requested count exposes this path; it does not prove overfilling.
- GlobalExceptionHandler has a business-error handler but no specific UnexpectedRollbackException handler, so this replacement falls through generic server-error handling. HTTP response was not directly exercised in this reproduction.
- Correction: align transaction boundaries and rollback rules; handle expected eligibility validation without leaving a shared transaction rollback-only. Preserve intentional expiration commits separately rather than broadly committing all business failures.

## Linux suite failure classification follow-up

- QuotaBudgetPersistenceTest's two failed cases were caused by its default-isolation outer test transaction conflicting with the service's required SERIALIZABLE transaction. Changed only the test annotation to SERIALIZABLE; both cases then passed on real PostgreSQL/Redis in Linux. Evidence: target/budget-isolation-audit.log and target/linux-audit-evidence/TEST-budget-isolation-corrected.xml. Not counted as a budget product bug.
- Both workforce tests configure neededCount=2 for a shift with no requirements; the shared validator defines such a shift's capacity as 1. Thus expecting two acceptances is inconsistent with their fixture. PostFixVerificationTest also swallows the competing-thread exceptions, so a one-success result is not proof of overfill or lost updates.
- DigitalTwinConcurrencyIntegrationTest swallows all thread exceptions and expects both SERIALIZABLE writers to succeed without retry. The application maps ConcurrencyFailureException to HTTP 409. That test result alone does not prove deadlock/corruption; exception capture and retry-aware scenario verification remain needed.
- No full-suite pass is claimed: only the two budget cases were rerun after this test configuration correction.

### BE-037 — P1: ordinary staff can read coworkers' hourly pay through the employee roster

- Historical defect: a STAFF caller received full employment DTOs for coworkers through the store roster, including hourly rate and contract terms.
- Remediated: `EmploymentController` routes STAFF callers to `getStaffRoster`, a repository projection limited to employee ID, name, system role and avatar. Management retains the scoped compensation view.
- `EmploymentPrivacyAuditTest.staffRosterOmitsCoworkerCompensation` verifies the staff route never invokes `getStaffByStore`; `SchedulingPostgresIntegrationTest.staffRosterRemainsAvailableWhenCoworkerPayNeedsReconciliation` verifies the production projection omits all compensation fields.

### BE-038 — P2: draft shifts accept live attendance before publication

- Historical defect: attendance paths accepted a draft shift, allowing operational attendance before schedule publication.
- Remediated: the shared `validateAttendanceShift` guard rejects `DRAFT` and `CANCELLED` before either QR or selfie flow reads/creates attendance; the payroll lock guard remains applied afterward.
- `AttendanceGeofenceAuditTest.draftShiftRejectsSelfieCheckin` verifies no attendance save occurs for an assigned draft shift.

### BE-039 — P1: deleting a store leaves rejected-leave blackouts blocking staff at other stores

- Historical defect: closing a store changed linked leave state without removing the blackout dates or restoring the future annual-leave balance, so the staff member remained unavailable at other stores.
- Remediated: `StoreService.deleteStore` delegates to `closeStoreLeaves` before logical deletion. It reverses only future approved annual leave by calendar year, removes linked future blackouts, keeps historical attendance/leave evidence and rejects the entire closure when a future affected date is payroll-locked.
- PostgreSQL tests `closingStoreReversesFutureLeaveAndUnblocksOtherStore`, `closingStorePreservesPastAttendanceAndPastPortionOfLeave` and `closingStoreRollsBackWhenFutureLeaveIsPayrollLocked` cover the intended closure boundaries.

### BE-040 — P1: logged-out access tokens can reconnect to WebSocket

- Historical defect: logout blacklisted access tokens for REST but WebSocket CONNECT checked only signature/expiry, allowing a revoked token to reconnect.
- Remediated: CONNECT now rejects a token present at `blacklist:<token>` before loading user details. It also rejects QR tokens and credential-version mismatch, sharing the key session checks used by REST authentication.
- `WebSocketAuditTest.revokedTokenCannotReconnectThroughWebSocket` supplies a valid-but-blacklisted token to the actual inbound interceptor and verifies denial before the user service is called. The WebSocket suite passed 5 tests with 0 failures/errors on 04/11. Existing already-connected sockets are not forcibly terminated by this change; their lifecycle remains a separate operational policy.

### BE-041 — P1: cancelled assignments still block staff from receiving replacement shifts

- Historical defect: a retained assignment on a cancelled shift was still returned as active history, blocking overlap, rest and weekly-hour validation for replacement work.
- Remediated: active-shift lookup excludes cancelled parent shifts from scheduling capacity while preserving their assignments for audit history.
- `SchedulingPostgresIntegrationTest.cancelledShiftDoesNotBlockAssignmentAtAnotherStore` creates a retained cancelled assignment and verifies a same-time replacement assignment at another active store succeeds.

### BE-042 — P2: absence statistics treat overnight work as ended on its starting date

- Historical defect: absence counting compared same-day `endTime` with the clock, so a future overnight shift could be marked absent before it began; draft/cancelled assignments could inflate the cohort.
- Remediated: absence numerator and denominator share the active-assignment cohort: non-deleted published/completed shifts whose full date-aware end instant has passed in `Asia/Ho_Chi_Minh`. Missing attendance and explicit active `ABSENT` count as absent.
- `SchedulingPostgresIntegrationTest.absenceRateOnlyUsesEndedPublishedOrCompletedAssignments` verifies completed/published, cancelled, draft, future, present and recorded-absent cases; it reports two absent out of three ended active assignments.

### BE-043 — P2: reapplying a store template duplicates zones and workstations

Remediated (04/11): template application locks the store and reuses resources by normalized code, or normalized name when no code exists; existing IDs and custom properties are preserved. V60 enforces those scoped keys and rejects ambiguous legacy duplicates rather than deleting referenced data. `SchedulingPostgresIntegrationTest` reapplies the template serially and concurrently, verifies stable IDs/custom capacity and the database unique index. A code change deliberately creates a distinct resource rather than renaming an existing one.

### BE-044 — P1: equivalent attendance instants receive different holiday pay depending on their offsets

Remediated (04/11): attendance instants are converted to `Asia/Ho_Chi_Minh`, split at local midnight and each segment is classified by that local date. `PayrollCalendarAuditTest` verifies equivalent instants with different offsets receive the same holiday amount.

### BE-045 — P1: payroll amount depends on unordered same-day assignment input

Remediation update (03/11): actual attendance is split at business-timezone midnight and processed chronologically; equal start instants use assignment UUID as a stable tie-breaker. `PayrollCalendarAuditTest` verifies both reversed chronological input and simultaneous input with differing rates. This defines deterministic ordering for simultaneous records; it does not establish that overlapping attendance is valid or resolve duplicate-time business policy.

- `calculateForEmployee` sorts each week's assignments only by `shiftDate`. For assignments on the same date, input order determines which rate receives remaining standard hours versus overtime. The payroll assignment repository method `findByShift_Store_IdAndShift_ShiftDateBetween` has no ordering contract.
- `PayrollCalendarAuditTest.permutingSameDayAssignmentsChangesOvertimeAmount` uses the same two attendance records in both runs: 00:00–06:00 at rate 10 and 18:00–00:00 at rate 20, twelve hours of rest, an 8h weekly test cap and OT multiplier 1.5. Both orders yield 12 total hours and 4 overtime hours; chronological input pays 220, reversed input pays 200. Only list order changes.
- This is calculation nondeterminism, not a concurrency reproduction or a claim that the scheduler permits exceeding its hard contract cap. The small cap deliberately exercises the calculator's supported overtime branch; worked attendance may require overtime calculation even when planned hours were capped.
- Correction: define chronological overtime attribution explicitly, sort by full worked instants with a stable tie-breaker, and keep weekly/calendar segmentation correct. If another allocation policy is intended, implement that policy explicitly rather than inheriting database row order.

### BE-046 — P1: approved paid leave recovers only one of multiple deleted assignments on the same day

Remediated (04/11): leave approval records every removed assignment in `leave_removed_assignment`; payroll recovers the complete, leave-linked set instead of an arbitrary one-row fallback. `PayrollCalendarAuditTest` covers two deleted assignments, while `SchedulingPostgresIntegrationTest` verifies the approval-to-payroll PostgreSQL flow pays all eight scheduled hours.

## Payroll calendar reproduction evidence — 30/10

- Added `src/test/java/com/shiftsync/payroll/PayrollCalendarAuditTest.java`: three passing defect characterizations for BE-044–046, using real calculation logic; BE-046 additionally mocks the fallback repository.
- Ran `mvn test '-Dtest=PayrollCalendarAuditTest,PayrollAuditCharacterizationTest' '-DargLine=-XX:ActiveProcessorCount=4'`: 8 tests, 0 failures/errors/skips. Log: target/payroll-calendar-audit.log; XML: target/surefire-reports/TEST-com.shiftsync.payroll.PayrollCalendarAuditTest.xml. No product fixes or operational database writes.
- Additional source review of StoreDesignService/Repository confirmed current version reads are store-scoped, saves lock the store row and compare base revision, and workstation bindings are checked against that store. EquipmentService checks workstation store and equipment parent ownership. No new finding was established in these reviewed paths; this source review does not prove concurrency/database behavior or complete layout coverage.

### BE-047 — P2: staff can create annual-leave balances in stores where they are not employed

Remediation verification (04/11): `getMyBalance` now requires active employment at the requested store. `SchedulingPostgresIntegrationTest.leaveBalanceCannotBeCreatedAtUnrelatedStore` verifies a foreign-store request fails with 403 and creates no balance, while a request at the employee's own store creates the expected row. This exercises the real service and isolated PostgreSQL, not the HTTP/JWT transport or entitlement changes after a contract transition.

- GET `/api/stores/{storeId}/leave-requests/balances/my` (also `/leave-balances/my`) has only a role check, unlike leave creation and management endpoints which check store access. `LeaveBalanceService.getMyBalance` calls `getOrCreateBalance` without requiring active membership in the target store.
- If no active employment is found, `getOrCreateBalance` does not reject the request; it defaults to 12 days and saves a leave_balance row for the caller and arbitrary target store. A read request therefore creates employment-related data across store boundaries.
- `LeaveBalanceAccessAuditTest.staffCanSeedFullTimeLeaveBalanceAtForeignStoreBeforeJoiningPartTime` executes the actual Spring method-security-proxied controller and actual balance service. A STAFF user with no employment at the target store receives 200, the foreign store name and a saved 12-day balance. The test then simulates joining as PART_TIME: the seeded balance remains 12, while the same service creates 6 days for a comparable unseeded store with PART_TIME employment. Existing balances bypass entitlement calculation, so calling the GET before joining changes the eventual allowance under the current rules.
- Test dependencies: repositories and LeaveRequestService are mocked; controller authorization, principal roles, balance creation and DTO mapping are real. No live HTTP session, database persistence or employment activation lifecycle was exercised. The result does not establish the legally correct annual allowance; it establishes missing membership enforcement and inconsistent application of this service's own 12/6 rule.
- Correction: authorize balance access against store membership before lookup/creation, prevent non-members from initializing balances, and define entitlement initialization/reconciliation for legitimate employment changes. Consider keeping this GET read-only and initializing balances through an authorized employment/leave workflow.
- Ran with LeaveAuditCharacterizationTest on 30/10: 3 tests, 0 failures/errors/skips. Log: target/leave-balance-access-audit.log; XML: target/surefire-reports/TEST-com.shiftsync.leave.service.LeaveBalanceAccessAuditTest.xml. Passing characterization confirms the defect; production behavior has not been changed.

### BE-048 — P2: notification queue rejection escapes after transaction commit and skips later callbacks

Remediated (04/11): executor rejection is isolated and submitted to a fallback executor, so an `afterCommit` callback cannot turn an already committed transaction into an error or skip later callbacks. The saturation test verifies both the completed commit and subsequent callback. This is not a durable outbox and does not guarantee delivery after process termination.

- AsyncConfig's actual notificationExecutor has 5 core workers, 20 maximum workers and a queue of 100, using the default rejection policy. NotificationService.sendNotification registers an afterCommit callback which calls CompletableFuture.runAsync without handling executor rejection.
- `NotificationDeliveryAuditTest.fullNotificationQueueThrowsBackToCallerAfterCommitAlreadyHappened` fills that real configured executor with 120 blocked tasks (20 running and 100 queued), then executes the actual notification registration through Spring's TransactionTemplate. The afterCommit submission raises RejectedExecutionException to the caller after the recording transaction manager's commit hook has run once; rollback never runs. A second registered afterCommit callback is skipped.
- The executor and Spring transaction lifecycle are real. The transaction manager only records commit/rollback hooks and has no database resource; no committed PostgreSQL row or HTTP response was exercised. The test shuts down all worker tasks in finally and sends no external message.
- Source impact: transactional workflows such as payroll generation register notifications before returning. Under sustained saturation, a workflow can have committed its data while reporting an exception; its rejected notification and later callbacks are lost. GlobalExceptionHandler has no rejection-specific response and its generic path returns 500. Exact HTTP behavior remains source-traced rather than end-to-end verified.
- Correction: make post-commit delivery submission failure isolated from the completed business transaction; use a durable delivery/outbox strategy with retry/backpressure as required. Merely swallowing rejection would hide dropped notifications, and increasing queue size alone does not remove the failure mode.

### BE-049 — P2: closing the last SSE emitter can discard a concurrent new subscription

Session lifecycle follow-up (02/11): each HTTP SSE subscription now retains a validator for its bearer session. Notification sends and heartbeats recheck JWT expiry/type/account, Redis revocation and the current credential version; invalid sessions are removed and completed. Authentication lifecycle tests use real JWT/password/logout services with simulated repository/Redis state to verify one-session logout leaves the other stream active, password changes close existing streams, and expired/wrong-account/QR tokens or unavailable revocation storage are rejected. Emitter tests also cover validation exceptions and concurrent subscription cleanup. This is service-level evidence, not a deployed HTTP/proxy or multi-instance transport test.

- `SseEmitterService.removeEmitter` removes an emitter from the current list, checks list.isEmpty(), then unconditionally removes the user's map key. subscribe independently performs computeIfAbsent(...).add(emitter). These operations are not atomic together.
- A new subscription can add itself to that same list after removeEmitter observes it empty but before the map-key removal. The new connection remains open but is no longer tracked, so pushToUser/heartbeats cannot reach it.
- `NotificationDeliveryAuditTest.closingLastSseConnectionCanUnregisterANewlySubscribedConnection` deterministically inserts an actual service.subscribe call at that interleaving, using a CopyOnWriteArrayList subclass as an observation hook. It confirms the new emitter is present in the list while service.getActiveEmitterCount and getTotalActiveUsers both return zero after removal. Service logic and SseEmitter objects are real; this is a controlled interleaving, not an HTTP transport or stress test.
- Correction: serialize list membership changes and map removal together per user, for both subscribe and removal. A compare-and-remove on the map alone is insufficient when the concurrent subscription appends to the same list object.

### BE-050 — P2: the reminder window wraps midnight into an empty same-date BETWEEN range

Remediation verification (04/11): the reminder query uses a half-open full-date window and filters to published shifts. `SchedulingPostgresIntegrationTest.reminderQueryIncludesBothDatesAndExcludesCancelledAndUpperBound` verifies real PostgreSQL results on both sides of midnight, excluding a cancelled shift, the upper boundary and another store. Notification delivery and scheduler timing remain covered separately by mocked-service tests, not this database test.

- ShiftReminderJob computes LocalTime windowEnd=windowStart.plusMinutes(15) but keeps targetDate unchanged. The derived repository method uses startTime BETWEEN lower and upper. At a 23:45 window, upper becomes 00:00; lower is greater than upper, so no start time can match.
- `ReminderAuditTest.midnightWrappingWindowQueriesAnImpossibleSameDayTimeRange` fixes the job's clock at 21:45Z and reminderHours=2. It confirms the job queries the same date with 23:45 and 00:00, and does not notify a published 23:50 assignment. A full date-time assertion confirms 23:50 is inside the intended 15-minute window. Repository behavior is simulated with the inclusive BETWEEN predicate; PostgreSQL execution was not performed.
- Distinct from BE-029's wrong business timezone and BE-030's missing status filter: midnight wrap persists even after the clock timezone is corrected. Ranges straddling a date boundary also need to load the following date where applicable.
- Correction: build a full date-time interval and query/split it across dates with consistent half-open bounds, rather than comparing wrapped LocalTime values against one date.

## Notification/job reproduction evidence — 30/10

- Ran `mvn test '-Dtest=NotificationDeliveryAuditTest,ReminderAuditTest' '-DargLine=-XX:ActiveProcessorCount=4'`: 4 tests, 0 failures/errors/skips. Two new delivery cases, one new midnight case and the existing UTC/cancelled reminder characterization all passed.
- Log: target/notification-reminder-audit.log. XML: target/surefire-reports/TEST-com.shiftsync.notification.NotificationDeliveryAuditTest.xml and TEST-com.shiftsync.job.ReminderAuditTest.xml. No production logic changes, database mutation or external notification delivery.
- Rejected an initially suspected token-cleanup transaction defect after inspecting the current repository: UserDeviceTokenRepository.deleteByFcmToken explicitly has @Transactional. The service's self-invocation alone therefore does not establish a missing-delete-transaction failure. It is not counted as a finding.
- Source review confirmed current manual unassignment and shift deletion reject existing attendance and locked payroll dates; this does not prove safety of unrelated bulk writers or database races.

### BE-051 — P1: replacing staff through shift update bypasses the attendance-preservation guard

Remediation in progress (02/11): the replacement path rejects removal of an assignment with attendance; `ShiftUpdateAuditTest` covers the guard. The test uses mocked repositories and does not establish all concurrent attendance/replacement interleavings.

- PUT `/api/stores/{storeId}/shifts/{shiftId}` delegates to ShiftService.updateShift. If staffId changes while date/times stay the same, it calls shiftAssignmentRepository.deleteAll(existing) and then the assignment service directly. Attendance protection only runs when dateTimeChanged is true.
- This bypasses ShiftAssignmentService.unassignStaffFromShift's explicit refusal to remove assignments with existing attendance. Shift deletion has a corresponding guard as well.
- `ShiftUpdateAuditTest.replacingStaffThroughShiftUpdateBypassesExistingAttendanceGuard` configures one published shift and its original assignment with existing attendance. The actual ordinary unassignment service rejects with the attendance message and does not delete; the actual update service, given unchanged date/times and another staff ID, then calls deleteAll(original) and delegates replacement without any attendance lookup. Request includes all required date/time fields, matching DTO validation requirements.
- Service/repository-boundary proof: repositories and replacement assignment service are mocked, while update logic and ordinary unassignment control are real. No full replacement commit, eligibility validation for the replacement, or payroll recalculation was exercised. Source consequence: deleting the assignment hides the original worker's history from normal soft-delete-filtered payroll queries even though the worker has attendance; exact database/payroll outcome remains to be reproduced.
- Correction: route removal/replacement through the same attendance, payroll-lock and lifecycle invariants as ordinary unassignment, before deleting any existing assignment. Preserve worked history explicitly if a separate correction workflow is intended.

### BE-052 — P2: changing an assigned shift's time rejects the employee's own existing assignment

Remediation in progress (02/11): edit validation excludes the current shift and occupant from overlap, hour and capacity checks while retaining the other eligibility checks. `SchedulingPostgresIntegrationTest.editingAssignedShiftExcludesItselfButStillRejectsOtherConflicts` verifies an edit succeeds and a conflicting edit rolls back against PostgreSQL.

- updateShift revalidates existing staff on date/time changes by calling ShiftAssignmentValidator.validateEligibility(saved, staffId). That validator is designed for adding a new assignment: its first check rejects existsByShiftIdAndStaffId with `Staff is already assigned to this shift`. It also passes no excluded shift to overlap/hour validation and includes existing occupants in capacity checks.
- `ShiftUpdateAuditTest.changingAssignedShiftsTimeRejectsItsOwnExistingAssignment` uses actual ShiftService and actual ShiftAssignmentValidator. A note-only update succeeds for an assigned published 08:00–16:00 shift; changing to 09:00–17:00 within 06:00–23:00 store hours throws exactly the duplicate-assignment error because the employee remains assigned to this same shift. No conflict with another shift is required to trigger the rejection.
- Repositories are mocked. The test demonstrates erroneous validation routing, not PostgreSQL transaction rollback. The method is transactional, but persistence after the exception was not measured in this reproduction.
- Correction: use edit-aware eligibility validation that excludes the current assignment/shift from duplicate, overlap, hours and slot occupancy checks while still validating all other work, availability, leave, rest and skill constraints.

### BE-053 — P2: changing a draft shift's required role leaves stale assignments and reports false coverage

Remediation in progress (02/11): requirement updates reject removal of an assigned role, reductions below assigned capacity and incompatible explicit zones. Coverage counts a legacy untagged assignment only for a single-requirement shift; explicitly mismatched roles are no longer counted as that requirement. Unit tests cover the role-change guard.

- setShiftRequirements replaces draft requirements without reconciling existing assignment.requiredSkillId values. The standard form's configureRequestedRole refuses role changes on assigned shifts, but the requirements endpoint permits this alternate path.
- ShiftService.mapToDTO counts exact role matches first, then, when a shift has one requirement and zero matches, counts every active assignment as coverage for that requirement. This fallback includes assignments explicitly tagged with a different role, rather than only truly generic/untagged historical assignments.
- `ShiftUpdateAuditTest.changingRequiredRoleReportsOldRoleAssignmentAsNewRoleCoverage` changes an assigned draft's requirement from Cashier A to Kitchen B through the actual service. Response retains requiredSkillId=A on the assignment yet returns Kitchen B assignedCount=1 and shortageCount=0. The actual publishShifts then publishes that shift without reconciling the mismatch; the assignment remains tagged A.
- Repositories are mocked; the test does not establish whether that employee also has Kitchen B qualifications. The proven defect is inconsistent role assignment/coverage and lack of reconciliation, not an inferred skill deficiency. This is independent of BE-033's unqualified swap participants.
- Correction: validate/reconcile assignments when requirements change, recompute coverage from the actual required role and placement, and limit legacy fallbacks to explicitly justified untagged records. Publishing should not silently turn an unresolved role mismatch into reported complete coverage.

## Shift-update reproduction evidence — 30/10

- Added ShiftUpdateAuditTest with 3 passing defect characterizations. Ran it together with ShiftServiceAssignmentDelegationTest: 7 tests, 0 failures/errors/skips.
- Log: target/shift-update-audit.log; XML: target/surefire-reports/TEST-com.shiftsync.shift.service.ShiftUpdateAuditTest.xml. No production logic modifications or operational database writes.

### BE-054 — P2: zone changes retain workstations belonging to the original zone

- ShiftAssignmentService.swapStaffZones changes only assignment.zone and saves both assignments, leaving assignment.workstation unchanged. The existing-assignment zone-transfer branch of assignStaffToShift has the same source-level omission.
- SpatialAllocationService has another path to the same invalid state: it sets the newly selected zone, but only changes workstation when chosenWs is non-null. Reallocation without a target workstation retains a prior workstation even when its parent zone is different.
- `SpatialPlacementAuditTest.zoneSwapKeepsBothWorkstationsBoundToTheOriginalZones` calls the actual swap service for two published-shift assignments, each with a workstation in its original zone. Both zones swap successfully, but each saved assignment's workstation still belongs to the other/original zone.
- `allocatorMovesZoneButRetainsOldWorkstationWhenNoNewStationIsSpecified` gives the old zone capacity 0 and a new zone capacity 2. The actual allocator moves the employee to the new zone, reports allocation, saves the assignment and retains the workstation parented to the old zone.
- Repositories are mocked; these are saved-object/response invariants, not database constraint or deployed UI proofs. The inconsistency is observable in DTO zone/workstation IDs and can misrepresent workstation occupancy and position. No assertion is made that every zone move must keep the old role or that all zoning policies are hard constraints.
- Correction: treat zone and workstation as one coherent placement update. Reassign or clear workstation when changing its zone, enforce workstation parent/store consistency, and validate final placement before save across manual transfer, swap and automatic allocation.

### BE-055 — P2: spatial allocation ignores workstation capacity and inactive state

- SpatialAllocationService tracks only StoreZone capacity. It takes explicit requirement.workstation as chosenWs without checking Workstation.capacity, isActive or occupancy; the injected WorkstationRepository is not used to resolve available workstations.
- `SpatialPlacementAuditTest.allocatorExceedsExplicitWorkstationCapacityWhileZoneHasRoom` sets a zone capacity of 2 and an active target workstation capacity of 1, with two assignments of the required role. The actual allocator assigns both to the same workstation and reports both allocated, exceeding the workstation's stored capacity.
- `allocatorAssignsAnExplicitlyInactiveWorkstation` supplies a requirement targeting a workstation with isActive=false. The allocator assigns it and counts the employee as allocated. This shows that deactivating a workstation does not exclude it from this allocation path.
- Both use real allocator logic and mocked repositories; persisted fixture requirements are constructed directly. The API path that initially created those workstation-target requirements and concurrent workstation edits have not been exercised. Existing zone-capacity tests remain green because they do not check these workstation constraints.
- Correction: model active workstation candidates and remaining capacity as well as zone capacity, validate explicit targets, and report unmet placement instead of claiming allocation to an unavailable/overfilled resource. Preserve aggregate zone limits while enforcing workstation constraints.

## Spatial-placement reproduction evidence — 30/10

- Added SpatialPlacementAuditTest with 4 passing characterizations for BE-054–055. Ran it with SpatialAllocationServiceTest's existing 9 cases: 13 tests, 0 failures/errors/skips.
- Command: `mvn test '-Dtest=SpatialPlacementAuditTest,SpatialAllocationServiceTest' '-DargLine=-XX:ActiveProcessorCount=4'`.
- Log: target/spatial-placement-audit.log; XML: target/surefire-reports/TEST-com.shiftsync.layout.service.SpatialPlacementAuditTest.xml. No production logic changes or operational database writes.

### BE-056 — P1: password changes leave existing access and refresh sessions usable

- UserService.updateUser updates passwordHash and saves the user without revoking refresh tokens or changing an authentication/session version. Its actor-aware overload delegates to this method, including for PUT `/api/users/me`. AuthService.refresh looks up the email and issues new tokens without checking when credentials changed; JwtAuthFilter also has no credential-version/issued-before-reset check.
- `AuthSessionLifecycleAuditTest.changingPasswordLeavesExistingRefreshAndAccessTokensUsable` logs in through actual AuthService token issuance, changes the same user's password through actual UserService with real BCrypt, verifies the new password matches and the old password no longer matches, then authenticates the old access token through the real REST filter and successfully rotates the old refresh token into a new token pair.
- This does not rely on BE-001's cross-user authorization bug or BE-003's email reassignment: actor and subject are the same user and email never changes. A previously compromised refresh token remains usable after credential recovery, and the refresh path grants another seven-day TTL on each successful rotation.
- AuthService.revokeAllRefreshTokens exists, but a current main-source search finds only its declaration and no caller. Even invoking that helper needs race-safe coordination with in-flight login/rotation; that concurrency behavior has not been tested here.
- JWT generation/parsing, BCrypt, UserService, AuthService and REST filter are real; user persistence, authentication-manager credentials verification and Redis storage are mocked/simulated. The test proves post-update acceptance at service/filter boundaries, not database/Redis network integration or expiry over elapsed days.
- Correction: define credential-change/session-revocation semantics, invalidate refresh sessions as part of credential recovery, and enforce an immutable-user/session version or issued-before-reset cutoff for access tokens where required. Coordinate rotation/revocation atomically; merely changing the password hash cannot invalidate bearer credentials already issued.

### BE-057 — P2: same-second logins can share an access JWT and invalidate each other on logout

- JwtTokenProvider.generateToken includes only subject email, role, issuedAt and expiration, with no unique jti/session identifier. JWT NumericDate timestamps serialize with second precision, so repeated HMAC issuance for the same user/role within a second can produce identical access-token strings while refresh UUIDs differ.
- AuthService.logout blacklists the entire access-token string. When two independent login responses share that string, logging out the first session blacklists the second session's access credential as well, even though its distinct refresh token remains registered.
- `AuthSessionLifecycleAuditTest.sameSecondLoginsCanShareAccessTokenSoLogoutRevokesBothSessions` samples up to 20 consecutive real login-issuance pairs to observe an identical-access/different-refresh pair. It confirms the second token authenticates before logout, calls actual logout for the first pair, then verifies first refresh removed, second refresh retained, and the second access token rejected by the actual REST filter.
- This is an observed issuance collision with bounded sampling, not a clock-injected deterministic test or a claim that every pair of logins collides. Redis operations and authentication manager are simulated; JWT signing/serialization and logout/filter logic are real. No external sessions were affected.
- Correction: assign a unique access-token identifier and bind revocation to the intended session/token family. Test independent sessions and fast login/refresh/logout interactions explicitly rather than assuming every signed JWT string is unique.

## Authentication session reproduction evidence — 30/10

- Added AuthSessionLifecycleAuditTest (2 cases) and ran with TokenIdentityAuditTest (3 existing cases): 5 tests, 0 failures/errors/skips.
- Command: `mvn test '-Dtest=AuthSessionLifecycleAuditTest,TokenIdentityAuditTest' '-DargLine=-XX:ActiveProcessorCount=4'`.
- Log: target/auth-session-lifecycle-audit.log; XML: target/surefire-reports/TEST-com.shiftsync.shared.security.AuthSessionLifecycleAuditTest.xml. No production logic changes or operational token/database writes.

### BE-058 — P1: ordinary staff can download coworkers' complete payslip PDFs

- Historical defect: PDF export treated any active store member as an authorized non-owner, exposing coworkers' salary documents.
- Remediated: the service permits the owner, or an ADMIN/MANAGER with explicit store access. A STAFF principal never receives the non-owner branch, even if actively employed by the payroll store; both controller aliases delegate to this service.
- `PayslipPdfPrivacyAuditTest` exercises method security and real PDF service behavior. It verifies an unaffiliated STAFF member and an ACTIVE STAFF coworker are both rejected; the latter test additionally proves the staff membership query is not consulted as a route to authorization. The focused suite passed 2 tests with 0 failures/errors on 04/11.

## Payroll export reproduction evidence — 30/10

- Added PayslipPdfPrivacyAuditTest and ran with EmploymentPrivacyAuditTest: 2 tests, 0 failures/errors/skips. Command: `mvn test '-Dtest=PayslipPdfPrivacyAuditTest,EmploymentPrivacyAuditTest' '-DargLine=-XX:ActiveProcessorCount=4'`.
- Log: target/payslip-pdf-privacy-audit.log; XML: target/surefire-reports/TEST-com.shiftsync.payroll.PayslipPdfPrivacyAuditTest.xml. No production logic changes, operational database writes or real payroll-document access.
- ExcelExportService currently uses findByIdAndStoreId before loading the period's payslips; no analogous unscoped-period finding was established by this source review. Its string cells are written as strings rather than formulas; no formula-injection finding is asserted.
- Dashboard queries still need database-level scenario proofs, including generic shifts with no explicit requirements (SUM inner join versus scheduler's default one-slot demand), cancelled-shift cohorts and ranges cutting across payroll periods. These observations are not added to the numbered findings without adequate scenario verification.
- PostgreSQL re-verification is unavailable in this turn: Docker Desktop was launched from its installed user-local path and its backend processes are running, but repeated docker info/ps checks still report the Linux engine pipe absent. No database test run is claimed and no database was reset.

### BE-059 — P2: dashboard coverage omits generic-shift demand and can conceal a real shortage

Remediation in progress (02/11): dashboard coverage now counts each generic shift as one slot, caps coverage by role, and excludes cancelled shifts. Unit tests compare against scheduler output, and an isolated PostgreSQL test covers generic demand, an unfilled role, and cancellation. Large-period query performance has not yet been benchmarked.

- The scheduler explicitly treats a shift without skill requirements as one generic demanded slot; manual eligibility also uses capacity 1 in that case. ShiftRepository.sumRequiredStaffByStoreAndDateRange instead SUMs req.requiredCount through an inner join to requirements, which contributes no demand row for a generic shift.
- DashboardService divides the count of all assignments by that explicit-requirement-only demand, returning 0 when the sum is null/zero and capping other results at 100. Generic assignments are included in the numerator even though their demand is missing from the denominator.
- `DashboardCoverageAuditTest.fullyStaffedGenericShiftHasZeroDashboardCoverage` calls the real production autoSchedule dry-run with one preserved manual assignment on one generic draft shift: scheduler demand=1, final covered slots=1, coverage=100%, dashboard=0%.
- `genericAssignmentMasksAnUnfilledExplicitRoleInDashboardCoverage` adds another shift requiring one skill that no available employee has. The real scheduler reports demand=2, covered=1, missing=1, coverage=50%; the real dashboard reports 100% because its aggregate contract is 1 assignment / 1 explicit required slot. A real open need is thereby masked.
- Scope: both services and final scheduler evaluation are real. Repository data and aggregate values are mocked, with aggregate values chosen to match the current inner-join SUM and assignment-count query semantics on the fixture. Dry-run transaction rollback marker is mocked. The actual JPQL/PostgreSQL execution has not been verified; these tests are cross-service reproductions of the source-level query/service mismatch, not database integration tests.
- Correction: use one consistent demand/coverage model across scheduler, dashboard and per-role reporting, including generic shifts. Cap coverage within individual requirements before aggregating so assignments for one demand cannot conceal an unrelated shortage. Keep the required shift-status/date cohort explicit.

## Dashboard coverage reproduction evidence — 30/10

- Added DashboardCoverageAuditTest with 2 passing characterizations and ran with DashboardServiceTest's 10 existing cases: 12 tests, 0 failures/errors/skips.
- Command: `mvn test '-Dtest=DashboardCoverageAuditTest,DashboardServiceTest' '-DargLine=-XX:ActiveProcessorCount=4'`.
- Log: target/dashboard-coverage-audit.log; XML: target/surefire-reports/TEST-com.shiftsync.shift.service.DashboardCoverageAuditTest.xml. No production logic changes or operational database writes.
- Docker startup limitation is now diagnosed from the current host backend log rather than inferred from a missing pipe: at 03:02:03 UTC, com.docker.backend reports `backend crashed` while initializing the Ingest server, because its user-local sailor-ingest.sock cannot be accessed/removed by the system. Repeated engine queries still have no Linux-engine pipe. This is an external test-runtime failure, not a numbered ShiftSync backend defect. No factory reset or Docker data deletion was attempted.

### BE-060 — P1: workforce support validates any shift role instead of the requested role and saves an untagged assignment

- Historical defect: workforce support previously validated generic shift eligibility, which could accept an employee for a different vacant role than `request.skill`; the created assignment had no required-role ID.
- Remediated: proposal and acceptance now pass the requested skill to `ShiftAssignmentValidator.selectClaimSkill`. It verifies a remaining capacity and a valid, non-expired qualification for that exact role. The accepted assignment records the selected `requiredSkillId`, `WORKFORCE_SHARING` source and the active source-store employment.
- `WorkforceRoleStateAuditTest.kitchenSupportRequestRejectsCashierOnlyStaff` proves a Cashier-only employee is rejected for a Kitchen request. `acceptedSupportAssignmentRecordsRequestedSkill` verifies a valid assignment records the requested role and workforce metadata.

### BE-061 — P2: a workforce proposal can be accepted after its destination shift is cancelled

- Historical defect: a pending workforce proposal could previously be accepted after its destination shift was cancelled.
- Remediated: `validateSupportShift` is invoked while creating a request, proposing staff, listing eligible staff and accepting a proposal; it permits only a `PUBLISHED` destination shift. Acceptance additionally locks the parent request and accepts only actionable request states.
- `WorkforceRoleStateAuditTest.pendingProposalCannotCreateAssignmentAfterShiftIsCancelled` changes a staffed published fixture to `CANCELLED` after proposal, then verifies acceptance is rejected, the request remains open for remediation and no new assignment is saved.

## Workforce role/state reproduction evidence — 30/10

- Added WorkforceRoleStateAuditTest (2 cases); ran with WorkforceRequestServiceTest's 2 existing cases: 4 tests, 0 failures/errors/skips.
- Command: `mvn test '-Dtest=WorkforceRoleStateAuditTest,WorkforceRequestServiceTest' '-DargLine=-XX:ActiveProcessorCount=4'`.
- Log: target/workforce-role-state-audit.log; XML: target/surefire-reports/TEST-com.shiftsync.workforce.service.WorkforceRoleStateAuditTest.xml. No production logic changes, external messages or operational database writes.
- Rejected a broader suspected “no active employment still accepted” conclusion after inspecting StaffContractLimit: an empty active-employment list explicitly throws, and the current actual time validator uses it. That broad scenario is not counted as a finding; source-store changes while other active employments remain still need their own policy and scenario review.

### BE-062 — P2: adjustment approval calculates status before resolving fallback attendance

- AttendanceAdjustmentService.approveRequest calculates effectiveCheckIn and PRESENT/LATE before resolving an existing attendance through the assignment when request.attendance is null. If requestedCheckIn is also null, that calculation sees no check-in and defaults to PRESENT even when the later lookup returns a LATE record.
- `AdjustmentAuditCharacterizationTest.checkoutApprovalLosesLateStatusWhenAttendanceAppearedAfterSubmission` supplies a checkout-only pending request without an attendance reference and an existing 09:10 check-in for a 09:00 shift. The actual approval loads the existing attendance through its assignment, keeps 09:10, approves the request and saves status PRESENT instead of retaining/recomputing LATE.
- This state can arise when attendance is created after the request, or when the optional attendanceId was omitted; createRequest checks assignment ownership in that branch but does not bind an already-existing attendance. The reproduction constructs the pending/fallback state directly, rather than running the entire submission-to-approval lifecycle.
- All timestamps in this fixture use +07:00; this is distinct from BE-023's offset conversion bug and BE-022's invalid merged interval. Repositories are mocked and transaction races are not exercised.
- Correction: resolve the final attendance first, merge requested and existing timestamps, validate the effective interval, then classify and save from those final values.

### BE-063 — P2: attendance edits and adjustment approval do not recompute early-leave status from checkout

- Adjustment approval computes only PRESENT or LATE from check-in; it never evaluates the effective checkout against shift end/early-leave grace. The ordinary live checkout path does classify EARLY_LEAVE, so equivalent approved times can receive a different status depending on the mutation path.
- `AdjustmentAuditCharacterizationTest.approvedEarlyCheckoutIsStillMarkedPresent` approves a checkout change to 15:00 for a published 09:00–17:00 shift with on-time check-in. Saved checkout is 15:00 and status remains PRESENT, despite the default 5-minute early-leave grace.
- AttendanceService.updateAttendance has another path to the same inconsistency: it preserves any pre-existing EARLY_LEAVE unconditionally and otherwise checks only lateness. `AttendanceEditStatusAuditTest` demonstrates both directions: correcting 15:00 to 17:00 leaves EARLY_LEAVE, while changing 17:00 to 15:00 leaves PRESENT.
- These tests call actual approval/update services with mocked persistence/config lookup; no deployed attendance session or payroll calculation was exercised. The proven failure is inconsistent derived status, not a claim that every early-leave event must supersede LATE when both conditions apply.
- Correction: share a status calculation based on final check-in/checkout, actual date-aware shift boundaries, business timezone and configured grace periods, with an explicit precedence policy. Do not inherit a stale status or ignore the edited checkout.

### BE-064 — P1: managers can read attendance-adjustment reasons across stores without membership

- GET `/api/stores/{storeId}/attendance-adjustments` checks only hasAnyRole(MANAGER, ADMIN). AttendanceAdjustmentService.getRequests accepts storeId and reads its requests without checking the actor or store access, for both status-filtered and unfiltered branches.
- The approval/rejection service methods do check management membership, but those write-side guards do not protect listing. Requests expose staff identity, shift/time corrections and reason/note fields to any manager who knows another store's ID.
- `AttendanceAdjustmentPrivacyAuditTest.managerWithoutStoreAccessCanReadForeignAdjustmentReasons` executes the actual method-security-proxied controller and actual list/mapping service. STAFF control is rejected; a MANAGER for whom StoreAccessService would return false receives 200 with the foreign employee ID and `Private correction reason` from the target store. The tested list call is the unfiltered branch.
- Request repository is mocked; the test does not establish a live JWT/HTTP exploit or retrieve actual private information. This is a separate controller/service read path from BE-012's generic staff-request disclosure and requires its own store-scoped authorization.
- Correction: authorize ADMIN or MANAGER with explicit target-store access before either query branch, keeping sensitive explanation data scoped consistently with approval and rejection.

## Attendance status/privacy reproduction evidence — 30/10

- Extended AdjustmentAuditCharacterizationTest with 2 cases; added AttendanceEditStatusAuditTest (2 cases) and AttendanceAdjustmentPrivacyAuditTest (1 case).
- Ran these with AttendanceAdjustmentServiceTest: 18 tests, 0 failures/errors/skips. Command: `mvn test '-Dtest=AdjustmentAuditCharacterizationTest,AttendanceAdjustmentServiceTest,AttendanceAdjustmentPrivacyAuditTest,AttendanceEditStatusAuditTest' '-DargLine=-XX:ActiveProcessorCount=4'`.
- Log: target/adjustment-state-privacy-audit.log. XML files are under target/surefire-reports for those classes. Passing characterizations confirm current defects; no production logic changes or operational database writes.

### BE-065 — P2: alternate demand-writing APIs bypass shift lifecycle and payroll-date protections

Remediation in progress (02/11): quota write paths now reject locked payroll dates and non-draft canonical shifts; quota reductions below assigned staff are rejected. The direct requirement endpoint also checks payroll locks, and bulk demand refuses published/cancelled/completed or already assigned shifts. Unit tests cover lifecycle, locking and capacity; PostgreSQL regression verifies that published and paid-period requirements remain unchanged. Concurrency with payroll confirmation still requires separate verification.

Concurrency update (03/11): a PostgreSQL race reproduced confirmation committing between quota's lock check and its write. Quota update, auto-fill, apply, direct requirement edits and bulk demand now lock the store; payroll status changes also advance an internal store version, so a SERIALIZABLE writer waiting with an older snapshot cannot commit after confirmation. PostgreSQL tests cover both orderings for quota updates and confirmation-first for auto-fill, apply, direct requirement edits and bulk demand. Shift creation, editing, deletion and publication acquire ordered locks for the receiving store and affected support-payroll stores; PostgreSQL tests cover edit and publication races. Manual assignment, removal and zone swaps take the same locks; both orderings were tested for manual assignment, and confirmation-first was tested for removal and zone swaps of support staff. Attendance mutation still requires independent concurrency verification.

Attendance follow-up (03/11): PostgreSQL races reproduced deletion and adjustment approval after payroll confirmation. AttendanceService now locks the receiving and, for support assignments, payroll-owning stores in stable order before checking payroll status for QR/selfie and manual edits/deletion. Adjustment approval takes the same ordered store locks before checking either payroll period. Tests cover both orderings for deletion and adjustment approval, including confirmation-first at the home store for support staff. Other attendance actions and cross-store races remain to be verified independently.

- HeadcountQuotaService.updateQuota resolves an existing shift by store/date/times and mutates requiredCount without checking its status or payroll-date lock. Its getOrCreateShift returns published/completed/cancelled shifts unchanged rather than limiting the write to editable drafts.
- `QuotaMutationAuditTest.quotaUpdatesRequirementsThatOrdinaryEndpointRefuses` covers PUBLISHED, COMPLETED and CANCELLED shifts: actual ShiftService.setShiftRequirements rejects each state, while actual updateQuota changes requiredCount from 1 to 3 and invokes save, retaining that state.
- `quotaStillMutatesDraftOnLockedPayrollDate` supplies a confirmed/paid-date lock: actual ShiftService.updateShift refuses the same draft/date with its LOCKED/PAID message; quota update still changes and saves the requirement. The quota service has no payroll repository/lock lookup. Lock state and persistence are simulated, not a concurrent payroll-confirmation proof.
- ShiftService.saveBulkDemandPlanning is another alternate path: it checks payroll locks but skips only COMPLETED, leaving PUBLISHED/CANCELLED editable. `bulkDemandAlsoBypassesTheRequirementsEndpointStateGuard` covers those two states and changes their requirements to 4 after the dedicated requirements endpoint rejects them.
- Correction: share explicit lifecycle/payroll mutation policy across direct requirements edits, inline quota writes, bulk demand, auto-fill and apply-to-scheduler. Do not assume a transaction isolation level supplies these missing domain guards. Any intended post-publication demand correction needs a deliberate, consistently enforced workflow and assignment reconciliation.
- Repositories and payroll lock state are mocked; actual service save calls/object mutations are verified. No PostgreSQL flush, unique-constraint behavior or committed historical-row change is claimed. Other auto-fill/apply paths still require dedicated scenario verification.

### BE-066 — P2: default quota roles are synthetic IDs unusable by writes, while auto-fill reports success without demand

Remediation update (03/11): the position catalog no longer invents default role IDs. Auto-fill and apply reject an empty catalog before creating shifts, and the daily and weekly empty states direct managers to create positions. Unit coverage verifies that no roles or shifts are fabricated; end-to-end browser verification remains outstanding.

- When a store has no operational skills, getPositions returns three default PositionDTOs (Barista, Cashier, Waiter) with UUID.nameUUIDFromBytes IDs. It does not create corresponding Skill rows.
- updateQuota requires findByIdAndStoreId for the position, so those displayed IDs are rejected as nonexistent. autoFillQuotas loads skills with findAllById(default IDs), silently skips each missing skill and still creates/saves morning and afternoon shifts. Its controller returns success=true regardless of the absence of generated role requirements.
- `QuotaMutationAuditTest.defaultPositionsCannotBeEditedAndAutoFillSucceedsWithoutAnyRoleDemand` uses the actual catalog/default-ID generation, auto-fill and controller response. With an empty skill repository, it observes three displayed defaults, a success response and two saved shifts each with zero requirements. An inline update using one of those exact displayed IDs then throws Position/Skill not found; no skill save occurs.
- Repositories are mocked to represent an empty-skill store. No browser flow, persisted schema or automatic scheduler run is exercised. The test proves an unusable catalog/write contract and misleading auto-fill success, not the intended business demand for every new store.
- Correction: either materialize valid store-scoped defaults through an explicit authorized write/initialization flow or expose them as non-editable templates and reject writes with a clear prerequisite. Avoid reporting completed role-demand generation or creating unintended generic shifts when none of the advertised roles can be resolved.

## Quota/demand mutation reproduction evidence — 30/10

- Added QuotaMutationAuditTest: 7 cases including parameterized lifecycle scenarios. Ran with HeadcountQuotaDemandRemediationTest's 16 existing cases: 23 tests, 0 failures/errors/skips.
- Command: `mvn test '-Dtest=QuotaMutationAuditTest,HeadcountQuotaDemandRemediationTest' '-DargLine=-XX:ActiveProcessorCount=4'`.
- Log: target/quota-mutation-audit.log; XML: target/surefire-reports/TEST-com.shiftsync.quota.service.QuotaMutationAuditTest.xml. No production logic changes or operational database writes.
- A suspected bulk-requirement replacement/unique-constraint issue is not counted here: the service constructs fresh requirement entities rather than reusing matching IDs, but current PostgreSQL/Hibernate flush ordering must be observed before asserting a database failure.

### BE-067 — P1: manager staff-store lookup exposes compensation from stores the manager cannot access

- Historical defect: a manager could list every active employment of an arbitrary target, including compensation from stores that manager did not manage.
- Remediated: `EmploymentService.getStoresByStaff` intersects the target's active stores with the manager's active stores; an unrelated target is denied before mapping. ADMIN and a staff member querying self retain their intended views.
- `EmploymentLifecycleAuditTest.managerCannotReadForeignEmploymentPayThroughStaffStoreLookup` verifies denial for an unrelated manager, while `managerSeesOnlySharedStoreWhenEmployeeWorksAtMultipleStores` verifies the shared-store-only result.

## Employment lifecycle/privacy evidence — 30/10

- Added EmploymentLifecycleAuditTest (2 cases), ran with EmploymentPrivacyAuditTest (1 existing case): 3 tests, 0 failures/errors/skips. Command: `mvn test '-Dtest=EmploymentLifecycleAuditTest,EmploymentPrivacyAuditTest' '-DargLine=-XX:ActiveProcessorCount=4'`.
- Log: target/employment-lifecycle-audit.log; XML: target/surefire-reports/TEST-com.shiftsync.employment.EmploymentLifecycleAuditTest.xml. No production logic changes or operational database writes.
- Observed but not numbered as a confirmed defect: soleManagerCanRemoveOwnEmploymentAndLoseStoreAccess demonstrates the actual employment-removal route permits a manager to inactivate their own last membership and lose subsequent store access, whereas UserService's user-deletion path rejects a sole manager. The test uses actual method security/services with mocked sole-manager/membership state. This is a guard/lifecycle difference requiring an explicit offboarding policy; a user-deletion guard alone does not prove that employment withdrawal must be prohibited. Existing store/user lifecycle specifications found in the reviewed docs do not settle that policy, so no store-orphaning bug is asserted from this evidence alone.

### BE-068 — P2: scheduler weight defaults can be read but cannot be saved when the row is missing

Remediation in progress (02/11): GET and PUT verify the store exists, and PUT creates the default-backed configuration when absent. `SchedulerConfigBootstrapAuditTest` checks initial save and missing-store rejection with mocked repositories.

- SchedulerConfigurationController.getConfig returns a valid default configuration when findByStoreId is empty. updateConfig validates the weight sum, then requires an existing row and throws Config not found instead of creating one.
- `SchedulerConfigBootstrapAuditTest.missingRowReturnsDefaultsButCannotSaveEvenThoseValidDefaults` reads the actual controller defaults (200, id=null), copies them into SchedulerConfigUpdateDTO, passes actual Jakarta Bean Validation, and attempts the actual PUT handler. It receives BusinessException with status 404/Config not found and no repository save.
- The missing-row state is reachable in current source: StoreService.createStore only saves the Store; the reviewed main Java source has no scheduler-configuration creation/save path other than updating existing rows, and reviewed migrations provide column defaults but no row-initialization trigger. AutoScheduleService can run with in-memory defaults, so successful scheduling does not initialize the row either.
- Repository is mocked; no real new-store creation, HTTP method security or database migration run is exercised by this test. The defect is the controller read/write contract for an otherwise legitimate missing configuration, not failure of DTO validation.
- Correction: initialize the configuration in an authorized store-creation/first-update workflow or make first PUT create it safely. Keep GET side-effect free and handle concurrent initialization with the unique store_id constraint.

### BE-069 — P2: generated shift deadlines ignore the configured policy and disagree across creation paths

Remediation in progress (02/11): manual, bulk and quota shift creation use one policy based on the configured hours and Asia/Ho_Chi_Minh. Unit and PostgreSQL tests verify the same instant for a six-hour setting. Existing shifts' deadlines are not automatically rewritten when times or policy change.

- ShiftService.createShift honors StoreConfiguration.availabilityDeadlineHours and interprets shift start in Asia/Ho_Chi_Minh. saveBulkDemandPlanning hardcodes 24 hours in that timezone. HeadcountQuotaService.getOrCreateShift hardcodes 24 hours and interprets the local shift date/time as UTC.
- `ShiftDeadlinePolicyAuditTest.bulkAndQuotaCreationIgnoreConfiguredDeadlineAndQuotaAlsoUsesUtcWallTime` runs those actual creation paths on equivalent 08:00–15:00 shifts, using separate simulated storage fixtures and the same store configuration of 6 deadline hours.
- Direct creation returns the intended 6-hour-before deadline. Bulk creation's deadline is 18 hours earlier than direct creation (24 hours before local start). Quota auto-fill's deadline is 11 hours earlier than direct creation, equivalent to 17 hours before the Vietnam-local shift start because its 24-hour subtraction starts from the wrong timezone.
- The fixture includes a persisted-role-shaped Skill to avoid depending on BE-066's synthetic-role failure. Repositories are mocked; no claim that the API routes, PostgreSQL ZonedDateTime round trips or actual Marketplace eligibility windows were exercised. Marketplace source does use availabilityDeadline when determining open claims, so these differing instants matter beyond presentation.
- Correction: share one deadline calculation using the defined business timezone and configured duration for direct, bulk, quota/apply and generated-plan creation. Preserve explicitly supplied deadlines where the API permits them, rather than silently mixing unrelated defaults.

## Configuration/deadline reproduction evidence — 30/10

- Added SchedulerConfigBootstrapAuditTest and ShiftDeadlinePolicyAuditTest; ran with SchedulerConfigurationControllerTest: 4 tests, 0 failures/errors/skips.
- Command: `mvn test '-Dtest=SchedulerConfigBootstrapAuditTest,SchedulerConfigurationControllerTest,ShiftDeadlinePolicyAuditTest' '-DargLine=-XX:ActiveProcessorCount=4'`.
- Log: target/config-deadline-audit.log; XML under target/surefire-reports for those classes. No production logic changes or operational database writes.

### BE-070 — P2: Marketplace publishes shifts that its own listing/claim rules cannot fulfill

- publishToMarketplace treats a summed requiredCount of zero as missing demand and substitutes assignedCount+1. Claiming instead uses max(1, summed count), while the actual assignment validator distinguishes no requirements (one generic slot) from explicit requirements whose total is zero (zero slots). Publication also lacks the time-claimability check used by listing and claiming.
- `MarketplacePublicationAuditTest.fullyStaffedGenericShiftIsPublishedAndListedButEveryFurtherClaimIsFull`: a generic shift already holding its single assignment is published/open and appears in the actual getOpenShifts result; a further claim then fails 409 at the marketplace capacity guard. Publishing invented another vacancy without changing the claim capacity.
- `explicitZeroDemandShiftIsPublishedButCapacityValidatorRejectsAllClaims`: a future shift with one explicit role at requiredCount=0 is published/listed. Marketplace's initial claim count check passes, but the actual ShiftAssignmentValidator rejects with Slot full: Shift requirement capacity reached. Zero explicit demand is not the same as an unspecified generic requirement.
- `pastShiftPublicationNotifiesStaffButTheShiftIsImmediatelyInvisibleAndUnclaimable`: a yesterday draft is promoted to PUBLISHED/open and an OPEN_SHIFT_AVAILABLE notification is requested. getOpenShifts immediately hides it and claim rejects it by time. The fixture uses the business timezone for choosing yesterday.
- Tests run the actual publish/list/claim methods and actual capacity-validator logic. Repositories, notification delivery, Redisson lock and transaction callback are simulated; the lower-level overlap/time validator is mocked because these failures occur at publication/capacity/time gates independently of staff conflicts. No real lock contention, transaction commit or external push was exercised.
- Correction: share canonical shift demand/capacity semantics across publication, listing and claim, treating explicit zero requirements differently from an empty requirement list. Reject non-actionable time/state before promotion and notification, and avoid advertising a vacancy that cannot be claimed by any otherwise eligible employee. This does not mean filtering publication for every individual employee's preferences or availability.

## Marketplace publication reproduction evidence — 30/10

- Added MarketplacePublicationAuditTest (3 cases) and ran with MarketplaceServiceTest (4 existing cases): 7 tests, 0 failures/errors/skips.
- Command: `mvn test '-Dtest=MarketplacePublicationAuditTest,MarketplaceServiceTest' '-DargLine=-XX:ActiveProcessorCount=4'`.
- Log: target/marketplace-publication-audit.log; XML: target/surefire-reports/TEST-com.shiftsync.marketplace.service.MarketplacePublicationAuditTest.xml. No production logic changes or operational database writes.

### BE-071 — P2: personal schedule endpoints expose drafts hidden from the ordinary staff schedule

- ShiftService.getShiftsByStoreId explicitly restricts STAFF results to PUBLISHED/COMPLETED. In contrast, getShiftsByStaffId and getShiftsByStoreAndStaff map every active assignment's shift without a publication-state filter.
- Those latter methods back GET `/api/users/me/shifts` and `/api/stores/{storeId}/shifts/my`, each guarded only by isAuthenticated. A draft containing a persisted manual/automatic assignment is therefore readable by the employee before management publishes it, including its note and assignment snapshot.
- `ShiftReadPrivacyAuditTest.personalScheduleRoutesExposeDraftHiddenByOrdinaryStaffScheduleList` uses the same two assigned shifts (one DRAFT with `Unpublished staffing plan`, one PUBLISHED) across all three actual controller/service paths. As an active STAFF member, the ordinary store list returns only the published shift, but both personal routes return both shifts, exposing the draft status and note.
- Method-security proxies, StoreAccessService, ShiftService filtering and DTO mapping are real; repositories are mocked. No real unpublished schedule was accessed and no HTTP/JWT/database flow was exercised. The test does not assert that historical cancelled shifts must be hidden from a personal schedule; the proven discrepancy concerns draft publication visibility.
- Correction: enforce a consistent employee-visible publication policy in every personal/store schedule read, preserving any explicitly designed manager preview/history behavior. Do not rely on the list UI to hide drafts while another endpoint returns them.

## Schedule-read privacy reproduction evidence — 30/10

- Added ShiftReadPrivacyAuditTest (2 cases), covering BE-071 and a second entry point for BE-037. Ran with SchedulingPlanControllerSecurityTest (6 existing cases): 8 tests, 0 failures/errors/skips.
- Command: `mvn test '-Dtest=ShiftReadPrivacyAuditTest,SchedulingPlanControllerSecurityTest' '-DargLine=-XX:ActiveProcessorCount=4'`.
- Log: target/shift-read-privacy-audit.log; XML: target/surefire-reports/TEST-com.shiftsync.shift.controller.ShiftReadPrivacyAuditTest.xml. No production logic changes or operational database writes.
- QR-generation authorization was source-rechecked and does require ADMIN/MANAGER plus target-store access; an initially suspected missing role guard was not established and is not added as a finding. Existing BE-038 concerns publication-state enforcement, a different check.

### BE-072 — P1: retrospective leave approval removes assignments from completed work

Cross-store concurrency verification (04/11): `SchedulingPostgresIntegrationTest.supportLeaveApprovalWaitsForHomePayrollConfirmation` submits leave at the receiving store for a support assignment and pauses confirmation at the employee's home store. It verifies leave approval waits and fails with a payroll-lock or serialization conflict, leaving the request pending and the assignment and marketplace state unchanged. `homePayrollConfirmationWaitsForSupportLeaveApproval` covers the opposite ordering: confirmation waits for approval and is then rejected because the previously calculated payroll is stale.

Additional payroll guard (04/11): leave approval locks the leave store and stores of conflicting assignments in a stable order, and checks the leave store for locked payroll on every leave date even when no assignment remains. `SchedulingPostgresIntegrationTest.leaveWithoutAssignmentsWaitsForPayrollConfirmationAndStaysPending` covers confirmation-first concurrency with no assignments, verifying the leave stays pending and no blackout is created. `payrollConfirmationWaitsForLeaveApprovalWithoutAssignments` covers approval-first ordering and verifies confirmation waits until approval and blackout creation commit. Existing per-shift checks still protect conflicting assignments and their support payroll owners.

- `LeaveRequestService.approveLeaveRequest` loads every active assignment starting within the leave dates and passes the entire result to `deleteAll` before checking shift status. Its later PUBLISHED check only controls Marketplace updates; it does not protect COMPLETED assignments from deletion.
- The ordinary `ShiftAssignmentService.unassignStaffFromShift` rejects COMPLETED shifts, dates in confirmed/paid payroll periods, and assignments with attendance. Leave approval bypasses that service and has no equivalent checks. Pending requests can remain pending until after the work date, and approval has no date cutoff.
- `LeaveAuditCharacterizationTest.retrospectiveApprovalDeletesAssignmentFromCompletedShift` runs the actual approval service with a pending SICK request three days in the past and an assignment on a COMPLETED shift. Approval returns APPROVED, saves a blackout for that day, and invokes `deleteAll` with the completed assignment. The completed shift itself is not updated.
- `ShiftAssignment` uses SQLDelete to set `deleted=true` and SQLRestriction to hide those rows from ordinary assignment reads. This establishes a path that can hide completed-work assignments through leave approval despite the explicit protection on manual unassignment.
- The unit reproduction uses mocked repositories and proves the service's deletion request and missing lifecycle gate. The additional PostgreSQL reproduction below confirms the soft delete and payroll-lock bypass; neither test demonstrates a changed payslip amount.
- Correction: validate affected assignments before applying leave effects, preserving completed/attended work and respecting payroll locks; define a separate authorized correction workflow if retrospective leave must adjust worked days. Apply validation atomically before balance deductions, blackout creation and assignment deletion.

## Leave lifecycle reproduction evidence — 31/10

- Added one completed-work approval case to `LeaveAuditCharacterizationTest`, alongside the existing overnight and cross-year cases. Ran `mvn -B --no-transfer-progress '-Dtest=LeaveAuditCharacterizationTest' test`: 3 tests, 0 failures/errors/skips, BUILD SUCCESS. Results are recorded in `shiftsync-backend/target/leave-lifecycle-audit.log` and Surefire reports. No production code changes or operational database writes.

## Completed-work leave approval on PostgreSQL — 31/10

- Added `SchedulingPostgresIntegrationTest.auditLeaveApprovalDeletesCompletedAssignmentInsidePaidPeriod`, opt-in against the fixed `shiftsync_scheduler_test` database on port 55432. The test verifies the database name before running and cleans only its random fixture IDs afterward.
- Fixture: active employee, COMPLETED shift three days in the past, persisted PRESENT attendance 09:00–17:00, and a PAID payroll period covering the work day. The actual manual unassign service rejects with LOCKED/PAID and the assignment remains active. The actual leave create/approve services then accept a SICK leave for the same date and commit successfully.
- Direct SQL after approval confirms assignment.deleted=true while attendance.deleted=false, shift.status=COMPLETED and payroll_period.status=PAID. The ordinary assignment repository no longer finds that assignment. This proves historical assignment removal despite a paid-period lock, without claiming that attendance is deleted or the paid amount changes.
- Ran `mvn -B --no-transfer-progress '-Dtest=SchedulingPostgresIntegrationTest#auditLeaveApprovalDeletesCompletedAssignmentInsidePaidPeriod' '-Dshiftsync.scheduler.postgres-tests=true' '-DargLine=-XX:ActiveProcessorCount=4 -Djava.net.preferIPv4Stack=true' test`: 1 test, 0 failures/errors/skips, BUILD SUCCESS. Log: `shiftsync-backend/target/leave-completed-postgres-audit.log`. NotificationService and RedissonClient are mocked by the existing test harness; persistence, migrations and service transactions are real. No operational database was used.

### BE-073 — P2: partial store-hours updates bypass validation and deactivate templates

- `StoreService.updateStore` validates the incoming openTime/closeTime pair before merging non-null fields into the saved store. The time guard runs only when both incoming fields are non-null, allowing a one-field update to produce a state that a two-field update rejects.
- `StoreHoursMutationAuditTest.partialOpeningTimeUpdateSavesHoursRejectedByFullUpdateAndDeactivatesTemplate` starts with a store open 08:00–22:00 and an active 09:00–17:00 template. Setting both hours to 22:00 throws BusinessException without saving. Setting only openTime=22:00 succeeds, calls store save with 22:00–22:00, and invokes the real ShiftTemplateService, which marks the template inactive and calls saveAll.
- The same final operating hours are therefore accepted or rejected depending on payload shape. Template deactivation is a material side effect of accepting the invalid merged state. ShiftTemplate's SQLRestriction hides inactive templates from ordinary reads.
- The test executes the actual store validation, update, mapping and template service, with mocked persistence. It does not prove an HTTP response, PostgreSQL commit or UI behavior. Reviewed migrations contain no store open/close ordering constraint; this is source evidence, not a database experiment.
- Correction: merge the effective opening/closing times, validate that pair under one explicit day/overnight operating-hours policy, and only then save or deactivate templates.

## Store-hours reproduction evidence — 31/10

- Ran `mvn -B --no-transfer-progress '-Dtest=StoreHoursMutationAuditTest' test`: 1 test, 0 failures/errors/skips, BUILD SUCCESS. Log: `shiftsync-backend/target/store-hours-audit.log`; Surefire XML: `TEST-com.shiftsync.store.service.StoreHoursMutationAuditTest.xml`.
- No production code changes or operational database writes.

### BE-074 — P1: concurrent staff enrollment creates duplicate active memberships and defeats one-step removal

Remediation in progress (02/11): V58 adds a partial unique index for active memberships. The service flushes the insert and maps that index's duplicate-key violation to HTTP 409; removal closes all matching active records. The PostgreSQL concurrency test now forces both existence checks to complete before inserting and confirms one success, one conflict, and no remaining active membership after removal. V58 intentionally stops if existing duplicates are found; an administrator must first review `SELECT staff_id, store_id, count(*) FROM employment WHERE status = 'ACTIVE' GROUP BY staff_id, store_id HAVING count(*) > 1`, reconcile the contracts, rates and dates, and only then retry the migration. It does not silently select a record or modify historical data.

- `EmploymentService.assignStaffToStore` performs an existence check and inserts a new ACTIVE employment in a default-isolation transaction. Reviewed migrations and Employment entity have no unique constraint for an ACTIVE staff/store pair. Two transactions can both observe no membership and both commit.
- `SchedulingPostgresIntegrationTest.auditConcurrentEmploymentCreationLeavesDuplicateActiveMembershipAfterRemoval` calls the actual service concurrently twice with the same employee/store/contract. A repository spy delegates the existence query to a real Spring Data JPA repository in the service transaction, then uses a latch after each query to ensure both queries complete before inserts. Neither existence result nor insert/commit result is fabricated.
- Both calls return successfully with distinct employment IDs. Direct PostgreSQL SQL confirms two ACTIVE rows. Calling the real `removeStaffFromStore` once succeeds but inactivates only one row; SQL then confirms one ACTIVE row remains, and the real `isStaffInStore(..., ACTIVE)` query returns true.
- `StoreAccessService.canAccessStore` directly relies on that active-membership predicate for non-admin access. The retained store-access risk follows from this predicate and source review; this test does not execute an authenticated HTTP request after removal. No payroll totals or roster counts were measured.
- Correction: enforce at most one ACTIVE membership for each staff/store pair at database level while preserving inactive employment history, map competing enrollment to a controlled conflict, and ensure removal revokes all active memberships if historical duplicates already exist. A pre-insert check alone cannot enforce this invariant.

## Employment concurrency reproduction evidence — 31/10

- Ran `mvn -B --no-transfer-progress '-Dtest=SchedulingPostgresIntegrationTest#auditConcurrentEmploymentCreationLeavesDuplicateActiveMembershipAfterRemoval' '-Dshiftsync.scheduler.postgres-tests=true' '-DargLine=-XX:ActiveProcessorCount=4 -Djava.net.preferIPv4Stack=true' test`: 1 test, 0 failures/errors/skips, BUILD SUCCESS. Log: `shiftsync-backend/target/employment-concurrency-postgres-audit.log`.
- Uses isolated `shiftsync_scheduler_test` PostgreSQL on port 55432; random fixture IDs are cleaned by the harness. The first attempted reproduction failed in test instrumentation (`callRealMethod` on an interface); the corrected test uses JpaRepositoryFactory for the real query. The successful run is evidence of a controlled interleaving, not production frequency or a load test. No production logic changes or operational database writes.

### BE-075 — P1: paid-leave payroll recovers another store's shift and changes the amount owed

- When no current assignment exists for a paid-leave day, `PayrollCalculationService.calculateForEmployee` calls `findAssignmentForStaffOnDateIncludingDeleted(staffId, date)`. That native query has no store predicate and returns one assignment from any store. The calculator then uses its scheduled hours to pay leave under the payroll store's employment/rate.
- `SchedulingPostgresIntegrationTest.auditPaidLeaveAtOneStoreUsesAnotherStoresShiftHours` creates one employee actively employed at A and B, with no shifts at A and exactly one 09:00–17:00 PUBLISHED assignment at B. Actual leave create/approve services approve SICK leave at A, soft-deleting the B assignment through the existing global absence behavior.
- The actual payroll generation service for A writes total_hours=8 and total_amount=240000, confirmed by direct SQL. Changing only B's shift end to 13:00 and regenerating A's draft payroll changes those persisted values to 4 hours and 120000. A still has zero shifts. This isolates an incorrect cross-store dependency in the paid-leave recovery path and proves a persisted amount change.
- This is distinct from BE-034's omitted workforce-support pay and BE-046's single-assignment recovery on multi-shift days: the defect here is missing store scope during paid-leave recovery. The fixture uses ordinary independent employment at both stores, not a workforce-support transfer.
- Correction: scope recovered assignments to the payroll store and appropriate shift lifecycle, recover every eligible assignment required by the leave policy, and prevent another store's schedule from determining this store's paid-leave hours.

## Cross-store paid-leave payroll reproduction evidence — 31/10

- Ran `mvn -B --no-transfer-progress '-Dtest=SchedulingPostgresIntegrationTest#auditPaidLeaveAtOneStoreUsesAnotherStoresShiftHours' '-Dshiftsync.scheduler.postgres-tests=true' '-DargLine=-XX:ActiveProcessorCount=4 -Djava.net.preferIPv4Stack=true' test`: 1 test, 0 failures/errors/skips, BUILD SUCCESS. Log: `shiftsync-backend/target/payroll-cross-store-leave-audit.log`.
- Uses real migrations, leave/payroll service transactions and queries on isolated `shiftsync_scheduler_test` PostgreSQL, with direct SQL assertions after commits. NotificationService and RedissonClient remain mocked by the harness. Random fixtures are cleaned afterward; no production logic changes or operational database writes. No HTTP authorization, external notification delivery or paid-period regeneration was exercised.

### BE-076 — P1: payroll regeneration replaces payslips after concurrent payment confirmation

- `generatePayroll` reads an existing period's status before deleting its payslips and regenerating them. `updatePayrollPeriodStatus` reads/writes that same period independently; neither path locks the period, and PayrollPeriod has no version field. The generator's earlier DRAFT status check does not guarantee that the period remains mutable until commit.
- `SchedulingPostgresIntegrationTest.auditRegenerationReplacesPayslipAfterPeriodBecomesPaid` first generates a DRAFT payslip for 8 worked hours/240000, then changes checkout to 4 hours while the period is still DRAFT. A background real regeneration reads DRAFT and pauses immediately before its native payslip deletion.
- On the main thread, an authenticated ADMIN security context calls the actual transition service for DRAFT→CONFIRMED→PAID. Both commit, and direct SQL still shows the original 240000 payslip. Releasing the generator then lets its real deletion, calculation, insert and commit complete successfully.
- Direct SQL afterward shows period.status=PAID, the original payslip ID no longer exists, and the replacement amount is 120000. Thus a generator already in flight can replace a paid period's payslip without changing the period out of PAID. No assertion of an external bank/payment transfer is made.
- Correction: serialize regeneration and status transitions on the same period row and revalidate mutability inside that boundary, or implement equivalent atomic version/state checks that prevent stale regeneration commits. Protect payslip replacement and payment confirmation together; an entry-only status read is insufficient.

## Payroll payment/regeneration race reproduction evidence — 31/10

- Ran `mvn -B --no-transfer-progress '-Dtest=SchedulingPostgresIntegrationTest#auditRegenerationReplacesPayslipAfterPeriodBecomesPaid' '-Dshiftsync.scheduler.postgres-tests=true' '-DargLine=-XX:ActiveProcessorCount=4 -Djava.net.preferIPv4Stack=true' test`: 1 test, 0 failures/errors/skips, BUILD SUCCESS. Log: `shiftsync-backend/target/payroll-paid-race-audit.log`.
- Actual service transactions, persisted calculations and status transitions run on isolated `shiftsync_scheduler_test` PostgreSQL. The payroll repository spy inserts a latch before the native delete and delegates the delete to a real JpaRepositoryFactory repository; query results, mutations and commits are not simulated. Timing is controlled to establish a reachable interleaving, not its frequency. NotificationService and RedissonClient remain mocked. No HTTP route or external payment provider was exercised; random fixtures are cleaned afterward, with no production logic changes or operational database writes.

### BE-077 — P1: swap approval assigns a new shift to someone who has left the target store

- Historical defect: the generic weekly-hour check could find an employment at a different store, allowing a staff member removed from the swap store to receive a new assignment there.
- Remediated: `managerApproveSwapRequest` now requires ACTIVE employment in the swap store for both participants before it performs validation or changes either assignment.
- `SchedulingPostgresIntegrationTest.swapApprovalRejectsEmployeeWhoLeftStore` gives the employee another active employment elsewhere, removes the employee from the swap store after acceptance and verifies approval fails, the request remains `PENDING` and both assignments stay unchanged. It passed against isolated PostgreSQL on 04/11.

## Swap/offboarding reproduction evidence — 31/10

- Ran `mvn -B --no-transfer-progress '-Dtest=SchedulingPostgresIntegrationTest#auditSwapApprovalAssignsNewShiftAfterEmployeeLeavesTargetStore' '-Dshiftsync.scheduler.postgres-tests=true' '-DargLine=-XX:ActiveProcessorCount=4 -Djava.net.preferIPv4Stack=true' test`: 1 test, 0 failures/errors/skips, BUILD SUCCESS. Log: `shiftsync-backend/target/swap-offboarding-postgres-audit.log`.
- Real migrations, repositories and employment/swap/manual-assignment service transactions run on isolated `shiftsync_scheduler_test` PostgreSQL. Both employees have the same required role; their Sunday availability covers both shifts, so no missing skill or availability exception is being bypassed in the fixture. NotificationService and RedissonClient remain mocked; no HTTP security or external notification delivery was exercised. Random fixtures are cleaned afterward, with no production logic changes or operational database writes.

### BE-078 — P2: swap approval bypasses the confirmed-payroll assignment lock

Remediation update (03/11): swap approval locks the store row before checking payroll dates, coordinating with confirmation. `SchedulingPostgresIntegrationTest.swapApprovalCannotRacePayrollConfirmation` pauses approval after its unlocked-period check and verifies confirmation waits until the swap commits. `swapApprovalWaitsForPayrollConfirmationAndPreservesAssignments` pauses confirmation first, verifies approval waits, then checks approval fails and both assignments remain unchanged. The pre-existing confirmed-period test also verifies a later approval is rejected.

- `ShiftSwapService.managerApproveSwapRequest` updates both assignments without checking payroll locks on either shift date. The ordinary assignment/unassignment paths explicitly reject changes on dates covered by CONFIRMED/PAID payroll periods.
- `SchedulingPostgresIntegrationTest.auditSwapApprovalMutatesAssignmentsAfterPayrollConfirmation` creates two active qualified employees with distinct future PUBLISHED shifts one week apart, creates/accepts their swap through the real services, then generates the covering payroll period and confirms it through the real transition service with an ADMIN security context.
- The actual manual unassign service rejects with LOCKED/PAID. The actual swap approval service nevertheless commits. Direct SQL confirms request.status=APPROVED, both assignment staff IDs exchanged, and period.status still CONFIRMED.
- This establishes a route-specific bypass of the assignment freeze. The fixture intentionally uses future shifts without attendance so swap expiration/attendance checks do not mask the missing payroll gate. It does not prove a changed payroll amount or an external payment impact. Both participants remain active at the correct store, distinguishing this case from BE-077; no concurrency is required, distinguishing it from BE-076.
- Correction: enforce the same payroll-date protections on both sides of swap approval before mutating assignments, with transaction coordination against concurrent period confirmation. Keep payroll correction/reopening under the existing authorized lifecycle.

## Swap/payroll lock reproduction evidence — 31/10

- Ran `mvn -B --no-transfer-progress '-Dtest=SchedulingPostgresIntegrationTest#auditSwapApprovalMutatesAssignmentsAfterPayrollConfirmation' '-Dshiftsync.scheduler.postgres-tests=true' '-DargLine=-XX:ActiveProcessorCount=4 -Djava.net.preferIPv4Stack=true' test`: 1 test, 0 failures/errors/skips, BUILD SUCCESS. Log: `shiftsync-backend/target/swap-payroll-lock-postgres-audit.log`.
- Real migrations, repositories and payroll/swap/assignment transactions run on isolated `shiftsync_scheduler_test` PostgreSQL. NotificationService and RedissonClient remain mocked. No HTTP method-security flow, external delivery or paid-period amount change is claimed. Random fixtures are cleaned afterward; no production logic changes or operational database writes.

### BE-079 — P2: deleted attendance blocks approval of a replacement adjustment

- Historical defect: soft deletion hid the old attendance row from application queries while the database's unconditional unique key still prevented a replacement record for the same assignment.
- Remediated: V57 removes the unconditional constraint and creates `idx_attendance_active_assignment`, a partial unique index applying only where `deleted = false`. Approval can therefore create one replacement after deletion while the database still prevents two active attendance records.
- `SchedulingPostgresIntegrationTest.deletedAttendanceAllowsApprovalOfReplacementAdjustment` deletes a real attendance row, creates and approves a replacement adjustment, verifies the new active row and confirms a second active insert is rejected. It runs against isolated PostgreSQL.

## Attendance deletion/replacement reproduction evidence — 31/10

- Ran `mvn -B --no-transfer-progress '-Dtest=SchedulingPostgresIntegrationTest#auditDeletedAttendancePreventsApprovalOfReplacementAdjustment' '-Dshiftsync.scheduler.postgres-tests=true' '-DargLine=-XX:ActiveProcessorCount=4 -Djava.net.preferIPv4Stack=true' test`: 1 test, 0 failures/errors/skips, BUILD SUCCESS. Log: `shiftsync-backend/target/attendance-delete-replacement-postgres-audit.log`. The passing characterization test expects the constraint failure and verifies rollback, rather than asserting approval succeeds.
- Real migrations, attendance deletion, adjustment creation/approval, repository queries and transaction commits run on isolated `shiftsync_scheduler_test` PostgreSQL. NotificationService and RedissonClient remain mocked. No HTTP response, selfie/QR retry or external delivery was exercised. Random fixtures are cleaned afterward, including adjustment rows referencing their shifts; no production logic changes or operational database writes.

### BE-080 — P1: concurrent rejection overwrites approval while retaining its attendance changes

- Historical defect: approval and rejection each read a pending adjustment without a shared row lock, allowing a stale terminal decision to overwrite another decision while retaining its attendance edit.
- Remediated: `AttendanceAdjustmentRequestRepository.findByIdForUpdate` uses `PESSIMISTIC_WRITE`; both approval and rejection acquire it before checking `PENDING` and applying any mutation.
- `SchedulingPostgresIntegrationTest.concurrentRejectAndApproveCannotOverwriteEachOther` holds the rejecting transaction at the locked read, verifies approval waits, then verifies approval fails after rejection commits. PostgreSQL retains `REJECTED` and the original 17:00 checkout; the focused test passed on 04/11.

## Adjustment decision race reproduction evidence — 31/10

- Ran `mvn -B --no-transfer-progress '-Dtest=SchedulingPostgresIntegrationTest#auditConcurrentRejectOverwritesApprovalButRetainsAttendanceCorrection' '-Dshiftsync.scheduler.postgres-tests=true' '-DargLine=-XX:ActiveProcessorCount=4 -Djava.net.preferIPv4Stack=true' test`: 1 test, 0 failures/errors/skips, BUILD SUCCESS. Log: `shiftsync-backend/target/adjustment-decision-race-postgres-audit.log`.
- Real service transactions, attendance/request writes and commits run on isolated `shiftsync_scheduler_test` PostgreSQL. A repository spy delegates findById to a real JpaRepositoryFactory repository and pauses only the first read using latches; request status, query results and writes are not simulated. NotificationService and RedissonClient remain mocked. No HTTP responses, notification delivery, payroll amount or production race frequency is established. Random fixtures are cleaned afterward; no production logic changes or operational database writes.

## BE-018 rehire/historical-rate reproduction — 31/10

- `SchedulingPostgresIntegrationTest.auditRehireRateRepricesWorkBeforeNewEmploymentStarted` creates the original employment through the actual enrollment service at 30000/hour. A generic completed shift thirty days before today has persisted 09:00–17:00 attendance, no requiredSkillId and no position-rate override, exercising the documented employment-rate fallback.
- Actual payroll generation for that historical DRAFT period produces 240000. The actual offboarding service then inactivates the original employment, and the actual enrollment service creates a new employment starting today at 60000/hour. Direct SQL verifies that the new joined_date is after the old period and the original employment still retains its 30000 rate.
- Regenerating the same old DRAFT period produces a persisted 480000 payslip while the attendance still spans exactly eight hours. Neither the work timestamps nor the historical employment's rate changed. The change results from choosing the newly ACTIVE episode for work preceding its start.
- Ran `mvn -B --no-transfer-progress '-Dtest=SchedulingPostgresIntegrationTest#auditRehireRateRepricesWorkBeforeNewEmploymentStarted' '-Dshiftsync.scheduler.postgres-tests=true' '-DargLine=-XX:ActiveProcessorCount=4 -Djava.net.preferIPv4Stack=true' test`: 1 test, 0 failures/errors/skips, BUILD SUCCESS. Log: `shiftsync-backend/target/payroll-rehire-history-postgres-audit.log`.
- Persistence and service transactions are real on isolated `shiftsync_scheduler_test` PostgreSQL; historical shift/attendance fixtures are inserted with SQL. NotificationService and RedissonClient remain mocked. No HTTP request, skill-rate history, overtime-rate change, CONFIRMED/PAID regeneration or external payment is established. Random fixtures are cleaned afterward; no production logic changes or operational database writes.

### BE-081 — P2: the configured weekly-hour ceiling is saved but not enforced by manual assignment

- Historical defect: the configured per-store weekly limit was persisted and shown to managers but manual assignment applied only the employee's contract ceiling.
- Remediated: `ShiftValidationService` loads the receiving store's configured ceiling and applies the lower of that value and the effective contract limit when validating the shift's touched ISO weeks. Existing cross-store overlap and rest checks are retained.
- `SchedulingPostgresIntegrationTest.configuredWeeklyHourCapLimitsManualAssignments` configures a 20-hour limit for a 48-hour contract, accepts two eight-hour assignments and rejects a third; direct SQL confirms only 16 hours are assigned. It passed against isolated PostgreSQL on 04/11.

## Configured weekly-hour ceiling reproduction evidence — 31/10

- Ran `mvn -B --no-transfer-progress '-Dtest=SchedulingPostgresIntegrationTest#auditConfiguredWeeklyHourCapDoesNotLimitManualAssignments' '-Dshiftsync.scheduler.postgres-tests=true' '-DargLine=-XX:ActiveProcessorCount=4 -Djava.net.preferIPv4Stack=true' test`: 1 test, 0 failures/errors/skips, BUILD SUCCESS. Log: `shiftsync-backend/target/store-weekly-cap-postgres-audit.log`.
- Real validation, configuration persistence, assignment services and transaction commits run on isolated `shiftsync_scheduler_test` PostgreSQL. NotificationService and RedissonClient remain mocked. No HTTP security, UI interaction, attendance payroll or external delivery was exercised. Random fixtures are cleaned afterward; no production logic changes or operational database writes.

### BE-082 — P2: spatial allocation retags completed assignments inside a paid payroll period

- Historical defect: spatial allocation could mutate zone, workstation and role attribution for a completed or payroll-locked shift, bypassing the normal assignment mutation policy.
- Remediated: allocation locks the affected payroll-store rows, checks every touched date for confirmed/paid payroll and rejects completed or cancelled shifts before it reads candidates or writes assignments.
- `SchedulingPostgresIntegrationTest.spatialAllocationCannotRetagCompletedAssignmentInsidePaidPeriod` creates a completed shift in a paid period and verifies allocation is rejected while `zone_id` and `required_skill_id` remain null. The focused PostgreSQL case is part of the current isolated regression suite.

### BE-083 — P1: confirmation accepts a payroll snapshot made stale by an attendance edit

Concurrent global-input gap (04/11): `SchedulingPostgresIntegrationTest.auditHolidayChangeCanRacePayrollConfirmation` pauses confirmation after its real holiday query, creates a 3× holiday through the actual holiday service, then lets confirmation commit. PostgreSQL retains the newly created holiday and confirms the prior 240000 payslip for eight hours. This shows that the current comparison and per-store lock do not serialize global holiday changes; it does not measure an external payment. A shared transaction-level coordination mechanism and both ordering tests are still required.

Follow-up in progress: V74 adds a shared database transaction guard for holiday writes and payroll generation/status changes. Holiday mutations reject dates covered by any confirmed or paid period. PostgreSQL tests `holidayCreationWaitsForConfirmationAndRejectsLockedDate` and `confirmationWaitsForHolidayCreationAndRejectsStalePayroll` verify both orderings. The default backend suite passed 896 tests (155 skipped) and the dedicated PostgreSQL class passed 166 tests without skips. The guard serializes these operations globally, which may affect throughput; other global payroll inputs and external database writers still require review.

Remediation in progress (04/11): confirmation requires a generation marker and recomputes the payroll for comparison without replacing the reviewed payslips. PostgreSQL tests verify stale attendance is rejected, regeneration permits confirmation, and an explicitly generated empty period can be confirmed. The status API retries serialization conflicts. Scheduler fixtures now generate their drafts before confirmation; the full scheduler PostgreSQL class passed 164 tests. Concurrent edits outside the store-lock discipline still require review before this finding is considered closed.

- `SchedulingPostgresIntegrationTest.auditConfirmationAcceptsPayrollMadeStaleByAttendanceEdit` creates eight hours of attendance and generates a draft payroll for 240000, then uses the real attendance update service to reduce the interval to four hours. The actual status transition still commits CONFIRMED while the persisted payslip remains 240000. Real PostgreSQL persistence and both application services are exercised; notifications are mocked and no external payment is made.
- Store locks serialize mutations with confirmation, but do not indicate whether payroll inputs changed after generation. A complete correction needs a reliable freshness check across all inputs used by calculation, coordinated transactionally with every applicable mutation. Checking only for an existing payslip or only for attendance changes leaves other stale-input paths open.

### BE-084 — P0 when the dev profile is reachable: development endpoint minted tokens for arbitrary accounts

- Source review on 04/11 found `/api/test/security/generate-token` in the dev-profile controller. The normal security chain required authentication, but the endpoint accepted an arbitrary email and minted a token for the existing account without verifying its password; it also created missing accounts with a caller-selected role. The exposure was conditional on the dev profile and endpoint reachability, not established for production.
- Removed the token-generation endpoint. `DevelopmentSecurityEndpointTest` verifies the remaining development controller responds on its harmless public mapping and that the token-generation mapping returns 404. This is a standalone MVC mapping test, not a deployed profile or network test.

### BE-085 — P0 when deployment omits configuration: a public JWT signing key was used as the default

- `application.properties` previously supplied a fixed fallback for `app.jwt.secret`. The same value was also used as Docker Compose's fallback, so a deployment that omitted `JWT_SECRET` could issue and accept bearer tokens signed with a key visible in the source repository.
- Removed both fallbacks. The backend now requires `JWT_SECRET`, while Docker Compose stops configuration with an actionable Vietnamese message if it is absent. The README specifies a unique random secret of at least 32 bytes and distinguishes the backend `.env` file from Compose's root `.env` file.
- Verified `docker compose config --quiet` succeeds with a temporary `JWT_SECRET` and fails when the variable is absent. Test-only profile configuration retains its isolated test secret; it is not packaged as the runtime default. Existing operational deployments must provide their own stable secret before upgrade, otherwise existing JWTs will correctly become invalid.

## Spatial allocation/paid-history reproduction evidence — 31/10

- Ran `mvn -B --no-transfer-progress '-Dtest=SchedulingPostgresIntegrationTest#auditSpatialAllocationRetagsCompletedAssignmentInsidePaidPeriod' '-Dshiftsync.scheduler.postgres-tests=true' '-DargLine=-XX:ActiveProcessorCount=4 -Djava.net.preferIPv4Stack=true' test`: 1 test, 0 failures/errors/skips, BUILD SUCCESS. Log: `shiftsync-backend/target/spatial-paid-history-postgres-audit.log`.
- Real migrations, payroll status transitions, spatial allocation and assignment persistence run on isolated `shiftsync_scheduler_test` PostgreSQL. Historical shift/attendance and the current zone are SQL fixtures. NotificationService and RedissonClient remain mocked. No HTTP authorization, UI rendering or changed paid amount is established. Random fixtures are cleaned afterward; no production logic changes or operational database writes.

## BE-010 signed-QR/paid-period database reproduction — 31/10

- Historical reproduction, superseded by the BE-010 regression above. It records the state before the shared attendance guard was added.
- The current test keeps its former name to preserve the audit trail, but it now expects both selfie and QR scans to reject after the period becomes PAID. It confirms QR signature/type/expiry parsing, geofence validation and the paid-period state against isolated PostgreSQL, and SQL confirms checkout remains null.
- The full regression on 04/11 ran with the isolated PostgreSQL service: 900 tests, 0 failures/errors, BUILD SUCCESS.
- Uses isolated `shiftsync_scheduler_test` PostgreSQL; NotificationService and RedissonClient remain mocked. No HTTP authentication or camera upload was exercised. Random fixtures are cleaned afterward; no production logic changes or operational database writes.

## Console workflow — 31/10

- Added `scripts/run-backend-console.ps1` and Vietnamese README instructions. The script invokes Maven/Spring Boot synchronously in its current console without redirecting stdout/stderr or starting the backend as a hidden process. The existing Spring configuration already writes console logs; previous audit commands suppressed live output by redirecting it to files.
- Future audit runs should leave output visible in the console; optional evidence capture must also preserve live output. Existing file-only audit logs above describe historical runs and are retained as evidence.
- Launched the script in a visible PowerShell 7 window and verified the Java listener on port 8080. GET `http://127.0.0.1:8080/actuator/health` returned HTTP 200 with status UP. The backend remains attached to that console; Ctrl+C stops it.

## Combined database audit revalidation — 31/10

- Ran `mvn -B --no-transfer-progress '-Dtest=SchedulingPostgresIntegrationTest,LeaveAuditCharacterizationTest,StoreHoursMutationAuditTest' '-Dshiftsync.scheduler.postgres-tests=true' '-DargLine=-XX:ActiveProcessorCount=4 -Djava.net.preferIPv4Stack=true' test` after the shared harness changes above: 66 tests, 0 failures/errors/skips, BUILD SUCCESS. Breakdown: 62 PostgreSQL cases, 3 leave characterization cases, 1 store-hours characterization case. Log: `shiftsync-backend/target/backend-audit-combined-postgres.log`; corresponding Surefire XML files record this combined run.
- This run verifies that the new repository spies, controlled interleavings and fixture cleanup also work alongside the existing database cases in one execution. Characterization tests pass by confirming the documented defective behavior; green tests here do not mean those production bugs are fixed. It is not a full backend suite, HTTP/security/integration audit or proof of audit completion.
- Source recheck excluded a suspected assignment soft-delete uniqueness failure: V28 replaces the strict shift/staff uniqueness constraint with a partial unique index where deleted=false. The analogous attendance case in BE-079 has no such migration and remains reproduced. No additional finding is asserted for assignment reinsertion from source review alone.

## Coverage ledger (not completion evidence)

| Area | Evidence collected | Still required |
| --- | --- | --- |
| Auth/users/security/read privacy | source review; MVC/method-security privilege/read-disclosure proofs including personal draft visibility; signed JWT/filter identity, logout, password-change and session collision tests | full JWT/database HTTP proof, complete read-policy coverage, real Redis/session concurrency and atomic revocation |
| Leave/balances | characterization tests; non-member balance creation through real method security/service; previous-night approval omission reproduced on PostgreSQL | year-split, entitlement lifecycle, pending accounting and remaining database lifecycle coverage |
| Attendance/adjustments | geofence/QR lock and merge/status service reproductions; actual method-security cross-store adjustment-list disclosure | database locking races, submission/approval lifecycle, stale data and concurrency proofs |
| Employment/contracts | source review; foreign-store contract assignment reproduced on PostgreSQL; actual security/service/mapper foreign-compensation lookup and self-removal behavior | offboarding policy/invariants, historical episodes and remaining contract mutation tests |
| Payroll/dashboard | calculator/controller tests, real method-security/PDF salary disclosure, offset/order/paid-leave recovery and cross-service generic-coverage reproductions; cross-store support payroll and inactive staff omission reproduced on PostgreSQL | historical employment episodes, database calendar round trips, actual dashboard aggregate queries, remaining time boundaries and locking tests |
| Generic requests/workforce | controller/service tests, requested-role and cancelled-shift acceptance characterizations; manager-rejected acceptance reproduced on PostgreSQL | remaining terminal states, source-employment changes and DB transaction reproductions |
| Layout/equipment/design | reference/template tests; zone/workstation coherence, capacity and inactive-target characterizations; partial source review | database integrity, current-model HTTP fixtures, concurrent versions and deletion behavior |
| Notifications/realtime | interceptor tests, executor saturation and SSE interleaving reproductions, source review | deployed socket authorization, FCM lifecycle, durable delivery and transport/load evidence |
| Scheduler/quotas/marketplace/config | partial review, synthetic benchmark, 45 existing PostgreSQL cases plus cancelled-claim reproduction; update/removal/role coverage, demand mutation/default-role, config/deadline and unclaimable-publication characterizations | PostgreSQL edit/constraint/config/publication proofs, mutation lifecycle gates, comprehensive current-code audit, Redis lock and API load evidence |
| Deployment/migrations/integrations | partial discovery only | configuration and migration checks |

## Remaining audit coverage

- Regression execution and HTTP-level proofs for findings above.
- Auth/session races, employment and store authorization, leave/balance accounting, attendance and adjustments.
- Payroll date boundaries, quotas, marketplace and request state transitions, notification delivery and transaction boundaries.
- Scheduler preview/apply concurrency on isolated PostgreSQL, broader API/database performance measurements.
- External integrations, deployment configuration and database constraints/migrations.

## Benchmark evidence limitations

The older ScheduleComparisonBenchmark uses a copied greedy loop and incompatible score comparisons; its output is not API/database load evidence. CP-SAT UNKNOWN is not proof of infeasibility.

On 30/10, AUTO-041-PRODUCTION-BENCHMARK.md adds a direct production-service benchmark with mocked I/O and an independently modeled maximum-coverage CP-SAT oracle: 5 scales × 3 seeds × 2 methods = 30 measured plans, all satisfying the benchmark's checked constraints. Three 50-staff/225-slot fixtures lose 4, 3 and 1 otherwise coverable slots in production; 200-staff/500-slot service runtime median is 6.61 seconds. The oracle proves maximum coverage only for its explicitly restricted fixture model, not full product optimality. Soft objectives are not aligned, and API/database throughput remains unmeasured. See the linked report and its CSV for reproducible data; this audit remains ongoing.
