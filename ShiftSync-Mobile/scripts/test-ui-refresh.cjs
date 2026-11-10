const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const out=path.resolve(process.env.UI_REFRESH_OUTPUT || 'output/ui-refresh-2026-11-01');fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({executablePath:path.resolve('qa-week2-2026-10-20/browsers/chromium-1248/chrome-win64/chrome.exe'),headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try {
 for(const width of [390,320]){
 const context=await browser.newContext({viewport:{width,height:844},reducedMotion:'no-preference'});
 await context.addInitScript(()=>{localStorage.setItem('accessToken','ui-fixture');localStorage.setItem('userEmail','ui@example.invalid');localStorage.setItem('userRole','STAFF');});
 let read=false;
 await context.route('**/api/**',async route=>{
  const p=new URL(route.request().url()).pathname;
  const headers={'access-control-allow-origin':'*','access-control-allow-methods':'*','access-control-allow-headers':'*'};
  if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers});
  let data=[];
  if(p==='/api/users/me')data={id:'staff-ui',email:'ui@example.invalid',fullName:'Minh Anh',systemRole:'STAFF',avatarId:'mew'};
  else if(p.endsWith('/stores'))data=[{id:'s1',storeId:'s1',name:'Cửa hàng Trung tâm',storeName:'Cửa hàng Trung tâm',status:'ACTIVE'}];
  else if(p==='/api/stores/s1')data={id:'s1',name:'Cửa hàng Trung tâm'};
  else if(p.endsWith('/configuration'))data={geofenceRadiusM:200};
  else if(p.endsWith('/leave-requests/balances/my'))data={year:2026,remainingDays:8,usedDays:4,pendingDays:1};
  else if(p.endsWith('/notifications/read-all')){read=true;data={};}
  else if(p.endsWith('/messaging/unread-count'))data={unreadCount:0};
  else if(p.endsWith('/unread-count'))data={unreadCount:read?0:1};
  else if(p.endsWith('/notifications/stream'))return route.fulfill({headers,contentType:'text/event-stream',body:'event: connect\ndata: fixture\n\n'});
  else if(p.endsWith('/notifications'))data=[{id:'n1',title:'Ca làm mới',message:'Ca làm đã được cập nhật.',type:'SCHEDULE',isRead:read,createdAt:'2026-11-01T08:00:00Z'}];
  else if(p.endsWith('/payslips'))data=[{id:'p1',staffId:'staff-ui',storeId:'s1',storeName:'Cửa hàng Trung tâm',periodStartDate:'2026-10-01',periodEndDate:'2026-10-31',periodStatus:'PAID',totalAmount:5000000,baseAmount:4500000,otAmount:500000,holidayAmount:0,totalHours:120},{id:'p2',staffId:'staff-ui',storeId:'s1',periodStartDate:'2026-09-01',periodEndDate:'2026-09-30',periodStatus:'PAID',totalAmount:4225000}];
  else if(p.endsWith('/attendance/me'))data=[{id:'a1',staffId:'staff-ui',storeId:'s1',storeName:'Cửa hàng Trung tâm',zoneName:'Pha chế',shiftDate:'2026-10-20',scheduledStart:'08:30:00',scheduledEnd:'16:30:00',checkInTime:'2026-10-20T01:30:00Z',checkOutTime:'2026-10-20T09:30:00Z',status:'PRESENT'}];
  return route.fulfill({headers,json:data});
 });
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.log('PAGE ERROR',e.message);});page.on('console',m=>{if(m.type()==='error')console.log('CONSOLE ERROR',m.text());});
 await page.goto('http://localhost:8085',{waitUntil:'domcontentloaded',timeout:120000});
 await page.getByRole('button',{name:'Xem thông báo',exact:true}).waitFor({timeout:30000});
 assert.equal(await page.getByText('Đăng ký rảnh',{exact:true}).count(),0);
 await page.waitForTimeout(1800);
 await page.screenshot({path:path.join(out,`dashboard-${width}.png`)});
 const canvas=page.locator('canvas');assert.ok(await canvas.count()>0,'Live 3D canvas exists');
 const pixels1=await canvas.first().screenshot();await page.waitForTimeout(1000);const pixels2=await canvas.first().screenshot();assert.ok(!pixels1.equals(pixels2),'Live 3D portrait moves');
 const bell=page.getByRole('button',{name:'Xem thông báo',exact:true}).locator('svg').locator('..');
 const transforms=new Set();
 for(let sample=0;sample<12;sample++){
  transforms.add(await bell.evaluate(el=>getComputedStyle(el).transform));
  if(transforms.size>1)break;
  await page.waitForTimeout(150);
 }
 assert.ok(transforms.size>1,'Bell swings across its animation cycle');
 await page.getByRole('button',{name:'Xem thông báo',exact:true}).click();
 await page.getByText('Chưa đọc (1)',{exact:true}).waitFor();
 assert.equal(await page.getByRole('button').filter({hasText:'Ca làm mới'}).locator('svg').count(),0,'Notification entries have no icons');
 await page.screenshot({path:path.join(out,`notification-list-${width}.png`)});
 await page.getByText('Đã đọc hết',{exact:true}).click();
 await page.getByText('Chưa đọc (0)',{exact:true}).waitFor();
 assert.equal(await page.getByText('Ca làm mới',{exact:true}).count(),1,'All tab retains read item');
 assert.equal(await page.getByText('Bạn đã xem hết!',{exact:true}).count(),0);
 await page.getByText('Chưa đọc (0)',{exact:true}).click();
 await page.getByText('Bạn đã xem hết!',{exact:true}).waitFor();
 const horn=page.locator('svg[viewBox="0 0 150 150"]').locator('..');const h1=await horn.evaluate(el=>getComputedStyle(el).transform);await page.waitForTimeout(500);const h2=await horn.evaluate(el=>getComputedStyle(el).transform);assert.notEqual(h1,h2,'Megaphone swings');
 await page.screenshot({path:path.join(out,`notifications-${width}.png`)});
 await page.getByRole('button',{name:'Đóng thông báo',exact:true}).click();
 await page.getByRole('tab',{name:'Thêm',exact:true}).click();
 await page.getByText('Phiếu lương',{exact:true}).click();
 await page.getByRole('button',{name:'Phiếu lương tháng 10/2026',exact:true}).waitFor();
 await page.waitForTimeout(900);
 await page.screenshot({path:path.join(out,`payroll-list-${width}.png`)});
 await page.getByRole('button',{name:'Phiếu lương tháng 10/2026',exact:true}).click();
 await page.getByText('8 giờ làm việc',{exact:true}).waitFor();
 await page.getByLabel('Ca đã hoàn thành',{exact:true}).waitFor();
 await page.waitForTimeout(900);
 assert.equal(await page.getByText('Pha chế · Cửa hàng Trung tâm',{exact:true}).count(),1);
 await page.screenshot({path:path.join(out,`payroll-${width}.png`)});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'No horizontal overflow');
 await page.getByRole('tab',{name:'Trang chủ',exact:true}).click();
 await page.getByRole('button',{name:'Mở hồ sơ cá nhân',exact:true}).click();
 await page.getByRole('button',{name:'Đổi ảnh đại diện',exact:true}).click();
 await page.getByRole('button',{name:'Đóng chọn ảnh đại diện',exact:true}).waitFor();
 await page.waitForTimeout(600);
 const alex = page.getByRole('radio',{name:'Ảnh đại diện Cá Mập',exact:true});
 await alex.waitFor();
 assert.equal(await alex.locator('img').evaluateAll(images => images.length > 0 && images.every(image => image.complete && image.naturalWidth > 0)),true,'Alex preview loads without a file asset lookup');
 assert.equal(await page.locator('canvas:visible').count(),2,'Only profile and spotlight use live 3D, picker uses bundled previews');
 await page.screenshot({path:path.join(out,`avatar-picker-${width}.png`)});
 await page.getByRole('button',{name:'Đóng chọn ảnh đại diện',exact:true}).click();
 await page.getByRole('tab',{name:'Thêm',exact:true}).click();
 await page.screenshot({path:path.join(out,`more-${width}.png`)});
 for(const [label,slug] of [['Yêu cầu của tôi','requests'],['Chợ ca','marketplace'],['Thời gian rảnh','availability'],['Nhắn tin','messaging'],['Hoạt động của tôi','activity'],['Lịch sử điều chỉnh ca','schedule-history'],['Báo cáo sự cố','incidents'],['Trung tâm trợ giúp','help']]){
  await page.getByRole('button',{name:label,exact:true}).click();
  await page.getByRole('tab',{name:'Thêm',exact:true}).waitFor({timeout:60000});
  await page.waitForTimeout(900);
  assert.equal(await page.getByText(/Không thể tải màn hình/).count(),0,label+' screen loads');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,label+' no overflow');
  await page.screenshot({path:path.join(out,`${slug}-${width}.png`)});
  await page.getByRole('tab',{name:'Thêm',exact:true}).click();
 }
 await page.getByRole('tab',{name:'Lịch làm',exact:true}).click();
 await page.getByRole('tab',{name:'Thêm',exact:true}).waitFor({timeout:60000});
 await page.waitForTimeout(800);
 await page.screenshot({path:path.join(out,`schedule-${width}.png`)});
 await page.getByRole('tab',{name:'Chấm công',exact:true}).click();
 await page.getByRole('button',{name:'Quay lại lịch làm',exact:true}).waitFor({timeout:60000});
 await page.waitForTimeout(800);
 await page.screenshot({path:path.join(out,`attendance-${width}.png`)});
 assert.deepEqual(errors,[],'No browser runtime errors');
 console.log(`PASS ${width}px: 3D avatar and illustrations, icon-free notifications, payroll list/detail, and 10 additional screens without runtime errors or horizontal overflow.`);
 await context.close();
 }
 const loginContext=await browser.newContext({viewport:{width:390,height:844}});
 const loginPage=await loginContext.newPage();
 await loginPage.goto('http://localhost:8085',{waitUntil:'domcontentloaded'});
 await loginPage.getByRole('heading',{name:'Đăng nhập',exact:true}).waitFor();
 await loginPage.screenshot({path:path.join(out,'login-390.png')});
 await loginContext.close();
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
