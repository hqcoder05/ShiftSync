// Run after test-world-info.browser.cjs; APIs remain browser fixtures.
async page => {
 const results=[];const check=(v,label)=>{if(!v)throw new Error(label);results.push(label);};
 await page.setViewportSize({width:1920,height:1080});
 const card=page.locator('[data-world-info]');
 if(await card.count()){
  await card.getByRole('button',{name:'Thông tin trạm',exact:true}).click();
  await card.getByRole('button',{name:'Bật chế độ di chuyển trạm',exact:true}).click();
 }
 await page.waitForTimeout(300);
 check((await page.locator('#spatial-workspace-container').innerText()).includes('CHẾ ĐỘ BỐ TRÍ TRẠM'),'Editor explicitly enables group dragging');
 await page.evaluate(()=>{
  const state=window.explorerSceneState(),roots=[];
  state.scene.traverse(n=>{if(n.userData.isGlbWorkstation&&n.userData.workstationId)roots.push(n);});
  window.groupDragController={workstationMeshes:roots,camera:state.camera,get selectedMesh(){return roots[0];}};
 });
 const baseline=await page.evaluate(()=>{
  const c=window.groupDragController,g=c.workstationMeshes[0];
  window.groupInitial={position:g.position.clone(),rotation:g.rotation.y,children:new Map()};
  g.traverse(n=>{if(n!==g&&!n.isSprite)window.groupInitial.children.set(n.uuid,{p:n.position.toArray(),r:n.rotation.toArray()});});
  return g.name;
 });
 const point=await page.evaluate(async()=>{
  const THREE=await import('/node_modules/.vite/deps/three.js');
  const c=window.groupDragController,g=c.workstationMeshes[0],rect=document.querySelector('canvas').getBoundingClientRect();
  const ray=new THREE.Raycaster();let result=null;
  g.updateWorldMatrix(true,true);
  g.traverse(n=>{
   if(result||!n.isMesh||n.isSprite)return;
   n.geometry.computeBoundingBox();const p=n.geometry.boundingBox.getCenter(new THREE.Vector3());n.localToWorld(p);p.project(c.camera);
   if(Math.abs(p.x)>.95||Math.abs(p.y)>.95)return;
   ray.setFromCamera(new THREE.Vector2(p.x,p.y),c.camera);const hits=ray.intersectObjects(c.workstationMeshes,true);
   if(hits[0])result={x:rect.x+(p.x+1)*rect.width/2,y:rect.y+(1-p.y)*rect.height/2};
  });return result;
 });
 check(!!point,'Real canvas ray hits equipment within workstation assembly');
 await page.mouse.move(point.x,point.y);await page.mouse.down();
 await page.mouse.move(point.x+90,point.y+65,{steps:10});await page.mouse.up();await page.waitForTimeout(250);
 const moved=await page.evaluate(()=>{
  const c=window.groupDragController,g=c.selectedMesh,original=window.groupInitial;
  let childChanged=false;g?.traverse(n=>{const v=original.children.get(n.uuid);if(v&&(JSON.stringify(v.p)!==JSON.stringify(n.position.toArray())||JSON.stringify(v.r)!==JSON.stringify(n.rotation.toArray())))childChanged=true;});
  return {root:c.workstationMeshes.includes(g),moved:g&&!g.position.equals(original.position),childChanged};
 });
 check(moved.root&&moved.moved,'Dragging actual child geometry moves its registered root');
 check(!moved.childChanged,'Every equipment local transform stays intact after real drag');
 await page.getByRole('button',{name:'Hủy',exact:true}).click();await page.waitForTimeout(100);
 check(await page.evaluate(()=>window.groupDragController.selectedMesh.position.equals(window.groupInitial.position)),'Cancel restores group to last saved baseline');
 await page.mouse.move(point.x,point.y);await page.mouse.down();await page.mouse.move(point.x+80,point.y+40,{steps:10});await page.mouse.up();await page.waitForTimeout(100);
 await page.getByRole('button',{name:'Đóng',exact:true}).click();await page.waitForTimeout(200);
 check(await page.evaluate(()=>window.groupDragController.workstationMeshes[0].position.equals(window.groupInitial.position)),'Exiting editor restores unsaved group placement');
 await page.screenshot({path:'D:/ThucTapTotNghiep/ShiftSync/.playwright-mcp/workstation-group-safe-1920.png'});
 return {results,baseline};

}
