/**
 * SimulationValidator.js
 * Comprehensive business logic and constraint validation for workforce simulation.
 * 
 * Reuses actual domain rules from BA W2.1:
 * - BR-15: Skill match between Employee skills and Zone requirements
 * - BR-06, BR-53: Skill validity & expiration check
 * - BR-47, BR-48: Leave request status & availability check
 * - Hard Capacity Constraints of Store Zones
 */

export const ZONE_SKILL_KEYWORDS = {
  barista: ['barista', 'pha chế', 'coffee', 'espresso'],
  pos: ['pos', 'cashier', 'thu ngân', 'order', 'bán hàng', 'checkout', 'tiếp tân'],
  kitchen: ['kitchen', 'bếp', 'cook', 'bakery', 'lò nướng', 'nấu'],
  dining: ['waiter', 'phục vụ', 'dining', 'bàn', 'chăm sóc', 'phòng khách'],
  sales: ['sales', 'bán hàng', 'tư vấn', 'giày', 'footwear', 'retail', 'thời trang'],
  stylist: ['stylist', 'tạo mẫu', 'cắt tóc', 'hair', 'salon', 'gội đầu', 'beauty'],
  stock: ['stock', 'kho', 'inventory', 'warehouse', 'giao nhận', 'tiếp liệu'],
  leader: ['leader', 'supervisor', 'trưởng ca', 'quản lý', 'manager'],
  security: ['security', 'bảo vệ', 'an ninh', 'giữ xe'],
};

/**
 * Normalizes strings for flexible fuzzy comparison.
 */
function normalize(str = '') {
  return str.toLowerCase().trim();
}

/**
 * Check if employee possesses the required skill for a zone,
 * and whether that skill is currently valid (not expired).
 * Decoupled from store layout: checks explicit zone/shift requirements first.
 */
export function validateSkillForZone(employee, zone, shiftRequirements = []) {
  if (!zone) return { valid: false, reason: 'Phân khu không tồn tại', code: 'ERR_ZONE_NOT_FOUND' };
  
  const zoneName = normalize(zone.name || '');
  const empSkills = Array.isArray(employee.skills) ? employee.skills : [];
  const empRole = normalize(employee.skillName || employee.role || employee.position || '');

  // Extract all skill names the employee possesses
  const skillEntries = [
    { name: empRole, expiresAt: null },
    ...empSkills.map((s) => (typeof s === 'string' ? { name: normalize(s), expiresAt: null } : { name: normalize(s.name || s.skillName || ''), expiresAt: s.expiresAt || s.expirationDate || null })),
  ].filter((s) => Boolean(s.name));

  // 1. Explicit check: if shiftRequirements specifies a skill for this zone
  if (Array.isArray(shiftRequirements) && shiftRequirements.length > 0) {
    const matchingReq = shiftRequirements.find((r) => r.zoneId === zone.id || r.zoneName === zone.name);
    if (matchingReq && matchingReq.skillName) {
      const targetReq = normalize(matchingReq.skillName);
      const matched = skillEntries.find((se) => se.name.includes(targetReq) || targetReq.includes(se.name));
      if (!matched) {
        return {
          valid: false,
          reason: `Yêu cầu kỹ năng: ${matchingReq.skillName}`,
          requiredSkill: matchingReq.skillName,
          code: 'ERR_MISSING_SKILL',
        };
      }
      return { valid: true, skillMatched: matchingReq.skillName };
    }
  }

  // 2. Explicit zone skill requirement
  if (Array.isArray(zone.requiredSkills) && zone.requiredSkills.length > 0) {
    const matched = skillEntries.find((se) =>
      zone.requiredSkills.some((rs) => normalize(rs).includes(se.name) || se.name.includes(normalize(rs)))
    );
    if (!matched) {
      return {
        valid: false,
        reason: `Thiếu kỹ năng yêu cầu của phân khu: ${zone.requiredSkills.join(', ')}`,
        code: 'ERR_MISSING_SKILL',
      };
    }
    return { valid: true, skillMatched: matched.name };
  }

  // 3. Category inference fallback
  let requiredCategory = null;
  for (const [category, keywords] of Object.entries(ZONE_SKILL_KEYWORDS)) {
    if (keywords.some((kw) => zoneName.includes(kw))) {
      requiredCategory = category;
      break;
    }
  }

  // If zone doesn't require a specialized skill (e.g. general storage, display, seating, custom area)
  if (!requiredCategory) {
    return { valid: true, skillMatched: 'Lao động tổng quát (General)' };
  }

  // Check if employee has any matching keyword for this category
  const targetKeywords = ZONE_SKILL_KEYWORDS[requiredCategory];
  const matchedEntry = skillEntries.find((se) =>
    targetKeywords.some((kw) => se.name.includes(kw) || kw.includes(se.name))
  );

  const categoryLabels = {
    barista: 'Pha chế Barista',
    pos: 'Thu ngân / POS',
    kitchen: 'Bếp / Bakery',
    dining: 'Phục vụ bàn',
    sales: 'Tư vấn bán hàng',
    stylist: 'Tạo mẫu / Stylist',
    leader: 'Quản lý cửa hàng',
    stock: 'Kho / Tiếp liệu',
    security: 'An ninh / Bảo vệ',
  };

  // If no match found, check if the zone is non-restrictive
  if (!matchedEntry) {
    if (zone.strictSkillCheck) {
      return {
        valid: false,
        reason: `Thiếu kỹ năng chuyên môn: ${categoryLabels[requiredCategory] || requiredCategory}`,
        requiredSkill: categoryLabels[requiredCategory] || requiredCategory,
        code: 'ERR_MISSING_SKILL',
      };
    }
    // Soft fallback: Allow assignment with notice
    return { valid: true, skillMatched: employee.skillName || 'Linh hoạt' };
  }

  // Check expiration if present
  if (matchedEntry.expiresAt) {
    const expDate = new Date(matchedEntry.expiresAt);
    if (!isNaN(expDate.getTime()) && expDate < new Date()) {
      return {
        valid: false,
        reason: `Chứng chỉ kỹ năng ${categoryLabels[requiredCategory] || matchedEntry.name} đã hết hạn (${expDate.toLocaleDateString()})`,
        requiredSkill: categoryLabels[requiredCategory] || requiredCategory,
        code: 'ERR_SKILL_EXPIRED',
      };
    }
  }

  return { valid: true, skillMatched: categoryLabels[requiredCategory] || matchedEntry.name };
}

/**
 * Check if employee is currently available or on approved leave.
 */
export function validateEmployeeAvailability(employee, shiftDate = null) {
  if (!employee) return { valid: false, reason: 'Chưa chọn nhân sự' };

  if (employee.isOnLeave) {
    return {
      valid: false,
      reason: `Nhân sự ${employee.staffName || employee.fullName || ''} đang trong kỳ nghỉ phép (${employee.leaveReason || 'Đã duyệt'})`,
      code: 'ERR_ON_LEAVE',
    };
  }

  if (employee.isUnavailable) {
    return {
      valid: false,
      reason: 'Nhân sự đã đăng ký bận / không khả dụng trong khung giờ này',
      code: 'ERR_UNAVAILABLE',
    };
  }

  return { valid: true };
}

/**
 * Check if zone has available capacity.
 */
export function validateZoneCapacity(targetZone, currentStaffInZone = [], isSelfTransfer = false) {
  if (!targetZone) return { valid: false, reason: 'Phân khu không tồn tại', code: 'ERR_ZONE_NOT_FOUND' };

  const capacity = targetZone.capacity || 4;
  const currentCount = currentStaffInZone.length;

  if (!isSelfTransfer && currentCount >= capacity) {
    return {
      valid: false,
      reason: `Phân khu "${targetZone.name}" đã đạt sức chứa tối đa (${currentCount}/${capacity})`,
      capacity,
      currentCount,
      code: 'ERR_ZONE_FULL',
    };
  }

  return { valid: true, remainingCapacity: capacity - currentCount };
}

/**
 * Master Transfer Validation.
 */
export function validateEmployeeTransfer({
  employee,
  fromZone,
  toZone,
  staffInTargetZone = [],
}) {
  if (!employee) {
    return { valid: false, reason: 'Chưa chọn nhân sự', code: 'ERR_NO_STAFF' };
  }
  if (!toZone) {
    return { valid: false, reason: 'Chưa chọn phân khu đích', code: 'ERR_NO_TARGET' };
  }

  const isSelf = fromZone?.id === toZone.id;
  if (isSelf) {
    return { valid: true, reason: 'Nhân viên đã ở phân khu này' };
  }

  // 1. Availability / Leave Check
  const availCheck = validateEmployeeAvailability(employee);
  if (!availCheck.valid) {
    return availCheck;
  }

  // 2. Skill Validation
  const skillCheck = validateSkillForZone(employee, toZone);
  if (!skillCheck.valid) {
    return skillCheck;
  }

  // 3. Capacity Validation
  const capacityCheck = validateZoneCapacity(toZone, staffInTargetZone, false);
  if (!capacityCheck.valid) {
    return capacityCheck;
  }

  return {
    valid: true,
    message: `Đủ điều kiện điều chuyển sang ${toZone.name}`,
    skillMatched: skillCheck.skillMatched,
  };
}

/**
 * Master Swap Validation between two employees.
 */
export function validateEmployeeSwap({
  staffA,
  zoneA,
  staffB,
  zoneB,
}) {
  if (!staffA || !staffB) {
    return { valid: false, reason: 'Cần chọn 2 nhân sự để hoán đổi' };
  }
  if (!zoneA || !zoneB) {
    return { valid: false, reason: 'Hai nhân sự cần thuộc hai phân khu xác định' };
  }
  if (zoneA.id === zoneB.id) {
    return { valid: false, reason: 'Hai nhân sự đang cùng thuộc một phân khu' };
  }

  // Availability
  const availA = validateEmployeeAvailability(staffA);
  if (!availA.valid) return availA;
  const availB = validateEmployeeAvailability(staffB);
  if (!availB.valid) return availB;

  // Validate A moving to Zone B
  const checkA = validateSkillForZone(staffA, zoneB);
  if (!checkA.valid) {
    const nameA = staffA.staffName || staffA.fullName || 'Nhân sự 1';
    return {
      valid: false,
      reason: `${nameA} không đạt kỹ năng cho ${zoneB.name} (${checkA.reason})`,
      code: 'ERR_A_SKILL',
    };
  }

  // Validate B moving to Zone A
  const checkB = validateSkillForZone(staffB, zoneA);
  if (!checkB.valid) {
    const nameB = staffB.staffName || staffB.fullName || 'Nhân sự 2';
    return {
      valid: false,
      reason: `${nameB} không đạt kỹ năng cho ${zoneA.name} (${checkB.reason})`,
      code: 'ERR_B_SKILL',
    };
  }

  return {
    valid: true,
    message: `Đủ điều kiện hoán đổi giữa ${zoneA.name} và ${zoneB.name}`,
  };
}

/**
 * Smart Candidate Recommendation for Understaffed Zones.
 * Finds employees qualified for targetZone who are either unassigned or assigned in an overstaffed zone.
 */
function normalizeTime(timeStr) {
  if (!timeStr) return '';
  const parts = String(timeStr).split(':');
  if (parts.length >= 2) {
    return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
  }
  return String(timeStr);
}

export function checkStaffAvailabilityForShift(emp, shift) {
  if (!shift || !shift.shiftDate || !shift.startTime || !shift.endTime) {
    return true; // No shift context to restrict
  }

  const slots = emp.availabilitySlots || emp.availabilities || [];
  if (!Array.isArray(slots) || slots.length === 0) {
    return false;
  }

  // Parse shift date day of week: 0 = Sun, 1 = Mon, ..., 6 = Sat
  let dayOfWeek = -1;
  if (shift.shiftDate) {
    const d = new Date(shift.shiftDate);
    if (!isNaN(d.getTime())) {
      dayOfWeek = d.getDay();
    }
  }

  if (dayOfWeek === -1) return true;

  const shiftStart = normalizeTime(shift.startTime);
  const shiftEnd = normalizeTime(shift.endTime);

  return slots.some((slot) => {
    const slotDay = Number(slot.dayOfWeek);
    if (slotDay !== dayOfWeek) return false;

    const slotStart = normalizeTime(slot.startTime);
    const slotEnd = normalizeTime(slot.endTime);

    return slotStart <= shiftStart && slotEnd >= shiftEnd;
  });
}

/**
 * Smart Candidate Recommendation for Understaffed Zones.
 * Finds employees qualified for targetZone who are either unassigned or assigned in an overstaffed zone.
 */
export function findReplacementCandidates(targetZone, allEmployees = [], currentlyAssignedStaff = [], currentShift = null) {
  if (!targetZone) return [];

  const assignedMap = new Map();
  currentlyAssignedStaff.forEach((s) => {
    const staffId = s.staffId || s.employeeId || s.staff?.id || s.id;
    if (staffId) {
      assignedMap.set(String(staffId), s);
    }
    if (s.id) {
      assignedMap.set(String(s.id), s);
    }
  });

  const candidates = [];

  allEmployees.forEach((emp) => {
    const id = String(emp.id || emp.staffId || '');
    if (!id) return;

    // Skip if on leave
    if (emp.isOnLeave) return;

    const assignedRecord = assignedMap.get(id);
    const currentZoneId = assignedRecord?.zoneId || assignedRecord?.zone?.id;

    // Skip if already assigned in target zone
    if (assignedRecord && String(currentZoneId) === String(targetZone.id)) return;

    // Check skill
    const skillCheck = validateSkillForZone(emp, targetZone);
    if (skillCheck.valid) {
      const isCurrentlyAssigned = Boolean(assignedRecord);
      const hasAvailabilityMatch = isCurrentlyAssigned || checkStaffAvailabilityForShift(emp, currentShift);

      // Scoring:
      // 3 = In this shift already (can transfer immediately)
      // 2 = Available & registered for this shift time
      // 1 = Qualified by skill, but outside registered availability
      let priorityScore = 1;
      let availabilityStatus = 'OUTSIDE_AVAILABILITY';

      if (isCurrentlyAssigned) {
        priorityScore = 3;
        availabilityStatus = 'TRANSFER';
      } else if (hasAvailabilityMatch) {
        priorityScore = 2;
        availabilityStatus = 'AVAILABLE';
      }

      candidates.push({
        employee: emp,
        id,
        staffId: id,
        name: emp.fullName || emp.name || emp.staffName || 'Nhân viên',
        role: emp.role || emp.position || emp.skillName || 'Nhân sự',
        skillMatched: skillCheck.skillMatched,
        isCurrentlyAssigned,
        hasAvailabilityMatch,
        availabilityStatus,
        currentZoneId,
        currentZoneName: assignedRecord?.zoneName || assignedRecord?.zone?.name || 'Chưa xếp ca',
        priorityScore,
      });
    }
  });

  // Sort: Top priority first (Transfer -> Available -> Outside availability), then alphabetical
  candidates.sort((a, b) => b.priorityScore - a.priorityScore || a.name.localeCompare(b.name));

  return candidates;
}
