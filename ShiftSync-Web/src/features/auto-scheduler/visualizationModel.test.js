import test from 'node:test';
import assert from 'node:assert/strict';
import {assignmentChanges, replayShifts, shiftsInWindow} from './visualizationModel.js';

test('recreated IDs do not fake new placement; moving zone produces remove/add', () => {
  const before=[{id:'s',shiftAssignments:[{id:'old',staffId:'a',zoneId:'z'}]}];
  assert.deepEqual(assignmentChanges(before,[{id:'s',shiftAssignments:[{id:'new',staffId:'a',zoneId:'z'}]}]),[]);
  const after=[{id:'s',shiftAssignments:[{staffId:'a',zoneId:'other'}]}];
  const changes=assignmentChanges(before,after);
  assert.deepEqual(changes.map(c=>c.type),['removed','added']);
  assert.equal(replayShifts(before,after,changes,1)[0].shiftAssignments.length,0);
  assert.deepEqual(replayShifts(before,after,changes,2),after);
  assert.equal(before[0].shiftAssignments[0].zoneId,'z');
});
test('new and removed shifts replay to the exact server result', () => {
  const before=[{id:'old',shiftAssignments:[{staffId:'a'}]}];
  const after=[{id:'new',shiftAssignments:[{staffId:'b'}]}];
  const changes=assignmentChanges(before,after);
  assert.equal(changes.length,2);
  assert.deepEqual(replayShifts(before,after,changes,2),after);
  assert.equal(replayShifts(before,after,changes,0).find(s=>s.id==='new').shiftAssignments.length,0);
});
test('date window excludes unrelated shifts and rejects malformed success bodies', () => {
  const data=[{id:'a',shiftDate:'2026-10-20'},{id:'b',shiftDate:'2026-11-01'}];
  assert.deepEqual(shiftsInWindow({content:data},'2026-10-19','2026-10-25'),[data[0]]);
  assert.throws(()=>shiftsInWindow({},'2026-10-19','2026-10-25'));
});
