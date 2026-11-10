import {assignmentsOf} from '../schedule-planner/plannerModel.js';

export function shiftsInWindow(data, start, end) {
  const list = Array.isArray(data) ? data : data?.content;
  if (!Array.isArray(list)) throw new Error('Dữ liệu lịch trả về không hợp lệ.');
  return list.filter(s => (s.shiftDate || s.date) >= start && (s.shiftDate || s.date) <= end);
}

export function previewShifts(before, result, start, end, expectedStoreId) {
  if (result?.dryRun !== true || (result.startDate && result.startDate !== start) || (result.endDate && result.endDate !== end)
    || (expectedStoreId && result.storeId !== expectedStoreId)) throw new Error('Phương án thử không khớp cửa hàng hoặc khoảng ngày đang xem.');
  if (!Array.isArray(result?.plannedShifts)) throw new Error('Máy chủ chưa cung cấp danh sách phân công của phương án thử.');
  const merged = new Map(before.map(shift => [shift.id, shift]));
  const seen = new Set();
  for (const shift of result.plannedShifts) {
    if (!shift.id || seen.has(shift.id) || (expectedStoreId && shift.storeId !== expectedStoreId) || !shift.shiftDate || shift.shiftDate < start || shift.shiftDate > end
      || !shift.startTime || !shift.endTime || !Array.isArray(shift.shiftAssignments)
      || shift.shiftAssignments.some(assignment => !assignment.staffId)) {
      throw new Error('Dữ liệu phân công thử không đầy đủ hoặc không khớp khoảng ngày đang xem.');
    }
    seen.add(shift.id);
    merged.set(shift.id, {...merged.get(shift.id), ...shift, previewOnly: true});
  }
  return [...merged.values()];
}

// Compare placement, not assignment IDs: the scheduler may recreate AUTO rows.
const placement = a => JSON.stringify([a.staffId, a.zoneId || null, a.workstationId || null, a.requiredSkillId || a.skillId || null]);
const scheduledPlacement = step => JSON.stringify([step.staffId, step.zoneId || null, step.workstationId || null, step.requiredSkillId || step.skillId || null]);

export function compareShiftsChronologically(a, b) {
  const dateA = a?.shiftDate || a?.date || '';
  const dateB = b?.shiftDate || b?.date || '';
  if (dateA && dateB && dateA !== dateB) return dateA.localeCompare(dateB);
  if (dateA && !dateB) return -1;
  if (!dateA && dateB) return 1;

  const startA = a?.startTime || '';
  const startB = b?.startTime || '';
  if (startA && startB && startA !== startB) return startA.localeCompare(startB);
  if (startA && !startB) return -1;
  if (!startA && startB) return 1;

  const endA = a?.endTime || '';
  const endB = b?.endTime || '';
  if (endA && endB && endA !== endB) return endA.localeCompare(endB);

  return 0;
}

export function assignmentChanges(before, after, assignmentSequence = []) {
  const changes = [];
  const shiftMap = new Map();
  for (const s of [...before, ...after]) {
    if (s?.id) {
      shiftMap.set(s.id, { ...(shiftMap.get(s.id) || {}), ...s });
    }
  }

  // The result endpoint preserves neither the scheduler's choices nor their order.
  // Use its decision sequence whenever available; chronological ordering is only a
  // fallback for old API responses.
  const order = new Map((assignmentSequence || []).map((step, index) => [
    `${step.shiftId}:${scheduledPlacement(step)}`,
    Number.isFinite(step.sequence) ? step.sequence : index,
  ]));
  const sortedShifts = order.size
    ? [...shiftMap.values()]
    : [...shiftMap.values()].sort(compareShiftsChronologically);

  for (const shift of sortedShifts) {
    const shiftId = shift.id;
    const old = assignmentsOf(before.find(s => s.id === shiftId));
    const next = assignmentsOf(after.find(s => s.id === shiftId));
    const unmatched = [...next];
    for (const a of old) {
      const index = unmatched.findIndex(b => placement(a) === placement(b));
      if (index >= 0) unmatched.splice(index, 1);
      else changes.push({
        type: 'removed',
        shiftId,
        assignment: a,
        shiftDate: shift.shiftDate || shift.date,
        startTime: shift.startTime,
        endTime: shift.endTime,
      });
    }
    unmatched.forEach(a => changes.push({
      type: 'added',
      shiftId,
      assignment: a,
      shiftDate: shift.shiftDate || shift.date,
      startTime: shift.startTime,
      endTime: shift.endTime,
    }));
  }
  if (order.size) {
    changes.sort((left, right) => {
      const leftOrder = left.type === 'added' ? order.get(`${left.shiftId}:${placement(left.assignment)}`) : undefined;
      const rightOrder = right.type === 'added' ? order.get(`${right.shiftId}:${placement(right.assignment)}`) : undefined;
      if (leftOrder != null && rightOrder != null) return leftOrder - rightOrder;
      if (leftOrder != null) return -1;
      if (rightOrder != null) return 1;
      return compareShiftsChronologically(left, right);
    });
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
