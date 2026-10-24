import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {buildCrewModel,CREW_ROLES} from './CrewModel.js';
import {CHARACTER_MODEL_URLS,instantiateCharacterModel} from './CharacterAssetLoader.js';
import {disposeHierarchy} from '../ResourceManager.js';

for(const role of Object.keys(CREW_ROLES))test(`Crew V2 ${role}: web asset, dimensions, complete joints and geometry budget`,async()=>{
 const buffer=await fs.readFile(new URL(`../../../../../public/models/crew-v2/${role}.glb`,import.meta.url));
 assert.ok(buffer.byteLength<650000);
 const gltf=await new GLTFLoader().parseAsync(buffer.buffer.slice(buffer.byteOffset,buffer.byteOffset+buffer.byteLength),'');
 const model=gltf.scene;model.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(model);
 assert.ok(bounds.min.y>=-.04&&bounds.min.y<.04,`feet at floor: ${bounds.min.y}`);
 assert.ok(bounds.max.y>1.65&&bounds.max.y<1.9,`human scale: ${bounds.max.y}`);
 for(const name of ['Hips','Spine','Head','LeftHip','RightHip','LeftKnee','RightKnee','LeftShoulder','RightShoulder','LeftElbow','RightElbow','LeftWrist','RightWrist'])assert.ok(model.getObjectByName(name),name);
 let meshes=0,triangles=0;model.traverse(n=>{if(n.isMesh){meshes++;triangles+=(n.geometry.index?.count||n.geometry.attributes.position.count)/3;assert.ok(n.geometry.attributes.normal);assert.ok(n.geometry.attributes.position.array.every(Number.isFinite));}});
 assert.ok(meshes<=32);assert.ok(triangles<21000);
 assert.equal(CHARACTER_MODEL_URLS[role],`/models/crew-v2/${role}.glb`);
});
test('Fallback uses the same new design; clones have independent joints and shared safe resources',()=>{
 const a=instantiateCharacterModel('cashier'),b=instantiateCharacterModel('cashier');
 assert.equal(a.modelRoot.userData.designVersion,2);assert.ok(a.joints.leftKnee&&a.joints.rightElbow);
 a.joints.head.rotation.y=.5;assert.equal(b.joints.head.rotation.y,0);
 let meshA,meshB;a.modelRoot.traverse(n=>{if(n.isMesh&&!meshA)meshA=n;});b.modelRoot.traverse(n=>{if(n.isMesh&&!meshB)meshB=n;});
 assert.equal(meshA.geometry,meshB.geometry);assert.ok(meshA.geometry.userData.isShared);assert.ok(meshA.material.userData.isShared);
 let disposed=false;meshB.geometry.addEventListener('dispose',()=>{disposed=true;});disposeHierarchy(a.modelRoot);assert.equal(disposed,false);
});
test('All role designs have a visible front face and role-specific uniform',()=>{
 const colors=new Set();for(const role of Object.keys(CREW_ROLES)){const model=buildCrewModel(role);const head=model.getObjectByName('Head');assert.ok(head.children.some(n=>n.material?.name==='crew_eyes'));model.traverse(n=>{if(n.material?.name==='crew_apron')colors.add(n.material.color.getHex());});}assert.equal(colors.size,3);
});
