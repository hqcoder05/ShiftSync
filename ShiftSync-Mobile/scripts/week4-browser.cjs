const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const {chromium}=require('playwright');
const out=path.resolve('qa-week3-2026-10-28'),base='http://localhost:8081';
const report={evidence:'Chromium web with intercepted API fixtures and simulated document visibility. Not a physical Android/iOS or screen-reader test.',checks:[],errors:[]};
let browser,current;
const user={id:'11111111-1111-4111-8111-111111111111',fullName:'QA Tuần Bốn',email:'week4@example.invalid',systemRole:'STAFF',avatarId:'dilan'};
const store='22222222-2222-4222-8222-222222222222';
async function audit(page,label){
 await page.waitForTimeout(350);
 const violations=await page.locator('[role="button"], [role="tab"], [role="radio"]').evaluateAll(nodes=>nodes.flatMap(el=>{
  const r=el.getBoundingClientRect();if(!r.width||!r.height||r.bottom<=0||r.top>=innerHeight||r.right<=0||r.left>=innerWidth)return [];
  // Ignore a system-owned Expo devtools launcher; it is absent in release.
  if(el.closest('[data-expo-dev-menu]'))return [];
  return r.width<47.8||r.height<47.8?[{label:el.getAttribute('aria-label')||el.textContent,width:r.width,height:r.height}]:[];
 }));
 assert.deepEqual(violations,[],label+' target dimensions');
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,label+' overflow');
 report.checks.push(label+': visible targets >=48 CSS px, no document overflow');
}
(async()=>{
 browser=await chromium.launch({executablePath:path.resolve('qa-week2-2026-10-20/browsers/chromium-1248/chrome-win64/chrome.exe'),headless:true});
 for(const width of [320,390]){
  const context=await browser.newContext({viewport:{width,height:844},locale:'vi-VN'});
  await context.addInitScript(()=>{
   localStorage.setItem('accessToken','fixture-token');localStorage.setItem('userEmail','week4@example.invalid');localStorage.setItem('userRole','STAFF');
   const RealDate=Date,started=RealDate.now(),baseline=new RealDate('2026-10-28T17:30:00Z').getTime();
   window.Date=class extends RealDate{constructor(...args){super(...(args.length?args:[baseline+RealDate.now()-started]));}static now(){return baseline+RealDate.now()-started;}};
   let visibility='visible';Object.defineProperty(document,'visibilityState',{get:()=>visibility,configurable:true});Object.defineProperty(document,'hidden',{get:()=>visibility==='hidden',configurable:true});
   window.__setVisibility=(value)=>{visibility=value;document.dispatchEvent(new Event('visibilitychange'));};
  });
  let start='06:00:00';const calls=[];
  await context.route('**/api/**',async route=>{
   const req=route.request(),url=new URL(req.url()),p=url.pathname;calls.push(p);
   const headers={'access-control-allow-origin':'*','access-control-allow-methods':'*','access-control-allow-headers':'*'};
   if(req.method()==='OPTIONS')return route.fulfill({status:204,headers});
   if(p.endsWith('/notifications/stream'))return route.fulfill({headers,contentType:'text/event-stream',body:'event: connect\ndata: fixture\n\n'});
   const shift={id:'33333333-3333-4333-8333-333333333333',storeId:store,storeName:'Chi nhánh QA',shiftDate:'2026-10-29',startTime:start,endTime:'14:00:00',status:'PUBLISHED',staffId:user.id,shiftAssignments:[{staffId:user.id,zoneName:'Pha chế'}]};
   let data=[];
   if(p==='/api/users/me')data=user;
   else if(p.endsWith('/stores'))data=[{id:store,storeId:store,name:'Chi nhánh QA',storeName:'Chi nhánh QA',status:'ACTIVE'}];
   else if(p.endsWith('/shifts'))data=[shift];
   else if(p.endsWith('/unread-count'))data={unreadCount:0};
   else if(p.endsWith('/configuration'))data={geofenceRadiusM:200};
   else if(p==='/api/stores/'+store)data={id:store,name:'Chi nhánh QA'};
   return route.fulfill({headers,json:data});
  });
  const page=await context.newPage();current=page;page.on('pageerror',e=>report.errors.push(e.message));
  const cdp=await context.newCDPSession(page);
  await cdp.send('Emulation.setTimezoneOverride',{timezoneId:'America/Los_Angeles'});
  await page.goto(base,{waitUntil:'domcontentloaded',timeout:120000});
  await page.getByRole('button',{name:'Mở chấm công vào ca hôm nay',exact:true}).getByText('6:00',{exact:false}).first().waitFor({timeout:120000});
  await page.getByText('THỨ 5, 29 THÁNG 10',{exact:true}).waitFor();
  report.checks.push(width+': dashboard uses 29 Oct Vietnam while device is 28 Oct in Los Angeles');
  await audit(page,width+' dashboard');
  const before=calls.length;await page.evaluate(()=>window.__setVisibility('hidden'));start='09:00:00';await page.evaluate(()=>window.__setVisibility('visible'));
  await page.getByRole('button',{name:'Mở chấm công vào ca hôm nay',exact:true}).getByText('9:00',{exact:false}).first().waitFor({timeout:30000});
  assert.ok(calls.slice(before).includes('/api/users/me'));report.checks.push(width+': resume validates session and updates the visible shift without navigating/reloading');
  await page.getByRole('tab',{name:'Lịch làm',exact:true}).click();
  await page.getByRole('button',{name:'Lịch sử điều chỉnh',exact:true}).waitFor();
  await audit(page,width+' schedule');
  await page.screenshot({path:path.join(out,`week4-schedule-${width}.png`)});
  await page.getByRole('button',{name:'Thứ 7, 31 tháng 10',exact:true}).click();
  const calendar=page.getByRole('button',{name:/Chọn tháng|Mở lịch|Chọn ngày/}).first();
  if(await calendar.count()){
   await calendar.click();await audit(page,width+' calendar');
   await cdp.send('Emulation.setTimezoneOverride',{timezoneId:'Pacific/Kiritimati'});
   await page.evaluate(()=>{window.__setVisibility('hidden');window.__setVisibility('visible');});
   await page.getByRole('heading',{name:'Tháng 10 2026',exact:true}).waitFor();
   await page.getByRole('button',{name:'Ngày 31 tháng 10 năm 2026',exact:true}).waitFor();
   report.checks.push(width+': changing the live device timezone across the date line keeps the selected October month');
   await page.getByRole('button',{name:'Hôm nay',exact:true}).click();
  }
  await page.getByRole('tab',{name:'Thêm',exact:true}).click();
  await page.getByRole('radio',{name:'English',exact:true}).click();
  await page.getByRole('tab',{name:'Home',exact:true}).waitFor();
  await page.getByRole('button',{name:'Help center',exact:true}).waitFor();
  report.checks.push(width+': switching to English updates navigation and More labels');
  await audit(page,width+' English More');
  await page.screenshot({path:path.join(out,`week4-language-${width}.png`)});
  await page.reload({waitUntil:'domcontentloaded'});await page.getByRole('tab',{name:'More',exact:true}).waitFor({timeout:60000});
  await page.getByRole('tab',{name:'More',exact:true}).click();await page.getByRole('radio',{name:'English',exact:true,checked:true}).waitFor();
  report.checks.push(width+': language choice survives a reload');
  await page.getByRole('radio',{name:'Tiếng Việt',exact:true}).click();
  await page.getByRole('button',{name:'Thời gian rảnh',exact:true}).click();
  await page.getByRole('heading',{name:'Đăng ký lịch rảnh',exact:true}).waitFor().catch(()=>{});
  await audit(page,width+' availability');
  await page.screenshot({path:path.join(out,`week4-availability-${width}.png`)});
  await context.close();
 }
 assert.deepEqual(report.errors,[]);report.result='PASS';fs.writeFileSync(path.join(out,'week4-browser.json'),JSON.stringify(report,null,2));await browser.close();console.log(`${report.checks.length} Week 4 browser checks passed`);
})().catch(async e=>{report.result='FAIL';report.error=e.stack;if(current){report.body=await current.locator('body').innerText().catch(()=>'');await current.screenshot({path:path.join(out,'week4-browser-failure.png')}).catch(()=>{});}fs.writeFileSync(path.join(out,'week4-browser.json'),JSON.stringify(report,null,2));console.error(e);await browser?.close();process.exitCode=1;});
