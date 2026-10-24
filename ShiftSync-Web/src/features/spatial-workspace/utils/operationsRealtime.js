const ACTION_LABELS = {
  CHECK_IN: 'Nhân viên đã check-in', CHECK_OUT: 'Nhân viên đã check-out', UPDATE: 'Điểm danh được cập nhật',
  ASSIGNMENT_CREATED: 'Đã phân công nhân sự', ASSIGNMENT_MOVED: 'Đã đổi vị trí nhân sự', ASSIGNMENT_REMOVED: 'Đã gỡ phân công',
  ASSIGNMENT_ZONE_SWAPPED: 'Đã hoán đổi vị trí', SHIFT_CANCELLED: 'Ca làm đã hủy', SHIFT_UNASSIGNED: 'Vị trí trống cần bổ sung',
  OPEN_SHIFT_PUBLISHED: 'Ca trống đã mở trên chợ ca', OPEN_SHIFT_UNPUBLISHED: 'Ca đã rút khỏi chợ ca',
  OPEN_SHIFT_CLAIMED: 'Nhân viên đã nhận ca trống', WORKFORCE_NEED_CREATED: 'Đã tạo nhu cầu nhân sự',
};

export const OPERATIONS_EVENT_NAMES = ['store_shifts_updated', 'store_attendance_updated', 'store_marketplace_updated'];

export function isEventForStore(detail, storeId) {
  const eventStoreId = detail?.storeId;
  return Boolean(storeId) && (!eventStoreId || String(eventStoreId) === String(storeId));
}

export function getOperationsEventSummary(eventName, detail = {}) {
  const action = detail?.data?.action || detail?.action || 'UPDATED';
  const fallback = eventName === 'store_attendance_updated' ? 'Điểm danh được cập nhật'
    : eventName === 'store_marketplace_updated' ? 'Chợ ca được cập nhật' : 'Lịch ca được cập nhật';
  const timestamp = detail?.timestamp && !Number.isNaN(Date.parse(detail.timestamp)) ? detail.timestamp : new Date().toISOString();
  return { action, label: ACTION_LABELS[action] || fallback, timestamp };
}
