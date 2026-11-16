# Shift Swap & 1-Way Giveaway Sync Notes

## Backend (`shiftsync-backend`)
- **`ShiftSwapController.createSwapRequest`**:
  - Supports both 2-way swaps (`toShiftId != null`, single `toStaffId`) and 1-way shift giveaways (`toShiftId == null`, single `toStaffId` or `toStaffIds` up to 3 recipients).
  - Returns the full `ShiftSwapRequestDTO` via `ShiftSwapService.toDTO(swap, viewerStaffId)` (including `createdAt`, `fromShiftRoleName`, `toShiftRoleName`, `myEstimatedPayDelta`, and `storeLaborCostDelta`).
- **`ShiftSwapService` & `ShiftValidationService`**:
  - 1-way giveaways (`toShift == null`) skip availability (`validateAvailabilityAndTimeOff`) and weekly hour limits (`ShiftValidationService.validateNoOverlap`), while still enforcing overlap, skill, approved leave, active employment, and payroll lock checks.
  - Up to 3 active `PENDING` 1-way giveaway requests can exist per `(fromShiftId, fromStaffId)` across distinct recipients; approving one automatically cancels sibling `PENDING` requests for that shift.

## Mobile (`ShiftSync-Mobile`)
- **`screens/RequestScreen.js` & `screens/ScheduleScreen.js`**:
  - Added a mode toggle (`Đổi ca 2 chiều` / `Nhường ca 1 chiều`).
  - In 1-way giveaway mode, colleagues are filtered to store staff who have **no non-cancelled shift on the source shift's date**, with multi-select capped at **3 recipients** (`toStaffIds`, `toShiftId: null`).
- **`services/scheduleConflictService.js` & `services/requestService.js`**:
  - Updated `submitCheckedSwap` and `createStaffRequest` to accept optional `toShiftId: null` and `toStaffIds` (max 3).

## Web (`ShiftSync-Web`)
- **`src/utils/swapDisplay.js`**:
  - Shared formatting helpers (`isOneWayGiveaway`, `formatSwapQuickTitle`, `formatSwapQuickSubtitle`) displaying 1-way vs 2-way badges, duration comparison, role comparison, labor cost delta, and colleague acceptance status without emoji icons.
- **`src/pages/DashboardPage.jsx` & `src/layouts/MainLayout.jsx`**:
  - Applied shared swap quick-card formatting and guarded quick approval behind `employeeAccepted === true`.
