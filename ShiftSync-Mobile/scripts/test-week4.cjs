const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const {transformSync}=require('@babel/core');
function load(file,mocks={},globals={}){const m={exports:{}};const code=transformSync(fs.readFileSync(path.resolve(file),'utf8'),{configFile:false,babelrc:false,plugins:[require.resolve('@babel/plugin-transform-modules-commonjs')]}).code;vm.runInNewContext(code,{module:m,exports:m.exports,Date,Intl,Math,Number,String,Promise,Set,console,...globals,require:id=>id in mocks?mocks[id]:load(path.resolve(path.dirname(file),id+'.js'),mocks,globals)});return m.exports;}
const report={timezone:process.env.TZ||'system',checks:[]};
async function check(name,fn){await fn();report.checks.push(name);}
const defer=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
(async()=>{
 const time=load('utils/vietnamTime.js');
 await check('Vietnam day rolls forward before UTC midnight',()=>assert.equal(time.vietnamDateKey('2026-10-28T17:01:00Z'),'2026-10-29'));
 await check('Vietnam day remains previous day before midnight boundary',()=>assert.equal(time.vietnamDateKey('2026-10-28T16:59:59Z'),'2026-10-28'));
 await check('Work date stays a civil day',()=>assert.equal(time.vietnamDateKey('2026-10-29'),'2026-10-29'));
 await check('Offset-less legacy timestamp means Vietnam time',()=>assert.equal(time.parseVietnamInstant('2026-10-29T00:30:00').toISOString(),'2026-10-28T17:30:00.000Z'));
 await check('Explicit instant keeps its original offset',()=>assert.equal(time.parseVietnamInstant('2026-10-28T17:30:00Z').toISOString(),'2026-10-28T17:30:00.000Z'));
 await check('Invalid calendar dates do not normalize silently',()=>assert.equal(time.calendarDate('2026-02-30'),null));
 await check('Invalid instant formats a safe placeholder',()=>assert.equal(time.formatVietnamTime('nonsense'),'—'));
 await check('UI calendar carrier keeps Vietnam civil fields in every device zone',()=>{const d=time.vietnamCalendarDate('2026-10-28T17:30:00Z');assert.equal(time.calendarKey(d),'2026-10-29');});
 await check('Calendar difference is stable across daylight saving transition',()=>assert.equal(time.calendarDayDifference(time.calendarDate('2026-03-15'),time.calendarDate('2026-03-08')),7));
 await check('Greeting hour follows Vietnam',()=>assert.equal(time.vietnamHour('2026-10-28T23:00:00Z'),6));
 await check('Month movement retains civil dates across years and leap days',()=>{assert.equal(time.shiftCalendarMonth('2026-12-31',1),'2027-01-01');assert.equal(time.shiftCalendarMonth('2024-03-31',-1),'2024-02-01');});
 await check('Selected month key survives a running process timezone change',()=>{const previous=process.env.TZ,key='2026-10-01';try{process.env.TZ='Pacific/Honolulu';assert.equal(time.calendarKey(time.calendarDate(key)),key);process.env.TZ='Pacific/Kiritimati';assert.equal(time.calendarKey(time.calendarDate(key)),key);}finally{if(previous==null)delete process.env.TZ;else process.env.TZ=previous;}});
 await check('Format timezone cannot be overridden by a caller',()=>assert.equal(time.formatVietnamTime('2026-10-28T17:30:00Z',{hour:'2-digit',minute:'2-digit',hourCycle:'h23',timeZone:'America/Los_Angeles'}),'00:30'));
 const RealDate=Date,now=Date.parse('2026-10-28T17:30:00Z');
 class FixedDate extends RealDate{constructor(...args){super(...(args.length?args:[now]));}static now(){return now;}}
 const writes=[],request=load('services/requestService.js',{'./api':{post:async(...args)=>{writes.push(args);return {data:{id:'qa'}};}},'./leaveService':{}},{Date:FixedDate});
 await check('Request default date uses Vietnam day, not UTC day',()=>assert.equal(request.toIsoDate(),'2026-10-29'));
 await check('Explicit civil request date is not shifted',()=>assert.equal(request.toIsoDate('29/10/2026'),'2026-10-29'));
 await check('Support request transmits the Vietnam civil date',async()=>{await request.createStaffRequest({typeCategory:'support',content:'QA calendar boundary'},'store');assert.equal(writes[0][1].startDate,'2026-10-29');assert.equal(writes[0][1].endDate,'2026-10-29');});
 const vi=load('i18n/vi.js').default,en=load('i18n/en.js').default;
 await check('Basic Vietnamese and English dictionaries have the same keys',()=>assert.deepEqual(Object.keys(vi).sort(),Object.keys(en).sort()));
 await check('Both dictionaries contain readable nonempty values',()=>assert.ok([...Object.values(vi),...Object.values(en)].every(x=>typeof x==='string'&&x.trim())));
 const touch=load('utils/touchTarget.js');
 await check('48dp minimum wins over a small inline layout',()=>assert.equal(touch.ensureTouchTarget({width:24,minHeight:20}).at(-1).minHeight,48));
 await check('Pressed styles still receive their original state',()=>assert.equal(touch.ensureTouchTarget(({pressed})=>({opacity:pressed?.5:1}))({pressed:true})[0].opacity,.5));
 const {createResumeCoordinator}=load('services/resumeCoordinator.js');
 function fixture(extra={}){let owner={email:'a@example.invalid',token:'token'},online=true,active=true;const calls=[];const c=createResumeCoordinator({readSession:async()=>owner,validate:async()=>calls.push('validate'),syncShifts:async()=>calls.push('shifts'),isOnline:()=>online,isActive:()=>active,publish:()=>calls.push('publish'),onError:()=>calls.push('error'),...extra});return {c,calls,owner:v=>owner=v,online:v=>online=v,active:v=>active=v};}
 await check('Resume validates token before syncing and publishing',async()=>{const f=fixture();await f.c.request();assert.deepEqual(f.calls,['validate','shifts','publish']);});
 await check('Offline resume keeps existing data without network writes',async()=>{const f=fixture();f.online(false);await f.c.request();assert.deepEqual(f.calls,[]);});
 await check('No session never triggers authenticated reads',async()=>{const f=fixture();f.owner({});await f.c.request();assert.deepEqual(f.calls,[]);});
 await check('Rejected token prevents shift sync and publication',async()=>{const f=fixture({validate:async()=>{throw Error('revoked');}});await f.c.request();assert.deepEqual(f.calls,['error']);});
 await check('Account switch during validation never publishes old-account state',async()=>{const d=defer(),f=fixture({validate:()=>d.promise});const p=f.c.request();await Promise.resolve();await Promise.resolve();f.owner({email:'b@example.invalid',token:'b'});d.resolve();await p;assert.deepEqual(f.calls,[]);});
 await check('Backgrounding invalidates an in-flight resume',async()=>{const d=defer(),f=fixture({syncShifts:()=>d.promise});const p=f.c.request();for(let i=0;i<5;i++)await Promise.resolve();f.active(false);f.c.suspend();d.resolve();await p;assert.deepEqual(f.calls,['validate']);});
 await check('A refreshed token for the same person is accepted',async()=>{let f;f=fixture({validate:async()=>f.owner({email:'a@example.invalid',token:'new-token'})});await f.c.request();assert.deepEqual(f.calls,['shifts','publish']);});
 await check('Rapid resume requests run serially with a bounded trailing sync',async()=>{const d=defer();let runs=0;const f=fixture({validate:async()=>{runs++;if(runs===1)await d.promise;}});const p=f.c.request();for(let i=0;i<5;i++)f.c.request();d.resolve();await p;assert.equal(runs,2);assert.deepEqual(f.calls,['shifts','publish','shifts','publish']);});
 await check('Disposal prevents in-flight publication and future work',async()=>{const d=defer(),f=fixture({validate:()=>d.promise});const p=f.c.request();await Promise.resolve();f.c.stop();d.resolve();await p;await f.c.request();assert.deepEqual(f.calls,[]);});
 console.log(`${report.checks.length} Week 4 checks passed (${report.timezone})`);
 if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify({...report,result:'PASS'},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
