async page=>{
 const results=[],errors=[];const onError=e=>errors.push(e.message);page.on('pageerror',onError);
 const check=(value,name)=>{if(!value)throw new Error(name);results.push(name);};
 await page.setViewportSize({width:1920,height:1080});await page.goto('http://127.0.0.1:3000/crew-preview.html');
 await page.getByRole('status').filter({hasText:'Kéo để xoay'}).waitFor();
 const inspect=()=>page.evaluate(()=>window.crewPreview.crew.map(inst=>({name:inst.modelRoot.getObjectByName('Hips')?.name,head:!!inst.joints.head,knee:!!inst.joints.leftKnee,elbow:!!inst.joints.rightElbow,hipAngle:inst.joints.leftHip.rotation.x,kneeAngle:inst.joints.leftKnee?.rotation.x,version:inst.modelRoot.getObjectByName('Hips')?.parent.userData.designVersion})));
 const lineup=await inspect();check(lineup.length===4&&lineup.every(n=>n.head&&n.knee&&n.elbow),'All four actual GLB models load with complete animation joints');
 check(lineup.every(n=>n.version===2),'Preview uses Crew V2 assets');
 await page.screenshot({path:'D:/ThucTapTotNghiep/ShiftSync/.playwright-mcp/crew-012-lineup.png'});
 await page.getByRole('button',{name:'Xem chuyển động đi bộ'}).click();
 await page.waitForTimeout(200);const first=await inspect();await page.waitForTimeout(200);const second=await inspect();
 check(first.some((n,i)=>Math.abs(n.hipAngle-second[i].hipAngle)>.03),'Walking animates hips over time');
 check(first.some(n=>n.kneeAngle>.02)||second.some(n=>n.kneeAngle>.02),'Walking bends knees instead of swinging rigid legs');
 await page.screenshot({path:'D:/ThucTapTotNghiep/ShiftSync/.playwright-mcp/crew-012-walk.png'});
 await page.getByRole('button',{name:'Dừng chuyển động'}).click();await page.waitForTimeout(100);
 check((await inspect()).every(n=>Math.abs(n.hipAngle)<.001&&Math.abs(n.kneeAngle)<.001),'Stopping returns legs to a neutral pose');
 // Explicitly fail all asset requests; preview still uses the matching complete procedural design.
 await page.route('**/models/crew-v2/*.glb',route=>route.fulfill({status:503,body:'Controlled character failure'}));
 await page.reload();await page.getByRole('status').filter({hasText:'Kéo để xoay'}).waitFor();
 const fallback=await inspect();check(fallback.length===4&&fallback.every(n=>n.version===2&&n.knee&&n.head),'Failed downloads retain the same complete Crew V2 fallback');
 await page.unroute('**/models/crew-v2/*.glb');await page.reload();await page.getByRole('status').filter({hasText:'Kéo để xoay'}).waitFor();
 check(errors.length===0,'No uncaught errors in asset load movement or fallback');page.off('pageerror',onError);
 return{results,lineup,errors,viewport:page.viewportSize()};
}
