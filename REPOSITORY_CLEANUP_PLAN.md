# SHIFTSYNC — REPOSITORY FORENSIC CLEANUP PLAN

**Role:** Senior Software Architect + Senior Repository Maintainer + DevOps Engineer + Codebase Forensic Auditor  
**Date:** 2026-10-08  
**Baseline Branch:** `duyen-frontend`  
**Git Commit Baseline:** `9f8e2e7`  

---

## 1. Executive Summary & Forensic Principles

This cleanup plan conducts a non-destructive, forensic cleanup of the ShiftSync monorepo.
All production fixes in the active working tree (across `shiftsync-backend`, `ShiftSync-Web`, `ShiftSync-Mobile`, and `docs/`) will be strictly preserved.
No `git reset`, `git checkout`, or `git restore` will be executed.

### Core Classification Rules
- **KEEP_PRODUCTION**: Application source code actively referenced or registered in Spring/React/Expo lifecycles.
- **KEEP_CONFIG**: Production configuration and deployment manifests (`application.properties`, `docker-compose.yml`, `app.json`, `package.json`, `pom.xml`, etc.).
- **KEEP_MIGRATION**: Flyway database migrations (`V1` to `V42`) and canonical seed scripts.
- **KEEP_TEST**: Automated unit, integration, and regression test suites.
- **KEEP_DOCUMENTATION**: Official system documentation, specifications, and architecture diagrams.
- **KEEP_DEFENSE**: System map, knowledge base, and defense artifacts required for thesis graduation defense.
- **KEEP_USEFUL_SCRIPT**: Reusable operational and seed scripts (`scripts/seed/`).
- **DELETE_SECRET**: Local JWT tokens, temporary credentials.
- **DELETE_TEMPORARY**: Ad-hoc one-off patching scripts, temporary text fragments, test images, debug runners.
- **DELETE_GENERATED**: Intermediate build/generator artifacts outside standard target directories.
- **DELETE_LOG**: Local execution and container logs (`backend.log`, `container.log`, test outputs).
- **DELETE_BACKUP**: Superseded database dumps and old diagram backup files.
- **DELETE_DUPLICATE**: Redundant duplicate files (e.g., duplicate files in unserved directories).
- **DELETE_COMPILED_ARTIFACT**: `.class` files compiled directly in root directories.

---

## 2. Comprehensive Inventory & Classification Matrix

| File / Directory | Category | Reason | Referenced? | Decision |
|---|---|---|---|---|
| `.colleague_token` | DELETE_SECRET | Temporary local JWT token generated during manual testing | No | **DELETE** |
| `.manager_token` | DELETE_SECRET | Temporary local JWT token generated during manual testing | No | **DELETE** |
| `.pvd_token` | DELETE_SECRET | Temporary local JWT token generated during manual testing | No | **DELETE** |
| `checkin.js` | DELETE_TEMPORARY | Temporary node script with hardcoded JWT token calling attendance API | No | **DELETE** |
| `dummy.jpg` | DELETE_TEMPORARY | Local dummy image file used for checkin testing | No | **DELETE** |
| `fix_end_fragment.js` | DELETE_TEMPORARY | Temporary script used in past session to patch MarketplacePage.jsx | No | **DELETE** |
| `fix_fragment.js` | DELETE_TEMPORARY | Temporary script used in past session to patch MarketplacePage.jsx | No | **DELETE** |
| `inject_ui.js` | DELETE_TEMPORARY | Temporary script used in past session to patch MarketplacePage.jsx | No | **DELETE** |
| `test_attendance_lifecycle.js` | DELETE_TEMPORARY | Temporary one-off test script requiring `.pvd_token` and `dummy.jpg` | No | **DELETE** |
| `ShiftSync-Web/MarketplacePage_HEAD.jsx` | DELETE_DUPLICATE | Leftover duplicate component file in web root from earlier merge | No | **DELETE** |
| `ShiftSync-Web/src/public/firebase-messaging-sw.js` | DELETE_DUPLICATE | Duplicate copy of service worker. Vite serves from `public/`, not `src/public/` | No | **DELETE** |
| `ShiftSync-Web/public/firebase-messaging-sw.js` | KEEP_PRODUCTION | Canonical Service Worker served by Vite root for FCM background push | Yes (`firebase.js`) | **KEEP** |
| `ShiftSync-Web/src/config/firebase.js` | KEEP_PRODUCTION | Firebase Web client configuration and token registration | Yes (`LoginPage.jsx`) | **KEEP** |
| `ShiftSync-Mobile/GoogleService-Info.plist` | KEEP_CONFIG | Firebase iOS client configuration file | Yes (`app.json`) | **KEEP** |
| `ShiftSync-Mobile/google-services.json` | KEEP_CONFIG | Firebase Android client configuration file | Yes (`app.json`) | **KEEP** |
| `ShiftSync-Mobile/components/CustomAlertModal.js` | KEEP_PRODUCTION | Custom alert modal component replacing React Native default alert | Yes (`App.js`) | **KEEP** |
| `ShiftSync-Mobile/screens/NotificationScreen.js` | KEEP_PRODUCTION | Push notification and in-app notification center screen | Yes (`AppNavigator.js`) | **KEEP** |
| `ShiftSync-Mobile/services/pushNotificationHelper.js` | KEEP_PRODUCTION | Expo push notification registration and token handler | Yes (`AppNavigator.js`, `LoginScreen.js`) | **KEEP** |
| `ShiftSync-Mobile/utils/alert.js` | KEEP_PRODUCTION | Global alert helper dispatching to CustomAlertModal | Yes (multiple screens) | **KEEP** |
| `docs/defense/SYSTEM_MAP.md` | KEEP_DEFENSE | Master thesis defense architecture & knowledge map | Yes (Defense) | **KEEP** |
| `docs/diagrams/07_Attendance_Payroll_old_qr.png` | DELETE_BACKUP | Superseded diagram backup before migration to live selfie attendance | No | **DELETE** |
| `docs/diagrams/*.html` (4 files) | KEEP_DOCUMENTATION | Standalone interactive diagram viewers (ERD, LiveSelfie, Architecture) | Yes (Docs) | **KEEP** |
| `docs/diagrams/*.puml`, `*.png`, `*.drawio` | KEEP_DOCUMENTATION | System sequence, use case, and UI architectural diagrams | Yes (Docs) | **KEEP** |
| `docs/exception-audit/` | KEEP_DEFENSE | Schedule and WebSocket exception matrices and evidence | Yes (Docs/Defense) | **KEEP** |
| `database/seed_two_stores_and_tests.sql` | KEEP_USEFUL_SCRIPT | Idempotent dataset seed for two operational stores & test accounts | Yes (DevOps/QA) | **KEEP** |
| `shiftsync-backend/scripts/seed/seed_for_user_testing.sql` | KEEP_USEFUL_SCRIPT | User testing seed dataset in official scripts folder | Yes (Scripts) | **KEEP** |
| `shiftsync-backend/src/main/java/com/shiftsync/config/AsyncConfig.java` | KEEP_PRODUCTION | ThreadPoolTaskExecutor configuration for notifications and scheduler | Yes (Spring context) | **KEEP** |
| `shiftsync-backend/src/main/java/com/shiftsync/store/dto/ManagerSummaryDTO.java` | KEEP_PRODUCTION | DTO representing store managers list | Yes (`StoreDTO.java`) | **KEEP** |
| `shiftsync-backend/src/main/java/com/shiftsync/store/dto/StoreOverviewDTO.java` | KEEP_PRODUCTION | DTO representing store operational overview | Yes (`StoreController`, `StoreService`) | **KEEP** |
| `shiftsync-backend/src/main/resources/db/migration/V41__fix_payroll_period_overlap.sql` | KEEP_MIGRATION | Flyway schema migration fixing payroll period constraint | Yes (Flyway) | **KEEP** |
| `shiftsync-backend/src/main/resources/db/migration/V42__restore_workforce_request_columns.sql` | KEEP_MIGRATION | Flyway schema migration restoring workforce columns | Yes (Flyway) | **KEEP** |
| `shiftsync-backend/src/test/java/com/shiftsync/...` (all new tests) | KEEP_TEST | Automated unit, security IDOR, concurrency, and QA regression tests | Yes (Maven test) | **KEEP** |
| `shiftsync-backend/FindByIdParser.class` | DELETE_COMPILED_ARTIFACT | Compiled class file residing in project root | No | **DELETE** |
| `shiftsync-backend/FindByIdParser.java` | DELETE_TEMPORARY | Ad-hoc one-off search script | No | **DELETE** |
| `shiftsync-backend/SecurityParser.class` | DELETE_COMPILED_ARTIFACT | Compiled class file residing in project root | No | **DELETE** |
| `shiftsync-backend/SecurityParser.java` | DELETE_TEMPORARY | Ad-hoc one-off search script | No | **DELETE** |
| `shiftsync-backend/GenerateTests.java` | DELETE_TEMPORARY | Test generator script whose generated tests are already in src/test | No | **DELETE** |
| `shiftsync-backend/backup_before_clean.sql` | DELETE_BACKUP | 9MB obsolete local database backup dump | No | **DELETE** |
| `shiftsync-backend/backup_pre_reset.sql` | DELETE_BACKUP | 1.2MB obsolete local database backup dump | No | **DELETE** |
| `shiftsync-backend/ThucTapTotNghiep/` | DELETE_GENERATED | Abandoned directory from prunable past git worktree | No | **DELETE** |
| `shiftsync-backend/MarketplacePage_backup.jsonl` | DELETE_TEMPORARY | Backup JSONL chunk from previous agent session | No | **DELETE** |
| `shiftsync-backend/MarketplacePage_replace_*.txt` (4 files) | DELETE_TEMPORARY | Temporary replacement text snippets | No | **DELETE** |
| `shiftsync-backend/injected_script_*.txt` (3 files) | DELETE_TEMPORARY | Temporary injection text snippets | No | **DELETE** |
| `shiftsync-backend/all_replace_calls.json` | DELETE_TEMPORARY | Log of tool calls from previous agent session (530KB) | No | **DELETE** |
| `shiftsync-backend/inventory_raw.txt` | DELETE_TEMPORARY | Intermediate dump of controller methods | No | **DELETE** |
| `shiftsync-backend/stores.txt` | DELETE_TEMPORARY | Empty 0-byte temporary file | No | **DELETE** |
| `shiftsync-backend/backend.log` | DELETE_LOG | Local Spring Boot execution log (482KB) | No | **DELETE** |
| `shiftsync-backend/container.log` | DELETE_LOG | Local Docker container output log (80KB) | No | **DELETE** |
| `shiftsync-backend/test_output.txt` | DELETE_LOG | Maven test execution output log (2.6MB) | No | **DELETE** |
| `shiftsync-backend/full_regression_output.txt` | DELETE_LOG | Full regression test execution log (2.9MB) | No | **DELETE** |
| `shiftsync-backend/add_size.ps1` | DELETE_TEMPORARY | One-off script for regex patching DTO annotations | No | **DELETE** |
| `shiftsync-backend/script.ps1` | DELETE_TEMPORARY | One-off script for writing API inventory to old agent brain | No | **DELETE** |
| `shiftsync-backend/script.py` | DELETE_TEMPORARY | One-off regex inspection script | No | **DELETE** |
| `shiftsync-backend/check_lock.py` | DELETE_TEMPORARY | One-off search script for findByIdForUpdate | No | **DELETE** |
| `shiftsync-backend/check_store.py` | DELETE_TEMPORARY | One-off search script | No | **DELETE** |
| `shiftsync-backend/check_store_exact.py` | DELETE_TEMPORARY | One-off search script | No | **DELETE** |
| `shiftsync-backend/patch.py` | DELETE_TEMPORARY | One-off code string replacement script | No | **DELETE** |
| `shiftsync-backend/patch_selfie.py` | DELETE_TEMPORARY | One-off code string replacement script | No | **DELETE** |
| `shiftsync-backend/generate.py` | DELETE_TEMPORARY | One-off test generator script | No | **DELETE** |
| `shiftsync-backend/fix.js` | DELETE_TEMPORARY | One-off node patch script | No | **DELETE** |
| `shiftsync-backend/fix_mp.js` | DELETE_TEMPORARY | One-off node patch script | No | **DELETE** |
| `shiftsync-backend/inject_button.js` | DELETE_TEMPORARY | One-off node patch script | No | **DELETE** |
| `shiftsync-backend/inject_modal.js` | DELETE_TEMPORARY | One-off node patch script | No | **DELETE** |
| `shiftsync-backend/test_health.py` | DELETE_TEMPORARY | 10-line one-off actuator health poll script | No | **DELETE** |
| `shiftsync-backend/happy_e2e.py` | DELETE_TEMPORARY | Temporary E2E test runner from audit phase | No | **DELETE** |
| `shiftsync-backend/e2e.py` | DELETE_TEMPORARY | Temporary E2E test runner from audit phase | No | **DELETE** |
| `shiftsync-backend/e2e2.py` | DELETE_TEMPORARY | Temporary E2E test runner from audit phase | No | **DELETE** |
| `shiftsync-backend/e2e3.py` | DELETE_TEMPORARY | Temporary E2E test runner from audit phase | No | **DELETE** |
| `shiftsync-backend/e2e_complete.py` | DELETE_TEMPORARY | Temporary E2E test runner from audit phase | No | **DELETE** |
| `shiftsync-backend/e2e_true.py` | DELETE_TEMPORARY | Temporary E2E test runner from audit phase | No | **DELETE** |
| `shiftsync-backend/run_journeys.py` | DELETE_TEMPORARY | Temporary journey runner from audit phase | No | **DELETE** |
| `shiftsync-backend/AUTH_FIX_002_003_REPORT.md` | DELETE_DUPLICATE | Intermediate working notes superseded by final audit & verification | No | **DELETE** |
| `shiftsync-backend/AUTH_REVERIFICATION_REPORT.md` | DELETE_DUPLICATE | Intermediate working notes superseded by final verification | No | **DELETE** |
| `shiftsync-backend/AUTH_QA_REVERIFICATION_REPORT.md` | DELETE_DUPLICATE | Intermediate QA notes superseded by final verification | No | **DELETE** |
| `shiftsync-backend/FIX_REPORT.md` | DELETE_DUPLICATE | Intermediate fix summary superseded by canonical reports | No | **DELETE** |
| `shiftsync-backend/REGRESSION_FIX_REPORT.md` | DELETE_DUPLICATE | Intermediate regression summary superseded by canonical reports | No | **DELETE** |
| `shiftsync-backend/STATE_QA_REVERIFICATION_REPORT.md` | DELETE_DUPLICATE | Intermediate state notes superseded by STATE_TRANSITION_AUDIT | No | **DELETE** |
| `shiftsync-backend/AUTH_USER_ROLE_AUDIT_REPORT.md` | KEEP_DEFENSE | Canonical comprehensive audit report on RBAC & Auth mechanisms | Yes (Docs) | **CONSOLIDATE -> docs/audit/** |
| `shiftsync-backend/AUTH_FINAL_VERIFICATION_REPORT.md` | KEEP_DEFENSE | Canonical final verification report of authentication invariants | Yes (Docs) | **CONSOLIDATE -> docs/audit/** |
| `shiftsync-backend/BUSINESS_LOGIC_FIX_REPORT.md` | KEEP_DEFENSE | Canonical architectural report on business invariant fixes | Yes (Docs) | **CONSOLIDATE -> docs/audit/** |
| `shiftsync-backend/BUSINESS_LOGIC_FINAL_VERIFICATION_REPORT.md` | KEEP_DEFENSE | Canonical runtime verification of business invariants | Yes (Docs) | **CONSOLIDATE -> docs/audit/** |
| `shiftsync-backend/CONCURRENCY_AUDIT.md` | KEEP_DEFENSE | Canonical concurrency audit & distributed locking matrix | Yes (Docs) | **CONSOLIDATE -> docs/audit/** |
| `shiftsync-backend/FCM_AUDIT_REPORT.md` | KEEP_DEFENSE | Canonical FCM audit report across backend, web, mobile | Yes (Docs) | **CONSOLIDATE -> docs/audit/** |
| `shiftsync-backend/FCM_CALL_SITE_MATRIX.md` | KEEP_DEFENSE | Canonical call site matrix for notification events | Yes (Docs) | **CONSOLIDATE -> docs/audit/** |
| `shiftsync-backend/STATE_TRANSITION_AUDIT.md` | KEEP_DEFENSE | Canonical audit report on state transition integrity | Yes (Docs) | **CONSOLIDATE -> docs/audit/** |

---

## 3. Plan Review & Safety Invariants
1. **Zero Impact on Production Runtime**: No files under `src/main`, `ShiftSync-Web/src/pages`, `ShiftSync-Web/src/services`, `ShiftSync-Mobile/screens`, or `ShiftSync-Mobile/services` will be modified or removed.
2. **Zero Impact on Migrations**: `V41` and `V42` remain intact.
3. **Zero Impact on Tests**: All unit and QA test files in `src/test` are kept.
4. **Documentation & Defense Preserved**: Canonical reports are consolidated into `docs/audit/` instead of cluttering backend root.
