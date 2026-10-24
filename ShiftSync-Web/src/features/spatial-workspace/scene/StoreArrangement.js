import * as THREE from 'three';

/** Furniture is illustrative. Saved workstation coordinates remain authoritative. */
export function overlaps(a, b, gap = 0) {
 return a.minX < b.maxX + gap && a.maxX > b.minX - gap && a.minZ < b.maxZ + gap && a.maxZ > b.minZ - gap;
}
export function geometryFootprint(object) {
 const box = new THREE.Box3();
 object.updateWorldMatrix(true, true);
 object.traverse(node => {
  if (!node.isMesh || node.isSprite || !node.geometry) return;
  if (!node.geometry.boundingBox) node.geometry.computeBoundingBox();
  box.union(node.geometry.boundingBox.clone().applyMatrix4(node.matrixWorld));
 });
 if (box.isEmpty()) box.setFromCenterAndSize(object.getWorldPosition(new THREE.Vector3()), new THREE.Vector3(1, 1, 1));
 return { minX:box.min.x, maxX:box.max.x, minZ:box.min.z, maxZ:box.max.z, top:box.max.y };
}
export function findFurniturePlacement(size, layout, blockers, preferred = {x:0,z:0}, options = {}) {
 const halfL = (Number(layout.length)||24)/2, halfW=(Number(layout.width)||16)/2;
 const minX=options.minX??1.1, gap=options.gap??.65;
 const valid = (x,z) => {
  const box={minX:x-size.x/2,maxX:x+size.x/2,minZ:z-size.z/2,maxZ:z+size.z/2};
  if(box.minX<minX||box.maxX>halfL-.45||box.minZ< -halfW+.45||box.maxZ>halfW-.45) return null;
  return blockers.some(other=>overlaps(box,other,gap)) ? null : box;
 };
 const original=valid(preferred.x,preferred.z); if(original)return original;
 // Keep the entrance spine clear; customer seating stays on the customer side.
 for(let z=-halfW+.65+size.z/2;z<=halfW-.65-size.z/2;z+=.25){
  for(let x=minX+size.x/2;x<=halfL-.65-size.x/2;x+=.25){const box=valid(x,z);if(box)return box;}
 }
 return null;
}
/** Keep physical coffee counters even when no operational workstation is bound. */
export function arrangeCoffeeCounters(modelRoot, layout, showWorkstations = true) {
 const barista = modelRoot.getObjectByName('Workstation_Barista_01');
 const cashier = modelRoot.getObjectByName('Workstation_POS_01');
 if (!barista || !cashier) return [];
 const pickup=modelRoot.getObjectByName('Workstation_Service_01');
 for (const counter of [barista, cashier,...(pickup?[pickup]:[])]) {
  counter.visible = showWorkstations;
  if (!counter.userData.workstationId) {
   // A physical counter has no invented staffing, equipment or selection data.
   counter.traverse(node => {
    for (const child of [...node.children]) {
     if (child.userData.isWorkstationTag) { node.remove(child); child.material?.map?.dispose(); child.material?.dispose(); }
    }
   });
  }
 }
 // Explicit API placement wins; only arrange the unbound physical counter.
 const moving = !cashier.userData.workstationId ? cashier : !barista.userData.workstationId ? barista : null;
 if (moving) {
  const anchor = moving === cashier ? barista : cashier;
  const a = geometryFootprint(anchor), b = geometryFootprint(moving);
  const width = b.maxX-b.minX, depth = b.maxZ-b.minZ;
  const halfL=(Number(layout.length)||24)/2, halfW=(Number(layout.width)||16)/2;
  const candidates = [
   {x:a.maxX+.08+width/2,z:(a.minZ+a.maxZ)/2},
   {x:a.minX-.08-width/2,z:(a.minZ+a.maxZ)/2},
   {x:(a.minX+a.maxX)/2,z:a.maxZ+.08+depth/2},
   {x:(a.minX+a.maxX)/2,z:a.minZ-.08-depth/2},
  ];
  const target=candidates.find(p=>Math.abs(p.x)+width/2<halfL-.45&&Math.abs(p.z)+depth/2<halfW-.45);
  if(target) {
   const delta=new THREE.Vector3(target.x-(b.minX+b.maxX)/2,0,target.z-(b.minZ+b.maxZ)/2);
   const world=moving.getWorldPosition(new THREE.Vector3()).add(delta);
   moving.position.copy(moving.parent.worldToLocal(world));
   moving.updateWorldMatrix(true,true);
  }
 }
 if(pickup&&!pickup.userData.workstationId) {
  pickup.visible=showWorkstations;
  pickup.rotation.y=barista.rotation.y;
  const a=geometryFootprint(barista),b=geometryFootprint(pickup);
  const world=pickup.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(a.minX-.08-b.maxX,0,(a.minZ+a.maxZ-b.minZ-b.maxZ)/2));
  pickup.position.copy(pickup.parent.worldToLocal(world));
  pickup.updateWorldMatrix(true,true);
 }
 return [barista,cashier,...(pickup?[pickup]:[])];
}

export function getCoffeeFloorLayout(root, layout) {
 const floor=root.getObjectByName('Main_Floor_Plinth');
 if(!floor)return layout;
 const b=geometryFootprint(floor);
 return {...layout,length:Math.min(Number(layout.length)||24,b.maxX-b.minX),width:Math.min(Number(layout.width)||16,b.maxZ-b.minZ)};
}

/** Render a domain zone at its physical counter rather than an unrelated API pad. */
export function getCoffeeZoneFrame(root,zone) {
 if(!root)return null;
 if(root.userData.customDesign){
  let counter;root.traverse(n=>{if(!counter&&n.userData.workstation?.zoneId===zone.id)counter=n;});
  if(!counter)return null;
  const b=geometryFootprint(counter);return{x:(b.minX+b.maxX)/2,z:(b.minZ+b.maxZ)/2-.45,sizeX:b.maxX-b.minX+.3,sizeZ:b.maxZ-b.minZ+1.3};
 }
 const name=`${zone.code||''} ${zone.name||''}`.toLowerCase();
 const key=/thu ngân|cashier|\bpos\b/.test(name)?'Workstation_POS_01':/barista|pha chế|espresso/.test(name)?'Workstation_Barista_01':/service|trả món|nhận đồ/.test(name)?'Workstation_Service_01':null;
 const counter=key&&root.getObjectByName(key);
 if(!counter)return null;
 const b=geometryFootprint(counter);
 return {x:(b.minX+b.maxX)/2,z:(b.minZ+b.maxZ)/2-.45,sizeX:b.maxX-b.minX+.3,sizeZ:b.maxZ-b.minZ+1.3};
}

export function arrangeStoreInterior(modelRoot, workstationMeshes, layout, showWorkstations = true) {
 const counters=arrangeCoffeeCounters(modelRoot,layout,showWorkstations);
 const customer = modelRoot.getObjectByName('Customer_Furniture');
 if (!customer) return;
 const floorLayout=getCoffeeFloorLayout(modelRoot,layout);
 const halfL=floorLayout.length/2,halfW=floorLayout.width/2;
 const blockers=[...new Set([...workstationMeshes,...counters])].map(geometryFootprint);
 modelRoot.traverse(node=>{if(node.userData.isColumn)blockers.push(geometryFootprint(node));});
 // The door is on +Z. Reserve a central route, entrance landing and queue on its left.
 blockers.push({minX:-1.1,maxX:1.1,minZ:-halfW,maxZ:halfW});
 blockers.push({minX:-2,maxX:2,minZ:halfW-2.1,maxZ:halfW});
 blockers.push({minX:-3.2,maxX:-1.2,minZ:-.4,maxZ:3.6});
 for(const name of ['Zone_Storage_Floor','Partition_Storage_East','Partition_Storage_South']) {
  const n=modelRoot.getObjectByName(name);if(n)blockers.push(geometryFootprint(n));
 }
 const groups=[];
 customer.children.forEach(parent=>{
  if(parent.userData.arrangementOrigin)parent.position.fromArray(parent.userData.arrangementOrigin);
  parent.visible=true;parent.userData.layoutSuppressed=false;
  if(['Dining_Booths_Cluster','Bistro_Tables_And_Chairs'].includes(parent.name))groups.push(...parent.children);
  else groups.push(parent);
 });
 // Seat complete table/chair sets individually; do not discard a whole seating cluster.
 const preferredFor=group=>{
  const booth=group.name.match(/^Booth_Section_(\d+)/),bistro=group.name.match(/^Bistro_Table_Group_(\d+)/);
  if(booth)return {x:halfL-1.5,z:[-3.9,0,3.9][Number(booth[1])%3]};
  if(bistro){const i=Number(bistro[1]);return {x:i%2?6.1:3.2,z:i<2?-4:i===2?3.1:4.1};}
  if(group.name==='Communal_Work_Table_Group')return {x:6.2,z:0};
  if(group.name==='Lounge_Seating_Nook')return {x:6.2,z:halfW-1.1};
  return null;
 };
 groups.forEach(group=>{
  if(!group.userData.arrangementOrigin)group.userData.arrangementOrigin=group.position.toArray();
  group.position.fromArray(group.userData.arrangementOrigin);
  if(group.name==='Communal_Work_Table_Group')group.rotation.y=Math.PI/2;
  group.updateWorldMatrix(true,true);
  const box=geometryFootprint(group), size={x:box.maxX-box.minX,z:box.maxZ-box.minZ};
  const preferred=preferredFor(group)||{x:(box.minX+box.maxX)/2,z:(box.minZ+box.maxZ)/2};
  const target=findFurniturePlacement(size,floorLayout,blockers,preferred,{minX:1.9,gap:.8});
  group.visible=Boolean(target);
  group.userData.layoutSuppressed=!target;
  if(!target)return;
  const delta=new THREE.Vector3((target.minX+target.maxX-box.minX-box.maxX)/2,0,(target.minZ+target.maxZ-box.minZ-box.maxZ)/2);
  const world=group.getWorldPosition(new THREE.Vector3()).add(delta);
  group.position.copy(group.parent.worldToLocal(world));
  group.updateWorldMatrix(true,true);blockers.push(target);
 });
}
export function getStaffAnchor(mesh, layout, slot = 0, count = 1) {
 const box=geometryFootprint(mesh),cx=(box.minX+box.maxX)/2,cz=(box.minZ+box.maxZ)/2;
 const spread=(slot-(count-1)/2)*.7;
 const candidates=[{x:cx+spread,z:box.minZ-.65},{x:cx+spread,z:box.maxZ+.65},{x:box.minX-.65,z:cz+spread},{x:box.maxX+.65,z:cz+spread}];
 const halfL=(layout.length||24)/2, halfW=(layout.width||16)/2;
 const anchor=candidates.find(p=>Math.abs(p.x)<halfL-.45&&Math.abs(p.z)<halfW-.45);
 return anchor ? {...anchor,y:0,rotation:Math.atan2(cx-anchor.x,cz-anchor.z)} : null;
}

/** Zone-level assignments stay behind the real counter without inventing a workstation binding. */
export function getZoneStaffAnchor(frame,slot=0,count=1){
 if(!frame)return null;
 const spread=Math.min(.7,Math.max(.25,(frame.sizeX-.5)/Math.max(count,1)));
 return{x:frame.x+(slot-(count-1)/2)*spread,y:0,z:frame.z-frame.sizeZ/2+.2,rotation:0};
}
