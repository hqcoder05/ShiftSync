# Repository Cleanup Report — ShiftSync

**Role:** Senior Software Architect + Senior Repository Maintainer + DevOps Engineer + Codebase Forensic Auditor  
**Date:** 2026-10-08  
**Repository:** ShiftSync Monorepo  
**Target Branch:** `duyen-frontend` (Commit `9f8e2e7`)  

---

## 1. Before Cleanup

Prior to the forensic cleanup, the repository contained a significant volume of uncommitted working tree modifications and untracked audit remnants accumulated across successive optimization and testing phases:
- **Tracked Modified Files:** 121 files across backend, mobile, web, and documentation.
- **Tracked Deleted Files:** 11 files (pre-existing deletions of legacy manual test accounts, manuals, and seed audit logs).
- **Untracked Files:** 115 files, comprising:
  - Local authentication tokens containing JWTs (`.colleague_token`, `.manager_token`, `.pvd_token`).
  - Temporary and ad-hoc scripts (`checkin.js`, `fix*.js`, `patch*.py`, `e2e*.py`, `add_size.ps1`, etc.).
  - Compiled `.class` files directly in project roots (`FindByIdParser.class`, `SecurityParser.class`).
  - Large database backup dumps (`backup_before_clean.sql` 9MB, `backup_pre_reset.sql` 1.2MB).
  - Outdated diagram backups (`07_Attendance_Payroll_old_qr.png`).
  - Debug logs and test capture outputs (`backend.log`, `container.log`, `test_output.txt`, `full_regression_output.txt` ~5.5MB total).
  - Loose audit and verification reports in backend root (`AUTH_*.md`, `BUSINESS_LOGIC_*.md`, `CONCURRENCY_AUDIT.md`, `FCM_*.md`, `STATE_*.md`).
  - Production fixes and new tests (`AsyncConfig.java`, DTOs, `V41`/`V42` Flyway migrations, Firebase configs, Mobile alerts/notifications).

---

## 2. Files Deleted

A total of **52 files and 2 directories** were safely removed after forensic verification confirmed zero active runtime, build, or deployment references:

### A. Root Directory
1. `.colleague_token` — Local temporary JWT token
2. `.manager_token` — Local temporary JWT token
3. `.pvd_token` — Local temporary JWT token
4. `checkin.js` — Temporary check-in script containing hardcoded JWT
5. `dummy.jpg` — Temporary image file used for check-in testing
6. `fix_end_fragment.js` — One-off patching script for `MarketplacePage.jsx`
7. `fix_fragment.js` — One-off patching script for `MarketplacePage.jsx`
8. `inject_ui.js` — One-off injection script for `MarketplacePage.jsx`
9. `test_attendance_lifecycle.js` — One-off attendance testing script

### B. ShiftSync-Web
10. `ShiftSync-Web/MarketplacePage_HEAD.jsx` — Stray merge conflict backup of `MarketplacePage.jsx`
11. `ShiftSync-Web/src/public/firebase-messaging-sw.js` — Unreferenced duplicate (Vite serves from `public/`, not `src/public/`)
12. `ShiftSync-Web/src/public/` *(Directory)* — Cleaned up redundant folder

### C. Documentation & Diagrams
13. `docs/diagrams/07_Attendance_Payroll_old_qr.png` — Superseded diagram backup from legacy QR attendance flow

### D. shiftsync-backend (Compiled & Generator Artifacts)
14. `shiftsync-backend/FindByIdParser.class` — Compiled `.class` file outside `target/`
15. `shiftsync-backend/FindByIdParser.java` — Ad-hoc search script
16. `shiftsync-backend/SecurityParser.class` — Compiled `.class` file outside `target/`
17. `shiftsync-backend/SecurityParser.java` — Ad-hoc search script
18. `shiftsync-backend/GenerateTests.java` — Ad-hoc test file generator (tests already committed to `src/test`)

### E. shiftsync-backend (Database Backups & Stale Worktree)
19. `shiftsync-backend/backup_before_clean.sql` — 9MB obsolete local SQL database dump
20. `shiftsync-backend/backup_pre_reset.sql` — 1.2MB obsolete local SQL database dump
21. `shiftsync-backend/ThucTapTotNghiep/` *(Directory)* — Abandoned folder from prunable git worktree

### F. shiftsync-backend (Temporary Replacement Chunks & Logs)
22. `shiftsync-backend/MarketplacePage_backup.jsonl` — Temporary chunk log
23. `shiftsync-backend/MarketplacePage_replace_1.txt` — Temporary code replacement chunk
24. `shiftsync-backend/MarketplacePage_replace_2.txt` — Temporary code replacement chunk
25. `shiftsync-backend/MarketplacePage_replace_3.txt` — Temporary code replacement chunk
26. `shiftsync-backend/MarketplacePage_replace_4.txt` — Temporary code replacement chunk
27. `shiftsync-backend/injected_script_1.txt` — Temporary code injection chunk
28. `shiftsync-backend/injected_script_2.txt` — Temporary code injection chunk
29. `shiftsync-backend/injected_script_3.txt` — Temporary code injection chunk
30. `shiftsync-backend/all_replace_calls.json` — 530KB agent tool invocation dump
31. `shiftsync-backend/inventory_raw.txt` — Intermediate controller method dump
32. `shiftsync-backend/stores.txt` — Empty 0-byte file
33. `shiftsync-backend/backend.log` — 482KB local Spring Boot console log
34. `shiftsync-backend/container.log` — 80KB Docker container log
35. `shiftsync-backend/test_output.txt` — 2.6MB Maven test console dump
36. `shiftsync-backend/full_regression_output.txt` — 2.9MB regression test console dump

### G. shiftsync-backend (One-off Temporary Scripts)
37. `shiftsync-backend/add_size.ps1` — Regex script for adding `@Size`
38. `shiftsync-backend/script.ps1` — One-off API table generator
39. `shiftsync-backend/script.py` — One-off transaction scanner
40. `shiftsync-backend/check_lock.py` — One-off search script
41. `shiftsync-backend/check_store.py` — One-off search script
42. `shiftsync-backend/check_store_exact.py` — One-off search script
43. `shiftsync-backend/patch.py` — One-off string patch script
44. `shiftsync-backend/patch_selfie.py` — One-off string patch script
45. `shiftsync-backend/generate.py` — One-off test generator
46. `shiftsync-backend/fix.js` — One-off node patch script
47. `shiftsync-backend/fix_mp.js` — One-off node patch script
48. `shiftsync-backend/inject_button.js` — One-off node patch script
49. `shiftsync-backend/inject_modal.js` — One-off node patch script
50. `shiftsync-backend/test_health.py` — One-off actuator polling script
51. `shiftsync-backend/happy_e2e.py` — Ad-hoc E2E test script
52. `shiftsync-backend/e2e.py` — Ad-hoc E2E test script
53. `shiftsync-backend/e2e2.py` — Ad-hoc E2E test script
54. `shiftsync-backend/e2e3.py` — Ad-hoc E2E test script
55. `shiftsync-backend/e2e_complete.py` — Ad-hoc E2E test script
56. `shiftsync-backend/e2e_true.py` — Ad-hoc E2E test script
57. `shiftsync-backend/run_journeys.py` — Ad-hoc E2E journey runner

### H. shiftsync-backend (Superseded Audit Reports)
58. `shiftsync-backend/AUTH_FIX_002_003_REPORT.md` — Intermediate working note (superseded)
59. `shiftsync-backend/AUTH_REVERIFICATION_REPORT.md` — Intermediate working note (superseded)
60. `shiftsync-backend/AUTH_QA_REVERIFICATION_REPORT.md` — Intermediate QA note (superseded)
61. `shiftsync-backend/FIX_REPORT.md` — Intermediate fix summary (superseded)
62. `shiftsync-backend/REGRESSION_FIX_REPORT.md` — Intermediate regression summary (superseded)
63. `shiftsync-backend/STATE_QA_REVERIFICATION_REPORT.md` — Intermediate state QA note (superseded)

---

## 3. Files Kept

All essential assets across source, configuration, migrations, tests, canonical documentation, defense materials, and useful operational scripts are kept intact.

---

## 4. Files Classified as Production

| Path | Domain | Role & Purpose |
|---|---|---|
| `ShiftSync-Mobile/components/CustomAlertModal.js` | Mobile | UI modal replacing default system alert dialogs |
| `ShiftSync-Mobile/screens/NotificationScreen.js` | Mobile | User notification inbox and push receipt screen |
| `ShiftSync-Mobile/services/pushNotificationHelper.js` | Mobile | Push token registration with backend FCM API |
| `ShiftSync-Mobile/utils/alert.js` | Mobile | Dispatcher utility invoking `CustomAlertModal` |
| `ShiftSync-Web/public/firebase-messaging-sw.js` | Web | Vite root service worker handling background FCM push notifications |
| `ShiftSync-Web/src/config/firebase.js` | Web | Firebase initialization and permission request helper |
| `shiftsync-backend/src/main/java/com/shiftsync/config/AsyncConfig.java` | Backend | Thread pools (`notificationExecutor`, `taskScheduler`) |
| `shiftsync-backend/src/main/java/com/shiftsync/store/dto/ManagerSummaryDTO.java` | Backend | Store manager profile summary DTO used by `StoreDTO` |
| `shiftsync-backend/src/main/java/com/shiftsync/store/dto/StoreOverviewDTO.java` | Backend | Store operational summary DTO used by `StoreController` |

---

## 5. Files Classified as Test

All test classes created during audit and fix phases are retained in `shiftsync-backend/src/test/java/` to prevent regressions:
- `com.shiftsync.AuditLogTransactionTest`
- `com.shiftsync.ConcurrencyVerificationTest`
- `com.shiftsync.DataIntegrityVerificationTest`
- `com.shiftsync.NextAuditVerificationTest`
- `com.shiftsync.PostFixDI004VerificationTest`
- `com.shiftsync.PostFixDataIntegrityVerificationTest`
- `com.shiftsync.PostFixVerificationTest`
- `com.shiftsync.ValidationTest`
- `com.shiftsync.attendance.service.AttendanceRegressionPostFixRuntimeQaTest`
- `com.shiftsync.attendance.service.AttendanceServiceQaTest`
- `com.shiftsync.audit.AttendancePhotoMemoryVerificationTest`
- `com.shiftsync.audit.FCMExecutorVerificationTest`
- `com.shiftsync.audit.ScheduledExecutorVerificationTest`
- `com.shiftsync.audit.service.TX003AuditIntegrationTest`
- `com.shiftsync.availability.controller.AvailabilityIdorSecurityTest`
- `com.shiftsync.leave.service.LeaveRequestServiceQaTest`
- `com.shiftsync.payroll.service.PayrollCalculationServiceQaTest`
- `com.shiftsync.payroll.service.PerformancePayrollTest`
- `com.shiftsync.performance.PerformanceClosureGateTest`
- `com.shiftsync.shared.exception.GlobalExceptionHandlerHttpQaTest`
- `com.shiftsync.shift.dto.ShiftCreateRequestValidationTest`
- `com.shiftsync.shift.service.ShiftScheduleExceptionAuditTest`
- `com.shiftsync.shift.service.ShiftServiceQaTest`
- `com.shiftsync.shift.service.ShiftSwapServiceQaTest`
- `com.shiftsync.store.service.TX001StoreCascadeIntegrationTest`
- `com.shiftsync.workforce.service.WorkforceRequestServiceTest`

---

## 6. Files Classified as Documentation

Canonical documentation is organized cleanly:
- `docs/ShiftSync_Smart_Workforce_Scheduling_Platform.md` — Core platform architecture & functional specification (81KB).
- `docs/defense/SYSTEM_MAP.md` — Master system knowledge map for graduation thesis defense (63KB).
- `docs/diagrams/` — System architecture diagrams (23 PlantUML, PNG, Draw.io, and interactive HTML diagrams).
- `docs/exception-audit/` — Exception inventory matrices for scheduling and WebSocket modules.
- `docs/audit/` — **Consolidated canonical audit reports** moved from backend root:
  - `AUTH_USER_ROLE_AUDIT_REPORT.md`
  - `AUTH_FINAL_VERIFICATION_REPORT.md`
  - `BUSINESS_LOGIC_FIX_REPORT.md`
  - `BUSINESS_LOGIC_FINAL_VERIFICATION_REPORT.md`
  - `CONCURRENCY_AUDIT.md`
  - `FCM_AUDIT_REPORT.md`
  - `FCM_CALL_SITE_MATRIX.md`
  - `STATE_TRANSITION_AUDIT.md`

---

## 7. Files Classified as Temporary

All one-off ad-hoc scripts, debug output files, replacement chunks, and intermediate logs were classified as `DELETE_TEMPORARY` or `DELETE_LOG` and deleted (see Section 2).

---

## 8. Secrets Removed

- `.colleague_token`, `.manager_token`, `.pvd_token`: Deleted from root. None were committed to Git history.
- `checkin.js`: Deleted (contained hardcoded test JWT string).
- `.gitignore` was updated to explicitly block `*.token` across the repository.

---

## 9. Duplicate Files Removed

- `ShiftSync-Web/MarketplacePage_HEAD.jsx` — Duplicate of `src/pages/MarketplacePage.jsx` deleted.
- `ShiftSync-Web/src/public/firebase-messaging-sw.js` — Redundant duplicate of `ShiftSync-Web/public/firebase-messaging-sw.js` deleted.
- `docs/diagrams/07_Attendance_Payroll_old_qr.png` — Redundant legacy diagram backup deleted.

---

## 10. Generated Artifacts Removed

- `shiftsync-backend/FindByIdParser.class` and `SecurityParser.class` deleted.
- `shiftsync-backend/ThucTapTotNghiep/` (leftover from old worktree) deleted.
- `shiftsync-backend/backup_before_clean.sql` (9MB) and `backup_pre_reset.sql` (1.2MB) deleted.

---

## 11. .gitignore Improvements

### Root `.gitignore`
Updated with comprehensive rules covering:
- Build outputs: `target/`, `dist/`, `build/`, `*.class`
- Secrets and tokens: `*.token`, `.env`, `.env.*`, `!.env.example`, `*.pem`, `*.key`, `credentials/`
- Logs: `*.log`, `npm-debug.log*`, `yarn-debug.log*`
- Temporary artifacts: `*.bak`, `*.tmp`, `*.jsonl`, `backups/`
- IDE files: `.idea/`, `.vscode/`, `*.iml`, `*.iws`

### Backend `.gitignore`
Added explicit rules for:
- `*.token`
- `*.log`

---

## 12. Build Verification

- **Frontend (`ShiftSync-Web`):**
  - Command: `npm run build`
  - Output: `vite build --emptyOutDir false` → `2042 modules transformed`, bundled in 769ms.
  - Status: **SUCCESS (0 errors)**.
- **Backend (`shiftsync-backend`):**
  - Command: `mvn test-compile`
  - Status: **SUCCESS (0 errors)**.

---

## 13. Test Verification

- **Backend Automated Tests:**
  - Command: `mvn test`
  - Scope: 467 test cases (Spring Data JPA, MockMvc, Security IDOR, Concurrency, Cascade Integration, RBAC).
  - Results: **467 tests run, 0 failures, 0 errors, 3 skipped (profile-conditional)**.
  - Build Status: **BUILD SUCCESS (56.4s)**.

---

## 14. Reference Verification

Ran repository-wide ripgrep/git grep for all deleted identifiers (`MarketplacePage_HEAD`, `checkin.js`, `dummy.jpg`, `FindByIdParser`, `SecurityParser`, `GenerateTests`, etc.):
- **Results:** 0 occurrences found.
- **Dangling References:** **0**.

---

## 15. Remaining Untracked Files

All remaining untracked files are verified production assets, configs, documentation, or useful seed datasets:
1. `REPOSITORY_CLEANUP_PLAN.md` (Forensic plan)
2. `ShiftSync-Mobile/GoogleService-Info.plist` (Firebase iOS config)
3. `ShiftSync-Mobile/components/CustomAlertModal.js` (Production component)
4. `ShiftSync-Mobile/google-services.json` (Firebase Android config)
5. `ShiftSync-Mobile/screens/NotificationScreen.js` (Production screen)
6. `ShiftSync-Mobile/services/pushNotificationHelper.js` (Production service)
7. `ShiftSync-Mobile/utils/alert.js` (Production utility)
8. `ShiftSync-Web/public/firebase-messaging-sw.js` (Production Service Worker)
9. `ShiftSync-Web/src/config/firebase.js` (Production config)
10. `database/seed_two_stores_and_tests.sql` (Seed dataset)
11. `docs/audit/*` (8 consolidated canonical audit reports)
12. `docs/defense/SYSTEM_MAP.md` (Thesis defense system map)
13. `docs/diagrams/*` (System architecture diagrams & interactive HTML visualizers)
14. `docs/exception-audit/*` (Exception matrices & evidence)
15. `shiftsync-backend/scripts/seed/seed_for_user_testing.sql` (Seed dataset)
16. `shiftsync-backend/src/main/java/com/shiftsync/config/AsyncConfig.java` (Production config)
17. `shiftsync-backend/src/main/java/com/shiftsync/store/dto/ManagerSummaryDTO.java` (Production DTO)
18. `shiftsync-backend/src/main/java/com/shiftsync/store/dto/StoreOverviewDTO.java` (Production DTO)
19. `shiftsync-backend/src/main/resources/db/migration/V41__fix_payroll_period_overlap.sql` (Flyway migration)
20. `shiftsync-backend/src/main/resources/db/migration/V42__restore_workforce_request_columns.sql` (Flyway migration)
21. `shiftsync-backend/src/test/java/com/shiftsync/*` (Automated regression & verification tests)

---

## 16. Remaining Modified Files

All 121 tracked modified files from previous engineering and audit phases remain 100% untouched and preserved.

---

## 17. Risks / Items Requiring Human Review

1. **Commit Untracked Production Code:**
   The untracked files in Mobile (`CustomAlertModal.js`, `NotificationScreen.js`, `pushNotificationHelper.js`, `alert.js`), Web (`firebase-messaging-sw.js`, `src/config/firebase.js`), and Backend (`AsyncConfig.java`, `ManagerSummaryDTO.java`, `StoreOverviewDTO.java`, `V41`, `V42`, tests) are actively working and verified. They should be reviewed and committed as part of a feature commit rather than left untracked indefinitely.
2. **Mobile Firebase Configs:**
   `ShiftSync-Mobile/google-services.json` and `GoogleService-Info.plist` contain client IDs for Firebase development. Ensure that production environment CI/CD pipelines inject separate production configurations when generating release builds.
