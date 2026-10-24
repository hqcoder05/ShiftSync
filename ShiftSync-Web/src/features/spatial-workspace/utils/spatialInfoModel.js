import { getStaffId, getAssignmentId } from './staffIdentity.js';

export function entityIdentity(type, item) {
  return type === 'staff' ? String(getAssignmentId(item) || getStaffId(item) || '') : String(item?.id || '');
}

/** Resolve the selected ID against the newest snapshot, never the stale click payload. */
export function resolveInfoSelection(selection, { staff = [], workstations = [], zones = [] }) {
  if (!selection) return null;
  const source = selection.type === 'staff' ? staff : selection.type === 'workstation' ? workstations : zones;
  const data = source.find(item => entityIdentity(selection.type, item) === selection.id);
  return data ? { ...selection, data } : null;
}

export function findStaffAttendance(person, records, shiftId) {
  const assignmentId = getAssignmentId(person);
  return records.find(record => assignmentId && String(record.shiftAssignmentId || '') === String(assignmentId))
    || records.find(record => !record.shiftAssignmentId && shiftId && record.shiftId === shiftId && String(record.staffId) === String(getStaffId(person)))
    || null;
}
