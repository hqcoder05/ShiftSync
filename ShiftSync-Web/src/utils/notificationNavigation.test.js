import {test} from 'node:test';
import assert from 'node:assert/strict';
import {notificationRoute,legacyRequestRoute} from './notificationNavigation.js';
test('original backend types survive display normalization',()=>{
 assert.equal(notificationRoute({type:'system',sourceType:'SCHEDULE_PUBLISHED'}),'/schedule');
 assert.equal(notificationRoute({type:'system',sourceType:'WORKFORCE_REQUEST'}),'/marketplace?tab=WORKFORCE');
 assert.equal(notificationRoute({type:'attendance'}),'/attendance/explain');
 assert.equal(notificationRoute({type:'leave'}),'/attendance/leave');
 assert.equal(notificationRoute({type:'swap'}),'/marketplace?tab=SWAP');
});
test('legacy attendance links preserve tab selection',()=>{
 assert.equal(legacyRequestRoute('/time-workforce','?tab=leave'),'/attendance/leave');
 assert.equal(legacyRequestRoute('/time-workforce','?tab=adjustments'),'/attendance/explain');
 assert.equal(legacyRequestRoute('/time-workforce'),'/attendance');
});
