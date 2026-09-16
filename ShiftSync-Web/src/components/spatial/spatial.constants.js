/**
 * ShiftSync Spatial Computing Constants & Coordinate Transformations
 * 
 * Coordinate Mapping:
 * - Backend X (Length) -> Three.js X (Horizontal axis)
 * - Backend Y (Width)  -> Three.js Z (Depth axis on ground plane)
 * - Backend Z (Height) -> Three.js Y (Elevation / Vertical axis)
 */

export const DEFAULT_STORE_LAYOUT = {
  length: 24.0, // meters along X
  width: 16.0,  // meters along Z
  height: 5.0,  // meters along Y
};

// Map backend coordinate to Three.js centered coordinate
export function toThreeCoords(x, y, z, layout = DEFAULT_STORE_LAYOUT) {
  const len = layout.length || DEFAULT_STORE_LAYOUT.length;
  const wid = layout.width || DEFAULT_STORE_LAYOUT.width;
  
  return [
    (Number(x) || 0) - len / 2,
    Number(z) || 0,
    (Number(y) || 0) - wid / 2,
  ];
}

// Map Three.js coordinate back to backend Store coordinates
export function toBackendCoords(threeX, threeY, threeZ, layout = DEFAULT_STORE_LAYOUT) {
  const len = layout.length || DEFAULT_STORE_LAYOUT.length;
  const wid = layout.width || DEFAULT_STORE_LAYOUT.width;

  return {
    x: Number((threeX + len / 2).toFixed(2)),
    y: Number((threeZ + wid / 2).toFixed(2)),
    z: Number(threeY.toFixed(2)),
  };
}

// Calculate Euclidean distance in meters between two zones
export function calculateZoneDistance(zoneA, zoneB) {
  const dx = (zoneA.x || 0) - (zoneB.x || 0);
  const dy = (zoneA.y || 0) - (zoneB.y || 0);
  const dz = (zoneA.z || 0) - (zoneB.z || 0);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

// Enterprise Architectural Color Palette
export const SPATIAL_THEME = {
  // Brand accents
  primary: '#51A33D',
  primaryHover: '#3D8A2D',
  primaryLight: '#EEFAEB',
  accent: '#10B981',

  // Architectural Materials
  floorGround: '#F1F5F9',
  floorGrid: '#CBD5E1',
  floorBorder: '#94A3B8',
  wallGlass: 'rgba(203, 213, 225, 0.35)',
  wallFrame: '#64748B',

  // Zones by role or category
  zoneColors: {
    barista: '#0D9488',    // Teal
    pos: '#0284C7',        // Sky Blue
    dining: '#EAB308',     // Amber
    mezzanine: '#8B5CF6',  // Purple
    kitchen: '#F97316',    // Orange
    storage: '#6B7280',    // Slate
    display: '#8B5CF6',    // Purple / Retail
    consultation: '#EC4899', // Pink / Salon
    default: '#10B981',    // Emerald
  },

  // Occupancy status colors
  status: {
    vacant: '#94A3B8',     // Grey (0 staff)
    optimal: '#10B981',    // Green (well-staffed)
    congested: '#F59E0B',  // Amber (approaching capacity)
    full: '#EF4444',       // Red (at capacity)
  },

  // Distance lines
  distanceLine: '#6366F1',
  distanceText: '#4F46E5',
};

export const STORE_CATEGORIES = {
  RETAIL: { key: 'RETAIL', label: 'Bán lẻ (Retail)', icon: '🛍️' },
  FOOD_BEVERAGE: { key: 'FOOD_BEVERAGE', label: 'Ẩm thực & Đồ uống (F&B)', icon: '☕' },
  SERVICE: { key: 'SERVICE', label: 'Dịch vụ & Chăm sóc (Service)', icon: '✂️' },
  HOSPITALITY: { key: 'HOSPITALITY', label: 'Khách sạn & Nghỉ dưỡng', icon: '🏨' },
  HEALTHCARE: { key: 'HEALTHCARE', label: 'Y tế & Sức khỏe', icon: '🩺' },
  OTHER: { key: 'OTHER', label: 'Khác (Custom)', icon: '🏢' },
};

export const SPATIAL_TYPES = {
  CHECKOUT: { key: 'CHECKOUT', label: 'Quầy thu ngân / POS', color: '#0284C7', icon: '💳' },
  STORAGE: { key: 'STORAGE', label: 'Kho lưu trữ / Tiếp liệu', color: '#64748B', icon: '📦' },
  PRODUCTION: { key: 'PRODUCTION', label: 'Khu sản xuất / Chế biến', color: '#F97316', icon: '🍳' },
  SERVICE_STATION: { key: 'SERVICE_STATION', label: 'Trạm dịch vụ khách hàng', color: '#0D9488', icon: '🛎️' },
  DISPLAY: { key: 'DISPLAY', label: 'Khu trưng bày sản phẩm', color: '#8B5CF6', icon: '🏷️' },
  REST_BREAK: { key: 'REST_BREAK', label: 'Khu nghỉ ngơi nhân viên', color: '#10B981', icon: '☕' },
  OFFICE: { key: 'OFFICE', label: 'Văn phòng điều hành', color: '#475569', icon: '💼' },
  SEATING: { key: 'SEATING', label: 'Khu ngồi khách hàng', color: '#EAB308', icon: '🪑' },
  CONSULTATION: { key: 'CONSULTATION', label: 'Tư vấn / Thử đồ / Tạo mẫu', color: '#EC4899', icon: '✨' },
  CUSTOM: { key: 'CUSTOM', label: 'Khu vực tuỳ chỉnh', color: '#3B82F6', icon: '📍' },
};

export const ZONE_PRESETS = [
  { name: 'Quầy Thu ngân / POS', key: 'pos', zoneType: 'CHECKOUT', color: '#0284C7', defaultCapacity: 3 },
  { name: 'Khu Trưng bày / Gian hàng', key: 'display', zoneType: 'DISPLAY', color: '#8B5CF6', defaultCapacity: 4 },
  { name: 'Trạm Dịch vụ / Pha chế / Phục vụ', key: 'service', zoneType: 'SERVICE_STATION', color: '#0D9488', defaultCapacity: 4 },
  { name: 'Khu Chế biến / Bếp / Sản xuất', key: 'production', zoneType: 'PRODUCTION', color: '#F97316', defaultCapacity: 4 },
  { name: 'Kho hàng / Tiếp liệu', key: 'storage', zoneType: 'STORAGE', color: '#64748B', defaultCapacity: 2 },
  { name: 'Sảnh khách / Bàn ghế', key: 'seating', zoneType: 'SEATING', color: '#EAB308', defaultCapacity: 8 },
  { name: 'Khu Tư vấn / Phòng thử đồ', key: 'consultation', zoneType: 'CONSULTATION', color: '#EC4899', defaultCapacity: 3 },
  { name: 'Khu Nghỉ nhân viên / Hậu cần', key: 'rest', zoneType: 'REST_BREAK', color: '#10B981', defaultCapacity: 4 },
];

export function getZoneThemeColor(zoneOrName = '') {
  if (typeof zoneOrName === 'object' && zoneOrName !== null) {
    if (zoneOrName.color) return zoneOrName.color;
    if (zoneOrName.zoneType && SPATIAL_TYPES[zoneOrName.zoneType]) {
      return SPATIAL_TYPES[zoneOrName.zoneType].color;
    }
    zoneOrName = zoneOrName.name || '';
  }
  const lower = String(zoneOrName).toLowerCase();
  for (const [stKey, stVal] of Object.entries(SPATIAL_TYPES)) {
    if (lower.includes(stKey.toLowerCase()) || lower.includes(stVal.label.toLowerCase())) {
      return stVal.color;
    }
  }
  if (lower.includes('barista') || lower.includes('pha chế') || lower.includes('service')) return SPATIAL_THEME.zoneColors.barista;
  if (lower.includes('pos') || lower.includes('cashier') || lower.includes('thu ngân')) return SPATIAL_THEME.zoneColors.pos;
  if (lower.includes('dining') || lower.includes('khách') || lower.includes('bàn')) return SPATIAL_THEME.zoneColors.dining;
  if (lower.includes('kitchen') || lower.includes('bếp') || lower.includes('bakery')) return SPATIAL_THEME.zoneColors.kitchen;
  if (lower.includes('storage') || lower.includes('kho')) return SPATIAL_THEME.zoneColors.storage;
  if (lower.includes('display') || lower.includes('trưng bày') || lower.includes('giày') || lower.includes('kệ')) return '#8B5CF6';
  if (lower.includes('salon') || lower.includes('tóc') || lower.includes('styling') || lower.includes('thử đồ')) return '#EC4899';
  return SPATIAL_THEME.zoneColors.default;
}

export function getCapacityState(assignedCount = 0, capacity = 4) {
  if (assignedCount === 0) return 'EMPTY';
  if (assignedCount > capacity) return 'OVER';
  if (assignedCount === capacity) return 'FULL';
  return 'PARTIAL';
}

export function getZoneIcon(zoneOrName = '') {
  if (typeof zoneOrName === 'object' && zoneOrName !== null) {
    if (zoneOrName.zoneType && SPATIAL_TYPES[zoneOrName.zoneType]) {
      return SPATIAL_TYPES[zoneOrName.zoneType].icon;
    }
    zoneOrName = zoneOrName.name || '';
  }
  const lower = String(zoneOrName).toLowerCase();
  if (lower.includes('barista') || lower.includes('pha chế') || lower.includes('cà phê')) return '☕';
  if (lower.includes('pos') || lower.includes('cashier') || lower.includes('thu ngân')) return '💳';
  if (lower.includes('dining') || lower.includes('khách') || lower.includes('bàn')) return '🍽️';
  if (lower.includes('mezzanine') || lower.includes('lửng') || lower.includes('lầu')) return '🪜';
  if (lower.includes('kitchen') || lower.includes('bếp') || lower.includes('bakery')) return '🍳';
  if (lower.includes('storage') || lower.includes('kho')) return '📦';
  if (lower.includes('display') || lower.includes('trưng bày') || lower.includes('kệ') || lower.includes('giày')) return '🏷️';
  if (lower.includes('styling') || lower.includes('salon') || lower.includes('tóc') || lower.includes('gội')) return '✂️';
  if (lower.includes('fitting') || lower.includes('thử đồ')) return '👗';
  return '📍';
}

export function getShortZoneName(zoneOrName = '') {
  if (typeof zoneOrName === 'object' && zoneOrName !== null) {
    if (zoneOrName.code) return zoneOrName.code;
    zoneOrName = zoneOrName.name || '';
  }
  const name = String(zoneOrName || '').trim();
  const words = name.split(/\s+/);
  return words.slice(0, 2).join(' ');
}

/**
 * Occupancy Color mapping based on assigned/capacity ratio:
 * - Green (>= 0.7)
 * - Yellow (0.3 - 0.7)
 * - Red (< 0.3)
 */
export function getOccupancyColor(assignedCount = 0, capacity = 4) {
  if (!capacity || capacity <= 0) return '#EF4444';
  const ratio = assignedCount / capacity;
  if (ratio >= 0.7) return '#10B981'; // Green
  if (ratio >= 0.3) return '#F59E0B'; // Yellow
  return '#EF4444';                   // Red (< 0.3)
}

const GENERIC_ROLE_PALETTE = [
  '#0284C7', // Sky blue
  '#0D9488', // Teal
  '#8B5CF6', // Purple
  '#F97316', // Orange
  '#10B981', // Emerald
  '#EC4899', // Pink
  '#6366F1', // Indigo
  '#EAB308', // Amber
  '#06B6D4', // Cyan
  '#14B8A6', // Mint
];

export function getRoleColor(roleOrSkill = '') {
  const lower = String(roleOrSkill || '').trim().toLowerCase();
  if (!lower) return '#3B82F6';
  if (lower.includes('barista') || lower.includes('pha chế')) return '#8B5CF6';
  if (lower.includes('pos') || lower.includes('cashier') || lower.includes('thu ngân')) return '#0284C7';
  if (lower.includes('kitchen') || lower.includes('bếp') || lower.includes('bakery') || lower.includes('cook')) return '#F97316';
  if (lower.includes('waiter') || lower.includes('phục vụ') || lower.includes('dining')) return '#EAB308';
  if (lower.includes('leader') || lower.includes('quản lý') || lower.includes('manager')) return '#10B981';
  if (lower.includes('stylist') || lower.includes('tạo mẫu') || lower.includes('beauty') || lower.includes('cắt tóc')) return '#EC4899';
  if (lower.includes('sales') || lower.includes('bán hàng') || lower.includes('tư vấn')) return '#06B6D4';
  if (lower.includes('stock') || lower.includes('kho') || lower.includes('tiếp liệu')) return '#64748B';

  // Deterministic string hash for arbitrary custom roles
  let hash = 0;
  for (let i = 0; i < lower.length; i++) {
    hash = (hash << 5) - hash + lower.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash) % GENERIC_ROLE_PALETTE.length;
  return GENERIC_ROLE_PALETTE[idx];
}

/**
 * Deterministic pseudo-random offset within zone bounds to scatter 3D humans
 * stably behind workstations/counters without position jumps across component re-renders.
 */
export function getDeterministicPersonOffset(zoneId = '', index = 0, total = 1, spanX = 2.4, spanZ = 2.0) {
  if (total <= 1) {
    // Single staff: place directly behind the workstation counter
    return [0, 0.75];
  }
  // Multiple staff: spread along X axis cleanly with alternate depth
  const spacing = Math.min(0.7, (spanX * 0.7) / Math.max(1, total - 1));
  const startX = -((total - 1) * spacing) / 2;
  const ox = startX + index * spacing;
  const oz = (index % 2 === 0 ? 0.75 : 0.95);
  return [Number(ox.toFixed(3)), Number(oz.toFixed(3))];
}

/**
 * Intelligent semantic resolution of a store zone for a given staff skill or role.
 * Ensures Barista -> Barista Counter, Cashier -> POS & Cashier, Kitchen -> Kitchen & Bakery, Waiter -> Dining.
 */
export function resolveSemanticZone(skillName = '', zones = [], usedCounts = {}) {
  if (!zones || zones.length === 0) return null;
  const sName = String(skillName || '').toLowerCase().trim();

  const roleKeywords = {
    barista: ['barista', 'pha chế', 'cà phê', 'coffee', 'espresso', 'quầy pha'],
    cashier: ['thu ngân', 'cashier', 'pos', 'thanh toán', 'order', 'checkout', 'quầy thu'],
    kitchen: ['bếp', 'kitchen', 'bánh', 'bakery', 'cook'],
    waiter: ['phục vụ', 'waiter', 'server', 'dining', 'sảnh', 'bàn', 'khách'],
    leader: ['trưởng ca', 'leader', 'supervisor', 'quản lý', 'manager'],
  };

  let matchedCat = null;
  for (const [cat, keywords] of Object.entries(roleKeywords)) {
    if (keywords.some((kw) => sName.includes(kw))) {
      matchedCat = cat;
      break;
    }
  }

  const zoneMatches = (z, keywords) => {
    const zName = String(z.name || '').toLowerCase();
    const zCode = String(z.code || '').toLowerCase();
    const zType = String(z.zoneType || '').toLowerCase();
    return keywords.some((kw) => zName.includes(kw) || zCode.includes(kw) || zType.includes(kw));
  };

  if (matchedCat) {
    const targetKeywords = roleKeywords[matchedCat];
    const matchingZones = zones.filter((z) => zoneMatches(z, targetKeywords));
    const available = matchingZones.find((z) => (usedCounts[z.id] || 0) < (z.capacity || 4));
    if (available) {
      usedCounts[available.id] = (usedCounts[available.id] || 0) + 1;
      return available;
    }
    if (matchingZones.length > 0) {
      usedCounts[matchingZones[0].id] = (usedCounts[matchingZones[0].id] || 0) + 1;
      return matchingZones[0];
    }
  }

  // Fallback: pick any zone with remaining capacity
  const availableAny = zones.find((z) => (usedCounts[z.id] || 0) < (z.capacity || 4));
  if (availableAny) {
    usedCounts[availableAny.id] = (usedCounts[availableAny.id] || 0) + 1;
    return availableAny;
  }

  usedCounts[zones[0].id] = (usedCounts[zones[0].id] || 0) + 1;
  return zones[0];
}

/**
 * Calculates staffing target requirement per zone based on the active shift demand.
 * Distinguishes between shift requirement (e.g. 2 baristas, 2 waitstaff) and physical room capacity.
 */
export function getZoneShiftRequirements(zones = [], currentShift = null, skills = []) {
  const reqMap = {};
  zones.forEach((z) => {
    reqMap[z.id] = 0;
  });

  const rawReqs = currentShift?.skillRequirements || currentShift?.requirements || [];

  if (Array.isArray(rawReqs) && rawReqs.length > 0) {
    let hasExplicitReqs = false;
    rawReqs.forEach((r) => {
      const count = Number(r.requiredCount || r.requiredStaff || r.minQuantity || 0);
      if (count > 0) {
        hasExplicitReqs = true;
        // 1. Direct zone match if requirement has zoneId
        if (r.zoneId && reqMap[r.zoneId] !== undefined) {
          reqMap[r.zoneId] += count;
          return;
        }

        // 2. Semantic matching from skill name
        const skObj = skills.find((s) => s.id === r.skillId || s.name === r.skillName);
        const skillName = r.skillName || skObj?.name || '';
        const matchedZone = resolveSemanticZone(skillName, zones, {});
        if (matchedZone && reqMap[matchedZone.id] !== undefined) {
          reqMap[matchedZone.id] += count;
        } else if (zones.length > 0) {
          reqMap[zones[0].id] += count;
        }
      }
    });

    if (hasExplicitReqs) {
      return reqMap;
    }
  }

  // Fallback 1: Shift has overall requiredStaff count
  const totalRequired = Number(currentShift?.requiredStaff || currentShift?.requiredStaffCount || 0);
  if (totalRequired > 0 && zones.length > 0) {
    const totalCap = zones.reduce((sum, z) => sum + (z.capacity || 4), 0);
    let remaining = totalRequired;
    zones.forEach((z, idx) => {
      if (idx === zones.length - 1) {
        reqMap[z.id] = Math.max(0, remaining);
      } else {
        const share = Math.max(1, Math.round(((z.capacity || 4) / totalCap) * totalRequired));
        reqMap[z.id] = Math.min(share, remaining);
        remaining -= reqMap[z.id];
      }
    });
    return reqMap;
  }

  // Fallback 2: General store default (50% of zone capacity, min 1)
  zones.forEach((z) => {
    reqMap[z.id] = Math.max(1, Math.floor((z.capacity || 4) * 0.5));
  });
  return reqMap;
}


