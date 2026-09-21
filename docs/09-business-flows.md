# Business Flows

## Login

`LoginPage`/`LoginScreen` -> `authService` -> `POST /api/auth/login` -> JWT -> client storage -> authenticated navigation.

## Schedule and assignment

Manager creates/list shifts through `ShiftController`; requirements and templates are separate resources. Manual assignment uses `ShiftAssignmentController`; auto scheduling uses `ShiftController` -> `AutoScheduleService`. Staff schedule uses `GET /api/users/me/shifts`. Marketplace claim uses marketplace shift id, not workforce proposal id.

## Availability and leave

Availability screens call `/api/availability`; leave screens call store-scoped leave request routes and balance/type routes. Backend checks overlap/leave state before assignment.

## Workforce

Store manager creates workforce request -> eligible staff/proposals -> recipient reads `/api/users/me/workforce-proposals` -> responds -> service updates proposal/request state. Request and proposal identifiers are distinct.

## Attendance

Staff obtains QR/uses scan or selfie endpoint; `AttendanceService` persists attendance. Manager reads store attendance and handles adjustment requests.

## Payroll

Manager generates/list payroll by store/period. Staff reads `/api/users/me/payslips`; mobile displays payslip data or an empty state, never a locally estimated salary.

## Notifications

Client registers FCM token and reads preferences/notifications; backend supports unread count, read/read-all and SSE stream.
