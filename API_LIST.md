# 📖 Tài liệu API ShiftSync (Toàn tập)

> Tự động sinh từ cấu trúc Swagger OpenAPI của dự án. Bao gồm tất cả các endpoint của hệ thống Backend.

---

## 📑 Mục lục
- [User Management](#-nhóm-user-management)
- [workforce-proposal-controller](#-nhóm-workforce-proposal-controller)
- [Shift Swap](#-nhóm-shift-swap)
- [Notification](#-nhóm-notification)
- [workforce-request-controller](#-nhóm-workforce-request-controller)
- [Employment Management](#-nhóm-employment-management)
- [Skill API](#-nhóm-skill-api)
- [Shift API](#-nhóm-shift-api)
- [Shift Template API](#-nhóm-shift-template-api)
- [Scheduler Configuration API](#-nhóm-scheduler-configuration-api)
- [Payroll](#-nhóm-payroll)
- [leave-request-controller](#-nhóm-leave-request-controller)
- [Contract Type API](#-nhóm-contract-type-api)
- [Store Configuration](#-nhóm-store-configuration)
- [Attendance API](#-nhóm-attendance-api)
- [Attendance Adjustment](#-nhóm-attendance-adjustment)
- [Requests](#-nhóm-requests)
- [holiday-controller](#-nhóm-holiday-controller)
- [Availability Management](#-nhóm-availability-management)
- [Store Management](#-nhóm-store-management)
- [Shift Assignment API](#-nhóm-shift-assignment-api)
- [Marketplace](#-nhóm-marketplace)
- [Authentication](#-nhóm-authentication)
- [Dashboard](#-nhóm-dashboard)

---

## 🏷️ Nhóm: User Management

### `GET` /api/users/{id}
**Mô tả:** Get user details by ID

**Tham số (Parameters):**
- `id` (path) - Bắt buộc: 

**Phản hồi (Responses):**
- `401`: Unauthorized request
- `200`: User found and details retrieved
- `403`: Access forbidden
- `404`: User not found

---

### `PUT` /api/users/{id}
**Mô tả:** Update an existing user profile

**Tham số (Parameters):**
- `id` (path) - Bắt buộc: 

**Phản hồi (Responses):**
- `400`: Invalid payload or validation failed
- `401`: Unauthorized request
- `200`: User profile successfully updated
- `403`: Access forbidden
- `404`: User not found

---

### `DELETE` /api/users/{id}
**Mô tả:** Delete a user profile

**Tham số (Parameters):**
- `id` (path) - Bắt buộc: 

**Phản hồi (Responses):**
- `204`: User successfully deleted
- `401`: Unauthorized request
- `403`: Access forbidden
- `404`: User not found

---

### `GET` /api/users
**Mô tả:** Get list of all users

**Tham số (Parameters):**
- `search` (query) - Tuỳ chọn: 
- `pageable` (query) - Bắt buộc: 

**Phản hồi (Responses):**
- `401`: Unauthorized request
- `200`: Successfully retrieved users page
- `403`: Access forbidden

---

### `POST` /api/users
**Mô tả:** Create a new user profile

**Phản hồi (Responses):**
- `201`: User successfully created
- `400`: Invalid request payload or validation failed
- `409`: Email already exists in the system

---

### `GET` /api/users/me
**Mô tả:** Get the current user's profile

**Phản hồi (Responses):**
- `200`: OK

---

### `GET` /api/users/me/shifts
**Mô tả:** Get shifts assigned to the current user

**Phản hồi (Responses):**
- `200`: OK

---

## 🏷️ Nhóm: workforce-proposal-controller

### `PUT` /api/users/me/workforce-proposals/{id}/respond
**Mô tả:** Không có mô tả

**Tham số (Parameters):**
- `id` (path) - Bắt buộc: 

**Phản hồi (Responses):**
- `200`: OK

---

### `GET` /api/users/me/workforce-proposals
**Mô tả:** Không có mô tả

**Phản hồi (Responses):**
- `200`: OK

---

## 🏷️ Nhóm: Shift Swap

### `PUT` /api/users/me/swaps/{requestId}/respond
**Mô tả:** Respond to a swap request (accept/reject)

**Tham số (Parameters):**
- `requestId` (path) - Bắt buộc: 

**Phản hồi (Responses):**
- `200`: OK

---

### `GET` /api/users/me/swaps
**Mô tả:** Get my swap requests (Staff)

**Phản hồi (Responses):**
- `200`: OK

---

### `POST` /api/users/me/swaps
**Mô tả:** Create a swap request

**Phản hồi (Responses):**
- `200`: OK

---

### `POST` /api/swaps/{requestId}/reject
**Mô tả:** Manager rejects swap request

**Tham số (Parameters):**
- `requestId` (path) - Bắt buộc: 

**Phản hồi (Responses):**
- `200`: OK

---

### `POST` /api/swaps/{requestId}/approve
**Mô tả:** Manager approves swap request

**Tham số (Parameters):**
- `requestId` (path) - Bắt buộc: 

**Phản hồi (Responses):**
- `200`: OK

---

### `GET` /api/stores/{storeId}/swaps
**Mô tả:** Get all swap requests in store (Manager)

**Tham số (Parameters):**
- `storeId` (path) - Bắt buộc: 
- `status` (query) - Tuỳ chọn: 

**Phản hồi (Responses):**
- `200`: OK

---

## 🏷️ Nhóm: Notification

### `GET` /api/users/me/notification-preferences
**Mô tả:** Get notification preferences

**Phản hồi (Responses):**
- `200`: OK

---

### `PUT` /api/users/me/notification-preferences
**Mô tả:** Update a notification preference

**Phản hồi (Responses):**
- `200`: OK

---

### `POST` /api/users/me/fcm-token
**Mô tả:** Register FCM token for current user

**Phản hồi (Responses):**
- `200`: OK

---

### `POST` /api/notifications/test
**Mô tả:** Send a test notification to yourself

**Phản hồi (Responses):**
- `200`: OK

---

## 🏷️ Nhóm: workforce-request-controller

### `PUT` /api/stores/{storeId}/workforce-requests/{id}/reject
**Mô tả:** Không có mô tả

**Tham số (Parameters):**
- `storeId` (path) - Bắt buộc: 
- `id` (path) - Bắt buộc: 

**Phản hồi (Responses):**
- `200`: OK

---

### `PUT` /api/stores/{storeId}/workforce-requests/{id}/cancel
**Mô tả:** Không có mô tả

**Tham số (Parameters):**
- `storeId` (path) - Bắt buộc: 
- `id` (path) - Bắt buộc: 

**Phản hồi (Responses):**
- `200`: OK

---

### `POST` /api/stores/{storeId}/workforce-requests
**Mô tả:** Không có mô tả

**Tham số (Parameters):**
- `storeId` (path) - Bắt buộc: 

**Phản hồi (Responses):**
- `200`: OK

---

### `POST` /api/stores/{storeId}/workforce-requests/{id}/proposals
**Mô tả:** Không có mô tả

**Tham số (Parameters):**
- `storeId` (path) - Bắt buộc: 
- `id` (path) - Bắt buộc: 

**Phản hồi (Responses):**
- `200`: OK

---

### `GET` /api/stores/{storeId}/workforce-requests/outgoing
**Mô tả:** Không có mô tả

**Tham số (Parameters):**
- `storeId` (path) - Bắt buộc: 

**Phản hồi (Responses):**
- `200`: OK

---

### `GET` /api/stores/{storeId}/workforce-requests/incoming
**Mô tả:** Không có mô tả

**Tham số (Parameters):**
- `storeId` (path) - Bắt buộc: 

**Phản hồi (Responses):**
- `200`: OK

---

## 🏷️ Nhóm: Employment Management

### `PUT` /api/stores/{storeId}/staff/{staffId}
**Mô tả:** Update staff employment details

**Tham số (Parameters):**
- `storeId` (path) - Bắt buộc: 
- `staffId` (path) - Bắt buộc: 

**Phản hồi (Responses):**
- `200`: OK

---

### `DELETE` /api/stores/{storeId}/staff/{staffId}
**Mô tả:** Remove staff from a store (Soft delete)

**Tham số (Parameters):**
- `storeId` (path) - Bắt buộc: 
- `staffId` (path) - Bắt buộc: 

**Phản hồi (Responses):**
- `200`: OK

---

### `GET` /api/stores/{storeId}/staff
**Mô tả:** Get staff for a store

**Tham số (Parameters):**
- `storeId` (path) - Bắt buộc: 
- `pageable` (query) - Bắt buộc: 

**Phản hồi (Responses):**
- `200`: OK

---

### `POST` /api/stores/{storeId}/staff
**Mô tả:** Assign staff to a store

**Tham số (Parameters):**
- `storeId` (path) - Bắt buộc: 

**Phản hồi (Responses):**
- `200`: OK

---

### `GET` /api/users/{staffId}/stores
**Mô tả:** Get stores a staff belongs to

**Tham số (Parameters):**
- `staffId` (path) - Bắt buộc: 

**Phản hồi (Responses):**
- `200`: OK

---

## 🏷️ Nhóm: Skill API

### `PUT` /api/stores/{storeId}/skills/{skillId}
**Mô tả:** Update an existing skill

**Tham số (Parameters):**
- `storeId` (path) - Bắt buộc: 
- `skillId` (path) - Bắt buộc: 

**Phản hồi (Responses):**
- `200`: OK

---

### `DELETE` /api/stores/{storeId}/skills/{skillId}
**Mô tả:** Delete a skill

**Tham số (Parameters):**
- `storeId` (path) - Bắt buộc: 
- `skillId` (path) - Bắt buộc: 

**Phản hồi (Responses):**
- `200`: OK

---

### `GET` /api/stores/{storeId}/skills
**Mô tả:** Get all skills for a store

**Tham số (Parameters):**
- `storeId` (path) - Bắt buộc: 

**Phản hồi (Responses):**
- `200`: OK

---

### `POST` /api/stores/{storeId}/skills
**Mô tả:** Create a new skill

**Tham số (Parameters):**
- `storeId` (path) - Bắt buộc: 

**Phản hồi (Responses):**
- `200`: OK

---

## 🏷️ Nhóm: Shift API

### `PUT` /api/stores/{storeId}/shifts/{shiftId}
**Mô tả:** Update an existing shift

**Tham số (Parameters):**
- `storeId` (path) - Bắt buộc: 
- `shiftId` (path) - Bắt buộc: 

**Phản hồi (Responses):**
- `200`: OK

---

### `DELETE` /api/stores/{storeId}/shifts/{shiftId}
**Mô tả:** Delete a shift

**Tham số (Parameters):**
- `storeId` (path) - Bắt buộc: 
- `shiftId` (path) - Bắt buộc: 

**Phản hồi (Responses):**
- `200`: OK

---

### `PUT` /api/stores/{storeId}/shifts/{shiftId}/requirements
**Mô tả:** Set or update requirements for a shift

**Tham số (Parameters):**
- `storeId` (path) - Bắt buộc: 
- `shiftId` (path) - Bắt buộc: 

**Phản hồi (Responses):**
- `200`: OK

---

### `GET` /api/stores/{storeId}/shifts
**Mô tả:** Get all shifts for a store

**Tham số (Parameters):**
- `storeId` (path) - Bắt buộc: 
- `status` (query) - Tuỳ chọn: 

**Phản hồi (Responses):**
- `200`: OK

---

### `POST` /api/stores/{storeId}/shifts
**Mô tả:** Create a new shift

**Tham số (Parameters):**
- `storeId` (path) - Bắt buộc: 

**Phản hồi (Responses):**
- `200`: OK

---

### `POST` /api/stores/{storeId}/shifts/publish
**Mô tả:** Publish shifts for a specific date range

**Tham số (Parameters):**
- `storeId` (path) - Bắt buộc: 

**Phản hồi (Responses):**
- `200`: OK

---

### `POST` /api/stores/{storeId}/shifts/auto-schedule
**Mô tả:** Auto-schedule shifts for a specific date range

**Tham số (Parameters):**
- `storeId` (path) - Bắt buộc: 

**Phản hồi (Responses):**
- `200`: OK

---

### `GET` /api/stores/{storeId}/shifts/my
**Mô tả:** Get my assigned shifts in this store

**Tham số (Parameters):**
- `storeId` (path) - Bắt buộc: 

**Phản hồi (Responses):**
- `200`: OK

---

## 🏷️ Nhóm: Shift Template API

### `PUT` /api/stores/{storeId}/shift-templates/{templateId}
**Mô tả:** Update an existing shift template

**Tham số (Parameters):**
- `storeId` (path) - Bắt buộc: 
- `templateId` (path) - Bắt buộc: 

**Phản hồi (Responses):**
- `200`: OK

---

### `DELETE` /api/stores/{storeId}/shift-templates/{templateId}
**Mô tả:** Delete a shift template (Soft delete)

**Tham số (Parameters):**
- `storeId` (path) - Bắt buộc: 
- `templateId` (path) - Bắt buộc: 

**Phản hồi (Responses):**
- `200`: OK

---

### `GET` /api/stores/{storeId}/shift-templates
**Mô tả:** Get all shift templates for a store

**Tham số (Parameters):**
- `storeId` (path) - Bắt buộc: 

**Phản hồi (Responses):**
- `200`: OK

---

### `POST` /api/stores/{storeId}/shift-templates
**Mô tả:** Create a new shift template

**Tham số (Parameters):**
- `storeId` (path) - Bắt buộc: 

**Phản hồi (Responses):**
- `200`: OK

---

## 🏷️ Nhóm: Scheduler Configuration API

### `PUT` /api/stores/{storeId}/scheduler-config
**Mô tả:** Update scheduler configuration weights

**Tham số (Parameters):**
- `storeId` (path) - Bắt buộc: 

**Phản hồi (Responses):**
- `200`: OK

---

## 🏷️ Nhóm: Payroll

### `PUT` /api/stores/{storeId}/payroll/{periodId}/status
**Mô tả:** Update payroll period status

**Tham số (Parameters):**
- `storeId` (path) - Bắt buộc: 
- `periodId` (path) - Bắt buộc: 

**Phản hồi (Responses):**
- `200`: OK

---

### `POST` /api/stores/{storeId}/payroll/generate
**Mô tả:** Generate payroll for a store

**Tham số (Parameters):**
- `storeId` (path) - Bắt buộc: 

**Phản hồi (Responses):**
- `200`: OK

---

### `GET` /api/users/me/payslips
**Mô tả:** Get my payslips (STAFF)

**Phản hồi (Responses):**
- `200`: OK

---

### `GET` /api/users/me/payslips/{payrollId}/pdf
**Mô tả:** Download payslip as PDF (STAFF)

**Tham số (Parameters):**
- `payrollId` (path) - Bắt buộc: 

**Phản hồi (Responses):**
- `200`: OK

---

### `GET` /api/stores/{storeId}/payroll
**Mô tả:** Get all payroll periods for a store

**Tham số (Parameters):**
- `storeId` (path) - Bắt buộc: 

**Phản hồi (Responses):**
- `200`: OK

---

### `GET` /api/stores/{storeId}/payroll/{periodId}/payslips
**Mô tả:** Get payslips for a specific payroll period

**Tham số (Parameters):**
- `storeId` (path) - Bắt buộc: 
- `periodId` (path) - Bắt buộc: 

**Phản hồi (Responses):**
- `200`: OK

---

### `GET` /api/stores/{storeId}/payroll/{periodId}/export/excel
**Mô tả:** Download payroll report as Excel (MANAGER)

**Tham số (Parameters):**
- `storeId` (path) - Bắt buộc: 
- `periodId` (path) - Bắt buộc: 

**Phản hồi (Responses):**
- `200`: OK

---

## 🏷️ Nhóm: leave-request-controller

### `PUT` /api/stores/{storeId}/leave-requests/{id}/reject
**Mô tả:** Không có mô tả

**Tham số (Parameters):**
- `storeId` (path) - Bắt buộc: 
- `id` (path) - Bắt buộc: 

**Phản hồi (Responses):**
- `200`: OK

---

### `PUT` /api/stores/{storeId}/leave-requests/{id}/approve
**Mô tả:** Không có mô tả

**Tham số (Parameters):**
- `storeId` (path) - Bắt buộc: 
- `id` (path) - Bắt buộc: 

**Phản hồi (Responses):**
- `200`: OK

---

### `GET` /api/stores/{storeId}/leave-requests
**Mô tả:** Không có mô tả

**Tham số (Parameters):**
- `storeId` (path) - Bắt buộc: 
- `status` (query) - Tuỳ chọn: 

**Phản hồi (Responses):**
- `200`: OK

---

### `POST` /api/stores/{storeId}/leave-requests
**Mô tả:** Không có mô tả

**Tham số (Parameters):**
- `storeId` (path) - Bắt buộc: 

**Phản hồi (Responses):**
- `200`: OK

---

### `GET` /api/stores/{storeId}/leave-requests/my
**Mô tả:** Không có mô tả

**Phản hồi (Responses):**
- `200`: OK

---

### `DELETE` /api/stores/{storeId}/leave-requests/{id}
**Mô tả:** Không có mô tả

**Tham số (Parameters):**
- `storeId` (path) - Bắt buộc: 
- `id` (path) - Bắt buộc: 

**Phản hồi (Responses):**
- `200`: OK

---

## 🏷️ Nhóm: Contract Type API

### `PUT` /api/stores/{storeId}/contract-types/{contractTypeId}
**Mô tả:** Update an existing contract type

**Tham số (Parameters):**
- `storeId` (path) - Bắt buộc: 
- `contractTypeId` (path) - Bắt buộc: 

**Phản hồi (Responses):**
- `200`: OK

---

### `DELETE` /api/stores/{storeId}/contract-types/{contractTypeId}
**Mô tả:** Delete a contract type

**Tham số (Parameters):**
- `storeId` (path) - Bắt buộc: 
- `contractTypeId` (path) - Bắt buộc: 

**Phản hồi (Responses):**
- `200`: OK

---

### `GET` /api/stores/{storeId}/contract-types
**Mô tả:** Get all contract types for a store

**Tham số (Parameters):**
- `storeId` (path) - Bắt buộc: 

**Phản hồi (Responses):**
- `200`: OK

---

### `POST` /api/stores/{storeId}/contract-types
**Mô tả:** Create a new contract type

**Tham số (Parameters):**
- `storeId` (path) - Bắt buộc: 

**Phản hồi (Responses):**
- `200`: OK

---

## 🏷️ Nhóm: Store Configuration

### `GET` /api/stores/{storeId}/configuration
**Mô tả:** Get store configuration

**Tham số (Parameters):**
- `storeId` (path) - Bắt buộc: 

**Phản hồi (Responses):**
- `200`: OK

---

### `PUT` /api/stores/{storeId}/configuration
**Mô tả:** Update store configuration

**Tham số (Parameters):**
- `storeId` (path) - Bắt buộc: 

**Phản hồi (Responses):**
- `200`: OK

---

## 🏷️ Nhóm: Attendance API

### `PUT` /api/stores/{storeId}/attendance/{attendanceId}
**Mô tả:** Không có mô tả

**Tham số (Parameters):**
- `storeId` (path) - Bắt buộc: 
- `attendanceId` (path) - Bắt buộc: 

**Phản hồi (Responses):**
- `200`: OK

---

### `DELETE` /api/stores/{storeId}/attendance/{attendanceId}
**Mô tả:** Không có mô tả

**Tham số (Parameters):**
- `storeId` (path) - Bắt buộc: 
- `attendanceId` (path) - Bắt buộc: 

**Phản hồi (Responses):**
- `200`: OK

---

### `POST` /api/attendance/selfie
**Mô tả:** Không có mô tả

**Tham số (Parameters):**
- `shiftId` (query) - Bắt buộc: 
- `latitude` (query) - Bắt buộc: 
- `longitude` (query) - Bắt buộc: 

**Phản hồi (Responses):**
- `200`: OK

---

### `POST` /api/attendance/scan
**Mô tả:** Không có mô tả

**Phản hồi (Responses):**
- `200`: OK

---

### `GET` /api/stores/{storeId}/shifts/{shiftId}/attendance/qr
**Mô tả:** Không có mô tả

**Tham số (Parameters):**
- `storeId` (path) - Bắt buộc: 
- `shiftId` (path) - Bắt buộc: 

**Phản hồi (Responses):**
- `200`: OK

---

### `GET` /api/stores/{storeId}/attendance
**Mô tả:** Không có mô tả

**Tham số (Parameters):**
- `storeId` (path) - Bắt buộc: 
- `from` (query) - Tuỳ chọn: 
- `to` (query) - Tuỳ chọn: 

**Phản hồi (Responses):**
- `200`: OK

---

### `GET` /api/attendance/me
**Mô tả:** Không có mô tả

**Phản hồi (Responses):**
- `200`: OK

---

## 🏷️ Nhóm: Attendance Adjustment

### `PUT` /api/stores/{storeId}/attendance-adjustments/{requestId}/reject
**Mô tả:** Reject an adjustment request (Manager)

**Tham số (Parameters):**
- `storeId` (path) - Bắt buộc: 
- `requestId` (path) - Bắt buộc: 

**Phản hồi (Responses):**
- `200`: OK

---

### `PUT` /api/stores/{storeId}/attendance-adjustments/{requestId}/approve
**Mô tả:** Approve an adjustment request (Manager)

**Tham số (Parameters):**
- `storeId` (path) - Bắt buộc: 
- `requestId` (path) - Bắt buộc: 

**Phản hồi (Responses):**
- `200`: OK

---

### `GET` /api/stores/{storeId}/attendance-adjustments
**Mô tả:** Get list of adjustment requests (Manager)

**Tham số (Parameters):**
- `storeId` (path) - Bắt buộc: 
- `status` (query) - Tuỳ chọn: 

**Phản hồi (Responses):**
- `200`: OK

---

### `POST` /api/stores/{storeId}/attendance-adjustments
**Mô tả:** Submit an attendance adjustment request (Staff)

**Tham số (Parameters):**
- `storeId` (path) - Bắt buộc: 

**Phản hồi (Responses):**
- `200`: OK

---

### `GET` /api/stores/{storeId}/attendance-adjustments/me
**Mô tả:** Get my adjustment requests (Staff)

**Tham số (Parameters):**
- `storeId` (path) - Bắt buộc: 

**Phản hồi (Responses):**
- `200`: OK

---

## 🏷️ Nhóm: Requests

### `PUT` /api/requests/{id}/status
**Mô tả:** Update request status (Approve or Reject)

**Tham số (Parameters):**
- `id` (path) - Bắt buộc: 

**Phản hồi (Responses):**
- `200`: OK

---

### `GET` /api/requests
**Mô tả:** Get all staff requests with optional filters

**Tham số (Parameters):**
- `status` (query) - Tuỳ chọn: 
- `typeCategory` (query) - Tuỳ chọn: 
- `search` (query) - Tuỳ chọn: 

**Phản hồi (Responses):**
- `200`: OK

---

### `POST` /api/requests
**Mô tả:** Create a new staff request

**Phản hồi (Responses):**
- `200`: OK

---

### `GET` /api/requests/{id}
**Mô tả:** Get request details by ID

**Tham số (Parameters):**
- `id` (path) - Bắt buộc: 

**Phản hồi (Responses):**
- `200`: OK

---

## 🏷️ Nhóm: holiday-controller

### `PUT` /api/holidays/{id}
**Mô tả:** Không có mô tả

**Tham số (Parameters):**
- `id` (path) - Bắt buộc: 

**Phản hồi (Responses):**
- `200`: OK

---

### `DELETE` /api/holidays/{id}
**Mô tả:** Không có mô tả

**Tham số (Parameters):**
- `id` (path) - Bắt buộc: 

**Phản hồi (Responses):**
- `200`: OK

---

### `GET` /api/holidays
**Mô tả:** Không có mô tả

**Phản hồi (Responses):**
- `200`: OK

---

### `POST` /api/holidays
**Mô tả:** Không có mô tả

**Phản hồi (Responses):**
- `200`: OK

---

## 🏷️ Nhóm: Availability Management

### `PUT` /api/availability/{id}
**Mô tả:** Update an availability slot

**Tham số (Parameters):**
- `id` (path) - Bắt buộc: 

**Phản hồi (Responses):**
- `200`: Availability successfully updated
- `403`: Permission denied to modify this record
- `404`: Availability not found
- `409`: Time slot overlaps with existing availability

---

### `DELETE` /api/availability/{id}
**Mô tả:** Delete an availability slot

**Tham số (Parameters):**
- `id` (path) - Bắt buộc: 

**Phản hồi (Responses):**
- `204`: Availability successfully deleted
- `403`: Permission denied to delete this record
- `404`: Availability not found

---

### `GET` /api/availability
**Mô tả:** Get my availability

**Phản hồi (Responses):**
- `200`: List retrieved successfully

---

### `POST` /api/availability
**Mô tả:** Create an availability slot

**Phản hồi (Responses):**
- `400`: Invalid request payload or end time before start time
- `201`: Availability successfully created
- `409`: Time slot overlaps with existing availability

---

### `GET` /api/availability/users/{userId}
**Mô tả:** Get staff availability by user ID (Manager/Admin)

**Tham số (Parameters):**
- `userId` (path) - Bắt buộc: 

**Phản hồi (Responses):**
- `200`: List retrieved successfully

---

## 🏷️ Nhóm: Store Management

### `GET` /api/stores
**Mô tả:** Get list of all store branches

**Tham số (Parameters):**
- `search` (query) - Tuỳ chọn: 
- `pageable` (query) - Bắt buộc: 

**Phản hồi (Responses):**
- `401`: Unauthorized request
- `200`: Successfully retrieved stores list
- `403`: Access forbidden

---

### `POST` /api/stores
**Mô tả:** Create a new store branch

**Phản hồi (Responses):**
- `400`: Invalid request payload or validation failed
- `201`: Store successfully created

---

### `GET` /api/stores/{id}
**Mô tả:** Get store details by ID

**Tham số (Parameters):**
- `id` (path) - Bắt buộc: 

**Phản hồi (Responses):**
- `200`: Store found and details retrieved
- `401`: Unauthorized request
- `403`: Access forbidden
- `404`: Store not found

---

### `DELETE` /api/stores/{id}
**Mô tả:** Delete a store branch

**Tham số (Parameters):**
- `id` (path) - Bắt buộc: 

**Phản hồi (Responses):**
- `401`: Unauthorized request
- `204`: Store successfully deleted
- `403`: Access forbidden
- `404`: Store not found

---

### `PATCH` /api/stores/{id}
**Mô tả:** Update an existing store branch

**Tham số (Parameters):**
- `id` (path) - Bắt buộc: 

**Phản hồi (Responses):**
- `200`: Store successfully updated
- `400`: Invalid payload or validation failed
- `401`: Unauthorized request
- `403`: Access forbidden
- `404`: Store not found

---

## 🏷️ Nhóm: Shift Assignment API

### `GET` /api/stores/{storeId}/shifts/{shiftId}/assignments
**Mô tả:** Get assignments for a shift

**Tham số (Parameters):**
- `storeId` (path) - Bắt buộc: 
- `shiftId` (path) - Bắt buộc: 

**Phản hồi (Responses):**
- `200`: OK

---

### `POST` /api/stores/{storeId}/shifts/{shiftId}/assignments
**Mô tả:** Assign a staff to a shift (Manager)

**Tham số (Parameters):**
- `storeId` (path) - Bắt buộc: 
- `shiftId` (path) - Bắt buộc: 

**Phản hồi (Responses):**
- `200`: OK

---

### `DELETE` /api/stores/{storeId}/shifts/{shiftId}/assignments/{staffId}
**Mô tả:** Remove a staff from a shift (Manager)

**Tham số (Parameters):**
- `storeId` (path) - Bắt buộc: 
- `shiftId` (path) - Bắt buộc: 
- `staffId` (path) - Bắt buộc: 

**Phản hồi (Responses):**
- `200`: OK

---

## 🏷️ Nhóm: Marketplace

### `POST` /api/stores/{storeId}/marketplace/shifts/{shiftId}/unpublish
**Mô tả:** Unpublish a shift from the Marketplace

**Tham số (Parameters):**
- `storeId` (path) - Bắt buộc: 
- `shiftId` (path) - Bắt buộc: 

**Phản hồi (Responses):**
- `200`: OK

---

### `POST` /api/stores/{storeId}/marketplace/shifts/{shiftId}/publish
**Mô tả:** Publish an understaffed shift to the Marketplace

**Tham số (Parameters):**
- `storeId` (path) - Bắt buộc: 
- `shiftId` (path) - Bắt buộc: 

**Phản hồi (Responses):**
- `200`: OK

---

### `POST` /api/stores/{storeId}/marketplace/shifts/{shiftId}/claim
**Mô tả:** Claim an Open Shift (Employee)

**Tham số (Parameters):**
- `storeId` (path) - Bắt buộc: 
- `shiftId` (path) - Bắt buộc: 

**Phản hồi (Responses):**
- `200`: OK

---

### `GET` /api/stores/{storeId}/marketplace/shifts
**Mô tả:** Get list of active Open Shifts in a store

**Tham số (Parameters):**
- `storeId` (path) - Bắt buộc: 

**Phản hồi (Responses):**
- `200`: OK

---

## 🏷️ Nhóm: Authentication

### `POST` /api/auth/register
**Mô tả:** Register a new user profile

**Phản hồi (Responses):**
- `201`: User successfully registered
- `400`: Invalid request payload or validation failed
- `409`: Email already exists in the system

---

### `POST` /api/auth/refresh
**Mô tả:** Refresh security token

**Phản hồi (Responses):**
- `400`: Invalid request payload
- `401`: Invalid or expired refresh token
- `200`: Token successfully refreshed

---

### `POST` /api/auth/logout
**Mô tả:** Logout user

**Phản hồi (Responses):**
- `400`: Invalid request payload
- `204`: Successfully logged out

---

### `POST` /api/auth/login
**Mô tả:** User login

**Phản hồi (Responses):**
- `400`: Invalid request payload
- `200`: Successfully authenticated
- `401`: Invalid email or password

---

## 🏷️ Nhóm: Dashboard

### `GET` /api/stores/{storeId}/dashboard
**Mô tả:** Get store dashboard metrics

**Tham số (Parameters):**
- `storeId` (path) - Bắt buộc: 
- `startDate` (query) - Tuỳ chọn: 
- `endDate` (query) - Tuỳ chọn: 

**Phản hồi (Responses):**
- `200`: OK

---

### `GET` /api/stores/{storeId}/dashboard/chart
**Mô tả:** Get store dashboard chart data (time-series)

**Tham số (Parameters):**
- `storeId` (path) - Bắt buộc: 
- `startDate` (query) - Tuỳ chọn: 
- `endDate` (query) - Tuỳ chọn: 

**Phản hồi (Responses):**
- `200`: OK

---

