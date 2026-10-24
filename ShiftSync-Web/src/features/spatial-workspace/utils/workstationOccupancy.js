/**
 * workstationOccupancy.js
 * High-performance, verified resolution engine for Workstation Occupancy & Staff Visualization.
 * 
 * Complies with strict architectural constraints:
 * 1. Three distinct states: 'ASSIGNED', 'UNASSIGNED', and 'UNKNOWN'.
 * 2. Never treats API errors or loading states as 'UNASSIGNED'.
 * 3. Distinguishes Scheduled Assignment from Actual Presence (Attendance check-in).
 * 4. Traverses staff identity safely using staffIdentity helpers.
 * 5. Requires explicit workstation binding; zone-only allocation stays at zone level.
 */

import { getStaffId, getAssignmentId } from './staffIdentity.js';

export const OCCUPANCY_STATES = {
  ASSIGNED: 'ASSIGNED',
  UNASSIGNED: 'UNASSIGNED',
  UNKNOWN: 'UNKNOWN',
};

/**
 * Resolves occupancy and staff presence for all workstations in the current store and shift.
 * 
 * @param {Array} workstations - List of Store Workstations
 * @param {Array} staffAssignments - Active staff assignments for the selected shift
 * @param {Array} attendanceRecords - Store/Shift attendance check-in records
 * @param {Object} options - Context flags { isLoading, error, hasShiftSelected, currentShift }
 * @returns {Map<string, Object>} Map of workstationId -> OccupancyData
 */
export function resolveWorkstationOccupancies(
  workstations = [],
  staffAssignments = [],
  attendanceRecords = [],
  options = {}
) {
  const { isLoading = false, error = null, hasShiftSelected = true, currentShift = null } = options;
  const occupancyMap = new Map();

  if (!Array.isArray(workstations)) return occupancyMap;

  // Case 1: Unknown state when data is incomplete, loading, or errored
  if (isLoading || error || !hasShiftSelected || !currentShift) {
    const reason = isLoading
      ? 'Đang tải dữ liệu ca làm việc...'
      : error
      ? `Lỗi tải dữ liệu: ${error.message || error}`
      : 'Chưa chọn ca làm việc để đối chiếu vị trí';

    workstations.forEach((ws) => {
      occupancyMap.set(ws.id, {
        workstationId: ws.id,
        workstationName: ws.name || ws.code || 'Trạm làm việc',
        state: OCCUPANCY_STATES.UNKNOWN,
        statusReason: reason,
        assignedStaff: [],
        occupancyCount: 0,
        capacity: Number(ws.capacity) || 1,
        isOverCapacity: false,
        hasAttendanceData: false,
      });
    });
    return occupancyMap;
  }

  // 1. Index attendance records by staff UUID & assignment ID for O(1) lookup
  const attendanceByStaffId = new Map();
  const attendanceByAssignmentId = new Map();

  if (Array.isArray(attendanceRecords)) {
    attendanceRecords.forEach((att) => {
      const sId = String(att.staffId || '').trim();
      const aId = String(att.shiftAssignmentId || '').trim();

      if (sId) attendanceByStaffId.set(sId, att);
      if (aId) attendanceByAssignmentId.set(aId, att);

    });
  }

  // Helper to extract attendance info for a staff member / assignment
  const getAttendanceInfo = (staffObj, assignId) => {
    const sId = getStaffId(staffObj);
    let record = null;
    if (assignId && attendanceByAssignmentId.has(String(assignId))) {
      record = attendanceByAssignmentId.get(String(assignId));
    } else if (sId && attendanceByStaffId.has(String(sId))) {
      const candidate = attendanceByStaffId.get(String(sId));
      // A record for another assignment must never mark this assignment present.
      if (!candidate.shiftAssignmentId && candidate.shiftId === currentShift.id) record = candidate;

    }

    if (!record) {
      return {
        hasAttendance: false,
        isPresent: false,
        checkInTime: null,
        checkOutTime: null,
        attendanceStatus: null,
      };
    }

    const isPresent = Boolean(record.checkInTime && !record.checkOutTime);
    return {
      hasAttendance: true,
      isPresent,
      checkInTime: record.checkInTime || null,
      checkOutTime: record.checkOutTime || null,
      attendanceStatus: record.status || null,
    };
  };

  // 2. Direct Workstation Assignments Mapping (workstationId === ws.id)
  const assignmentsByWsId = new Map();

  (staffAssignments || []).forEach((assign) => {
    if (!assign || typeof assign !== 'object') return;
    if (!getStaffId(assign)) return;
    const targetWsId = assign.workstationId || assign.workstation?.id;
    if (targetWsId) {
      if (!assignmentsByWsId.has(targetWsId)) assignmentsByWsId.set(targetWsId, []);
      assignmentsByWsId.get(targetWsId).push(assign);

    }
  });

  // 4. Resolve state for each workstation
  workstations.forEach((ws) => {
    const wsId = ws.id;
    const capacity = Number(ws.capacity) || 1;
    let assignedList = [];

    // Check direct assignment first
    if (assignmentsByWsId.has(wsId) && assignmentsByWsId.get(wsId).length > 0) {
      const directList = assignmentsByWsId.get(wsId);
      directList.forEach((assign) => {
        const sId = getStaffId(assign);
        const aId = getAssignmentId(assign);
        const attInfo = getAttendanceInfo(assign, aId);

        assignedList.push({
          staffId: sId,
          staffName: assign.staffName || assign.fullName || 'Nhân viên',
          skillName: assign.skillName || 'Nhân sự',
          assignmentId: aId,
          isDirectMapping: true,
          ...attInfo,
        });
      });
    }

    // Zone allocation is not proof of a workstation assignment.
    // Keep those employees at zone level rather than inventing a station binding.

    const occupancyCount = assignedList.length;
    const isOverCapacity = occupancyCount > capacity;
    const isAssigned = occupancyCount > 0;

    let state;
    let statusReason;

    if (isAssigned) {
      state = OCCUPANCY_STATES.ASSIGNED;
      const presentCount = assignedList.filter((s) => s.isPresent).length;
      if (presentCount > 0) {
        statusReason = `Đang trực (${presentCount}/${occupancyCount} có mặt)`;
      } else {
        statusReason = `Đã phân công (${occupancyCount} nhân sự theo lịch)`;
      }
    } else {
      state = OCCUPANCY_STATES.UNASSIGNED;
      statusReason = 'Trống (Chưa có nhân sự phân công)';
    }

    occupancyMap.set(wsId, {
      workstationId: wsId,
      workstationName: ws.name || ws.code || 'Trạm làm việc',
      state,
      statusReason,
      assignedStaff: assignedList,
      occupancyCount,
      capacity,
      isOverCapacity,
      hasAttendanceData: assignedList.some((s) => s.hasAttendance),
    });
  });

  return occupancyMap;
}
