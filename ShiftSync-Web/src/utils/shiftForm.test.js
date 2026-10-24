import {test} from 'node:test';
import assert from 'node:assert/strict';
import {newShiftDefaults,validateShiftForm,shiftRegistrationDeadline} from './shiftForm.js';
const now=Date.parse('2026-10-22T10:00:00+07:00'),store={openTime:'06:00:00',closeTime:'23:00:00'};
test('past week opens on today at a future quarter hour and an eight-hour shift',()=>{
 assert.deepEqual(newShiftDefaults(store,'2026-10-19',now),{shiftDate:'2026-10-22',startTime:'10:15',endTime:'18:15'});
});
test('after closing defaults to next opening; future cell preserves date',()=>{
 assert.deepEqual(newShiftDefaults(store,'2026-10-22',Date.parse('2026-10-22T23:15:00+07:00')),{shiftDate:'2026-10-23',startTime:'06:00',endTime:'14:00'});
 assert.equal(newShiftDefaults(store,'2026-10-25',now).shiftDate,'2026-10-25');
});
test('creation rejects past/current start; edit permits history; opening hours still checked',()=>{
 const form={shiftDate:'2026-10-22',startTime:'10:00',endTime:'18:00'};
 assert.match(validateShiftForm(form,store,'create',now),/quá khứ/);
 assert.equal(validateShiftForm(form,store,'edit',now),'');
 assert.match(validateShiftForm({...form,startTime:'05:00'},store,'edit',now),/mở cửa/);
 assert.match(validateShiftForm({...form,endTime:'23:30'},store,'edit',now),/đóng cửa/);
 assert.match(validateShiftForm({...form,endTime:'09:00'},store,'edit',now),/sau giờ/);
});
test('deadline uses VN shift start and never creates an already-expired recruitment window',()=>{
 assert.equal(shiftRegistrationDeadline({shiftDate:'2026-10-24',startTime:'08:00'},24,now),'2026-10-23T01:00:00.000Z');
 assert.equal(shiftRegistrationDeadline({shiftDate:'2026-10-22',startTime:'11:00'},24,now),'2026-10-22T04:00:00.000Z');
});

