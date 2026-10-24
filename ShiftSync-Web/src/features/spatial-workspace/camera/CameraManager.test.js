/**
 * CameraManager.test.js
 * Unit test suite for CameraManager facade (ARC-IMP-02).
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { CameraManager } from './CameraManager.js';
import { CAMERA_MODES } from './CameraModes.js';

if (typeof globalThis.document === 'undefined') {
  globalThis.document = {
    addEventListener: () => {},
    removeEventListener: () => {},
  };
}

describe('ARC-IMP-02: CameraManager Facade Unit Tests', () => {
  const layout = { length: 24, width: 16, height: 6 };

  // Minimal DOM Element mock sufficient for OrbitControls in Node environment
  const createMockDom = () => {
    const doc = {
      addEventListener: () => {},
      removeEventListener: () => {},
    };
    return {
      addEventListener: () => {},
      removeEventListener: () => {},
      ownerDocument: doc,
      clientWidth: 900,
      clientHeight: 600,
      style: {},
      setPointerCapture: () => {},
      releasePointerCapture: () => {},
      getRootNode: () => doc,
    };
  };

  it('1. Initializes dual cameras and CameraController properly', () => {
    const dom = createMockDom();
    const mgr = new CameraManager({
      domElement: dom,
      layout,
      width: 900,
      height: 600,
    });

    assert.ok(mgr.getPerspectiveCamera() instanceof THREE.PerspectiveCamera);
    assert.ok(mgr.getOrthographicCamera() instanceof THREE.OrthographicCamera);
    assert.strictEqual(mgr.getActiveCamera(), mgr.getPerspectiveCamera());
    assert.ok(mgr.getCameraController());
    assert.ok(mgr.getControls());
    assert.strictEqual(mgr.currentMode, CAMERA_MODES.OVERVIEW);

    mgr.dispose();
  });

  it('2. Perspective camera has correct FOV, aspect ratio, and polar limits', () => {
    const dom = createMockDom();
    const mgr = new CameraManager({
      domElement: dom,
      layout,
      width: 1200,
      height: 600,
    });

    const persp = mgr.getPerspectiveCamera();
    assert.strictEqual(persp.fov, 36);
    assert.strictEqual(persp.aspect, 2.0); // 1200 / 600

    const controls = mgr.getControls();
    assert.strictEqual(controls.minPolarAngle, 0.01);
    assert.strictEqual(controls.maxPolarAngle, 1.565);

    mgr.dispose();
  });

  it('3. Switch to TOP_DOWN mode activates OrthographicCamera and locks polar angles to 0', () => {
    const dom = createMockDom();
    const mgr = new CameraManager({
      domElement: dom,
      layout,
      width: 800,
      height: 600,
    });

    mgr.setCameraMode(CAMERA_MODES.TOP_DOWN);

    assert.strictEqual(mgr.getActiveCamera(), mgr.getOrthographicCamera());
    assert.strictEqual(mgr.currentMode, CAMERA_MODES.TOP_DOWN);

    const controls = mgr.getControls();
    assert.strictEqual(controls.object, mgr.getOrthographicCamera());
    assert.strictEqual(controls.minPolarAngle, 0);
    assert.strictEqual(controls.maxPolarAngle, 0);

    mgr.dispose();
  });

  it('4. Switch back to OVERVIEW restores PerspectiveCamera and 3D polar limits', () => {
    const dom = createMockDom();
    const mgr = new CameraManager({
      domElement: dom,
      layout,
      width: 800,
      height: 600,
    });

    mgr.setCameraMode(CAMERA_MODES.TOP_DOWN);
    assert.strictEqual(mgr.getActiveCamera(), mgr.getOrthographicCamera());

    mgr.setCameraMode(CAMERA_MODES.OVERVIEW);
    assert.strictEqual(mgr.getActiveCamera(), mgr.getPerspectiveCamera());
    assert.strictEqual(mgr.currentMode, CAMERA_MODES.OVERVIEW);

    const controls = mgr.getControls();
    assert.strictEqual(controls.object, mgr.getPerspectiveCamera());
    assert.strictEqual(controls.minPolarAngle, 0.01);
    assert.strictEqual(controls.maxPolarAngle, 1.565);

    mgr.dispose();
  });

  it('5. Transitions camera on FOCUS_ZONE and FOCUS_WORKSTATION', () => {
    const dom = createMockDom();
    let coordsConverted = false;
    const mockToThreeCoords = (x, y, z, lay) => {
      coordsConverted = true;
      return [x - 12, y, z - 8];
    };

    const mgr = new CameraManager({
      domElement: dom,
      layout,
      toThreeCoordsFn: mockToThreeCoords,
    });

    // Test FOCUS_ZONE
    const mockZone = { x: 6, y: 0, z: 4 };
    mgr.setCameraMode(CAMERA_MODES.FOCUS_ZONE, { zone: mockZone });
    assert.strictEqual(mgr.getActiveCamera(), mgr.getPerspectiveCamera());
    assert.strictEqual(coordsConverted, true);
    assert.strictEqual(mgr.currentMode, CAMERA_MODES.FOCUS_ZONE);
    assert.deepEqual(mgr.getCameraController().targetLookAt.toArray(), [-6, 0.8, -4]);

    // Test FOCUS_WORKSTATION
    const mockWs = { x: 10, y: 0, z: 5 };
    mgr.setCameraMode(CAMERA_MODES.FOCUS_WORKSTATION, { workstation: mockWs });
    assert.strictEqual(mgr.getActiveCamera(), mgr.getPerspectiveCamera());
    assert.strictEqual(mgr.currentMode, CAMERA_MODES.FOCUS_WORKSTATION);
    assert.deepEqual(mgr.getCameraController().targetLookAt.toArray(), [-2, 0.9, -3]);

    mgr.dispose();
  });

  it('6. FOLLOW_EMPLOYEE engages followObject on target mesh', () => {
    const dom = createMockDom();
    const mgr = new CameraManager({
      domElement: dom,
      layout,
    });

    const mockAvatar = new THREE.Object3D();
    mockAvatar.position.set(2, 0, 3);

    mgr.setCameraMode(CAMERA_MODES.FOLLOW_EMPLOYEE, { avatar: mockAvatar });
    assert.strictEqual(mgr.isFollowing(), true);

    mgr.stopFollowing();
    assert.strictEqual(mgr.isFollowing(), false);

    mgr.dispose();
  });

  it('7. handleResize synchronizes both Perspective and Orthographic camera matrices', () => {
    const dom = createMockDom();
    const mgr = new CameraManager({
      domElement: dom,
      layout,
      width: 800,
      height: 600,
    });

    mgr.handleResize(1600, 800);

    const persp = mgr.getPerspectiveCamera();
    assert.strictEqual(persp.aspect, 2.0); // 1600 / 800

    const ortho = mgr.getOrthographicCamera();
    // width frustum should be doubled relative to height
    const expectedHalfWidth = (mgr.orthoFrustum * 2.0) / 2;
    assert.strictEqual(ortho.right, expectedHalfWidth);
    assert.strictEqual(ortho.left, -expectedHalfWidth);

    mgr.dispose();
  });

  it('8. Safe disposal disposes controls and detaches listeners cleanly', () => {
    const dom = createMockDom();
    let interactionReported = false;
    const mgr = new CameraManager({
      domElement: dom,
      layout,
      onUserOrbitStart: () => {
        interactionReported = true;
      },
    });

    assert.ok(mgr.getControls());
    mgr.dispose();
    assert.strictEqual(mgr.getControls(), null);
    assert.strictEqual(mgr.getCameraController(), null);
  });
  it('Top-down cancels an in-flight workstation transition and remains centered', () => {
    const mgr = new CameraManager({ domElement: createMockDom(), layout });
    mgr.setCameraMode(CAMERA_MODES.FOCUS_WORKSTATION, { targetCoords: [-5, 0, -2] });
    assert.equal(mgr.getCameraController().isTransitioning, true);
    mgr.setCameraMode(CAMERA_MODES.TOP_DOWN);
    assert.equal(mgr.getCameraController().isTransitioning, false);
    const position = mgr.getActiveCamera().position.clone();
    for (let frame = 0; frame < 30; frame++) mgr.update();
    assert.ok(mgr.getActiveCamera().position.distanceTo(position) < 0.001);
    assert.ok(mgr.getControls().target.length() < 0.001);
    mgr.dispose();
  });
  it('Workstation focus chooses a clear sightline around a structural column', () => {
    const scene=new THREE.Scene();
    const column=new THREE.Mesh(new THREE.BoxGeometry(1,6,1));column.position.set(-3.5,3,-.4);column.userData.isColumn=true;scene.add(column);
    const mgr=new CameraManager({domElement:createMockDom(),layout,scene});
    mgr.setCameraMode(CAMERA_MODES.FOCUS_WORKSTATION,{targetCoords:[-5,0,-2]});
    const controller=mgr.getCameraController();
    const ray=new THREE.Ray(controller.targetPos.clone(),controller.targetLookAt.clone().sub(controller.targetPos).normalize());
    const hit=ray.intersectBox(new THREE.Box3().setFromObject(column).expandByScalar(.15),new THREE.Vector3());
    assert.ok(!hit||hit.distanceTo(controller.targetPos)>=controller.targetPos.distanceTo(controller.targetLookAt)-.2);
    mgr.dispose();
  });
  it('Zone focus targets the rendered physical counter instead of a stale domain pad',()=>{
    const scene=new THREE.Scene(),zone=new THREE.Group();zone.position.set(-2,0,-2.45);zone.userData={physicalZoneFrame:true,zone:{id:'pos'}};scene.add(zone);
    const mgr=new CameraManager({domElement:createMockDom(),layout,scene,toThreeCoordsFn:()=>[5,0,2]});
    mgr.setCameraMode(CAMERA_MODES.FOCUS_ZONE,{zone:{id:'pos',x:17,y:10,z:0}});
    const target=mgr.getCameraController().targetLookAt;
    assert.equal(target.x,-2);assert.equal(target.z,-2.45);mgr.dispose();
  });
});
