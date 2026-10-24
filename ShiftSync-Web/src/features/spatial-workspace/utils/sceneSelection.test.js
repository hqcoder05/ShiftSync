import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickSceneEntity } from './sceneSelection.js';
test('Decorative GLB and unbound semantic nodes do not swallow a workstation hit', () => {
 const station = { id: 'ws' };
 const parent = { visible:true, userData:{isWorkstation:true,workstation:station} };
 assert.deepEqual(pickSceneEntity([{object:{userData:{isZone:true}}},{object:{parent}}]),{type:'workstation',value:station});
});
test('Hidden furniture/avatars cannot intercept clicks through any hidden ancestor', () => {
 const hidden = { visible:false };
 const staff = {userData:{isPerson:true,employee:{id:'staff'}},parent:hidden};
 const zone = {userData:{isZone:true,zone:{id:'zone'}}};
 assert.equal(pickSceneEntity([{object:staff},{object:zone}]).type,'zone');
});
test('Nearest visible employee wins and empty hits clear selection', () => {
 const employee = {id:'s'};
 assert.equal(pickSceneEntity([{object:{userData:{isPerson:true,employee}}}]).value,employee);
 assert.equal(pickSceneEntity([]),null);
});
