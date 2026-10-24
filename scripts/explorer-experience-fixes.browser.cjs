// Run explorer-full-mock.browser.cjs first. API fixtures remain browser-only.
async page => {
 const results=[],errors=[];
 const onError=error=>errors.push(error.message);page.on('pageerror',onError);
 const check=(condition,name)=>{if(!condition)throw new Error(name);results.push(name);};
 const store='11111111-1111-4111-8111-111111111111',posId='44444444-4444-4444-8444-444444444444';
 const glb='**/models/store-v2/shiftsync-cafe.glb';
 await page.setViewportSize({width:1920,height:1080});
 await page.goto('http://127.0.0.1:3000/schedule');
 await page.getByRole('button',{name:'Không gian 3D',exact:true}).click();
 await page.locator('.se-context-left select').first().selectOption(store);
 await page.waitForFunction(()=>[...document.querySelectorAll('select[aria-label="Đi đến khu vực, trạm hoặc nhân viên"] option')].some(n=>n.textContent==='Thu ngân'));
 const observe=()=>page.evaluate(async()=>{
  const fiber=await import('/node_modules/.vite/deps/@react-three_fiber.js');
  window.explorerSceneState=()=>fiber._roots.get(document.querySelector('#spatial-workspace-container canvas'))?.store.getState();
 });
 await observe();await page.waitForFunction(()=>!!window.explorerSceneState()?.scene.getObjectByName('Workstation_POS_01'));
 await page.waitForTimeout(350);
 const physical=await page.evaluate(()=>{const out={};window.explorerSceneState().scene.traverse(n=>{if(n.isGroup&&n.userData.physicalZoneFrame&&n.userData.zone.name==='Thu ngân')out.zone=n.position.toArray();if(n.name==='Workstation_POS_01')out.counter=n.position.toArray();});return out;});
 await page.locator('#btn-mode-floorplan').click();
 const diagram=await page.locator(`[data-zone-id="${posId}"]`).evaluate(n=>({x:Number(n.dataset.storeX)-12,z:Number(n.dataset.storeY)-8}));
 check(Math.abs(diagram.x-physical.zone[0])<.001&&Math.abs(diagram.z-physical.zone[2])<.001,'2D zone uses the rendered 3D zone position: '+JSON.stringify({diagram,physical}));
 const diagramOverlap=await page.evaluate(()=>{
  const overlap=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
  const cards=[...document.querySelectorAll('[data-zone-id]')].map(n=>n.querySelector('rect').getBoundingClientRect());
  const labels=[...document.querySelectorAll('[data-workstation-id] rect')].map(n=>n.getBoundingClientRect());
  return{cards:cards.every((a,i)=>cards.every((b,j)=>i===j||!overlap(a,b))),labels:labels.every(a=>cards.every(b=>!overlap(a,b)))};
 });
 check(diagramOverlap.cards,'Adjacent 2D zone cards do not overlap');
 check(diagramOverlap.labels,'Workstation labels do not cover zone occupancy');
 await page.screenshot({path:'D:/ThucTapTotNghiep/ShiftSync/.playwright-mcp/explorer-010-2d.png'});
 await page.getByRole('button',{name:'🌐 Trở lại Không gian 3D',exact:true}).click();
 await observe();await page.waitForFunction(()=>!!window.explorerSceneState()?.scene.getObjectByName('Workstation_POS_01'));
 await page.waitForTimeout(350);await page.locator('#btn-enter-explore').click();
 await page.waitForFunction(()=>!!window.__playerController);
 const modes=[];
 for(let i=0;i<4;i++){
  await page.keyboard.press('v');await page.waitForTimeout(100);
  modes.push(await page.evaluate(()=>({mode:window.__playerController.viewMode,label:document.querySelector('#btn-toggle-view').innerText,fov:window.explorerSceneState().camera.fov})));
 }
 check(modes.every((m,i)=>m.label.includes(m.mode==='first_person'?'thứ 1':'thứ 3')&&m.fov===(m.mode==='first_person'?75:68)&&(i===0||m.mode!==modes[i-1].mode)),'Repeated V keeps controller HUD and FOV synchronized');
 await page.keyboard.down('d');await page.waitForTimeout(1400);await page.keyboard.up('d');await page.waitForTimeout(150);
 const collision=await page.evaluate(async()=>{
  const {geometryFootprint}=await import('/src/features/spatial-workspace/scene/StoreArrangement.js');
  const c=window.__playerController,b=geometryFootprint(window.explorerSceneState().scene.getObjectByName('Bistro_Table_Group_2'));
  return {position:c.position.toArray(),radius:c.radius,table:b};
 });
 check(collision.position[0]>.5&&collision.position[0]+collision.radius<=collision.table.minX+.01,'Walking stops before the actual table and chairs');
 const obstacles=await page.evaluate(()=>window.__playerController.obstacles.map(o=>({name:o.name,type:o.type})));
 check(obstacles.filter(o=>o.type==='column').length===2&&!obstacles.some(o=>o.type==='zone'||o.name==='Workstation_Kitchen_01'),'No duplicate columns phantom zone boxes or hidden kitchen collision');
 check(obstacles.filter(o=>o.type==='furniture').length===9,'All nine physical seating sets participate in collision');
 await page.locator('#btn-teleport-menu').click();await page.getByRole('button',{name:'Thu ngân',exact:true}).click();
 const landing=await page.evaluate(()=>{const c=window.__playerController;return{position:c.position.toArray(),clear:!c.obstacles.some(b=>c.position.x+c.radius>b.minX&&c.position.x-c.radius<b.maxX&&c.position.z+c.radius>b.minZ&&c.position.z-c.radius<b.maxZ)};});
 check(landing.clear&&Math.abs(landing.position[0]-physical.counter[0])<1&&landing.position[2]>physical.counter[2]&&landing.position[2]-physical.counter[2]<2,'Cashier teleport lands safely in front of the physical POS');
 await page.keyboard.down('d');await page.waitForTimeout(500);await page.keyboard.up('d');
 const moved=await page.evaluate(()=>window.__playerController.position.x);
 check(moved>landing.position[0]+.5,'Player can walk away after cashier teleport');
 await page.screenshot({path:'D:/ThucTapTotNghiep/ShiftSync/.playwright-mcp/explorer-010-explore.png'});
 await page.keyboard.press('Escape');await page.waitForFunction(()=>!window.__playerController);
 check(await page.locator('#btn-enter-explore').count()===1,'Escape returns from exploration');
 // Controlled slow failure, followed by the real retry button and a successful asset request.
 await page.route(glb,async route=>{await new Promise(resolve=>setTimeout(resolve,2500));await route.fulfill({status:503,body:'Controlled test failure'});},{times:1});
 await page.reload();await page.getByRole('button',{name:'Không gian 3D',exact:true}).click();
 await page.getByRole('status').filter({hasText:'Đang tải mô hình cửa hàng 3D'}).waitFor();
 check(await page.locator('.se-webgl-surface[aria-busy=true]').count()===1,'Slow model load exposes a visible accessible busy state');
 await page.screenshot({path:'D:/ThucTapTotNghiep/ShiftSync/.playwright-mcp/explorer-010-loading.png'});
 await page.getByRole('alert').filter({hasText:'Không tải được mô hình chi tiết'}).waitFor();
 check(await page.getByRole('button',{name:'Thử tải lại mô hình',exact:true}).count()===1,'Failed model load explains fallback and offers retry');
 await page.screenshot({path:'D:/ThucTapTotNghiep/ShiftSync/.playwright-mcp/explorer-010-model-error.png'});
 await page.getByRole('button',{name:'Thử tải lại mô hình',exact:true}).click();
 await observe();await page.waitForFunction(()=>!!window.explorerSceneState()?.scene.getObjectByName('ShiftSync_Store_DigitalTwin'));
 await page.waitForFunction(()=>!document.querySelector('.se-model-status'));
 check(await page.locator('.se-webgl-surface[aria-busy=true]').count()===0,'Retry loads the actual GLB and clears loading/error state');
 check(errors.length===0,'No uncaught application errors during experience regression');
 page.off('pageerror',onError);
 await page.screenshot({path:'D:/ThucTapTotNghiep/ShiftSync/.playwright-mcp/explorer-010-desktop.png'});
 return{results,modes,landing,collision,errors,viewport:page.viewportSize()};
}
