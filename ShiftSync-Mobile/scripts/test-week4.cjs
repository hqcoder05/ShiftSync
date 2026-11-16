const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const {transformSync}=require('@babel/core');
function load(file,mocks={},globals={}){const m={exports:{}};const code=transformSync(fs.readFileSync(path.resolve(file),'utf8'),{configFile:false,babelrc:false,plugins:[require.resolve('@babel/plugin-transform-modules-commonjs')]}).code;vm.runInNewContext(code,{module:m,exports:m.exports,Date,Intl,Math,Number,String,Promise,Set,console,...globals,require:id=>id in mocks?mocks[id]:load(path.resolve(path.dirname(file),id+'.js'),mocks,globals)});return m.exports;}
const report={timezone:process.env.TZ||'system',checks:[]};
async function check(name,fn){await fn();report.checks.push(name);}
const defer=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
(async()=>{
 await check('Staff accounts are issued by management, not self-registered',()=>{
  const login=fs.readFileSync('screens/LoginScreen.js','utf8');
  const navigator=fs.readFileSync('navigation/AppNavigator.js','utf8');
  const auth=fs.readFileSync('../shiftsync-backend/src/main/java/com/shiftsync/auth/controller/AuthController.java','utf8');
  const security=fs.readFileSync('../shiftsync-backend/src/main/java/com/shiftsync/shared/config/SecurityConfig.java','utf8');
  const webAuth=fs.readFileSync('../ShiftSync-Web/src/services/authService.js','utf8');
  const webRegistry=fs.readFileSync('../ShiftSync-Web/src/services/allApisRegistry.js','utf8');
  assert.doesNotMatch(login,/Tạo tài khoản Staff|navigate\(['"]Register['"]\)/);
  assert.doesNotMatch(navigator,/RegisterScreen|name="Register"/);
  assert.doesNotMatch(auth,/PostMapping\("\/register"\)/);
  assert.doesNotMatch(webAuth,/auth\/register/);
  assert.doesNotMatch(webRegistry,/api\/auth\/register/);
  assert.match(security,/requestMatchers\("\/api\/auth\/login",\s*"\/api\/auth\/refresh",\s*"\/api\/auth\/logout"\)\.permitAll\(\)/);
 });
 await check('Data-heavy mobile screens preserve context with skeleton loading states',()=>{
  const screens=['screens/ScheduleScreen.js','screens/RequestScreen.js','screens/PayrollScreen.js','screens/MarketplaceScreen.js','screens/MessagingScreen.js'];
  screens.forEach(file=>assert.match(fs.readFileSync(file,'utf8'),/ContentSkeleton/));
  const availability=fs.readFileSync('screens/AvailabilityScreen.js','utf8');
  assert.match(availability,/dataLoading \? <View accessibilityLabel="Đang tải lịch rảnh"/);
  assert.match(fs.readFileSync('components/ContentSkeleton.js','utf8'),/variant === 'messages'/);
 });
 await check('Startup validates an online session before opening protected mobile screens',()=>{
  const navigator=fs.readFileSync('navigation/AppNavigator.js','utf8');
  assert.match(navigator,/await api\.get\('\/users\/me', \{ expectedSessionEmail: email, timeout: 10000 \}\)/);
  assert.match(navigator,/AsyncStorage\.multiRemove\(\['accessToken', 'refreshToken', 'userRole', 'userEmail'\]\)/);
  assert.match(navigator,/setInitialRoute\('Login'\)/);
 });
 await check('Mobile-owned web animations use Three Timer instead of deprecated Clock',()=>{
  const files=['components/AttendanceBadge3D.web.js','components/HoloCard3D.web.js','components/FlowerMascot3D.web.js','components/LoginMascot3D.web.js','components/PaperPlane3D.web.js','components/Payroll3DCharacter.web.js'];
  files.forEach(file=>{
   const source=fs.readFileSync(file,'utf8');
   assert.doesNotMatch(source,/new THREE\.Clock\(/);
   assert.match(source,/new THREE\.Timer\(/);
  });
 });
 await check('Bottom navigation uses a web-safe animation driver',()=>{
  const navbar=fs.readFileSync('components/BottomNavbar.js','utf8');
  assert.match(navbar,/Platform\.OS !== 'web'/);
  assert.match(navbar,/useNativeDriver: canUseNativeAnimationDriver/);
 });
 await check('Web-capable app animations do not force the unsupported native driver',()=>{
  const files=['components/AnimatedNotificationIcon.js','components/DashboardQuickActions.js','components/EmployeeCard3D.js','components/JoyBurst.js','screens/ProfileScreenApi.js'];
  files.forEach(file=>{
   const source=fs.readFileSync(file,'utf8');
   assert.match(source,/Platform\.OS !== 'web'/);
   assert.doesNotMatch(source,/useNativeDriver:\s*true/);
  });
 });
 await check('3D avatar does not suppress browser warnings globally',()=>{
  const avatar=fs.readFileSync('components/Avatar3D.web.js','utf8');
  assert.doesNotMatch(avatar,/console\.warn\s*=/);
  assert.doesNotMatch(avatar,/__ss_clock_filter_installed/);
 });
 await check('More screen preserves account layout while its profile is loading',()=>{
  const more=fs.readFileSync('screens/MoreScreen.js','utf8');
  assert.match(more,/Đang tải thông tin tài khoản/);
  assert.match(more,/profileSkeletonName/);
  assert.doesNotMatch(more,/ActivityIndicator/);
 });
 const time=load('utils/vietnamTime.js');
 const activity=load('services/activityService.js', {
  '../theme/koreanPalette':{colors:{}}, './api':{}, '@react-native-async-storage/async-storage':{}, './offlineCache':{},
 });
 await check('Assigned shifts and claimed shifts appear in the shift activity filter',()=>{
  assert.equal(activity.activityKind('SHIFT_ASSIGNED'),'shift');
  assert.equal(activity.activityKind('SHIFT_CLAIM'),'shift');
  assert.equal(activity.activityKind('SWAP_CREATED'),'request');
  assert.equal(activity.activityKind('INCIDENT_CREATED'),'request');
 });
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
 const cacheValues=new Map([['userEmail','staff@example.invalid'],['accessToken','token']]);
 const cacheStorage={multiGet:async keys=>keys.map(key=>[key,cacheValues.get(key)||null]),getItem:async key=>cacheValues.get(key)||null,setItem:async(key,value)=>cacheValues.set(key,value)};
 const offlineCache=load('services/offlineCache.js',{'@react-native-async-storage/async-storage':cacheStorage,'./networkState':{getNetworkSnapshot:()=>({online:true}),isNetworkFailure:()=>false}});
 await check('Concurrent reads of the same account data share one network request',async()=>{
  const gate=defer();let requests=0;
  const first=offlineCache.cachedRequest('profile',async()=>{requests++;return gate.promise;});
  const second=offlineCache.cachedRequest('profile',async()=>{requests++;return gate.promise;});
  for(let i=0;i<5;i++)await Promise.resolve();
  assert.equal(requests,1);
  gate.resolve({data:{id:'staff'}});
  const [a,b]=await Promise.all([first,second]);
  assert.deepEqual(a.data,b.data);
 });
 await check('Completed reads stay fresh and a refreshed token starts a separate request',async()=>{
  let requests=0;
  const read=()=>offlineCache.cachedRequest('profile-freshness',async()=>({data:{request:++requests}}));
  assert.equal((await read()).data.request,1);
  assert.equal((await read()).data.request,2);
  cacheValues.set('accessToken','refreshed-token');
  assert.equal((await read()).data.request,3);
  cacheValues.set('accessToken','token');
 });
 const notificationGate=defer();let notificationRequests=0;
 const notifications=load('services/notificationService.js',{
  './api':{get:async()=>{notificationRequests++;return notificationGate.promise;}},
  'react-native':{Platform:{OS:'web'}},'@react-native-async-storage/async-storage':cacheStorage,
  './offlineCache':{cachedRequest:async()=>{}},'./networkState':{getNetworkSnapshot:()=>({online:true}),isNetworkFailure:()=>false},
 });
 await check('Unread notification refreshes share one request during app startup',async()=>{
  const first=notifications.getUnreadNotificationCount();
  const second=notifications.getUnreadNotificationCount();
  for(let i=0;i<5;i++)await Promise.resolve();
  assert.equal(notificationRequests,1);
  notificationGate.resolve({data:{unreadCount:4}});
  const [a,b]=await Promise.all([first,second]);
  assert.equal(a.data.unreadCount,4);assert.equal(b.data.unreadCount,4);
 });
 const messagingGate=defer();let messagingRequests=0;
 const messagingRefresh=load('services/messagingService.js',{'./api':{get:async()=>{messagingRequests++;return messagingGate.promise;}},'./offlineCache':{}});
 await check('Unread message refreshes share one request during app startup',async()=>{
  const first=messagingRefresh.refreshMessagingUnreadCount();
  const second=messagingRefresh.refreshMessagingUnreadCount();
  for(let i=0;i<5;i++)await Promise.resolve();
  assert.equal(messagingRequests,1);
  messagingGate.resolve({data:{unreadCount:2}});
  const [a,b]=await Promise.all([first,second]);
  assert.equal(a.data.unreadCount,2);assert.equal(b.data.unreadCount,2);
 });
 await check('Profile reads preserve the expected session when shared by the notification stream',async()=>{
  let requestConfig;
  const profileService=load('services/profileService.js',{
   './api':{get:async(_path,config)=>{requestConfig=config;return {data:{id:'staff'}};}},
   './offlineCache':{cachedRequest:async(_name,request)=>request()},'../utils/displayText':{readableProfile:value=>value},
  });
  await profileService.getMyProfile({expectedSessionEmail:'staff@example.invalid',timeout:5000});
  assert.equal(requestConfig.expectedSessionEmail,'staff@example.invalid');assert.equal(requestConfig.timeout,5000);
  assert.match(fs.readFileSync('services/notificationStream.js','utf8'),/getMyProfile\(\{ expectedSessionEmail: before\.email, timeout: 5000 \}\)/);
 });
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
 const queueValues=new Map([['userEmail','staff@example.invalid'],['accessToken','token'],['@attendance-queue:staff@example.invalid',JSON.stringify([{id:'event-1',userId:'user-1',ownerEmail:'staff@example.invalid',shiftId:'shift-1',status:'blocked',action:'CHECK_IN',photoUri:'file:proof.jpg',capturedAt:'2026-11-12T01:00:00Z',error:'Chưa hợp lệ'}])]]);
 const storage={multiGet:async keys=>keys.map(key=>[key,queueValues.get(key)||null]),getItem:async key=>queueValues.get(key)||null,setItem:async(key,value)=>queueValues.set(key,value)};
 const queue=load('services/attendanceQueue.js',{'@react-native-async-storage/async-storage':storage,'react-native':{Platform:{OS:'web'}},'expo-image-manipulator':{},'./api':{},'./networkState':{getNetworkSnapshot:()=>({online:false})},'./attendanceService':{}});
 await check('Retrying blocked attendance keeps its original evidence and queues it offline',async()=>{
  await queue.retryBlockedAttendance('event-1','user-1');const event=JSON.parse(queueValues.get('@attendance-queue:staff@example.invalid'))[0];
  assert.equal(event.status,'pending');assert.equal(event.photoUri,'file:proof.jpg');assert.equal(event.capturedAt,'2026-11-12T01:00:00Z');assert.equal(event.error,null);
 });
 await check('Another staff member cannot retry the saved attendance event',async()=>{
  await assert.rejects(queue.retryBlockedAttendance('event-1','user-2'),/Không tìm thấy/);
 });
 const messaging=load('services/messagingService.js',{'./api':{},'./offlineCache':{}});
 await check('A non-overlapping new message page exposes its cursor to fill the gap',()=>{
  assert.equal(messaging.latestMessageGapCursor([{id:'old'}],[{id:'new'}],{hasMore:true,nextBefore:'cursor'}),'cursor');
  assert.equal(messaging.latestMessageGapCursor([{id:'old'}],[{id:'old'},{id:'new'}],{hasMore:true,nextBefore:'cursor'}),null);
  assert.equal(messaging.latestMessageGapCursor([{id:'old'}],[{id:'new'}],{hasMore:false,nextBefore:null}),null);
 });
 const scheduleHistory=load('services/scheduleHistoryService.js',{'./api':{},'../utils/availabilityDeadline':{}});
 await check('Hidden draft snapshots are not described as deleted or newly created shifts',()=>{
  assert.equal(scheduleHistory.historyChanges({beforeHidden:true,after:{}})[0],'Công bố ca');
  assert.equal(scheduleHistory.historyChanges({before:{},afterHidden:true})[0],'Gỡ công bố ca');
 });
 console.log(`${report.checks.length} Week 4 checks passed (${report.timezone})`);
 if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify({...report,result:'PASS'},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
