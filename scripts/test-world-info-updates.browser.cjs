// Full /schedule + actual WebGL. All API data is browser-only fixtures.
async (page) => {
 await page.setViewportSize({width:1920,height:1080});
 await page.goto('http://127.0.0.1:3000/login');
 await page.unroute('**/api/**');
 const ids={store:'11111111-1111-4111-8111-111111111111',other:'22222222-2222-4222-8222-222222222222',zone:'33333333-3333-4333-8333-333333333333',zone2:'44444444-4444-4444-8444-444444444444',station:'55555555-5555-4555-8555-555555555555',staff:'66666666-6666-4666-8666-666666666666',shift:'77777777-7777-4777-8777-777777777777',assignment:'88888888-8888-4888-8888-888888888888'};
 const now=new Date(); const date=[now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-');
 const stores=[{id:ids.store,name:'MOCK · Explorer Coffee',category:'FOOD_BEVERAGE',address:'Browser test fixture'},{id:ids.other,name:'MOCK · Empty Store',category:'RETAIL',address:'Browser test fixture'}];
 const zones=[{id:ids.zone,storeId:ids.store,name:'Barista',code:'BAR',x:7,y:6,z:0,widthDim:5,lengthDim:5,capacity:2},{id:ids.zone2,storeId:ids.store,name:'Thu ngân',code:'POS',x:17,y:10,z:0,widthDim:4,lengthDim:4,capacity:1}];
 const stations=[{id:ids.station,storeId:ids.store,zoneId:ids.zone,zoneName:'Barista',name:'MOCK Espresso Station',code:'MOCK-WS',workstationType:'BARISTA',x:7,y:6,z:0,capacity:1,isActive:true}];
 const staff={id:ids.staff,staffId:ids.staff,fullName:'MOCK Employee',staffName:'MOCK Employee',email:'fixture@example.test',gender:'FEMALE',systemRole:'STAFF',skillName:'Barista'};
 const assignment={gender:'FEMALE',id:ids.assignment,shiftId:ids.shift,staffId:ids.staff,staffName:'MOCK Employee',zoneId:ids.zone,zoneName:'Barista',workstationId:ids.station,workstationName:'MOCK Espresso Station',skillName:'Barista'};
 const shifts=[{id:ids.shift,storeId:ids.store,name:'MOCK Full Day',shiftDate:date,date,startTime:'00:00:00',endTime:'23:59:00',status:'PUBLISHED',shiftAssignments:[assignment],skillRequirements:[],zoneRequirements:[]}];
 const equipment=[{id:'equipment-fixture',workstationId:ids.station,name:'MOCK Espresso Machine',code:'MOCK-E01',type:'COFFEE_MACHINE',status:'OPERATIONAL',notes:'Only in Playwright fixture'}];
 const requests=[]; const errors=[]; const consoleErrors=[];
 const onConsole=message=>{if(message.type()==='error')consoleErrors.push(message.text());};
 const onError=error=>errors.push(error.message);
 page.on('console',onConsole);page.on('pageerror',onError);
 try {
 if (page.routeWebSocket) await page.routeWebSocket('**/ws/**', ws=>ws.close());
 await page.route('**/api/**',async route=>{
  const request=route.request(),url=new URL(request.url()),path=url.pathname;
  requests.push({method:request.method(),path});
  const respond=(json,status=200)=>route.fulfill({status,json});
  const other=path.includes(ids.other);
  if(path==='/api/auth/login')return respond({accessToken:'PLAYWRIGHT_MOCK_SESSION_NOT_A_REAL_TOKEN',role:'MANAGER',email:'fixture@example.test'});
  if(path==='/api/stores'||path==='/api/stores/directory')return respond({content:stores,totalElements:2});
  if(path==='/api/users/me')return respond({...staff,id:'manager-fixture',fullName:'MOCK Manager',systemRole:'MANAGER'});
  if(path.endsWith('/layout'))return respond({storeId:other?ids.other:ids.store,length:24,width:16,height:6});
  if(path.endsWith('/zones'))return respond(other?[]:zones);
  if(path.endsWith('/workstations'))return respond(other?[]:stations);
  if(path.includes('/equipment')){
   if(request.method()==='POST'){const item={...request.postDataJSON(),id:'new-fixture',workstationId:ids.station};equipment.push(item);return respond(item);}
   if(request.method()==='PUT'){const item={...request.postDataJSON(),id:path.split('/').pop(),workstationId:ids.station};const index=equipment.findIndex(e=>e.id===item.id);equipment[index]=item;return respond(item);}
   return respond(other?[]:equipment);
  }
  if(path.endsWith('/attendance'))return respond(other?[]:[{id:'attendance-fixture',storeId:ids.store,shiftId:ids.shift,shiftAssignmentId:ids.assignment,staffId:ids.staff,workstationId:ids.station,checkInTime:date+'T01:00:00Z',checkOutTime:null,status:'ON_TIME'}]);
  if(path.endsWith('/shifts'))return respond(other?[]:shifts);
  if(path.endsWith('/assignments'))return respond(other?[]:[assignment]);
  if(path.endsWith('/staff')||path==='/api/users')return respond({content:other?[]:[staff],totalElements:other?0:1});
  if(path.endsWith('/skills'))return respond([{id:'skill-fixture',name:'Barista'}]);
  if(path.endsWith('/unread-count'))return respond({count:0});
  return respond([]);
 });
 await page.evaluate(()=>{localStorage.clear();localStorage.setItem('accessToken','PLAYWRIGHT_MOCK_SESSION_NOT_A_REAL_TOKEN');localStorage.setItem('userRole','MANAGER');localStorage.setItem('userEmail','fixture@example.test');localStorage.setItem('userId','manager-fixture');localStorage.setItem('theme','light');});


 const results=[];const check=(value,label)=>{if(!value)throw new Error(label);results.push(label);};
 await page.goto('http://127.0.0.1:3000/schedule?view=3d');await page.waitForTimeout(2000);
 const navigate=page.getByLabel('Đi đến khu vực, trạm hoặc nhân viên');
 await navigate.selectOption(`staff:${ids.staff}`);await page.waitForTimeout(1300);
 const longName='Nguyễn Thị Nhân Sự Có Họ Tên Rất Dài Để Kiểm Tra Bảng Thông Tin Trong Không Gian';
 assignment.staffName=longName;assignment.gender='OTHER';
 await page.evaluate(id=>window.dispatchEvent(new CustomEvent('store_shifts_updated',{detail:{storeId:id,action:'ASSIGNMENT_MOVED'}})),ids.store);
 await page.locator('[data-world-info] h3').filter({hasText:longName}).waitFor();
 await page.locator('[data-world-info]').getByText('Thông tin cá nhân',{exact:true}).click();
 check((await page.locator('[data-world-info]').innerText()).includes('Khác'),'Open card refreshes name and gender from newest assignment');
 const motionStart=await page.evaluate(async()=>{
  const f=await import('/node_modules/.vite/deps/@react-three_fiber.js');const {setAvatarTargetPosition}=await import('/src/features/spatial-workspace/scene/StylizedAvatars.js');
  const scene=f._roots.get(document.querySelector('canvas')).store.getState().scene;let avatar;scene.traverse(o=>{if(o.isGroup&&o.userData.isPerson&&o.userData.employee)avatar=o;});
  const before=scene.getObjectByName('worldInfoLeader').geometry.attributes.position.array[0];const p=avatar.userData.currentPos;setAvatarTargetPosition(avatar,p.x+.8,p.y,p.z+.5);return before;
 });
 await page.waitForTimeout(650);
 const motionEnd=await page.evaluate(async()=>{const f=await import('/node_modules/.vite/deps/@react-three_fiber.js');return f._roots.get(document.querySelector('canvas')).store.getState().scene.getObjectByName('worldInfoLeader').geometry.attributes.position.array[0];});
 check(Math.abs(motionEnd-motionStart)>.1,'World leader follows the actual walking avatar');
 const rect=await page.locator('[data-world-info]').boundingBox();
 check(rect.width<=361&&rect.height<=441,'Long content remains bounded and scrollable');
 await page.getByRole('button',{name:'Toàn màn hình',exact:true}).click();await page.waitForTimeout(300);
 check(await page.evaluate(()=>!!document.fullscreenElement),'Workspace enters fullscreen');
 const full=await page.locator('[data-world-info]').boundingBox();
 check(full.x>=0&&full.y>=0&&full.x+full.width<=1920&&full.y+full.height<=1080,'World card stays visible in fullscreen');
 await page.getByRole('button',{name:'Thoát toàn màn hình',exact:true}).click();await page.waitForTimeout(250);
 assignment.skillName=null;assignment.gender=null;assignment.workstationName=null;
 await page.evaluate(id=>window.dispatchEvent(new CustomEvent('store_shifts_updated',{detail:{storeId:id}})),ids.store);
 await page.waitForTimeout(800);
 check((await page.locator('[data-world-info]').innerText()).includes('Chưa có thông tin'),'Missing fields show explicit unknown information');
 shifts[0].shiftAssignments=[];
 await page.evaluate(id=>window.dispatchEvent(new CustomEvent('store_shifts_updated',{detail:{storeId:id}})),ids.store);
 await page.waitForTimeout(800);
 check(await page.locator('[data-world-info]').count()===0,'Removed assignment closes selected card');
 shifts[0].shiftAssignments=[assignment];assignment.staffName='MOCK Employee';assignment.skillName='Barista';assignment.gender='FEMALE';
 await page.evaluate(id=>window.dispatchEvent(new CustomEvent('store_shifts_updated',{detail:{storeId:id}})),ids.store);await page.waitForTimeout(800);
 await navigate.selectOption(`zone:${ids.zone}`);await page.waitForTimeout(1300);
 await page.getByLabel('Cửa hàng',{exact:true}).selectOption(ids.other);await page.waitForTimeout(800);
 check(await page.locator('[data-world-info]').count()===0,'Store switch closes world card');
 await page.getByLabel('Cửa hàng',{exact:true}).selectOption(ids.store);await page.waitForTimeout(1000);
 await navigate.selectOption(`workstation:${ids.station}`);await page.waitForTimeout(1300);
 await page.locator('[data-world-info]').getByRole('button',{name:'Thao tác'}).click();
 const dialog=page.locator('[data-world-actions]');await dialog.getByRole('button',{name:'Thiết bị',exact:true}).click();
 await dialog.getByRole('button',{name:'Thêm thiết bị',exact:true}).click();
 check(await dialog.locator('input').count()>0,'Existing equipment editor is available inside world-anchored actions');
 await page.keyboard.press('Escape');
 const tomorrow=new Date();tomorrow.setDate(tomorrow.getDate()+1);const next=[tomorrow.getFullYear(),String(tomorrow.getMonth()+1).padStart(2,'0'),String(tomorrow.getDate()).padStart(2,'0')].join('-');
 await page.getByLabel('Ngày xem cửa hàng',{exact:true}).fill(next);await page.waitForTimeout(600);
 check(await page.locator('[data-world-info]').count()===0,'Changing date closes contextual information');
 await page.getByLabel('Ngày xem cửa hàng',{exact:true}).fill(date);await page.waitForTimeout(650);
 await navigate.selectOption(`workstation:${ids.station}`);await page.waitForTimeout(1300);
 check(errors.length===0,'No uncaught errors in update/fullscreen flows');
 await page.screenshot({path:'D:/ThucTapTotNghiep/ShiftSync/.playwright-mcp/world-info-updates.png'});
 return {results,errors,consoleErrors};
 } finally { page.off('console',onConsole); page.off('pageerror',onError); }
}
