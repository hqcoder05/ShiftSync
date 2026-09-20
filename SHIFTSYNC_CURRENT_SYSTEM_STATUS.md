# ShiftSync Current System Status

**Status date:** 2026-09-20

## 1. Executive Status

**RELEASE READY — FREEZE APPROVED WITH DOCUMENTED VERIFICATION GAPS**

No reproducible P0/P1 defect is open. Remaining items are infrastructure
verification gaps or deferred P2 design hardening.

## 2. Architecture

ShiftSync is a full-stack monorepo:

- Spring Boot backend with modular/layered services;
- PostgreSQL with Flyway migrations;
- Redis-backed concurrency/cache integrations;
- React/Vite Web dashboard for Manager/Admin;
- React Native/Expo Mobile application for Staff.

## 3. Backend

The backend is built with Java 21 and Spring Boot 4.1.1. Authentication,
authorization, store/staff isolation, marketplace, leave, attendance,
payroll, scheduling and spatial services are covered by the current test
inventory at unit, service or controller level as applicable.

## 4. Scheduler

Verified properties include deterministic ordering, hard-constraint filtering,
overnight availability handling, skill expiry, leave/blackout exclusion,
overlap/rest/weekly limits, requirement-aware coverage accounting, preservation
of MANUAL and OPEN_SHIFT assignments, AUTO rerun semantics, and separate
spatial allocation reporting.

Business contracts currently in force:

- cross-store fairness uses global employee workload;
- availability is hard-only with score `1.0` after eligibility;
- duplicate `StaffSkill` effective-date semantics are deferred future hardening;
- Local Repair prioritizes hard constraints and coverage rescue before soft
  fairness/score.

P1-C (draft shifts outside operating hours) is **NOT A DEFECT** under the
established backend contract, which rejects or cleans invalid out-of-hours
shifts.

Production-equivalent A/B replay covered 81 required slots with 100% coverage,
zero shortage and zero hard-constraint violations in both fairness-cap modes.
Both modes were deterministic; neither is described as a global optimum.

## 5. Database

Flyway is enabled with `ddl-auto=none`. `V39__persist_position_norm_overrides.sql`
is an intended production migration aligned with the `PositionNormOverride`
entity, repository and service. It must be explicitly reviewed and included
in the release artifact; it has not been claimed as committed here.

## 6. Security / RBAC

Authentication, RBAC and store/staff isolation have passing unit/controller
coverage. A complete live PostgreSQL/Redis security integration suite is not
available.

## 7. Web

Web API/data-flow consistency has been audited. Final authenticated runtime
smoke verification was not rerun during the release sign-off.

**Status:** VERIFIED WITH DOCUMENTED RUNTIME GAP.

## 8. Mobile

Mobile uses real backend data for the audited Profile, Schedule, Dashboard,
Marketplace, Payroll, Availability, Leave and Attendance flows. The complete
authenticated Mobile smoke suite was not rerun during final release sign-off.

**Status:** VERIFIED WITH DOCUMENTED RUNTIME GAP.

## 9. Testing

- Total: 384
- Executed successfully: 381
- Failed: 0
- Errors: 0
- Skipped: 3
- Flaky tests observed: 0

Three consecutive `mvn -q clean test` runs passed with the same result. The
skipped tests are `AuditLogIntegrationTest`, `ShiftsyncBackendApplicationTests`
and `PerformanceTest`; each requires live PostgreSQL and Redis.

`mvn -q -DskipTests package` also passed.

## 10. Integration Gaps

- no usable real PostgreSQL integration profile;
- no usable real Redis integration profile;
- no Testcontainers setup;
- no fresh-database Flyway execution in this verification;
- no complete real-infrastructure backend E2E suite;
- final live Web smoke not rerun;
- final live Mobile smoke not rerun.

These are verification gaps, not proven production defects.

## 11. Deferred P2/P3

- effective-date-aware duplicate `StaffSkill` resolution;
- optional centralized final scheduler invariant validator;
- cleanup of audit/scratch artifacts before packaging.

## 12. Release Freeze Scope

| Component | Freeze status |
|---|---|
| Backend | YES |
| Scheduler | YES |
| API contracts | YES |
| Database schema | CONDITIONAL — review/include V39 |
| Web | CONDITIONAL — runtime smoke gap |
| Mobile | CONDITIONAL — runtime smoke gap |

## 13. Known Verification Gaps

Do not describe unit/controller coverage as complete real-infrastructure
coverage. PostgreSQL, Redis, fresh Flyway migration, full-system E2E, and final
authenticated Web/Mobile smoke remain unverified in the current release gate.

## 14. Historical Remediation Summary

- P1-A overnight availability/date-aware interval handling: **RESOLVED** and
  regression-tested.
- P1-B requirement/coverage accounting: **RESOLVED** and regression-tested.
- Canonical deterministic ordering: **RESOLVED** and verified.
- Scheduler fairness-cap A/B and rollback-safe production-equivalent replay:
  **VERIFIED**; no mode is declared universally better.
- Marketplace claim, duplicate-claim rejection, OPEN_SHIFT assignment and
  capacity handling: **RUNTIME VERIFIED** for the documented controlled case.
- Payroll uses backend payslip data as the source of truth; Mobile does not
  calculate estimated payroll when payslips are empty.
