import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {findFurniturePlacement,overlaps,geometryFootprint,getStaffAnchor,arrangeStoreInterior,arrangeCoffeeCounters,getCoffeeFloorLayout,getCoffeeZoneFrame,getZoneStaffAnchor} from './StoreArrangement.js';
const layout={length:24,width:16};
test('Zone-only planner staff stands behind the physical counter with separate slots',()=>{
 const frame={x:-2,z:-2.45,sizeX:2.7,sizeZ:2.3};const a=getZoneStaffAnchor(frame,0,2),b=getZoneStaffAnchor(frame,1,2);
 assert.ok(a.z<-3);assert.equal(a.z,b.z);assert.ok(b.x-a.x>.6);assert.equal(getZoneStaffAnchor(null),null);
});
test('Coffee furniture uses actual GLB floor bounds, not larger API dimensions',()=>{
 const root=new THREE.Group(),floor=new THREE.Mesh(new THREE.BoxGeometry(22.2,.1,14.22));floor.name='Main_Floor_Plinth';root.add(floor);
 const dimensions=getCoffeeFloorLayout(root,layout);
 assert.ok(Math.abs(dimensions.length-22.2)<.001);assert.ok(Math.abs(dimensions.width-14.22)<.001);
 const box=findFurniturePlacement({x:3,z:2},dimensions,[],{x:9,z:-7});
 assert.ok(box.minZ>=-dimensions.width/2+.45);assert.ok(box.maxX<=dimensions.length/2-.45);
});
test('Cashier zone aligns to the physical counter while preserving domain data',()=>{
 const root=new THREE.Group(),pos=new THREE.Mesh(new THREE.BoxGeometry(2.4,1,1));pos.name='Workstation_POS_01';pos.position.set(-2,0,-2);root.add(pos);
 const zone={id:'cashier',name:'Thu ngân',x:17,y:10,z:0};const frame=getCoffeeZoneFrame(root,zone);
 assert.equal(frame.x,-2);assert.equal(frame.z,-2.45);assert.ok(Math.abs(frame.sizeX-2.7)<.001);assert.equal(zone.x,17);
});
test('Physical cashier returns beside barista without inventing an operational workstation',()=>{
 const root=new THREE.Group();
 const barista=new THREE.Mesh(new THREE.BoxGeometry(3.6,1.4,1.2));barista.name='Workstation_Barista_01';barista.position.set(-5,.7,-2);barista.userData.workstationId='saved';root.add(barista);
 const cashier=new THREE.Mesh(new THREE.BoxGeometry(2.4,1.4,1));cashier.name='Workstation_POS_01';cashier.position.set(-5.6,.7,-.6);cashier.visible=false;root.add(cashier);
 const staleTag=new THREE.Sprite();staleTag.userData.isWorkstationTag=true;cashier.add(staleTag);
 arrangeCoffeeCounters(root,layout);
 const a=geometryFootprint(barista),b=geometryFootprint(cashier);
 assert.equal(cashier.visible,true);assert.ok(Math.abs(b.minX-a.maxX-.08)<.001);
 assert.ok(!overlaps(a,b));assert.equal(cashier.position.z,-2);assert.equal(barista.position.x,-5);
 assert.equal(cashier.userData.workstationId,undefined);assert.equal(cashier.children.length,0);
 const position=cashier.position.clone();arrangeCoffeeCounters(root,layout);assert.ok(cashier.position.distanceTo(position)<.001);
 arrangeCoffeeCounters(root,layout,false);assert.equal(cashier.visible,false);assert.equal(barista.visible,false);
});
test('Saved cashier and barista placements are never overwritten by physical counter arrangement',()=>{
 const root=new THREE.Group();
 const counters=['Workstation_POS_01','Workstation_Barista_01'].map((name,i)=>{const n=new THREE.Mesh(new THREE.BoxGeometry(2,1,1));n.name=name;n.position.set(i*4,0,i*2);n.userData.workstationId=name;root.add(n);return n;});
 const positions=counters.map(n=>n.position.clone());arrangeCoffeeCounters(root,layout);
 counters.forEach((n,i)=>assert.ok(n.position.equals(positions[i])));
});
test('Customer seating leaves an entrance spine and avoids workstation clearance',()=>{
 const blocked={minX:2,maxX:6,minZ:-4,maxZ:0};
 const box=findFurniturePlacement({x:3,z:2},layout,[blocked],{x:3,z:-2});
 assert.ok(box);assert.ok(box.minX>=1.1);assert.ok(!overlaps(box,blocked,.65));
 assert.ok(box.maxX<=11.35&&box.minZ>=-7.35);
});
test('Furniture that cannot fit is suppressed rather than overlapped or moved outside the store',()=>{
 assert.equal(findFurniturePlacement({x:30,z:20},layout,[]),null);
});
test('Staff stands outside the counter and separate slots do not stack',()=>{
 const mesh=new THREE.Mesh(new THREE.BoxGeometry(3.6,1.4,1.2));mesh.position.set(-5,.7,-2);
 const bounds=geometryFootprint(mesh),a=getStaffAnchor(mesh,layout,0,2),b=getStaffAnchor(mesh,layout,1,2);
 assert.ok(a.z<bounds.minZ);assert.ok(b.x>a.x+.6);
 assert.equal(mesh.position.x,-5);assert.equal(mesh.position.z,-2);
});
test('Arrangement is repeatable and does not change saved workstation placement',()=>{
 const root=new THREE.Group(),customer=new THREE.Group();customer.name='Customer_Furniture';root.add(customer);
 const table=new THREE.Mesh(new THREE.BoxGeometry(3,1,2));table.position.set(-2,.5,2);customer.add(table);
 const ws=new THREE.Mesh(new THREE.BoxGeometry(3,1,1));ws.position.set(-5,.5,-2);root.add(ws);
 const original=ws.position.clone();arrangeStoreInterior(root,[ws],layout);const next=table.position.clone();
 arrangeStoreInterior(root,[ws],layout);assert.ok(table.position.distanceTo(next)<.001);assert.ok(ws.position.equals(original));
});
