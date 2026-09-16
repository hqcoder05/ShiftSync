/**
 * ZoneStatus.js
 * Business logic for zone capacity, staffing status, and visual styling.
 */

export const ZONE_STATUS = {
  OPTIMAL: 'OPTIMAL',
  UNDERSTAFFED: 'UNDERSTAFFED',
  OVERSTAFFED: 'OVERSTAFFED',
  FULL: 'FULL',
  EMPTY: 'EMPTY',
};

/**
 * Determine zone staffing status.
 * If targetCount is provided (from shift requirements), evaluate against shift demand first.
 */
export function getZoneStatus(assignedCount = 0, capacity = 4, targetCount = null) {
  if (targetCount !== null && targetCount !== undefined) {
    if (targetCount === 0) return assignedCount > 0 ? ZONE_STATUS.OVERSTAFFED : ZONE_STATUS.OPTIMAL; // Not needed in this shift
    if (assignedCount === 0) return ZONE_STATUS.EMPTY;
    if (assignedCount < targetCount) return ZONE_STATUS.UNDERSTAFFED;
    if (assignedCount > targetCount || assignedCount > capacity) return ZONE_STATUS.OVERSTAFFED;
    return ZONE_STATUS.OPTIMAL;
  }
  if (assignedCount === 0) return ZONE_STATUS.EMPTY;
  if (assignedCount < Math.ceil(capacity * 0.5)) return ZONE_STATUS.UNDERSTAFFED;
  if (assignedCount > capacity) return ZONE_STATUS.OVERSTAFFED;
  if (assignedCount === capacity) return ZONE_STATUS.FULL;
  return ZONE_STATUS.OPTIMAL;
}

/**
 * Get status color badge and ring
 */
export function getZoneStatusColor(status) {
  switch (status) {
    case ZONE_STATUS.OPTIMAL:
      return {
        main: '#10B981', // Emerald
        bg: 'rgba(16, 185, 129, 0.12)',
        border: '#10B981',
        text: '#059669',
        label: 'Đủ nhân sự',
        hexInt: 0x10B981,
      };
    case ZONE_STATUS.UNDERSTAFFED:
      return {
        main: '#F59E0B', // Amber
        bg: 'rgba(245, 158, 11, 0.12)',
        border: '#F59E0B',
        text: '#D97706',
        label: 'Thiếu nhân sự',
        hexInt: 0xF59E0B,
      };
    case ZONE_STATUS.OVERSTAFFED:
      return {
        main: '#8B5CF6', // Purple
        bg: 'rgba(139, 92, 246, 0.12)',
        border: '#8B5CF6',
        text: '#7C3AED',
        label: 'Dư nhân sự',
        hexInt: 0x8B5CF6,
      };
    case ZONE_STATUS.FULL:
      return {
        main: '#EF4444', // Red
        bg: 'rgba(239, 68, 68, 0.12)',
        border: '#EF4444',
        text: '#DC2626',
        label: 'Đầy công suất',
        hexInt: 0xEF4444,
      };
    case ZONE_STATUS.EMPTY:
    default:
      return {
        main: '#64748B', // Slate
        bg: 'rgba(100, 116, 139, 0.10)',
        border: '#94A3B8',
        text: '#64748B',
        label: 'Trống ca',
        hexInt: 0x64748B,
      };
  }
}

/**
 * Role palette for stylized aprons & indicators
 */
export const ROLE_PALETTE = {
  barista: {
    name: 'Pha chế (Barista)',
    color: '#D97706', // Warm caramel
    hexInt: 0xD97706,
    icon: '☕',
    apronColor: 0x92400E,
  },
  cashier: {
    name: 'Thu ngân (Cashier)',
    color: '#10B981', // Emerald mint
    hexInt: 0x10B981,
    icon: '💳',
    apronColor: 0x065F46,
  },
  kitchen: {
    name: 'Bếp / Làm bánh (Bakery)',
    color: '#EA580C', // Warm orange
    hexInt: 0xEA580C,
    icon: '🥐',
    apronColor: 0x9A3412,
  },
  waiter: {
    name: 'Phục vụ (Server)',
    color: '#3B82F6', // Royal blue
    hexInt: 0x3B82F6,
    icon: '🍽️',
    apronColor: 0x1E40AF,
  },
  manager: {
    name: 'Quản lý (Manager)',
    color: '#8B5CF6', // Purple
    hexInt: 0x8B5CF6,
    icon: '👔',
    apronColor: 0x5B21B6,
  },
  sales: {
    name: 'Bán hàng / Tư vấn (Sales)',
    color: '#06B6D4', // Cyan
    hexInt: 0x06B6D4,
    icon: '👟',
    apronColor: 0x0E7490,
  },
  stylist: {
    name: 'Tạo mẫu / Chăm sóc (Stylist)',
    color: '#EC4899', // Pink
    hexInt: 0xEC4899,
    icon: '✂️',
    apronColor: 0xBE185D,
  },
  stock: {
    name: 'Kho / Tiếp liệu (Inventory)',
    color: '#64748B', // Slate
    hexInt: 0x64748B,
    icon: '📦',
    apronColor: 0x334155,
  },
  default: {
    name: 'Nhân viên',
    color: '#6366F1', // Indigo
    hexInt: 0x6366F1,
    icon: '👤',
    apronColor: 0x3730A3,
  },
};

export function getRoleTheme(roleName = '') {
  const norm = String(roleName).toLowerCase();
  if (norm.includes('barista') || norm.includes('pha chế') || norm.includes('cà phê')) {
    return ROLE_PALETTE.barista;
  }
  if (norm.includes('thu ngân') || norm.includes('cashier') || norm.includes('pos')) {
    return ROLE_PALETTE.cashier;
  }
  if (norm.includes('giày') || norm.includes('sales') || norm.includes('bán hàng') || norm.includes('tư vấn')) {
    return ROLE_PALETTE.sales;
  }
  if (norm.includes('stylist') || norm.includes('tóc') || norm.includes('gội') || norm.includes('salon') || norm.includes('tạo mẫu')) {
    return ROLE_PALETTE.stylist;
  }
  if (norm.includes('kho') || norm.includes('stock') || norm.includes('tiếp liệu') || norm.includes('inventory')) {
    return ROLE_PALETTE.stock;
  }
  if (norm.includes('bếp') || norm.includes('kitchen') || norm.includes('bánh') || norm.includes('baker') || norm.includes('nấu')) {
    return ROLE_PALETTE.kitchen;
  }
  if (norm.includes('phục vụ') || norm.includes('waiter') || norm.includes('sảnh') || norm.includes('server')) {
    return ROLE_PALETTE.waiter;
  }
  if (norm.includes('quản lý') || norm.includes('manager') || norm.includes('admin') || norm.includes('trưởng')) {
    return ROLE_PALETTE.manager;
  }
  return ROLE_PALETTE.default;
}
