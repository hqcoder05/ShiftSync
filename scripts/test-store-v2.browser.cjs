// Real GLB/WebGL design review; no API calls or business data writes.
async page=>{
 await page.setViewportSize({width:1920,height:1080});
 const errors=[],results=[];const onError=e=>errors.push(e.message);page.on('pageerror',onError);
 const check=(ok,name)=>{if(!ok)throw new Error(name);results.push(name);};
 try{
  await page.goto('http://127.0.0.1:3000/store-preview.html');await page.waitForFunction(()=>!!window.storePreview);
  const structure=await page.evaluate(async()=>{
   const {geometryFootprint,overlaps}=await import('/src/features/spatial-workspace/scene/StoreArrangement.js');
   const root=window.storePreview.model,columns=[],counters=[];root.traverse(n=>{if(n.isGroup&&n.userData.isColumn)columns.push(n);if(['Workstation_POS_01','Workstation_Barista_01','Workstation_Service_01','Workstation_Kitchen_01'].includes(n.name))counters.push(n);});
   return{version:root.userData.storeDesignVersion,clear:columns.every(c=>counters.every(w=>!overlaps(geometryFootprint(c),geometryFootprint(w),.1))),counters:counters.length};
  });
  check(structure.version===2&&structure.counters===4,'Preview loads the actual versioned cafe GLB and four semantic counters');
  check(structure.clear,'Columns clear all physical counters');
  check(await page.locator('#scene').getAttribute('aria-busy')==='false','Successful load clears the accessible loading state');
  await page.waitForTimeout(200);await page.screenshot({path:'D:/ThucTapTotNghiep/ShiftSync/.playwright-mcp/store-013-overview.png'});
  await page.getByRole('button',{name:'Mặt bằng',exact:true}).click();
  check(await page.evaluate(()=>window.storePreview.camera.position.y>30&&Math.abs(window.storePreview.camera.position.x)<.01),'Floor plan changes the actual camera pose');
  await page.screenshot({path:'D:/ThucTapTotNghiep/ShiftSync/.playwright-mcp/store-013-top.png'});
  await page.getByRole('button',{name:'Xem quầy',exact:true}).click();
  check(await page.evaluate(()=>window.storePreview.controls.target.x===-4.2)&&await page.locator('#counter').getAttribute('aria-pressed')==='true','Counter focus updates camera target and selected button');
  await page.screenshot({path:'D:/ThucTapTotNghiep/ShiftSync/.playwright-mcp/store-013-counter.png'});
  for(const[id,layer]of [['walls','walls'],['lights','ceiling']]){
   await page.locator('#'+id).click();
   check(await page.evaluate(layer=>{let count=0,shown=0;window.storePreview.model.traverse(n=>{if(n.userData.layer===layer){count++;if(n.visible)shown++;}});return count>0&&shown===0;},layer),`${layer} visibility changes actual semantic objects`);
   await page.locator('#'+id).click();
  }
  await page.getByRole('button',{name:'Toàn cảnh',exact:true}).click();
  const before=await page.evaluate(()=>window.storePreview.camera.position.toArray());
  await page.mouse.move(1050,540);await page.mouse.down();await page.mouse.move(1200,590,{steps:10});await page.mouse.up();await page.waitForTimeout(200);
  check(await page.evaluate(before=>window.storePreview.camera.position.distanceTo({x:before[0],y:before[1],z:before[2]})>.1,before),'Dragging rotates the actual model view');
  const distance=await page.evaluate(()=>window.storePreview.camera.position.distanceTo(window.storePreview.controls.target));await page.mouse.wheel(0,-250);await page.waitForTimeout(200);
  check(await page.evaluate(d=>window.storePreview.camera.position.distanceTo(window.storePreview.controls.target)<d,distance),'Wheel zoom moves the camera closer');
  await page.setViewportSize({width:390,height:844});await page.reload();await page.waitForFunction(()=>!!window.storePreview);
  const fit=await page.evaluate(async()=>{
   const THREE=await import('/node_modules/.vite/deps/three.js');const s=window.storePreview;
   s.camera.updateMatrixWorld();const bounds=new THREE.Box3().setFromObject(s.model),points=[];
   for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z])points.push(new THREE.Vector3(x,y,z).project(s.camera));
   return{overflow:document.documentElement.scrollWidth>innerWidth,fit:points.every(p=>Math.abs(p.x)<.98&&Math.abs(p.y)<.98)};
  });
  check(!fit.overflow&&fit.fit,'Narrow preview fits the whole model without horizontal page overflow');
  await page.screenshot({path:'D:/ThucTapTotNghiep/ShiftSync/.playwright-mcp/store-013-narrow.png'});
  check(errors.length===0,'No uncaught errors during preview interactions');
  await page.setViewportSize({width:1920,height:1080});await page.reload();await page.waitForFunction(()=>!!window.storePreview);
  return{results,errors,viewport:page.viewportSize(),metrics:await page.evaluate(()=>({calls:window.storePreview.renderer.info.render.calls,triangles:window.storePreview.renderer.info.render.triangles}))};
 }finally{page.off('pageerror',onError);}
}
