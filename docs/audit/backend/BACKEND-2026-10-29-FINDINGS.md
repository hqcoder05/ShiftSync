# Backend audit — 2026-10-29

Status: ongoing. These findings are from current source inspection; no exploit requests were sent to a live deployment. This is not a claim that all backend bugs have been found. Existing working-tree changes are included in the inspected state.

## Confirmed source-level findings

### BE-001 — P0: Manager can reset another user's password, including an administrator

- Entry: `UserController.updateUser`, PUT `/api/users/{id}`, permits ADMIN or MANAGER without target ownership checks.
- `UserService.updateUser(UUID, UserUpdateRequest, CustomUserDetails)` discards the caller and delegates directly to the unrestricted overload (lines 227–228).
- That overload loads any user by ID and writes email and password hash (lines 165–190). No store membership or target-role check occurs.
- Reproduction: as manager A, submit an otherwise valid update for administrator B's UUID with a new password; the service saves B's new password. Sign in as B with that password.
- Impact: full account takeover across stores and privilege escalation to ADMIN.
- Related exposure: GET `/api/users/{id}` also discards caller context at UserService lines 223–224, exposing arbitrary profiles to managers.
- Required correction: enforce target scope and role hierarchy before both reads and writes, and constrain privileged credential updates separately from ordinary profile edits.
- Execution evidence: UserPrivilegeAuditTest sends GET and PUT through MockMvc against a real method-security-proxied UserController and real UserService. A MANAGER principal receives HTTP 200 for an ADMIN profile and HTTP 200 for updating that ADMIN's password. BCrypt verifies the resulting saved hash matches the submitted password while systemRole remains ADMIN. Both tests passed. Authentication is seeded in SecurityContext; repositories are mocked, so this does not exercise JWT filters, live login or database persistence.

### BE-002 — P0 when dev profile is active: authenticated users can mint refresh tokens for other accounts

- `RedisTestController` is registered under profile `dev` and exposes GET `/api/test/redis/set` and `/get` with caller-supplied arbitrary keys. There is no method role restriction.
- `SecurityConfig` requires only authentication for these paths.
- Both the test controller and AuthService use the same RedisTemplate/value serializer.
- Reproduction in an isolated dev environment: an authenticated STAFF sets `refresh_token:<chosen value>` to an existing administrator's email, then submits that chosen value to `/api/auth/refresh`.
- `AuthService.refresh` accepts the Redis value as the account identity and issues access and refresh tokens with that account's current role, without validating membership in `user_refresh_tokens`.
- Impact: account takeover when dev endpoints are reachable. This finding is conditional on profile activation; production activation was not established.
- Required correction: remove arbitrary Redis access from HTTP surfaces, or isolate it from application authentication storage with access controls. Restricting it to authenticated users is insufficient.

### BE-003 — P1: old tokens can transfer to a different account after email reassignment

- Access JWT subjects and refresh-token Redis values identify accounts by email (`AuthService.login/refresh`). JwtAuthFilter reloads the current account by that email.
- `UserService.updateUser` permits email changes but neither invalidates existing tokens nor binds them to an immutable user ID.
- Reproduction: user A logs in under email X, changes email to Y; a different account B subsequently acquires X. A's unexpired access token for X now resolves to B. A's refresh token containing X also resolves to B.
- Impact: a token issued to one identity can authenticate as another identity; severity increases if the reused email is assigned to a privileged account.
- Required correction: use immutable user IDs for token ownership and lookup; revoke sessions or enforce credential/session versions on security-sensitive changes.
- Signed-token execution proof added: TokenIdentityAuditTest.oldStaffAccessTokenAuthenticatesAsNewAdminOwnerOfEmail uses the real signing provider, real JwtAuthFilter and real CustomUserDetailsService. The original JWT's role claim is STAFF, but its resulting request principal and authorities belong to the replacement ADMIN account found at that email. A second test exercises real AuthService.refresh and verifies an old email-owned refresh token produces a newly signed ADMIN JWT. Repository reassignment and Redis are simulated; no live account takeover performed.

### BE-004 — P1: store managers can change global holiday payroll rules

- HolidayController permits MANAGER for POST, PUT, DELETE `/api/holidays`.
- HolidayService stores holidays globally, with no store scope or caller parameter.
- PayrollCalculationService loads the global holiday date/multiplier map when generating payroll (lines 106–107).
- Reproduction: manager for store A updates or deletes a holiday; payroll generated later for store B consumes the changed global rule.
- Impact: a store-scoped manager can influence other stores' payroll calculations.
- Required correction: restrict global holiday mutations to ADMIN, or introduce store-scoped overrides with ownership enforcement.

### BE-005 — P1: leave approval retains assignments that carry into the leave day

- LeaveRequestService.approveLeaveRequest queries assignments by shift start date only, from leave start through leave end (lines 187–191).
- Example: already assigned Sunday 22:00–Monday 06:00, then Monday leave is approved. The Sunday assignment is never fetched or deleted, leaving six hours of work on approved leave.
- This is distinct from the corrected AutoScheduleService eligibility check. New assignment validation does not repair existing assignments when leave is approved.
- PostgreSQL reproduction from 29/10, retained and source-rechecked on 30/10: `auditApprovingLeaveRetainsPreviousNightsAssignment` approves leave for Sunday with an existing Saturday 22:00–Sunday 06:00 assignment. The real service commits APPROVED leave and its Sunday blackout while retaining the night assignment. Evidence: target/scheduler-postgres-evidence/TEST-contract-leave-audit.xml and target/contract-leave-audit.log. Not rerun on 30/10 because Docker was unavailable.
- Correction: load the prior-day carryover and filter by actual interval overlap, respecting midnight-exclusive ends.

### BE-006 — P2: annual leave spanning years is charged entirely to the starting year

- Creation checks the start year's balance for the full request. Approval deducts all days from startDate.getYear(); cancellation reverses against that same year.
- Example: Dec 31, 2030–Jan 1, 2031 deducts two days from 2030 and zero from 2031. A person with one remaining day in each year is incorrectly rejected.
- Correction: split creation checks, deductions and reversals by calendar year.
- LeaveAuditCharacterizationTest exercises approval's actual year and day arguments and the query omission in BE-005. These characterize defects, not desired acceptance behavior; they use mocks and do not prove database concurrency safety.

### BE-007 — P1: payroll allocates overnight hours across ISO weeks incorrectly

- PayrollCalculationService groups assignments by their starting shift date's ISO week, resets the accumulator per group, then adds both sides of an overnight attendance interval to that same accumulator (lines 276–358).
- Example: with a 48h weekly cap and 46h already worked, Sunday 22:00–Monday 06:00 is counted as 2 standard + 6 overtime hours in Sunday's group. The six Monday hours belong to the following week and should consume that week's capacity. Later Monday assignments use a newly reset accumulator.
- Correction: segment actual work by calendar day and ISO week-year, then accumulate chronologically against the actual segment week. The current score/period logic also needs boundary tests before drawing payroll-wide conclusions.
- Runtime calculator evidence added: PayrollAuditCharacterizationTest.sundayOvernightHoursAreChargedToPreviousWeeksOvertime uses an 8h weekly test cap, 6h Sunday daytime and Sunday 22:00–Monday 06:00. Actual week totals are 8h and 6h, but the calculator reports 6h overtime. Real calculation logic; no database required.

### BE-008 — P1: NaN coordinates bypass selfie attendance geofencing

- AttendanceController.submitSelfie binds latitude/longitude as primitive double request parameters without finite/range checks.
- Spring conversion accepts the string `NaN`; AttendanceService.validateGeofence computes a NaN distance. The comparison `distance > radius` is false, so validation passes even with a longitude far from the store.
- AttendanceGeofenceAuditTest verifies Spring conversion and invokes the real validation method: NaN passes while ordinary distant coordinates are rejected. One test passed. This proves the guard defect, not a complete HTTP check-in exploit.
- Correction: require Double.isFinite and valid latitude/longitude bounds before distance calculation.

### BE-009 — P1: employment can reference another store's contract type

- EmploymentService.assignStaffToStore and updateEmployment load contract types with findById, without comparing contractType.store.id to the authorized storeId.
- EmploymentController authorizes only the store in the URL. A manager of A can pass a contract type UUID belonging to B and persist it on A's employment.
- Impact: scheduling weekly limits, payroll multipliers/default rates and returned contract details can come from a different store. ContractTypeService itself uses scoped findByIdAndStoreId, but employment mutation bypasses that boundary.
- PostgreSQL reproduction from 29/10, retained and source-rechecked on 30/10: `auditEmploymentAcceptsContractOwnedByAnotherStore` invokes the real assignment service for store A with a contract from B; SQL confirms the saved employment references B's contract. Evidence: target/scheduler-postgres-evidence/TEST-contract-leave-audit.xml. Both this and BE-005's reproduction passed together, 2 tests with 0 failures/errors/skips; no operational database was mutated. Not rerun on 30/10 because Docker was unavailable.
- Correction: use the scoped repository lookup for both employment mutations.

### BE-010 — P1: QR attendance bypasses the payroll-date lock

- AttendanceService.submitSelfie, updateAttendance and deleteAttendance check payrollCalculationService.isDateLocked; scanQr does not.
- Both attendance entry paths share processCheckIn/processCheckOut, which do not enforce the lock either.
- Example: while a current shift remains in its checkout window, confirm payroll for its date; scanning a valid QR can still set checkout and change worked hours after confirmation.
- Impact: confirmed payroll and source attendance diverge. A short-lived QR and the attendance time window limit exploitation, but neither enforces payroll locking.
- Runtime reproduction added 30/10: `QrPayrollLockAuditTest.lockedPayrollRejectsSelfieButQrStillWritesCheckout` supplies locked payroll for a published, assigned shift with existing check-in, valid coordinates and current checkout window. The actual selfie service rejects with the payroll-lock message and saves nothing; the actual QR service then saves non-null checkout without consulting payroll at all. JWT parsing, payroll lock lookup, repositories and event delivery are mocked. This verifies the service guard difference, not live QR cryptography or a database race.
- Correction: put lock enforcement in the common attendance mutation path, with transaction/concurrency checks against payroll confirmation.

### BE-011 — P1: generic staff-request ownership is based on mutable, non-unique full name

- StaffRequest stores requesterName without a requester user ID. StaffRequestController filters list/detail access using a case-insensitive comparison with the authenticated user's full name.
- Two unrelated users sharing a name can read each other's request contents. A user can also change their profile name to match another user. Renaming the legitimate owner's profile removes access to previously created requests.
- StaffRequestAuditTest runs the real controller/service against a mocked repository and demonstrates both same-name disclosure and loss of access after renaming. Two tests passed; HTTP authentication enforcement was not exercised.
- Correction: persist immutable requester ID, authorize by that ID, and retain name only for presentation. Existing rows need an explicit migration strategy; names cannot uniquely recover ownership.

### BE-012 — P1: any manager can read and change all generic staff requests across stores

- GET `/api/requests` applies no scope filter for MANAGER; StaffRequestService reads all rows. GET by ID similarly applies ownership checks only to STAFF.
- PUT `/api/requests/{id}/status` authorizes ADMIN/MANAGER but passes no caller to the service. updateRequestStatus loads any ID and saves the new status without store/recipient authorization.
- A manager for A can view request contents and approve/reject requests addressed to B. The entity has no store or requester identity relationship to enforce isolation.
- Correction: model requester/store/recipient IDs and enforce the authorized relationship for list, detail and decisions. Source-traced; runtime authorization proof pending.

### BE-013 — P1: a pending workforce proposal can be accepted after manager rejection

- rejectRequest accepts PROPOSAL_SENT and sets the parent request to MANAGER_REJECTED, leaving pending proposals in place.
- respondToProposal checks only COMPLETED/CANCELLED after expireIfPast. MANAGER_REJECTED and already persisted EXPIRED are not rejected. expireIfPast only acts on PENDING/PROPOSAL_SENT.
- Reproduction: propose staff, reject the parent request as the target manager, then accept the still-pending proposal as that staff member. If ordinary shift eligibility still passes, the method creates an assignment and may change the rejected parent to COMPLETED.
- Correction: permit responses only for explicitly actionable parent states and invalidate pending proposals on terminal transitions. Source-traced; service/database reproduction pending.
- PostgreSQL verification added: SchedulingPostgresIntegrationTest.auditRejectedWorkforceRequestStillCommitsAcceptedProposal runs create → propose → reject → accept through the real services. It asserts persisted MANAGER_REJECTED before acceptance, then one committed assignment and parent COMPLETED afterward. Test passed on shiftsync_scheduler_test; notifications are mocked. XML evidence: target/scheduler-postgres-evidence/TEST-workforce-rejected-audit.xml. This supersedes the pending database reproduction note above.

### BE-014 — P1: layout references can cross store boundaries

- LayoutController.addZone/updateZone load parentZoneId globally without checking its store; addWorkstation/updateWorkstation do the same for zoneId.
- Authorization checks the URL store and, for updates, the edited object's store. It never checks the referenced zone's store. Unknown IDs are also silently converted to null rather than rejected.
- Example: a manager editing workstation A can set zoneId from B; toWorkstationDto returns that foreign zone's name. The saved relationship is inconsistent with store isolation and any later per-store spatial matching.
- LayoutReferenceAuditTest.workstationCanReferenceZoneFromAnotherStore executes the real controller with mocked persistence and proves the foreign reference and foreign zone-name disclosure. No live DB mutation performed.
- Correction: reject missing/foreign zone IDs before saving on all four paths.

### BE-015 — P2: persisted zone hierarchy accepts cycles

- LayoutController.updateZone accepts the edited zone's own ID as parentZoneId and does not check ancestors before assigning parentZone.
- LayoutReferenceAuditTest.zoneCanBecomeItsOwnParent proves that the controller passes a self-parent relationship to persistence. Multi-node cycles are also not prevented by the controller.
- Impact: zone hierarchy is no longer a tree; consumers cannot rely on an acyclic parent chain. A specific recursion crash was not demonstrated and is not claimed.
- StoreDesignService has separate cycle validation for design-document items, but that does not validate the StoreZone relation edited here.
- Correction: reject self-parenting and any parent whose ancestor chain contains the edited zone, using a transaction that protects concurrent hierarchy edits.

### BE-016 — P1: payslip list leaks another store's payroll

- PayrollController.getPayslips authorizes access to storeId in the URL, then calls payrollRepository.findByPayrollPeriodId(periodId) without validating the period's store.
- A manager authorized for A can supply B's period UUID and receive B's employee names, hours, pay amounts and period details.
- PayrollAuditCharacterizationTest.payslipListDoesNotCheckPeriodStoreAgainstUrlStore calls the real controller with a foreign period and proves the foreign payslip is returned. Mocked persistence; no authenticated HTTP exploit executed.
- Correction: require periodId/storeId ownership before loading payslips or scope the payslip query by both IDs. Existing PDF/export ownership checks do not protect this endpoint.

### BE-017 — P1: approved paid leave drops overnight scheduled hours

- PayrollCalculationService.calculateForEmployee computes scheduled leave hours using LocalTime end.plusHours(24). LocalTime wraps within one day, so 06:00 plus 24 hours remains 06:00.
- For a 22:00–06:00 leave-covered shift, Duration is negative; `if (schedHours <= 0) continue` drops all leave pay.
- PayrollAuditCharacterizationTest.paidLeavePaysDayShiftButDropsOvernightShift exercises the real calculator: an 8-hour daytime shift at rate 100 receives 800, but an equally long overnight shift receives 0 under approved ANNUAL leave.
- Correction: calculate duration using date-aware intervals, then allocate paid leave to the covered calendar dates consistently with payroll boundaries.

### BE-018 — P1: employees who have left are omitted from historical payroll generation

- generatePayroll selects only employments currently ACTIVE. EmploymentService.removeStaffFromStore changes a leaving employee's record to INACTIVE immediately.
- Example: an employee works Nov 1–15 and leaves Nov 16. Generating November payroll afterward excludes them from the calculation loop despite completed attendance in the requested period. Regenerating a DRAFT payroll first deletes its old rows and then applies the same ACTIVE-only selection, so their previous payslip can disappear too.
- Correction: select employment episodes overlapping the pay period and pay actual eligible historical work; preserve historical rates and avoid paying one person's attendance twice across rehire episodes.
- PostgreSQL execution evidence added: SchedulingPostgresIntegrationTest.auditInactiveEmployeeWithAttendanceReceivesNoPayslip persists 8h completed attendance, changes the employment to INACTIVE with left_date after that work, generates the covering payroll period and verifies no payslip row for the employee. Test passed against real service transactions/repositories, with notifications mocked. The separate regeneration-deletion variation remains source-traced.

### BE-019 — P1: WebSocket subscriptions expose other users' and stores' events

- WebSocketConfig's SUBSCRIBE guard only requires accessor.getUser() != null; it never authorizes the destination or store membership.
- RealtimeEventPublisher sends personal notifications to `/topic/notifications/{userId}` and duplicates full payloads on `/topic/notifications`. Store events are likewise sent to store-specific and general domain topics.
- Any authenticated client can request these topics, including other users' IDs or global notifications. Global topics require no knowledge of a victim UUID.
- WebSocketAuditTest.authenticatedUserCanSubscribeToUnrelatedUserNotifications proves the real inbound interceptor accepts a foreign personal topic. Test boundary: interceptor only; a deployed socket subscription was not exercised.
- Correction: authorize every subscription destination, use per-user queues, scope store topics by active membership, and remove unrestricted global broadcasts containing private payloads.

### BE-020 — P1: client SEND frames to broker destinations have no authorization guard

- WebSocketConfig enables the simple broker on `/topic` and `/queue`. Its interceptor guards CONNECT and unauthenticated SUBSCRIBE only; SEND has no destination or authentication policy.
- WebSocketAuditTest.unauthenticatedSendToBrokerTopicIsNotRejectedByInterceptor confirms a SEND frame to `/topic/notifications` passes the configured interceptor. Authenticated clients also have no SEND restriction.
- Impact: clients can submit forged event payloads to broker topics; downstream UI may display false notifications or react to fabricated update events. No server-side database mutation through these events was established.
- Correction: deny client SEND to broker-owned destinations, require authentication and explicit allowed `/app` destinations. Full transport/broker delivery reproduction remains pending.

### BE-021 — P1: switching accounts leaves a device subscribed to the previous account's push notifications

- FCM registration looks up `(userId, fcmToken)` and inserts if missing. The database uniqueness constraint is the pair, so the same physical device token can be attached to multiple users.
- AuthService.logout removes authentication tokens but does not detach the FCM device. No user-facing unregister endpoint exists in the inspected controller.
- Scenario: A registers device token T, logs out; B logs in on the same app installation and registers T. Both rows remain. NotificationService selects tokens by recipient user and sends A's future notification bodies to T, now used by B.
- Conditional on the device token persisting across account switches, as the server permits. A full mobile/FCM reproduction was not executed.
- Correction: enforce a device-token ownership lifecycle, move ownership on registration, and provide authenticated device deregistration on logout.

### BE-022 — P1: adjustment approval persists an inverted attendance interval

- AdjustmentCreateRequest has no time-order constraint. AttendanceAdjustmentService.createRequest copies requested times without validation; approveRequest merges non-null requested fields into the current attendance and saves without checking the resulting interval.
- Example: attendance 09:00–17:00, approved request only changes checkout to 08:00. The saved interval becomes 09:00–08:00. Checking the DTO's two requested fields alone would also miss this partial-update case.
- AdjustmentAuditCharacterizationTest.approvalPersistsCheckoutEarlierThanExistingCheckin executes approval with real service logic and verifies that the invalid attendance is passed to save. Mocked persistence; database insertion was not exercised.
- Impact: invalid worked durations enter payroll; its accumulator ignores non-positive segments, potentially dropping pay.
- Correction: validate effective checkin/checkout after resolving any existing attendance, immediately before saving, including partial updates and concurrent changes.

### BE-023 — P2: adjustment approval calculates lateness using the client offset's wall-clock time

- approveRequest compares `effectiveCheckIn.toLocalDateTime()` to the shift's local date/time without converting to the store time zone.
- Example: shift starts 09:00 Vietnam time; approved checkin `2030-11-04T03:00:00Z` is 10:00 Vietnam time. The service compares 03:00 to 09:05 and marks PRESENT instead of LATE.
- AdjustmentAuditCharacterizationTest.utcCheckinAtTenLocalIsMarkedPresentForNineLocalShift proves this discrepancy. Both new adjustment characterization tests passed.
- Correction: normalize OffsetDateTime by instant into the store business zone before calculating status. Direct attendance updates already normalize to Asia/Ho_Chi_Minh, so the two paths currently disagree on equivalent timestamps.

### BE-024 — P1: managers can replace any employee's entire skill profile across stores

- SkillQueryController PUT `/api/users/{userId}/skills` permits any MANAGER or ADMIN and sends only userId/skillIds to SkillService.
- replaceStaffSkills loads and deletes all staff_skill rows for that user and inserts supplied IDs; neither caller scope, shared employment, nor ownership of the selected skills is checked.
- Example: manager A supplies staff B's UUID and an empty list, removing B's qualifications even when B has no relationship to A. Alternatively the manager can assign foreign-store skills, affecting scheduling eligibility and skill-based payroll rates.
- Scoped SkillController CRUD permissions do not cover this global replacement endpoint. Source trace; authenticated HTTP reproduction remains pending.
- Correction: authorize caller against target staff and affected skill stores; preserve other stores' skill records when editing a store-scoped profile.

### BE-025 — P1: saving unchanged skill IDs destroys proficiency and expiration metadata

- SkillService.replaceStaffSkills deletes all existing rows, then builds replacements containing only staffId/skillId. StaffSkill defaults level to BEGINNER and expirationDate to null.
- SkillReplacementAuditTest.savingSameSkillIdsErasesExpiryAndResetsLevel demonstrates an expired EXPERT record becomes a BEGINNER with no expiration after saving the same skill ID. One test passed against real service logic and mocked persistence.
- AutoScheduleService.hasValidSkill treats null expiry as valid, so this is also a qualification-expiration bypass rather than presentation-only data loss.
- Correction: diff membership by skill ID, retain existing records and metadata, and handle explicit proficiency/expiry edits separately with appropriate authorization.

### BE-026 — P1: cancelled open shifts still accept Marketplace assignments

- ShiftService.deleteShift cancels an assigned PUBLISHED shift but retains isOpen. MarketplaceService.claimOpenShift checks isOpen, timing, capacity and eligibility, but never requires shift.status == PUBLISHED. The shared validator does not check shift status either.
- Reproduction now verified against isolated PostgreSQL: create an eligible employee and future CANCELLED shift with is_open=true and a future claim deadline; claimOpenShift commits a new active assignment while the shift remains CANCELLED.
- SchedulingPostgresIntegrationTest.auditCancelledOpenShiftStillAcceptsMarketplaceClaim passed and queried persisted assignment count=1 and status=CANCELLED. Database transactions are real; Redis lock acquisition and notifications are mocked by the existing integration-test harness.
- Correction: enforce PUBLISHED in the transaction at claim time, clear marketplace flags during cancellation, and protect concurrent cancellation/claim transitions.

## PostgreSQL evidence collected this audit

- Executed scripts/test-scheduler-postgres.ps1 on the existing isolated services. Database identity asserted as shiftsync_scheduler_test; business data sources were not used.
- Existing 45 integration cases passed with zero skipped, including auto/manual slot-capacity races, cross-store overlap races, swap-vs-auto and marketplace-vs-auto conflicts, rollback and stored-preview/apply scenarios.
- This supersedes the earlier claim that there is no real PostgreSQL concurrency evidence. It does not establish every concurrency scenario: Redis locks and notification delivery are mocked, and no API load benchmark was run.
- The new focused cancelled-claim test also passed after configuring its mock lock; its first run failed due to missing mock setup, not a product assertion.
- Original suite evidence: target/scheduler-postgres-evidence/TEST-com.shiftsync.shift.service.SchedulingPostgresIntegrationTest.xml (45 tests). Focused evidence: target/scheduler-postgres-evidence/TEST-marketplace-cancelled-audit.xml (1 test).

### BE-027 — P1: splitting payroll periods inside one ISO week changes overtime pay

- generatePayroll loads assignments only within the requested period. calculateForEmployee resets its weekly accumulator to zero and receives no worked-hour baseline from earlier portions of the same ISO week.
- The API permits arbitrary adjacent date ranges; PayrollGenerateRequest only requires start/end dates and the service does not require week-aligned boundaries.
- PayrollAuditCharacterizationTest.splittingPayrollInsideWeekDropsOvertime uses an 8h test cap: Monday 6h plus Tuesday 4h yields 2h overtime in one calculation, but two adjacent period calculations yield 0h + 0h overtime.
- A month boundary inside a week can trigger the same loss with normal monthly payroll. This root cause is distinct from BE-007's overnight segment being attached to the wrong week.
- Correction: load complete touched ISO-week history and count preceding work toward the cap while paying only the current period's hours. Define stable chronological allocation across adjacent periods and stores.

### BE-028 — P2: payroll merges equal ISO week numbers from different years

- calculateForEmployee groups assignments using only WEEK_OF_WEEK_BASED_YEAR as an integer key, omitting WEEK_BASED_YEAR. The API has no maximum payroll-period length or single-year restriction.
- PayrollAuditCharacterizationTest.sameWeekNumberInDifferentYearsIsMergedForOvertime uses Oct 28, 2030 and Oct 27, 2031, both ISO week 44. Each has 6h attendance under an 8h weekly test cap; the calculator combines them and produces 4h overtime despite both weeks being below the cap.
- Correction: group by immutable week-start date or (ISO week-based year, week number), after splitting overnight work into correct weeks.
- The expanded PayrollAuditCharacterizationTest now runs five cases successfully, characterizing BE-007, BE-016, BE-017, BE-027 and BE-028. Passing demonstrates the observed defects; it does not indicate they were fixed.

### BE-029 — P2: shift reminders query UTC clock times against local shift fields

- ShiftReminderJob.sendShiftReminders uses OffsetDateTime.now(UTC), adds reminderHours, then extracts its UTC date and time for querying shiftDate/startTime. Shift time fields represent business local time (Asia/Ho_Chi_Minh in the current attendance and Marketplace code).
- Example: at 16:00 Vietnam time (09:00 UTC), a two-hour reminder should target an 18:00 shift; the job queries 11:00 instead. Near midnight, the date can be wrong as well.
- ReminderAuditTest captures the actual repository query parameters, proves they match UTC target wall time and differ by approximately seven hours from Vietnam target wall time. One combined reminder test passed.
- Correction: compute target intervals in the business/store zone before querying local shift fields; handle any interval crossing a calendar date explicitly.

### BE-030 — P2: reminders are sent for cancelled and unpublished shifts

- The reminder repository method filters store/date/start time only, with no PUBLISHED status predicate. ShiftAssignment's soft-delete filter does not exclude assignments attached to CANCELLED/DRAFT shifts.
- ShiftService.deleteShift intentionally retains assignments when cancelling an assigned published shift, so retained cancelled assignments can reach this job.
- ReminderAuditTest feeds a CANCELLED shift assignment through the real job and verifies sendNotification is called. The repository's missing predicate is source-traced, not exercised on PostgreSQL by this test.
- Impact: employees can receive an upcoming-shift reminder after receiving a cancellation message, or before a draft schedule is published.
- Correction: fetch only published, non-deleted shift assignments and recheck state as close to dispatch as practical.

### BE-031 — P2: shift-template validation rejects valid overnight schedules

- ShiftTimeRange handles overnight intervals, and the application accepts overnight store hours. ShiftTemplateService.validateTimeWithStore still requires startTime.isBefore(endTime), rejecting every overnight template before evaluating store hours.
- Its operating-hours comparisons and deactivateOutOfBoundsTemplates also use same-day LocalTime comparisons, so early-morning templates inside a night opening interval may be rejected/deactivated.
- OvernightOperatingHoursAuditTest.validOvernightTemplateIsRejectedDespiteEightHourIntervalSupport proves a 22:00–06:00 interval has 8h in the common time helper but cannot be saved as a template for a 22:00–06:00 store.
- Correction: use date-aware interval containment consistently for template creation, update, deactivation and within-hours reporting. Preserve the distinction between a zero-duration interval and overnight duration.

### BE-032 — P2: overnight quota calculations use wrong midpoint and negative hours

- HeadcountQuotaService.getStoreMidTime computes Duration.between(open,close) on LocalTime. For overnight hours the duration is negative, triggering a fixed 14h fallback. For 22:00–06:00 it returns 05:00 instead of 02:00.
- Its durationHours helper also returns the raw negative LocalTime difference. It feeds shift quota durations and weekly man-hour totals, so night slots can contribute negative labor hours.
- OvernightOperatingHoursAuditTest.quotaUsesFourteenHourFallbackAndNegativeDurationForNightStore verifies midpoint=05:00 and duration(22:00,06:00)=-16h. Both overnight audit tests passed.
- Correction: anchor close to the next day when needed, derive midpoint from the actual operating interval, and calculate positive segment durations before computing totals/costs.

### BE-033 — P1: approved swaps assign employees to roles they are not qualified to perform

- ShiftSwapService.managerApproveSwapRequest validates availability/time off and overlap/weekly hours/rest, then changes staff on the two original assignments. It does not verify either incoming employee against the assignment's requiredSkillId or its expiration requirements.
- The assignment retains its original required skill, zone and workstation when staff changes, so qualifications must be checked against those actual placements rather than any skill present elsewhere in the shift.
- PostgreSQL reproduction: first employee has only role A, second only role B; each starts on a matching published shift. The normal create → employee accept → manager approve flow succeeds. A post-commit SQL query finds two active assignments for which the employee has no matching staff_skill record.
- SchedulingPostgresIntegrationTest.auditSwapCommitsEmployeesWithoutDestinationSkills passed on shiftsync_scheduler_test with real repositories, service transactions and persistence. Notification delivery is mocked. Initial fixture duplication failed the unique shift constraint; the corrected fixture uses separate days and the test then passed.
- Evidence retained in target/scheduler-postgres-evidence/TEST-swap-skill-audit.xml.
- Correction: validate both incoming employees' current, unexpired qualifications for the original assignment roles/placements immediately before applying the swap, without incorrectly counting the slots they replace as full.

### BE-034 — P1: cross-store support work falls outside both stores' payroll calculation

- WorkforceRequestService.respondToProposal creates an assignment in the requesting store for staff actively employed at the target store. It does not create a requesting-store employment or a separate payroll settlement record.
- PayrollCalculationService.generatePayroll selects active employments for its store and assignments whose shift belongs to that same store. A's generation sees the support shift but omits employee B from its calculation cohort. B's generation sees the employment but excludes the shift performed at A.
- Scenario: employee has only B employment, accepts support at A, completes attendance at A. Generating A and B payroll through the current query paths does not include that work in either person's calculated hours.
- Distinct from BE-018: the contract is still active, but belongs to the other store.
- PostgreSQL execution evidence: SchedulingPostgresIntegrationTest.auditSupportAttendanceIsUnpaidInBothStorePayrolls runs the normal create/propose/accept support flow, persists attendance 09:00–17:00, and invokes generatePayroll for both stores over a two-day period. SQL verifies attendance duration=8h while the sum of the employee's generated total_hours across both stores is 0h. Test passed with real DB/repositories and transaction services; notifications are mocked. Evidence: target/scheduler-postgres-evidence/TEST-support-payroll-audit.xml.
- Initial reproduction used a one-day period and hit chk_payroll_period_dates, whose end date must be strictly after start; corrected fixture uses a two-day period. That failed setup is not evidence for the support-payroll defect; the subsequent successful assertions are.
- Correction: define payroll ownership/settlement for support work and implement it consistently, including historical rate and skill/placement attribution. Simply adding duplicate employment can double-count other work and requires explicit accounting rules.

### BE-035 — P1: default integration-test execution is not isolated from the operational datasource

- TX003AuditIntegrationTest is a plain @SpringBootTest without datasource override or opt-in guard. Its @BeforeEach invokes auditLogRepository.deleteAll() outside an enclosing test transaction.
- There is no application-test.properties in src/test/resources. Other @ActiveProfiles("test") integration tests consequently also inherit the application's datasource unless external overrides are supplied.
- application.properties defaults to the shiftsync database and loads environment-backed connection settings. Thus ordinary mvn test can connect to an operational database and erase audit logs when this context starts successfully.
- During this audit the first default full-suite attempt failed application-context initialization at Redisson/Netty startup, and TX003's two test cases both report context-load errors, so its destructive setup did not execute. Subsequent full-suite execution explicitly targeted a newly created shiftsync_backend_audit_full database on isolated port 55432.
- Correction: separate unit/integration test execution, require dedicated datasource configuration and database-name assertions before destructive setup, and delete only test-owned rows. A profile named test alone is insufficient without datasource settings.

## Full-suite execution evidence

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

- EmploymentController GET `/api/stores/{storeId}/staff` authorizes ADMIN or any active member of the store, including STAFF.
- EmploymentService returns EmploymentMapper DTOs with hourlyRate plus contractType.defaultHourlyRate and otMultiplier for every employee in the page. There is no staff-specific field projection.
- EmploymentPrivacyAuditTest.staffCanReadCoworkerHourlyRateFromStoreRoster executes the actual method-security-proxied controller as STAFF, with StoreAccessService checking active membership, and confirms HTTP response object 200 containing a different employee's hourlyRate. Service data is mocked; real mapper exposure is source-traced.
- Additional entry point verified 30/10: GET `/api/stores/{storeId}/shifts/{shiftId}/eligible-staff` authorizes ordinary store membership and returns the same full EmploymentDTO. `ShiftReadPrivacyAuditTest.ordinaryStaffCanReadCoworkerPayFromEligibleCandidateEndpoint` runs actual controller security, ShiftService and EmploymentMapper, returning coworker hourlyRate=98765 and contract defaultHourlyRate=54321 to STAFF. Repository data and the eligibility predicate are mocked; this proves disclosure after a candidate is deemed eligible, not the correctness of eligibility. A roster-only projection fix would leave this route exposed.
- Correction: expose a minimal coworker roster for staff and restrict compensation/contract details to authorized management or the subject employee. If salary transparency is an explicit product policy, document and test that policy rather than inheriting it from DTO reuse.

### BE-038 — P2: draft shifts accept live attendance before publication

- AttendanceService.submitSelfie and scanQr reject only CANCELLED shifts. They do not require PUBLISHED; generateQrForShift does not require publication either.
- AttendanceGeofenceAuditTest.draftShiftAcceptsSelfieCheckin invokes the real selfie service for an assigned DRAFT shift inside the time window and geofence, and verifies an attendance save with a non-null checkin time. Mocked persistence; no deployed selfie upload exercised.
- PayrollCalculationService excludes DRAFT assignments from its payroll cohort, so attendance recorded through this path may subsequently be ignored for pay while the schedule remains unpublished. It also weakens the publication boundary for operational work.
- Correction: explicitly define allowed attendance states and enforce them across both entry paths, allowing legitimate post-start checkout where appropriate without accepting unpublished work accidentally.
- The updated attendance audit class ran two cases successfully, including the existing NaN guard defect and the new draft-checkin scenario.

### BE-039 — P1: deleting a store leaves rejected-leave blackouts blocking staff at other stores

- StoreService.deleteStore changes PENDING/APPROVED leave requests to REJECTED by native SQL, but does not remove the blackout_date rows created during approval or reverse their leave-balance deductions.
- Blackout dates are scoped to staff/date, not store. Scheduler/manual eligibility checks them independently of the source leave request's status, so the rejected leave continues to block work at a remaining active store.
- PostgreSQL proof: SchedulingPostgresIntegrationTest.auditDeletedStoreLeavesRejectedLeaveBlackoutBlockingOtherStore creates approved annual leave at A for staff also employed at B, ends A employment, and deletes A. SQL verifies leave status=REJECTED and one linked blackout remains; attempting a B assignment fails specifically with a blackout error.
- Test passed with real database/service transactions; notifications are mocked. Evidence: target/scheduler-postgres-evidence/TEST-store-blackout-audit.xml. The initial run passed behavior assertions but failed fixture cleanup on the blackout foreign key; cleanup was corrected for test-owned blackout and leave_balance rows and rerun successfully.
- Correction: execute leave cancellation/reversal semantics consistently during store removal, keeping blackout and entitlement accounting aligned with the resulting leave state. Preserve deliberate independent blackout dates.

### BE-040 — P1: logged-out access tokens can reconnect to WebSocket

- AuthService.logout records the access token under `blacklist:<token>` in Redis. JwtAuthFilter checks this key for REST authentication, but WebSocketConfig's CONNECT interceptor only checks signature/expiry and reloads the user by email; it never consults the revocation store.
- TokenIdentityAuditTest.loggedOutTokenRejectedByRestStillAuthenticatesWebSocket executes real logout logic and verifies the blacklist write, then supplies that blacklist state to the REST filter and confirms no authentication. The same signed JWT is accepted by the actual WebSocket interceptor and gets an authenticated user.
- Tokens remain valid for WebSocket reconnection until their cryptographic expiry even after logout. Existing authenticated connections also have no per-message revocation revalidation, but connection shutdown behavior was not separately exercised.
- Three token audit tests passed. JWT signing, REST filter, user-detail lookup, logout/refresh service and WebSocket interceptor are real; Redis and user persistence are mocked. This is not a deployed network transport test.
- Correction: centralize signature, token-purpose, identity and revocation validation across REST and WebSocket, and define how logout terminates/restricts existing sessions.

### BE-041 — P1: cancelled assignments still block staff from receiving replacement shifts

- ShiftRepository.findActiveShiftsForStaffInPeriod filters date and assignment membership but not shift status. ShiftValidationService uses every returned shift for overlap, minimum rest and weekly limits.
- Cancellation intentionally keeps original assignments, so a cancelled shift is still treated as occupied work time. AutoScheduleService also loads assignments without excluding their cancelled parent shifts.
- PostgreSQL proof: SchedulingPostgresIntegrationTest.auditCancelledShiftStillBlocksAssignmentAtAnotherStore creates a retained assignment on a CANCELLED shift and attempts a valid concurrent-time replacement at another active store. The real manual service rejects with the overlap message and no replacement assignment is committed.
- Test passed; evidence: target/scheduler-postgres-evidence/TEST-cancelled-overlap-audit.xml. Distinct from BE-026, which allows new Marketplace claims on cancelled shifts.
- Correction: define which parent shift states consume scheduling capacity and consistently exclude cancelled work from overlap/rest/hour baselines, while retaining history for audit.

### BE-042 — P2: absence statistics treat overnight work as ended on its starting date

- ShiftAssignmentRepository.countAbsentAssignmentsByStoreAndDateRange uses `shiftDate < CURRENT_DATE OR (shiftDate = CURRENT_DATE AND endTime < CURRENT_TIME)` rather than the actual date-aware shift end.
- Example: today at noon, a published 22:00–06:00 assignment without attendance satisfies endTime < CURRENT_TIME and counts absent although it has not started. After midnight the previous day's shift is automatically counted even before its 06:00 end.
- DashboardService uses this count directly for absentRate. The query also lacks a parent shift-status restriction, so retained cancelled or draft assignments may inflate the metric.
- PostgreSQL execution evidence added: SchedulingPostgresIntegrationTest.auditFutureOvernightShiftCountsAbsentBeforeItStarts chooses a transaction-local timezone that places database wall-clock time near noon, inserts a published 22:00–06:00 assignment without attendance, asserts its full start timestamp is still in the future, then verifies the real absence query returns 1. This avoids dependence on the test host's hour without changing global/database timezone configuration. Test passed. Production database timezone alignment still requires a separate review.
- Both new reproductions ran together: 2 tests, 0 failures/errors/skips. XML: target/scheduler-postgres-evidence/TEST-absence-historical-payroll-audit.xml; log: target/absence-historical-payroll-audit.log.
- Correction: compare full end instants, handle the overnight next-day boundary, and restrict the eligible states/cohort before computing absence rates.

### BE-043 — P2: reapplying a store template duplicates zones and workstations

- `StoreTemplateService.applyTemplateToStore`, exposed through POST `/api/stores/{storeId}/apply-template/{templateId}`, always constructs and saves fresh StoreZone and Workstation rows. The comment promises appending non-duplicate zones by name, but the service never loads or matches existing zones/workstations.
- `StoreTemplateAuditTest.applyingSameTemplateTwiceCreatesDuplicateZonesAndWorkstations` calls the real service twice with a real ObjectMapper and the same catalog template/store. Mock repository captures show two distinct zone IDs with identical `COUNTER` code, and two workstations with identical `TILL` code attached to the two different zones. No zone lookup occurs.
- Reapplying a preset or retrying after an uncertain client response creates duplicate physical resources rather than retaining/updating the original ones. They can appear at identical coordinates and inflate the available resource list. Entity definitions and migrations V25/V31 do not impose store/name or store/code uniqueness for these tables; no real database execution was performed in this reproduction.
- Correction: define and enforce stable matching/reapplication semantics for template-owned resources; preserve references from existing assignments/requirements and make retries safe. Add an appropriate scoped uniqueness/integrity strategy with a migration for existing duplicates rather than deleting referenced resources blindly.
- Ran this test together with the QR lock reproduction on 30/10: 2 tests, 0 failures/errors/skips. Log: target/template-qr-audit.log; XML: target/surefire-reports/TEST-com.shiftsync.store.service.StoreTemplateAuditTest.xml and TEST-com.shiftsync.attendance.service.QrPayrollLockAuditTest.xml. Passing characterizations confirm defects; product logic has not been fixed.

### BE-044 — P1: equivalent attendance instants receive different holiday pay depending on their offsets

- `PayrollCalculationService.calculateForEmployee` obtains holiday dates with `checkIn.toLocalDate()` and `checkOut.toLocalDate()`, splitting at midnight in the checkout's stored offset. It does not normalize instants to the business timezone used by attendance entry (`Asia/Ho_Chi_Minh`).
- `PayrollCalendarAuditTest.sameAttendanceInstantsPayDifferentHolidayAmountsWhenOffsetsChange` supplies an eight-hour assignment on 01/01/2030, a holiday multiplier of 3, rate 10 and cap 48. The +07:00 interval 00:00–08:00 pays 8 holiday hours/240. The exact same instants represented as 31/12 17:00Z–01/01 01:00Z pay 1 holiday hour/100. Assertions verify both endpoints have identical Instants and both calculations retain 8 total hours.
- The manager attendance update DTO accepts OffsetDateTime, and AttendanceService writes the supplied values without converting them to the business timezone. Thus offset normalization by clients/persistence must not be allowed to change the payroll calendar. This reproduction invokes the real calculator with in-memory entities; it does not establish which offset the current PostgreSQL/Hibernate configuration returns after persistence.
- Distinct from BE-007 (weekly allocation across Sunday/Monday): this defect changes holiday classification and money for identical instants without changing any worked time.
- Correction: normalize instants to the defined business timezone before splitting at local calendar boundaries, then allocate each segment to its actual date/week. Add database round-trip cases before concluding all timezone paths are covered.

### BE-045 — P1: payroll amount depends on unordered same-day assignment input

- `calculateForEmployee` sorts each week's assignments only by `shiftDate`. For assignments on the same date, input order determines which rate receives remaining standard hours versus overtime. The payroll assignment repository method `findByShift_Store_IdAndShift_ShiftDateBetween` has no ordering contract.
- `PayrollCalendarAuditTest.permutingSameDayAssignmentsChangesOvertimeAmount` uses the same two attendance records in both runs: 00:00–06:00 at rate 10 and 18:00–00:00 at rate 20, twelve hours of rest, an 8h weekly test cap and OT multiplier 1.5. Both orders yield 12 total hours and 4 overtime hours; chronological input pays 220, reversed input pays 200. Only list order changes.
- This is calculation nondeterminism, not a concurrency reproduction or a claim that the scheduler permits exceeding its hard contract cap. The small cap deliberately exercises the calculator's supported overtime branch; worked attendance may require overtime calculation even when planned hours were capped.
- Correction: define chronological overtime attribution explicitly, sort by full worked instants with a stable tie-breaker, and keep weekly/calendar segmentation correct. If another allocation policy is intended, implement that policy explicitly rather than inheriting database row order.

### BE-046 — P1: approved paid leave recovers only one of multiple deleted assignments on the same day

- Leave approval deletes all conflicting assignments via `deleteAll`; ShiftAssignment's SQLDelete makes these soft-deleted. Normal payroll assignment queries exclude them. Paid leave compensation therefore enters `calculateForEmployee`'s fallback lookup when no live assignment remains for a leave date.
- `findAssignmentForStaffOnDateIncludingDeleted` is a native query with `ORDER BY sa.deleted ASC LIMIT 1` and an Optional result. The calculator pays only that single recovered assignment, omitting every other original assignment on the same date. There is also no stable ordering among equally deleted rows, so a day with unequal shift durations/rates can recover an arbitrary amount.
- `PayrollCalendarAuditTest.approvedPaidLeaveOnlyRecoversOneOfTwoDeletedDayAssignments` characterizes the fallback result for two soft-deleted four-hour day shifts (00:00–04:00 and 15:00–19:00, eleven hours of rest), approved ANNUAL leave, no worked attendance and rate 10. Actual calculator output is 4 paid hours/40 rather than the scheduled total of 8 hours/80. Repository fallback is mocked to return the first assignment, matching its one-row native-query contract. The complete approval-to-payroll lifecycle has not been rerun on PostgreSQL in this reproduction.
- Distinct from BE-017's overnight-duration bug: both shifts here have ordinary start-before-end times; the loss is caused by one-row historical recovery.
- Correction: recover all applicable original assignments, resolve historical cancellations/reassignments intentionally, and compensate each eligible shift once. Do not simply remove LIMIT without changing Optional and callers or addressing duplicate historical assignment episodes.

## Payroll calendar reproduction evidence — 30/10

- Added `src/test/java/com/shiftsync/payroll/PayrollCalendarAuditTest.java`: three passing defect characterizations for BE-044–046, using real calculation logic; BE-046 additionally mocks the fallback repository.
- Ran `mvn test '-Dtest=PayrollCalendarAuditTest,PayrollAuditCharacterizationTest' '-DargLine=-XX:ActiveProcessorCount=4'`: 8 tests, 0 failures/errors/skips. Log: target/payroll-calendar-audit.log; XML: target/surefire-reports/TEST-com.shiftsync.payroll.PayrollCalendarAuditTest.xml. No product fixes or operational database writes.
- Additional source review of StoreDesignService/Repository confirmed current version reads are store-scoped, saves lock the store row and compare base revision, and workstation bindings are checked against that store. EquipmentService checks workstation store and equipment parent ownership. No new finding was established in these reviewed paths; this source review does not prove concurrency/database behavior or complete layout coverage.

### BE-047 — P2: staff can create annual-leave balances in stores where they are not employed

- GET `/api/stores/{storeId}/leave-requests/balances/my` (also `/leave-balances/my`) has only a role check, unlike leave creation and management endpoints which check store access. `LeaveBalanceService.getMyBalance` calls `getOrCreateBalance` without requiring active membership in the target store.
- If no active employment is found, `getOrCreateBalance` does not reject the request; it defaults to 12 days and saves a leave_balance row for the caller and arbitrary target store. A read request therefore creates employment-related data across store boundaries.
- `LeaveBalanceAccessAuditTest.staffCanSeedFullTimeLeaveBalanceAtForeignStoreBeforeJoiningPartTime` executes the actual Spring method-security-proxied controller and actual balance service. A STAFF user with no employment at the target store receives 200, the foreign store name and a saved 12-day balance. The test then simulates joining as PART_TIME: the seeded balance remains 12, while the same service creates 6 days for a comparable unseeded store with PART_TIME employment. Existing balances bypass entitlement calculation, so calling the GET before joining changes the eventual allowance under the current rules.
- Test dependencies: repositories and LeaveRequestService are mocked; controller authorization, principal roles, balance creation and DTO mapping are real. No live HTTP session, database persistence or employment activation lifecycle was exercised. The result does not establish the legally correct annual allowance; it establishes missing membership enforcement and inconsistent application of this service's own 12/6 rule.
- Correction: authorize balance access against store membership before lookup/creation, prevent non-members from initializing balances, and define entitlement initialization/reconciliation for legitimate employment changes. Consider keeping this GET read-only and initializing balances through an authorized employment/leave workflow.
- Ran with LeaveAuditCharacterizationTest on 30/10: 3 tests, 0 failures/errors/skips. Log: target/leave-balance-access-audit.log; XML: target/surefire-reports/TEST-com.shiftsync.leave.service.LeaveBalanceAccessAuditTest.xml. Passing characterization confirms the defect; production behavior has not been changed.

### BE-048 — P2: notification queue rejection escapes after transaction commit and skips later callbacks

- AsyncConfig's actual notificationExecutor has 5 core workers, 20 maximum workers and a queue of 100, using the default rejection policy. NotificationService.sendNotification registers an afterCommit callback which calls CompletableFuture.runAsync without handling executor rejection.
- `NotificationDeliveryAuditTest.fullNotificationQueueThrowsBackToCallerAfterCommitAlreadyHappened` fills that real configured executor with 120 blocked tasks (20 running and 100 queued), then executes the actual notification registration through Spring's TransactionTemplate. The afterCommit submission raises RejectedExecutionException to the caller after the recording transaction manager's commit hook has run once; rollback never runs. A second registered afterCommit callback is skipped.
- The executor and Spring transaction lifecycle are real. The transaction manager only records commit/rollback hooks and has no database resource; no committed PostgreSQL row or HTTP response was exercised. The test shuts down all worker tasks in finally and sends no external message.
- Source impact: transactional workflows such as payroll generation register notifications before returning. Under sustained saturation, a workflow can have committed its data while reporting an exception; its rejected notification and later callbacks are lost. GlobalExceptionHandler has no rejection-specific response and its generic path returns 500. Exact HTTP behavior remains source-traced rather than end-to-end verified.
- Correction: make post-commit delivery submission failure isolated from the completed business transaction; use a durable delivery/outbox strategy with retry/backpressure as required. Merely swallowing rejection would hide dropped notifications, and increasing queue size alone does not remove the failure mode.

### BE-049 — P2: closing the last SSE emitter can discard a concurrent new subscription

- `SseEmitterService.removeEmitter` removes an emitter from the current list, checks list.isEmpty(), then unconditionally removes the user's map key. subscribe independently performs computeIfAbsent(...).add(emitter). These operations are not atomic together.
- A new subscription can add itself to that same list after removeEmitter observes it empty but before the map-key removal. The new connection remains open but is no longer tracked, so pushToUser/heartbeats cannot reach it.
- `NotificationDeliveryAuditTest.closingLastSseConnectionCanUnregisterANewlySubscribedConnection` deterministically inserts an actual service.subscribe call at that interleaving, using a CopyOnWriteArrayList subclass as an observation hook. It confirms the new emitter is present in the list while service.getActiveEmitterCount and getTotalActiveUsers both return zero after removal. Service logic and SseEmitter objects are real; this is a controlled interleaving, not an HTTP transport or stress test.
- Correction: serialize list membership changes and map removal together per user, for both subscribe and removal. A compare-and-remove on the map alone is insufficient when the concurrent subscription appends to the same list object.

### BE-050 — P2: the reminder window wraps midnight into an empty same-date BETWEEN range

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

- PUT `/api/stores/{storeId}/shifts/{shiftId}` delegates to ShiftService.updateShift. If staffId changes while date/times stay the same, it calls shiftAssignmentRepository.deleteAll(existing) and then the assignment service directly. Attendance protection only runs when dateTimeChanged is true.
- This bypasses ShiftAssignmentService.unassignStaffFromShift's explicit refusal to remove assignments with existing attendance. Shift deletion has a corresponding guard as well.
- `ShiftUpdateAuditTest.replacingStaffThroughShiftUpdateBypassesExistingAttendanceGuard` configures one published shift and its original assignment with existing attendance. The actual ordinary unassignment service rejects with the attendance message and does not delete; the actual update service, given unchanged date/times and another staff ID, then calls deleteAll(original) and delegates replacement without any attendance lookup. Request includes all required date/time fields, matching DTO validation requirements.
- Service/repository-boundary proof: repositories and replacement assignment service are mocked, while update logic and ordinary unassignment control are real. No full replacement commit, eligibility validation for the replacement, or payroll recalculation was exercised. Source consequence: deleting the assignment hides the original worker's history from normal soft-delete-filtered payroll queries even though the worker has attendance; exact database/payroll outcome remains to be reproduced.
- Correction: route removal/replacement through the same attendance, payroll-lock and lifecycle invariants as ordinary unassignment, before deleting any existing assignment. Preserve worked history explicitly if a separate correction workflow is intended.

### BE-052 — P2: changing an assigned shift's time rejects the employee's own existing assignment

- updateShift revalidates existing staff on date/time changes by calling ShiftAssignmentValidator.validateEligibility(saved, staffId). That validator is designed for adding a new assignment: its first check rejects existsByShiftIdAndStaffId with `Staff is already assigned to this shift`. It also passes no excluded shift to overlap/hour validation and includes existing occupants in capacity checks.
- `ShiftUpdateAuditTest.changingAssignedShiftsTimeRejectsItsOwnExistingAssignment` uses actual ShiftService and actual ShiftAssignmentValidator. A note-only update succeeds for an assigned published 08:00–16:00 shift; changing to 09:00–17:00 within 06:00–23:00 store hours throws exactly the duplicate-assignment error because the employee remains assigned to this same shift. No conflict with another shift is required to trigger the rejection.
- Repositories are mocked. The test demonstrates erroneous validation routing, not PostgreSQL transaction rollback. The method is transactional, but persistence after the exception was not measured in this reproduction.
- Correction: use edit-aware eligibility validation that excludes the current assignment/shift from duplicate, overlap, hours and slot occupancy checks while still validating all other work, availability, leave, rest and skill constraints.

### BE-053 — P2: changing a draft shift's required role leaves stale assignments and reports false coverage

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

- PayrollController.downloadPayslipPdf, exposed at `/api/users/me/payslips/{payrollId}/pdf` and `/api/payslips/{payrollId}/pdf`, requires only isAuthenticated(). The service allows ownership OR StoreAccessService.canAccessStore for the payslip's store.
- canAccessStore permits any active employee, including STAFF, rather than requiring a management role for someone else's payslip. Therefore a staff member with a coworker's payslip UUID can retrieve the full PDF even though the period-management/list endpoints require MANAGER/ADMIN.
- `PayslipPdfPrivacyAuditTest.ordinaryStaffCanDownloadCoworkersCompletePayslipPdf` runs the actual method-security-proxied PayrollController, real PdfExportService, real StoreAccessService and real OpenPDF rendering/extraction. A STAFF actor initially lacking target-store membership is rejected. With active membership at that store, the same non-owner receives 200; the returned PDF contains the coworker's name, email and the fixture's complete 987654 amount, verified by extracted text.
- Repositories are mocked; the test does not exercise JWT/HTTP transport, PostgreSQL lazy loading or discover a coworker's UUID through the staff UI. The known-ID precondition is explicit. No actual employee document was accessed or generated.
- Related to BE-037's roster salary exposure, but a separate access-control path: changing roster DTO projection does not repair PDF authorization. Distinct from BE-016, which leaks foreign-store period lists to managers.
- Correction: authorize owner, ADMIN, or a MANAGER with explicit access to the payslip's store. Keep ordinary membership insufficient for another person's payroll export and enforce the same policy across all route aliases/service entry points.

## Payroll export reproduction evidence — 30/10

- Added PayslipPdfPrivacyAuditTest and ran with EmploymentPrivacyAuditTest: 2 tests, 0 failures/errors/skips. Command: `mvn test '-Dtest=PayslipPdfPrivacyAuditTest,EmploymentPrivacyAuditTest' '-DargLine=-XX:ActiveProcessorCount=4'`.
- Log: target/payslip-pdf-privacy-audit.log; XML: target/surefire-reports/TEST-com.shiftsync.payroll.PayslipPdfPrivacyAuditTest.xml. No production logic changes, operational database writes or real payroll-document access.
- ExcelExportService currently uses findByIdAndStoreId before loading the period's payslips; no analogous unscoped-period finding was established by this source review. Its string cells are written as strings rather than formulas; no formula-injection finding is asserted.
- Dashboard queries still need database-level scenario proofs, including generic shifts with no explicit requirements (SUM inner join versus scheduler's default one-slot demand), cancelled-shift cohorts and ranges cutting across payroll periods. These observations are not added to the numbered findings without adequate scenario verification.
- PostgreSQL re-verification is unavailable in this turn: Docker Desktop was launched from its installed user-local path and its backend processes are running, but repeated docker info/ps checks still report the Linux engine pipe absent. No database test run is claimed and no database was reset.

### BE-059 — P2: dashboard coverage omits generic-shift demand and can conceal a real shortage

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

- WorkforceRequest stores an optional skill identifying the requested support role, but proposeStaff and respondToProposal only call validateEligibility on the entire shift. ShiftAssignmentValidator accepts any still-available requirement matching the staff member; neither call constrains the check to request.skill.
- On acceptance, respondToProposal builds a ShiftAssignment with shift, staff and source=MANUAL only. It does not set requiredSkillId or the requested role's spatial placement, yet it can mark the request COMPLETED.
- `WorkforceRoleStateAuditTest.kitchenSupportRequestAcceptsCashierOnlyStaffAndSavesNoRequiredRole` uses a published shift requiring one Cashier and one Kitchen worker, a request explicitly for Kitchen, and a proposed employee qualified only for Cashier. Actual proposeStaff and acceptance both pass the actual ShiftAssignmentValidator/ShiftValidationService; request becomes COMPLETED, proposal ACCEPTED and saved assignment.requiredSkillId is null.
- Fixture scope: the employee is active at the source store with a 48h contract, covers the shift's availability, has no conflicting work/time off and is not expired. The demonstrated failure is the ignored requested role and missing role on save, not absence of generic eligibility checks. Request creation/persistence and controller authorization are not exercised; the request's role belongs to the requesting store and is present among its shift requirements.
- Correction: validate the specific requested role/remaining capacity and qualification at proposal and acceptance, persist its requiredSkillId/placement, and count fulfillment for that role. Do not infer requested-role suitability merely because the person can fill some other role in the shift.

### BE-061 — P2: a workforce proposal can be accepted after its destination shift is cancelled

- Workforce acceptance checks proposal state, parent request state/count and shift start time, but not request.shift.status. The reusable assignment validator permits draft planning and contains no parent-state rejection; callers must enforce their own lifecycle boundary.
- `WorkforceRoleStateAuditTest.pendingProposalStillCreatesAssignmentAfterShiftIsCancelled` starts with a published two-person Cashier requirement and one existing assignment. A valid second employee is proposed while the shift is published. The fixture then changes the parent shift to CANCELLED, retaining the original assignment as ShiftService's staffed cancellation path does; acceptance still invokes save for the second assignment and marks the workforce request COMPLETED.
- The test runs actual proposal/acceptance, skill/availability/capacity validation and contract/overlap/rest validation with mocked repositories. Cancellation is simulated by changing the fixture's status; the real cancellation service and database commit are not exercised in this test. No actual employee was assigned.
- Distinct from BE-026's cancelled Marketplace claim path and BE-013's acceptance after MANAGER_REJECTED: this has a still-open parent request and a cancelled destination shift. Fixing either other entry point alone does not block this path.
- Correction: check allowed parent shift states at creation/proposal/acceptance and invalidate or reject pending support proposals when their shift is cancelled. Preserve concurrent cancellation/acceptance correctness through the shared database transaction protocol.

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

- HeadcountQuotaService.updateQuota resolves an existing shift by store/date/times and mutates requiredCount without checking its status or payroll-date lock. Its getOrCreateShift returns published/completed/cancelled shifts unchanged rather than limiting the write to editable drafts.
- `QuotaMutationAuditTest.quotaUpdatesRequirementsThatOrdinaryEndpointRefuses` covers PUBLISHED, COMPLETED and CANCELLED shifts: actual ShiftService.setShiftRequirements rejects each state, while actual updateQuota changes requiredCount from 1 to 3 and invokes save, retaining that state.
- `quotaStillMutatesDraftOnLockedPayrollDate` supplies a confirmed/paid-date lock: actual ShiftService.updateShift refuses the same draft/date with its LOCKED/PAID message; quota update still changes and saves the requirement. The quota service has no payroll repository/lock lookup. Lock state and persistence are simulated, not a concurrent payroll-confirmation proof.
- ShiftService.saveBulkDemandPlanning is another alternate path: it checks payroll locks but skips only COMPLETED, leaving PUBLISHED/CANCELLED editable. `bulkDemandAlsoBypassesTheRequirementsEndpointStateGuard` covers those two states and changes their requirements to 4 after the dedicated requirements endpoint rejects them.
- Correction: share explicit lifecycle/payroll mutation policy across direct requirements edits, inline quota writes, bulk demand, auto-fill and apply-to-scheduler. Do not assume a transaction isolation level supplies these missing domain guards. Any intended post-publication demand correction needs a deliberate, consistently enforced workflow and assignment reconciliation.
- Repositories and payroll lock state are mocked; actual service save calls/object mutations are verified. No PostgreSQL flush, unique-constraint behavior or committed historical-row change is claimed. Other auto-fill/apply paths still require dedicated scenario verification.

### BE-066 — P2: default quota roles are synthetic IDs unusable by writes, while auto-fill reports success without demand

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

- GET `/api/users/{staffId}/stores` authorizes every MANAGER without checking target-user/shared-store scope. EmploymentService.getStoresByStaff loads all ACTIVE employment rows for the target user and returns full EmploymentMapper DTOs, including hourlyRate and contractType.defaultHourlyRate/otMultiplier, for every store.
- `EmploymentLifecycleAuditTest.managerCanReadForeignEmploymentPayThroughStaffStoreLookup` runs the actual method-security-proxied EmploymentController, actual EmploymentService, actual StoreAccessService and actual mapper. STAFF control cannot query a different subject. A MANAGER for whom canAccessStore returns false for the target store receives 200 with that store's ID, its employee hourlyRate=98765 and contract default rate=54321.
- Repositories are mocked; no live HTTP/JWT/database lookup or actual compensation data is involved. The actor knows the target employee UUID; the test does not establish enumeration through the staff UI.
- Related to BE-037's coworker roster compensation exposure, but a different authorization boundary and endpoint: this bypasses the manager's target-store scope rather than exposing peer pay to an ordinary member of their own store. Fixing the roster DTO alone does not protect this lookup.
- Correction: distinguish a minimal cross-store directory needed for support workflows from compensation/contract details, and restrict the latter to the subject employee, ADMIN or management explicitly authorized for the store. Enforce appropriate target-user scope for non-directory lookup behavior.

## Employment lifecycle/privacy evidence — 30/10

- Added EmploymentLifecycleAuditTest (2 cases), ran with EmploymentPrivacyAuditTest (1 existing case): 3 tests, 0 failures/errors/skips. Command: `mvn test '-Dtest=EmploymentLifecycleAuditTest,EmploymentPrivacyAuditTest' '-DargLine=-XX:ActiveProcessorCount=4'`.
- Log: target/employment-lifecycle-audit.log; XML: target/surefire-reports/TEST-com.shiftsync.employment.EmploymentLifecycleAuditTest.xml. No production logic changes or operational database writes.
- Observed but not numbered as a confirmed defect: soleManagerCanRemoveOwnEmploymentAndLoseStoreAccess demonstrates the actual employment-removal route permits a manager to inactivate their own last membership and lose subsequent store access, whereas UserService's user-deletion path rejects a sole manager. The test uses actual method security/services with mocked sole-manager/membership state. This is a guard/lifecycle difference requiring an explicit offboarding policy; a user-deletion guard alone does not prove that employment withdrawal must be prohibited. Existing store/user lifecycle specifications found in the reviewed docs do not settle that policy, so no store-orphaning bug is asserted from this evidence alone.

### BE-068 — P2: scheduler weight defaults can be read but cannot be saved when the row is missing

- SchedulerConfigurationController.getConfig returns a valid default configuration when findByStoreId is empty. updateConfig validates the weight sum, then requires an existing row and throws Config not found instead of creating one.
- `SchedulerConfigBootstrapAuditTest.missingRowReturnsDefaultsButCannotSaveEvenThoseValidDefaults` reads the actual controller defaults (200, id=null), copies them into SchedulerConfigUpdateDTO, passes actual Jakarta Bean Validation, and attempts the actual PUT handler. It receives BusinessException with status 404/Config not found and no repository save.
- The missing-row state is reachable in current source: StoreService.createStore only saves the Store; the reviewed main Java source has no scheduler-configuration creation/save path other than updating existing rows, and reviewed migrations provide column defaults but no row-initialization trigger. AutoScheduleService can run with in-memory defaults, so successful scheduling does not initialize the row either.
- Repository is mocked; no real new-store creation, HTTP method security or database migration run is exercised by this test. The defect is the controller read/write contract for an otherwise legitimate missing configuration, not failure of DTO validation.
- Correction: initialize the configuration in an authorized store-creation/first-update workflow or make first PUT create it safely. Keep GET side-effect free and handle concurrent initialization with the unique store_id constraint.

### BE-069 — P2: generated shift deadlines ignore the configured policy and disagree across creation paths

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
