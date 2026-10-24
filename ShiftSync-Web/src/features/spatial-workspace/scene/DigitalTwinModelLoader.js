/**
 * DigitalTwinModelLoader.js
 * Asynchronous GLB Loader, Semantic Hierarchy Parser, and Data Binding Layer
 * for the ShiftSync Store 3D Digital Twin.
 * 
 * Features:
 * - Loads glTF 2.0 binary (.glb) asset asynchronously via Three.js GLTFLoader.
 * - Parses and indexes the 4 semantic workstations (POS, Barista, Service, Kitchen)
 *   and 6 functional zones (POS, Barista, Customer Service, Dining, Storage, Entrance).
 * - Tags hierarchical layers ('floor', 'walls', 'ceiling', 'furniture', 'workstations', 'zones')
 *   to support multi-layer visibility toggling and X-Ray ghosting.
 * - Binds backend workstation entities (API coordinates, occupancy, and staff presence)
 *   directly to GLB 3D workstation nodes.
 * - Extracts AABB physical obstacle bounding boxes for First-Person sliding collision.
 * - Provides graceful fallback to procedural geometry if network/file errors occur.
 */

import * as THREE from 'three';
import {geometryFootprint} from './StoreArrangement.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { toThreeCoords } from '../../../components/spatial/spatial.constants.js';
import { enhanceDigitalTwinModelMaterials } from './DigitalTwinMaterialEnhancer.js';

export const DEFAULT_DIGITAL_TWIN_GLB_URL = '/models/store-v2/shiftsync-cafe.glb';

export const GLB_WORKSTATION_KEYS = [
  'Workstation_POS_01',
  'Workstation_Barista_01',
  'Workstation_Service_01',
  'Workstation_Kitchen_01',
];

export const GLB_ZONE_KEYS = [
  'Zone_POS',
  'Zone_Barista',
  'Zone_CustomerService',
  'Zone_Dining',
  'Zone_Storage',
  'Zone_Entrance',
];

/**
 * Traverses and semantically classifies all nodes in the loaded glTF scene.
 * @param {import('three').Object3D} scene
 * @returns {{
 *   modelRoot: import('three').Object3D,
 *   workstationsMap: Map<string, import('three').Object3D>,
 *   zonesMap: Map<string, import('three').Object3D>,
 *   columns: import('three').Object3D[],
 *   wallMeshes: import('three').Mesh[]
 * }}
 */
export function classifyModelHierarchy(scene) {
  const modelRoot = scene.getObjectByName('ShiftSync_Store_DigitalTwin') || scene;
  const workstationsMap = new Map();
  const zonesMap = new Map();
  const columns = [];
  const wallMeshes = [];

  modelRoot.traverse((child) => {
    const name = child.name || '';

    // 1. Workstations
    if (name.startsWith('Workstation_')) {
      child.userData = child.userData || {};
      child.userData.layer = 'workstations';
      child.userData.isWorkstation = true;
      child.userData.isGlbWorkstation = true;
      child.userData.nodeName = name;
      workstationsMap.set(name, child);
    }

    // 2. Spatial Zones
    else if (name.startsWith('Zone_') && !name.endsWith('_Floor')) {
      child.userData = child.userData || {};
      child.userData.layer = 'zones';
      child.userData.isZone = true;
      child.userData.nodeName = name;
      zonesMap.set(name, child);
    }

    // 3. Floors
    else if (
      name.includes('Floor') ||
      name.includes('Entrance_Mat') ||
      name.includes('Brass_Trim')
    ) {
      child.userData = child.userData || {};
      child.userData.layer = 'floor';
      if (child.isMesh) {
        child.receiveShadow = true;
      }
    }

    // 4. Perimeter & Interior Walls
    else if (
      name.startsWith('Store_Wall_') ||
      name.startsWith('Window_') ||
      name.startsWith('Entrance_Double_Doors') ||
      name.startsWith('Partition_Storage_') ||
      name.startsWith('Door_Storage') ||
      name.startsWith('Backdrop_') ||
      (child.isMesh && child.parent?.userData.isWall)
    ) {
      child.userData = child.userData || {};
      child.userData.layer = 'walls';
      child.userData.isWall = true;
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        if (child.material) {
          child.userData.originalMat = child.material;
        }
        wallMeshes.push(child);
      }
    }

    // 5. Structural Columns
    else if (name.startsWith('Store_Column_') || name.startsWith('Column_')) {
      child.userData = child.userData || {};
      child.userData.layer = 'furniture';
      child.userData.isObstacle = true;
      child.userData.isColumn = true;
      columns.push(child);
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    }

    // 6. Ceiling & Lighting Beams
    else if (
      name.startsWith('Ceiling_Beam_') ||
      name.startsWith('Track_Spotlight_')
    ) {
      child.userData = child.userData || {};
      child.userData.layer = 'ceiling';
      if (child.isMesh) {
        child.castShadow = true;
      }
    }

    // 7. Dining & Storage Furniture, Decor, Props
    else if (
      name.startsWith('Furniture_') ||
      name.startsWith('Prop_') ||
      name.startsWith('Plant_') ||
      name.startsWith('Decor_') ||
      name.startsWith('Lighting_Pendant_')
    ) {
      child.userData = child.userData || {};
      child.userData.layer = 'furniture';
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    }
  });

  // Consumers toggle semantic groups through this shared index.
  const layers = { floor: [], walls: [], ceiling: [], furniture: [], workstations: [], zones: [] };
  modelRoot.traverse(node => {
    if (layers[node.userData?.layer]) layers[node.userData.layer].push(node);
  });
  return {
    modelRoot,
    layers,
    workstationsMap,
    zonesMap,
    columns,
    wallMeshes,
  };
}

/**
 * Loads and processes the Digital Twin GLB model asynchronously.
 * Supports web URL loading or direct ArrayBuffer parsing (for headless tests).
 * 
 * @param {Object} options
 * @param {string} [options.url=DEFAULT_DIGITAL_TWIN_GLB_URL]
 * @param {ArrayBuffer} [options.arrayBuffer]
 * @param {GLTFLoader} [options.loader]
 * @param {Function} [options.onProgress]
 * @returns {Promise<{
 *   gltf: Object,
 *   scene: import('three').Group,
 *   modelRoot: import('three').Object3D,
 *   workstationsMap: Map<string, import('three').Object3D>,
 *   zonesMap: Map<string, import('three').Object3D>,
 *   columns: import('three').Object3D[],
 *   wallMeshes: import('three').Mesh[],
 *   isGlb: boolean
 * }>}
 */
export function loadDigitalTwinModel({
  url = DEFAULT_DIGITAL_TWIN_GLB_URL,
  arrayBuffer = null,
  layout = { length: 24, width: 16, height: 6 },
  loader = null,
  onProgress = null,
} = {}) {
  return new Promise((resolve, reject) => {
    const gltfLoader = loader || new GLTFLoader();

    const handleSuccess = (gltf) => {
      try {
        const classified = classifyModelHierarchy(gltf.scene);
        enhanceDigitalTwinModelMaterials(classified.modelRoot, layout);
        resolve({
          gltf,
          scene: gltf.scene,
          ...classified,
          isGlb: true,
        });
      } catch (err) {
        reject(err);
      }
    };

    // 1. ArrayBuffer provided directly
    if (arrayBuffer) {
      gltfLoader.parse(arrayBuffer, '', handleSuccess, reject);
      return;
    }

    // 2. Browser standard URL fetch
    if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
      gltfLoader.load(url, handleSuccess, onProgress, reject);
      return;
    }

    // 3. Headless Node.js test environment fallback: attempt to read file from filesystem if available
    if (
      typeof process !== 'undefined' &&
      process.versions?.node &&
      typeof window === 'undefined'
    ) {
      try {
        const nodeRequire =
          globalThis.require ||
          (typeof module !== 'undefined' && module.require ? module.require.bind(module) : null);

        if (nodeRequire) {
          const fs = nodeRequire('fs');
          const path = nodeRequire('path');

          if (fs && path) {
            // Resolve relative to project root or web folder
            const candidatePaths = [
              path.resolve(process.cwd(), 'public' + url),
              path.resolve(process.cwd(), 'ShiftSync-Web/public' + url),
              path.resolve(process.cwd(), '../ShiftSync-Web/public' + url),
              path.resolve(process.cwd(), 'ShiftSync_CoffeeShop_DigitalTwin.glb'),
              path.resolve(process.cwd(), '../ShiftSync_CoffeeShop_DigitalTwin.glb'),
            ];

            for (const p of candidatePaths) {
              if (fs.existsSync(p)) {
                const fileBuf = fs.readFileSync(p);
                const ab = fileBuf.buffer.slice(
                  fileBuf.byteOffset,
                  fileBuf.byteOffset + fileBuf.byteLength
                );
                gltfLoader.parse(ab, '', handleSuccess, reject);
                return;
              }
            }
          }
        }
      } catch (err) {
        // Fall through to loader.load
      }
    }

    // Default fallback to standard loader.load
    gltfLoader.load(url, handleSuccess, onProgress, reject);
  });
}

/**
 * Maps backend workstations from the store database to 3D workstation nodes in the GLB model.
 * 
 * @param {Array<Object>} effectiveWorkstations - Workstations from backend API
 * @param {Map<string, import('three').Object3D>} workstationsMap - GLB Workstations Map
 * @param {Object} layout - Store layout dimensions { length, width, height }
 * @param {Function} toThreeCoordsFn - Coordinate converter
 * @returns {{
 *   mappedMeshes: Array<{ ws: Object, mesh: import('three').Object3D, glbKey: string }>,
 *   unmappedWorkstations: Array<Object>
 * }}
 */
export function mapWorkstationsToGlb(
  effectiveWorkstations = [],
  workstationsMap = new Map(),
  layout = { length: 24, width: 16 },
  toThreeCoordsFn = toThreeCoords
) {
  const mappedMeshes = [];
  const unmappedWorkstations = [];
  const usedGlbKeys = new Set();

  // Clear operational bindings; StoreArrangement preserves physical coffee counters.
  workstationsMap.forEach(node => {
    node.visible = false;
    node.traverse(child => { delete child.userData.workstation; delete child.userData.workstationId; });
  });
  if (!Array.isArray(effectiveWorkstations) || effectiveWorkstations.length === 0) {
    return { mappedMeshes, unmappedWorkstations };
  }

  // Helper to test if a key is available in GLB
  const isAvailable = (key) => workstationsMap.has(key) && !usedGlbKeys.has(key);

  effectiveWorkstations.forEach((ws) => {
    const type = (ws.workstationType || ws.type || '').toUpperCase();
    const code = (ws.code || '').toUpperCase();
    const name = (ws.name || '').toLowerCase();

    let matchedKey = null;

    // 1. Semantic Match by workstation type, code, or name
    if (
      type === 'POS' || type === 'CASHIER_STATION' ||
      code.includes('POS') ||
      name.includes('pos') ||
      name.includes('thu ngân') ||
      name.includes('cashier')
    ) {
      if (isAvailable('Workstation_POS_01')) matchedKey = 'Workstation_POS_01';
    } else if (
      type === 'BARISTA' || type === 'BARISTA_BAR' ||
      code.includes('ESP') ||
      code.includes('BARISTA') ||
      name.includes('barista') ||
      name.includes('pha chế') ||
      name.includes('espresso')
    ) {
      if (isAvailable('Workstation_Barista_01')) matchedKey = 'Workstation_Barista_01';
    } else if (
      type === 'SERVICE' ||
      type === 'CHECKOUT' ||
      code.includes('SERVICE') ||
      name.includes('service') ||
      name.includes('phục vụ') ||
      name.includes('trả món')
    ) {
      if (isAvailable('Workstation_Service_01')) matchedKey = 'Workstation_Service_01';
    } else if (
      type === 'KITCHEN' ||
      type === 'BAKERY' ||
      code.includes('KIT') ||
      code.includes('BAK') ||
      name.includes('bếp') ||
      name.includes('bánh') ||
      name.includes('kitchen') ||
      name.includes('pastry')
    ) {
      if (isAvailable('Workstation_Kitchen_01')) matchedKey = 'Workstation_Kitchen_01';
    }

    // 2. Fallback to any remaining unused GLB workstation node
    if (!matchedKey) {
      for (const candidate of GLB_WORKSTATION_KEYS) {
        if (isAvailable(candidate)) {
          matchedKey = candidate;
          break;
        }
      }
    }

    if (matchedKey) {
      usedGlbKeys.add(matchedKey);
      const wsNode = workstationsMap.get(matchedKey);
      wsNode.visible = true;

      // Attach authoritative backend workstation metadata
      wsNode.userData = wsNode.userData || {};
      wsNode.userData.isWorkstation = true;
      wsNode.userData.isGlbWorkstation = true;
      wsNode.userData.workstation = ws;
      wsNode.userData.workstationId = ws.id;

      // Also tag all child meshes so raycaster traverses up accurately
      wsNode.traverse((child) => {
        child.userData = child.userData || {};
        child.userData.isWorkstation = child === wsNode;
        child.userData.workstation = ws;
        child.userData.workstationId = ws.id;
      });

      // Synchronize position if custom coordinates exist in backend
      if (ws.x !== undefined && ws.x !== null && typeof toThreeCoordsFn === 'function') {
        const [wx, , wz] = toThreeCoordsFn(ws.x, ws.y || 0, ws.z, layout);
        wsNode.position.x = wx;
        wsNode.position.z = wz;
      }

      // Synchronize rotation if specified
      if (typeof ws.rotation === 'number') {
        wsNode.rotation.y = ws.rotation;
      }

      mappedMeshes.push({
        ws,
        mesh: wsNode,
        glbKey: matchedKey,
      });
    } else {
      unmappedWorkstations.push(ws);
    }
  });

  return { mappedMeshes, unmappedWorkstations };
}

/**
 * Extracts AABB obstacle bounding boxes from the GLB scene for PlayerController navigation.
 * 
 * @param {import('three').Object3D} modelRoot
 * @param {Object} [layout]
 * @returns {Array<{ minX: number, maxX: number, minZ: number, maxZ: number, name: string, type: string, id?: string }>}
 */
export function extractGlbObstacles(modelRoot, layout = null, additionalWorkstationMeshes = []) {
  if (!modelRoot) return [];
  const obstacles = [];
  const visible = node => { for(let n=node;n;n=n.parent) if(n.visible===false)return false;return true; };
  const add = (node,type) => {
    if(!node||!visible(node))return;
    const box=geometryFootprint(node);
    if(box.maxX<=box.minX||box.maxZ<=box.minZ)return;
    obstacles.push({...box,name:node.userData.workstation?.name||node.name,type,id:node.userData.workstationId||node.name});
  };
  if (modelRoot.userData.customDesign) {
    modelRoot.traverse(node => {
      if (!node.userData.designItemId || node.userData.designAsset === 'group') return;
      // A door opening is navigable; its overhead lintel is above the avatar.
      if (node.userData.designAsset === 'door') node.traverse(post => { if(post.userData.isDoorPost)add(post,'wall'); });
      else add(node, node.userData.isWall ? 'wall' : node.userData.workstationId ? 'workstation' : 'furniture');
    });
    return obstacles;
  }
  modelRoot.traverse(node=>{
    if(node.userData.isColumn)add(node,'column');
    else if(GLB_WORKSTATION_KEYS.includes(node.name))add(node,'workstation');
    else if(node.name.startsWith('Partition_Storage_')||node.name.startsWith('Store_Wall_')){
      // V2 bakes several material meshes into each semantic wall group.
      // Only its outer group is a blocker; nested meshes must not duplicate it.
      let nested=false;
      for(let parent=node.parent;parent&&parent!==modelRoot;parent=parent.parent){
        if(parent.name.startsWith('Partition_Storage_')||parent.name.startsWith('Store_Wall_')){nested=true;break;}
      }
      if(!nested)add(node,'wall');
    }
  });
  const customer=modelRoot.getObjectByName('Customer_Furniture');
  customer?.children.forEach(group=>{
    if(['Dining_Booths_Cluster','Bistro_Tables_And_Chairs'].includes(group.name))group.children.forEach(item=>add(item,'furniture'));
    else add(group,'furniture');
  });
  additionalWorkstationMeshes.forEach(mesh=>{
    const id=mesh.userData.workstationId||mesh.name;
    if(!obstacles.some(obstacle=>obstacle.id===id))add(mesh,'workstation');
  });
  return obstacles;
}
