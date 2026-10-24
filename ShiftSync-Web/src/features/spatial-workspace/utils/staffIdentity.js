/**
 * staffIdentity.js
 * Normalized Staff & Assignment Identity Helpers for ShiftSync Digital Twin.
 * 
 * RESOLVES: GAP-SP-003 & AUD-002 Identity Collision.
 * Distinguishes unequivocally between Staff User ID (staff.id) and Shift Assignment ID (shift_assignment.id).
 */

/**
 * Validates if a value is a valid non-empty identifier (string or number).
 */
export function isValidId(val) {
  if (val === null || val === undefined) return false;
  const str = String(val).trim();
  if (str === '' || str === 'undefined' || str === 'null' || str === '[object Object]') return false;
  return true;
}

/**
 * Checks if an object represents a Shift Assignment rather than a pure Staff User.
 */
export function isAssignmentObject(obj) {
  if (!obj || typeof obj !== 'object') return false;
  if (isValidId(obj.assignmentId)) return true;
  if (isValidId(obj.staffId)) return true;
  if (isValidId(obj.shiftId)) return true;
  if (obj.source === 'ASSIGNMENT' || obj.isAssignment === true) return true;
  return false;
}

/**
 * Checks if an object represents a pure Staff/User record (e.g. from employees / user registry).
 */
export function isStaffObject(obj) {
  if (!obj || typeof obj !== 'object') return false;
  if (obj.fullName || obj.email || obj.systemRole || obj.staffCode || obj.phone) {
    // If it has staffId that differs from id, it's an assignment projection
    if (isValidId(obj.staffId) && isValidId(obj.id) && String(obj.staffId) !== String(obj.id)) {
      return false;
    }
    return !isValidId(obj.shiftId);
  }
  return false;
}

/**
 * Extracts the canonical Staff User ID (staff.id) from any supported object or identifier.
 * 
 * Rules:
 * 1. String/Number: Returns formatted string if valid ID.
 * 2. Assignment / Simulation item: Returns target.staffId or target.staff?.id.
 * 3. User / Staff item: Returns target.id.
 * 4. Three.js Avatar Mesh: Traverses target.userData.employee.
 * 5. Returns null if ID cannot be determined or is invalid.
 * 
 * @param {Object|string|number} target
 * @returns {string|null}
 */
export function getStaffId(target) {
  if (!target) return null;

  // Primitive ID passed directly
  if (typeof target === 'string' || typeof target === 'number') {
    return isValidId(target) ? String(target).trim() : null;
  }

  if (typeof target !== 'object') return null;

  // Three.js Object3D / Avatar Mesh check
  if (target.userData?.employee) {
    return getStaffId(target.userData.employee);
  }

  // Priority 1: Explicit staffId field (Present in ShiftAssignmentDTO, diffs, simulation staff)
  if (isValidId(target.staffId)) {
    return String(target.staffId).trim();
  }

  // Priority 2: Nested staff relation (e.g. assignment.staff.id)
  if (target.staff && typeof target.staff === 'object' && isValidId(target.staff.id)) {
    return String(target.staff.id).trim();
  }

  // Priority 3: Alternative employeeId alias
  if (isValidId(target.employeeId)) {
    return String(target.employeeId).trim();
  }

  // Priority 4: Pure Staff / User object (id is the Staff ID)
  if (isStaffObject(target) && isValidId(target.id)) {
    return String(target.id).trim();
  }

  // Priority 5: Fallback only when object does NOT have assignment semantics
  if (isValidId(target.id) && !isAssignmentObject(target)) {
    return String(target.id).trim();
  }

  return null;
}

/**
 * Extracts the canonical Assignment ID (shift_assignment.id) from an object.
 * Returns null if the object is a pure Staff/User record or lacks an assignment identifier.
 * 
 * @param {Object} target
 * @returns {string|null}
 */
export function getAssignmentId(target) {
  if (!target || typeof target !== 'object') return null;

  // Three.js Object3D / Avatar Mesh check
  if (target.userData?.employee) {
    return getAssignmentId(target.userData.employee);
  }

  // Priority 1: Explicit assignmentId field
  if (isValidId(target.assignmentId)) {
    return String(target.assignmentId).trim();
  }

  // Priority 2: ShiftAssignmentDTO where id is the assignment ID
  if (isAssignmentObject(target) && isValidId(target.id)) {
    return String(target.id).trim();
  }

  return null;
}

/**
 * Compares two staff entities or identifiers to check if they refer to the exact same staff member.
 * Safe against mixed types (Object vs ID string, Assignment vs Staff user).
 * 
 * @param {Object|string} a
 * @param {Object|string} b
 * @returns {boolean}
 */
export function areSameStaff(a, b) {
  const idA = getStaffId(a);
  const idB = getStaffId(b);
  if (!idA || !idB) return false;
  return idA === idB;
}

/**
 * Compares two assignment entities to check if they refer to the exact same shift assignment.
 * 
 * @param {Object} a
 * @param {Object} b
 * @returns {boolean}
 */
export function areSameAssignment(a, b) {
  const idA = getAssignmentId(a);
  const idB = getAssignmentId(b);
  if (!idA || !idB) return false;
  return idA === idB;
}
