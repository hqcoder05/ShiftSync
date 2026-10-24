// Real routed application; API/session fixtures are confined to this browser page.
async page=>{
 const results=[],errors=[],requests=[];const check=(ok,name)=>{if(!ok)throw new Error(name);results.push(name);};
 const errorHandler=error=>errors.push(error.message);page.on('pageerror',errorHandler);
 const first='11111111-1111-4111-8111-111111111111',second='22222222-2222-4222-8222-222222222222';
 const stores=[{id:first,name:'MOCK · ShiftSync Thủ Đức',category:'FOOD_BEVERAGE',address:'Phạm Văn Đồng, Thủ Đức'},{id:second,name:'MOCK · ShiftSync Nguyễn Huệ',category:'FOOD_BEVERAGE',address:'Nguyễn Huệ, Quận 1'}];
 let unread=3;
 await page.setViewportSize({width:1920,height:1080});await page.goto('http://127.0.0.1:3000/login');
 await page.unroute('**/api/**');
 if(page.routeWebSocket)await page.routeWebSocket('**/ws/**',ws=>ws.close());
 await page.route('**/api/**',async route=>{
  const request=route.request(),path=new URL(request.url()).pathname;requests.push({method:request.method(),path});
  const respond=json=>route.fulfill({status:200,json});
  if(path==='/api/stores'||path==='/api/stores/directory')return respond({content:stores});
  if(path.endsWith('/layout'))return respond({length:24,width:16,height:6});
  if(path.endsWith('/unread-count'))return respond({unreadCount:unread});
  if(path==='/api/users/me/notifications')return respond([{id:'fixture-notification',type:'SYSTEM',message:'MOCK · Lịch tuần đã cập nhật',isRead:!unread,createdAt:'2026-10-20T00:00:00Z'}]);
  if(path.endsWith('/notifications/read-all')&&request.method()==='PUT'){unread=0;return respond({});}
  if(path.includes('/configuration'))return respond({});
  return respond([]);
 });
 await page.evaluate(first=>{localStorage.clear();Object.entries({accessToken:'PLAYWRIGHT_MOCK_NOT_A_REAL_SESSION',userRole:'MANAGER',userName:'Nguyễn Việt Quốc',userEmail:'fixture@example.test',selectedStoreId:first,'shiftsync-theme':'light','shiftsync-style':'warm','shiftsync-nav-style':'contrast'}).forEach(([key,value])=>localStorage.setItem(key,value));},first);
 const ready=async()=>{await page.locator('.ssn-topbar').waitFor();await page.getByRole('button',{name:/Chọn cửa hàng: MOCK/}).waitFor();};
 const fits=()=>page.evaluate(()=>{const r=document.querySelector('.ssn').getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&document.documentElement.scrollWidth<=innerWidth;});
 const shot=async name=>{await page.waitForTimeout(180);return page.screenshot({path:`D:/ThucTapTotNghiep/ShiftSync/.playwright-mcp/navbar-011-${name}.png`});};
 try{
  await page.goto('http://127.0.0.1:3000/schedule');await ready();
  check(await fits()&&await page.locator('.ssn-nav>.ssn-item').count()===6,'Wide header fits and exposes all six navigation groups');
  check((await page.locator('.ssn-item.on>.ssn-tab').innerText()).includes('Lập lịch ca'),'Current route is clearly selected');
  check(await page.getByRole('button',{name:'Cài đặt',exact:true}).isVisible(),'Settings remains directly visible');
  await shot('wide');
  await page.getByRole('button',{name:/Chọn cửa hàng:/}).click();
  check(await page.locator('#ssn-store-panel button').count()===2,'Store selector lists actual available stores');
  await page.locator('#ssn-store-panel button').filter({hasText:'Nguyễn Huệ'}).click();
  await page.getByRole('button',{name:/Chọn cửa hàng:.*Nguyễn Huệ/}).waitFor();
  check(await page.evaluate(id=>localStorage.getItem('selectedStoreId')===id,second),'Explicit store selection updates shared store context');
  await page.getByRole('button',{name:/Chọn cửa hàng:/}).click();await page.locator('#ssn-store-panel button').filter({hasText:'Thủ Đức'}).click();
  const settings=page.getByRole('button',{name:'Cài đặt',exact:true});await settings.focus();await page.keyboard.press('ArrowDown');
  await page.locator('#ssn-settings-panel').waitFor();
  check(await page.evaluate(()=>document.activeElement?.textContent.includes('Cấu hình cửa hàng')),'ArrowDown opens a dropdown and focuses its first link');
  await shot('menu');await page.keyboard.press('Escape');
  check(await settings.getAttribute('aria-expanded')==='false'&&await settings.evaluate(n=>n===document.activeElement),'Escape closes dropdown and restores trigger focus');
  await page.getByRole('button',{name:'Lập lịch ca',exact:true}).click();await page.mouse.click(1000,750);
  check(await page.locator('#ssn-sched-panel').count()===0,'Outside click dismisses navigation dropdown');
  await page.getByRole('button',{name:'Tìm trang và chức năng'}).click();
  const input=page.getByRole('textbox',{name:'Tên trang hoặc chức năng'});await input.fill('giao dien');
  check(await page.locator('.ssn-command-results a').count()===1,'Page search supports Vietnamese text without diacritics');
  await shot('search');await input.fill('khong-co-trang-nay');
  check(await page.getByRole('status').filter({hasText:'Không tìm thấy trang'}).isVisible(),'Search provides a useful empty result state');
  await input.fill('giao dien');await page.keyboard.press('Enter');
  await page.waitForURL('**/settings?tab=appearance');
  await page.locator('.sc-tab-btn.active').filter({hasText:'Giao diện'}).waitFor();
  check((await page.locator('.sc-tab-btn.active').innerText()).includes('Giao diện'),'Search navigates to the actual appearance settings tab');
  await page.keyboard.press('Control+k');await page.getByRole('textbox',{name:'Tên trang hoặc chức năng'}).waitFor();
  check(await page.evaluate(()=>document.activeElement?.tagName==='INPUT'),'Ctrl K opens search with input focus');
  await page.keyboard.press('Shift+Tab');check(await page.getByRole('button',{name:'Đóng tìm kiếm'}).evaluate(n=>n===document.activeElement),'Search keyboard navigation stays inside the dialog');
  await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'Cài đặt',exact:true}).click();await page.getByRole('link',{name:/Quy tắc lên lịch/}).click();await page.waitForURL('**/settings?tab=schedule');
  await page.locator('.sc-tab-btn.active').filter({hasText:'Quy tắc'}).waitFor();
  check((await page.locator('.sc-tab-btn.active').innerText()).includes('Quy tắc'),'Settings submenu reaches the requested schedule tab');
  await page.getByRole('button',{name:'Chuyển sang giao diện tối'}).click();await page.waitForFunction(()=>document.documentElement.dataset.theme==='dark');await shot('dark');
  check(await page.evaluate(()=>localStorage.getItem('shiftsync-theme')==='dark'),'Theme toggle persists the selected appearance');
  await page.getByRole('button',{name:'Chuyển sang giao diện sáng'}).click();
  await page.getByRole('button',{name:/Thông báo, 3 chưa đọc/}).click();await page.getByRole('dialog',{name:'Thông báo',exact:true}).waitFor();
  check(await page.getByText('MOCK · Lịch tuần đã cập nhật').isVisible(),'Notification badge and content use supplied API data');
  await page.getByRole('button',{name:'Đánh dấu đã đọc'}).click();
  await page.getByRole('button',{name:/Thông báo, 0 chưa đọc/}).waitFor();
  check(requests.some(r=>r.method==='PUT'&&r.path.endsWith('/notifications/read-all')),'Notification action still calls the existing mocked API');
  await page.keyboard.press('Escape');
  await page.getByRole('link',{name:'Cửa hàng 3D',exact:true}).click();await page.locator('#spatial-workspace-container canvas').waitFor();
  await page.waitForFunction(async()=>{const fiber=await import('/node_modules/.vite/deps/@react-three_fiber.js');const canvas=document.querySelector('#spatial-workspace-container canvas');return fiber._roots.get(canvas)?.store.getState().scene.getObjectByName('ShiftSync_Store_DigitalTwin')?.userData.storeDesignVersion===2;});
  check(await page.evaluate(()=>document.querySelector('#spatial-workspace-container').getBoundingClientRect().bottom<=innerHeight+1),'3D store shortcut works and workspace fits below the new header');await shot('store');
  await page.goto('http://127.0.0.1:3000/schedule');await ready();
  await page.setViewportSize({width:1440,height:900});check(await fits()&&await page.getByRole('button',{name:'Cài đặt',exact:true}).isVisible(),'Laptop retains visible desktop navigation without overflow');await shot('laptop');
  await page.setViewportSize({width:390,height:844});check(await fits()&&await page.getByRole('button',{name:/Chọn cửa hàng:/}).isVisible(),'Mobile keeps store identity and fits the viewport');await shot('mobile');
  await page.getByRole('button',{name:'Mở menu điều hướng'}).click();await page.getByRole('button',{name:'Lập lịch ca',exact:true}).click();
  check(await page.getByRole('link',{name:/Lịch tuần Xếp ca/}).isVisible(),'Mobile drawer exposes usable nested navigation');await shot('drawer');
  await page.keyboard.press('Escape');check(await page.getByRole('button',{name:'Mở menu điều hướng'}).evaluate(n=>n===document.activeElement),'Closing the mobile drawer restores focus to its trigger');
  await page.getByRole('button',{name:'Tìm trang và chức năng'}).click();await input.waitFor();check(await page.getByRole('dialog',{name:'Tìm trang và chức năng'}).isVisible(),'Mobile retains functional page search');await page.keyboard.press('Escape');
  await page.getByRole('button',{name:/Thông báo,/}).click();const popup=await page.getByRole('dialog',{name:'Thông báo',exact:true}).boundingBox();check(popup.x>=0&&popup.x+popup.width<=390,'Mobile notifications stay inside the screen');await page.keyboard.press('Escape');
  await page.setViewportSize({width:1920,height:1080});
  const themes=[];
  for(const style of ['warm','emerald','ocean','minimal'])for(const navStyle of ['contrast','surface']){
   await page.evaluate(({style,navStyle})=>{localStorage.setItem('shiftsync-style',style);localStorage.setItem('shiftsync-nav-style',navStyle);}, {style,navStyle});await page.reload();await ready();
   if(!await fits())throw new Error(`${style}/${navStyle} overflow`);themes.push(`${style}/${navStyle}`);
  }
  check(themes.length===8,'All four palettes and both navbar styles fit correctly');
  await page.evaluate(()=>{localStorage.setItem('userRole','STAFF');localStorage.setItem('shiftsync-style','warm');localStorage.setItem('shiftsync-nav-style','contrast');});await page.reload();await ready();
  check(await page.getByRole('button',{name:'Hồ sơ nhân sự',exact:true}).count()===0,'Staff navigation omits the protected HR group');
  await page.keyboard.press('Control+k');await input.fill('nhan vien');check(await page.locator('.ssn-command-results a[href="/employees"]').count()===0,'Staff search omits protected HR destinations');await page.keyboard.press('Escape');
  await page.evaluate(()=>localStorage.setItem('userRole','MANAGER'));await page.reload();await ready();
  await page.getByRole('button',{name:'Tài khoản Nguyễn Việt Quốc'}).click();await page.getByRole('button',{name:'Đăng xuất',exact:true}).click();await page.waitForURL('**/login');
  check(await page.evaluate(()=>!localStorage.getItem('accessToken')),'Logout still clears the session and reaches login');
  check(errors.length===0,'No uncaught browser errors throughout navbar journeys');
  await page.evaluate(first=>{localStorage.setItem('accessToken','PLAYWRIGHT_MOCK_NOT_A_REAL_SESSION');localStorage.setItem('userRole','MANAGER');localStorage.setItem('userName','Nguyễn Việt Quốc');localStorage.setItem('selectedStoreId',first);},first);
  await page.goto('http://127.0.0.1:3000/schedule');await ready();await shot('verified');
  return{results,errors,themes,viewport:page.viewportSize(),writes:requests.filter(r=>r.method!=='GET')};
 }finally{page.off('pageerror',errorHandler);}
}
