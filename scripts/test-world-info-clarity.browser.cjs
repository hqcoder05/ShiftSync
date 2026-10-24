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
 // Keep interactive fixture saves usable after this test leaves its tab open.
 const designSnapshots=await page.evaluate(()=>Object.fromEntries(Object.keys(localStorage).filter(key=>key.startsWith('shiftsync:fixture-design:')).map(key=>{try{return [key.split(':').at(-1),JSON.parse(localStorage.getItem(key))];}catch{return [key.split(':').at(-1),{revision:0,document:null,versions:[]}];}})));
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
  if(path.includes('/design')){
   const storeId=path.split('/')[3];
   const saved=designSnapshots[storeId]||{revision:0,document:null,versions:[]};
   if(path.endsWith('/design/versions'))return respond(saved.versions.map(v=>({revision:v.revision,createdAt:v.createdAt})));
   if(path.includes('/design/versions/'))return respond(saved.versions.find(v=>v.revision===Number(path.split('/').at(-1)))||{},saved.versions.some(v=>v.revision===Number(path.split('/').at(-1)))?200:404);
   if(request.method()==='PUT'){
    const body=request.postDataJSON();
    if(body.baseRevision!==saved.revision)return respond({message:'Có phiên bản mới.'},409);
    const snapshot={revision:saved.revision+1,document:body.document,createdAt:new Date().toISOString()};
    designSnapshots[storeId]={...snapshot,versions:[snapshot,...saved.versions]};
    await page.evaluate(({key,value})=>localStorage.setItem(key,JSON.stringify(value)),{key:`shiftsync:fixture-design:${storeId}`,value:designSnapshots[storeId]});
    return respond(snapshot);
   }
   return respond({revision:saved.revision,document:saved.document});
  }
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
 await page.evaluate(()=>{localStorage.setItem('accessToken','PLAYWRIGHT_MOCK_SESSION_NOT_A_REAL_TOKEN');localStorage.setItem('userRole','MANAGER');localStorage.setItem('userEmail','fixture@example.test');localStorage.setItem('userId','manager-fixture');localStorage.setItem('theme','light');});

 await page.goto('http://127.0.0.1:3000/schedule?view=3d');
 await page.locator('#spatial-workspace-container canvas').waitFor();
 await page.waitForTimeout(2000);
 await page.evaluate(async()=>{const f=await import('/node_modules/.vite/deps/@react-three_fiber.js');window.explorerSceneState=()=>f._roots.get(document.querySelector('canvas')).store.getState();});
 const results=[];const check=(ok,label)=>{if(!ok)throw new Error(label);results.push(label);};
 const card=page.locator('[data-world-info]');
 for(const [type,id] of [['staff',ids.staff],['workstation',ids.station],['zone',ids.zone]]){
  await page.getByLabel('Đi đến khu vực, trạm hoặc nhân viên').selectOption(`${type}:${id}`);await page.waitForTimeout(1300);
  await card.waitFor();check(await card.getAttribute('data-world-info')===type,`${type}: correct selected entity`);
  check((await card.locator('.se-world-context').innerText()).includes('MOCK Full Day'),`${type}: explicit shift context`);
  check(await card.locator('.se-world-status strong').innerText()!=='',`${type}: primary operational status`);
  if(type==='staff'){
   check((await card.locator('.se-world-status').innerText()).includes('Đã check-in'),'Attendance status visible before details');
   check(!await card.getByText('Nữ',{exact:true}).isVisible(),'Personal details are collapsed initially');
   await card.getByText('Thông tin cá nhân',{exact:true}).click();check(await card.getByText('Nữ',{exact:true}).isVisible(),'Personal details expand with accessible disclosure');
  }else check((await card.innerText()).includes('có bản ghi check-in'),'Attendance distinguished from schedule count');
  for(const [w,h]of [[1920,1080],[1366,768],[390,844]]){
   await page.setViewportSize({width:w,height:h});await page.waitForTimeout(250);const a=await card.boundingBox(),b=await page.locator('canvas').boundingBox();
   check(a.x>=b.x-2&&a.y>=b.y-2&&a.x+a.width<=b.x+b.width+2&&a.y+a.height<=b.y+b.height+2,`${type}: readable bounded card at ${w}`);
   await card.locator('.se-world-content').evaluate(el=>el.scrollTop=el.scrollHeight);
   check(await card.locator('footer button').isVisible(),`${type}: action remains visible at ${w}`);
  }
  await page.setViewportSize({width:1920,height:1080});await page.waitForTimeout(200);
  await card.getByRole('button',{name:'Thao tác'}).click();await card.locator('[data-world-actions]').waitFor();
  check(await card.locator('.se-world-action-context').isVisible(),`${type}: action purpose explained inside 3D card`);
  check(await page.getByRole('dialog').count()===0,`${type}: no detached 2D dialog`);
  await page.keyboard.press('Escape');check(await card.locator('.se-world-status').count()===1,`${type}: Escape returns to summary`);
  await page.screenshot({path:`D:/ThucTapTotNghiep/ShiftSync/.playwright-mcp/info-hierarchy-${type}.png`});
  await page.keyboard.press('Escape');
 }
 check(errors.length===0,'No uncaught page errors');return{results,errors,consoleErrors};
 }finally{page.off('console',onConsole);page.off('pageerror',onError);}
}
