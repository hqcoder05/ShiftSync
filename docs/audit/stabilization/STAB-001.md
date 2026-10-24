# STAB-001 — Stabilization ledger (23/10/2026)

Status: IN PROGRESS. This is not a whole-project acceptance report.

## Reused knowledge
PROJECT_CONTEXT, TASK_MEMORY, CODEBASE_MAP, AUDIT_INDEX; FIX031–038 quota/form work, LIVE024 backend integration, PHASE3 scheduling audit. Previous runtime passes are historical evidence, not current acceptance.

## Feature matrix
Every row requires success, rejected permission, missing data, API failure, repeated submission, reload persistence and branch-switch checks. Roles below are test actors, not inferred authorization guarantees. Static endpoints/guards are inventoried in source-inventory.json.

| Page/module | Actions and source | Actors | Acceptance scenario | Current status |
|---|---|---|---|---|
| Login/session | authService; token refresh/logout | Admin/Manager/Staff | expired token, concurrent refresh, logout prevents reuse | NOT_VERIFIED |
| Dashboard | dashboardService | all accessible roles | totals match same store/range in source pages | NOT_VERIFIED |
| Schedule/templates | shiftService/templateService | Manager/Admin; Staff read permissions | create/edit/publish/reload; preserve multi-assignment | NOT_VERIFIED |
| Availability | availabilityService | Staff/Manager/Admin | own versus other employee, dates, leave overlap | NOT_VERIFIED |
| Demand day/week | headcountQuotaService | Manager/Admin; Staff denied | provenance, persisted zero, saved budget, preserved shifts | PARTIAL: targeted unit tests; live pending |
| Auto scheduler | shiftService, auto-scheduler feature | Manager/Admin | preview/apply, constraints, repeated apply | NOT_VERIFIED |
| Marketplace/swap/workforce | marketplaceService/swapService/workforceService | all per action | expired shift, two claimants, approve/reject, cross-store | NOT_VERIFIED |
| Attendance/explanation/leave | attendanceService/adjustmentService/leaveService | all per action | clock in/out, correction, leave affects schedule | NOT_VERIFIED |
| Employees/contracts/skills | employeeService/employmentService/skillService/contractTypeService | Manager/Admin; Staff denied | CRUD, store isolation, reload | NOT_VERIFIED |
| Payroll | payrollService | authorized roles only | source hours, leave/OT, lock, existing export | NOT_VERIFIED |
| Stores/settings/admin | storeService/storeConfigService/adminService/roleService/holidayService | role matrix | CRUD, permissions, settings persist | NOT_VERIFIED |
| Notifications/navigation | notificationService and Navbar | all | unread vs action pending; destination and failure retention | NOT_VERIFIED |
| Explorer/Planner/Designer | layoutService + assignments + attendance | authorized roles | model/selection, grouped movement, save/reload/conflict | NOT_VERIFIED |
| Realtime | WebSocketContext and event publishers | per-store users | event replay/refetch after reconnect, no duplicates | NOT_VERIFIED |
| All layouts/dialogs | shared and page CSS | all | Edge 1920/1366/390, zoom100/125, all sections open | NOT_VERIFIED |

## Baseline and findings
- Web build PASS with existing large-chunk warning.
- Baseline Node: 188/189. The one failure expected decorative emojis removed by user request. Updated assertion: 189/189 PASS.
- Baseline ESLint: 341 errors, 39 warnings. No blanket suppression or automatic rewrite applied.
- Baseline Maven: 516 tests, 0 assertion failures, 36 context errors, 5 skipped. Database connection refused while Docker offline. This is NOT an integration pass.
- P0: quota apply deleted out-of-hours draft shifts and assignments. Removed deletion; returns reviewShiftIds/message, UI retains warning for manual review.
- P1: quota count accepted skill ID from another store. Scoped lookup now happens before shift creation; rejection test included.
- P1: monthly quota budget lived in ConcurrentHashMap. Now persisted on Store with V47 positive nullable BIGINT. Existing in-memory values cannot be reconstructed after process exit; null preserves existing default. V47 NOT deployed to operational DB.
- P1: weekend matrix expanded max to match count, hiding violations. Removed expansion and prioritize over-max over peak.
- P1: cells inferred provenance from temp ID. Add explicit source and assignment/shortage/excess counts, using requiredSkillId only. Null-role assignments reported separately per shift, never summed across role cells.

## Isolated verification
compose.stabilization.yml owns a separate Compose project/volume, PostgreSQL 55432 and Redis 56379 bound to loopback. scripts/test-stabilization-backend.ps1 explicitly overrides Spring datasource/Redis; stops on infrastructure failure. No operational DB reset or migration executed.

## Remaining gates
Run isolated integration suite and verify V47 restart persistence; extend weekly provenance/over-max tests; finish auth/session and full matrix journeys; Edge and production-build UI verification; full lint remediation. Backend Docker currently not verified with new code. All NOT_VERIFIED rows remain open.

STAB-001 verification update: Linux isolated full Maven suite BUILD SUCCESS: 520 tests, 0 failures, 0 errors, 5 skipped (515 executed). Log backend-stabilization-linux-after.log. Payroll fixture now self-contained/transactional. This does not complete browser business journeys or authorize operational migration.

### STAB-002 — Kiểm chứng persistence/quyền và UI live (23/10/2026)
Thêm QuotaBudgetPersistenceTest: flush+clear rồi đọc lại DB và response tuần đúng92000000, store khác không ảnh hưởng, giá trị âm không ghi đè. Linux isolated test cùng AvailabilityIdorSecurityTest:3/3 PASS. Đây là persistence-context reload, chưa phải restart JVM. Test availability được bổ sung @Transactional/AfterEach clearSecurityContext để không rò auth/dữ liệu sang test khác (cleanup edit sau lượt chạy, cần suite kế tiếp xác nhận). Edge155 live backend rebuilt: weekly42coverage cells, footer visible vàno horizontal overflow1920/1366/390 PASS, không DBwrite. Không production source change lần này; Docker không cần rebuild chỉ vì test/docs. Còn fulljourneys/realtime/3D/lint/125%.

Deployment correction: backend rebuilt and live day/week APIs200 on23/10; operational V47 applied after backup. Earlier NOT deployed statements are superseded.
