import {test} from 'node:test';
import assert from 'node:assert/strict';
import {marketplaceTiming,vietnamDate} from './marketplaceTime.js';
const shift={shiftDate:'2026-10-22',startTime:'14:00:00',endTime:'22:00:00',status:'PUBLISHED'};
test('old shifts are closed and ended; future shifts are recruitable',()=>{
 assert.equal(marketplaceTiming({...shift,shiftDate:'2026-09-25'},Date.parse('2026-10-22T08:00:00+07:00')).label,'Đã kết thúc');
 assert.equal(marketplaceTiming(shift,Date.parse('2026-10-22T13:59:59+07:00')).recruitmentOpen,true);
});
test('exact start closes recruitment while exact end marks ended',()=>{
 const start=marketplaceTiming(shift,Date.parse('2026-10-22T14:00:00+07:00'));
 assert.equal(start.recruitmentOpen,false);assert.equal(start.ended,false);
 assert.equal(marketplaceTiming(shift,Date.parse('2026-10-22T22:00:00+07:00')).ended,true);
});
test('overnight shift ends the next day instead of the previous evening',()=>{
 const overnight={...shift,startTime:'22:00:00',endTime:'06:00:00'};
 assert.equal(marketplaceTiming(overnight,Date.parse('2026-10-23T05:59:59+07:00')).ended,false);
 assert.equal(marketplaceTiming(overnight,Date.parse('2026-10-23T06:00:00+07:00')).ended,true);
});
test('deadline closes recruitment before shift start, with or without offset',()=>{
 for(const availabilityDeadline of ['2026-10-22T12:00:00+07:00','2026-10-22T05:00:00Z','2026-10-22T12:00:00']){
  const state=marketplaceTiming({...shift,availabilityDeadline},Date.parse('2026-10-22T12:00:00+07:00'));
  assert.equal(state.recruitmentOpen,false);assert.equal(state.isDeadlineExpired,true);assert.equal(state.isPastOrStarted,false);
 }
});
test('cancelled or incomplete shifts cannot recruit',()=>{
 const now=Date.parse('2026-10-22T08:00:00+07:00');
 assert.equal(marketplaceTiming({...shift,status:'CANCELLED'},now).label,'Đã hủy');
 assert.equal(marketplaceTiming({...shift,startTime:null},now).recruitmentOpen,false);
 assert.equal(marketplaceTiming({...shift,availabilityDeadline:'invalid'},now).recruitmentOpen,false);
});
test('business date and shift times are independent of browser timezone',()=>{
 assert.equal(vietnamDate(Date.parse('2026-10-21T18:00:00Z')),'2026-10-22');
 assert.equal(marketplaceTiming(shift,Date.parse('2026-10-22T07:00:00Z')).isPastOrStarted,true);
});
