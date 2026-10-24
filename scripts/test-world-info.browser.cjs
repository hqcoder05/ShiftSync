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
 const results=[];
 const check=(value,label)=>{if(!value)throw new Error(label);results.push(label);};
 const card=()=>page.locator('[data-world-info]');
 const fits=async()=>{const a=await card().boundingBox(),b=await page.locator('canvas').boundingBox();return a&&b&&a.width<=361&&a.height<=441&&a.x>=b.x-2&&a.y>=b.y-2&&a.x+a.width<=b.x+b.width+2&&a.y+a.height<=b.y+b.height+2;};
 const canvasPoint=type=>page.evaluate(async type=>{
  const THREE=await import('/node_modules/.vite/deps/three.js');
  const {pickSceneEntity}=await import('/src/features/spatial-workspace/utils/sceneSelection.js');
  const state=window.explorerSceneState(),canvas=state.gl.domElement,rect=canvas.getBoundingClientRect(),ray=new THREE.Raycaster();
  const selectionAt=(x,y)=>{
   if(document.elementFromPoint(x,y)!==canvas)return null;
   ray.setFromCamera(new THREE.Vector2((x-rect.left)/rect.width*2-1,-(y-rect.top)/rect.height*2+1),state.camera);
   return pickSceneEntity(ray.intersectObjects(state.scene.children,true));
  };
  for(let y=Math.max(rect.top+185,80);y<Math.min(innerHeight,rect.bottom-150);y+=14){
   for(let x=rect.left+20;x<Math.min(rect.right-10,innerWidth);x+=14){
    const selection=selectionAt(x,y);
    if(selection?.type!==type)continue;
    // Avoid a single boundary pixel: all surrounding pixels must hit the same entity.
    if([[4,0],[-4,0],[0,4],[0,-4]].every(([dx,dy])=>{const other=selectionAt(x+dx,y+dy);return other?.type===type&&other.value.id===selection.value.id;}))return{x,y,id:selection.value.id};
   }
  }
  throw new Error(`No unoccluded ${type} point found on canvas`);
 },type);
 const clickEntity=async type=>{const point=await canvasPoint(type);await page.mouse.click(point.x,point.y);return point;};

 check((await page.evaluate(()=>navigator.userAgent)).includes('Edg/'),'Microsoft Edge 1920x1080');
 check(await page.locator('.se-inspector').count()===0,'No default sidebar');
 for(const type of ['staff','workstation','zone']){
  if(type==='staff'){await page.getByLabel('Đi đến khu vực, trạm hoặc nhân viên').selectOption(`staff:${ids.staff}`);await page.waitForTimeout(1300);await page.keyboard.press('Escape');}
  if(type==='zone'){await page.getByRole('button',{name:'Toàn cảnh',exact:true}).click();await page.waitForTimeout(1000);}
  await clickEntity(type);
  await card().waitFor();await page.waitForTimeout(200);
  check(await card().getAttribute('data-world-info')===type,`Canvas click opens ${type} world card`);
  check(await fits(),`${type} card fits canvas at stable readable size`);
  if(type==='staff'){await card().getByText('Thông tin cá nhân',{exact:true}).click();check((await card().innerText()).includes('Nữ'),'Staff gender from snapshot');check((await card().innerText()).includes('Đã check-in'),'Assignment attendance from fixture');}
  if(type==='workstation'){await card().getByText('MOCK Espresso Machine',{exact:true}).waitFor();check(true,'Workstation equipment loaded from API');}
  const before=await page.locator('canvas').boundingBox();
  await card().getByRole('button',{name:'Thao tác'}).click();
  await card().locator('[data-world-actions]').waitFor();
  check(await page.getByRole('dialog').count()===0 && await fits(),`${type} actions stay in anchored 3D card`);
  await page.keyboard.press('Escape');await page.waitForTimeout(150);
  check(await card().locator('[data-world-actions]').count()===0 && await card().count()===1,`${type} Escape returns to information`);
  check((await page.locator('canvas').boundingBox()).width===before.width,`${type} actions do not resize canvas`);
  await card().getByRole('button',{name:'Đóng bảng thông tin'}).click();
 }
 await page.getByLabel('Tổng quan cửa hàng',{exact:true}).click();
 check((await page.getByRole('dialog').innerText()).includes('Cảnh báo vận hành'),'Overview and warnings use centered dialog');
 await page.keyboard.press('Escape');
 await page.getByLabel('Đi đến khu vực, trạm hoặc nhân viên').selectOption(`staff:${ids.staff}`);await page.waitForTimeout(1400);
 await page.keyboard.press('Escape');
 check(await card().count()===0,'Escape closes world card');
 const canvas=page.locator('canvas');const box=await canvas.boundingBox();
 await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2+60,box.y+box.height/2+20,{steps:8});await page.mouse.up();
 check(await card().count()===0,'Orbit drag does not select entity');
 await page.getByRole('button',{name:'Toàn cảnh',exact:true}).click();await page.waitForTimeout(700);
 for(const [w,h] of [[1366,768],[390,844]]){
  await page.setViewportSize({width:w,height:h});await page.waitForTimeout(250);
  await page.getByLabel('Đi đến khu vực, trạm hoặc nhân viên').selectOption(`workstation:${ids.station}`);await page.waitForTimeout(1400);
  check(await fits(),`World card fits ${w}x${h}`);
  if(w===390)await page.screenshot({path:"D:/ThucTapTotNghiep/ShiftSync/.playwright-mcp/world-info-mobile.png"});
  check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`No document overflow at ${w}`);
  await card().getByRole('button',{name:'Đóng bảng thông tin'}).click();
 }
 await page.setViewportSize({width:1920,height:1080});await page.waitForTimeout(400);
 await page.getByRole('button',{name:'Tham quan 3D',exact:true}).click();await page.waitForTimeout(400);
 check(await page.evaluate(()=>window.__playerController?.viewMode==='first_person'),'Walkthrough defaults to first person');
 const before=await page.evaluate(()=>window.__playerController.position.toArray());
 await page.keyboard.down('w');await page.waitForTimeout(200);await page.keyboard.up('w');
 check(JSON.stringify(before)!==JSON.stringify(await page.evaluate(()=>window.__playerController.position.toArray())),'WASD moves player');
 await clickEntity('staff');await page.waitForTimeout(250);
 check(await card().count()===1,'Direct model click works during first-person walkthrough');
 check(await page.evaluate(()=>!document.pointerLockElement),'Information releases pointer lock');
 await page.keyboard.press('Escape');await page.waitForTimeout(150);
 // E uses the real interaction handler after positioning the reticle/nearby entity in the fixture.
 await page.evaluate(()=>{const p=window.__playerController;const state=window.explorerSceneState();let avatar;state.scene.traverse(o=>{if(o.userData.isPerson&&o.userData.employee)avatar=o;});p.setTargetLockFromEntity({type:'staff',item:avatar.userData.employee,name:'MOCK Employee'},[avatar],[]);});
 await page.keyboard.press('e');await page.waitForTimeout(300);
 check(await card().count()===1,'E interaction opens world information');
 check(await page.evaluate(()=>window.__playerController.paused),'Opening information pauses input');
 const paused=await page.evaluate(()=>window.__playerController.position.toArray());
 await page.keyboard.down('w');await page.waitForTimeout(200);await page.keyboard.up('w');
 check(JSON.stringify(paused)===JSON.stringify(await page.evaluate(()=>window.__playerController.position.toArray())),'WASD cannot move while information is open');
 await page.keyboard.press('Escape');await page.waitForTimeout(150);
 check(await card().count()===0&&await page.evaluate(()=>!!window.__playerController),'Escape closes card before exiting walkthrough');
 await page.getByRole('button',{name:/Thoát tham quan/}).click();await page.waitForTimeout(500);
 await page.getByLabel('Đi đến khu vực, trạm hoặc nhân viên').selectOption(`staff:${ids.staff}`);await page.waitForTimeout(700);
 // Exercise the actual equipment form on the world card; REST writes remain fixtures.
 await page.getByLabel('Đi đến khu vực, trạm hoặc nhân viên').selectOption(`workstation:${ids.station}`);await page.waitForTimeout(900);
 await card().getByRole('button',{name:'Thao tác'}).click();
 const actions=card().locator('[data-world-actions]');
 await actions.getByRole('button',{name:'Thiết bị',exact:true}).click();
 await actions.getByRole('button',{name:'Thêm thiết bị',exact:true}).click();
 await actions.getByLabel('Tên thiết bị',{exact:true}).fill('MOCK Added in 3D');
 await actions.getByLabel('Mã thiết bị',{exact:true}).fill('MOCK-3D');
 await actions.getByLabel('Loại thiết bị',{exact:true}).fill('COFFEE_MACHINE');
 for(const [width,height] of [[1366,768],[390,844]]){
  await page.setViewportSize({width,height});await page.waitForTimeout(400);
  check(await fits(),`3D action form fits ${width}`);
  check(await actions.evaluate(el=>el.scrollHeight>el.clientHeight),`3D action form scrolls at ${width}`);
 }
 await actions.getByRole('button',{name:'Lưu thiết bị',exact:true}).click();
 await actions.getByRole('status').filter({hasText:'Đã thêm thiết bị.'}).waitFor();
 check(equipment.some(e=>e.code==='MOCK-3D'),'Equipment saved through existing API from 3D card (fixture)');
 check(await page.getByRole('dialog').count()===0,'Equipment save never opens a 2D dialog');
 await card().getByRole('button',{name:'Quay lại thông tin'}).click();
 await card().getByText('MOCK Added in 3D',{exact:true}).waitFor();
 check(true,'Summary reloads equipment after inline edit');
 await page.setViewportSize({width:1920,height:1080});await page.waitForTimeout(300);
 await card().getByRole('button',{name:'Thao tác'}).click();await actions.getByRole('button',{name:'Thiết bị',exact:true}).click();
 await page.screenshot({path:'D:/ThucTapTotNghiep/ShiftSync/.playwright-mcp/world-actions-3d-1920.png'});
 check((await page.evaluate(()=>performance.getEntriesByType('resource').map(r=>r.name).filter(n=>/DigitalTwinXR|emulate-|react-three_xr/i.test(n)))).length===0,'No XR runtime requests');
 check(await page.getByRole('button',{name:/VR/}).count()===0,'No VR UI');
 check(errors.length===0,'No uncaught page errors');
 await page.screenshot({path:'D:/ThucTapTotNghiep/ShiftSync/.playwright-mcp/world-info-final-1920.png'});
 return {results,errors,consoleErrors};
 } finally { page.off('console',onConsole); page.off('pageerror',onError); }
}
