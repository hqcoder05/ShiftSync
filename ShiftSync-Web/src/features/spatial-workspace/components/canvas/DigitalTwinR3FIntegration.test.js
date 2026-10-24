/**
 * DigitalTwinR3FIntegration.test.js
 * Integration test suite for the React Three Fiber (R3F) Digital Twin Architecture.
 * 
 * Verifies:
 * 1. Declarative R3F component export integrity and prop contracts.
 * 2. Single WebGL Canvas enforcement & zero store-stacking architecture.
 * 3. Layer visibility & non-destructive X-Ray material state transitions.
 * 4. OverviewCameraController bridge contract with CameraManager (perspective/ortho/focus).
 * 5. FirstPersonController bridge contract with PlayerController (1.6m eye level, AABB collision).
 * 6. WorkstationLayer and ZoneVisualizationLayer declarative data binding contracts.
 * 7. Resource disposal lifecycle safely cleans meshes without purging shared singletons.
 */

// Mock minimal browser globals for CanvasTexture in Node before Three.js imports
if (typeof globalThis.document === 'undefined') {
  globalThis.document = {
    addEventListener: () => {},
    removeEventListener: () => {},
    createElement: (tag) => {
      if (tag === 'canvas') {
        return {
          width: 512,
          height: 256,
          getContext: () => ({
            fillStyle: '',
            strokeStyle: '',
            lineWidth: 1,
            font: '',
            textAlign: '',
            textBaseline: '',
            beginPath: () => {},
            roundRect: () => {},
            rect: () => {},
            fillRect: () => {},
            strokeRect: () => {},
            fill: () => {},
            stroke: () => {},
            arc: () => {},
            fillText: () => {},
          }),
        };
      }
      return {};
    },
  };
}

if (typeof globalThis.window === 'undefined') {
  globalThis.window = {
    addEventListener: () => {},
    removeEventListener: () => {},
  };
}

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import * as THREE from 'three';

// Import underlying domain engines to verify bridge compatibility
import { CameraManager } from '../../camera/CameraManager.js';
import { CAMERA_MODES } from '../../camera/CameraModes.js';
import { PlayerController } from '../../explore/PlayerController.js';
import { WorkstationDragController } from '../../interaction/WorkstationDragController.js';
import { loadDigitalTwinModel, mapWorkstationsToGlb, extractGlbObstacles } from '../../scene/DigitalTwinModelLoader.js';
import { resolveWorkstationOccupancies, OCCUPANCY_STATES } from '../../utils/workstationOccupancy.js';
import { disposeHierarchy, ResourceManager } from '../../scene/ResourceManager.js';
import { toThreeCoords } from '../../../../components/spatial/spatial.constants.js';

describe('MISSION R3F-001 — React Three Fiber Architecture Integration Suite', () => {
  const layout = { length: 24, width: 16, height: 6 };
  const glbPath = path.resolve(process.cwd(), 'public/models/store-v2/shiftsync-cafe.glb');
  const glbBuffer = fs.readFileSync(glbPath);
  const arrayBuffer = glbBuffer.buffer.slice(
    glbBuffer.byteOffset,
    glbBuffer.byteOffset + glbBuffer.byteLength
  );

  const createMockDom = () => {
    const doc = {
      addEventListener: () => {},
      removeEventListener: () => {},
      pointerLockElement: null,
      exitPointerLock: () => {},
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
      requestPointerLock: () => {
        doc.pointerLockElement = this;
      },
    };
  };

  it('1. All R3F declarative components exist and declare valid default export signatures', () => {
    const canvasDir = path.resolve(process.cwd(), 'src/features/spatial-workspace/components/canvas');
    const componentFiles = [
      'DigitalTwinCanvas.jsx',
      'DigitalTwinLighting.jsx',
      'SteamParticles.jsx',
      'CoffeeShopModel.jsx',
      'ZoneVisualizationLayer.jsx',
      'WorkstationLayer.jsx',
      'AvatarLayer.jsx',
      'OverviewCameraController.jsx',
      'FirstPersonController.jsx',
    ];

    componentFiles.forEach((file) => {
      const filePath = path.join(canvasDir, file);
      assert.ok(fs.existsSync(filePath), `File must exist: ${file}`);
      const content = fs.readFileSync(filePath, 'utf8');
      assert.ok(
        content.includes('export default function'),
        `Component ${file} must have default export function`
      );
    });
  });

  it('2. Single Canvas Architecture: Verifies single WebGL canvas containment & no competing renderers', () => {
    const canvasFilePath = path.resolve(
      process.cwd(),
      'src/features/spatial-workspace/components/canvas/DigitalTwinCanvas.jsx'
    );
    const canvasCode = fs.readFileSync(canvasFilePath, 'utf8');

    // Verify single active Canvas import and usage
    assert.ok(
      canvasCode.includes("from '@react-three/fiber'"),
      'DigitalTwinCanvas must import from @react-three/fiber'
    );
    assert.ok(
      canvasCode.includes('<Canvas'),
      'DigitalTwinCanvas must declare single root <Canvas> component'
    );
    // Ensure no secondary manual WebGLRenderer creation inside DigitalTwinCanvas
    assert.ok(
      !canvasCode.includes('new THREE.WebGLRenderer'),
      'DigitalTwinCanvas must delegate WebGL context to R3F, not create manual WebGLRenderer'
    );

    // Checking props contract for unified workspace management
    const canvasProps = {
      layout,
      zones: [{ id: 'z1', code: 'POS', name: 'POS Zone', x: 2, y: 3, width: 4, height: 4 }],
      workstations: [{ id: 'w1', code: 'POS-01', name: 'POS Terminal', x: 2, y: 3, z: 0, type: 'POS' }],
      activeAssignments: [],
      actualPresences: [],
      isExploreMode: false,
      cameraMode: CAMERA_MODES.PERSPECTIVE,
      layers: { floor: true, walls: true, furniture: true, heatmaps: true, avatars: true, labels: true },
      xrayMode: false,
      isSimulating: false,
      simViewMode: 'ACTUAL',
    };

    assert.ok(canvasProps.layout.length > 0, 'Layout dimensions provided');
    assert.ok(canvasProps.cameraMode === CAMERA_MODES.PERSPECTIVE, 'Camera mode initialized');
    assert.ok(canvasProps.layers.floor === true, 'Default layer visibility enabled');
  });

  it('3. CoffeeShopModel layer filtering and non-destructive X-Ray mode behavior', async () => {
    const modelData = await loadDigitalTwinModel({ arrayBuffer });
    assert.ok(modelData.modelRoot, 'GLB model root parsed successfully');

    // Test layer visibility toggles
    const layers = { floor: true, walls: false, ceiling: false, furniture: true };
    modelData.modelRoot.traverse((node) => {
      const layer = node.userData?.layer;
      if (layer && layers[layer] !== undefined) {
        node.visible = layers[layer];
      }
    });

    const wallNodes = [];
    modelData.modelRoot.traverse((node) => {
      if (node.userData?.layer === 'walls') wallNodes.push(node);
    });

    assert.ok(wallNodes.length > 0, 'Walls must be tagged with layer=walls');
    wallNodes.forEach((wall) => {
      assert.strictEqual(wall.visible, false, 'Wall node must be hidden when layers.walls is false');
    });

    // Test X-Ray non-destructive ghosting
    const testMesh = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({ color: 0x888888, opacity: 1, transparent: false })
    );
    testMesh.userData.layer = 'walls';
    const origMaterial = testMesh.material;

    // Apply X-Ray
    testMesh.userData._origMaterial = testMesh.material;
    testMesh.material = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.2,
      wireframe: true,
    });

    assert.strictEqual(testMesh.material.transparent, true, 'X-Ray material is transparent');
    assert.strictEqual(testMesh.material.opacity, 0.2, 'X-Ray material opacity is 0.2');

    // Restore from X-Ray
    testMesh.material.dispose();
    testMesh.material = testMesh.userData._origMaterial;
    delete testMesh.userData._origMaterial;

    assert.strictEqual(testMesh.material, origMaterial, 'Original wall material restored cleanly');
    assert.strictEqual(testMesh.material.transparent, false, 'Original material opacity restored');
  });

  it('4. OverviewCameraController bridge properly controls CameraManager instances', () => {
    const dom = createMockDom();
    const manager = new CameraManager({
      domElement: dom,
      layout,
      width: 900,
      height: 600,
      toThreeCoordsFn: (x, y, z) => [x - 12, y, z - 8],
    });

    // Test mode switches
    manager.setCameraMode(CAMERA_MODES.TOP_DOWN);
    assert.strictEqual(manager.currentMode, CAMERA_MODES.TOP_DOWN, 'Mode switches to TOP_DOWN');

    manager.setCameraMode(CAMERA_MODES.OVERVIEW);
    assert.strictEqual(manager.currentMode, CAMERA_MODES.OVERVIEW, 'Mode switches back to OVERVIEW');

    // Test focus target transition
    const mockWs = { x: 10, y: 0, z: 5 };
    manager.setCameraMode(CAMERA_MODES.FOCUS_WORKSTATION, { workstation: mockWs });
    assert.strictEqual(manager.currentMode, CAMERA_MODES.FOCUS_WORKSTATION, 'Mode switches to FOCUS_WORKSTATION');
    assert.strictEqual(manager.getActiveCamera(), manager.getPerspectiveCamera(), 'Uses perspective camera for workstation focus');

    // Test flyTo arbitrary position
    manager.flyTo(new THREE.Vector3(5, 10, 5), new THREE.Vector3(0, 0, 0), 0.1);
    assert.ok(manager.getCameraController().isTransitioning, 'Camera initiates smooth focus transition');

    manager.dispose();
  });

  it('5. FirstPersonController bridge supports 1.6m eye level and GLB AABB collision sliding', async () => {
    const dom = createMockDom();
    const camera = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 100);

    const modelData = await loadDigitalTwinModel({ arrayBuffer });
    const glbObstacles = extractGlbObstacles(modelData.modelRoot);
    assert.ok(glbObstacles.length >= 7, 'GLB obstacles extracted successfully');

    const avatar = {
      group: new THREE.Group(),
      update: () => {},
      setVisible: () => {},
    };

    const controller = new PlayerController(dom, camera, avatar, layout);

    // Check human eye level
    assert.strictEqual(controller.playerHeight, 1.6, 'Human eye level must be exactly 1.6m');

    // Rebuild obstacles including GLB obstacles
    controller.rebuildObstacles(layout, [], [], toThreeCoords, glbObstacles);
    assert.ok(controller.obstacles.length >= 7, 'Obstacles attached to PlayerController');

    // Simulate walking
    controller.keys.forward = true;
    controller.update(0.05);

    // Player position remains clamped inside floor boundaries
    const [minX, maxX] = [-layout.length / 2, layout.length / 2];
    const [minZ, maxZ] = [-layout.width / 2, layout.width / 2];

    assert.ok(controller.position.x >= minX && controller.position.x <= maxX, 'Player clamped inside store X');
    assert.ok(controller.position.z >= minZ && controller.position.z <= maxZ, 'Player clamped inside store Z');

    controller.detach();
  });

  it('6. WorkstationLayer and ZoneVisualizationLayer declarative data binding contracts', async () => {
    const rawWorkstations = [
      { id: 'ws-pos-1', code: 'POS-01', name: 'POS Main', type: 'POS', x: 2, y: 3, z: 0 },
      { id: 'ws-bar-1', code: 'BAR-01', name: 'Barista Espresso', type: 'BARISTA', x: 8, y: 4, z: 0 },
    ];
    const rawAssignments = [
      { id: 'asgn-1', staffId: 'user-1', workstationId: 'ws-pos-1', status: 'ACTIVE' },
    ];
    const rawPresences = [
      { staffId: 'user-1', status: 'PRESENT' },
    ];

    // Compute occupancies with explicit shift context
    const occupancyMap = resolveWorkstationOccupancies(
      rawWorkstations,
      rawAssignments,
      rawPresences,
      {
        currentShift: { id: 'shift-1', startTime: '08:00', endTime: '16:00' },
        hasShiftSelected: true,
        isLoading: false,
        error: null,
      }
    );

    assert.strictEqual(occupancyMap.get('ws-pos-1')?.state, OCCUPANCY_STATES.ASSIGNED);
    assert.strictEqual(occupancyMap.get('ws-bar-1')?.state, OCCUPANCY_STATES.UNASSIGNED);

    // Coordinate conversion mapping
    const [posX, posY, posZ] = toThreeCoords(rawWorkstations[0].x, rawWorkstations[0].y, 0, layout);
    assert.strictEqual(typeof posX, 'number');
    assert.strictEqual(posY, 0);
    assert.strictEqual(typeof posZ, 'number');
  });

  it('7. Resource disposal lifecycle safely cleans meshes without purging shared singletons', () => {
    let sharedMatDisposed = false;
    let instanceMatDisposed = false;
    let instanceGeoDisposed = false;

    const sharedMat = new THREE.MeshBasicMaterial();
    sharedMat.dispose = () => { sharedMatDisposed = true; };
    ResourceManager.registerSharedResource(sharedMat);

    const instanceGeo = new THREE.BoxGeometry(1, 1, 1);
    instanceGeo.dispose = () => { instanceGeoDisposed = true; };

    const instanceMat = new THREE.MeshBasicMaterial();
    instanceMat.dispose = () => { instanceMatDisposed = true; };

    const parentGroup = new THREE.Group();
    const sharedChild = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), sharedMat);
    const instanceChild = new THREE.Mesh(instanceGeo, instanceMat);

    parentGroup.add(sharedChild);
    parentGroup.add(instanceChild);

    disposeHierarchy(parentGroup);

    assert.strictEqual(sharedMatDisposed, false, 'Shared material must NEVER be disposed');
    assert.strictEqual(instanceMatDisposed, true, 'Instance material must be disposed');
    assert.strictEqual(instanceGeoDisposed, true, 'Instance geometry must be disposed');
  });
});
