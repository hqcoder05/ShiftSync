import { test } from 'node:test';
import assert from 'node:assert/strict';
import {getShiftTimeRange,formatShiftMinute,isWithinShift} from './shiftTimeRange.js';
test('Timeline follows selected shift including midnight instead of a fixed business day',()=>{
 assert.deepEqual(getShiftTimeRange({startTime:'00:00',endTime:'23:59'}),{start:0,end:1439});
 assert.deepEqual(getShiftTimeRange({startTime:'08:00',endTime:'16:00'}),{start:480,end:960});
});
test('Overnight shift remains continuous and marks the next day',()=>{
 const shift={startTime:'22:00',endTime:'06:00'};
 assert.deepEqual(getShiftTimeRange(shift),{start:1320,end:1800});
 assert.equal(formatShiftMinute(1500),'01:00 (+1 ngày)');
 assert.equal(isWithinShift(1500,shift),true);assert.equal(isWithinShift(1200,shift),false);
});
