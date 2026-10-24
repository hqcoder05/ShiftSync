import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import * as THREE from 'three';
import {CAFE_STORE_URL} from './CafeStoreModel.js';
import {DEFAULT_DIGITAL_TWIN_GLB_URL,loadDigitalTwinModel,mapWorkstationsToGlb,extractGlbObstacles} from './DigitalTwinModelLoader.js';
import {arrangeStoreInterior,geometryFootprint,overlaps} from './StoreArrangement.js';

const layout={length:24,width:16,height:6};
const load=async()=>{
 const bytes=await fs.readFile(new URL('../../../../public/models/store-v2/shiftsync-cafe.glb',import.meta.url));
 return {bytes,data:await loadDigitalTwinModel({arrayBuffer:bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)})};
};
test('Default store loads the versioned authored design within its geometry budget',async()=>{
 const {bytes,data}=await load();assert.equal(DEFAULT_DIGITAL_TWIN_GLB_URL,CAFE_STORE_URL);
 assert.equal(data.modelRoot.userData.storeDesignVersion,2);assert.equal(data.modelRoot.userData.design,'Oak & Moss');
 assert.ok(bytes.length<2000000);let meshes=0,triangles=0;
 data.modelRoot.traverse(n=>{if(n.isMesh){meshes++;triangles+=(n.geometry.index?.count||n.geometry.attributes.position.count)/3;assert.ok(n.geometry.attributes.position.array.every(Number.isFinite));assert.ok(n.material.name.startsWith('cafe_v2_'),'Authored finish must survive legacy material enhancement');}});
 assert.ok(meshes<200);assert.ok(triangles<50000);assert.equal(data.workstationsMap.size,4);assert.equal(data.zonesMap.size,6);
});
test('New model keeps every seating set inside its floor, the centre aisle clear and saved counters fixed',async()=>{
 const {data}=await load();const ws={id:'saved',workstationType:'BARISTA',x:7,y:6,z:0};
 const {mappedMeshes}=mapWorkstationsToGlb([ws],data.workstationsMap,layout);const station=mappedMeshes[0].mesh;
 const original=station.position.clone();arrangeStoreInterior(data.modelRoot,[station],layout);
 const customer=data.modelRoot.getObjectByName('Customer_Furniture');
 const seats=customer.children.flatMap(g=>['Dining_Booths_Cluster','Bistro_Tables_And_Chairs'].includes(g.name)?g.children:[g]);
 assert.equal(seats.length,9);assert.ok(seats.every(g=>g.visible));assert.ok(station.position.equals(original));
 const floor=geometryFootprint(data.modelRoot.getObjectByName('Main_Floor_Plinth')),bounds=seats.map(geometryFootprint);
 bounds.forEach((b,i)=>{assert.ok(b.minX>=1.9);assert.ok(b.maxX<=floor.maxX-.44&&b.minZ>=floor.minZ+.44&&b.maxZ<=floor.maxZ-.44);bounds.forEach((other,j)=>{if(i!==j)assert.ok(!overlaps(b,other,.79));});});
 const cashier=data.modelRoot.getObjectByName('Workstation_POS_01'),bar=geometryFootprint(station),pos=geometryFootprint(cashier);
 assert.ok(cashier.visible);assert.equal(cashier.userData.workstationId,undefined);assert.ok(Math.abs(pos.minX-bar.maxX-.08)<.001);
 for(const column of data.columns)for(const counter of data.workstationsMap.values())assert.ok(!overlaps(geometryFootprint(column),geometryFootprint(counter),.1),'Columns must not intersect any physical counter');
 const before=seats.map(g=>g.position.clone());arrangeStoreInterior(data.modelRoot,[station],layout);seats.forEach((g,i)=>assert.ok(g.position.distanceTo(before[i])<.001));
});
test('Authored wall material groups create one blocker per wall and preserve the entrance opening',async()=>{
 const {data}=await load();const obstacles=extractGlbObstacles(data.modelRoot);
 assert.equal(obstacles.filter(o=>o.type==='column').length,2);
 assert.equal(obstacles.filter(o=>o.type==='wall').length,5);assert.ok(!obstacles.some(o=>o.name.startsWith('Baked_')));
 assert.ok(data.wallMeshes.length>4);data.wallMeshes.forEach(n=>assert.equal(n.material,n.userData.originalMat));
 assert.ok(!obstacles.some(b=>b.minX<.38&&b.maxX>-.38&&b.minZ<6.5&&b.maxZ>6.5),'Entrance landing remains open');
});
