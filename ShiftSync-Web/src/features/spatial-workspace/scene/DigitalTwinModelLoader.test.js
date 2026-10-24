/**
 * DigitalTwinModelLoader.test.js
 * Comprehensive unit test suite for DigitalTwinModelLoader:
 * - GLB parsing & structural integrity
 * - Semantic classification & layer tagging
 * - Workstation & Zone hierarchy indexing
 * - Data binding & coordinate synchronization
 * - Obstacle extraction for physics & collision
 * - Fallback resilience & error handling
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import * as THREE from 'three';
import {
  loadDigitalTwinModel,
  classifyModelHierarchy,
  mapWorkstationsToGlb,
  extractGlbObstacles,
  GLB_WORKSTATION_KEYS,
  GLB_ZONE_KEYS,
} from './DigitalTwinModelLoader.js';

describe('Digital Twin Model Loader & Semantic Parser', () => {
  it('Uses visible world geometry for furniture and excludes hidden workstations',()=>{
    const root=new THREE.Group();root.position.x=2;
    const customer=new THREE.Group();customer.name='Customer_Furniture';root.add(customer);
    const booths=new THREE.Group();booths.name='Dining_Booths_Cluster';customer.add(booths);
    const booth=new THREE.Mesh(new THREE.BoxGeometry(2,1,1));booth.name='Booth';booth.position.x=3;booths.add(booth);
    const hidden=new THREE.Mesh(new THREE.BoxGeometry(2,1,1));hidden.name='Workstation_Kitchen_01';hidden.visible=false;root.add(hidden);
    const obstacles=extractGlbObstacles(root);
    assert.strictEqual(obstacles.length,1);assert.strictEqual(obstacles[0].type,'furniture');assert.strictEqual(obstacles[0].minX,4);assert.strictEqual(obstacles[0].maxX,6);
    booths.visible=false;assert.strictEqual(extractGlbObstacles(root).length,0);
  });
  it('Includes surplus procedural workstations without duplicating GLB workstations',()=>{
    const root=new THREE.Group(),bound=new THREE.Mesh(new THREE.BoxGeometry(2,1,1));bound.name='Workstation_POS_01';bound.userData.workstationId='pos';root.add(bound);
    const surplus=new THREE.Mesh(new THREE.BoxGeometry(1,1,1));surplus.userData.workstationId='extra';surplus.position.x=4;
    const obstacles=extractGlbObstacles(root,null,[bound,surplus]);
    assert.strictEqual(obstacles.length,2);assert.strictEqual(obstacles.filter(o=>o.id==='pos').length,1);assert.strictEqual(obstacles.find(o=>o.id==='extra').minX,3.5);
  });
  // Pre-load binary GLB buffer from filesystem for fast, deterministic unit test execution
  const glbPath = path.resolve(process.cwd(), 'public/models/store-v2/shiftsync-cafe.glb');
  const glbBuffer = fs.readFileSync(glbPath);
  const arrayBuffer = glbBuffer.buffer.slice(
    glbBuffer.byteOffset,
    glbBuffer.byteOffset + glbBuffer.byteLength
  );

  it('1. Successfully loads and parses glTF 2.0 binary asset from ArrayBuffer', async () => {
    const modelData = await loadDigitalTwinModel({ arrayBuffer });

    assert.ok(modelData, 'Model data must be returned');
    assert.strictEqual(modelData.isGlb, true, 'isGlb flag must be true');
    assert.ok(modelData.scene, 'Three.js scene must be present');
    assert.ok(modelData.modelRoot, 'Model root must be identified');
    assert.strictEqual(modelData.modelRoot.name, 'ShiftSync_Store_DigitalTwin');
  });

  it('2. Correctly indexes all 4 semantic workstation nodes in GLB hierarchy', async () => {
    const modelData = await loadDigitalTwinModel({ arrayBuffer });
    const { workstationsMap } = modelData;

    assert.strictEqual(workstationsMap.size, 4, 'Must find exactly 4 workstations in the model');
    GLB_WORKSTATION_KEYS.forEach((key) => {
      assert.ok(workstationsMap.has(key), `Must contain workstation node ${key}`);
      const node = workstationsMap.get(key);
      assert.strictEqual(node.userData.isWorkstation, true, `${key} must have isWorkstation: true`);
      assert.strictEqual(node.userData.layer, 'workstations', `${key} must belong to workstations layer`);
    });
  });

  it('3. Correctly indexes all 6 functional store zones in GLB hierarchy', async () => {
    const modelData = await loadDigitalTwinModel({ arrayBuffer });
    const { zonesMap } = modelData;

    assert.strictEqual(zonesMap.size, 6, 'Must find exactly 6 functional zones in the model');
    GLB_ZONE_KEYS.forEach((key) => {
      assert.ok(zonesMap.has(key), `Must contain zone node ${key}`);
      const node = zonesMap.get(key);
      assert.strictEqual(node.userData.isZone, true, `${key} must have isZone: true`);
      assert.strictEqual(node.userData.layer, 'zones', `${key} must belong to zones layer`);
    });
  });

  it('4. Tags layers and classifies structural elements (walls, floors, columns, ceiling)', async () => {
    const modelData = await loadDigitalTwinModel({ arrayBuffer });
    const { columns, wallMeshes } = modelData;

    assert.ok(columns.length >= 2, 'Must identify at least 2 structural columns');
    columns.forEach((col) => {
      assert.strictEqual(col.userData.isObstacle, true, 'Column must be tagged as an obstacle');
      assert.strictEqual(col.userData.isColumn, true, 'Column must have isColumn: true');
    });

    assert.ok(wallMeshes.length > 0, 'Must identify wall meshes for X-Ray control');
    wallMeshes.forEach((mesh) => {
      assert.strictEqual(mesh.userData.isWall, true, 'Mesh must be tagged with isWall: true');
      assert.ok(mesh.userData.originalMat, 'Mesh must preserve original material for X-Ray toggle');
    });
  });

  it('5. mapWorkstationsToGlb maps backend workstations by type and binds authoritative data', async () => {
    const modelData = await loadDigitalTwinModel({ arrayBuffer });
    const { workstationsMap } = modelData;

    const backendWorkstations = [
      { id: 'ws-pos-101', name: 'Quầy Thu Ngân 1', code: 'WS-POS-01', type: 'POS', x: 8.8, y: 0, z: 11.5, rotation: 0 },
      { id: 'ws-esp-102', name: 'Quầy Pha Chế Barista', code: 'WS-ESP-01', type: 'BARISTA', x: 6.0, y: 0, z: 8.8, rotation: Math.PI / 2 },
      { id: 'ws-srv-103', name: 'Quầy Trả Món Dịch Vụ', code: 'WS-SRV-01', type: 'SERVICE', x: 9.8, y: 0, z: 8.8 },
      { id: 'ws-kit-104', name: 'Tủ Bánh & Bếp', code: 'WS-KIT-01', type: 'KITCHEN', x: 9.8, y: 0, z: 11.5 },
    ];

    const layout = { length: 24, width: 16, height: 6 };
    const { mappedMeshes, unmappedWorkstations } = mapWorkstationsToGlb(
      backendWorkstations,
      workstationsMap,
      layout
    );

    assert.strictEqual(mappedMeshes.length, 4, 'All 4 backend workstations must be mapped');
    assert.strictEqual(unmappedWorkstations.length, 0, 'Zero unmapped workstations expected');

    // Verify POS mapping
    const posMapping = mappedMeshes.find((m) => m.ws.id === 'ws-pos-101');
    assert.strictEqual(posMapping.glbKey, 'Workstation_POS_01');
    assert.strictEqual(posMapping.mesh.userData.workstationId, 'ws-pos-101');
    assert.strictEqual(posMapping.mesh.userData.workstation.name, 'Quầy Thu Ngân 1');
    posMapping.mesh.traverse(child => {
      assert.strictEqual(child.userData.isWorkstation, child === posMapping.mesh, 'Only the assembly root is marked draggable');
      assert.strictEqual(child.userData.workstationId, 'ws-pos-101', 'Children retain informational binding');
    });


    // Verify Barista mapping and rotation
    const baristaMapping = mappedMeshes.find((m) => m.ws.id === 'ws-esp-102');
    assert.strictEqual(baristaMapping.glbKey, 'Workstation_Barista_01');
    assert.strictEqual(baristaMapping.mesh.rotation.y, Math.PI / 2);
  });

  it('6. mapWorkstationsToGlb handles surplus backend workstations cleanly', async () => {
    const modelData = await loadDigitalTwinModel({ arrayBuffer });
    const { workstationsMap } = modelData;

    const backendWorkstations = [
      { id: 'ws-1', type: 'POS' },
      { id: 'ws-2', type: 'BARISTA' },
      { id: 'ws-3', type: 'SERVICE' },
      { id: 'ws-4', type: 'KITCHEN' },
      { id: 'ws-5', type: 'EXTRA_KIOSK', name: 'Kiosk tự phục vụ 5' },
    ];

    const { mappedMeshes, unmappedWorkstations } = mapWorkstationsToGlb(
      backendWorkstations,
      workstationsMap
    );

    assert.strictEqual(mappedMeshes.length, 4, 'Exactly 4 workstations mapped to GLB nodes');
    assert.strictEqual(unmappedWorkstations.length, 1, '1 surplus workstation returned in unmapped list');
    assert.strictEqual(unmappedWorkstations[0].id, 'ws-5');
  });

  it('7. extractGlbObstacles generates AABB obstacles for columns, counters, and partitions', async () => {
    const modelData = await loadDigitalTwinModel({ arrayBuffer });
    const obstacles = extractGlbObstacles(modelData.modelRoot);

    assert.ok(obstacles.length >= 7, 'Must generate obstacles for columns, counters, and partitions');

    const columnObstacles = obstacles.filter((o) => o.type === 'column');
    assert.strictEqual(columnObstacles.length, 2, 'Must have 2 column obstacles');

    const workstationObstacles = obstacles.filter((o) => o.type === 'workstation');
    assert.strictEqual(workstationObstacles.length, 4, 'Must have 4 workstation obstacles');

    const wallObstacles = obstacles.filter((o) => o.type === 'wall');
    assert.ok(wallObstacles.length >= 2, 'Must have at least 2 storage partition wall obstacles');

    // Verify bounding box sanity: min < max
    obstacles.forEach((obs) => {
      assert.ok(obs.minX < obs.maxX, `Obstacle ${obs.name} minX must be less than maxX`);
      assert.ok(obs.minZ < obs.maxZ, `Obstacle ${obs.name} minZ must be less than maxZ`);
    });
  });

  it('8. Fallback resilience: Handles missing or invalid model gracefully without crashing', async () => {
    let threw = false;
    try {
      await loadDigitalTwinModel({ url: '/non_existent_model_file.glb' });
    } catch (err) {
      threw = true;
      assert.ok(err, 'Must catch error gracefully');
    }
    assert.strictEqual(threw, true, 'Must reject on non-existent file in isolated test');
  });
  it('Exposes semantic layer groups consumed by GLB visibility controls', async () => {
    const data = await loadDigitalTwinModel({ arrayBuffer });
    assert.ok(data.layers.furniture.length > 0);
    assert.ok(data.layers.walls.length > 0);
    assert.ok([...data.workstationsMap.values()].every(node => data.layers.workstations.includes(node)));
    data.layers.furniture.forEach(node => { node.visible = false; });
    assert.ok([...data.workstationsMap.values()].every(node => node.visible));
  });
});
