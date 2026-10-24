import test from 'node:test';
import assert from 'node:assert/strict';
import { entityIdentity, resolveInfoSelection, findStaffAttendance } from './spatialInfoModel.js';

test('selection resolves the current assignment snapshot rather than a stale object', () => {
  const old = { id: 'a1', assignmentId: 'a1', staffId: 'p1', staffName: 'Old' };
  const latest = { ...old, staffName: 'Updated', workstationId: 'w2' };
  const selection = { type: 'staff', id: entityIdentity('staff', old) };
  assert.equal(resolveInfoSelection(selection, { staff: [latest] }).data, latest);
  assert.equal(resolveInfoSelection(selection, { staff: [{ ...latest, id: 'a2', assignmentId: 'a2' }] }), null);
});
test('removed entities close and workstation IDs do not select zones with the same ID', () => {
  assert.equal(resolveInfoSelection({ type: 'workstation', id: 'w1' }, { zones: [{ id: 'w1' }] }), null);
  assert.equal(resolveInfoSelection(null, {}), null);
});
test('zone selection uses the physical view frame from the latest snapshot', () => {
  const zone = { id: 'z1', physicalFrame: { x: 5, z: -2 } };
  assert.equal(resolveInfoSelection({ type: 'zone', id: 'z1' }, { zones: [zone] }).data.physicalFrame, zone.physicalFrame);
});
test('attendance matches the assignment before staff and never borrows another shift', () => {
  const person = { assignmentId: 'a1', staffId: 'p1' };
  const records = [{ id: 'wrong', shiftAssignmentId: 'a2', staffId: 'p1', shiftId: 's1' }, { id: 'correct', shiftAssignmentId: 'a1' }];
  assert.equal(findStaffAttendance(person, records, 's1').id, 'correct');
  assert.equal(findStaffAttendance(person, records.slice(0, 1), 's1'), null);
  assert.equal(findStaffAttendance(person, [{ staffId: 'p1', shiftId: 's2' }], 's1'), null);
  assert.equal(findStaffAttendance(person, [{ staffId: 'p1', shiftId: 's1' }], 's1').shiftId, 's1');
});
