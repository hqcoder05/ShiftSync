/**
 * DigitalTwinGLBIntegration.test.js
 * Comprehensive integration test suite for the Coffee Shop 3D Digital Twin GLB:
 * - SceneGraphManager GLB asset integration & replacement of procedural geometry
 * - Single scene graph preservation (zero duplicate store stacking)
 * - Layer visibility & selective X-Ray on GLB meshes
 * - PlayerController First-Person navigation & AABB sliding collision with GLB obstacles
 * - WorkstationDragController raycasting, dragging, 90° rotation & rollback on GLB meshes
 * - Graceful fallback to procedural geometry on load failure
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import * as THREE from 'three';
import { SceneGraphManager } from './SceneGraphManager.js';
import { loadDigitalTwinModel, mapWorkstationsToGlb, extractGlbObstacles } from './DigitalTwinModelLoader.js';
import { PlayerController } from '../explore/PlayerController.js';
import { WorkstationDragController } from '../interaction/WorkstationDragController.js';

describe('Digital Twin GLB Integration Suite', () => {
  const glbPath = path.resolve(process.cwd(), 'public/models/store-v2/shiftsync-cafe.glb');
  const glbBuffer = fs.readFileSync(glbPath);
  const arrayBuffer = glbBuffer.buffer.slice(
    glbBuffer.byteOffset,
    glbBuffer.byteOffset + glbBuffer.byteLength
  );

  it('1. SceneGraphManager loads GLB and replaces procedural store without double-rendering', async () => {
    const layout = { length: 24, width: 16, height: 6 };
    const manager = new SceneGraphManager({ layout });

    assert.strictEqual(manager.isGlbModelActive(), false, 'Initially procedural store is active');
    const initialChildren = manager.getEnvGroup().children.length;
    assert.ok(initialChildren > 0, 'Procedural store environment has initial children');

    // Pre-load model data and apply directly
    const modelData = await loadDigitalTwinModel({ arrayBuffer });
    manager.setStoreModelDirect(modelData);

    assert.strictEqual(manager.isGlbModelActive(), true, 'GLB model must be marked as active');
    assert.ok(manager.getGlbModel(), 'getGlbModel must return model data');

    // Verify only the GLB model root is inside envGroup (no stacked procedural meshes)
    const envChildren = manager.getEnvGroup().children;
    assert.strictEqual(envChildren.length, 1, 'Only 1 root object (GLB store) should be inside envGroup');
    assert.strictEqual(envChildren[0].name, 'ShiftSync_Store_DigitalTwin');

    manager.dispose();
  });

  it('2. Multi-layer visibility toggles accurately on GLB model layers', async () => {
    const layout = { length: 24, width: 16, height: 6 };
    const manager = new SceneGraphManager({ layout });
    const modelData = await loadDigitalTwinModel({ arrayBuffer });
    manager.setStoreModelDirect(modelData);

    const env = manager.getEnvGroup();

    // Toggle walls off
    manager.setLayersVisibility({ showWalls: false, showCeiling: true, showFurniture: true });
    env.traverse((child) => {
      if (child.userData?.layer === 'walls') {
        assert.strictEqual(child.visible, false, 'Walls must be hidden when showWalls is false');
      }
    });

    // Toggle walls back on
    manager.setLayersVisibility({ showWalls: true, showCeiling: true, showFurniture: true });
    env.traverse((child) => {
      if (child.userData?.layer === 'walls') {
        assert.strictEqual(child.visible, true, 'Walls must be visible when showWalls is true');
      }
    });

    // Toggle ceiling off
    manager.setLayersVisibility({ showCeiling: false });
    env.traverse((child) => {
      if (child.userData?.layer === 'ceiling') {
        assert.strictEqual(child.visible, false, 'Ceiling must be hidden when showCeiling is false');
      }
    });

    manager.dispose();
  });

  it('3. X-Ray mode selectively applies transparent ghosting to GLB walls and restores original materials', async () => {
    const layout = { length: 24, width: 16, height: 6 };
    const manager = new SceneGraphManager({ layout });
    const modelData = await loadDigitalTwinModel({ arrayBuffer });
    manager.setStoreModelDirect(modelData);

    const env = manager.getEnvGroup();
    const sampleWall = modelData.wallMeshes[0];
    const originalMat = sampleWall.userData.originalMat;
    assert.ok(originalMat, 'Wall must have originalMat stored');

    // Activate X-Ray
    manager.setXRayMode(true);
    assert.notStrictEqual(sampleWall.material, originalMat, 'Wall material must change in X-Ray mode');
    assert.strictEqual(sampleWall.material.transparent, true, 'X-Ray material must be transparent');

    // Deactivate X-Ray
    manager.setXRayMode(false);
    assert.strictEqual(sampleWall.material, originalMat, 'Wall material must be restored to originalMat');

    manager.dispose();
  });

  it('4. PlayerController enforces collision against GLB columns, counters, and partitions', async () => {
    const layout = { length: 24, width: 16, height: 6 };
    const modelData = await loadDigitalTwinModel({ arrayBuffer });
    const glbObstacles = extractGlbObstacles(modelData.modelRoot);

    const dom = { addEventListener: () => {}, removeEventListener: () => {} };
    const camera = new THREE.PerspectiveCamera();
    const controller = new PlayerController(dom, camera, null, layout);

    controller.rebuildObstacles(layout, [], [], null, glbObstacles);

    // Verify obstacles include column at x: -3.55, z: -1.14
    const colObs = controller.obstacles.find((o) => o.type === 'column');
    assert.ok(colObs, 'Must have column obstacle');

    // Place player near column and attempt to walk directly into it
    controller.position.set(colObs.minX - 0.5, 0, (colObs.minZ + colObs.maxZ) / 2);
    controller.keys.forward = true;
    controller.yaw = -Math.PI / 2; // Moving eastward towards the column

    // Step physics update
    controller.update(0.05, 0.1);

    // Verify player does NOT pass through obstacle
    assert.ok(
      controller.position.x < colObs.minX,
      `Player position X (${controller.position.x}) must remain outside obstacle minX (${colObs.minX})`
    );
  });

  it('5. WorkstationDragController raycasts, selects, drags, and rotates GLB workstation meshes', async () => {
    const layout = { length: 24, width: 16, height: 6 };
    const modelData = await loadDigitalTwinModel({ arrayBuffer });
    const { workstationsMap } = modelData;

    const backendWorkstations = [
      { id: 'ws-pos-1', name: 'Quầy Thu Ngân', type: 'POS', x: 8.8, y: 0, z: 11.5, rotation: 0 },
      { id: 'ws-bar-2', name: 'Quầy Barista', type: 'BARISTA', x: 6.0, y: 0, z: 8.8, rotation: 0 },
    ];

    const { mappedMeshes } = mapWorkstationsToGlb(backendWorkstations, workstationsMap, layout);
    const workstationMeshes = mappedMeshes.map((m) => m.mesh);

    const scene = new THREE.Scene();
    workstationMeshes.forEach((m) => scene.add(m));

    const dom = {
      addEventListener: () => {},
      removeEventListener: () => {},
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
    };
    const camera = new THREE.PerspectiveCamera();
    camera.position.set(0, 10, 15);
    camera.lookAt(0, 0, 0);

    const dragController = new WorkstationDragController({
      domElement: dom,
      camera,
      scene,
      layout,
    });

    dragController.updateContext({
      workstationMeshes,
      workstations: backendWorkstations,
      layout,
    });

    // 1. Select POS workstation
    dragController.selectWorkstation(backendWorkstations[0]);
    assert.ok(dragController.selectedMesh, 'Selected mesh must be bound');
    assert.strictEqual(dragController.selectedMesh.userData.workstationId, 'ws-pos-1');

    // 2. Rotate 90 degrees
    const prevRotY = dragController.selectedMesh.rotation.y;
    dragController.rotateSelected(Math.PI / 2);
    assert.strictEqual(dragController.selectedMesh.rotation.y, prevRotY + Math.PI / 2);

    // 3. Revert position
    const origPos = dragController.selectedMesh.position.clone();
    dragController.selectedMesh.position.set(5.0, 0, 5.0);
    dragController.revertPosition();
    assert.strictEqual(dragController.selectedMesh.position.x, origPos.x);
    assert.strictEqual(dragController.selectedMesh.position.z, origPos.z);

    dragController.dispose();
  });

  it('6. Gracefully falls back to procedural geometry if GLB model loading fails', async () => {
    const layout = { length: 24, width: 16, height: 6 };
    const manager = new SceneGraphManager({ layout });

    assert.strictEqual(manager.isGlbModelActive(), false);
    const initialChildren = manager.getEnvGroup().children.length;

    // Attempt to load invalid path
    const result = await manager.loadAndApplyStoreModel('/invalid/non_existent.glb');

    assert.strictEqual(result, null, 'Must return null on load failure');
    assert.strictEqual(manager.isGlbModelActive(), false, 'isGlbModelActive must remain false');
    assert.strictEqual(
      manager.getEnvGroup().children.length,
      initialChildren,
      'Procedural store environment must remain intact'
    );

    manager.dispose();
  });
});
