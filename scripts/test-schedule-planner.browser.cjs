// Full /schedule + actual WebGL. All API data is browser-only fixtures.
async (page) => {
 await page.setViewportSize({width:1920,height:1080});
 await page.unroute('**/api/**');
 await page.goto('http://127.0.0.1:3000/login');
 const ids={store:'11111111-1111-4111-8111-111111111111',other:'22222222-2222-4222-8222-222222222222',zone:'33333333-3333-4333-8333-333333333333',zone2:'44444444-4444-4444-8444-444444444444',station:'55555555-5555-4555-8555-555555555555',staff:'66666666-6666-4666-8666-666666666666',shift:'77777777-7777-4777-8777-777777777777',assignment:'88888888-8888-4888-8888-888888888888'};
 const localISO = value => `${value.getFullYear()}-${String(value.getMonth()+1).padStart(2,'0')}-${String(value.getDate()).padStart(2,'0')}`;
 const date=localISO(new Date());
 const emptyDay=new Date(); emptyDay.setDate(emptyDay.getDate()+2);
 const stores=[{id:ids.store,name:'MOCK · Explorer Coffee',category:'FOOD_BEVERAGE',address:'Browser test fixture'},{id:ids.other,name:'MOCK · Empty Store',category:'RETAIL',address:'Browser test fixture'}];
 const zones=[{id:ids.zone,storeId:ids.store,name:'Barista',code:'BAR',x:7,y:6,z:0,widthDim:5,lengthDim:5,capacity:2},{id:ids.zone2,storeId:ids.store,name:'Thu ngân',code:'POS',x:17,y:10,z:0,widthDim:4,lengthDim:4,capacity:1}];
 const stations=[{id:ids.station,storeId:ids.store,zoneId:ids.zone,zoneName:'Barista',name:'MOCK Espresso Station',code:'MOCK-WS',workstationType:'BARISTA',x:7,y:6,z:0,capacity:1,isActive:true}];
 const staff={id:ids.staff,staffId:ids.staff,fullName:'MOCK Employee',staffName:'MOCK Employee',email:'fixture@example.test',systemRole:'STAFF',skillName:'Barista'};
 const assignment={id:ids.assignment,shiftId:ids.shift,staffId:ids.staff,staffName:'MOCK Employee',zoneId:ids.zone,zoneName:'Barista',workstationId:ids.station,workstationName:'MOCK Espresso Station',skillName:'Barista'};
 const shifts=[{id:ids.shift,storeId:ids.store,name:'MOCK Full Day',shiftDate:date,date,startTime:'00:00:00',endTime:'23:59:00',status:'PUBLISHED',shiftAssignments:[assignment],skillRequirements:[],zoneRequirements:[]}];
 const equipment=[{id:'equipment-fixture',workstationId:ids.station,name:'MOCK Espresso Machine',code:'MOCK-E01',type:'COFFEE_MACHINE',status:'OPERATIONAL',notes:'Only in Playwright fixture'}];
 let rejectPlannerCandidate=false;
 const requests=[]; const errors=[]; const consoleErrors=[];
 const onConsole=message=>{if(message.type()==='error')consoleErrors.push(message.text());};
 const onError=error=>errors.push(error.message);
 page.on('console',onConsole);
 page.on('pageerror',onError);
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
  if(path.endsWith('/eligible-staff')){
   const target=shifts.find(s=>path.includes(s.id));
   if(rejectPlannerCandidate)return respond([]);
   return respond(target?.shiftAssignments.some(a=>a.staffId==='candidate-fixture')?[]:[{id:'employment-fixture',staffId:'candidate-fixture',staffFullName:'MOCK Linh',status:'ACTIVE'}]);
  }
  if(path.endsWith('/assignments')&&request.method()==='POST'){
   const target=shifts.find(s=>path.includes(s.id)),payload=request.postDataJSON();
   if(target.shiftAssignments.some(a=>a.staffId===payload.staffId))return respond({message:'Đã được phân công'},409);
   const item={...payload,id:'planner-saved',staffName:'MOCK Linh'};target.shiftAssignments.push(item);return respond(item);
  }
  if(path.endsWith('/assignments'))return respond(other?[]:[assignment]);
  if(path.endsWith('/staff')||path==='/api/users')return respond({content:other?[]:[staff],totalElements:other?0:1});
  if(path.endsWith('/skills'))return respond([{id:'skill-fixture',name:'Barista'}]);
  if(path.endsWith('/unread-count'))return respond({count:0});
  return respond([]);
 });
 await page.evaluate(()=>{localStorage.clear();localStorage.setItem('accessToken','PLAYWRIGHT_MOCK_SESSION_NOT_A_REAL_TOKEN');localStorage.setItem('userRole','MANAGER');localStorage.setItem('userEmail','fixture@example.test');localStorage.setItem('userId','manager-fixture');localStorage.setItem('theme','light');});
 await page.goto('http://127.0.0.1:3000/schedule');
 await page.getByRole('button',{name:'3D Schedule Planner',exact:true}).click();
 const results=[];const check=(value,name)=>{if(!value)throw new Error(name);results.push(name);};
 await page.getByRole('region',{name:'3D Schedule Planner'}).waitFor();
 check(await page.getByRole('button',{name:'Spatial',exact:true}).getAttribute('aria-pressed')==='true','Planner opens in Spatial mode');
 await page.waitForTimeout(1800);
 await page.waitForFunction(async()=>{const f=await import('/node_modules/.vite/deps/@react-three_fiber.js');return !!f._roots.get(document.querySelector('#spatial-workspace-container canvas'))?.store.getState().scene.getObjectByName('Workstation_POS_01');});
 const point=await page.evaluate(async()=>{
  const fiber=await import('/node_modules/.vite/deps/@react-three_fiber.js'),THREE=await import('/node_modules/.vite/deps/three.js');
  const {pickSceneEntity}=await import('/src/features/spatial-workspace/utils/sceneSelection.js');
  const canvas=document.querySelector('#spatial-workspace-container canvas'),s=fiber._roots.get(canvas).store.getState(),rect=canvas.getBoundingClientRect(),ray=new THREE.Raycaster();
  const pick=(x,y)=>{ray.setFromCamera(new THREE.Vector2((x-rect.left)/rect.width*2-1,-(y-rect.top)/rect.height*2+1),s.camera);return pickSceneEntity(ray.intersectObjects(s.scene.children,true));};
  for(let y=rect.top+120;y<rect.bottom-15;y+=6)for(let x=rect.left+20;x<rect.right-20;x+=6){const hit=pick(x,y);if(hit?.type==='zone'&&hit.value.name==='Thu ngân'&&[[3,0],[-3,0],[0,3],[0,-3]].every(([dx,dy])=>pick(x+dx,y+dy)?.value?.id===hit.value.id))return{x,y};}
  return null;
 });
 if(!point)throw new Error('Missing visible cashier pad');await page.mouse.click(point.x,point.y);
 await page.waitForTimeout(700);
 check(await page.locator('select[aria-label="Khu vực lập lịch"]').inputValue()===ids.zone2,'Actual 3D empty-zone click opens its candidate context');
 const labelPixels=await page.evaluate(async()=>{const f=await import('/node_modules/.vite/deps/@react-three_fiber.js'),T=await import('/node_modules/.vite/deps/three.js');const s=f._roots.get(document.querySelector('#spatial-workspace-container canvas')).store.getState(),widths=[];s.scene.traverse(n=>{if(n.userData.isZoneTag&&n.visible){const p=n.getWorldPosition(new T.Vector3()).applyMatrix4(s.camera.matrixWorldInverse);widths.push(n.scale.x/(-p.z)*s.camera.projectionMatrix.elements[5]*s.size.height/2);}});return widths;});
 check(labelPixels.length===2&&labelPixels.every(width=>width<=177),'Zone labels stay within screen size after camera focus');
 await page.screenshot({path:'D:/ThucTapTotNghiep/ShiftSync/.playwright-mcp/planner-011-spatial.png'});
 await page.getByRole('button',{name:'Matrix',exact:true}).click();
 const empty=page.getByRole('button',{name:'Thu ngân, MOCK Full Day, 1 vị trí trống',exact:true});await empty.click();
 await page.locator('.sp-candidate').filter({hasText:'MOCK Linh'}).waitFor();
 const candidate=page.locator('.sp-candidate').filter({hasText:'MOCK Linh'});
 check(await candidate.getByRole('button',{name:'Thêm vào bản nháp'}).isEnabled(),'Empty slot shows eligible candidate');
 await candidate.getByRole('button',{name:'Thêm vào bản nháp'}).click();
 check(await page.getByRole('button',{name:'Áp dụng (1)',exact:true}).isEnabled(),'Draft enables explicit apply');
 check(requests.filter(r=>r.method==='POST'&&r.path.endsWith('/assignments')).length===0,'Adding draft does not write API');
 await page.getByRole('button',{name:'← Lịch ca',exact:true}).click();
 await page.getByRole('alertdialog',{name:'Bản nháp chưa lưu'}).waitFor();
 await page.getByRole('button',{name:'Tiếp tục lập lịch',exact:true}).click();
 check(await page.getByRole('button',{name:'Áp dụng (1)',exact:true}).isEnabled(),'Unsaved draft is protected when leaving planner');
 check(await candidate.getByRole('button',{name:'Thêm vào bản nháp'}).isDisabled(),'Duplicate assignment is blocked');
 await page.getByRole('button',{name:'Timeline',exact:true}).click();
 check(await page.getByRole('button',{name:'Thu ngân, MOCK Full Day, xem ứng viên',exact:true}).count()===1,'Timeline displays shift per zone');
 await page.getByRole('button',{name:'Spatial',exact:true}).click();
 await page.locator('#spatial-workspace-container canvas').waitFor();
 await page.evaluate(async()=>{const f=await import('/node_modules/.vite/deps/@react-three_fiber.js');window.__plannerState=()=>f._roots.get(document.querySelector('#spatial-workspace-container canvas'))?.store.getState();});
 const draftHandle=await page.waitForFunction(()=>{const s=window.__plannerState();if(!s)return false;let point=null;s.scene.traverse(n=>{if(n.isGroup&&n.userData.isPerson&&n.userData.employee?.staffId==='candidate-fixture'&&n.userData.currentPos?.x<0&&n.userData.currentPos?.z<-3)point=n.userData.targetPos?.toArray();});return point||false;});
 const draftPosition=await draftHandle.jsonValue();
 check(draftPosition&&draftPosition[0]<0&&draftPosition[2]<-3,'Zone-only draft avatar stands behind the physical cashier: '+JSON.stringify(draftPosition));
 check(await page.getByRole('button',{name:'Áp dụng (1)',exact:true}).count()===1,'Draft is preserved across all three modes');
 await page.getByRole('button',{name:'Matrix',exact:true}).click();
 await page.getByRole('button',{name:'Hoàn tác',exact:true}).click();
 check(await page.getByRole('button',{name:'Áp dụng (0)',exact:true}).isDisabled(),'Undo removes draft');
 await candidate.getByRole('button',{name:'Thêm vào bản nháp'}).click();
 rejectPlannerCandidate=true;
 await page.getByRole('button',{name:'Áp dụng (1)',exact:true}).click();
 await page.getByRole('status').filter({hasText:'không còn đủ điều kiện'}).waitFor();
 check(requests.filter(r=>r.method==='POST'&&r.path.endsWith('/assignments')).length===0,'Changed eligibility blocks save without losing draft');
 rejectPlannerCandidate=false;
 await page.getByRole('button',{name:'Áp dụng (1)',exact:true}).click();
 await page.getByRole('status').filter({hasText:'Đã lưu 1 phân công'}).waitFor();
 check(requests.filter(r=>r.method==='POST'&&r.path.endsWith('/assignments')).length===1,'Apply makes one assignment POST after revalidation');
 check(!shifts[0].shiftAssignments.find(a=>a.staffId==='candidate-fixture').force,'Apply never bypasses availability validation');
 await page.getByRole('button',{name:'Timeline',exact:true}).click();
 await page.screenshot({path:'D:/ThucTapTotNghiep/ShiftSync/.playwright-mcp/planner-011-timeline.png'});
 await page.getByRole('button',{name:'Matrix',exact:true}).click();
 await page.screenshot({path:'D:/ThucTapTotNghiep/ShiftSync/.playwright-mcp/planner-011-matrix.png'});
 // Introduce a real fixture overlap in server data, then reload through UI.
 shifts.push({...shifts[0],id:'conflicting-shift',name:'MOCK Overlap',startTime:'10:00',endTime:'14:00',shiftAssignments:[{staffId:ids.staff,staffName:'MOCK Employee',zoneId:ids.zone}]});
 await page.reload();await page.getByRole('button',{name:'3D Schedule Planner',exact:true}).click();
 await page.getByRole('alert').filter({hasText:'trùng lịch'}).waitFor();
 check(await page.getByRole('alert').filter({hasText:'trùng lịch'}).count()===1,'Loaded overlapping assignments show warning');
 await page.getByRole('button',{name:'Xem phân công',exact:true}).first().click();
 check(await page.getByRole('button',{name:'Matrix',exact:true}).getAttribute('aria-pressed')==='true','Conflict action navigates to its shift in Matrix');
 check((await page.getByRole('alert').filter({hasText:'trùng lịch'}).innerText()).includes('10:00'),'Conflict includes the actual overlapping time');
 await page.screenshot({path:'D:/ThucTapTotNghiep/ShiftSync/.playwright-mcp/planner-011-conflict.png'});
 shifts.pop();
 await page.getByRole('textbox',{name:'Ngày lập lịch'}).count();
 await page.locator('input[aria-label="Ngày lập lịch"]').fill(localISO(emptyDay));
 await page.getByText('Chưa có ca làm cho ngày này.',{exact:false}).waitFor();
 check(await page.getByRole('button',{name:'Áp dụng (0)',exact:true}).isDisabled(),'Empty date disables applying');
 check(errors.length===0,'No uncaught browser errors');
 return {results,errors,consoleErrors,requests:requests.filter(r=>r.path.includes('eligible-staff')||r.method==='POST'),viewport:page.viewportSize()};
 } finally { page.off('console',onConsole); page.off('pageerror',onError); }
}
