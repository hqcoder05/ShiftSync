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
 const shifts=[{id:ids.shift,storeId:ids.store,name:'MOCK Full Day',shiftDate:date,date,startTime:'00:00:00',endTime:'23:59:00',status:'DRAFT',shiftAssignments:[assignment],skillRequirements:[],zoneRequirements:[]}];
 const equipment=[{id:'equipment-fixture',workstationId:ids.station,name:'MOCK Espresso Machine',code:'MOCK-E01',type:'COFFEE_MACHINE',status:'OPERATIONAL',notes:'Only in Playwright fixture'}];
 let rejectPlannerCandidate=false; let failRead=false;
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
  if(path.endsWith('/auto-schedule')){
   shifts[0].shiftAssignments.push({id:'auto-result',staffId:'candidate-fixture',staffName:'MOCK Linh',zoneId:ids.zone2,zoneName:'Thu ngân',source:'AUTO'});
   return respond({totalDemandSlots:3,totalAssignedSlots:2,newAssignmentsCreated:1,shortageSlots:1,coverageRate:66.67,spatialAllocationStatus:'PARTIAL',message:'Kết quả fixture từ máy chủ',shortages:[{shiftId:ids.shift,zoneId:ids.zone2,zoneName:'Thu ngân',requiredCount:2,assignedCount:1,shortageCount:1,primaryReason:'NO_QUALIFIED_STAFF',diagnosticDetails:'Không còn nhân sự đủ kỹ năng'}],requirementCoverages:[{shiftId:ids.shift,zoneId:ids.zone2,zoneName:'Thu ngân',requiredCount:2,assignedCount:1,shortageCount:1}]});
  }
  if(path.endsWith('/shifts'))return failRead?respond({message:'Fixture failure'},503):respond(other?[]:shifts);
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

 const results=[]; const check=(v,n)=>{if(!v)throw Error(n);results.push(n);};
 const postCount=()=>requests.filter(r=>r.method==='POST'&&r.path.endsWith('/auto-schedule')).length;
 await page.locator('.sch-capsule-ai-btn').waitFor({timeout:15000});
 await page.locator('.sch-capsule-ai-btn').click();
 await page.getByRole('button',{name:'Xem trước vị trí',exact:true}).click();
 const dialog=page.getByRole('dialog',{name:'Trực quan xếp lịch tự động'}); await dialog.waitFor();
 check(postCount()===0,'Preview does not POST');
 check(await dialog.getByRole('button',{name:'Trước khi xếp',exact:true}).getAttribute('aria-pressed')==='true','Initial before view');
 check(await dialog.getByText('MOCK Employee',{exact:true}).count()>0,'Before snapshot shows existing staff');
 check(await dialog.getByRole('button',{name:'Kết quả đã lưu',exact:true}).isDisabled(),'No fabricated result before run');
 await dialog.getByRole('button',{name:'Xếp và lưu lịch',exact:true}).click();
 await dialog.getByRole('button',{name:'Kết quả đã lưu',exact:true}).waitFor({state:'visible'});
 await page.waitForFunction(()=>document.querySelector('.asv-tabs button:last-child')?.getAttribute('aria-pressed')==='true');
 check(postCount()===1,'Run sends exactly one POST');
 check((await dialog.locator('.asv-metrics').innerText()).includes('66.67%'),'Coverage uses server coverageRate');
 check(await dialog.getByText('Không còn nhân sự đủ kỹ năng',{exact:true}).count()===1,'Shortage diagnosis from backend');
 check(await dialog.locator('.asv-table .asv-added').count()===1,'New assignment highlighted');
 await dialog.locator('.asv-details details').first().locator('summary').click();
 check(await dialog.getByText('Máy chủ chưa cung cấp lý do lựa chọn cho từng nhân viên.',{exact:true}).isVisible(),'No invented employee selection reason');
 await dialog.getByRole('button',{name:'Phát lại thay đổi',exact:true}).click();
 check(await dialog.getByRole('slider',{name:'Bước phát lại'}).inputValue()==='0','Replay starts at before snapshot');
 await dialog.getByRole('button',{name:'Phát lại',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('.asv-playback input').value==='1');
 check(await dialog.locator('.asv-table .asv-added').count()===1,'Replay reveals saved assignment');
 await dialog.getByRole('button',{name:'Về đầu',exact:true}).click();
 check(await dialog.locator('.asv-table .asv-added').count()===0,'Rewind restores before');
 await dialog.getByRole('button',{name:'Kết quả đã lưu',exact:true}).click();
 await dialog.getByRole('button',{name:'Xem không gian 3D',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('.asv-canvas canvas'));
 await page.waitForTimeout(1500);
 check(await dialog.locator('canvas').count()===1,'Actual WebGL canvas renders result');
 check(postCount()===1,'Playback and 3D do not resubmit');
 await page.screenshot({path:'D:/ThucTapTotNghiep/ShiftSync/.playwright-mcp/autoscheduler-025-edge.png'});
 await page.setViewportSize({width:390,height:844});
 check(await page.evaluate(()=>document.documentElement.scrollWidth===document.documentElement.clientWidth),'Mobile document not clipped horizontally');
 await dialog.getByRole('button',{name:'Xem bảng vị trí',exact:true}).click();
 await dialog.locator('.asv-details').scrollIntoViewIfNeeded();
 check(await dialog.locator('.asv-details details').last().isVisible(),'Bottom diagnostics reachable on mobile');
 await page.setViewportSize({width:1920,height:1080});
 check(errors.length===0,'No uncaught errors');
 return {results,errors,consoleErrors,userAgent:await page.evaluate(()=>navigator.userAgent),viewport:page.viewportSize()};
 }finally{page.off('console',onConsole);page.off('pageerror',onError);}
}
