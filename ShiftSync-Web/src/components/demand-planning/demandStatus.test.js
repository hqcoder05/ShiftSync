import test from 'node:test';
import assert from 'node:assert/strict';
import {demandStatus,demandSummary} from './demandStatus.js';
test('target differs from min-max compliance; exceeding max always requires review',()=>{
 const q={min:1,target:2,max:3};
 for(const [count,kind] of [[0,'under'],[1,'within'],[2,'target'],[3,'within'],[4,'over']]) assert.equal(demandStatus({...q,count}).kind,kind);
 assert.equal(demandStatus().kind,'unknown');
 assert.equal(demandStatus({...q,count:null}).kind,'unknown');
});
test('summary counts planned slots and hours, without claiming unique employees',()=>{
 const q={min:1,target:2,max:2};
 const s=demandSummary([{durationHours:8.5,quotas:[{...q,count:1},{...q,count:2},{...q,count:3}]}]);
 assert.deepEqual(s,{total:3,target:1,within:1,review:1,slots:6,hours:51});
 assert.equal(demandSummary([{quotas:[{...q,count:2}]}]).hours,null);
});
