import api from './api';

export const API_GROUPS = [
  "User Management",
  "workforce-proposal-controller",
  "Shift Swap",
  "Notification",
  "workforce-request-controller",
  "Employment Management",
  "Skill API",
  "Shift API",
  "Shift Template API",
  "Scheduler Configuration API",
  "Payroll",
  "leave-request-controller",
  "Contract Type API",
  "Store Configuration",
  "Attendance API",
  "Attendance Adjustment",
  "Requests",
  "holiday-controller",
  "Availability Management",
  "Store Management",
  "Shift Assignment API",
  "Marketplace",
  "Authentication",
  "Dashboard"
];

export const ALL_APIS = [
  {
    id: 1,
    group: "User Management",
    method: "GET",
    path: "/api/users/{id}",
    description: "Get user details by ID",
    pathParams: ["id"],
    queryParams: [],
    defaultPayload: {}
  },
  {
    id: 2,
    group: "User Management",
    method: "PUT",
    path: "/api/users/{id}",
    description: "Update an existing user profile",
    pathParams: ["id"],
    queryParams: [],
    defaultPayload: {
  "fullName": "Trần Thị B Cập nhật",
  "email": "staff@shiftsync.com",
  "phone": "0912345678"
}
  },
  {
    id: 3,
    group: "User Management",
    method: "DELETE",
    path: "/api/users/{id}",
    description: "Delete a user profile",
    pathParams: ["id"],
    queryParams: [],
    defaultPayload: {}
  },
  {
    id: 4,
    group: "User Management",
    method: "GET",
    path: "/api/users",
    description: "Get list of all users",
    pathParams: [],
    queryParams: ["search","pageable"],
    defaultPayload: {}
  },
  {
    id: 5,
    group: "User Management",
    method: "POST",
    path: "/api/users",
    description: "Create a new user profile",
    pathParams: [],
    queryParams: [],
    defaultPayload: {
  "fullName": "Trần Thị B",
  "email": "staff@shiftsync.com",
  "password": "password123",
  "phone": "0912345678",
  "systemRole": "STAFF"
}
  },
  {
    id: 6,
    group: "User Management",
    method: "GET",
    path: "/api/users/me",
    description: "Get the current user's profile",
    pathParams: [],
    queryParams: [],
    defaultPayload: {}
  },
  {
    id: 7,
    group: "User Management",
    method: "GET",
    path: "/api/users/me/shifts",
    description: "Get shifts assigned to the current user",
    pathParams: [],
    queryParams: [],
    defaultPayload: {}
  },
  {
    id: 8,
    group: "workforce-proposal-controller",
    method: "PUT",
    path: "/api/users/me/workforce-proposals/{id}/respond",
    description: "Không có mô tả",
    pathParams: ["id"],
    queryParams: [],
    defaultPayload: {
  "accepted": true
}
  },
  {
    id: 9,
    group: "workforce-proposal-controller",
    method: "GET",
    path: "/api/users/me/workforce-proposals",
    description: "Không có mô tả",
    pathParams: [],
    queryParams: [],
    defaultPayload: {}
  },
  {
    id: 10,
    group: "Shift Swap",
    method: "PUT",
    path: "/api/users/me/swaps/{requestId}/respond",
    description: "Respond to a swap request (accept/reject)",
    pathParams: ["requestId"],
    queryParams: [],
    defaultPayload: {
  "accept": true
}
  },
  {
    id: 11,
    group: "Shift Swap",
    method: "GET",
    path: "/api/users/me/swaps",
    description: "Get my swap requests (Staff)",
    pathParams: [],
    queryParams: [],
    defaultPayload: {}
  },
  {
    id: 12,
    group: "Shift Swap",
    method: "POST",
    path: "/api/users/me/swaps",
    description: "Create a swap request",
    pathParams: [],
    queryParams: [],
    defaultPayload: {
  "fromShiftId": "",
  "toStaffId": "",
  "toShiftId": ""
}
  },
  {
    id: 13,
    group: "Shift Swap",
    method: "POST",
    path: "/api/swaps/{requestId}/reject",
    description: "Manager rejects swap request",
    pathParams: ["requestId"],
    queryParams: [],
    defaultPayload: {}
  },
  {
    id: 14,
    group: "Shift Swap",
    method: "POST",
    path: "/api/swaps/{requestId}/approve",
    description: "Manager approves swap request",
    pathParams: ["requestId"],
    queryParams: [],
    defaultPayload: {}
  },
  {
    id: 15,
    group: "Shift Swap",
    method: "GET",
    path: "/api/stores/{storeId}/swaps",
    description: "Get all swap requests in store (Manager)",
    pathParams: ["storeId"],
    queryParams: ["status"],
    defaultPayload: {}
  },
  {
    id: 16,
    group: "Notification",
    method: "GET",
    path: "/api/users/me/notification-preferences",
    description: "Get notification preferences",
    pathParams: [],
    queryParams: [],
    defaultPayload: {}
  },
  {
    id: 17,
    group: "Notification",
    method: "PUT",
    path: "/api/users/me/notification-preferences",
    description: "Update a notification preference",
    pathParams: [],
    queryParams: [],
    defaultPayload: {
  "emailNotifications": true,
  "pushNotifications": true,
  "shiftReminders": true
}
  },
  {
    id: 18,
    group: "Notification",
    method: "POST",
    path: "/api/users/me/fcm-token",
    description: "Register FCM token for current user",
    pathParams: [],
    queryParams: [],
    defaultPayload: {
  "token": "test-fcm-device-token"
}
  },
  {
    id: 19,
    group: "Notification",
    method: "POST",
    path: "/api/notifications/test",
    description: "Send a test notification to yourself",
    pathParams: [],
    queryParams: [],
    defaultPayload: {}
  },
  {
    id: 20,
    group: "workforce-request-controller",
    method: "PUT",
    path: "/api/stores/{storeId}/workforce-requests/{id}/reject",
    description: "Không có mô tả",
    pathParams: ["storeId","id"],
    queryParams: [],
    defaultPayload: {}
  },
  {
    id: 21,
    group: "workforce-request-controller",
    method: "PUT",
    path: "/api/stores/{storeId}/workforce-requests/{id}/cancel",
    description: "Không có mô tả",
    pathParams: ["storeId","id"],
    queryParams: [],
    defaultPayload: {}
  },
  {
    id: 22,
    group: "workforce-request-controller",
    method: "POST",
    path: "/api/stores/{storeId}/workforce-requests",
    description: "Không có mô tả",
    pathParams: ["storeId"],
    queryParams: [],
    defaultPayload: {
  "targetStoreId": "",
  "shiftId": "",
  "quantity": 2,
  "note": "Cần hỗ trợ giờ cao điểm"
}
  },
  {
    id: 23,
    group: "workforce-request-controller",
    method: "POST",
    path: "/api/stores/{storeId}/workforce-requests/{id}/proposals",
    description: "Không có mô tả",
    pathParams: ["storeId","id"],
    queryParams: [],
    defaultPayload: {
  "staffIds": []
}
  },
  {
    id: 24,
    group: "workforce-request-controller",
    method: "GET",
    path: "/api/stores/{storeId}/workforce-requests/outgoing",
    description: "Không có mô tả",
    pathParams: ["storeId"],
    queryParams: [],
    defaultPayload: {}
  },
  {
    id: 25,
    group: "workforce-request-controller",
    method: "GET",
    path: "/api/stores/{storeId}/workforce-requests/incoming",
    description: "Không có mô tả",
    pathParams: ["storeId"],
    queryParams: [],
    defaultPayload: {}
  },
  {
    id: 26,
    group: "Employment Management",
    method: "PUT",
    path: "/api/stores/{storeId}/staff/{staffId}",
    description: "Update staff employment details",
    pathParams: ["storeId","staffId"],
    queryParams: [],
    defaultPayload: {}
  },
  {
    id: 27,
    group: "Employment Management",
    method: "DELETE",
    path: "/api/stores/{storeId}/staff/{staffId}",
    description: "Remove staff from a store (Soft delete)",
    pathParams: ["storeId","staffId"],
    queryParams: [],
    defaultPayload: {}
  },
  {
    id: 28,
    group: "Employment Management",
    method: "GET",
    path: "/api/stores/{storeId}/staff",
    description: "Get staff for a store",
    pathParams: ["storeId"],
    queryParams: ["pageable"],
    defaultPayload: {}
  },
  {
    id: 29,
    group: "Employment Management",
    method: "POST",
    path: "/api/stores/{storeId}/staff",
    description: "Assign staff to a store",
    pathParams: ["storeId"],
    queryParams: [],
    defaultPayload: {}
  },
  {
    id: 30,
    group: "Employment Management",
    method: "GET",
    path: "/api/users/{staffId}/stores",
    description: "Get stores a staff belongs to",
    pathParams: ["staffId"],
    queryParams: [],
    defaultPayload: {}
  },
  {
    id: 31,
    group: "Skill API",
    method: "PUT",
    path: "/api/stores/{storeId}/skills/{skillId}",
    description: "Update an existing skill",
    pathParams: ["storeId","skillId"],
    queryParams: [],
    defaultPayload: {
  "name": "Pha chế Barista",
  "description": "Kỹ năng pha chế cà phê chuẩn"
}
  },
  {
    id: 32,
    group: "Skill API",
    method: "DELETE",
    path: "/api/stores/{storeId}/skills/{skillId}",
    description: "Delete a skill",
    pathParams: ["storeId","skillId"],
    queryParams: [],
    defaultPayload: {}
  },
  {
    id: 33,
    group: "Skill API",
    method: "GET",
    path: "/api/stores/{storeId}/skills",
    description: "Get all skills for a store",
    pathParams: ["storeId"],
    queryParams: [],
    defaultPayload: {}
  },
  {
    id: 34,
    group: "Skill API",
    method: "POST",
    path: "/api/stores/{storeId}/skills",
    description: "Create a new skill",
    pathParams: ["storeId"],
    queryParams: [],
    defaultPayload: {
  "name": "Pha chế Barista",
  "description": "Kỹ năng pha chế cà phê chuẩn"
}
  },
  {
    id: 35,
    group: "Shift API",
    method: "PUT",
    path: "/api/stores/{storeId}/shifts/{shiftId}",
    description: "Update an existing shift",
    pathParams: ["storeId","shiftId"],
    queryParams: [],
    defaultPayload: {}
  },
  {
    id: 36,
    group: "Shift API",
    method: "DELETE",
    path: "/api/stores/{storeId}/shifts/{shiftId}",
    description: "Delete a shift",
    pathParams: ["storeId","shiftId"],
    queryParams: [],
    defaultPayload: {}
  },
  {
    id: 37,
    group: "Shift API",
    method: "PUT",
    path: "/api/stores/{storeId}/shifts/{shiftId}/requirements",
    description: "Set or update requirements for a shift",
    pathParams: ["storeId","shiftId"],
    queryParams: [],
    defaultPayload: {}
  },
  {
    id: 38,
    group: "Shift API",
    method: "GET",
    path: "/api/stores/{storeId}/shifts",
    description: "Get all shifts for a store",
    pathParams: ["storeId"],
    queryParams: ["status"],
    defaultPayload: {}
  },
  {
    id: 39,
    group: "Shift API",
    method: "POST",
    path: "/api/stores/{storeId}/shifts",
    description: "Create a new shift",
    pathParams: ["storeId"],
    queryParams: [],
    defaultPayload: {
  "name": "Ca sáng",
  "date": "2026-09-10",
  "startTime": "08:00:00",
  "endTime": "16:00:00",
  "maxStaff": 4,
  "minStaff": 2
}
  },
  {
    id: 40,
    group: "Shift API",
    method: "POST",
    path: "/api/stores/{storeId}/shifts/publish",
    description: "Publish shifts for a specific date range",
    pathParams: ["storeId"],
    queryParams: [],
    defaultPayload: {
  "startDate": "2026-09-01",
  "endDate": "2026-09-07"
}
  },
  {
    id: 41,
    group: "Shift API",
    method: "POST",
    path: "/api/stores/{storeId}/shifts/auto-schedule",
    description: "Auto-schedule shifts for a specific date range",
    pathParams: ["storeId"],
    queryParams: [],
    defaultPayload: {
  "startDate": "2026-09-01",
  "endDate": "2026-09-07"
}
  },
  {
    id: 42,
    group: "Shift API",
    method: "GET",
    path: "/api/stores/{storeId}/shifts/my",
    description: "Get my assigned shifts in this store",
    pathParams: ["storeId"],
    queryParams: [],
    defaultPayload: {}
  },
  {
    id: 43,
    group: "Shift Template API",
    method: "PUT",
    path: "/api/stores/{storeId}/shift-templates/{templateId}",
    description: "Update an existing shift template",
    pathParams: ["storeId","templateId"],
    queryParams: [],
    defaultPayload: {}
  },
  {
    id: 44,
    group: "Shift Template API",
    method: "DELETE",
    path: "/api/stores/{storeId}/shift-templates/{templateId}",
    description: "Delete a shift template (Soft delete)",
    pathParams: ["storeId","templateId"],
    queryParams: [],
    defaultPayload: {}
  },
  {
    id: 45,
    group: "Shift Template API",
    method: "GET",
    path: "/api/stores/{storeId}/shift-templates",
    description: "Get all shift templates for a store",
    pathParams: ["storeId"],
    queryParams: [],
    defaultPayload: {}
  },
  {
    id: 46,
    group: "Shift Template API",
    method: "POST",
    path: "/api/stores/{storeId}/shift-templates",
    description: "Create a new shift template",
    pathParams: ["storeId"],
    queryParams: [],
    defaultPayload: {}
  },
  {
    id: 47,
    group: "Scheduler Configuration API",
    method: "PUT",
    path: "/api/stores/{storeId}/scheduler-config",
    description: "Update scheduler configuration weights",
    pathParams: ["storeId"],
    queryParams: [],
    defaultPayload: {
  "fairnessWeight": 0.5,
  "preferenceWeight": 0.5
}
  },
  {
    id: 48,
    group: "Payroll",
    method: "PUT",
    path: "/api/stores/{storeId}/payroll/{periodId}/status",
    description: "Update payroll period status",
    pathParams: ["storeId","periodId"],
    queryParams: [],
    defaultPayload: {
  "status": "APPROVED"
}
  },
  {
    id: 49,
    group: "Payroll",
    method: "POST",
    path: "/api/stores/{storeId}/payroll/generate",
    description: "Generate payroll for a store",
    pathParams: ["storeId"],
    queryParams: [],
    defaultPayload: {
  "startDate": "2026-08-01",
  "endDate": "2026-08-31",
  "periodName": "Kỳ lương Tháng 8/2026"
}
  },
  {
    id: 50,
    group: "Payroll",
    method: "GET",
    path: "/api/users/me/payslips",
    description: "Get my payslips (STAFF)",
    pathParams: [],
    queryParams: [],
    defaultPayload: {}
  },
  {
    id: 51,
    group: "Payroll",
    method: "GET",
    path: "/api/users/me/payslips/{payrollId}/pdf",
    description: "Download payslip as PDF (STAFF)",
    pathParams: ["payrollId"],
    queryParams: [],
    defaultPayload: {}
  },
  {
    id: 52,
    group: "Payroll",
    method: "GET",
    path: "/api/stores/{storeId}/payroll",
    description: "Get all payroll periods for a store",
    pathParams: ["storeId"],
    queryParams: [],
    defaultPayload: {}
  },
  {
    id: 53,
    group: "Payroll",
    method: "GET",
    path: "/api/stores/{storeId}/payroll/{periodId}/payslips",
    description: "Get payslips for a specific payroll period",
    pathParams: ["storeId","periodId"],
    queryParams: [],
    defaultPayload: {}
  },
  {
    id: 54,
    group: "Payroll",
    method: "GET",
    path: "/api/stores/{storeId}/payroll/{periodId}/export/excel",
    description: "Download payroll report as Excel (MANAGER)",
    pathParams: ["storeId","periodId"],
    queryParams: [],
    defaultPayload: {}
  },
  {
    id: 55,
    group: "leave-request-controller",
    method: "PUT",
    path: "/api/stores/{storeId}/leave-requests/{id}/reject",
    description: "Không có mô tả",
    pathParams: ["storeId","id"],
    queryParams: [],
    defaultPayload: {}
  },
  {
    id: 56,
    group: "leave-request-controller",
    method: "PUT",
    path: "/api/stores/{storeId}/leave-requests/{id}/approve",
    description: "Không có mô tả",
    pathParams: ["storeId","id"],
    queryParams: [],
    defaultPayload: {}
  },
  {
    id: 57,
    group: "leave-request-controller",
    method: "GET",
    path: "/api/stores/{storeId}/leave-requests",
    description: "Không có mô tả",
    pathParams: ["storeId"],
    queryParams: ["status"],
    defaultPayload: {}
  },
  {
    id: 58,
    group: "leave-request-controller",
    method: "POST",
    path: "/api/stores/{storeId}/leave-requests",
    description: "Không có mô tả",
    pathParams: ["storeId"],
    queryParams: [],
    defaultPayload: {
  "startDate": "2026-09-15",
  "endDate": "2026-09-16",
  "reason": "Việc gia đình",
  "leaveType": "ANNUAL"
}
  },
  {
    id: 59,
    group: "leave-request-controller",
    method: "GET",
    path: "/api/stores/{storeId}/leave-requests/my",
    description: "Không có mô tả",
    pathParams: ["storeId"],
    queryParams: [],
    defaultPayload: {}
  },
  {
    id: 60,
    group: "leave-request-controller",
    method: "DELETE",
    path: "/api/stores/{storeId}/leave-requests/{id}",
    description: "Không có mô tả",
    pathParams: ["storeId","id"],
    queryParams: [],
    defaultPayload: {}
  },
  {
    id: 61,
    group: "Contract Type API",
    method: "PUT",
    path: "/api/stores/{storeId}/contract-types/{contractTypeId}",
    description: "Update an existing contract type",
    pathParams: ["storeId","contractTypeId"],
    queryParams: [],
    defaultPayload: {}
  },
  {
    id: 62,
    group: "Contract Type API",
    method: "DELETE",
    path: "/api/stores/{storeId}/contract-types/{contractTypeId}",
    description: "Delete a contract type",
    pathParams: ["storeId","contractTypeId"],
    queryParams: [],
    defaultPayload: {}
  },
  {
    id: 63,
    group: "Contract Type API",
    method: "GET",
    path: "/api/stores/{storeId}/contract-types",
    description: "Get all contract types for a store",
    pathParams: ["storeId"],
    queryParams: [],
    defaultPayload: {}
  },
  {
    id: 64,
    group: "Contract Type API",
    method: "POST",
    path: "/api/stores/{storeId}/contract-types",
    description: "Create a new contract type",
    pathParams: ["storeId"],
    queryParams: [],
    defaultPayload: {
  "name": "Full-time 40h",
  "baseHourlyRate": 35000,
  "description": "Hợp đồng toàn thời gian"
}
  },
  {
    id: 65,
    group: "Store Configuration",
    method: "GET",
    path: "/api/stores/{storeId}/configuration",
    description: "Get store configuration",
    pathParams: ["storeId"],
    queryParams: [],
    defaultPayload: {}
  },
  {
    id: 66,
    group: "Store Configuration",
    method: "PUT",
    path: "/api/stores/{storeId}/configuration",
    description: "Update store configuration",
    pathParams: ["storeId"],
    queryParams: [],
    defaultPayload: {
  "attendanceRadiusMeters": 100,
  "allowLateGraceMinutes": 15,
  "allowMarketplace": true
}
  },
  {
    id: 67,
    group: "Attendance API",
    method: "PUT",
    path: "/api/stores/{storeId}/attendance/{attendanceId}",
    description: "Không có mô tả",
    pathParams: ["storeId","attendanceId"],
    queryParams: [],
    defaultPayload: {}
  },
  {
    id: 68,
    group: "Attendance API",
    method: "DELETE",
    path: "/api/stores/{storeId}/attendance/{attendanceId}",
    description: "Không có mô tả",
    pathParams: ["storeId","attendanceId"],
    queryParams: [],
    defaultPayload: {}
  },
  {
    id: 69,
    group: "Attendance API",
    method: "POST",
    path: "/api/attendance/selfie",
    description: "Không có mô tả",
    pathParams: [],
    queryParams: ["shiftId","latitude","longitude"],
    defaultPayload: {
  "shiftId": "",
  "latitude": 10.7769,
  "longitude": 106.7009
}
  },
  {
    id: 70,
    group: "Attendance API",
    method: "POST",
    path: "/api/attendance/scan",
    description: "Không có mô tả",
    pathParams: [],
    queryParams: [],
    defaultPayload: {}
  },
  {
    id: 71,
    group: "Attendance API",
    method: "GET",
    path: "/api/stores/{storeId}/shifts/{shiftId}/attendance/qr",
    description: "Không có mô tả",
    pathParams: ["storeId","shiftId"],
    queryParams: [],
    defaultPayload: {}
  },
  {
    id: 72,
    group: "Attendance API",
    method: "GET",
    path: "/api/stores/{storeId}/attendance",
    description: "Không có mô tả",
    pathParams: ["storeId"],
    queryParams: ["from","to"],
    defaultPayload: {}
  },
  {
    id: 73,
    group: "Attendance API",
    method: "GET",
    path: "/api/attendance/me",
    description: "Không có mô tả",
    pathParams: [],
    queryParams: [],
    defaultPayload: {}
  },
  {
    id: 74,
    group: "Attendance Adjustment",
    method: "PUT",
    path: "/api/stores/{storeId}/attendance-adjustments/{requestId}/reject",
    description: "Reject an adjustment request (Manager)",
    pathParams: ["storeId","requestId"],
    queryParams: [],
    defaultPayload: {}
  },
  {
    id: 75,
    group: "Attendance Adjustment",
    method: "PUT",
    path: "/api/stores/{storeId}/attendance-adjustments/{requestId}/approve",
    description: "Approve an adjustment request (Manager)",
    pathParams: ["storeId","requestId"],
    queryParams: [],
    defaultPayload: {}
  },
  {
    id: 76,
    group: "Attendance Adjustment",
    method: "GET",
    path: "/api/stores/{storeId}/attendance-adjustments",
    description: "Get list of adjustment requests (Manager)",
    pathParams: ["storeId"],
    queryParams: ["status"],
    defaultPayload: {}
  },
  {
    id: 77,
    group: "Attendance Adjustment",
    method: "POST",
    path: "/api/stores/{storeId}/attendance-adjustments",
    description: "Submit an attendance adjustment request (Staff)",
    pathParams: ["storeId"],
    queryParams: [],
    defaultPayload: {
  "attendanceId": "",
  "requestedCheckIn": "2026-09-07T08:00:00",
  "requestedCheckOut": "2026-09-07T16:00:00",
  "reason": "Quên chấm công"
}
  },
  {
    id: 78,
    group: "Attendance Adjustment",
    method: "GET",
    path: "/api/stores/{storeId}/attendance-adjustments/me",
    description: "Get my adjustment requests (Staff)",
    pathParams: ["storeId"],
    queryParams: [],
    defaultPayload: {}
  },
  {
    id: 79,
    group: "Requests",
    method: "PUT",
    path: "/api/requests/{id}/status",
    description: "Update request status (Approve or Reject)",
    pathParams: ["id"],
    queryParams: [],
    defaultPayload: {
  "status": "APPROVED"
}
  },
  {
    id: 80,
    group: "Requests",
    method: "GET",
    path: "/api/requests",
    description: "Get all staff requests with optional filters",
    pathParams: [],
    queryParams: ["status","typeCategory","search"],
    defaultPayload: {}
  },
  {
    id: 81,
    group: "Requests",
    method: "POST",
    path: "/api/requests",
    description: "Create a new staff request",
    pathParams: [],
    queryParams: [],
    defaultPayload: {
  "requestType": "Hỗ trợ thiết bị",
  "typeCategory": "equipment",
  "recipient": "Quản lý",
  "content": "Cần cấp thẻ nhân viên mới",
  "startDate": "2026-09-07",
  "endDate": "2026-09-07"
}
  },
  {
    id: 82,
    group: "Requests",
    method: "GET",
    path: "/api/requests/{id}",
    description: "Get request details by ID",
    pathParams: ["id"],
    queryParams: [],
    defaultPayload: {}
  },
  {
    id: 83,
    group: "holiday-controller",
    method: "PUT",
    path: "/api/holidays/{id}",
    description: "Không có mô tả",
    pathParams: ["id"],
    queryParams: [],
    defaultPayload: {}
  },
  {
    id: 84,
    group: "holiday-controller",
    method: "DELETE",
    path: "/api/holidays/{id}",
    description: "Không có mô tả",
    pathParams: ["id"],
    queryParams: [],
    defaultPayload: {}
  },
  {
    id: 85,
    group: "holiday-controller",
    method: "GET",
    path: "/api/holidays",
    description: "Không có mô tả",
    pathParams: [],
    queryParams: [],
    defaultPayload: {}
  },
  {
    id: 86,
    group: "holiday-controller",
    method: "POST",
    path: "/api/holidays",
    description: "Không có mô tả",
    pathParams: [],
    queryParams: [],
    defaultPayload: {
  "name": "Quốc khánh",
  "holidayDate": "2026-09-02",
  "coefficient": 3
}
  },
  {
    id: 87,
    group: "Availability Management",
    method: "PUT",
    path: "/api/availability/{id}",
    description: "Update an availability slot",
    pathParams: ["id"],
    queryParams: [],
    defaultPayload: {}
  },
  {
    id: 88,
    group: "Availability Management",
    method: "DELETE",
    path: "/api/availability/{id}",
    description: "Delete an availability slot",
    pathParams: ["id"],
    queryParams: [],
    defaultPayload: {}
  },
  {
    id: 89,
    group: "Availability Management",
    method: "GET",
    path: "/api/availability",
    description: "Get my availability",
    pathParams: [],
    queryParams: [],
    defaultPayload: {}
  },
  {
    id: 90,
    group: "Availability Management",
    method: "POST",
    path: "/api/availability",
    description: "Create an availability slot",
    pathParams: [],
    queryParams: [],
    defaultPayload: {
  "dayOfWeek": 1,
  "startTime": "08:00:00",
  "endTime": "16:00:00"
}
  },
  {
    id: 91,
    group: "Availability Management",
    method: "GET",
    path: "/api/availability/users/{userId}",
    description: "Get staff availability by user ID (Manager/Admin)",
    pathParams: ["userId"],
    queryParams: [],
    defaultPayload: {}
  },
  {
    id: 92,
    group: "Store Management",
    method: "GET",
    path: "/api/stores",
    description: "Get list of all store branches",
    pathParams: [],
    queryParams: ["search","pageable"],
    defaultPayload: {}
  },
  {
    id: 93,
    group: "Store Management",
    method: "POST",
    path: "/api/stores",
    description: "Create a new store branch",
    pathParams: [],
    queryParams: [],
    defaultPayload: {
  "name": "Chi nhánh Mới",
  "address": "123 Đường ABC, Q1",
  "latitude": 10.7769,
  "longitude": 106.7009,
  "openTime": "08:00:00",
  "closeTime": "22:00:00"
}
  },
  {
    id: 94,
    group: "Store Management",
    method: "GET",
    path: "/api/stores/{id}",
    description: "Get store details by ID",
    pathParams: ["id"],
    queryParams: [],
    defaultPayload: {}
  },
  {
    id: 95,
    group: "Store Management",
    method: "DELETE",
    path: "/api/stores/{id}",
    description: "Delete a store branch",
    pathParams: ["id"],
    queryParams: [],
    defaultPayload: {}
  },
  {
    id: 96,
    group: "Store Management",
    method: "PATCH",
    path: "/api/stores/{id}",
    description: "Update an existing store branch",
    pathParams: ["id"],
    queryParams: [],
    defaultPayload: {
  "name": "Chi nhánh Cập nhật",
  "address": "456 Đường XYZ, Q1",
  "latitude": 10.7769,
  "longitude": 106.7009
}
  },
  {
    id: 97,
    group: "Shift Assignment API",
    method: "GET",
    path: "/api/stores/{storeId}/shifts/{shiftId}/assignments",
    description: "Get assignments for a shift",
    pathParams: ["storeId","shiftId"],
    queryParams: [],
    defaultPayload: {}
  },
  {
    id: 98,
    group: "Shift Assignment API",
    method: "POST",
    path: "/api/stores/{storeId}/shifts/{shiftId}/assignments",
    description: "Assign a staff to a shift (Manager)",
    pathParams: ["storeId","shiftId"],
    queryParams: [],
    defaultPayload: {
  "staffId": ""
}
  },
  {
    id: 99,
    group: "Shift Assignment API",
    method: "DELETE",
    path: "/api/stores/{storeId}/shifts/{shiftId}/assignments/{staffId}",
    description: "Remove a staff from a shift (Manager)",
    pathParams: ["storeId","shiftId","staffId"],
    queryParams: [],
    defaultPayload: {}
  },
  {
    id: 100,
    group: "Marketplace",
    method: "POST",
    path: "/api/stores/{storeId}/marketplace/shifts/{shiftId}/unpublish",
    description: "Unpublish a shift from the Marketplace",
    pathParams: ["storeId","shiftId"],
    queryParams: [],
    defaultPayload: {}
  },
  {
    id: 101,
    group: "Marketplace",
    method: "POST",
    path: "/api/stores/{storeId}/marketplace/shifts/{shiftId}/publish",
    description: "Publish an understaffed shift to the Marketplace",
    pathParams: ["storeId","shiftId"],
    queryParams: [],
    defaultPayload: {}
  },
  {
    id: 102,
    group: "Marketplace",
    method: "POST",
    path: "/api/stores/{storeId}/marketplace/shifts/{shiftId}/claim",
    description: "Claim an Open Shift (Employee)",
    pathParams: ["storeId","shiftId"],
    queryParams: [],
    defaultPayload: {}
  },
  {
    id: 103,
    group: "Marketplace",
    method: "GET",
    path: "/api/stores/{storeId}/marketplace/shifts",
    description: "Get list of active Open Shifts in a store",
    pathParams: ["storeId"],
    queryParams: [],
    defaultPayload: {}
  },
  {
    id: 104,
    group: "Authentication",
    method: "POST",
    path: "/api/auth/register",
    description: "Register a new user profile",
    pathParams: [],
    queryParams: [],
    defaultPayload: {
  "fullName": "Nguyễn Văn A",
  "email": "test@shiftsync.com",
  "password": "password123",
  "phone": "0901234567",
  "systemRole": "STAFF"
}
  },
  {
    id: 105,
    group: "Authentication",
    method: "POST",
    path: "/api/auth/refresh",
    description: "Refresh security token",
    pathParams: [],
    queryParams: [],
    defaultPayload: {
  "refreshToken": "your-refresh-token"
}
  },
  {
    id: 106,
    group: "Authentication",
    method: "POST",
    path: "/api/auth/logout",
    description: "Logout user",
    pathParams: [],
    queryParams: [],
    defaultPayload: {
  "refreshToken": "your-refresh-token"
}
  },
  {
    id: 107,
    group: "Authentication",
    method: "POST",
    path: "/api/auth/login",
    description: "User login",
    pathParams: [],
    queryParams: [],
    defaultPayload: {
  "email": "admin@shiftsync.com",
  "password": "password123"
}
  },
  {
    id: 108,
    group: "Dashboard",
    method: "GET",
    path: "/api/stores/{storeId}/dashboard",
    description: "Get store dashboard metrics",
    pathParams: ["storeId"],
    queryParams: ["startDate","endDate"],
    defaultPayload: {}
  },
  {
    id: 109,
    group: "Dashboard",
    method: "GET",
    path: "/api/stores/{storeId}/dashboard/chart",
    description: "Get store dashboard chart data (time-series)",
    pathParams: ["storeId"],
    queryParams: ["startDate","endDate"],
    defaultPayload: {}
  }
];

export async function executeApi(apiDef, pathParamValues = {}, queryParamValues = {}, payload = null) {
  let url = apiDef.path.replace('/api', '');
  for (const param of apiDef.pathParams) {
    const val = pathParamValues[param] || '';
    url = url.replace('{' + param + '}', encodeURIComponent(val));
  }
  const qList = [];
  for (const [qk, qv] of Object.entries(queryParamValues)) {
    if (qv !== undefined && qv !== null && qv !== '') {
      qList.push(encodeURIComponent(qk) + '=' + encodeURIComponent(qv));
    }
  }
  if (qList.length > 0) {
    url += (url.includes('?') ? '&' : '?') + qList.join('&');
  }
  const method = apiDef.method.toLowerCase();
  const options = {};
  if (apiDef.path.includes('/export/excel') || apiDef.path.includes('/pdf')) {
    options.responseType = 'blob';
  }
  if (method === 'get' || method === 'delete') {
    return api[method](url, options);
  } else {
    return api[method](url, payload, options);
  }
}
