import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {findStaffAvatar,belongsToScene} from './cameraTargets.js';
import {CameraController} from './CameraController.js';

test('resolves employee identity to avatar root, ignoring raycast child metadata',()=>{
 const scene=new THREE.Scene(),avatar=new THREE.Group(),mesh=new THREE.Mesh();
 avatar.userData={isAvatarRoot:true,employee:{staffId:'staff-a'}};mesh.userData=avatar.userData;avatar.add(mesh);scene.add(avatar);
 assert.equal(findStaffAvatar(scene,{id:'staff-a'}),avatar);
 assert.equal(findStaffAvatar(scene,{id:'missing'}),null);
 assert.equal(findStaffAvatar(scene,null),null);
});
test('rebinds a rebuilt avatar and rejects detached models',()=>{
 const scene=new THREE.Scene(),old=new THREE.Group(),next=new THREE.Group();
 old.userData={isAvatarRoot:true,employee:{staffId:'a'}};next.userData=old.userData;
 scene.add(old);assert.equal(belongsToScene(old,scene),true);scene.remove(old);scene.add(next);
 assert.equal(belongsToScene(old,scene),false);assert.equal(findStaffAvatar(scene,{staffId:'a'}),next);
});
test('follow uses transformed world position and tracks movement',()=>{
 const scene=new THREE.Scene(),parent=new THREE.Group(),avatar=new THREE.Group();
 parent.position.set(10,0,4);parent.rotation.y=Math.PI/2;avatar.position.set(2,0,1);scene.add(parent);parent.add(avatar);
 const camera=new THREE.PerspectiveCamera(),controls={target:new THREE.Vector3(),update(){}};
 const controller=new CameraController(camera,controls);controller.followObject(avatar);
 controller.update(1/60);const expected=avatar.getWorldPosition(new THREE.Vector3());expected.y+=1.1;expected.multiplyScalar(.08);
 assert.ok(controls.target.distanceTo(expected)<1e-8);
 avatar.position.x+=2;controller.update(1/60);assert.ok(controls.target.distanceTo(expected)>0);
 controller.stopFollowing();assert.equal(controller.isFollowing,false);
});
