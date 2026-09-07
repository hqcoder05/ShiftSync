# ShiftSync API Documentation

This document lists all available API endpoints in the ShiftSync Backend. For detailed request payloads and response schemas, please refer to the Swagger UI (`http://localhost:8080/swagger-ui/index.html`) or the `openapi.json` file.

## Attendance API

| Method | Endpoint | Description |
|---|---|---|
| `PUT` | `/api/stores/{storeId}/attendance/{attendanceId}` |  |
| `DELETE` | `/api/stores/{storeId}/attendance/{attendanceId}` |  |
| `POST` | `/api/attendance/selfie` |  |
| `POST` | `/api/attendance/scan` |  |
| `GET` | `/api/stores/{storeId}/shifts/{shiftId}/attendance/qr` |  |
| `GET` | `/api/stores/{storeId}/attendance` |  |
| `GET` | `/api/attendance/me` |  |


## Attendance Adjustment

| Method | Endpoint | Description |
|---|---|---|
| `PUT` | `/api/stores/{storeId}/attendance-adjustments/{requestId}/reject` | Reject an adjustment request (Manager) |
| `PUT` | `/api/stores/{storeId}/attendance-adjustments/{requestId}/approve` | Approve an adjustment request (Manager) |
| `GET` | `/api/stores/{storeId}/attendance-adjustments` | Get list of adjustment requests (Manager) |
| `POST` | `/api/stores/{storeId}/attendance-adjustments` | Submit an attendance adjustment request (Staff) |
| `GET` | `/api/stores/{storeId}/attendance-adjustments/me` | Get my adjustment requests (Staff) |


## Authentication

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register a new user profile |
| `POST` | `/api/auth/refresh` | Refresh security token |
| `POST` | `/api/auth/logout` | Logout user |
| `POST` | `/api/auth/login` | User login |


## Availability Management

| Method | Endpoint | Description |
|---|---|---|
| `PUT` | `/api/availability/{id}` | Update an availability slot |
| `DELETE` | `/api/availability/{id}` | Delete an availability slot |
| `GET` | `/api/availability` | Get my availability |
| `POST` | `/api/availability` | Create an availability slot |
| `GET` | `/api/availability/users/{userId}` | Get staff availability by user ID (Manager/Admin) |


## Contract Type API

| Method | Endpoint | Description |
|---|---|---|
| `PUT` | `/api/stores/{storeId}/contract-types/{contractTypeId}` | Update an existing contract type |
| `DELETE` | `/api/stores/{storeId}/contract-types/{contractTypeId}` | Delete a contract type |
| `GET` | `/api/stores/{storeId}/contract-types` | Get all contract types for a store |
| `POST` | `/api/stores/{storeId}/contract-types` | Create a new contract type |


## Dashboard

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/stores/{storeId}/dashboard` | Get store dashboard metrics |
| `GET` | `/api/stores/{storeId}/dashboard/chart` | Get store dashboard chart data (time-series) |


## Employment Management

| Method | Endpoint | Description |
|---|---|---|
| `PUT` | `/api/stores/{storeId}/staff/{staffId}` | Update staff employment details |
| `DELETE` | `/api/stores/{storeId}/staff/{staffId}` | Remove staff from a store (Soft delete) |
| `GET` | `/api/stores/{storeId}/staff` | Get staff for a store |
| `POST` | `/api/stores/{storeId}/staff` | Assign staff to a store |
| `GET` | `/api/users/{staffId}/stores` | Get stores a staff belongs to |


## Marketplace

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/stores/{storeId}/marketplace/shifts/{shiftId}/unpublish` | Unpublish a shift from the Marketplace |
| `POST` | `/api/stores/{storeId}/marketplace/shifts/{shiftId}/publish` | Publish an understaffed shift to the Marketplace |
| `POST` | `/api/stores/{storeId}/marketplace/shifts/{shiftId}/claim` | Claim an Open Shift (Employee) |
| `GET` | `/api/stores/{storeId}/marketplace/shifts` | Get list of active Open Shifts in a store |


## Notification

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/users/me/notification-preferences` | Get notification preferences |
| `PUT` | `/api/users/me/notification-preferences` | Update a notification preference |
| `POST` | `/api/users/me/fcm-token` | Register FCM token for current user |
| `POST` | `/api/notifications/test` | Send a test notification to yourself |


## Payroll

| Method | Endpoint | Description |
|---|---|---|
| `PUT` | `/api/stores/{storeId}/payroll/{periodId}/status` | Update payroll period status |
| `POST` | `/api/stores/{storeId}/payroll/generate` | Generate payroll for a store |
| `GET` | `/api/users/me/payslips` | Get my payslips (STAFF) |
| `GET` | `/api/users/me/payslips/{payrollId}/pdf` | Download payslip as PDF (STAFF) |
| `GET` | `/api/stores/{storeId}/payroll` | Get all payroll periods for a store |
| `GET` | `/api/stores/{storeId}/payroll/{periodId}/payslips` | Get payslips for a specific payroll period |
| `GET` | `/api/stores/{storeId}/payroll/{periodId}/export/excel` | Download payroll report as Excel (MANAGER) |


## Requests

| Method | Endpoint | Description |
|---|---|---|
| `PUT` | `/api/requests/{id}/status` | Update request status (Approve or Reject) |
| `GET` | `/api/requests` | Get all staff requests with optional filters |
| `POST` | `/api/requests` | Create a new staff request |
| `GET` | `/api/requests/{id}` | Get request details by ID |


## Scheduler Configuration API

| Method | Endpoint | Description |
|---|---|---|
| `PUT` | `/api/stores/{storeId}/scheduler-config` | Update scheduler configuration weights |


## Shift API

| Method | Endpoint | Description |
|---|---|---|
| `PUT` | `/api/stores/{storeId}/shifts/{shiftId}` | Update an existing shift |
| `DELETE` | `/api/stores/{storeId}/shifts/{shiftId}` | Delete a shift |
| `PUT` | `/api/stores/{storeId}/shifts/{shiftId}/requirements` | Set or update requirements for a shift |
| `GET` | `/api/stores/{storeId}/shifts` | Get all shifts for a store |
| `POST` | `/api/stores/{storeId}/shifts` | Create a new shift |
| `POST` | `/api/stores/{storeId}/shifts/publish` | Publish shifts for a specific date range |
| `POST` | `/api/stores/{storeId}/shifts/auto-schedule` | Auto-schedule shifts for a specific date range |
| `GET` | `/api/stores/{storeId}/shifts/my` | Get my assigned shifts in this store |


## Shift Assignment API

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/stores/{storeId}/shifts/{shiftId}/assignments` | Get assignments for a shift |
| `POST` | `/api/stores/{storeId}/shifts/{shiftId}/assignments` | Assign a staff to a shift (Manager) |
| `DELETE` | `/api/stores/{storeId}/shifts/{shiftId}/assignments/{staffId}` | Remove a staff from a shift (Manager) |


## Shift Swap

| Method | Endpoint | Description |
|---|---|---|
| `PUT` | `/api/users/me/swaps/{requestId}/respond` | Respond to a swap request (accept/reject) |
| `GET` | `/api/users/me/swaps` | Get my swap requests (Staff) |
| `POST` | `/api/users/me/swaps` | Create a swap request |
| `POST` | `/api/swaps/{requestId}/reject` | Manager rejects swap request |
| `POST` | `/api/swaps/{requestId}/approve` | Manager approves swap request |
| `GET` | `/api/stores/{storeId}/swaps` | Get all swap requests in store (Manager) |


## Shift Template API

| Method | Endpoint | Description |
|---|---|---|
| `PUT` | `/api/stores/{storeId}/shift-templates/{templateId}` | Update an existing shift template |
| `DELETE` | `/api/stores/{storeId}/shift-templates/{templateId}` | Delete a shift template (Soft delete) |
| `GET` | `/api/stores/{storeId}/shift-templates` | Get all shift templates for a store |
| `POST` | `/api/stores/{storeId}/shift-templates` | Create a new shift template |


## Skill API

| Method | Endpoint | Description |
|---|---|---|
| `PUT` | `/api/stores/{storeId}/skills/{skillId}` | Update an existing skill |
| `DELETE` | `/api/stores/{storeId}/skills/{skillId}` | Delete a skill |
| `GET` | `/api/stores/{storeId}/skills` | Get all skills for a store |
| `POST` | `/api/stores/{storeId}/skills` | Create a new skill |


## Store Configuration

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/stores/{storeId}/configuration` | Get store configuration |
| `PUT` | `/api/stores/{storeId}/configuration` | Update store configuration |


## Store Management

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/stores` | Get list of all store branches |
| `POST` | `/api/stores` | Create a new store branch |
| `GET` | `/api/stores/{id}` | Get store details by ID |
| `DELETE` | `/api/stores/{id}` | Delete a store branch |
| `PATCH` | `/api/stores/{id}` | Update an existing store branch |


## User Management

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/users/{id}` | Get user details by ID |
| `PUT` | `/api/users/{id}` | Update an existing user profile |
| `DELETE` | `/api/users/{id}` | Delete a user profile |
| `GET` | `/api/users` | Get list of all users |
| `POST` | `/api/users` | Create a new user profile |
| `GET` | `/api/users/me` | Get the current user's profile |
| `GET` | `/api/users/me/shifts` | Get shifts assigned to the current user |


## holiday-controller

| Method | Endpoint | Description |
|---|---|---|
| `PUT` | `/api/holidays/{id}` |  |
| `DELETE` | `/api/holidays/{id}` |  |
| `GET` | `/api/holidays` |  |
| `POST` | `/api/holidays` |  |


## leave-request-controller

| Method | Endpoint | Description |
|---|---|---|
| `PUT` | `/api/stores/{storeId}/leave-requests/{id}/reject` |  |
| `PUT` | `/api/stores/{storeId}/leave-requests/{id}/approve` |  |
| `GET` | `/api/stores/{storeId}/leave-requests` |  |
| `POST` | `/api/stores/{storeId}/leave-requests` |  |
| `GET` | `/api/stores/{storeId}/leave-requests/my` |  |
| `DELETE` | `/api/stores/{storeId}/leave-requests/{id}` |  |


## workforce-proposal-controller

| Method | Endpoint | Description |
|---|---|---|
| `PUT` | `/api/users/me/workforce-proposals/{id}/respond` |  |
| `GET` | `/api/users/me/workforce-proposals` |  |


## workforce-request-controller

| Method | Endpoint | Description |
|---|---|---|
| `PUT` | `/api/stores/{storeId}/workforce-requests/{id}/reject` |  |
| `PUT` | `/api/stores/{storeId}/workforce-requests/{id}/cancel` |  |
| `POST` | `/api/stores/{storeId}/workforce-requests` |  |
| `POST` | `/api/stores/{storeId}/workforce-requests/{id}/proposals` |  |
| `GET` | `/api/stores/{storeId}/workforce-requests/outgoing` |  |
| `GET` | `/api/stores/{storeId}/workforce-requests/incoming` |  |

