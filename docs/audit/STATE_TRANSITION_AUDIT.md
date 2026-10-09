# SHIFT SYNC: STATE TRANSITION & BUSINESS LOGIC INTEGRITY AUDIT

## 1. Executive Summary
An independent, deep static analysis of the ShiftSync backend was conducted focusing on state transitions, business rule integrity, and cross-service consistency. The audit traced actual implementation paths without relying on tests or documentation. 
The audit discovered **4 high-to-critical business logic vulnerabilities**, primarily stemming from missing temporal bounds on state transitions (past vs. future events) and insufficient cross-boundary data validation between Attendance, Leave, and Payroll.

## 2. Findings

### FINDING 1: Retrospective Leave Cancellation Time-Theft
- **Finding ID:** BUS-LEAVE-01
- **Domain:** LEAVE
- **Severity:** **CRITICAL**
- **Location:** `LeaveRequestService.java` -> `cancelLeaveRequest()`
- **Current Behavior:** An employee can cancel their own `APPROVED` leave request at any time. When cancelled, the system automatically calls `leaveBalanceService.reverseAnnualLeave` to refund the leave days. There is **no check** to verify if the leave date is in the future.
- **Expected Business Rule:** Approved leave requests that have already occurred in the past cannot be cancelled by the employee to reclaim balance.
- **Exploit/Trigger Scenario:** An employee takes a 3-day approved annual leave. The following month, they call `cancelLeaveRequest` on that past leave ID. The leave is deleted and they get 3 days refunded to their balance to use again.
- **Impact:** Infinite paid leave loops (Time Theft).
- **Inconsistent Persisted Data:** Yes, leave balance is incorrectly inflated while historical leave records are erased.
- **Recommended Fix:** Add `if (leaveRequest.getStartDate().isBefore(LocalDate.now())) throw ...` or restrict cancellation to `PENDING` only for employees, requiring Managers to reverse approved leaves.
- **Recommended Test Scenario:** Create an approved leave in the past, attempt to cancel as staff -> Expect 400 Bad Request.

### FINDING 2: Negative Payroll via Unvalidated Attendance Update
- **Finding ID:** BUS-ATT-PAY-01
- **Domain:** ATTENDANCE / PAYROLL
- **Severity:** **CRITICAL**
- **Location:** `AttendanceService.java` -> `updateAttendance()` and `PayrollCalculationService.java` -> `calculateForEmployee()`
- **Current Behavior:** `updateAttendance()` accepts arbitrary `checkInTime` and `checkOutTime` from a manager without validating chronological order. Later, `PayrollCalculationService` computes segment duration directly via `Duration.between(checkIn, checkOut).toMinutes() / 60.0` without bounding it to `0.0` (unlike the paid-leave offset which uses `Math.max(0, ...)`).
- **Expected Business Rule:** Check-out must occur strictly after check-in. Working hours cannot be negative.
- **Exploit/Trigger Scenario:** A manager makes a typo correcting a timesheet (e.g., Check-in 14:00, Check-out 10:00).
- **Impact:** The negative duration propagates to `totalAcc.addSegment`, subtracting hours from the employee's total, leading to negative payroll amounts and corrupted financial tracking.
- **Inconsistent Persisted Data:** Yes, negative salary records persisted in DB.
- **Recommended Fix:** 
  1. In `updateAttendance()`: Validate `checkOutTime.isAfter(checkInTime)`.
  2. In `PayrollCalculationService`: Wrap raw `Duration` math in `Math.max(0.0, ...)` for all worked hour aggregations.
- **Recommended Test Scenario:** Submit update request where Check-out < Check-in -> Expect 400 Bad Request.

### FINDING 3: Silent Hard-Deletion of Assigned Shifts
- **Finding ID:** BUS-SHIFT-01
- **Domain:** SHIFT
- **Severity:** **HIGH**
- **Location:** `ShiftService.java` -> `deleteShift()`
- **Current Behavior:** If a shift has assignments but no attendance records, deleting the shift silently drops all associated `ShiftAssignment` records via `shiftAssignmentRepository.deleteAll(assignments)` and deletes the shift. 
- **Expected Business Rule:** A published shift that has already been assigned (staff expect to work) should not be hard-deleted. It should either be transitioned to a `CANCELLED` state, or explicitly trigger cancellation notifications to the assigned staff.
- **Exploit/Trigger Scenario:** A manager deletes a shift a day before it starts to adjust the schedule.
- **Impact:** Assigned staff members silently lose their shifts without any event/notification being published (unlike `cancelLeaveRequest` or `approveLeaveRequest` which publish realtime events/notifications). Employees show up to work for deleted shifts.
- **Inconsistent Persisted Data:** No, but breaks operational integrity.
- **Recommended Fix:** Prevent hard deletion of shifts with assignments. Introduce a `CANCEL_SHIFT` workflow that updates the state to `CANCELLED` and notifies affected staff.
- **Recommended Test Scenario:** Attempt to delete a shift containing > 0 assignments -> Expect 400 Bad Request.

### FINDING 4: Post-Facto Shift Swap Approval
- **Finding ID:** BUS-SWAP-01
- **Domain:** SHIFT SWAP
- **Severity:** **MEDIUM**
- **Location:** `ShiftSwapService.java` -> `managerApproveSwapRequest()`
- **Current Behavior:** A manager can approve a swap as long as the shifts are `PUBLISHED` and neither staff has checked in (`!attendanceRepository.existsByShiftAssignmentId`). There is no check if the shift time has already passed.
- **Expected Business Rule:** Swaps cannot be approved after the shift has started or ended.
- **Exploit/Trigger Scenario:** Staff A and Staff B agree to a swap for Monday but manager doesn't review it. Both staff fail to show up on Monday (no check-in). On Tuesday, the manager approves the swap. The historical assignments for Monday are rewritten.
- **Impact:** Alters historical truth. If downstream systems depend on historical assignments (e.g., absence penalty processing), the state becomes convoluted.
- **Inconsistent Persisted Data:** Yes, assignments for past dates are modified.
- **Recommended Fix:** In `managerApproveSwapRequest`, validate that the shift start times are strictly in the future.
- **Recommended Test Scenario:** Manager attempts to approve a swap for a shift dated yesterday -> Expect 400 Bad Request.

## 3. Cross-Service Consistency Issues

1. **Leave vs Marketplace vs Assignments:** 
   When an approved leave is created (`approveLeaveRequest`), if it causes a shift to be unassigned, it fires an event `WORKFORCE_NEED_CREATED` and `SHIFT_UNASSIGNED`. However, when a leave is *cancelled* (`cancelLeaveRequest`), it does *not* automatically re-assign the employee to the shifts they originally lost, leaving them underutilized while the marketplace remains open.
   
2. **Payroll Double Payment Protection Inconsistency:**
   In `PayrollCalculationService`, the logic deducts `workedHours` from `schedHours` when processing paid leave overlaps. However, if a shift is `CANCELLED` or manually unassigned after the schedule is published, the shift assignment may no longer exist, meaning the employee gets full paid leave instead of getting paid for the shift. If they *were* assigned and checked in, they get paid for both (attendance + leave). The boundaries between "Scheduled Hours" and "Leave Hours" can double-count if attendance status isn't perfectly synchronized with leave status.

## 4. Transaction Boundary & Concurrency Issues

1. **Marketplace Race Condition (Mitigated):** `MarketplaceService.claimOpenShift` correctly utilizes Redisson locks (`shift_claim_lock:{shiftId}`) to prevent concurrent overallocation.
2. **Leave Balance Concurrency:** `LeaveRequestService.approveLeaveRequest` deducts leave balance atomically without distributed locks. While `@Transactional` covers the DB, concurrent approvals for the same staff could lead to negative balances if read-write race conditions occur during `LeaveBalanceService.deductAnnualLeave` (`getOrCreateBalance` reads, then writes).
