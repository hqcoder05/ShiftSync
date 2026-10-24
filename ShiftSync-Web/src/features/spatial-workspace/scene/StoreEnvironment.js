/**
 * StoreEnvironment.js
 * Enhanced architectural diorama environment with layered depth,
 * selective X-Ray visualization mode, multi-layer tagging, and flow routes.
 */

import * as THREE from 'three';
import { buildIndoorPlant, materials } from './FurnitureBuilder.js';

// Reusable X-Ray Material for selective ghosting of exterior & interior walls
const xrayWallMaterial = new THREE.MeshStandardMaterial({
  color: 0x38BDF8,
  transparent: true,
  opacity: 0.18,
  roughness: 0.1,
  depthWrite: false,
  side: THREE.DoubleSide,
});

/**
 * Procedural canvas tile texture generator for realistic store flooring
 */
export function createStoreTileTexture() {
  if (typeof document === 'undefined') return null;
  try {
    const canvas = document.createElement('canvas');
    if (!canvas || !canvas.getContext) return null;
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Base ceramic warm tile tone
    ctx.fillStyle = '#F4EDE4';
    ctx.fillRect(0, 0, 512, 512);

    // Grout lines
    ctx.strokeStyle = '#D1C2B0';
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, 506, 506);

    // Subtle inner bevel
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 3;
    ctx.strokeRect(6, 6, 500, 500);

    // Fine terrazzo speckles
    ctx.fillStyle = 'rgba(168, 145, 126, 0.14)';
    for (let i = 0; i < 400; i++) {
      const rx = (i * 37) % 512;
      const ry = (i * 73) % 512;
      const size = (i % 3) + 1;
      ctx.fillRect(rx, ry, size, size);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  } catch {
    return null;
  }
}

export function buildStoreEnvironment(layout = { length: 24, width: 16, height: 6 }, showWalls = true) {
  const group = new THREE.Group();
  group.name = 'storeEnvironment';

  const len = Number(layout?.length) || 24.0;
  const wid = Number(layout?.width) || 16.0;
  const h = Number(layout?.height) || 5.5;

  // ── 1. FLOOR LAYER (Zoned Flooring) ──
  const floorGroup = new THREE.Group();
  floorGroup.name = 'layer_floor';
  floorGroup.userData = { layer: 'floor' };

  // 1.1 Main Circulation Floor (Ceramic / Terrazzo Tile)
  const tileTexture = createStoreTileTexture();
  if (tileTexture) {
    tileTexture.repeat.set(len / 1.5, wid / 1.5);
  }

  const mainFloorGeo = new THREE.PlaneGeometry(len, wid);
  const mainFloorMat = new THREE.MeshStandardMaterial({
    color: 0xF8F4EE,
    map: tileTexture || null,
    roughness: 0.78,
    metalness: 0.05,
  });
  const mainFloor = new THREE.Mesh(mainFloorGeo, mainFloorMat);
  mainFloor.rotation.x = -Math.PI / 2;
  mainFloor.receiveShadow = true;
  floorGroup.add(mainFloor);

  // 1.2 Dining Inset Floor (Oak Parquet herringbone feel)
  const diningFloorGeo = new THREE.PlaneGeometry(len * 0.42, wid * 0.44);
  const diningFloor = new THREE.Mesh(diningFloorGeo, materials.oakParquet);
  diningFloor.rotation.x = -Math.PI / 2;
  diningFloor.position.set(len * 0.22, 0.004, wid * 0.2);
  diningFloor.receiveShadow = true;
  floorGroup.add(diningFloor);

  // Floor Brass Divider Trim around dining floor
  const trimMat = new THREE.MeshStandardMaterial({ color: 0xD97706, roughness: 0.3, metalness: 0.8 });
  const trimGeo = new THREE.BoxGeometry(len * 0.42 + 0.04, 0.008, wid * 0.44 + 0.04);
  const trim = new THREE.Mesh(trimGeo, trimMat);
  trim.position.set(len * 0.22, 0.004, wid * 0.2);
  floorGroup.add(trim);

  // Subtle Floor Grid
  const grid = new THREE.GridHelper(Math.max(len, wid), Math.round(Math.max(len, wid)), 0xCBD5E1, 0xEDE8E3);
  grid.position.y = 0.007;
  grid.name = 'floorGrid';
  floorGroup.add(grid);

  // Entrance Welcome Mat
  const matMat = new THREE.MeshStandardMaterial({ color: 0x881337, roughness: 0.9 });
  const mat = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.02, 1.4), matMat);
  mat.position.set(0, 0.015, wid / 2 - 1.1);
  mat.receiveShadow = true;
  floorGroup.add(mat);

  group.add(floorGroup);

  // ── 2. WALLS LAYER (Perimeter, Rear Windows & Cutaways) ──
  const wallsGroup = new THREE.Group();
  wallsGroup.name = 'layer_walls';
  wallsGroup.userData = { layer: 'walls' };

  const wallThick = 0.18;
  const moldingMat = new THREE.MeshStandardMaterial({ color: 0x4E342E, roughness: 0.7 });
  const rearWallMat = new THREE.MeshStandardMaterial({ color: 0xF8FAFC, roughness: 0.85 });
  const frontWallMat = new THREE.MeshStandardMaterial({ color: 0xE2E8F0, roughness: 0.8 });

  // Baseboards
  const moldingH = 0.18;
  [
    { size: [len, moldingH, wallThick], pos: [0, moldingH / 2, -wid / 2 + wallThick / 2] },
    { size: [wallThick, moldingH, wid], pos: [len / 2 - wallThick / 2, moldingH / 2, 0] },
    { size: [len, moldingH, wallThick], pos: [0, moldingH / 2, wid / 2 - wallThick / 2] },
    { size: [wallThick, moldingH, wid], pos: [-len / 2 + wallThick / 2, moldingH / 2, 0] },
  ].forEach((cfg) => {
    const mold = new THREE.Mesh(new THREE.BoxGeometry(...cfg.size), moldingMat);
    mold.position.set(...cfg.pos);
    wallsGroup.add(mold);
  });

  if (showWalls) {
    // North Wall sections (Rear)
    const nWallLeft = new THREE.Mesh(new THREE.BoxGeometry(len * 0.28, h * 0.65, wallThick), rearWallMat);
    nWallLeft.position.set(-len * 0.36, (h * 0.65) / 2, -wid / 2 - wallThick / 2);
    nWallLeft.receiveShadow = true;
    nWallLeft.userData = { isWall: true, originalMat: rearWallMat };
    wallsGroup.add(nWallLeft);

    const nWallCenter = new THREE.Mesh(new THREE.BoxGeometry(len * 0.30, h * 0.65, wallThick), rearWallMat);
    nWallCenter.position.set(0, (h * 0.65) / 2, -wid / 2 - wallThick / 2);
    nWallCenter.receiveShadow = true;
    nWallCenter.userData = { isWall: true, originalMat: rearWallMat };
    wallsGroup.add(nWallCenter);

    const nWallRight = new THREE.Mesh(new THREE.BoxGeometry(len * 0.28, h * 0.65, wallThick), rearWallMat);
    nWallRight.position.set(len * 0.36, (h * 0.65) / 2, -wid / 2 - wallThick / 2);
    nWallRight.receiveShadow = true;
    nWallRight.userData = { isWall: true, originalMat: rearWallMat };
    wallsGroup.add(nWallRight);

    // Window Glass in cutouts
    const windowMat = new THREE.MeshStandardMaterial({
      color: 0xBAE6FD,
      transparent: true,
      opacity: 0.35,
      roughness: 0.1,
    });
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x1E293B, roughness: 0.4 });

    [-len * 0.18, len * 0.18].forEach((wx) => {
      const glass = new THREE.Mesh(new THREE.BoxGeometry(len * 0.16, h * 0.55, 0.04), windowMat);
      glass.position.set(wx, (h * 0.55) / 2 + 0.3, -wid / 2 - wallThick / 2);
      wallsGroup.add(glass);

      const frame = new THREE.Mesh(new THREE.BoxGeometry(len * 0.165, h * 0.56, 0.06), frameMat);
      frame.position.set(wx, (h * 0.55) / 2 + 0.3, -wid / 2 - wallThick / 2);
      wallsGroup.add(frame);
    });

    // Background Sky & Trees beyond windows
    const skyGeo = new THREE.PlaneGeometry(len * 1.5, h * 1.8);
    const skyMat = new THREE.MeshBasicMaterial({ color: 0xE0F2FE });
    const sky = new THREE.Mesh(skyGeo, skyMat);
    sky.position.set(0, h * 0.9, -wid / 2 - 3.5);
    sky.userData = { isBackdrop: true };
    wallsGroup.add(sky);

    [-len * 0.28, -len * 0.12, len * 0.14, len * 0.32].forEach((tx, idx) => {
      const tree = new THREE.Group();
      tree.position.set(tx, 0, -wid / 2 - 2.8);
      tree.userData = { isBackdrop: true };

      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 2.5, 8), materials.darkWood);
      trunk.position.y = 1.25;
      tree.add(trunk);

      const foliage = new THREE.Mesh(new THREE.SphereGeometry(0.85 + (idx % 2) * 0.3, 8, 8), materials.plantLeaf);
      foliage.position.y = 2.8;
      tree.add(foliage);

      wallsGroup.add(tree);
    });

    // East Solid Wall
    const eastWall = new THREE.Mesh(new THREE.BoxGeometry(wallThick, h * 0.65, wid), rearWallMat);
    eastWall.position.set(len / 2 + wallThick / 2, (h * 0.65) / 2, 0);
    eastWall.receiveShadow = true;
    eastWall.userData = { isWall: true, originalMat: rearWallMat };
    wallsGroup.add(eastWall);

    // South & West Low Cutaway Diorama Walls (H = 0.55m)
    const southWall = new THREE.Mesh(new THREE.BoxGeometry(len, 0.55, wallThick), frontWallMat);
    southWall.position.set(0, 0.275, wid / 2 + wallThick / 2);
    southWall.receiveShadow = true;
    southWall.userData = { isWall: true, originalMat: frontWallMat };
    wallsGroup.add(southWall);

    const westWall = new THREE.Mesh(new THREE.BoxGeometry(wallThick, 0.55, wid), frontWallMat);
    westWall.position.set(-len / 2 - wallThick / 2, 0.275, 0);
    westWall.receiveShadow = true;
    westWall.userData = { isWall: true, originalMat: frontWallMat };
    wallsGroup.add(westWall);

    // Glass Entrance Double Doors (Center South Entrance)
    const doorGroup = new THREE.Group();
    doorGroup.name = 'entranceDoubleDoors';
    doorGroup.position.set(0, 0, wid / 2);
    doorGroup.userData = { isDoor: true, layer: 'walls' };

    const doorGlassMat = new THREE.MeshStandardMaterial({
      color: 0xBAE6FD,
      transparent: true,
      opacity: 0.38,
      roughness: 0.08,
      metalness: 0.1,
    });
    const doorFrameMat = new THREE.MeshStandardMaterial({
      color: 0x1E293B,
      metalness: 0.8,
      roughness: 0.3,
    });
    const doorHandleMat = new THREE.MeshStandardMaterial({
      color: 0xE2E8F0,
      metalness: 0.9,
      roughness: 0.15,
    });

    const doorW = 1.2;
    const doorH = 2.4;
    [-doorW / 2 - 0.02, doorW / 2 + 0.02].forEach((dx, dIdx) => {
      // Glass leaf
      const leaf = new THREE.Mesh(new THREE.BoxGeometry(doorW, doorH, 0.04), doorGlassMat);
      leaf.position.set(dx, doorH / 2, 0);
      doorGroup.add(leaf);

      // Frame border
      const frameTop = new THREE.Mesh(new THREE.BoxGeometry(doorW + 0.04, 0.05, 0.06), doorFrameMat);
      frameTop.position.set(dx, doorH + 0.02, 0);
      doorGroup.add(frameTop);

      const frameSide = new THREE.Mesh(new THREE.BoxGeometry(0.05, doorH, 0.06), doorFrameMat);
      frameSide.position.set(dIdx === 0 ? dx - doorW / 2 : dx + doorW / 2, doorH / 2, 0);
      doorGroup.add(frameSide);

      // Vertical stainless handle
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.95, 12), doorHandleMat);
      const hx = dIdx === 0 ? dx + doorW * 0.38 : dx - doorW * 0.38;
      handle.position.set(hx, 1.1, 0.05);
      doorGroup.add(handle);
    });

    wallsGroup.add(doorGroup);
  }

  group.add(wallsGroup);

  // ── 3. CEILING LAYER (Beams & Track Spotlights) ──
  const ceilingGroup = new THREE.Group();
  ceilingGroup.name = 'layer_ceiling';
  ceilingGroup.userData = { layer: 'ceiling' };

  const beamMat = new THREE.MeshStandardMaterial({ color: 0x1E293B, roughness: 0.5 });
  [-wid * 0.25, wid * 0.25].forEach((bz) => {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(len * 0.95, 0.12, 0.12), beamMat);
    beam.position.set(0, 3.8, bz);
    beam.castShadow = true;
    ceilingGroup.add(beam);

    [-len * 0.3, -len * 0.1, len * 0.1, len * 0.3].forEach((sx) => {
      const spot = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 0.16, 10), beamMat);
      spot.rotation.x = 0.35;
      spot.position.set(sx, 3.7, bz);
      ceilingGroup.add(spot);
    });
  });

  group.add(ceilingGroup);

  // ── 4. FURNITURE & ARCHITECTURAL ELEMENTS (Stairs, Plants, Storage) ──
  const furnitureGroup = new THREE.Group();
  furnitureGroup.name = 'layer_furniture';
  furnitureGroup.userData = { layer: 'furniture' };

  // Stairs to Mezzanine
  const stairGroup = new THREE.Group();
  stairGroup.position.set(len * 0.24, 0, -wid * 0.26);
  const stepCount = 14;
  const stairTotalH = 3.5;
  const stepH = stairTotalH / stepCount;
  const stepD = 0.28;
  const stepW = 1.2;

  for (let i = 0; i < stepCount; i++) {
    const step = new THREE.Mesh(new THREE.BoxGeometry(stepW, stepH, stepD), materials.warmWood);
    step.position.set(0, i * stepH + stepH / 2, i * stepD);
    step.castShadow = true;
    step.receiveShadow = true;
    stairGroup.add(step);
  }

  const railPostGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.9, 6);
  [0, 4, 8, 12].forEach((idx) => {
    const post = new THREE.Mesh(railPostGeo, materials.darkMetal);
    post.position.set(stepW / 2, idx * stepH + 0.45, idx * stepD);
    post.castShadow = true;
    stairGroup.add(post);
  });
  furnitureGroup.add(stairGroup);

  // Corner Plants
  const plant1 = buildIndoorPlant();
  plant1.position.set(-len / 2 + 1.4, 0, -wid / 2 + 1.4);
  furnitureGroup.add(plant1);

  const plant2 = buildIndoorPlant();
  plant2.position.set(len / 2 - 1.4, 0, wid / 2 - 1.4);
  furnitureGroup.add(plant2);

  // Backstage Storage Shelving Rack (Deep spatial detail)
  const storageRack = new THREE.Group();
  storageRack.position.set(-len * 0.42, 0, -wid * 0.38);
  const rackFrameMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.6 });
  const shelfMat = new THREE.MeshStandardMaterial({ color: 0x78350F, roughness: 0.7 });

  [0.4, 1.0, 1.6].forEach((sy) => {
    const s = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.04, 0.6), shelfMat);
    s.position.y = sy;
    storageRack.add(s);

    // Coffee Bean Sacks & Boxes on shelves
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.28, 0.4), materials.warmWood);
    box.position.set(-0.45, sy + 0.16, 0);
    storageRack.add(box);

    const sack = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), materials.chairFabric);
    sack.scale.set(1.1, 1.4, 0.9);
    sack.position.set(0.35, sy + 0.16, 0);
    storageRack.add(sack);
  });

  furnitureGroup.add(storageRack);

  // Interior Structural Columns (Architectural Load-bearing Pillars)
  const colSize = 0.65;
  const colH = h * 0.65;
  const colMat = materials.warmWood;
  const colTrimMat = new THREE.MeshStandardMaterial({ color: 0x1E293B, roughness: 0.6 });

  [-len * 0.16, len * 0.16].forEach((cx, cIdx) => {
    const colGroup = new THREE.Group();
    colGroup.name = `column_${cIdx + 1}`;
    colGroup.position.set(cx, 0, -wid * 0.08);
    colGroup.userData = { isObstacle: true, isColumn: true };

    // Column Shaft
    const shaft = new THREE.Mesh(new THREE.BoxGeometry(colSize, colH, colSize), colMat);
    shaft.position.y = colH / 2;
    shaft.castShadow = true;
    shaft.receiveShadow = true;
    colGroup.add(shaft);

    // Baseboard Collar
    const baseCollar = new THREE.Mesh(new THREE.BoxGeometry(colSize + 0.08, 0.22, colSize + 0.08), colTrimMat);
    baseCollar.position.y = 0.11;
    colGroup.add(baseCollar);

    // Capital Collar
    const topCollar = new THREE.Mesh(new THREE.BoxGeometry(colSize + 0.08, 0.14, colSize + 0.08), colTrimMat);
    topCollar.position.y = colH - 0.07;
    colGroup.add(topCollar);

    furnitureGroup.add(colGroup);
  });

  group.add(furnitureGroup);

  // ── 5. FLOW LAYER (Service Wayfinding & Customer Circulation Arrows) ──
  const flowGroup = new THREE.Group();
  flowGroup.name = 'layer_flow';
  flowGroup.userData = { layer: 'flow' };

  // Subtle directional arrows on floor from entrance towards counters
  const arrowMat = new THREE.MeshBasicMaterial({
    color: 0x38BDF8,
    transparent: true,
    opacity: 0.45,
  });

  const pathPoints = [
    [0, wid * 0.28], // Entrance
    [-len * 0.10, wid * 0.10], // Towards POS
    [-len * 0.22, 0], // Towards Barista
    [len * 0.10, wid * 0.05], // Towards Dining
  ];

  for (let i = 0; i < pathPoints.length - 1; i++) {
    const [p1x, p1z] = pathPoints[i];
    const [p2x, p2z] = pathPoints[i + 1];
    const dist = Math.hypot(p2x - p1x, p2z - p1z);
    const angle = Math.atan2(p2x - p1x, p2z - p1z);

    const arrowMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.16, dist * 0.7), arrowMat);
    arrowMesh.rotation.x = -Math.PI / 2;
    arrowMesh.rotation.z = angle;
    arrowMesh.position.set((p1x + p2x) / 2, 0.012, (p1z + p2z) / 2);
    flowGroup.add(arrowMesh);
  }

  group.add(flowGroup);

  return group;
}

/**
 * Toggles selective X-Ray mode on store walls
 */
export function setEnvironmentXRayMode(envGroup, isXRay = false) {
  if (!envGroup) return;
  envGroup.traverse((child) => {
    if (child.userData?.isWall) {
      if (isXRay) {
        child.material = xrayWallMaterial;
      } else if (child.userData.originalMat) {
        child.material = child.userData.originalMat;
      }
    }
    if (child.userData?.isBackdrop) {
      child.visible = !isXRay;
    }
  });
}

/**
 * Toggles visibility of specific scene layers
 */
export function setEnvironmentLayersVisibility(envGroup, {
  showFloor = true,
  showWalls = true,
  showCeiling = true,
  showFurniture = true,
  showFlow = true,
  showWorkstations = true,
  showZones = true,
}) {
  if (!envGroup) return;
  envGroup.traverse((child) => {
    const layer = child.userData?.layer;
    if (layer === 'floor') child.visible = showFloor;
    else if (layer === 'walls') child.visible = showWalls;
    else if (layer === 'ceiling') child.visible = showCeiling;
    else if (layer === 'furniture') child.visible = showFurniture;
    else if (layer === 'flow') child.visible = showFlow;
    else if (layer === 'workstations') child.visible = showWorkstations;
    else if (layer === 'zones') child.visible = showZones;
  });
}
