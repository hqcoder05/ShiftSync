// Full /schedule + actual WebGL. All API data is browser-only fixtures.
async (page) => {
 await page.setViewportSize({width:1920,height:1080});
 await page.goto('http://127.0.0.1:3000/login');
 const ids={store:'11111111-1111-4111-8111-111111111111',other:'22222222-2222-4222-8222-222222222222',zone:'33333333-3333-4333-8333-333333333333',zone2:'44444444-4444-4444-8444-444444444444',station:'55555555-5555-4555-8555-555555555555',staff:'66666666-6666-4666-8666-666666666666',shift:'77777777-7777-4777-8777-777777777777',assignment:'88888888-8888-4888-8888-888888888888'};
 const date='2026-10-19';
 const stores=[{id:ids.store,name:'MOCK · Explorer Coffee',category:'FOOD_BEVERAGE',address:'Browser test fixture'},{id:ids.other,name:'MOCK · Empty Store',category:'RETAIL',address:'Browser test fixture'}];
 const zones=[{id:ids.zone,storeId:ids.store,name:'Barista',code:'BAR',x:7,y:6,z:0,widthDim:5,lengthDim:5,capacity:2},{id:ids.zone2,storeId:ids.store,name:'Thu ngân',code:'POS',x:17,y:10,z:0,widthDim:4,lengthDim:4,capacity:1}];
 const stations=[{id:ids.station,storeId:ids.store,zoneId:ids.zone,zoneName:'Barista',name:'MOCK Espresso Station',code:'MOCK-WS',workstationType:'BARISTA',x:7,y:6,z:0,capacity:1,isActive:true}];
 const staff={id:ids.staff,staffId:ids.staff,fullName:'MOCK Employee',staffName:'MOCK Employee',email:'fixture@example.test',systemRole:'STAFF',skillName:'Barista'};
 const assignment={id:ids.assignment,shiftId:ids.shift,staffId:ids.staff,staffName:'MOCK Employee',zoneId:ids.zone,zoneName:'Barista',workstationId:ids.station,workstationName:'MOCK Espresso Station',skillName:'Barista'};
 const shifts=[{id:ids.shift,storeId:ids.store,name:'MOCK Full Day',shiftDate:date,date,startTime:'00:00:00',endTime:'23:59:00',status:'PUBLISHED',shiftAssignments:[assignment],skillRequirements:[],zoneRequirements:[]}];
 const equipment=[{id:'equipment-fixture',workstationId:ids.station,name:'MOCK Espresso Machine',code:'MOCK-E01',type:'COFFEE_MACHINE',status:'OPERATIONAL',notes:'Only in Playwright fixture'}];
 const requests=[]; const errors=[]; const consoleErrors=[];
 page.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text());});
 page.on('pageerror',error=>errors.push(error.message));
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
 await page.goto('http://127.0.0.1:3000/schedule');
 await page.getByRole('button',{name:'Không gian 3D',exact:true}).click();
 await page.locator('#spatial-workspace-container canvas').waitFor({timeout:20000});
 await page.waitForTimeout(3500);
 await page.locator('#spatial-workspace-container').scrollIntoViewIfNeeded();
 await page.screenshot({path:'D:/ThucTapTotNghiep/ShiftSync/.playwright-mcp/explorer-full-initial.png',fullPage:true});
 // Read-only observation of actual R3F scene and camera; actions below use UI/pointer events.
 await page.evaluate(async()=>{
  const fiber=await import('/node_modules/.vite/deps/@react-three_fiber.js');
  window.explorerSceneState=()=>fiber._roots.get(document.querySelector('#spatial-workspace-container canvas')).store.getState();
 });
 const results=[];
 const check=(condition,name)=>{if(!condition)throw new Error(name);results.push(name);};
 const sceneSnapshot=()=>page.evaluate(()=>{
  const state=window.explorerSceneState();let furniture=0,visibleFurniture=0,tags=[];
  state.scene.traverse(object=>{if(object.userData.layer==='furniture'){furniture++;if(object.visible)visibleFurniture++;}if(object.userData.isWorkstationTag)tags.push({...object.userData});});
  return {camera:state.camera.position.toArray(),cameraType:state.camera.type,avatars:state.scene.getObjectByName('avatarLayerGroup')?.children.length||0,furniture,visibleFurniture,tags};
 });
 const canvasPoint=type=>page.evaluate(async type=>{
  const THREE=await import('/node_modules/.vite/deps/three.js');
  const {pickSceneEntity}=await import('/src/features/spatial-workspace/utils/sceneSelection.js');
  const state=window.explorerSceneState(),canvas=state.gl.domElement,rect=canvas.getBoundingClientRect(),ray=new THREE.Raycaster();
  const selectionAt=(x,y)=>{
   if(document.elementFromPoint(x,y)!==canvas)return null;
   ray.setFromCamera(new THREE.Vector2((x-rect.left)/rect.width*2-1,-(y-rect.top)/rect.height*2+1),state.camera);
   return pickSceneEntity(ray.intersectObjects(state.scene.children,true));
  };
  for(let y=Math.max(rect.top+185,80);y<Math.min(innerHeight,rect.bottom-150);y+=8){
   for(let x=rect.left+20;x<Math.min(rect.right-10,innerWidth);x+=8){
    const selection=selectionAt(x,y);
    if(selection?.type!==type)continue;
    // Avoid a single boundary pixel: all surrounding pixels must hit the same entity.
    if([[4,0],[-4,0],[0,4],[0,-4]].every(([dx,dy])=>{const other=selectionAt(x+dx,y+dy);return other?.type===type&&other.value.id===selection.value.id;}))return{x,y,id:selection.value.id};
   }
  }
  throw new Error(`No unoccluded ${type} point found on canvas`);
 },type);
 const clickEntity=async type=>{const point=await canvasPoint(type);await page.mouse.click(point.x,point.y);return point;};
 const layoutChecks=await page.evaluate(async()=>{
  const {geometryFootprint,overlaps}=await import('/src/features/spatial-workspace/scene/StoreArrangement.js');
  const state=window.explorerSceneState();
  const customer=state.scene.getObjectByName('Customer_Furniture');
  const station=state.scene.getObjectByName('Workstation_Barista_01');
  const bounds=geometryFootprint(station);
  const cashier=state.scene.getObjectByName('Workstation_POS_01');
  const cashierBounds=geometryFootprint(cashier);
  const visible=customer.children.filter(child=>child.visible);
  const seats=visible.flatMap(node=>['Dining_Booths_Cluster','Bistro_Tables_And_Chairs'].includes(node.name)?node.children:[node]);
  const seatBounds=seats.map(geometryFootprint);
  const floor=geometryFootprint(state.scene.getObjectByName('Main_Floor_Plinth'));
  const pickup=state.scene.getObjectByName('Workstation_Service_01');
  const pickupBounds=geometryFootprint(pickup);
  const zoneFrames=[];state.scene.traverse(n=>{if(n.userData.physicalZoneFrame)zoneFrames.push(n);});
  const posZone=zoneFrames.find(n=>n.userData.zone.id==='44444444-4444-4444-8444-444444444444');
  const visibleZoneLabels=[];state.scene.traverse(n=>{if(n.userData.isZoneTag&&n.visible)visibleZoneLabels.push(n.userData.zoneId);});
  if(visibleZoneLabels.length!==2)throw new Error('Both barista and cashier labels must remain visible in overview');
  const realistic={allSeats:seats.length===9&&seats.every(n=>n.visible),floorBounds:seatBounds.every(b=>b.minX>=floor.minX+.44&&b.maxX<=floor.maxX-.44&&b.minZ>=floor.minZ+.44&&b.maxZ<=floor.maxZ-.44),seatClearance:seatBounds.every((b,i)=>seatBounds.every((other,j)=>i===j||!overlaps(b,other,.79))),pickup:pickup.visible&&Math.abs(pickupBounds.maxX-bounds.minX+.08)<.01,zoneAligned:posZone&&Math.abs(posZone.position.x-cashier.position.x)<.01,wayfinding:state.scene.getObjectByName('cafeWayfinding')?.children.length===4};
  const workspace=document.querySelector('#spatial-workspace-container').getBoundingClientRect();
  const timeline=document.querySelector('.se-timeline').getBoundingClientRect();
  const range=document.querySelector('.se-timeline input[type=range]');
  return {...realistic,seatingClear:visible.every(child=>{const box=geometryFootprint(child);return box.minX>=1.09&&!overlaps(box,bounds,.64);}),stationUnchanged:Math.abs(station.position.x+5)<.001&&Math.abs(station.position.z+2)<.001,cashierAdjacent:cashier.visible&&!cashier.userData.workstationId&&Math.abs(cashierBounds.minX-bounds.maxX-.08)<.01&&Math.abs(cashier.position.z-station.position.z)<.01,viewportFits:workspace.bottom<=innerHeight&&timeline.bottom<=innerHeight,range:{min:range.min,max:range.max},date:document.querySelector('input[aria-label="Ngày xem cửa hàng"]').value};
 });
 check(layoutChecks.seatingClear,'Customer seating preserves aisle and avoids live workstation');
 check(layoutChecks.stationUnchanged,'Saved workstation coordinates are preserved');
 check(layoutChecks.cashierAdjacent,'Physical cashier remains beside barista without fake operational binding');
 check(layoutChecks.viewportFits,'Workspace and timeline fit desktop viewport');
 check(layoutChecks.range.min==='0'&&layoutChecks.range.max==='1439','Timeline follows selected shift bounds');
 check(layoutChecks.date===date,'Context date and request date are consistent');
 check(layoutChecks.allSeats,'All nine complete seating sets are retained');
 check(layoutChecks.floorBounds,'All seating stays inside actual GLB floor bounds');
 check(layoutChecks.seatClearance,'Seating sets leave at least 0.8m clearance');
 check(layoutChecks.pickup,'Pickup continues the connected cashier and barista counter');
 check(layoutChecks.zoneAligned,'Cashier domain zone follows its physical counter');
 check(layoutChecks.wayfinding,'Order pickup and main aisle wayfinding are rendered');
 let snap=await sceneSnapshot();
 check(snap.avatars===1,'GLB scene has assigned workforce avatar');
 check(snap.furniture>0,'GLB furniture loaded');
 await page.locator('#btn-mode-topdown').click();
 await page.waitForFunction(()=>window.explorerSceneState().camera.isOrthographicCamera);
 await page.waitForTimeout(120);
 check(await page.evaluate(()=>{let count=0;window.explorerSceneState().scene.traverse(n=>{if(n.userData.isZoneTag&&n.visible)count++;});return count===2;}),'Cashier and barista labels remain visible in top-down');
 results.push('Top-down activates real orthographic camera');
 await clickEntity('workstation');
 await page.getByRole('group',{name:'Nội dung trạm'}).waitFor();
 check((await page.getByRole('complementary',{name:'Chi tiết cửa hàng'}).innerText()).includes('MOCK Espresso Station'),'Canvas workstation click selects correct inspector');
 await page.getByRole('group',{name:'Nội dung trạm'}).getByRole('button',{name:'Nhân sự & ca'}).click();
 const staffText=await page.getByRole('complementary',{name:'Chi tiết cửa hàng'}).innerText();
 check(staffText.includes('MOCK Employee')&&staffText.includes('Có mặt')&&staffText.includes(date),'Inspector shows assignment shift and attendance');
 await page.getByRole('group',{name:'Nội dung trạm'}).getByRole('button',{name:'Thiết bị',exact:true}).click();
 const equipmentPanel=page.getByRole('region',{name:'Thiết bị tại trạm'});
 await equipmentPanel.getByText('MOCK Espresso Machine',{exact:true}).waitFor();
 results.push('Equipment loaded through selected workstation API');
 await equipmentPanel.getByRole('button',{name:'Thêm thiết bị',exact:true}).click();
 const form=equipmentPanel.getByRole('form');
 await form.getByLabel('Tên thiết bị').fill('MOCK Grinder');await form.getByLabel('Mã thiết bị').fill('MOCK-E02');await form.getByLabel('Loại thiết bị').fill('GRINDER');
 await form.getByRole('button',{name:'Lưu thiết bị'}).click();await equipmentPanel.getByText('MOCK Grinder',{exact:true}).waitFor();
 check(requests.some(request=>request.method==='POST'&&request.path.includes('/equipment')),'Equipment create uses mocked POST from full page');
 await page.locator('#btn-mode-workstation').click();
 await page.waitForFunction(async()=>{const t=await import('/node_modules/.vite/deps/three.js');const s=window.explorerSceneState();const aim=new t.Vector3(-5,.9,-2).project(s.camera);return s.camera.isPerspectiveCamera&&Math.abs(aim.x)<.03&&Math.abs(aim.y)<.03;});
 results.push('Workstation camera reaches converted API coordinates');
 await page.locator('#btn-mode-topdown').click();
 await page.waitForFunction(()=>window.explorerSceneState().camera.isOrthographicCamera);
 await page.waitForTimeout(120);
 await clickEntity('zone');
 await page.waitForFunction(()=>document.querySelector('#btn-mode-zone')?.getAttribute('aria-pressed')==='true');
 await page.waitForTimeout(800);
 snap=await sceneSnapshot();check(snap.cameraType==='PerspectiveCamera','Direct zone click changes camera to perspective focus');
 check(await page.getByRole('group',{name:'Nội dung trạm'}).count()===0,'Zone selection clears workstation inspector');
 await page.locator('#btn-mode-overview').click();await page.waitForFunction(()=>{const p=window.explorerSceneState().camera.position;return Math.hypot(p.x-20.4,p.y-20.4,p.z-16.8)<0.2;});
 results.push('Overview camera returns to store view');
 await page.getByRole('button',{name:'Nội thất',exact:true}).click();
 snap=await sceneSnapshot();check(snap.visibleFurniture===0&&snap.avatars===1,'Furniture off does not hide workforce');
 await page.getByRole('button',{name:'Nhân sự',exact:true}).click();
 snap=await sceneSnapshot();check(snap.avatars===0&&snap.tags.length===1,'Workforce off preserves workstations');
 await page.getByRole('button',{name:'Điểm danh',exact:true}).click();
 snap=await sceneSnapshot();check(snap.tags.every(tag=>tag.showAttendance===false),'Attendance off updates actual tag sprites');
 for(const label of ['Nội thất','Nhân sự','Điểm danh'])await page.getByRole('button',{name:label,exact:true}).click();
 snap=await sceneSnapshot();check(snap.avatars===1&&snap.visibleFurniture>0&&snap.tags.every(tag=>tag.showAttendance),'All three layers restore independently');
 await page.locator('#spatial-workspace-container').screenshot({path:'D:/ThucTapTotNghiep/ShiftSync/.playwright-mcp/explorer-full-verified.png'});
 // Store change through the application's store selector, not component injection.
 await page.locator('#spatial-workspace-container select').first().selectOption(ids.other);
 await page.waitForFunction(()=>document.querySelector('.se-context-left select')?.selectedOptions[0]?.textContent.includes('Empty Store'));
 await page.waitForTimeout(700);
 check(await page.getByRole('group',{name:'Nội dung trạm'}).count()===0,'Store switch clears selected entity');
 snap=await sceneSnapshot();check(snap.avatars===0&&snap.tags.length===0,'Empty store contains no previous workforce or workstations');
 check(!await equipmentPanel.count(),'Empty store does not retain old equipment');
 await page.locator('#spatial-workspace-container').screenshot({path:'D:/ThucTapTotNghiep/ShiftSync/.playwright-mcp/explorer-full-empty.png'});
 check(errors.length===0,'No uncaught browser errors throughout full journey');
 check(consoleErrors.length===0,'No browser console errors throughout full journey'+(consoleErrors.length?': '+JSON.stringify(consoleErrors):''));
 return {url:page.url(),results,errors,consoleErrors,equipmentRequests:requests.filter(request=>request.path.includes('/equipment')),requestCount:requests.length};
}
