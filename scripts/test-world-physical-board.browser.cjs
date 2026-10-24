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

 await page.goto('http://127.0.0.1:3000/schedule?view=3d');
 await page.locator('#spatial-workspace-container canvas').waitFor();
 await page.waitForTimeout(2000);
 await page.evaluate(async()=>{const f=await import('/node_modules/.vite/deps/@react-three_fiber.js');window.explorerSceneState=()=>f._roots.get(document.querySelector('canvas')).store.getState();});
 const results=[];const check=(value,label)=>{if(!value)throw new Error(label);results.push(label);};
 const board=()=>page.getByRole('region',{name:/Bảng 3D/});
 async function meshClick(name){
  const p=await page.evaluate(async name=>{const T=await import('/node_modules/.vite/deps/three.js'),s=window.explorerSceneState();const obj=s.scene.getObjectByName(name);if(!obj)throw new Error('Missing '+name);const v=obj.getWorldPosition(new T.Vector3()).project(s.camera),r=document.querySelector('canvas').getBoundingClientRect();return{x:r.x+(v.x+1)*r.width/2,y:r.y+(1-v.y)*r.height/2};},name);
  await page.mouse.click(p.x,p.y);await page.waitForTimeout(200);
 }
 for(const [type,id]of [['staff',ids.staff],['workstation',ids.station],['zone',ids.zone]]){
  await page.getByLabel('Đi đến khu vực, trạm hoặc nhân viên').selectOption(`${type}:${id}`);await page.waitForTimeout(1300);
  check(await page.locator('[data-world-info]').count()===0,`${type}: summary is not an HTML card`);
  check(await page.evaluate(type=>{const b=window.explorerSceneState().scene.getObjectByName('worldPhysicalBoard');return b?.userData.boardType===type&&b.children.some(c=>c.isMesh||c.children.some(x=>x.isMesh));},type),`${type}: actual physical board meshes`);
  check((await board().textContent()).includes('MOCK')||type==='zone',`${type}: accessible content from snapshot`);
  if(type!=='staff'){
   await meshClick('worldBoardPeople');check((await board().textContent()).includes('MOCK Employee'),`${type}: mesh tab shows assigned staff`);
  }
  if(type==='workstation'){
   await meshClick('worldBoardEquipment');await page.waitForTimeout(200);
   check((await board().textContent()).includes('MOCK Espresso Machine'),'Equipment mesh tab loads real API fixture');
   await meshClick('worldBoardSummary');
  }
  for(const [w,h]of [[1366,768],[390,844]]){
   await page.setViewportSize({width:w,height:h});await page.waitForTimeout(300);
   check(await page.evaluate(async()=>{const T=await import('/node_modules/.vite/deps/three.js'),s=window.explorerSceneState(),b=s.scene.getObjectByName('worldPhysicalBoard');const box=b.children.find(n=>n.isMesh);box.geometry.computeBoundingBox();const bounds=box.geometry.boundingBox;const corners=[];for(const x of[bounds.min.x,bounds.max.x])for(const y of[bounds.min.y,bounds.max.y])for(const z of[bounds.min.z,bounds.max.z])corners.push(box.localToWorld(new T.Vector3(x,y,z)).project(s.camera));return b.visible&&corners.every(p=>Math.abs(p.x)<1.04&&Math.abs(p.y)<1.04);}),`${type}: 3D board within viewport at ${w}`);
  }
  if(type==='staff'){
   check(await page.evaluate(()=>!!window.explorerSceneState().scene.getObjectByName('worldBoardNextPage')),'Small viewport uses paginated mesh controls');
   await meshClick('worldBoardNextPage');check(await board().count()===1,'Mesh pagination does not close board');
  }
  await page.setViewportSize({width:1920,height:1080});await page.waitForTimeout(250);
  await meshClick('worldBoardActions');await page.locator('[data-world-actions]').waitFor();
  check(await page.getByRole('dialog').count()===0,`${type}: actions stay in world space`);
  await page.keyboard.press('Escape');await page.waitForTimeout(200);
  check(await page.evaluate(()=>!!window.explorerSceneState().scene.getObjectByName('worldPhysicalBoard')),`${type}: Escape returns to mesh board`);
  await page.screenshot({path:`D:/ThucTapTotNghiep/ShiftSync/.playwright-mcp/physical-board-${type}.png`});
  await meshClick('worldBoardClose');check(await board().count()===0,`${type}: mesh close button clears selection`);
 }
 await page.getByRole('button',{name:'Tham quan 3D',exact:true}).click();await page.waitForTimeout(400);
 await page.evaluate(()=>{const p=window.__playerController,s=window.explorerSceneState();let avatar;s.scene.traverse(n=>{if(n.isGroup&&n.userData.isPerson&&n.userData.employee)avatar=n;});p.setTargetLockFromEntity({type:'staff',item:avatar.userData.employee,name:'MOCK Employee'},[avatar],[]);});
 await page.keyboard.press('e');await page.waitForTimeout(300);
 check(await board().count()===1,'E opens physical information board in walkthrough');
 check(await page.evaluate(()=>window.__playerController.paused&&!document.pointerLockElement),'Physical board pauses movement and releases pointer lock');
 await page.keyboard.press('Escape');check(await board().count()===0&&await page.evaluate(()=>!!window.__playerController),'Escape closes mesh board before leaving walkthrough');
 await page.getByRole('button',{name:/Thoát tham quan/}).click();await page.waitForTimeout(300);
 await page.getByLabel('Đi đến khu vực, trạm hoặc nhân viên').selectOption(`workstation:${ids.station}`);await page.waitForTimeout(1000);
 check(errors.length===0,'No uncaught errors');return{results,errors,consoleErrors};
 }finally{page.off('console',onConsole);page.off('pageerror',onError);}
}
