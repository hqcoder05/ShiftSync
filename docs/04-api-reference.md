# API Reference (controller-derived)

Authentication mặc định là Bearer JWT, trừ endpoint auth/public và các test endpoint. Role/store restriction do `SecurityConfig`, controller và service phối hợp.

## Auth and user

| Method | Path | Controller |
|---|---|---|
| POST | `/api/auth/register` | AuthController |
| POST | `/api/auth/login` | AuthController |
| POST | `/api/auth/refresh` | AuthController |
| POST | `/api/auth/logout` | AuthController |
| GET/POST | `/api/users`, `/api/users/{id}` | UserController |
| GET/PUT | `/api/users/me` | UserController |
| PUT | `/api/users/me/avatar` | UserController |
| GET | `/api/users/me/shifts` | UserController |

## Store, employment and skills

`StoreController`: `/api/stores` GET/POST, `/directory`, `/{id}` GET/PATCH/DELETE. `EmploymentController`: staff create/update/delete/list under `/api/stores/{storeId}/staff`, and `/api/users/{staffId}/stores`. `ContractTypeController` manages `/api/stores/{storeId}/contract-types`. `SkillController` manages `/api/stores/{storeId}/skills`; `SkillQueryController` exposes `/api/skills` and `/api/users/{userId}/skills` GET/PUT.

## Availability and leave

`AvailabilityController`: `/api/availability` GET/POST, `/{id}` PUT/DELETE, `/users/{userId}`, `/stores/{storeId}`. `LeaveRequestController`: store-scoped types, balances, create/list/my/delete, approve/reject/reason/impact under `/api/stores/{storeId}/leave-requests`.

## Shifts and scheduling

`ShiftController` exposes store shifts GET/POST, `/my`, demand-planning, publish, auto-schedule, update/delete and eligible-staff. `ShiftAssignmentController` exposes assignment POST/list/delete. `ShiftTemplateController` CRUDs templates. `ShiftSwapController` handles `/api/users/me/swaps`, response and manager approve/reject/cancel/list routes.

## Marketplace/workforce

`MarketplaceController`: publish/unpublish/list/claim under `/api/stores/{storeId}/marketplace/shifts`. `WorkforceRequestController`: create, incoming/outgoing, cancel/reject, proposals, eligible-staff. `WorkforceProposalController`: GET `/api/users/me/workforce-proposals`, PUT `/{id}/respond`.

## Attendance/payroll

Attendance QR/scan/selfie/me and store management are in `AttendanceController`; adjustment requests are in `AttendanceAdjustmentController`. `PayrollController` generates store payroll, lists store/payslips, exposes `/api/users/me/payslips`, PDF, Excel export and period status. `HolidayController` provides holiday CRUD.

## Notification/dashboard/layout/quota

Notification controller handles FCM token, preferences, notifications, unread count/read-all and SSE stream. Dashboard/config/template controllers serve store metrics/config/templates. `HeadcountQuotaController` serves branches, positions, quotas, weekly/summary, budget, auto-fill and apply-to-scheduler. `LayoutController` serves layout/zones/workstations and shift zone allocation.

## Exact route inventory by controller

The following inventory is taken from the mapping annotations in the current Java controllers. Payload/response fields remain defined by the referenced DTO and service method.

### Auth/User

```text
POST /api/auth/register
POST /api/auth/login
POST /api/auth/refresh
POST /api/auth/logout
POST /api/users
GET  /api/users
GET  /api/users/me
PUT  /api/users/me
PUT  /api/users/me/avatar
GET  /api/users/{id}
PUT  /api/users/{id}
DELETE /api/users/{id}
GET  /api/users/me/shifts
```

### Store/Employment/Skill

```text
POST/GET /api/stores
GET /api/stores/directory
GET/PATCH/DELETE /api/stores/{id}
POST/PUT/DELETE/GET /api/stores/{storeId}/staff[/{staffId}]
GET /api/users/{staffId}/stores
GET/POST/PUT/DELETE /api/stores/{storeId}/contract-types[/{contractTypeId}]
GET/POST/PUT/DELETE /api/stores/{storeId}/skills[/{skillId}]
GET /api/skills
GET/PUT /api/users/{userId}/skills
```

### Availability/Leave

```text
GET/POST /api/availability
PUT/DELETE /api/availability/{id}
GET /api/availability/users/{userId}
GET /api/availability/stores/{storeId}
GET /api/stores/{storeId}/leave-requests/types
GET /api/stores/{storeId}/leave-requests/leave-types
GET /api/stores/{storeId}/leave-requests/balances/my
GET /api/stores/{storeId}/leave-requests/leave-balances/my
GET /api/stores/{storeId}/leave-requests/balances
GET /api/stores/{storeId}/leave-requests/leave-balances
POST/GET /api/stores/{storeId}/leave-requests
GET /api/stores/{storeId}/leave-requests/my
DELETE /api/stores/{storeId}/leave-requests/{id}
PUT /api/stores/{storeId}/leave-requests/{id}/approve
PUT /api/stores/{storeId}/leave-requests/{id}/reject
PUT /api/stores/{storeId}/leave-requests/{id}/reason
GET /api/stores/{storeId}/leave-requests/{id}/impact
```

### Shifts/Assignments/Swaps

```text
GET/POST /api/stores/{storeId}/shifts
GET /api/stores/{storeId}/shifts/my
POST /api/stores/{storeId}/shifts/demand-planning
POST /api/stores/{storeId}/shifts/publish
POST /api/stores/{storeId}/shifts/auto-schedule
PUT/DELETE /api/stores/{storeId}/shifts/{shiftId}
GET /api/stores/{storeId}/shifts/{shiftId}/eligible-staff
POST/GET /api/stores/{storeId}/shifts/{shiftId}/assignments
DELETE /api/stores/{storeId}/shifts/{shiftId}/assignments/{staffId}
GET/POST/PUT/DELETE /api/stores/{storeId}/shift-templates[/{templateId}]
POST /api/users/me/swaps
PUT /api/users/me/swaps/{requestId}/respond
POST /api/swaps/{requestId}/approve|reject|cancel
GET /api/users/me/swaps
GET /api/stores/{storeId}/swaps
```

### Marketplace/Workforce

```text
POST /api/stores/{storeId}/marketplace/shifts/{shiftId}/publish
POST /api/stores/{storeId}/marketplace/shifts/{shiftId}/unpublish
GET  /api/stores/{storeId}/marketplace/shifts
POST /api/stores/{storeId}/marketplace/shifts/{shiftId}/claim
POST /api/stores/{storeId}/workforce-requests
GET  /api/stores/{storeId}/workforce-requests/incoming
GET  /api/stores/{storeId}/workforce-requests/outgoing
PUT  /api/stores/{storeId}/workforce-requests/{id}/cancel|reject
POST /api/stores/{storeId}/workforce-requests/{id}/proposals
GET  /api/stores/{storeId}/workforce-requests/{id}/eligible-staff
GET  /api/users/me/workforce-proposals
PUT  /api/users/me/workforce-proposals/{id}/respond
```

### Attendance/Payroll

```text
GET  /api/stores/{storeId}/shifts/{shiftId}/attendance/qr
POST /api/attendance/scan
POST /api/attendance/selfie (multipart/form-data)
GET  /api/attendance/me
GET/PUT/DELETE /api/stores/{storeId}/attendance[/{attendanceId}]
POST/GET /api/stores/{storeId}/attendance-adjustments[/{requestId}]
PUT /api/stores/{storeId}/attendance-adjustments/{requestId}/approve|reject
POST /api/stores/{storeId}/payroll/generate
GET  /api/stores/{storeId}/payroll
GET  /api/stores/{storeId}/payroll/{periodId}/payslips
GET  /api/users/me/payslips
GET  /api/users/me/payslips/{payrollId}/pdf
GET  /api/stores/{storeId}/payroll/{periodId}/export/excel
PUT  /api/stores/{storeId}/payroll/{periodId}/status
GET/POST/PUT/DELETE /api/holidays[/{id}]
```

### Notification/Store configuration/Layout/Quota

```text
POST /api/users/me/fcm-token
POST /api/notifications/test
GET/PUT /api/users/me/notification-preferences
GET /api/users/me/notifications
GET /api/users/me/notifications/unread-count
PUT /api/users/me/notifications/{id}/read
PUT /api/users/me/notifications/read-all
GET /api/users/me/notifications/stream (text/event-stream)
GET /api/stores/{storeId}/dashboard
GET /api/stores/{storeId}/dashboard/chart
GET/PUT /api/stores/{storeId}/scheduler-config
GET/PUT /api/stores/{storeId}/configuration
GET /api/store-templates
GET /api/store-templates/{templateId}
POST /api/stores/{storeId}/apply-template/{templateId}
GET /api/branches
GET /api/positions
GET /api/headcount-quotas
GET /api/headcount-quotas/weekly
PUT /api/headcount-quotas/{quotaId}
PUT /api/headcount-quotas/budget
POST /api/headcount-quotas/auto-fill
POST /api/headcount-quotas/apply-to-scheduler
GET /api/headcount-quotas/summary
POST/GET /api/stores/{storeId}/layout
POST/GET /api/stores/{storeId}/zones
PUT/DELETE /api/stores/{storeId}/zones/{zoneId}
GET/POST /api/stores/{storeId}/workstations
PUT/DELETE /api/stores/{storeId}/workstations/{workstationId}
POST /api/stores/{storeId}/shifts/{shiftId}/allocate-zones
```

## Error contract

Validation and domain failures are normalized by `GlobalExceptionHandler`; clients must distinguish 400 validation, 401 authentication, 403 authorization/store isolation, 404 missing resource, 409 state/conflict and 5xx infrastructure errors.
