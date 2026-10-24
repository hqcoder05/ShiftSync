import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {resolveCharacterGender} from '../../utils/characterGender.js';
import {instantiateCharacterModel} from './CharacterAssetLoader.js';

test('Gender uses explicit profile values, never name or role; defaults to male',()=>{
 for(const value of [undefined,null,'','MALE','Nam',{fullName:'Nữ',role:'cashier'}])assert.equal(resolveCharacterGender(value),'MALE');
 for(const value of ['FEMALE','Nữ',{gender:'FEMALE'}])assert.equal(resolveCharacterGender(value),'FEMALE');
});
for(const role of ['barista','cashier','manager','chef'])test(`${role} female asset and fallback preserve animation joints`,async()=>{
 const bytes=await fs.readFile(new URL(`../../../../../public/models/crew-v2/${role}-female.glb`,import.meta.url));
 assert.ok(bytes.byteLength<650000);
 const {scene}=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 const female=instantiateCharacterModel(role,{gender:'FEMALE'}),male=instantiateCharacterModel(role);
 assert.equal(female.modelRoot.userData.gender,'FEMALE');assert.equal(male.modelRoot.userData.gender,'MALE');
 for(const joint of ['Head','LeftKnee','RightElbow','Spine'])assert.ok(scene.getObjectByName(joint));
 assert.notEqual(female.modelRoot.getObjectByName('LeftShoulder').position.x,male.modelRoot.getObjectByName('LeftShoulder').position.x);
});
