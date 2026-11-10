const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const out=path.resolve('output/ui-feedback-2026-11-01');fs.mkdirSync(out,{recursive:true});
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
  else if(p.endsWith('/notifications/read-all')){read=true;data={};}
  else if(p.endsWith('/messaging/unread-count'))data={unreadCount:0};
  else if(p.endsWith('/unread-count'))data={unreadCount:read?0:1};
  else if(p.endsWith('/notifications/stream'))return route.fulfill({headers,contentType:'text/event-stream',body:'event: connect\ndata: fixture\n\n'});
  else if(p.endsWith('/notifications'))data=[{id:'n1',title:'Ca làm mới',message:'Ca làm đã được cập nhật.',type:'SCHEDULE',isRead:read,createdAt:'2026-11-01T08:00:00Z'}];
  else if(p.endsWith('/payslips'))data=[{id:'p1',staffId:'staff-ui',storeId:'s1',storeName:'Cửa hàng Trung tâm',periodStartDate:'2026-10-01',periodEndDate:'2026-10-31',periodStatus:'PAID',totalAmount:5000000,baseAmount:4500000,otAmount:500000,holidayAmount:0,totalHours:120}];
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
 await page.getByRole('button',{name:'Phiếu lương tháng 10/2026',exact:true}).click();
 await page.getByText('8 giờ làm việc',{exact:true}).waitFor();
 await page.getByLabel('Ca đã hoàn thành',{exact:true}).waitFor();
 assert.equal(await page.getByText('Pha chế · Cửa hàng Trung tâm',{exact:true}).count(),1);
 await page.screenshot({path:path.join(out,`payroll-${width}.png`)});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'No horizontal overflow');
 await page.getByRole('tab',{name:'Trang chủ',exact:true}).click();
 await page.getByRole('button',{name:'Mở hồ sơ cá nhân',exact:true}).click();
 await page.getByRole('button',{name:'Đổi ảnh đại diện',exact:true}).click();
 await page.getByRole('button',{name:'Đóng chọn ảnh đại diện',exact:true}).waitFor();
 await page.waitForTimeout(600);
 const alex = page.getByRole('radio',{name:'Ảnh đại diện Alex',exact:true});
 await alex.waitFor();
 assert.equal(await alex.locator('img').evaluateAll(images => images.length > 0 && images.every(image => image.complete && image.naturalWidth > 0)),true,'Alex preview loads without a file asset lookup');
 assert.equal(await page.locator('canvas:visible').count(),2,'Only profile and spotlight use live 3D, picker uses bundled previews');
 await page.screenshot({path:path.join(out,`avatar-picker-${width}.png`)});
 assert.deepEqual(errors,[],'No browser runtime errors');
 console.log(`PASS ${width}px: avatar 3D motion, bell swing, removed shortcuts, read-all transition, persistent filters, empty megaphone motion, payroll timeline.`);
 await context.close();
 }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
