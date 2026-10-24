import {test} from 'node:test';
import assert from 'node:assert/strict';
import {overlapsShift,plannerWarnings,candidateReasons,withDrafts} from './plannerModel.js';
const zone={id:'pos',name:'Thu ngân',capacity:1};
const shift={id:'a',name:'Sáng',shiftDate:'2026-10-19',startTime:'08:00',endTime:'12:00',shiftAssignments:[]};
test('Adjacent shifts do not conflict and overnight shifts conflict across dates',()=>{
 assert.equal(overlapsShift(shift,{...shift,startTime:'12:00',endTime:'16:00'}),false);
 assert.equal(overlapsShift({...shift,startTime:'22:00',endTime:'06:00'},{...shift,shiftDate:'2026-10-20',startTime:'05:00',endTime:'08:00'}),true);
});
test('Draft overlap and orphan assignment are surfaced with names',()=>{
 const first={...shift,shiftAssignments:[{staffId:'one',staffName:'Lan',zoneId:'pos'}]};
 const second={...shift,id:'b',name:'Trưa',startTime:'11:00',shiftAssignments:[{staffId:'one',staffName:'Lan',zoneId:'missing'}]};
 const warnings=plannerWarnings([first,second],[zone]);assert.equal(warnings.length,2);assert.ok(warnings.some(w=>w.message.includes('trùng lịch')));
});
test('Draft adds without mutating server data and blocks duplicate candidates',()=>{
 const original=[shift],drafts=[{staffId:'one',shiftId:'a',zoneId:'pos'}],planned=withDrafts(original,drafts);
 assert.equal(original[0].shiftAssignments.length,0);assert.equal(planned[0].shiftAssignments.length,1);
 assert.ok(candidateReasons({staffId:'one'},planned[0],zone,planned,new Set(['one'])).some(r=>r.includes('Đã được')));
});
test('Eligibility failure, skill mismatch and full capacity block assigning',()=>{
 assert.ok(candidateReasons({id:'one'},shift,zone,[shift],new Set()).length);
 assert.ok(candidateReasons({id:'one',skills:[]},shift,{...zone,requiredSkillId:'cash'},[shift],new Set(['one'])).some(r=>r.includes('kỹ năng')));
 const full={...shift,shiftAssignments:[{staffId:'other',zoneId:'pos'}]};
 assert.ok(candidateReasons({id:'one'},full,zone,[full],new Set(['one'])).some(r=>r.includes('sức chứa')));
});
test('Cancelled shifts do not create phantom conflicts',()=>{
 const cancelled={...shift,status:'CANCELLED',shiftAssignments:[{staffId:'one',zoneId:'missing'}]};
 assert.equal(plannerWarnings([cancelled],[zone]).length,0);
 assert.equal(candidateReasons({id:'one'},shift,zone,[cancelled,shift],new Set(['one'])).length,0);
});
test('Over-capacity and missing identity are warned, missing IDs cannot become candidates',()=>{
 const invalid={...shift,shiftAssignments:[{staffId:'one',zoneId:'pos'},{staffId:'two',zoneId:'pos'},{}]};
 const warnings=plannerWarnings([invalid],[zone]);assert.ok(warnings.some(w=>w.message.includes('vượt sức chứa')));assert.ok(warnings.some(w=>w.message.includes('thiếu định danh')));
 assert.ok(candidateReasons({},shift,zone,[shift],new Set([undefined])).some(r=>r.includes('định danh')));
});
