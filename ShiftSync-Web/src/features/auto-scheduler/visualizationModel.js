import {assignmentsOf} from '../schedule-planner/plannerModel.js';

export function shiftsInWindow(data, start, end) {
  const list = Array.isArray(data) ? data : data?.content;
  if (!Array.isArray(list)) throw new Error('Dữ liệu lịch trả về không hợp lệ.');
  return list.filter(s => (s.shiftDate || s.date) >= start && (s.shiftDate || s.date) <= end);
}

// Compare placement, not assignment IDs: the scheduler may recreate AUTO rows.
const placement = a => JSON.stringify([a.staffId, a.zoneId || null, a.workstationId || null, a.requiredSkillId || a.skillId || null]);
export function assignmentChanges(before, after) {
  const changes = [];
  const ids = [...new Set([...before, ...after].map(s => s.id))];
  for (const shiftId of ids) {
    const old = assignmentsOf(before.find(s => s.id === shiftId));
    const next = assignmentsOf(after.find(s => s.id === shiftId));
    const unmatched = [...next];
    for (const a of old) {
      const index = unmatched.findIndex(b => placement(a) === placement(b));
      if (index >= 0) unmatched.splice(index, 1);
      else changes.push({type: 'removed', shiftId, assignment: a});
    }
    unmatched.forEach(a => changes.push({type: 'added', shiftId, assignment: a}));
  }
  return changes;
}

export function replayShifts(before, after, changes, step) {
  if (step >= changes.length) return after;
  const list = [...new Map([...before, ...after].map(s => [s.id, s])).values()]
    .map(s => ({...s, shiftAssignments: [...assignmentsOf(before.find(b => b.id === s.id))]}));
  for (const change of changes.slice(0, step)) {
    const shift = list.find(s => s.id === change.shiftId);
    if (change.type === 'added') shift.shiftAssignments.push(change.assignment);
    else {
      const index = shift.shiftAssignments.findIndex(a => placement(a) === placement(change.assignment));
      if (index >= 0) shift.shiftAssignments.splice(index, 1);
    }
  }
  return list;
}
