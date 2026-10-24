// Full /schedule + actual WebGL. All API data is browser-only fixtures.
async (page) => {
 const handleDialog=dialog=>dialog.type()==='beforeunload'?dialog.accept():dialog.dismiss();page.on('dialog',handleDialog);
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
 let design={revision:0,document:null}; const designHistory=[];let designWrites=0,conflict=false;
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
  if(path.includes('/design')){
   if(path.endsWith('/design/versions'))return respond(designHistory.map(v=>({revision:v.revision,createdAt:v.createdAt})));
   if(path.includes('/design/versions/'))return respond(designHistory.find(v=>v.revision===Number(path.split('/').at(-1)))||{});
   if(request.method()==='PUT'){
    const body=request.postDataJSON();if(conflict||body.baseRevision!==design.revision)return respond({message:'Conflict'},409);
    design={revision:design.revision+1,document:JSON.parse(JSON.stringify(body.document)),createdAt:new Date().toISOString()};designHistory.unshift(design);designWrites++;return respond(design);
   }
   return respond(other?{revision:0,document:null}:design);
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
 await page.evaluate(()=>{localStorage.clear();localStorage.setItem('accessToken','PLAYWRIGHT_MOCK_SESSION_NOT_A_REAL_TOKEN');localStorage.setItem('userRole','MANAGER');localStorage.setItem('userEmail','fixture@example.test');localStorage.setItem('userId','manager-fixture');localStorage.setItem('theme','light');});

 await page.goto('http://127.0.0.1:3000/schedule?view=3d');
 await page.locator('#spatial-workspace-container canvas').waitFor();
 await page.waitForTimeout(2000);
 await page.evaluate(async()=>{const f=await import('/node_modules/.vite/deps/@react-three_fiber.js');window.explorerSceneState=()=>f._roots.get(document.querySelector('canvas')).store.getState();});
 const results=[];const check=(v,label)=>{if(!v)throw new Error(label);results.push(label);};
 await page.getByRole('button',{name:'Thiết kế cửa hàng',exact:true}).click();
 const editor=page.getByRole('dialog',{name:'Thiết kế cửa hàng',exact:true});
 await editor.getByRole('heading',{name:'Thư viện đồ vật',exact:true}).waitFor();
 check(await page.locator('canvas').count()===1,'Designer uses one active WebGL canvas');
 check(await editor.locator('.sd-tree-item').count()>8,'Existing cafe seeds complete assemblies');
 check((await page.evaluate(()=>navigator.userAgent)).includes('Edg/'),'Microsoft Edge desktop1920');
 await editor.getByRole('button',{name:'Tạo mặt bằng trống',exact:true}).click();
 await editor.getByRole('button',{name:'Xác nhận',exact:true}).click();
 check(await editor.locator('.sd-tree-item').count()===0,'Blank floor is an undoable draft');
 await editor.locator('.sd-catalog').getByRole('button',{name:/Bàn đơn/}).click();
 await editor.locator('.sd-catalog').getByRole('button',{name:/Ghế đơn/}).click();
 await editor.locator('.sd-tree-item').filter({hasText:'Bàn đơn'}).click();
 await editor.locator('.sd-tree-item').filter({hasText:'Ghế đơn'}).click({modifiers:['Shift']});
 await editor.getByRole('button',{name:'Gom nhóm',exact:true}).click();
 check(await editor.locator('.sd-tree-item').count()===3,'Grouping keeps both child objects');
 await editor.locator('.sd-tree-item').filter({hasText:'Nhóm đồ vật'}).click();
 await editor.getByRole('button',{name:'Xoay 90°',exact:true}).click();
 // Drag an actual rendered gizmo with the mouse, not a synthetic transform.
 const dragPoint=await page.evaluate(async()=>{
  const T=await import('/node_modules/.vite/deps/three.js'),state=window.explorerSceneState();let gizmo;
  state.scene.traverse(n=>{if(n.type==='TransformControlsGizmo')gizmo=n;});
  const arrow=gizmo.gizmo.translate.children.filter(n=>n.name==='X'&&n.visible).at(-1);arrow.geometry.computeBoundingBox();
  const p=arrow.geometry.boundingBox.getCenter(new T.Vector3());arrow.localToWorld(p);p.project(state.camera);
  const root=state.scene.getObjectByName('ShiftSync_Store_DigitalTwin');window.designerDragBefore=new Map();root.traverse(n=>{if(n.userData.designItemId)window.designerDragBefore.set(n.userData.designItemId,n.position.toArray());});
  const r=document.querySelector('canvas').getBoundingClientRect();return{x:r.x+(p.x+1)*r.width/2,y:r.y+(1-p.y)*r.height/2};
 });
 await page.mouse.move(dragPoint.x,dragPoint.y);await page.mouse.down();await page.mouse.move(dragPoint.x+70,dragPoint.y,{steps:10});await page.mouse.up();await page.waitForTimeout(100);
 check(await page.evaluate(()=>{let changed=0;window.explorerSceneState().scene.traverse(n=>{const p=window.designerDragBefore.get(n.userData.designItemId);if(p&&JSON.stringify(p)!==JSON.stringify(n.position.toArray()))changed++;});return changed===1;}),'Real gizmo drag moves only the selected group root');
 await editor.getByRole('button',{name:'Khóa',exact:true}).click();
 check(await editor.locator('.sd-properties-form input').first().isDisabled(),'Locked group prevents editing');
 await editor.locator('.sd-tree-item').filter({hasText:'Bàn đơn'}).click();
 check(await editor.locator('.sd-properties-form input').first().isDisabled(),'Parent lock protects child transforms');
 await editor.locator('.sd-tree-item').filter({hasText:'Nhóm đồ vật'}).click();
 await editor.getByRole('button',{name:'Mở khóa',exact:true}).click();
 await editor.getByRole('button',{name:'Nhân bản',exact:true}).click();
 check(await editor.locator('.sd-tree-item').count()===6,'Duplicate remaps group and children');
 await editor.getByRole('button',{name:'Hoàn tác',exact:true}).click();
 check(await editor.locator('.sd-tree-item').count()===3,'Undo removes duplicated assembly');
 await editor.getByRole('button',{name:'Làm lại',exact:true}).click();
 check(await editor.locator('.sd-tree-item').count()===6,'Redo restores duplicated assembly');
 await editor.getByRole('button',{name:'Lưu & áp dụng',exact:true}).click();
 await editor.getByRole('status').filter({hasText:'Đã lưu phiên bản 1'}).waitFor();
 check(designWrites===1&&design.document.items.length===6,'Explicit save writes full scene snapshot once');
 check(design.document.items.some(i=>i.asset==='group'&&Math.abs(i.rotation-Math.PI/2)<.01),'Rotation saved with group hierarchy');
 await editor.getByRole('button',{name:'Đóng thiết kế',exact:true}).click();
 await page.waitForTimeout(1200);
 check(await page.evaluate(()=>{const s=window.explorerSceneState();return !!s.scene.getObjectByName('ShiftSync_Store_DigitalTwin')?.userData.customDesign;}),'Saved design replaces template in operational scene');
 await page.getByRole('button',{name:'Thiết kế cửa hàng',exact:true}).click();
 await editor.getByRole('heading',{name:'Thư viện đồ vật',exact:true}).waitFor();
 check(await editor.locator('.sd-tree-item').count()===6,'Reopening restores server scene');
 await editor.getByRole('button',{name:'Tạo mặt bằng trống',exact:true}).click();await editor.getByRole('button',{name:'Xác nhận',exact:true}).click();
 await editor.getByRole('button',{name:'Lưu & áp dụng',exact:true}).click();await editor.getByRole('status').filter({hasText:'Đã lưu phiên bản 2'}).waitFor();
 await editor.getByLabel('Khôi phục phiên bản',{exact:true}).selectOption('1');await page.waitForTimeout(200);
 check(await editor.locator('.sd-tree-item').count()===6&&designWrites===2,'History restoration is a draft until explicit save');
 conflict=true;await editor.getByRole('button',{name:'Lưu & áp dụng',exact:true}).click();await editor.getByRole('status').filter({hasText:'Có phiên bản mới'}).waitFor();
 check(await editor.locator('.sd-tree-item').count()===6&&designWrites===2,'409 preserves draft and never overwrites newer design');conflict=false;
 for(const [width,height]of [[1366,768],[390,844]]){
  await page.setViewportSize({width,height});await page.waitForTimeout(250);
  check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`No page overflow at ${width}`);
  if(width===390)await editor.getByRole('button',{name:'Đồ vật & thuộc tính',exact:true}).click();
  const box=await editor.boundingBox();check(box.x>=0&&box.y>=0&&box.width<=width+1&&box.height<=height+1,`Designer fits ${width}`);
 }
 await page.setViewportSize({width:1920,height:1080});await page.waitForTimeout(200);
 await editor.getByRole('button',{name:'Đóng thiết kế',exact:true}).click();
 check(await editor.getByRole('alertdialog').count()===1,'Unsaved close requires retaining the draft');
 await editor.getByRole('button',{name:'Giữ bản nháp & đóng',exact:true}).click();
 await page.getByRole('button',{name:'Thiết kế cửa hàng',exact:true}).click();await editor.getByRole('button',{name:'Khôi phục bản nháp trên máy',exact:true}).waitFor();
 await editor.getByRole('button',{name:'Khôi phục bản nháp trên máy',exact:true}).click();
 check(await editor.locator('.sd-tree-item').count()===6,'Local draft survives closing the editor');
 await editor.getByRole('button',{name:'Lưu & áp dụng',exact:true}).click();await editor.getByRole('status').filter({hasText:'Đã lưu phiên bản 3'}).waitFor();
 // Import uses validated JSON and cannot introduce arbitrary remote assets.
 const invalid=Buffer.from(JSON.stringify({schemaVersion:1,floor:{length:24,width:16,height:3.5},items:[{id:'bad',asset:'https://invalid/model.glb',name:'Unsafe',locked:false,position:[0,0,0],rotation:0,scale:1}]}));
 await editor.locator('input[type=file]').setInputFiles({name:'invalid.json',mimeType:'application/json',buffer:invalid});
 await editor.getByRole('status').filter({hasText:'không thuộc thư viện'}).waitFor();check(await editor.locator('.sd-tree-item').count()===6,'Invalid import preserves current scene');
 await editor.locator('.sd-catalog').getByRole('button',{name:/Cụm pha chế/}).click();
 await editor.getByLabel('Gắn trạm vận hành',{exact:true}).selectOption(ids.station);
 const input=editor.getByLabel('X (m)',{exact:true});await input.fill('-3');await input.press('Enter');
 await editor.getByRole('button',{name:'Lưu & áp dụng',exact:true}).click();await editor.getByRole('status').filter({hasText:'Đã lưu phiên bản 4'}).waitFor();
 check(design.document.items.some(i=>i.workstationId===ids.station&&i.position[0]===-3),'Station binding and transformed location are persisted');
 await editor.getByRole('button',{name:'Đóng thiết kế',exact:true}).click();await page.waitForTimeout(1000);
 check(await page.evaluate(stationId=>{const state=window.explorerSceneState();let found=false;state.scene.traverse(n=>{if(n.userData.workstationId===stationId&&n.userData.isWorkstation&&Math.abs(n.matrixWorld.elements[12]+3)<.01)found=true;});return found;},ids.station),'Operational workstation uses saved design transform, not old API coordinates');
 await page.getByRole('button',{name:'Thiết kế cửa hàng',exact:true}).click();await editor.getByRole('heading',{name:'Thư viện đồ vật',exact:true}).waitFor();
 const downloadPromise=page.waitForEvent('download');await editor.getByRole('button',{name:'Xuất tệp',exact:true}).click();const download=await downloadPromise;check(download.suggestedFilename().endsWith('.json'),'Export downloads a portable scene document');
 await editor.getByRole('button',{name:'Đóng thiết kế',exact:true}).click();
 await page.goto('http://127.0.0.1:3000/schedule');await page.getByRole('button',{name:'3D Schedule Planner',exact:true}).click();
 await page.waitForTimeout(1500);
 const plannerState=await page.evaluate(async stationId=>{
  const f=await import('/node_modules/.vite/deps/@react-three_fiber.js');const s=f._roots.get(document.querySelector('#spatial-workspace-container canvas')).store.getState();let station,avatar;
  s.scene.traverse(n=>{if(n.userData.isWorkstation&&n.userData.workstationId===stationId)station=n;if(n.userData.isPerson&&n.userData.employee?.workstationId===stationId)avatar=n;});
  return {custom:s.scene.getObjectByName('ShiftSync_Store_DigitalTwin')?.userData.customDesign,x:station?.matrixWorld.elements[12],staffTargetX:avatar?.userData.targetPos?.x};
 },ids.station);
 check(plannerState.custom&&Math.abs(plannerState.x+3)<.01,'Planner loads the same saved custom store');
 check(Math.abs(plannerState.staffTargetX+3)<1,'Planner avatar follows the bound physical workstation');
 await page.goto('http://127.0.0.1:3000/schedule?view=3d');await page.getByRole('button',{name:'Thiết kế cửa hàng',exact:true}).click();await editor.getByRole('heading',{name:'Thư viện đồ vật',exact:true}).waitFor();
 await editor.getByRole('button',{name:'Dùng mẫu quán',exact:true}).click();await editor.getByRole('button',{name:'Xác nhận',exact:true}).click();
 check(await editor.locator('.sd-tree-item').count()>8,'Cafe template can be restored without losing the asset library');
 const lengthField=editor.getByLabel('Dài (m)',{exact:true});await lengthField.fill('26');await lengthField.press('Enter');
 await editor.getByRole('button',{name:'Lưu & áp dụng',exact:true}).click();await editor.getByRole('status').filter({hasText:'Đã lưu phiên bản 5'}).waitFor();
 check(design.document.floor.length===26,'Floor dimensions persist with the design version');
 await page.screenshot({path:'D:/ThucTapTotNghiep/ShiftSync/.playwright-mcp/store-designer-1920.png'});
 check(errors.length===0,'No uncaught browser errors');return {results,errors,consoleErrors,designWrites};
 }finally{page.off('console',onConsole);page.off('pageerror',onError);page.off('dialog',handleDialog);}
}
