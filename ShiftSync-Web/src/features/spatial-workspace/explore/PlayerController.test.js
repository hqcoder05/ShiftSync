/**
 * PlayerController.test.js
 * Unit test suite for First-Person Exploration & Point Lock Subsystem (Mode 2)
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { PlayerController } from './PlayerController.js';

// Setup Mock Window and Document for Node environment
const setupMockDOM = () => {
  const listeners = { window: {}, document: {}, dom: {} };

  const mockDoc = {
    pointerLockElement: null,
    addEventListener: (evt, cb) => {
      listeners.document[evt] = listeners.document[evt] || [];
      listeners.document[evt].push(cb);
    },
    removeEventListener: (evt, cb) => {
      if (listeners.document[evt]) {
        listeners.document[evt] = listeners.document[evt].filter((l) => l !== cb);
      }
    },
    exitPointerLock: () => {
      mockDoc.pointerLockElement = null;
    },
  };

  const mockWin = {
    addEventListener: (evt, cb) => {
      listeners.window[evt] = listeners.window[evt] || [];
      listeners.window[evt].push(cb);
    },
    removeEventListener: (evt, cb) => {
      if (listeners.window[evt]) {
        listeners.window[evt] = listeners.window[evt].filter((l) => l !== cb);
      }
    },
    dispatchEvent: (evt, payload) => {
      (listeners.window[evt] || []).forEach((cb) => cb(payload));
    },
  };

  const mockDom = {
    ownerDocument: mockDoc,
    addEventListener: (evt, cb) => {
      listeners.dom[evt] = listeners.dom[evt] || [];
      listeners.dom[evt].push(cb);
    },
    removeEventListener: (evt, cb) => {
      if (listeners.dom[evt]) {
        listeners.dom[evt] = listeners.dom[evt].filter((l) => l !== cb);
      }
    },
    requestPointerLock: () => {
      mockDoc.pointerLockElement = mockDom;
    },
  };

  globalThis.window = mockWin;
  globalThis.document = mockDoc;

  return { mockDom, mockDoc, mockWin, listeners };
};

describe('Mode 2: First-Person 3D & Point Lock Unit Tests', () => {
  const layout = { length: 24, width: 16, height: 6 };
  let mockEnv;
  let camera;
  let avatar;

  beforeEach(() => {
    mockEnv = setupMockDOM();
    camera = new THREE.PerspectiveCamera(36, 1.5, 0.5, 100);
    avatar = {
      group: new THREE.Group(),
      update: () => {},
      setVisible: () => {},
    };
  });

  afterEach(() => {
    delete globalThis.window;
    delete globalThis.document;
  });

  it('Physical obstacles replace phantom zones and columns and use actual floor bounds',()=>{
    const c=new PlayerController(mockEnv.mockDom,camera,avatar,layout);
    const booth={minX:8.7,maxX:10.5,minZ:-.7,maxZ:.7,name:'Booth',type:'furniture'};
    c.rebuildObstacles(layout,[{x:17,y:10,z:0}],[],()=>[5,0,2],[booth],{length:22.2,width:14.22});
    assert.equal(c.obstacles.length,1);assert.equal(c.obstacles[0].name,'Booth');assert.ok(Math.abs(c.bounds.maxX-10.37)<.001);c.detach();
  });
  it('Walking into an actual booth stops before its bounds',()=>{
    const c=new PlayerController(mockEnv.mockDom,camera,avatar,layout);
    c.rebuildObstacles(layout,[],[],null,[{minX:8.7,maxX:10.5,minZ:-.7,maxZ:.7,type:'furniture'}]);
    assert.equal(c.teleportTo(8,0,0),true);c.keys.right=true;
    for(let frame=0;frame<120;frame++)c.update(1/60,frame/60);
    assert.ok(c.position.x<8.33);assert.ok(c.position.x>=8);c.detach();
  });
  it('Teleport searches a clear landing and does not move when no landing exists',()=>{
    const c=new PlayerController(mockEnv.mockDom,camera,avatar,layout);
    const box={minX:-1,maxX:1,minZ:-1,maxZ:1,type:'furniture'};c.rebuildObstacles(layout,[],[],null,[box]);
    assert.equal(c.teleportTo(0,0,0),true);assert.ok(Math.abs(c.position.x)>1.38||Math.abs(c.position.z)>1.38);
    const before=c.position.clone();c.obstacles=[{minX:-100,maxX:100,minZ:-100,maxZ:100}];
    assert.equal(c.teleportTo(0,0,0),false);assert.ok(c.position.equals(before));c.detach();
  });

  it('1. Initializes with 1.6m human eye level and entrance spawn position', () => {
    const controller = new PlayerController(mockEnv.mockDom, camera, avatar, layout);

    assert.equal(controller.playerHeight, 1.6);
    assert.equal(controller.viewMode, 'first_person');
    assert.ok(Math.abs(controller.position.z - (16 * 0.38)) < 0.1);
    assert.equal(controller.isPointerLocked, false);
    assert.equal(controller.targetLock, null);

    controller.detach();
  });

  it('2. Rebuilds obstacles for perimeter walls, zone counters and dedicated workstations', () => {
    const controller = new PlayerController(mockEnv.mockDom, camera, avatar, layout);

    const zones = [
      { id: 'zone-1', name: 'Barista Zone', x: 6, y: 0, z: 4 },
    ];
    const workstations = [
      { id: 'ws-1', name: 'POS Counter 1', x: 2, y: 0, z: 2 },
      { id: 'ws-2', name: 'Espresso Bar 1', x: 6, y: 0, z: 4 },
    ];
    const toThreeCoords = (x, y, z) => [x - 12, y, z - 8];

    controller.rebuildObstacles(layout, zones, workstations, toThreeCoords);

    // Bounding perimeter
    assert.ok(controller.bounds.minX < -11);
    assert.ok(controller.bounds.maxX > 11);
    assert.ok(controller.bounds.minZ < -7);
    assert.ok(controller.bounds.maxZ > 7);

    // Obstacles count: 2 structural columns + 1 zone + 2 workstations = 5
    assert.equal(controller.obstacles.length, 5);
    const colObstacle = controller.obstacles.find((o) => o.type === 'column');
    assert.ok(colObstacle);
    const wsObstacle = controller.obstacles.find((o) => o.id === 'ws-1');
    assert.ok(wsObstacle);
    assert.equal(wsObstacle.type, 'workstation');

    controller.detach();
  });

  it('3. Moves player with WASD and slides along obstacles and boundaries', () => {
    const controller = new PlayerController(mockEnv.mockDom, camera, avatar, layout);
    controller.position.set(0, 0, 0);
    controller.yaw = 0; // facing -Z

    // Press 'W' to move forward
    controller.handleKeyDown({ code: 'KeyW', target: {} });
    assert.equal(controller.keys.forward, true);

    // Update 5 frames
    for (let i = 0; i < 5; i++) {
      controller.update(0.016, i * 0.016);
    }

    // Moving forward in yaw 0 moves towards negative Z
    assert.ok(controller.position.z < 0);

    // Test boundary clamping: try moving far outside boundary
    controller.position.set(controller.bounds.maxX + 5, 0, 0);
    controller.update(0.016, 0.1);
    assert.ok(controller.position.x <= controller.bounds.maxX);

    controller.detach();
  });

  it('4. Engages Point Lock onto a target and smoothly tracks target position', () => {
    const controller = new PlayerController(mockEnv.mockDom, camera, avatar, layout);
    controller.position.set(0, 0, 5);
    controller.yaw = 0;
    controller.pitch = 0;

    let callbackTarget = null;
    controller.onTargetLockChange = (tl) => {
      callbackTarget = tl;
    };

    // Target at position (5, 0, 0)
    const targetObj = {
      id: 'staff-99',
      type: 'staff',
      name: 'Nguyễn Văn A',
      position: new THREE.Vector3(5, 0, 0),
    };

    controller.setTargetLock(targetObj);

    assert.ok(controller.targetLock);
    assert.equal(controller.targetLock.id, 'staff-99');
    assert.equal(callbackTarget?.name, 'Nguyễn Văn A');

    // Update controller: yaw should rotate towards target (X: 5, Z: -5 relative to player)
    for (let i = 0; i < 15; i++) {
      controller.update(0.016, i * 0.016);
    }

    // Desired angle to (5, -5) is -Math.PI / 4 (~ -0.785 rad)
    assert.ok(Math.abs(controller.yaw - (-Math.PI / 4)) < 0.15);

    // When Point Lock is active, mouse look is overridden
    const oldYaw = controller.yaw;
    controller.handleMouseMove({ movementX: 50, movementY: 50 });
    assert.equal(controller.yaw, oldYaw);

    controller.detach();
  });

  it('5. Dynamic tracking follows moving avatar meshes in real-time', () => {
    const controller = new PlayerController(mockEnv.mockDom, camera, avatar, layout);
    controller.position.set(0, 0, 0);

    // Target mesh that moves
    const movingAvatarMesh = new THREE.Group();
    movingAvatarMesh.position.set(0, 0, -5);
    movingAvatarMesh.userData = { employee: { id: 'staff-moving', fullName: 'Lê Thị B' } };

    controller.setTargetLock({
      id: 'staff-moving',
      type: 'staff',
      name: 'Lê Thị B',
      targetMesh: movingAvatarMesh,
    });

    // Initial look at (0, 0, -5) -> yaw ~ 0
    for (let i = 0; i < 10; i++) controller.update(0.016, 0.1);
    assert.ok(Math.abs(controller.yaw) < 0.1);

    // Move avatar to the right (5, 0, 0)
    movingAvatarMesh.position.set(5, 0, 0);
    for (let i = 0; i < 20; i++) controller.update(0.016, 0.2);

    // Camera yaw should track rightward towards -PI/2 (~ -1.57 rad)
    assert.ok(Math.abs(controller.yaw - (-Math.PI / 2)) < 0.2);

    controller.detach();
  });

  it('6. Hierarchical Escape key releases Point Lock first without dropping pointer lock', () => {
    const controller = new PlayerController(mockEnv.mockDom, camera, avatar, layout);
    controller.isPointerLocked = true;
    mockEnv.mockDoc.pointerLockElement = mockEnv.mockDom;

    let exitCalled = false;
    controller.onExit = () => {
      exitCalled = true;
    };

    // 1. Engage Point Lock
    controller.setTargetLock({ id: 'target-1', name: 'Trạm POS 1', type: 'workstation' });
    assert.ok(controller.targetLock);

    // 2. Press Escape: Must release Point Lock first!
    let stopPropagationCalled = false;
    controller.handleKeyDown({
      code: 'Escape',
      target: {},
      preventDefault: () => {},
      stopPropagation: () => { stopPropagationCalled = true; },
    });

    assert.equal(controller.targetLock, null);
    assert.equal(controller.isPointerLocked, true); // Pointer lock still active!
    assert.equal(exitCalled, false); // Did not exit!

    // 3. Press Escape a second time: Must release pointer lock
    controller.handleKeyDown({
      code: 'Escape',
      target: {},
      preventDefault: () => {},
      stopPropagation: () => {},
    });

    assert.equal(mockEnv.mockDoc.pointerLockElement, null);
    assert.equal(exitCalled, false);

    // 4. Press Escape a third time: Now calls onExit
    controller.isPointerLocked = false;
    controller.handleKeyDown({
      code: 'Escape',
      target: {},
      preventDefault: () => {},
      stopPropagation: () => {},
    });

    assert.equal(exitCalled, true);

    controller.detach();
  });

  it('7. KeyF toggles Point Lock on nearby entity or reticle target', () => {
    const controller = new PlayerController(mockEnv.mockDom, camera, avatar, layout);
    controller.nearbyEntity = {
      id: 'ws-pos',
      type: 'workstation',
      name: 'Quầy Thu Ngân',
      position: new THREE.Vector3(2, 0, 2),
    };

    // Press 'F' to lock onto nearby entity
    controller.handleKeyDown({ code: 'KeyF', target: {} });
    assert.ok(controller.targetLock);
    assert.equal(controller.targetLock.id, 'ws-pos');

    // Press 'F' again to release lock
    controller.handleKeyDown({ code: 'KeyF', target: {} });
    assert.equal(controller.targetLock, null);

    controller.detach();
  });

  it('8. KeyC toggles Free Fly mode and supports vertical flight controls', () => {
    const controller = new PlayerController(mockEnv.mockDom, camera, avatar, layout);
    let flyModeFired = false;
    controller.onFlyModeChange = (isFlying) => {
      flyModeFired = isFlying;
    };

    assert.equal(controller.isFlyMode, false);

    // Toggle Fly Mode with 'C'
    controller.handleKeyDown({ code: 'KeyC', target: {} });
    assert.equal(controller.isFlyMode, true);
    assert.equal(flyModeFired, true);
    assert.equal(controller.isGrounded, false);

    // Space in fly mode sets flyUp
    controller.handleKeyDown({ code: 'Space', target: {}, preventDefault: () => {} });
    assert.equal(controller.keys.flyUp, true);
    controller.handleKeyUp({ code: 'Space' });
    assert.equal(controller.keys.flyUp, false);

    // KeyQ sets flyDown
    controller.handleKeyDown({ code: 'KeyQ', target: {} });
    assert.equal(controller.keys.flyDown, true);
    controller.handleKeyUp({ code: 'KeyQ' });
    assert.equal(controller.keys.flyDown, false);

    // Toggle Fly Mode off with 'C'
    controller.handleKeyDown({ code: 'KeyC', target: {} });
    assert.equal(controller.isFlyMode, false);
    assert.equal(flyModeFired, false);

    controller.detach();
  });

  it('9. Mouse look allows free pitch up to ceiling and down to floor (~85 deg)', () => {
    const controller = new PlayerController(mockEnv.mockDom, camera, avatar, layout);
    controller.isPointerLocked = true;

    // Move mouse down (pitch up)
    controller.handleMouseMove({ movementX: 0, movementY: 1000 });
    assert.ok(controller.pitch > 1.0, `Pitch should be high: ${controller.pitch}`);
    assert.ok(controller.pitch <= 1.48);

    // Move mouse up (pitch down)
    controller.handleMouseMove({ movementX: 0, movementY: -2000 });
    assert.ok(controller.pitch < -1.0, `Pitch should be low: ${controller.pitch}`);
    assert.ok(controller.pitch >= -1.48);

    controller.detach();
  });
});
