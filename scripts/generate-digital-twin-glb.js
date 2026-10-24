/**
 * generate-digital-twin-glb.js
 * Generates a complete, standalone, production-quality 3D retail coffee shop Digital Twin
 * environment as a glTF 2.0 binary (.glb) asset for ShiftSync Workforce Management.
 * 
 * UPGRADED: Full Visual Style Unification to match ShiftSync_Workstation.glb:
 * - Precision Hard-Surface Chamfers & Bevels on countertops, tables, screens, equipment
 * - PBR Metallic-Roughness Materials matching the reference Scandinavian Oak & Matte Steel palette
 * - Commercial Food & Beverage equipment (2-group espresso machine, grinders, pour-over bar, pastry case)
 * - Complete customer seating (booths, bistro chairs, communal table, swivel bar stools, lounge armchairs)
 * - Industrial storage racks, coffee origin sacks, and architectural planters
 * - Preserves exact semantic node names, layers, and bounding box for zero-regression Digital Twin operation
 */

// ── 1. Node.js Polyfill for GLTFExporter ───────────────────────────────────────────
class FileReaderPolyfill {
  constructor() {
    this.result = null;
    this.onloadend = null;
  }
  async readAsArrayBuffer(blob) {
    const buf = await blob.arrayBuffer();
    this.result = buf;
    if (this.onloadend) this.onloadend();
  }
  async readAsDataURL(blob) {
    const buf = Buffer.from(await blob.arrayBuffer());
    this.result = 'data:' + (blob.type || 'application/octet-stream') + ';base64,' + buf.toString('base64');
    if (this.onloadend) this.onloadend();
  }
}
globalThis.FileReader = FileReaderPolyfill;

const path = require('path');
const fs = require('fs');

let THREE, GLTFExporter;
try {
  THREE = require('three');
  GLTFExporter = require('three/examples/jsm/exporters/GLTFExporter.js').GLTFExporter;
} catch {
  const webThreePath = path.resolve(__dirname, '../ShiftSync-Web/node_modules/three');
  THREE = require(webThreePath);
  GLTFExporter = require(path.resolve(webThreePath, 'examples/jsm/exporters/GLTFExporter.js')).GLTFExporter;
}

console.log('🚀 Starting ShiftSync 3D Digital Twin GLB Generation (Style-Unified Architecture)...');

// ── 2. Materials Library (PBR Metal/Roughness matched to Reference Desk) ───────────
const materials = {
  // Architectural Surfaces
  terrazzoFloor: new THREE.MeshStandardMaterial({
    name: 'mat_terrazzo_floor',
    color: 0xF5EBE0,
    roughness: 0.65,
    metalness: 0.04,
  }),
  oakParquetFloor: new THREE.MeshStandardMaterial({
    name: 'mat_oak_parquet_floor',
    color: 0xC89D6C,
    roughness: 0.58,
    metalness: 0.02,
  }),
  slateTileFloor: new THREE.MeshStandardMaterial({
    name: 'mat_slate_tile_floor',
    color: 0x334155,
    roughness: 0.68,
    metalness: 0.06,
  }),
  concreteFloor: new THREE.MeshStandardMaterial({
    name: 'mat_concrete_floor',
    color: 0x475569,
    roughness: 0.85,
    metalness: 0.02,
  }),
  brassTrim: new THREE.MeshStandardMaterial({
    name: 'mat_brass_trim',
    color: 0xD97706,
    roughness: 0.24,
    metalness: 0.90,
  }),
  entranceMat: new THREE.MeshStandardMaterial({
    name: 'mat_entrance_mat',
    color: 0x7C2D12,
    roughness: 0.92,
    metalness: 0.01,
  }),

  // Walls & Structure
  wallPlaster: new THREE.MeshStandardMaterial({
    name: 'mat_wall_plaster',
    color: 0xF8FAFC,
    roughness: 0.85,
    metalness: 0.02,
  }),
  wallFeatureWood: new THREE.MeshStandardMaterial({
    name: 'mat_wall_feature_wood',
    color: 0x9A6535,
    roughness: 0.55,
    metalness: 0.02,
  }),
  baseboardMolding: new THREE.MeshStandardMaterial({
    name: 'mat_baseboard_molding',
    color: 0x1E293B,
    roughness: 0.65,
    metalness: 0.20,
  }),
  steelBeam: new THREE.MeshStandardMaterial({
    name: 'mat_steel_beam',
    color: 0x0F172A,
    roughness: 0.45,
    metalness: 0.75,
  }),

  // Furniture Woods & Metals (Exact Palette Match to Reference Workstation)
  naturalOak: new THREE.MeshStandardMaterial({
    name: 'mat_natural_oak',
    color: 0xBA7A3E, // Matching Reference Workstation Desk Tabletop
    roughness: 0.44,
    metalness: 0.02,
  }),
  darkWalnut: new THREE.MeshStandardMaterial({
    name: 'mat_dark_walnut',
    color: 0x5A3825,
    roughness: 0.50,
    metalness: 0.02,
  }),
  whiteQuartz: new THREE.MeshStandardMaterial({
    name: 'mat_white_quartz',
    color: 0xFAF7F2,
    roughness: 0.25,
    metalness: 0.05,
  }),
  powderMetalDark: new THREE.MeshStandardMaterial({
    name: 'mat_powder_metal_dark',
    color: 0x0F172A, // Matching Reference Workstation Steel Legs
    roughness: 0.32,
    metalness: 0.80,
  }),
  stainlessSteel: new THREE.MeshStandardMaterial({
    name: 'mat_stainless_steel',
    color: 0xE2E8F0,
    roughness: 0.18,
    metalness: 0.92,
  }),
  chromeEquipment: new THREE.MeshStandardMaterial({
    name: 'mat_chrome_equipment',
    color: 0xF1F5F9,
    roughness: 0.12,
    metalness: 0.96,
  }),
  espressoAccent: new THREE.MeshStandardMaterial({
    name: 'mat_espresso_accent',
    color: 0x18181B,
    roughness: 0.35,
    metalness: 0.40,
  }),

  // Glass & Optical Surfaces
  glassClear: new THREE.MeshStandardMaterial({
    name: 'mat_glass_clear',
    color: 0xBAE6FD,
    transparent: true,
    opacity: 0.35,
    roughness: 0.08,
    metalness: 0.05,
  }),
  glassDisplayCase: new THREE.MeshStandardMaterial({
    name: 'mat_glass_display_case',
    color: 0xE0F2FE,
    transparent: true,
    opacity: 0.40,
    roughness: 0.06,
    metalness: 0.05,
  }),

  // Upholstery & Fabrics
  upholsteryGreen: new THREE.MeshStandardMaterial({
    name: 'mat_upholstery_green',
    color: 0x1E4D3A, // Emerald Channel-Tufted Velvet
    roughness: 0.80,
    metalness: 0.02,
  }),
  upholsteryTerracotta: new THREE.MeshStandardMaterial({
    name: 'mat_upholstery_terracotta',
    color: 0xB45309,
    roughness: 0.78,
    metalness: 0.02,
  }),
  upholsterySand: new THREE.MeshStandardMaterial({
    name: 'mat_upholstery_sand',
    color: 0xE2D4C0,
    roughness: 0.85,
    metalness: 0.01,
  }),
  leatherEspresso: new THREE.MeshStandardMaterial({
    name: 'mat_leather_espresso',
    color: 0x2D1A10,
    roughness: 0.68,
    metalness: 0.05,
  }),
  burlapSack: new THREE.MeshStandardMaterial({
    name: 'mat_burlap_sack',
    color: 0xA17D50,
    roughness: 0.95,
    metalness: 0.00,
  }),
  cardboardBox: new THREE.MeshStandardMaterial({
    name: 'mat_cardboard_box',
    color: 0xC49A6C,
    roughness: 0.88,
    metalness: 0.01,
  }),

  // Foliage & Props
  foliageLeaf: new THREE.MeshStandardMaterial({
    name: 'mat_foliage_leaf',
    color: 0x2E7D32,
    roughness: 0.65,
    metalness: 0.02,
  }),
  foliageStems: new THREE.MeshStandardMaterial({
    name: 'mat_foliage_stems',
    color: 0x4A3728,
    roughness: 0.75,
    metalness: 0.01,
  }),
  ceramicPlanter: new THREE.MeshStandardMaterial({
    name: 'mat_ceramic_planter',
    color: 0xF1F5F9,
    roughness: 0.65,
    metalness: 0.05,
  }),
  pastryGold: new THREE.MeshStandardMaterial({
    name: 'mat_pastry_gold',
    color: 0xD97706,
    roughness: 0.75,
    metalness: 0.02,
  }),
  chalkboard: new THREE.MeshStandardMaterial({
    name: 'mat_chalkboard',
    color: 0x0F172A,
    roughness: 0.88,
    metalness: 0.05,
  }),

  // Active Displays, Illumination & Status LED
  lampFilament: new THREE.MeshStandardMaterial({
    name: 'mat_lamp_filament',
    color: 0xFFE4A0,
    emissive: new THREE.Color(0xFFE4A0),
    emissiveIntensity: 2.0,
    roughness: 0.20,
  }),
  posScreenUI: new THREE.MeshStandardMaterial({
    name: 'mat_pos_screen_ui',
    color: 0x0F172A,
    emissive: new THREE.Color(0x0284C7),
    emissiveIntensity: 0.85,
    roughness: 0.15,
  }),
  statusGreenLED: new THREE.MeshStandardMaterial({
    name: 'mat_status_green_led',
    color: 0x00E98C,
    emissive: new THREE.Color(0x00E98C),
    emissiveIntensity: 2.8,
    roughness: 0.10,
  }),
};

// ── 3. Advanced Geometry Factory Helpers (Bevels, Chamfers, Assemblies) ─────────────
function createBox(name, width, height, depth, material, pos = [0, 0, 0], rot = [0, 0, 0]) {
  const geo = new THREE.BoxGeometry(width, height, depth);
  const mesh = new THREE.Mesh(geo, material);
  mesh.name = name;
  mesh.position.set(...pos);
  mesh.rotation.set(...rot);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/**
 * Creates a beveled hard-surface box using ExtrudeGeometry for high-end chamfered edges.
 */
function createBeveledBox(name, width, height, depth, bevelRadius = 0.02, material, pos = [0, 0, 0], rot = [0, 0, 0]) {
  const r = Math.min(bevelRadius, width * 0.45, depth * 0.45);
  const shape = new THREE.Shape();
  const hw = width / 2;
  const hd = depth / 2;

  shape.moveTo(-hw + r, -hd);
  shape.lineTo(hw - r, -hd);
  shape.quadraticCurveTo(hw, -hd, hw, -hd + r);
  shape.lineTo(hw, hd - r);
  shape.quadraticCurveTo(hw, hd, hw - r, hd);
  shape.lineTo(-hw + r, hd);
  shape.quadraticCurveTo(-hw, hd, -hw, hd - r);
  shape.lineTo(-hw, -hd + r);
  shape.quadraticCurveTo(-hw, -hd, -hw + r, -hd);

  const extrudeSettings = {
    depth: height,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: Math.min(r * 0.5, 0.015),
    bevelThickness: Math.min(r * 0.5, 0.015),
  };

  const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  geo.center();
  geo.rotateX(-Math.PI / 2);

  const mesh = new THREE.Mesh(geo, material);
  mesh.name = name;
  mesh.position.set(...pos);
  mesh.rotation.set(...rot);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function createCylinder(name, radiusTop, radiusBottom, height, radialSegments, material, pos = [0, 0, 0], rot = [0, 0, 0]) {
  const geo = new THREE.CylinderGeometry(radiusTop, radiusBottom, height, radialSegments);
  const mesh = new THREE.Mesh(geo, material);
  mesh.name = name;
  mesh.position.set(...pos);
  mesh.rotation.set(...rot);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/**
 * Creates a realistic commercial counter assembly with recessed kickplate, fluted front slats, and beveled top.
 */
function createCounterAssembly(name, width, height, depth, baseMat, topMat, kickMat, pos = [0, 0, 0]) {
  const group = new THREE.Group();
  group.name = name;
  group.position.set(...pos);

  const kickH = 0.08;
  const topH = 0.05;
  const bodyH = height - kickH - topH;

  // 1. Recessed Kickplate Base
  const kick = createBox(name + '_Kickplate', width * 0.96, kickH, depth * 0.92, kickMat, [0, kickH / 2, 0]);
  group.add(kick);

  // 2. Main Counter Body
  const body = createBox(name + '_Body', width * 0.98, bodyH, depth * 0.96, baseMat, [0, kickH + bodyH / 2, 0]);
  group.add(body);

  // 3. Fluted Decorative Slats on Front Facing Face
  const slatW = 0.04;
  const slatGap = 0.02;
  const slatCount = Math.floor((width * 0.94) / (slatW + slatGap));
  const startX = -((slatCount - 1) * (slatW + slatGap)) / 2;

  for (let i = 0; i < slatCount; i++) {
    const sx = startX + i * (slatW + slatGap);
    const slat = createBox(
      `${name}_Slat_${i}`,
      slatW,
      bodyH * 0.92,
      0.015,
      baseMat,
      [sx, kickH + bodyH / 2, depth * 0.48 + 0.008]
    );
    group.add(slat);
  }

  // 4. Beveled Overhanging Top
  const top = createBeveledBox(
    name + '_CounterTop',
    width + 0.06,
    topH,
    depth + 0.06,
    0.02,
    topMat,
    [0, height - topH / 2, 0]
  );
  group.add(top);

  return group;
}

// ── 4. Build Digital Twin Scene Hierarchy ──────────────────────────────────────────
const rootScene = new THREE.Group();
rootScene.name = 'ShiftSync_Store_DigitalTwin';

// Store Floor Dimensions (22.20m x 14.22m x 4.02m)
const STORE_LENGTH = 22.20;
const STORE_WIDTH = 14.22;
const STORE_HEIGHT = 4.02;

// ── A. ARCHITECTURAL SHELL ────────────────────────────────────────────────────────
const shellGroup = new THREE.Group();
shellGroup.name = 'Architectural_Shell';

// 1. Floor with Multi-Zone Tiles
const floorGroup = new THREE.Group();
floorGroup.name = 'Store_Floor_System';
floorGroup.userData.layer = 'floor';

// 1.1 Main Terrazzo Floor Plinth
const mainFloor = createBox('Main_Floor_Plinth', STORE_LENGTH, 0.04, STORE_WIDTH, materials.terrazzoFloor, [0, -0.02, 0]);
mainFloor.userData.layer = 'floor';
floorGroup.add(mainFloor);

// 1.2 Herringbone Oak Parquet Inset for Dining Zone
const diningFloor = createBox('Zone_Dining_Floor', 11.2, 0.005, 11.6, materials.oakParquetFloor, [4.8, 0.003, 0.6]);
diningFloor.userData.layer = 'floor';
floorGroup.add(diningFloor);

// 1.3 Slate Tile Floor Inset for Barista / Prep Zone
const baristaFloor = createBox('Zone_Barista_Floor', 8.6, 0.005, 5.2, materials.slateTileFloor, [-5.8, 0.003, -3.8]);
baristaFloor.userData.layer = 'floor';
floorGroup.add(baristaFloor);

// 1.4 Concrete Floor Inset for Storage Room
const storageFloor = createBox('Zone_Storage_Floor', 4.8, 0.005, 4.2, materials.concreteFloor, [-8.2, 0.003, 4.4]);
storageFloor.userData.layer = 'floor';
floorGroup.add(storageFloor);

// 1.5 Brass Floor Divider Inset Strips
const brassStrip1 = createBox('Floor_Divider_Brass_1', 0.04, 0.008, 11.6, materials.brassTrim, [-0.8, 0.004, 0.6]);
const brassStrip2 = createBox('Floor_Divider_Brass_2', 8.6, 0.008, 0.04, materials.brassTrim, [-5.8, 0.004, -1.2]);
floorGroup.add(brassStrip1);
floorGroup.add(brassStrip2);

// 1.6 Recessed Coir Entrance Walk-Off Mat
const entranceMat = createBox('Store_Entrance_Mat', 3.6, 0.008, 1.8, materials.entranceMat, [0, 0.004, STORE_WIDTH / 2 - 1.1]);
floorGroup.add(entranceMat);

shellGroup.add(floorGroup);

// 2. Perimeter Walls with Architectural Window Mullions
const wallsGroup = new THREE.Group();
wallsGroup.name = 'Store_Perimeter_Walls';
wallsGroup.userData.layer = 'walls';

const wallThickness = 0.22;
const halfL = STORE_LENGTH / 2;
const halfW = STORE_WIDTH / 2;

// North Wall (Back Wall)
const wallNorth = createBox('Wall_North_Solid', STORE_LENGTH, STORE_HEIGHT, wallThickness, materials.wallPlaster, [0, STORE_HEIGHT / 2, -halfW]);
wallNorth.userData.layer = 'walls';
wallsGroup.add(wallNorth);

// West Wall (Storage Side)
const wallWest = createBox('Wall_West_Solid', wallThickness, STORE_HEIGHT, STORE_WIDTH, materials.wallPlaster, [-halfL, STORE_HEIGHT / 2, 0]);
wallWest.userData.layer = 'walls';
wallsGroup.add(wallWest);

// East Wall (Dining Windows Side)
const wallEastLower = createBox('Wall_East_LowerPlinth', wallThickness, 0.75, STORE_WIDTH, materials.wallPlaster, [halfL, 0.375, 0]);
const wallEastUpper = createBox('Wall_East_Header', wallThickness, 0.60, STORE_WIDTH, materials.wallPlaster, [halfL, STORE_HEIGHT - 0.30, 0]);
const glassEast = createBox('Wall_East_GlassPanels', 0.04, STORE_HEIGHT - 1.35, STORE_WIDTH - 0.4, materials.glassClear, [halfL, 0.75 + (STORE_HEIGHT - 1.35) / 2, 0]);
wallEastLower.userData.layer = 'walls';
wallEastUpper.userData.layer = 'walls';
wallsGroup.add(wallEastLower);
wallsGroup.add(wallEastUpper);
wallsGroup.add(glassEast);

// South Wall (Storefront Entrance)
const wallSouthLeft = createBox('Wall_South_Left', (STORE_LENGTH - 4.4) / 2, STORE_HEIGHT, wallThickness, materials.wallPlaster, [-(STORE_LENGTH + 4.4) / 4, STORE_HEIGHT / 2, halfW]);
const wallSouthRight = createBox('Wall_South_Right', (STORE_LENGTH - 4.4) / 2, STORE_HEIGHT, wallThickness, materials.wallPlaster, [(STORE_LENGTH + 4.4) / 4, STORE_HEIGHT / 2, halfW]);
const wallSouthHeader = createBox('Wall_South_TransomHeader', 4.4, 0.82, wallThickness, materials.wallPlaster, [0, STORE_HEIGHT - 0.41, halfW]);
wallSouthLeft.userData.layer = 'walls';
wallSouthRight.userData.layer = 'walls';
wallSouthHeader.userData.layer = 'walls';
wallsGroup.add(wallSouthLeft);
wallsGroup.add(wallSouthRight);
wallsGroup.add(wallSouthHeader);

// Commercial Storefront Glass Double Doors
const doorFrame = createBox('Entrance_Door_Frame', 3.4, 2.7, 0.10, materials.powderMetalDark, [0, 1.35, halfW]);
const doorGlassLeft = createBox('Entrance_Door_Glass_L', 1.55, 2.5, 0.03, materials.glassClear, [-0.8, 1.35, halfW]);
const doorGlassRight = createBox('Entrance_Door_Glass_R', 1.55, 2.5, 0.03, materials.glassClear, [0.8, 1.35, halfW]);
const doorHandleL = createCylinder('Door_Handle_L', 0.018, 0.018, 0.9, 12, materials.stainlessSteel, [-0.15, 1.35, halfW + 0.06]);
const doorHandleR = createCylinder('Door_Handle_R', 0.018, 0.018, 0.9, 12, materials.stainlessSteel, [0.15, 1.35, halfW + 0.06]);
wallsGroup.add(doorFrame);
wallsGroup.add(doorGlassLeft);
wallsGroup.add(doorGlassRight);
wallsGroup.add(doorHandleL);
wallsGroup.add(doorHandleR);

// Acoustic Vertical Wood Slat Feature Wall behind Barista Counter
const slatWall = createBox('Acoustic_Slat_FeatureWall', 9.2, 3.4, 0.04, materials.wallFeatureWood, [-5.2, 1.7, -halfW + 0.12]);
slatWall.userData.layer = 'walls';
wallsGroup.add(slatWall);

// Perimeter Baseboard Molding
const bbNorth = createBox('Baseboard_North', STORE_LENGTH, 0.12, 0.03, materials.baseboardMolding, [0, 0.06, -halfW + 0.12]);
const bbWest = createBox('Baseboard_West', 0.03, 0.12, STORE_WIDTH, materials.baseboardMolding, [-halfL + 0.12, 0.06, 0]);
wallsGroup.add(bbNorth);
wallsGroup.add(bbWest);

// 3. Storage Room Partitions (Exact names for extractGlbObstacles)
const partitionEast = createBox('Partition_Storage_East', 0.18, STORE_HEIGHT, 4.4, materials.wallPlaster, [-5.8, STORE_HEIGHT / 2, 4.8]);
const partitionSouth = createBox('Partition_Storage_South', 5.2, STORE_HEIGHT, 0.18, materials.wallPlaster, [-8.4, STORE_HEIGHT / 2, 2.6]);
partitionEast.userData.layer = 'walls';
partitionSouth.userData.layer = 'walls';
wallsGroup.add(partitionEast);
wallsGroup.add(partitionSouth);

shellGroup.add(wallsGroup);

// 4. Structural Columns (Exact names for extractGlbObstacles)
const col1Group = new THREE.Group();
col1Group.name = 'Store_Column_01';
col1Group.position.set(-3.55, 0, -1.14);
col1Group.add(createBox('Col1_BasePlinth', 0.80, 0.12, 0.80, materials.powderMetalDark, [0, 0.06, 0]));
col1Group.add(createBox('Col1_OakShaft', 0.72, STORE_HEIGHT - 0.24, 0.72, materials.naturalOak, [0, STORE_HEIGHT / 2, 0]));
col1Group.add(createBox('Col1_CrownCollar', 0.80, 0.12, 0.80, materials.powderMetalDark, [0, STORE_HEIGHT - 0.06, 0]));
shellGroup.add(col1Group);

const col2Group = new THREE.Group();
col2Group.name = 'Store_Column_02';
col2Group.position.set(3.55, 0, -1.14);
col2Group.add(createBox('Col2_BasePlinth', 0.80, 0.12, 0.80, materials.powderMetalDark, [0, 0.06, 0]));
col2Group.add(createBox('Col2_OakShaft', 0.72, STORE_HEIGHT - 0.24, 0.72, materials.naturalOak, [0, STORE_HEIGHT / 2, 0]));
col2Group.add(createBox('Col2_CrownCollar', 0.80, 0.12, 0.80, materials.powderMetalDark, [0, STORE_HEIGHT - 0.06, 0]));
shellGroup.add(col2Group);

rootScene.add(shellGroup);

// ── B. STORE FUNCTIONAL ZONES (Semantic Boundary Markers) ──────────────────────────
const zonesGroup = new THREE.Group();
zonesGroup.name = 'Zones';
zonesGroup.userData.layer = 'zones';

const zoneDefs = [
  { name: 'Zone_POS', pos: [-5.6, 0.01, -0.6] },
  { name: 'Zone_Barista', pos: [-5.6, 0.01, -3.8] },
  { name: 'Zone_CustomerService', pos: [-1.4, 0.01, -2.4] },
  { name: 'Zone_Dining', pos: [4.8, 0.01, 0.6] },
  { name: 'Zone_Storage', pos: [-8.4, 0.01, 4.6] },
  { name: 'Zone_Entrance', pos: [0, 0.01, 5.2] },
];

zoneDefs.forEach((zd) => {
  const zMarker = new THREE.Group();
  zMarker.name = zd.name;
  zMarker.position.set(...zd.pos);
  zMarker.userData.isZone = true;
  zMarker.userData.zoneCode = zd.name.replace('Zone_', '');
  zonesGroup.add(zMarker);
});
rootScene.add(zonesGroup);

// ── C. OPERATIONAL WORKSTATIONS (Digital Twin Dedicated Nodes) ─────────────────────
const workstationsGroup = new THREE.Group();
workstationsGroup.name = 'Workstations';
workstationsGroup.userData.layer = 'workstations';

// ── WORKSTATION 1: POS / CASHIER ──────────────────────────────────────────────────
const wsPos = new THREE.Group();
wsPos.name = 'Workstation_POS_01';
wsPos.position.set(-5.6, 0, -0.6);
wsPos.rotation.y = Math.PI;
wsPos.userData.isWorkstation = true;
wsPos.userData.workstationType = 'POS';
wsPos.userData.layer = 'workstations';

// 1.1 Fluted Oak Counter with Beveled Quartz Countertop
const posCounter = createCounterAssembly('POS_Counter', 2.4, 0.95, 0.90, materials.naturalOak, materials.whiteQuartz, materials.powderMetalDark);
wsPos.add(posCounter);

// 1.2 Dual-Screen Touchscreen POS Terminal on Die-Cast Swivel Stand
const posStandBase = createCylinder('POS_Terminal_Base', 0.12, 0.14, 0.03, 16, materials.powderMetalDark, [-0.4, 0.965, 0.05]);
const posStandArm = createCylinder('POS_Terminal_Arm', 0.03, 0.03, 0.22, 14, materials.powderMetalDark, [-0.4, 1.08, 0.05], [0.15, 0, 0]);
const posScreenCashier = createBeveledBox('POS_Screen_Cashier', 0.44, 0.28, 0.025, 0.01, materials.powderMetalDark, [-0.4, 1.20, 0.08], [0.35, 0, 0]);
const posScreenUI = createBox('POS_Screen_UI_Face', 0.42, 0.26, 0.005, materials.posScreenUI, [-0.4, 1.20, 0.093], [0.35, 0, 0]);
const posScreenCustomer = createBeveledBox('POS_Screen_Customer', 0.32, 0.20, 0.02, 0.008, materials.powderMetalDark, [-0.4, 1.18, -0.02], [-0.15, 0, 0]);
wsPos.add(posStandBase);
wsPos.add(posStandArm);
wsPos.add(posScreenCashier);
wsPos.add(posScreenUI);
wsPos.add(posScreenCustomer);

// 1.3 Thermal Receipt Printer with Paper Slip
const printerBody = createBeveledBox('Receipt_Printer_Body', 0.18, 0.14, 0.18, 0.008, materials.powderMetalDark, [0.25, 1.02, 0.12]);
const printerSlot = createBox('Receipt_Printer_Slot', 0.12, 0.006, 0.04, materials.chromeEquipment, [0.25, 1.09, 0.12]);
const paperSlip = createBox('Receipt_Paper_Slip', 0.08, 0.04, 0.002, materials.wallPlaster, [0.25, 1.11, 0.12], [0.2, 0, 0]);
const printerLED = createBox('Receipt_Printer_LED', 0.01, 0.01, 0.01, materials.statusGreenLED, [0.18, 1.08, 0.19]);
wsPos.add(printerBody);
wsPos.add(printerSlot);
wsPos.add(paperSlip);
wsPos.add(printerLED);

// 1.4 Standalone Chip & PIN Payment Terminal
const pinPad = createBeveledBox('Card_Terminal_PinPad', 0.11, 0.05, 0.18, 0.008, materials.powderMetalDark, [0.65, 0.98, -0.05], [0.2, 0, 0]);
const pinPadDisplay = createBox('Card_Terminal_Display', 0.08, 0.002, 0.05, materials.posScreenUI, [0.65, 1.008, -0.09], [0.2, 0, 0]);
wsPos.add(pinPad);
wsPos.add(pinPadDisplay);

// 1.5 Barcode Scanner Gun & Cradle
const scannerCradle = createCylinder('Scanner_Cradle', 0.04, 0.05, 0.10, 12, materials.powderMetalDark, [-0.85, 1.00, 0.10]);
const scannerGun = createBeveledBox('Scanner_Gun', 0.07, 0.16, 0.10, 0.01, materials.powderMetalDark, [-0.85, 1.08, 0.10], [-0.4, 0, 0]);
wsPos.add(scannerCradle);
wsPos.add(scannerGun);

// 1.6 Cable Management Drop Grommet
const cableGrommet = createCylinder('Desk_Cable_Grommet', 0.035, 0.035, 0.01, 14, materials.powderMetalDark, [-0.15, 0.952, 0.25]);
wsPos.add(cableGrommet);

workstationsGroup.add(wsPos);

// ── WORKSTATION 2: BARISTA PREPARATION ────────────────────────────────────────────
const wsBarista = new THREE.Group();
wsBarista.name = 'Workstation_Barista_01';
wsBarista.position.set(-5.6, 0, -3.8);
wsBarista.userData.isWorkstation = true;
wsBarista.userData.workstationType = 'BARISTA';
wsBarista.userData.layer = 'workstations';

// 2.1 Heavy-Duty Stainless Steel Barista Prep Counter
const barCounter = createCounterAssembly('Barista_Counter', 3.6, 0.95, 1.10, materials.naturalOak, materials.stainlessSteel, materials.powderMetalDark);
wsBarista.add(barCounter);

// 2.2 Commercial 2-Group Espresso Machine (Precision Polished Chrome & Dark Accents)
const espGroup = new THREE.Group();
espGroup.name = 'Commercial_Espresso_Machine';
espGroup.position.set(-0.45, 0.95, 0.05);

// Machine Main Chassis
const espBody = createBeveledBox('Espresso_Chassis', 0.88, 0.44, 0.54, 0.02, materials.stainlessSteel, [0, 0.22, 0]);
const espFaceplate = createBox('Espresso_Faceplate_Chrome', 0.82, 0.24, 0.015, materials.chromeEquipment, [0, 0.22, 0.275]);
const espSidePanelL = createBox('Espresso_Side_L', 0.02, 0.40, 0.50, materials.powderMetalDark, [-0.445, 0.22, 0]);
const espSidePanelR = createBox('Espresso_Side_R', 0.02, 0.40, 0.50, materials.powderMetalDark, [0.445, 0.22, 0]);
espGroup.add(espBody);
espGroup.add(espFaceplate);
espGroup.add(espSidePanelL);
espGroup.add(espSidePanelR);

// Dual E61-Style Chrome Group Heads & Portafilters
[-0.18, 0.18].forEach((gx, idx) => {
  const gHead = createCylinder(`Group_Head_${idx}`, 0.055, 0.05, 0.10, 16, materials.chromeEquipment, [gx, 0.16, 0.26]);
  const pHandle = createCylinder(`Portafilter_Handle_${idx}`, 0.018, 0.014, 0.18, 12, materials.darkWalnut, [gx + 0.04, 0.12, 0.38], [Math.PI / 2, 0, -0.3]);
  const pBasket = createCylinder(`Portafilter_Basket_${idx}`, 0.042, 0.038, 0.05, 14, materials.chromeEquipment, [gx, 0.12, 0.26]);
  espGroup.add(gHead);
  espGroup.add(pHandle);
  espGroup.add(pBasket);
});

// Dual Analog Pressure Dials
[-0.32, 0.32].forEach((dx, idx) => {
  const dialBezel = createCylinder(`Pressure_Dial_${idx}`, 0.035, 0.035, 0.012, 16, materials.brassTrim, [dx, 0.28, 0.28], [Math.PI / 2, 0, 0]);
  const dialFace = createBox(`Pressure_Face_${idx}`, 0.05, 0.05, 0.002, materials.wallPlaster, [dx, 0.28, 0.287]);
  espGroup.add(dialBezel);
  espGroup.add(dialFace);
});

// Dual Articulated Stainless Steel Steam Wands
[-0.38, 0.38].forEach((wx, idx) => {
  const wandPivot = createCylinder(`Steam_Pivot_${idx}`, 0.02, 0.02, 0.03, 12, materials.chromeEquipment, [wx, 0.18, 0.24]);
  const wandPipe = createCylinder(`Steam_Wand_${idx}`, 0.008, 0.006, 0.24, 12, materials.chromeEquipment, [wx + (idx === 0 ? -0.04 : 0.04), 0.06, 0.28], [0.35, 0, idx === 0 ? -0.2 : 0.2]);
  const wandGrip = createCylinder(`Steam_Grip_${idx}`, 0.012, 0.012, 0.06, 12, materials.espressoAccent, [wx + (idx === 0 ? -0.04 : 0.04), 0.10, 0.27], [0.35, 0, idx === 0 ? -0.2 : 0.2]);
  espGroup.add(wandPivot);
  espGroup.add(wandPipe);
  espGroup.add(wandGrip);
});

// Laser-Cut Perforated Drip Tray
const dripTray = createBox('Espresso_Drip_Tray', 0.84, 0.03, 0.24, materials.chromeEquipment, [0, 0.015, 0.26]);
espGroup.add(dripTray);

// Top Cup-Warming Surface with Retention Rail & Stacked Porcelain Cups
const cupRail = createBox('Cup_Retention_Rail', 0.84, 0.035, 0.44, materials.brassTrim, [0, 0.455, 0]);
espGroup.add(cupRail);

const cupPositions = [-0.30, -0.15, 0, 0.15, 0.30];
cupPositions.forEach((cx, idx) => {
  const cup1 = createCylinder(`Espresso_Cup_A_${idx}`, 0.042, 0.03, 0.06, 14, materials.whiteQuartz, [cx, 0.47, -0.06]);
  const cup2 = createCylinder(`Espresso_Cup_B_${idx}`, 0.042, 0.03, 0.06, 14, materials.whiteQuartz, [cx, 0.53, -0.06]);
  espGroup.add(cup1);
  espGroup.add(cup2);
});
wsBarista.add(espGroup);

// 2.3 Dual Commercial On-Demand Coffee Grinders
[0.45, 0.85].forEach((gx, idx) => {
  const grinderGroup = new THREE.Group();
  grinderGroup.name = `Commercial_Grinder_${idx}`;
  grinderGroup.position.set(gx, 0.95, 0.10);

  const gBase = createBeveledBox('Grinder_Base', 0.22, 0.36, 0.26, 0.015, materials.powderMetalDark, [0, 0.18, 0]);
  const gHopper = createCylinder('Grinder_Hopper_Glass', 0.11, 0.05, 0.24, 16, materials.glassClear, [0, 0.48, 0]);
  const gBeans = createCylinder('Grinder_Beans_Inside', 0.10, 0.046, 0.18, 14, materials.darkWalnut, [0, 0.46, 0]);
  const gHopperLid = createCylinder('Grinder_Hopper_Lid', 0.115, 0.115, 0.025, 16, materials.powderMetalDark, [0, 0.61, 0]);
  const gSpout = createBox('Grinder_Dose_Spout', 0.05, 0.06, 0.06, materials.chromeEquipment, [0, 0.18, 0.14]);
  const gFork = createBox('Grinder_Portafilter_Fork', 0.08, 0.015, 0.08, materials.stainlessSteel, [0, 0.12, 0.15]);

  grinderGroup.add(gBase);
  grinderGroup.add(gHopper);
  grinderGroup.add(gBeans);
  grinderGroup.add(gHopperLid);
  grinderGroup.add(gSpout);
  grinderGroup.add(gFork);
  wsBarista.add(grinderGroup);
});

// 2.4 Barista Knock Box with Rubber Bar & Coffee Cake
const knockBox = createBox('Barista_Knock_Box', 0.22, 0.12, 0.22, materials.stainlessSteel, [1.25, 1.01, 0.10]);
const knockBar = createCylinder('Knock_Bar_Rubber', 0.015, 0.015, 0.20, 12, materials.powderMetalDark, [1.25, 1.06, 0.10], [0, 0, Math.PI / 2]);
const spentGrounds = createBox('Spent_Coffee_Cake', 0.18, 0.04, 0.18, materials.darkWalnut, [1.25, 0.98, 0.10]);
wsBarista.add(knockBox);
wsBarista.add(knockBar);
wsBarista.add(spentGrounds);

// 2.5 Silicone Tamping Mat & Precision Tamper
const tampMat = createBox('Tamping_Mat', 0.18, 0.015, 0.18, materials.powderMetalDark, [1.50, 0.958, 0.15]);
const tamperBase = createCylinder('Tamper_Base', 0.038, 0.038, 0.02, 16, materials.stainlessSteel, [1.50, 0.975, 0.15]);
const tamperHandle = createCylinder('Tamper_Handle', 0.022, 0.018, 0.07, 14, materials.naturalOak, [1.50, 1.02, 0.15]);
wsBarista.add(tampMat);
wsBarista.add(tamperBase);
wsBarista.add(tamperHandle);

// 2.6 Stainless Steel Milk Pitchers & Syrup Bottles
const pitcher1 = createCylinder('Milk_Pitcher_600ml', 0.045, 0.05, 0.11, 14, materials.stainlessSteel, [-1.20, 1.005, 0.15]);
const pitcher2 = createCylinder('Milk_Pitcher_350ml', 0.038, 0.042, 0.09, 14, materials.stainlessSteel, [-1.32, 0.995, 0.15]);
wsBarista.add(pitcher1);
wsBarista.add(pitcher2);

[-1.50, -1.62].forEach((sx, idx) => {
  const bottle = createCylinder(`Syrup_Bottle_${idx}`, 0.035, 0.035, 0.24, 12, materials.glassClear, [sx, 1.07, 0.15]);
  const pump = createCylinder(`Syrup_Pump_${idx}`, 0.01, 0.01, 0.06, 8, materials.powderMetalDark, [sx, 1.21, 0.15]);
  wsBarista.add(bottle);
  wsBarista.add(pump);
});

workstationsGroup.add(wsBarista);

// ── WORKSTATION 3: CUSTOMER PICKUP & SERVICE ──────────────────────────────────────
const wsService = new THREE.Group();
wsService.name = 'Workstation_Service_01';
wsService.position.set(-1.4, 0, -2.4);
wsService.rotation.y = Math.PI / 2;
wsService.userData.isWorkstation = true;
wsService.userData.workstationType = 'SERVICE';
wsService.userData.layer = 'workstations';

// 3.1 Fluted Oak Counter with White Quartz Top
const srvCounter = createCounterAssembly('Service_Counter', 2.2, 0.95, 0.95, materials.naturalOak, materials.whiteQuartz, materials.powderMetalDark);
wsService.add(srvCounter);

// 3.2 Pour-Over Brew Station (Brass 3-Position Stand, Glass Carafes, V60 Drippers)
const pourStandGroup = new THREE.Group();
pourStandGroup.name = 'PourOver_Brew_Bar';
pourStandGroup.position.set(-0.35, 0.95, 0.05);

const standBase = createBox('PourOver_Wood_Base', 0.65, 0.03, 0.22, materials.darkWalnut, [0, 0.015, 0]);
const standRods = [
  createCylinder('Stand_Rod_L', 0.008, 0.008, 0.28, 12, materials.brassTrim, [-0.28, 0.15, -0.06]),
  createCylinder('Stand_Rod_R', 0.008, 0.008, 0.28, 12, materials.brassTrim, [0.28, 0.15, -0.06]),
  createBox('Stand_Dripper_Rail', 0.62, 0.015, 0.14, materials.brassTrim, [0, 0.28, 0]),
];
pourStandGroup.add(standBase);
standRods.forEach(r => pourStandGroup.add(r));

// 2 Pour-Over Sets (Glass Carafe + Ceramic Dripper Cone)
[-0.16, 0.16].forEach((px, idx) => {
  const carafe = createCylinder(`Glass_Carafe_${idx}`, 0.045, 0.065, 0.15, 14, materials.glassClear, [px, 0.105, 0]);
  const dripper = createCylinder(`V60_Dripper_Cone_${idx}`, 0.06, 0.02, 0.08, 14, materials.whiteQuartz, [px, 0.32, 0]);
  pourStandGroup.add(carafe);
  pourStandGroup.add(dripper);
});
wsService.add(pourStandGroup);

// 3.3 Electric Gooseneck Kettle & Digital Precision Scale
const kettleBase = createCylinder('Kettle_Digital_Base', 0.10, 0.10, 0.025, 16, materials.powderMetalDark, [0.45, 0.962, 0.05]);
const kettleBody = createCylinder('Kettle_Body_MatteBlack', 0.075, 0.09, 0.18, 16, materials.powderMetalDark, [0.45, 1.065, 0.05]);
const kettleSpout = createCylinder('Kettle_Gooseneck_Spout', 0.008, 0.006, 0.22, 10, materials.stainlessSteel, [0.45 + 0.10, 1.10, 0.05], [0, 0, -0.6]);
wsService.add(kettleBase);
wsService.add(kettleBody);
wsService.add(kettleSpout);

// 3.4 Wooden Condiment Organizer (Napkins, Stirrers, Lids)
const condOrg = createBox('Condiment_Organizer', 0.42, 0.14, 0.24, materials.naturalOak, [0.85, 1.02, 0.05]);
const napkins = createBox('Napkin_Stack', 0.12, 0.08, 0.18, materials.wallPlaster, [0.75, 1.05, 0.05]);
wsService.add(condOrg);
wsService.add(napkins);

workstationsGroup.add(wsService);

// ── WORKSTATION 4: PASTRY & BAKERY SHOWCASE ───────────────────────────────────────
const wsBakery = new THREE.Group();
wsBakery.name = 'Workstation_Kitchen_01';
wsBakery.position.set(-5.6, 0, 1.8);
wsBakery.rotation.y = Math.PI;
wsBakery.userData.isWorkstation = true;
wsBakery.userData.workstationType = 'KITCHEN';
wsBakery.userData.layer = 'workstations';

// 4.1 Lower Counter Base with Brushed Inox Refrigeration Fronts
const bakCounter = createCounterAssembly('Pastry_Counter', 2.0, 0.85, 0.90, materials.naturalOak, materials.stainlessSteel, materials.powderMetalDark);
wsBakery.add(bakCounter);

// 4.2 Curved Front Glass Display Showcase with LED Illumination
const caseGroup = new THREE.Group();
caseGroup.name = 'Pastry_Showcase_Case';
caseGroup.position.set(0, 0.85, 0);

// Curved Glass Sneeze Guard / Enclosure
const glassCanopy = createBeveledBox('Showcase_Glass_Canopy', 1.92, 0.58, 0.82, 0.03, materials.glassDisplayCase, [0, 0.29, 0]);
caseGroup.add(glassCanopy);

// Tiered Glass Shelves with Polished Inox Brackets
[0.18, 0.38].forEach((sy, sIdx) => {
  const shelf = createBox(`Showcase_Glass_Shelf_${sIdx}`, 1.84, 0.012, 0.65, materials.glassClear, [0, sy, -0.04]);
  caseGroup.add(shelf);

  // Warm LED Under-Shelf Lighting Strip
  const ledStrip = createBox(`Showcase_LED_Strip_${sIdx}`, 1.80, 0.008, 0.015, materials.lampFilament, [0, sy - 0.01, 0.26]);
  caseGroup.add(ledStrip);

  if (sIdx === 0) {
    // Lower Shelf: Artisan Croissants
    [-0.55, -0.25, 0.05, 0.35, 0.60].forEach((cx, idx) => {
      const croissant = createCylinder(`Croissant_${idx}`, 0.055, 0.04, 0.05, 10, materials.pastryGold, [cx, sy + 0.03, 0], [0, idx * 0.3, Math.PI / 2]);
      caseGroup.add(croissant);
    });
  } else {
    // Upper Shelf: Chocolate Muffins & Pastel Macarons
    [-0.50, -0.20].forEach((mx, idx) => {
      const muffin = createCylinder(`Muffin_${idx}`, 0.042, 0.03, 0.05, 12, materials.darkWalnut, [mx, sy + 0.03, 0]);
      caseGroup.add(muffin);
    });
    [0.15, 0.35, 0.55].forEach((macX, idx) => {
      const macaron = createCylinder(`Macaron_${idx}`, 0.028, 0.028, 0.02, 10, materials.upholsteryTerracotta, [macX, sy + 0.02, 0]);
      caseGroup.add(macaron);
    });
  }
});

// Stainless Steel Serving Tongs on Holder
const tongHolder = createCylinder('Tong_Holder', 0.04, 0.04, 0.12, 12, materials.stainlessSteel, [0.82, 0.06, 0.28]);
caseGroup.add(tongHolder);

wsBakery.add(caseGroup);

workstationsGroup.add(wsBakery);

rootScene.add(workstationsGroup);

// ── D. CUSTOMER SEATING & FURNITURE ───────────────────────────────────────────────
const furnitureGroup = new THREE.Group();
furnitureGroup.name = 'Customer_Furniture';
furnitureGroup.userData.layer = 'furniture';

// 1. Cluster of 3 Channel-Tufted Emerald Velvet Booths
const boothGroup = new THREE.Group();
boothGroup.name = 'Dining_Booths_Cluster';

[-3.6, 0, 3.6].forEach((bz, idx) => {
  const booth = new THREE.Group();
  booth.name = `Booth_Section_${idx}`;
  booth.position.set(9.6, 0, bz);

  // Oak Plinth Base
  const bBase = createBox('Booth_Plinth', 1.8, 0.22, 1.4, materials.naturalOak, [0, 0.11, 0]);
  booth.add(bBase);

  // Double-Sided Seat Cushions with Bullnose Front
  const seat1 = createBeveledBox('Booth_Seat_North', 1.76, 0.18, 0.52, 0.025, materials.upholsteryGreen, [0, 0.31, -0.42]);
  const seat2 = createBeveledBox('Booth_Seat_South', 1.76, 0.18, 0.52, 0.025, materials.upholsteryGreen, [0, 0.31, 0.42]);
  booth.add(seat1);
  booth.add(seat2);

  // High Acoustic Channel-Tufted Dividing Backrest
  const backDivider = createBeveledBox('Booth_Divider_Backrest', 1.76, 1.15, 0.18, 0.02, materials.upholsteryGreen, [0, 0.68, 0]);
  booth.add(backDivider);

  // Central Booth Table (Solid Oak Top on Black Pedestal)
  const bTableTop = createBeveledBox(`Booth_Table_Top_${idx}`, 1.4, 0.04, 0.72, 0.015, materials.whiteQuartz, [0, 0.74, 0]);
  const bTablePed = createCylinder(`Booth_Table_Ped_${idx}`, 0.06, 0.07, 0.70, 14, materials.powderMetalDark, [0, 0.37, 0]);
  const bTableFoot = createBox(`Booth_Table_Foot_${idx}`, 0.65, 0.02, 0.45, materials.powderMetalDark, [0, 0.01, 0]);
  booth.add(bTableTop);
  booth.add(bTablePed);
  booth.add(bTableFoot);

  boothGroup.add(booth);
});
furnitureGroup.add(boothGroup);

// 2. Round Bistro Dining Tables & Modern Curved Chairs
const bistroGroup = new THREE.Group();
bistroGroup.name = 'Bistro_Tables_And_Chairs';

const bistroTableCoords = [
  [3.6, -2.8],
  [6.8, -2.8],
  [3.6, 2.8],
  [6.8, 2.8],
];

bistroTableCoords.forEach(([tx, tz], tIdx) => {
  const tableGroup = new THREE.Group();
  tableGroup.name = `Bistro_Table_Group_${tIdx}`;
  tableGroup.position.set(tx, 0, tz);

  // Beveled Round Tabletop (Alternating Natural Oak and White Quartz)
  const isQuartz = tIdx % 2 === 1;
  const topMat = isQuartz ? materials.whiteQuartz : materials.naturalOak;
  const tTop = createCylinder(`Bistro_Top_${tIdx}`, 0.42, 0.42, 0.035, 24, topMat, [0, 0.73, 0]);
  const tCol = createCylinder(`Bistro_Column_${tIdx}`, 0.035, 0.045, 0.69, 16, materials.powderMetalDark, [0, 0.365, 0]);
  const tRing = createCylinder(`Bistro_BrassRing_${tIdx}`, 0.048, 0.048, 0.025, 16, materials.brassTrim, [0, 0.68, 0]);
  const tBase = createCylinder(`Bistro_BasePlinth_${tIdx}`, 0.24, 0.26, 0.025, 20, materials.powderMetalDark, [0, 0.012, 0]);
  tableGroup.add(tTop);
  tableGroup.add(tCol);
  tableGroup.add(tRing);
  tableGroup.add(tBase);

  // 2 Modern Curved Bistro Chairs per table
  [-0.65, 0.65].forEach((cx, cIdx) => {
    const chair = new THREE.Group();
    chair.name = `Bistro_Chair_${tIdx}_${cIdx}`;
    chair.position.set(cx, 0, 0);
    chair.rotation.y = cx > 0 ? -Math.PI / 2 : Math.PI / 2;

    // Contoured Seat with Fabric Cushion
    const seatBase = createBox('Chair_Seat_Plinth', 0.42, 0.03, 0.40, materials.naturalOak, [0, 0.435, 0]);
    const cushionMat = (tIdx + cIdx) % 2 === 0 ? materials.upholsteryGreen : materials.upholsteryTerracotta;
    const seatCushion = createBeveledBox('Chair_Cushion', 0.40, 0.04, 0.38, 0.015, cushionMat, [0, 0.47, 0]);
    chair.add(seatBase);
    chair.add(seatCushion);

    // Curved Bentwood Backrest
    const backRest = createBeveledBox('Chair_Bentwood_Back', 0.42, 0.32, 0.025, 0.01, materials.naturalOak, [0, 0.68, -0.18], [0.1, 0, 0]);
    const backPosts = [
      createCylinder('Chair_BackPost_L', 0.012, 0.012, 0.28, 10, materials.powderMetalDark, [-0.16, 0.58, -0.16]),
      createCylinder('Chair_BackPost_R', 0.012, 0.012, 0.28, 10, materials.powderMetalDark, [0.16, 0.58, -0.16]),
    ];
    chair.add(backRest);
    backPosts.forEach(p => chair.add(p));

    // 4 Splayed Tapered Steel Legs with Brass Ferrule Feet
    const legOffsets = [
      [-0.17, -0.16], [0.17, -0.16],
      [-0.17, 0.16], [0.17, 0.16],
    ];
    legOffsets.forEach(([lx, lz], lIdx) => {
      const leg = createCylinder(`Chair_Leg_${lIdx}`, 0.012, 0.008, 0.44, 10, materials.powderMetalDark, [lx, 0.22, lz], [lz * 0.25, 0, -lx * 0.25]);
      const ferrule = createCylinder(`Chair_Ferrule_${lIdx}`, 0.010, 0.009, 0.04, 10, materials.brassTrim, [lx, 0.02, lz]);
      chair.add(leg);
      chair.add(ferrule);
    });

    tableGroup.add(chair);
  });

  bistroGroup.add(tableGroup);
});
furnitureGroup.add(bistroGroup);

// 3. Long Communal Work Table with Trestle Frame & High Swivel Bar Stools
const communalGroup = new THREE.Group();
communalGroup.name = 'Communal_Work_Table_Group';
communalGroup.position.set(5.2, 0, 0);

// 4.8m x 1.0m Heavy 60mm Solid Oak Plank Top
const comTop = createBeveledBox('Communal_Oak_Top', 4.8, 0.06, 1.05, 0.02, materials.naturalOak, [0, 0.98, 0]);
communalGroup.add(comTop);

// Brass Flush Cable Management Access Covers
[-1.6, 0, 1.6].forEach((cx, idx) => {
  const cableLid = createBox(`Communal_Cable_Lid_${idx}`, 0.28, 0.004, 0.12, materials.brassTrim, [cx, 1.012, 0]);
  communalGroup.add(cableLid);
});

// Heavy Dark Powder-Coated Steel Trestle Legs & Stretcher Footrest Bar
[-2.1, 2.1].forEach((tx, idx) => {
  const tLegL = createBox(`Trestle_Leg_L_${idx}`, 0.08, 0.94, 0.06, materials.powderMetalDark, [tx, 0.47, -0.42]);
  const tLegR = createBox(`Trestle_Leg_R_${idx}`, 0.08, 0.94, 0.06, materials.powderMetalDark, [tx, 0.47, 0.42]);
  const tTopBar = createBox(`Trestle_Top_Bar_${idx}`, 0.08, 0.06, 0.90, materials.powderMetalDark, [tx, 0.92, 0]);
  const tFoot = createBox(`Trestle_Foot_${idx}`, 0.10, 0.04, 0.96, materials.powderMetalDark, [tx, 0.02, 0]);
  communalGroup.add(tLegL);
  communalGroup.add(tLegR);
  communalGroup.add(tTopBar);
  communalGroup.add(tFoot);
});
const footStretcher = createCylinder('Communal_Foot_Stretcher', 0.022, 0.022, 4.2, 14, materials.brassTrim, [0, 0.28, 0], [0, 0, Math.PI / 2]);
communalGroup.add(footStretcher);

// 6 Swivel Bar Stools with Channel-Tufted Leatherette Seats
[-1.8, 0, 1.8].forEach((sx, idx) => {
  [-0.72, 0.72].forEach((sz, sideIdx) => {
    const stool = new THREE.Group();
    stool.name = `Bar_Stool_${idx}_${sideIdx}`;
    stool.position.set(sx, 0, sz);

    const sCushion = createCylinder('Stool_Seat_Cushion', 0.18, 0.18, 0.06, 20, materials.leatherEspresso, [0, 0.72, 0]);
    const sPlate = createCylinder('Stool_Seat_Plate', 0.185, 0.185, 0.015, 20, materials.powderMetalDark, [0, 0.685, 0]);
    const sCol = createCylinder('Stool_Column', 0.028, 0.028, 0.66, 14, materials.powderMetalDark, [0, 0.34, 0]);
    const sRing = createCylinder('Stool_Foot_Ring', 0.18, 0.18, 0.02, 18, materials.brassTrim, [0, 0.26, 0]);
    const sBase = createCylinder('Stool_Base_Disc', 0.22, 0.22, 0.02, 20, materials.powderMetalDark, [0, 0.01, 0]);

    stool.add(sCushion);
    stool.add(sPlate);
    stool.add(sCol);
    stool.add(sRing);
    stool.add(sBase);
    communalGroup.add(stool);
  });
});
furnitureGroup.add(communalGroup);

// 4. Lounge Nook: 2 Mid-Century Cognac Leather Armchairs & Carrara Marble Coffee Table
const loungeGroup = new THREE.Group();
loungeGroup.name = 'Lounge_Seating_Nook';
loungeGroup.position.set(0.6, 0, -4.6);

// Carrara Marble Coffee Table on Brass Hairpin Legs
const coffeeTop = createCylinder('Coffee_Table_Top', 0.48, 0.48, 0.03, 24, materials.whiteQuartz, [0, 0.44, 0]);
const coffeeRing = createCylinder('Coffee_Table_BrassRing', 0.49, 0.49, 0.01, 24, materials.brassTrim, [0, 0.43, 0]);
loungeGroup.add(coffeeTop);
loungeGroup.add(coffeeRing);

[0, (2 * Math.PI) / 3, (4 * Math.PI) / 3].forEach((ang, idx) => {
  const lx = Math.cos(ang) * 0.35;
  const lz = Math.sin(ang) * 0.35;
  const leg = createCylinder(`Coffee_Leg_${idx}`, 0.008, 0.008, 0.43, 10, materials.brassTrim, [lx, 0.215, lz], [0.15 * Math.sin(ang), 0, -0.15 * Math.cos(ang)]);
  loungeGroup.add(leg);
});

// 2 Mid-Century Armchairs
[-0.95, 0.95].forEach((ax, idx) => {
  const chair = new THREE.Group();
  chair.name = `Lounge_Armchair_${idx}`;
  chair.position.set(ax, 0, 0);
  chair.rotation.y = ax > 0 ? -Math.PI / 4 : Math.PI / 4;

  const shell = createBeveledBox('Lounge_Wood_Shell', 0.68, 0.42, 0.65, 0.03, materials.darkWalnut, [0, 0.32, 0]);
  const cushion = createBeveledBox('Lounge_Leather_Seat', 0.62, 0.16, 0.58, 0.025, materials.upholsteryTerracotta, [0, 0.40, 0.02]);
  const backCushion = createBeveledBox('Lounge_Leather_Back', 0.62, 0.48, 0.14, 0.025, materials.upholsteryTerracotta, [0, 0.66, -0.22], [0.25, 0, 0]);
  chair.add(shell);
  chair.add(cushion);
  chair.add(backCushion);

  // 4 Tapered Walnut Legs with Brass Tips
  [[-0.26, -0.24], [0.26, -0.24], [-0.26, 0.24], [0.26, 0.24]].forEach(([lx, lz], lIdx) => {
    const leg = createCylinder(`Lounge_Leg_${lIdx}`, 0.016, 0.010, 0.26, 10, materials.darkWalnut, [lx, 0.13, lz], [lz * 0.3, 0, -lx * 0.3]);
    const ferrule = createCylinder(`Lounge_Ferrule_${lIdx}`, 0.012, 0.010, 0.04, 10, materials.brassTrim, [lx, 0.02, lz]);
    chair.add(leg);
    chair.add(ferrule);
  });

  loungeGroup.add(chair);
});
furnitureGroup.add(loungeGroup);

rootScene.add(furnitureGroup);

// ── E. STORAGE & BACK-OF-HOUSE LOGISTICS ───────────────────────────────────────────
const storageGroup = new THREE.Group();
storageGroup.name = 'Storage_And_Logistics';
storageGroup.userData.layer = 'furniture';
storageGroup.position.set(-8.6, 0, 4.4);

// 2 Heavy Industrial Steel Shelving Units
[-1.2, 1.2].forEach((rx, idx) => {
  const rack = new THREE.Group();
  rack.name = `Industrial_Storage_Rack_${idx}`;
  rack.position.set(rx, 0, 0);

  // 4 Slotted Corner Angle Uprights
  [[-0.60, -0.40], [0.60, -0.40], [-0.60, 0.40], [0.60, 0.40]].forEach(([cx, cz], cIdx) => {
    const post = createBox(`Rack_Post_${cIdx}`, 0.04, 2.6, 0.04, materials.powderMetalDark, [cx, 1.3, cz]);
    rack.add(post);
  });

  // 4 Shelf Levels with Stored Coffee Sacks and Inventory Crates
  [0.35, 0.95, 1.55, 2.15].forEach((sy, sIdx) => {
    const deck = createBox(`Shelf_Deck_${sIdx}`, 1.24, 0.03, 0.84, materials.powderMetalDark, [0, sy, 0]);
    rack.add(deck);

    if (sIdx === 0 || sIdx === 1) {
      // Burlap Sacks of Coffee Origins
      [-0.32, 0.32].forEach((sx, sackIdx) => {
        const sack = createBeveledBox(`Coffee_Sack_${sIdx}_${sackIdx}`, 0.36, 0.48, 0.28, 0.04, materials.burlapSack, [sx, sy + 0.25, 0], [0, (sackIdx - 0.5) * 0.2, 0]);
        rack.add(sack);
      });
    } else {
      // Heavy Industrial Storage Totes
      [-0.35, 0.35].forEach((bx, boxIdx) => {
        const crate = createBeveledBox(`Inventory_Crate_${sIdx}_${boxIdx}`, 0.42, 0.32, 0.32, 0.015, materials.powderMetalDark, [bx, sy + 0.17, 0]);
        const label = createBox(`Crate_Label_${sIdx}_${boxIdx}`, 0.10, 0.06, 0.002, materials.wallPlaster, [bx, sy + 0.17, 0.162]);
        rack.add(crate);
        rack.add(label);
      });
    }
  });

  storageGroup.add(rack);
});

rootScene.add(storageGroup);

// ── F. BOTANICALS & DECORATIVE PROPS ───────────────────────────────────────────────
const decorGroup = new THREE.Group();
decorGroup.name = 'Foliage_And_Decor';
decorGroup.userData.layer = 'furniture';

// 3 Large Ceramic Planters with Layered Monstera Leaves
const planterCoords = [
  [-10.2, 0, -6.0],
  [10.2, 0, -6.0],
  [-10.2, 0, 1.8],
];

planterCoords.forEach(([px, py, pz], idx) => {
  const planterGroup = new THREE.Group();
  planterGroup.name = `Architectural_Planter_${idx}`;
  planterGroup.position.set(px, py, pz);

  const pot = createCylinder('Planter_Pot', 0.32, 0.24, 0.65, 20, materials.ceramicPlanter, [0, 0.325, 0]);
  const soil = createCylinder('Planter_Soil', 0.31, 0.31, 0.02, 18, materials.darkWalnut, [0, 0.64, 0]);
  planterGroup.add(pot);
  planterGroup.add(soil);

  // Layered Stylized Leaves
  [0, 1, 2, 3, 4, 5].forEach((lIdx) => {
    const ang = (lIdx * Math.PI) / 3;
    const leafMesh = createBeveledBox(`Monstera_Leaf_${lIdx}`, 0.24, 0.005, 0.42, 0.01, materials.foliageLeaf, [Math.cos(ang) * 0.24, 0.88 + (lIdx % 2) * 0.12, Math.sin(ang) * 0.24], [0.35 * Math.sin(ang), ang, -0.35 * Math.cos(ang)]);
    const stem = createCylinder(`Leaf_Stem_${lIdx}`, 0.008, 0.008, 0.32, 8, materials.foliageStems, [Math.cos(ang) * 0.12, 0.76, Math.sin(ang) * 0.12], [0.25 * Math.sin(ang), 0, -0.25 * Math.cos(ang)]);
    planterGroup.add(leafMesh);
    planterGroup.add(stem);
  });

  decorGroup.add(planterGroup);
});

// Large Framed Coffee Chalkboard Menu behind Barista Bar
const menuGroup = new THREE.Group();
menuGroup.name = 'Framed_Chalkboard_Menu';
menuGroup.position.set(-5.2, 2.35, -halfW + 0.18);

const menuFrame = createBeveledBox('Menu_Oak_Frame', 3.2, 1.4, 0.05, 0.015, materials.naturalOak, [0, 0, 0]);
const menuSlate = createBox('Menu_Slate_Board', 3.08, 1.28, 0.015, materials.chalkboard, [0, 0, 0.02]);
menuGroup.add(menuFrame);
menuGroup.add(menuSlate);
decorGroup.add(menuGroup);

rootScene.add(decorGroup);

// ── G. CEILING TRACK LIGHTS & SUSPENDED PENDANTS ──────────────────────────────────
const ceilingGroup = new THREE.Group();
ceilingGroup.name = 'Ceiling_Lighting_Rig';
ceilingGroup.userData.layer = 'ceiling';

// Industrial Track Lighting Rails
[-4.0, 0, 4.0].forEach((tz, idx) => {
  const track = createBox(`Lighting_Track_${idx}`, STORE_LENGTH - 2.0, 0.05, 0.05, materials.powderMetalDark, [0, STORE_HEIGHT - 0.15, tz]);
  ceilingGroup.add(track);

  // Spotlights along track
  [-8.0, -4.0, 0, 4.0, 8.0].forEach((sx, sIdx) => {
    const spotHead = createCylinder(`Spotlight_${idx}_${sIdx}`, 0.04, 0.055, 0.12, 12, materials.powderMetalDark, [sx, STORE_HEIGHT - 0.24, tz], [0.4, 0, 0]);
    ceilingGroup.add(spotHead);
  });
});

// Modern Suspended Brass Cone & Dome Pendant Lights over Counters & Communal Table
const pendantCoords = [
  [-5.6, -1.8], // Over POS Counter
  [-5.6, -3.8], // Over Barista Bar
  [-1.4, -2.4], // Over Hand-Brew Station
  [3.6, 0],     // Over Communal Table West
  [5.2, 0],     // Over Communal Table Center
  [6.8, 0],     // Over Communal Table East
];

pendantCoords.forEach(([px, pz], idx) => {
  const pendant = new THREE.Group();
  pendant.name = `Brass_Pendant_Light_${idx}`;
  pendant.position.set(px, STORE_HEIGHT, pz);

  const cord = createCylinder('Pendant_Cord', 0.004, 0.004, 1.6, 8, materials.powderMetalDark, [0, -0.80, 0]);
  const canopy = createCylinder('Pendant_Brass_Shade', 0.06, 0.22, 0.18, 18, materials.brassTrim, [0, -1.65, 0]);
  const bulb = createCylinder('Pendant_Filament_Bulb', 0.035, 0.035, 0.05, 12, materials.lampFilament, [0, -1.72, 0]);

  pendant.add(cord);
  pendant.add(canopy);
  pendant.add(bulb);
  ceilingGroup.add(pendant);
});

rootScene.add(ceilingGroup);

console.log('📦 Complete coffee shop scene assembled with all style-unified groups.');

// ── 5. Export Scene to glTF 2.0 Binary Container (.glb) ───────────────────────────
console.log('⚙️ Exporting GLB with glTF 2.0 binary formatting...');

const exporter = new GLTFExporter();
exporter.parse(
  rootScene,
  (glbArrayBuffer) => {
    const buffer = Buffer.from(glbArrayBuffer);

    // Save to public models directory (for Vite server)
    const outPathPublic = path.resolve(__dirname, '../ShiftSync-Web/public/models/ShiftSync_CoffeeShop_DigitalTwin.glb');
    fs.writeFileSync(outPathPublic, buffer);
    console.log(`✅ Saved GLB asset to: ${outPathPublic} (${(buffer.length / 1024).toFixed(1)} KB)`);

    // Save to repository root
    const outPathRoot = path.resolve(__dirname, '../ShiftSync_CoffeeShop_DigitalTwin.glb');
    fs.writeFileSync(outPathRoot, buffer);
    console.log(`✅ Saved GLB asset to: ${outPathRoot} (${(buffer.length / 1024).toFixed(1)} KB)`);

    console.log('🎉 Generation completed successfully!');
  },
  (err) => {
    console.error('❌ GLTFExporter Error:', err);
    process.exit(1);
  },
  { binary: true }
);
