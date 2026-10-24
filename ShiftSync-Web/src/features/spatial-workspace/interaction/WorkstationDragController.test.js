/**
 * WorkstationDragController.test.js
 * Unit tests for Workstation Layout Editor drag logic, coordinate clamping, collision checks, and rollback.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';

import {
  WorkstationDragController,
  getWorkstationDragRoot,
  WORKSTATION_COLLISION_RADIUS,
} from './WorkstationDragController.js';
import {
  toThreeCoords,
  toBackendCoords,
} from '../../../components/spatial/spatial.constants.js';

describe('PHASE 2A: Workstation Layout Editor & Coordinate Tests', () => {
  const layout = { length: 24.0, width: 16.0, height: 5.0 };

  test('toThreeCoords and toBackendCoords roundtrip is accurate', () => {
    const originalBackend = { x: 5.5, y: 3.2, z: 0.9 };
    const [threeX, threeY, threeZ] = toThreeCoords(
      originalBackend.x,
      originalBackend.y,
      originalBackend.z,
      layout
    );

    // Three.js X = 5.5 - 24/2 = -6.5
    assert.strictEqual(threeX, -6.5);
    // Three.js Y = 0.9 (elevation)
    assert.strictEqual(threeY, 0.9);
    // Three.js Z = 3.2 - 16/2 = -4.8
    assert.strictEqual(threeZ, -4.8);

    const convertedBack = toBackendCoords(threeX, threeY, threeZ, layout);
    assert.strictEqual(convertedBack.x, originalBackend.x);
    assert.strictEqual(convertedBack.y, originalBackend.y);
    assert.strictEqual(convertedBack.z, originalBackend.z);
  });

  test('clampCoordinates keeps positions strictly inside store floor boundaries', () => {
    const controller = new WorkstationDragController({
      domElement: { addEventListener: () => {}, removeEventListener: () => {} },
      camera: {},
      scene: { add: () => {}, remove: () => {} },
      controls: { enabled: true },
      layout,
    });

    // Test inside bounds
    const inside = controller.clampCoordinates(10.0, 8.0);
    assert.strictEqual(inside.x, 10.0);
    assert.strictEqual(inside.y, 8.0);

    // Test out of bounds (negative)
    const negative = controller.clampCoordinates(-5.0, -2.0);
    assert.strictEqual(negative.x, 0.8);
    assert.strictEqual(negative.y, 0.8);

    // Test out of bounds (exceeding length & width)
    const exceeding = controller.clampCoordinates(30.0, 25.0);
    assert.strictEqual(exceeding.x, 23.2); // 24.0 - 0.8
    assert.strictEqual(exceeding.y, 15.2); // 16.0 - 0.8
  });

  test('checkCollision detects overlapping or too-close workstations', () => {
    const controller = new WorkstationDragController({
      domElement: { addEventListener: () => {}, removeEventListener: () => {} },
      camera: {},
      scene: { add: () => {}, remove: () => {} },
      controls: { enabled: true },
      layout,
    });

    const existingWorkstations = [
      { id: 'ws-pos-1', x: 4.0, y: 3.0, name: 'Quầy POS 1' },
      { id: 'ws-bar-1', x: 8.0, y: 3.0, name: 'Quầy Bar 1' },
      { id: 'ws-kitchen-1', x: 14.0, y: 10.0, name: 'Bếp trung tâm' },
    ];

    controller.updateContext({ workstations: existingWorkstations, layout });

    // 1. Position too close to ws-pos-1 (distance = 0.5m < 1.1m)
    const collision1 = controller.checkCollision('ws-bar-1', { x: 4.3, y: 3.4 });
    assert.strictEqual(collision1.isColliding, true);
    assert.strictEqual(collision1.conflictingWorkstation.id, 'ws-pos-1');

    // 2. Position far enough away (distance > 2.0m)
    const noCollision = controller.checkCollision('ws-bar-1', { x: 10.5, y: 5.0 });
    assert.strictEqual(noCollision.isColliding, false);
    assert.strictEqual(noCollision.conflictingWorkstation, null);

    // 3. Collision ignores self
    const selfCheck = controller.checkCollision('ws-bar-1', { x: 8.0, y: 3.0 });
    assert.strictEqual(selfCheck.isColliding, false);
  });

  test('selectWorkstation and clearSelection manage state accurately', () => {
    const controller = new WorkstationDragController({
      domElement: { addEventListener: () => {}, removeEventListener: () => {} },
      camera: {},
      scene: { add: () => {}, remove: () => {} },
      controls: { enabled: true },
      layout,
    });

    const mockMesh = {
      position: new THREE.Vector3(1,0,2),
      userData: { workstationId: 'ws-101' },
    };

    controller.updateContext({
      workstationMeshes: [mockMesh],
      workstations: [{ id: 'ws-101', name: 'Barista Station' }],
    });

    let selectedEvent = null;
    controller.onSelect = (ws, mesh) => {
      selectedEvent = { ws, mesh };
    };

    controller.selectWorkstation({ id: 'ws-101', name: 'Barista Station' });
    assert.strictEqual(controller.selectedWorkstation.id, 'ws-101');
    assert.strictEqual(controller.selectedMesh, mockMesh);
    assert.strictEqual(selectedEvent.ws.id, 'ws-101');
    assert.strictEqual(selectedEvent.mesh, mockMesh);

    // Clear selection
    controller.clearSelection();
    assert.strictEqual(controller.selectedWorkstation, null);
    assert.strictEqual(controller.selectedMesh, null);
    assert.strictEqual(controller.dragRing.visible, false);
  });

  test('revertPosition restores original mesh coordinates on cancel or error', () => {
    const controller = new WorkstationDragController({
      domElement: { addEventListener: () => {}, removeEventListener: () => {} },
      camera: {},
      scene: { add: () => {}, remove: () => {} },
      controls: { enabled: true },
      layout,
    });

    const mockMesh = {
      position: {
        x: -4.0,
        y: 0.0,
        z: -2.0,
        copy(v) {
          this.x = v.x;
          this.y = v.y;
          this.z = v.z;
        },
      },
      userData: { workstationId: 'ws-revert' },
    };

    controller.updateContext({
      workstationMeshes: [mockMesh],
      workstations: [{ id: 'ws-revert', x: 8.0, y: 6.0, z: 0.0 }],
    });

    controller.selectedWorkstation = { id: 'ws-revert', x: 8.0, y: 6.0, z: 0.0 };
    controller.selectedMesh = mockMesh;
    controller.originalPosition.set(-4.0, 0.0, -2.0);
    controller.originalBackendCoords = { x: 8.0, y: 6.0, z: 0.0 };

    // Simulate drag movement
    mockMesh.position.x = 2.0;
    mockMesh.position.z = 5.0;
    controller.currentBackendCoords = { x: 14.0, y: 13.0, z: 0.0 };

    // User cancels or API fails -> revert
    controller.revertPosition();

    assert.strictEqual(mockMesh.position.x, -4.0);
    assert.strictEqual(mockMesh.position.z, -2.0);
    assert.strictEqual(controller.isPositionValid, true);
    assert.deepStrictEqual(controller.currentBackendCoords, { x: 8.0, y: 6.0, z: 0.0 });
  });

  test('handles null or missing coordinates safely by defaulting to floor level', () => {
    const rawBackend = { x: null, y: undefined, z: null };
    const [tx, ty, tz] = toThreeCoords(rawBackend.x, rawBackend.y, rawBackend.z, layout);

    // null/undefined should default to 0.0 in toThreeCoords
    assert.strictEqual(tx, -12.0); // 0 - 24/2
    assert.strictEqual(ty, 0.0);   // elevation
    assert.strictEqual(tz, -8.0);  // 0 - 16/2
  });

  test('RBAC role check permits ADMIN and MANAGER, rejects STAFF', () => {
    function canEditWorkstations(role) {
      if (!role) return false;
      const normalized = String(role).toUpperCase().replace('ROLE_', '');
      return normalized === 'ADMIN' || normalized === 'MANAGER';
    }

    assert.strictEqual(canEditWorkstations('ADMIN'), true);
    assert.strictEqual(canEditWorkstations('ROLE_ADMIN'), true);
    assert.strictEqual(canEditWorkstations('MANAGER'), true);
    assert.strictEqual(canEditWorkstations('ROLE_MANAGER'), true);
    assert.strictEqual(canEditWorkstations('STAFF'), false);
    assert.strictEqual(canEditWorkstations('ROLE_STAFF'), false);
    assert.strictEqual(canEditWorkstations('GUEST'), false);
    assert.strictEqual(canEditWorkstations(null), false);
  });

  test('rotateSelected previews a group rotation without mutating API metadata', () => {
    const controller = new WorkstationDragController({
      domElement: { addEventListener: () => {}, removeEventListener: () => {} },
      camera: {},
      scene: { add: () => {}, remove: () => {} },
      controls: { enabled: true },
      layout,
    });

    const mockMesh = {
      position: { x: 0, y: 0, z: 0 },
      rotation: { y: 0 },
      userData: { workstation: { id: 'ws-rot' } },
    };
    const wsData = { id: 'ws-rot', x: 5, y: 5, z: 0 };

    controller.selectedMesh = mockMesh;
    controller.selectedWorkstation = wsData;

    // Rotate 90 degrees (Math.PI / 2)
    const angle1 = controller.rotateSelected(Math.PI / 2);
    assert.ok(Math.abs(angle1 - Math.PI / 2) < 0.001);
    assert.strictEqual(mockMesh.rotation.y, angle1);
    assert.strictEqual(wsData.rotation, undefined);

    // Rotate another 90 degrees -> 180 degrees (Math.PI)
    const angle2 = controller.rotateSelected(Math.PI / 2);
    assert.ok(Math.abs(angle2 - Math.PI) < 0.001);

    // When no workstation selected, returns null safely
    controller.selectedMesh = null;
    controller.selectedWorkstation = null;
    assert.strictEqual(controller.rotateSelected(), null);
  });
});

function assemblyFixture() {
 const scene=new THREE.Scene(),group=new THREE.Group(),other=new THREE.Group();
 group.position.set(-4,0,-2);other.position.set(5,0,3);
 const machine=new THREE.Group(),body=new THREE.Mesh(new THREE.BoxGeometry(1,1,1));
 machine.position.set(.4,1,0);machine.add(body);group.add(machine);
 const ws={id:'bar',x:8,y:6,z:0},second={id:'pos',x:17,y:11,z:0};
 group.userData={isWorkstation:true,workstationId:'bar',workstation:ws};
 body.userData={isWorkstation:true,workstationId:'bar',workstation:ws};
 other.userData={isWorkstation:true,workstationId:'pos',workstation:second};
 scene.add(group,other);scene.updateMatrixWorld(true);
 const controller=new WorkstationDragController({domElement:{addEventListener(){},removeEventListener(){},getBoundingClientRect(){return {left:0,top:0,width:100,height:100};}},camera:new THREE.PerspectiveCamera(),scene,controls:{enabled:true}});
 controller.updateContext({workstationMeshes:[group,other],workstations:[ws,second]});controller.setEnabled(true);
 controller.raycaster.setFromCamera=()=>{};controller.raycaster.intersectObjects=()=>[{object:body}];
 let floor=new THREE.Vector3(-4,0,-2);controller.raycaster.ray.intersectPlane=(_plane,point)=>point.copy(floor);
 const drag=()=>{controller.onPointerDown({button:0,clientX:20,clientY:20,pointerId:1});floor=floor.clone().add(new THREE.Vector3(2,0,1));controller.onPointerMove({clientX:40,clientY:40,pointerId:1});controller.onPointerUp({pointerId:1});};
 return {controller,group,other,machine,body,ws,second,drag};
}
test('Nested equipment hit resolves to the registered assembly root; children and neighbors stay intact',()=>{
 const {controller,group,other,machine,body,drag}=assemblyFixture();
 assert.equal(getWorkstationDragRoot(body,[group,other]),group);assert.equal(getWorkstationDragRoot(body,[other]),null);
 const local=machine.position.clone(),neighbor=other.position.clone();drag();
 assert.ok(!group.position.equals(new THREE.Vector3(-4,0,-2)));
 assert.deepEqual(machine.position.toArray(),local.toArray());assert.deepEqual(other.position.toArray(),neighbor.toArray());controller.dispose();
});
test('Click or small jitter never moves an assembly or starts a draft',()=>{
 const {controller,group}=assemblyFixture();let drafts=0;controller.onDragStart=()=>drafts++;
 controller.onPointerDown({button:0,clientX:20,clientY:20,pointerId:1});controller.onPointerMove({clientX:22,clientY:21,pointerId:1});controller.onPointerUp({pointerId:1});
 assert.equal(drafts,0);assert.equal(controller.controls.enabled,true);assert.deepEqual(group.position.toArray(),[-4,0,-2]);controller.dispose();
});
test('Changing selection, clearing, and exiting restore unsaved group transforms',()=>{
 for(const end of ['change','clear','disable']){
  const {controller,group,second,drag}=assemblyFixture();drag();controller.rotateSelected();
  if(end==='change')controller.selectWorkstation(second);else if(end==='clear')controller.clearSelection();else controller.setEnabled(false);
  assert.deepEqual(group.position.toArray(),[-4,0,-2]);assert.equal(group.rotation.y,0);controller.dispose();
 }
});
test('Repeated drag and reselect keep saved baseline; explicit commit retains new position',()=>{
 const {controller,group,ws,drag}=assemblyFixture();drag();controller.selectWorkstation(ws);drag();controller.revertPosition();
 assert.deepEqual(group.position.toArray(),[-4,0,-2]);drag();const committed=group.position.clone();controller.commitPosition();controller.clearSelection();
 assert.deepEqual(group.position.toArray(),committed.toArray());controller.dispose();
});
test('Reactive remapping preserves the pending preview until cancel',()=>{
 const {controller,group,other,ws,second,drag}=assemblyFixture();drag();const preview=group.position.clone();group.position.set(-4,0,-2);
 controller.updateContext({workstationMeshes:[group,other],workstations:[ws,second]});assert.deepEqual(group.position.toArray(),preview.toArray());
 controller.revertPosition();assert.deepEqual(group.position.toArray(),[-4,0,-2]);controller.dispose();
});
