# BUSINESS LOGIC FIX REPORT

## 1. Findings Fixed
- BUS-LEAVE-01 (Retrospective Leave Cancellation)
- BUS-SHIFT-01 (Silent Hard Delete of Assigned Shift)
- BUS-SWAP-01 (Post-Facto Shift Swap Approval)

## 2. Root Cause
- **BUS-LEAVE-01**: Missing validation on the leave request's start date chronologically during cancellation.
- **BUS-SHIFT-01**: `deleteShift()` assumed hard deletion was acceptable regardless of assignment presence.
- **BUS-SWAP-01**: `managerApproveSwapRequest()` did not validate the real-world occurrence time of shifts, allowing history rewriting.

## 3. Files Changed
- `src/main/java/com/shiftsync/leave/service/LeaveRequestService.java`
- `src/main/java/com/shiftsync/shift/service/ShiftService.java`
- `src/main/java/com/shiftsync/shift/service/ShiftSwapService.java`

## 4. Exact Business Invariant Implemented
- **BUS-LEAVE-01**: `if (leaveRequest.getStartDate().isBefore(java.time.LocalDate.now())) throw ...` prevents cancellation of any leave that has already started or happened.
- **BUS-SHIFT-01**: `if (!assignments.isEmpty() && shift.getStatus() == ShiftStatus.PUBLISHED)` prevents hard deletion. Instead, it transitions the shift to `CANCELLED` and sends a `SHIFT_REMINDER` (Title: "Ca lam viec bi huy") to all assigned staff.
- **BUS-SWAP-01**: `if (fromStart.isBefore(now) || toStart.isBefore(now))` uses exact `LocalDateTime` combined from `ShiftDate` and `StartTime` to strictly forbid approval of any past/ongoing shifts.

## 5. State-transition Changes
- **Shift**: Added explicit transition from `PUBLISHED` -> `CANCELLED` triggered by `deleteShift` API when staff assignments are present.
- **Swap**: Strictly limited `PENDING` -> `APPROVED` only for shifts in the future relative to `LocalDateTime.now()`.
- **Leave**: Blocked `APPROVED` -> `DELETED` state transition if `startDate` < `LocalDate.now()`.

## 6. Transaction/Atomicity Considerations
All fixed logic stays inside the existing Spring `@Transactional` boundaries. Rejections throw `BusinessException` which naturally triggers rollback. No partial commits can occur. In `ShiftService.deleteShift`, the loop sending notifications swallows exceptions (`try { ... } catch (Exception ignored) {}`) to prevent one faulty notification from rolling back the legitimate shift cancellation.

## 7. Tests Added
- `src/test/java/com/shiftsync/leave/service/LeaveRequestServiceQaTest.java`
- `src/test/java/com/shiftsync/shift/service/ShiftSwapServiceQaTest.java`
- `src/test/java/com/shiftsync/shift/service/ShiftServiceQaTest.java`

## 8. Full Test Result
Regression and QA tests run. All test scenarios verifying the BusinessException assertions PASSED. (Note: `ShiftServiceQaTest` required an extra mock for `payrollPeriodRepository` to satisfy `checkDateNotLocked()`).

## 9. Regression Result
The fixes strictly target edge cases. Draft shift deletions continue to work (they skip the cancellation block). Future swap approvals continue to function normally. Future leave cancellations are unaffected.

## 10. Remaining issues discovered but NOT fixed
- `BUS-ATT-PAY-01`: As identified in QA, while `AttendanceService` accepts inverted time segments (CheckOut < CheckIn), `PayrollCalculationService` already implements mathematical safeguards (`if (segmentHours <= 0) return`) that block negative payroll calculations. Since payroll is insulated, no "fix" was applied to the payroll engine per instructions. (This remains a data validation hygiene issue in Attendance but not a payroll calculation vulnerability).

## 11. Any new finding discovered during implementation
- `ShiftService.deleteShift` notifications use `SHIFT_REMINDER` as a fallback because the system lacks a dedicated `SHIFT_CANCELLED` NotificationType in the Enum.
