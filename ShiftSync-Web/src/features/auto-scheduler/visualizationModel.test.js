import test from 'node:test';
import assert from 'node:assert/strict';
import {assignmentChanges, replayShifts, shiftsInWindow, previewShifts} from './visualizationModel.js';

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

test('preview replaces the entire eligible shift snapshot and preserves unrelated published shifts', () => {
  const before=[{id:'draft',shiftDate:'2030-11-03',name:'Ca nháp',shiftAssignments:[{staffId:'old',source:'AUTO'},{staffId:'manual',source:'MANUAL'}]},
    {id:'published',status:'PUBLISHED',shiftDate:'2030-11-03',shiftAssignments:[{staffId:'unchanged'}]}];
  const plan={id:'draft',shiftDate:'2030-11-03',startTime:'09:00',endTime:'17:00',shiftAssignments:[{staffId:'new',source:'AUTO'},{staffId:'manual',source:'MANUAL'}]};
  const after=previewShifts(before,{dryRun:true,plannedShifts:[plan]},'2030-11-01','2030-11-07');
  assert.equal(after[0].name,'Ca nháp');assert.equal(after[0].previewOnly,true);
  assert.deepEqual(after[0].shiftAssignments.map(a=>a.staffId),['new','manual']);assert.equal(after[1],before[1]);
  assert.deepEqual(assignmentChanges(before,after).map(c=>[c.type,c.assignment.staffId]),[['removed','old'],['added','new']]);
  assert.equal(before[0].shiftAssignments[0].staffId,'old');
});

test('generated preview shifts appear even when the persisted schedule was empty', () => {
  const plan={id:'temporary',shiftDate:'2030-11-03',startTime:'22:00',endTime:'06:00',shiftAssignments:[{staffId:'person'}]};
  const after=previewShifts([],{dryRun:true,plannedShifts:[plan]},'2030-11-01','2030-11-07');
  assert.equal(after.length,1);assert.equal(after[0].previewOnly,true);assert.equal(assignmentChanges([],after).length,1);
});

test('an empty resulting assignment list removes old AUTO placements instead of leaving stale people visible', () => {
  const plan={id:'draft',shiftDate:'2030-11-03',startTime:'09:00',endTime:'17:00',shiftAssignments:[]};
  const after=previewShifts([{...plan,shiftAssignments:[{staffId:'old'}]}],{dryRun:true,plannedShifts:[plan]},'2030-11-01','2030-11-07');
  assert.deepEqual(after[0].shiftAssignments,[]);
});

test('missing, duplicate or malformed preview snapshots cannot masquerade as a concrete plan', () => {
  const plan={id:'draft',shiftDate:'2030-11-03',startTime:'09:00',endTime:'17:00',shiftAssignments:[]};
  for(const result of [{},{dryRun:true,plannedShifts:null},{dryRun:true,plannedShifts:[plan,plan]},{dryRun:true,plannedShifts:[{...plan,shiftDate:'2030-12-01'}]},
    {dryRun:true,plannedShifts:[{...plan,shiftAssignments:null}]},{dryRun:true,plannedShifts:[{...plan,shiftAssignments:[{}]}]}]) {
    assert.throws(()=>previewShifts([],result,'2030-11-01','2030-11-07'));
  }
  assert.deepEqual(previewShifts([],{dryRun:true,plannedShifts:[]},'2030-11-01','2030-11-07'),[]);
});

test('preview rejects a saved response or a plan from another store or scheduling window', () => {
  const shift={id:'draft',storeId:'store',shiftDate:'2030-11-03',startTime:'09:00',endTime:'17:00',shiftAssignments:[]};
  const result={dryRun:true,storeId:'store',startDate:'2030-11-01',endDate:'2030-11-07',plannedShifts:[shift]};
  assert.equal(previewShifts([],result,result.startDate,result.endDate,'store').length,1);
  for(const invalid of [{...result,dryRun:false},{...result,storeId:'other'},{...result,endDate:'2030-11-08'},
    {...result,plannedShifts:[{...shift,storeId:'other'}]}]) {
    assert.throws(()=>previewShifts([],invalid,result.startDate,result.endDate,'store'));
  }
});
