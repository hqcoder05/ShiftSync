import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createItem,emptyDesign,editDesign,validateDesign,worldMatrix,isLocked} from './designModel.js';
import {buildDesignModel,disposeDesignModel} from './designScene.js';
import {CATALOG} from './catalog.js';
import {extractGlbObstacles,loadDigitalTwinModel} from '../spatial-workspace/scene/DigitalTwinModelLoader.js';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
const fixture=()=>{const d=emptyDesign();d.items=[createItem('table','table'),createItem('chair','chair')];d.items[0].position=[2,0,3];d.items[0].rotation=.7;d.items[1].position=[-2,0,1];return d;};
const pos=(d,id)=>new THREE.Vector3().setFromMatrixPosition(worldMatrix(d,d.items.find(i=>i.id===id))).toArray();
test('Grouping and ungrouping preserve actual world transforms',()=>{
 const doc=fixture(),a=worldMatrix(doc,doc.items[0]).elements,b=pos(doc,'chair');
 const grouped=editDesign(doc,{type:'group',ids:['table','chair'],id:'group'});
 assert.deepEqual(pos(grouped,'chair'),b);worldMatrix(grouped,grouped.items[0]).elements.forEach((v,i)=>assert.ok(Math.abs(v-a[i])<1e-4));
 const ungrouped=editDesign(grouped,{type:'ungroup',ids:['group']});assert.deepEqual(pos(ungrouped,'chair'),b);assert.equal(ungrouped.items.length,2);assert.equal(doc.items[0].parentId,null);
});
test('Locked parent blocks editing descendants and moving grouped assemblies',()=>{
 let doc=editDesign(fixture(),{type:'group',ids:['table','chair'],id:'group'});doc=editDesign(doc,{type:'lock',ids:['group']});
 assert.equal(isLocked(doc,'chair'),true);assert.deepEqual(editDesign(doc,{type:'update',id:'chair',values:{position:[9,0,9]}}),doc);
 assert.throws(()=>editDesign(doc,{type:'delete',ids:['group']}));assert.throws(()=>editDesign(doc,{type:'ungroup',ids:['group']}));
});
test('Duplicating a group remaps child identities and removes operational bindings',()=>{
 let doc=fixture();doc.items[0]={...createItem('barista','table'),position:[2,0,3],workstationId:'real-station'};
 doc=editDesign(doc,{type:'group',ids:['table','chair'],id:'group'});const copy=editDesign(doc,{type:'duplicate',ids:['group']});
 assert.equal(copy.items.length,6);assert.equal(new Set(copy.items.map(i=>i.id)).size,6);assert.equal(copy.items.filter(i=>i.workstationId).length,1);
 assert.equal(copy.items.filter(i=>i.parentId&&i.parentId!=='group').length,2);
});
test('Reject cycles, unknown assets, invalid numbers, foreign and duplicate station bindings',()=>{
 const doc=fixture();doc.items.push({...createItem('table','table2'),parentId:'missing'});assert.throws(()=>validateDesign(doc));
 const cycle=emptyDesign();cycle.items=[{...createItem('table','a'),asset:'group',parentId:'b'},{...createItem('table','b'),asset:'group',parentId:'a'}];assert.throws(()=>validateDesign(cycle));
 for(const values of [{asset:'https://untrusted/asset.glb'},{scale:Infinity},{position:[NaN,0,0]},{scale:0}]){const bad=fixture();Object.assign(bad.items[0],values);assert.throws(()=>validateDesign(bad));}
 const binding=emptyDesign();binding.items=[{...createItem('barista','a'),workstationId:'other'}];assert.throws(()=>validateDesign(binding,['own']));binding.items.push({...createItem('cashier','b'),workstationId:'other'});assert.throws(()=>validateDesign(binding));
});
test('Custom model preserves hierarchy and world positions instead of arranging furniture again',()=>{
 const doc=editDesign(fixture(),{type:'group',ids:['table','chair'],id:'group'});doc.items.find(i=>i.id==='group').position=[5,0,2];
 const model=buildDesignModel(doc,new THREE.Group());assert.equal(model.customDesign,true);assert.equal(model.designNodes.get('chair').parent,model.designNodes.get('group'));
 assert.deepEqual(model.designNodes.get('chair').getWorldPosition(new THREE.Vector3()).toArray(),pos(doc,'chair'));disposeDesignModel(model);
});
test('Deleting an assembly removes exactly its subtree and keeps unrelated items',()=>{
 const doc=editDesign(fixture(),{type:'group',ids:['table','chair'],id:'group'});doc.items.push(createItem('plant','plant'));
 const result=editDesign(doc,{type:'delete',ids:['group']});assert.deepEqual(result.items.map(i=>i.id),['plant']);
});
test('Every library asset builds from the real GLB or its supported primitive',async()=>{
 const buffer=readFileSync('public/models/store-v2/shiftsync-cafe.glb');
 const source=await loadDigitalTwinModel({arrayBuffer:buffer.buffer.slice(buffer.byteOffset,buffer.byteOffset+buffer.byteLength)});
 const doc=emptyDesign();doc.items=CATALOG.map((asset,index)=>({...createItem(asset.id,`catalog-${index}`),position:[index%5*2,0,Math.floor(index/5)*2]}));
 const model=buildDesignModel(doc,source.modelRoot);
 assert.equal(model.designNodes.size,15);for(const node of model.designNodes.values())assert.ok(node.children.length>0);
 disposeDesignModel(model);
});

test('Custom navigation preserves door openings and does not duplicate nested prefab obstacles',()=>{
 const doc=fixture();doc.items.push(createItem('door','door'));
 const model=buildDesignModel(doc,new THREE.Group());const blockers=extractGlbObstacles(model.modelRoot);
 assert.equal(blockers.length,4);assert.equal(blockers.filter(b=>b.type==='wall').length,2);
 assert.ok(blockers.filter(b=>b.type==='wall').every(b=>b.maxX<0||b.minX>0));disposeDesignModel(model);
});
