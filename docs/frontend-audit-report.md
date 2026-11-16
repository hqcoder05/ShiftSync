# ShiftSync Frontend Audit Report

**Scope:** `ShiftSync-Web` (`src/pages/`, `src/layouts/`, `src/index.css`, `index.html`) and `ShiftSync-Mobile` (`screens/`, `services/`)
**Evaluation Criteria:** `ui-review`, `ui-a11y`, `ux-audit`, `web-design-guidelines`, `react-component-performance`, `react-patterns`, `vibe-code-auditor`.

---

## 1. Executive Summary & Baseline
- **Web Lint (`npm run lint`):** Passed (`0` errors).
- **Web Unit Tests (`npm test`):** `195/195` tests passed across `20` suites.
- **Web Production Build (`npm run build`):** Passed cleanly (`✓ built in <3s`).
- **Mobile Syntax Check (`@babel/core` / `babel-preset-expo`):** Modified screens pass cleanly.

---

## 2. Prioritized Findings & Fixes Applied

### High Severity — Performance & Re-render Hotspots (`react-component-performance`)
1. **1-second root-level ticker in `ShiftSync-Web/src/pages/MarketplacePage.jsx:212`**
   - **Issue:** `setInterval(update, 1000)` updated `clock` every 1 second at the root of a `3,523`-line page component, forcing full-page re-renders and recomputation of 5 `useMemo` pipelines 60 times/minute for minute/shift-start checks.
   - **Fix Applied:** Changed polling interval to `30000` ms (30s) while keeping instant `focus` and `visibilitychange` listeners intact.
2. **1-second root-level ticker in `ShiftSync-Mobile/screens/AvailabilityScreen.js:76`**
   - **Issue:** `setInterval(() => setClockNow(new Date()), 1000)` re-rendered the entire `728`-line `AvailabilityScreen` every second just to evaluate a weekly availability edit deadline (`getAvailabilityEditStatus`).
   - **Fix Applied:** Changed interval to `30000` ms (30s) while preserving instant refresh on navigation `focus`.

### High Severity — Accessibility (`ui-a11y`, `web-design-guidelines`)
3. **Document language mismatch in `ShiftSync-Web/index.html:2`**
   - **Issue:** `<html lang="en">` was set despite the entire user interface being in Vietnamese (`vi`).
   - **Fix Applied:** Updated to `<html lang="vi">`.
4. **Missing global `:focus-visible` fallback alongside `outline: none` rules in `ShiftSync-Web/src/index.css`**
   - **Issue:** Legacy CSS files (`App.css`, `Header.css`, `AddUserModal.css`, `AdminPage.css`, `AttendancePageLive.css`, `DashboardPage.css`, `DemandPlanning.css`) contain `outline: none` rules without consistent `:focus-visible` rings.
   - **Fix Applied:** Added a global `:focus-visible` outline rule (`2px solid var(--ss-ac, #4f46e5)`, `outline-offset: 2px`) in `ShiftSync-Web/src/index.css`.
5. **Touch target & ARIA state on Mobile swap-mode toggles (`ShiftSync-Mobile/screens/RequestScreen.js`, `ScheduleScreen.js`)**
   - **Issue:** Mode toggle buttons (`Đổi ca 2 chiều` / `Nhường ca 1 chiều`) lacked `ensureTouchTarget(...)` (`>= 44px`) and `accessibilityState={{ selected }}`.
   - **Fix Applied:** Wrapped styles with `ensureTouchTarget(...)` and added `accessibilityState={{ selected }}`.

---

## 3. Architectural & Technical Debt Backlog (`vibe-code-auditor`, `react-patterns`)
> *Note: Kept out of automated edits to avoid risky multi-thousand-line refactors without dedicated E2E coverage.*

1. **Monolithic Page/Screen Files (>1,500 lines) — Medium/High Maintainability Risk**
   - `ShiftSync-Web/src/pages/MarketplacePage.jsx` (`3,523` lines)
   - `ShiftSync-Web/src/pages/SchedulePage.jsx` (`3,333` lines)
   - `ShiftSync-Mobile/screens/RequestScreen.js` (`3,104` lines)
   - `ShiftSync-Web/src/pages/AttendancePageLive.jsx` (`2,515` lines)
   - `ShiftSync-Mobile/screens/ScheduleScreen.js` (`2,508` lines)
   - `ShiftSync-Web/src/pages/SettingsPage.jsx` (`2,469` lines)
   - `ShiftSync-Web/src/pages/EmployeeDetailPage.jsx` (`2,110` lines)
   - **Recommendation:** Incrementally extract modal subcomponents (e.g., `SwapCreateModal`, `SwapDetailModal`, `WorkforceProposalModal`) and custom data hooks cleanly.
2. **Modal Keyboard Accessibility (`ui-a11y`)**
   - Overlay `<div onClick>` backdrops in `AdminPage.jsx` and `MarketplacePage.jsx` should add `Escape` key listeners and `role="dialog" aria-modal="true"` (already implemented in `AttendancePageLive.jsx`).
3. **Silent `catch {}` Blocks & Placeholder Screens in Mobile (`vibe-code-auditor`)**
   - Several background sync helpers (`avatarSync.js`, `profileDrafts.js`, `notificationService.js`, `NotificationRuntime.js`) swallow errors with empty `catch {}`. Consider `__DEV__` debug logging for diagnostics.
   - Minimal/stub files (`ProfileScreen.js`: 1 line, `AttendanceScreen.js`: 9 lines) can be cleaned up once verified unused in navigation routes.
