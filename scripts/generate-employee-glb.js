/**
 * generate-employee-glb.js
 * Generates a complete, high-fidelity, standalone 3D Humanoid Employee Model
 * as a glTF 2.0 binary (.glb) asset for ShiftSync Workforce Management.
 * 
 * Key Features:
 * - Anatomically proportioned stylized humanoid character (Height: ~1.72m)
 * - Sculpted organic contours: Smooth curved head, dimensional hair styling, facial features
 * - Professional F&B uniform: Collared shirt, barista utility apron with straps & pockets, ShiftSync ID badge
 * - Articulated joint hierarchy (shoulders, elbows, wrists, hips, knees, ankles) for fluid animations
 * - PBR Metallic-Roughness Materials (natural skin, apron canvas, brass hardware, leather shoes)
 * - Exported directly to /models/ShiftSync_Employee.glb
 */

class FileReaderPolyfill {
  constructor() {
    this.result = null;
    this.onloadend = null;
  }
  async readAsArrayBuffer(blob) {
    this.result = await blob.arrayBuffer();
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

console.log('🚀 Starting ShiftSync 3D Employee Character GLB Generation...');

// ── 1. Materials Palette (High-Detail PBR) ─────────────────────────
const materials = {
  skin: new THREE.MeshStandardMaterial({
    name: 'mat_employee_skin',
    color: 0xF7D5C3,
    roughness: 0.62,
    metalness: 0.02,
  }),
  hair: new THREE.MeshStandardMaterial({
    name: 'mat_employee_hair',
    color: 0x241812, // Espresso dark brown
    roughness: 0.45,
    metalness: 0.05,
  }),
  eyes: new THREE.MeshStandardMaterial({
    name: 'mat_employee_eyes',
    color: 0x0F172A,
    roughness: 0.15,
    metalness: 0.10,
  }),
  eyeCatchlight: new THREE.MeshBasicMaterial({
    name: 'mat_eye_catchlight',
    color: 0xFFFFFF,
  }),
  shirt: new THREE.MeshStandardMaterial({
    name: 'mat_employee_shirt',
    color: 0x1E3A8A, // ShiftSync Corporate Navy
    roughness: 0.72,
    metalness: 0.02,
  }),
  shirtCollar: new THREE.MeshStandardMaterial({
    name: 'mat_employee_collar',
    color: 0xF8FAFC, // Crisp white under-collar
    roughness: 0.65,
    metalness: 0.02,
  }),
  apron: new THREE.MeshStandardMaterial({
    name: 'mat_employee_apron',
    color: 0x334155, // Slate / Barista Charcoal Canvas
    roughness: 0.80,
    metalness: 0.02,
  }),
  apronLeatherStraps: new THREE.MeshStandardMaterial({
    name: 'mat_apron_straps',
    color: 0x854D0E, // Amber Cognac Leather
    roughness: 0.55,
    metalness: 0.08,
  }),
  brassHardware: new THREE.MeshStandardMaterial({
    name: 'mat_brass_hardware',
    color: 0xD4AF37, // Polished Brass Grommets
    roughness: 0.25,
    metalness: 0.88,
  }),
  badgeWhite: new THREE.MeshStandardMaterial({
    name: 'mat_id_badge',
    color: 0xFFFFFF,
    roughness: 0.35,
    metalness: 0.10,
  }),
  badgeLanyard: new THREE.MeshStandardMaterial({
    name: 'mat_badge_lanyard',
    color: 0x0284C7, // ShiftSync Sky Blue Ribbon
    roughness: 0.60,
    metalness: 0.02,
  }),
  trousers: new THREE.MeshStandardMaterial({
    name: 'mat_employee_trousers',
    color: 0x1E293B, // Tailored dark charcoal chinos
    roughness: 0.75,
    metalness: 0.02,
  }),
  shoesLeather: new THREE.MeshStandardMaterial({
    name: 'mat_shoes_leather',
    color: 0x0F172A, // Black leather oxfords
    roughness: 0.32,
    metalness: 0.15,
  }),
  shoesSole: new THREE.MeshStandardMaterial({
    name: 'mat_shoes_sole',
    color: 0xF1F5F9, // Clean white sneaker / wedge sole
    roughness: 0.85,
    metalness: 0.01,
  }),
  tabletBody: new THREE.MeshStandardMaterial({
    name: 'mat_tablet_body',
    color: 0x0F172A,
    roughness: 0.28,
    metalness: 0.75,
  }),
  tabletScreen: new THREE.MeshStandardMaterial({
    name: 'mat_tablet_screen',
    color: 0x0284C7,
    emissive: 0x0284C7,
    emissiveIntensity: 0.6,
    roughness: 0.12,
  }),
};

// ── 2. Helper Modeling Functions ──────────────────────────────────
function createSmoothCylinder(name, radiusTop, radiusBottom, height, segments, material, pos = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1]) {
  const geo = new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments);
  const mesh = new THREE.Mesh(geo, material);
  mesh.name = name;
  mesh.position.set(...pos);
  mesh.rotation.set(...rot);
  mesh.scale.set(...scale);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function createSmoothSphere(name, radius, widthSegments, heightSegments, material, pos = [0, 0, 0], scale = [1, 1, 1]) {
  const geo = new THREE.SphereGeometry(radius, widthSegments, heightSegments);
  const mesh = new THREE.Mesh(geo, material);
  mesh.name = name;
  mesh.position.set(...pos);
  mesh.scale.set(...scale);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

// ── 3. Build Complete Character ───────────────────────────────────
function buildEmployeeCharacter() {
  const characterRoot = new THREE.Group();
  characterRoot.name = 'ShiftSync_Employee_Root';
  characterRoot.userData.isEmployeeModel = true;

  // ── Pelvis / Hips Root Node (Height: ~0.92m) ─────────────────────
  const hipsGroup = new THREE.Group();
  hipsGroup.name = 'Hips';
  hipsGroup.position.set(0, 0.92, 0);
  characterRoot.add(hipsGroup);

  // Pelvis mesh (tapered comfort waist)
  const pelvisMesh = createSmoothCylinder('Pelvis', 0.17, 0.155, 0.16, 20, materials.trousers, [0, 0, 0], [0, 0, 0], [1.1, 1.0, 0.85]);
  hipsGroup.add(pelvisMesh);

  // ── Torso / Spine / Chest Hierarchy ─────────────────────────────
  const spineGroup = new THREE.Group();
  spineGroup.name = 'Spine';
  spineGroup.position.set(0, 0.08, 0);
  hipsGroup.add(spineGroup);

  // Lower waist & shirt
  const waistMesh = createSmoothCylinder('Torso_Waist', 0.175, 0.165, 0.18, 22, materials.shirt, [0, 0.09, 0], [0, 0, 0], [1.14, 1.0, 0.82]);
  spineGroup.add(waistMesh);

  // Chest Group (Pivot at mid-chest)
  const chestGroup = new THREE.Group();
  chestGroup.name = 'Chest';
  chestGroup.position.set(0, 0.18, 0);
  spineGroup.add(chestGroup);

  // Upper chest with natural shoulder taper
  const chestMesh = createSmoothCylinder('Torso_Chest', 0.205, 0.175, 0.24, 22, materials.shirt, [0, 0.12, 0], [0, 0, 0], [1.18, 1.0, 0.80]);
  chestGroup.add(chestMesh);

  // Barista Utility Apron Bib (covers front of chest & waist)
  const apronBibGeo = new THREE.CylinderGeometry(0.208, 0.172, 0.38, 16, 1, false, -Math.PI * 0.40, Math.PI * 0.80);
  const apronBibMesh = new THREE.Mesh(apronBibGeo, materials.apron);
  apronBibMesh.name = 'Apron_Bib';
  apronBibMesh.position.set(0, 0.03, 0.005);
  apronBibMesh.scale.set(1.19, 1.0, 0.82);
  apronBibMesh.castShadow = true;
  chestGroup.add(apronBibMesh);

  // Apron Front Pocket
  const pocketGeo = new THREE.BoxGeometry(0.18, 0.12, 0.015);
  const pocketMesh = new THREE.Mesh(pocketGeo, materials.apron);
  pocketMesh.name = 'Apron_Pocket';
  pocketMesh.position.set(0, -0.04, 0.165);
  chestGroup.add(pocketMesh);

  // Cross-back leather apron straps
  const strapL = createSmoothCylinder('Apron_Strap_L', 0.015, 0.015, 0.32, 12, materials.apronLeatherStraps, [-0.10, 0.14, 0.05], [0.35, 0, -0.25]);
  const strapR = createSmoothCylinder('Apron_Strap_R', 0.015, 0.015, 0.32, 12, materials.apronLeatherStraps, [0.10, 0.14, 0.05], [0.35, 0, 0.25]);
  chestGroup.add(strapL);
  chestGroup.add(strapR);

  // Brass Grommets at strap anchors
  const grommetL = createSmoothCylinder('Grommet_L', 0.012, 0.012, 0.01, 14, materials.brassHardware, [-0.09, 0.21, 0.155], [Math.PI / 2, 0, 0]);
  const grommetR = createSmoothCylinder('Grommet_R', 0.012, 0.012, 0.01, 14, materials.brassHardware, [0.09, 0.21, 0.155], [Math.PI / 2, 0, 0]);
  chestGroup.add(grommetL);
  chestGroup.add(grommetR);

  // ShiftSync Lanyard & Staff ID Badge
  const badgeMesh = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.105, 0.008), materials.badgeWhite);
  badgeMesh.name = 'Employee_ID_Badge';
  badgeMesh.position.set(0.07, 0.06, 0.175);
  badgeMesh.rotation.z = -0.06;
  chestGroup.add(badgeMesh);

  // ── Neck & Head Group ───────────────────────────────────────────
  const neckGroup = new THREE.Group();
  neckGroup.name = 'Neck';
  neckGroup.position.set(0, 0.24, 0);
  chestGroup.add(neckGroup);

  const neckMesh = createSmoothCylinder('Neck_Cylinder', 0.065, 0.075, 0.10, 18, materials.skin, [0, 0.05, 0]);
  neckGroup.add(neckMesh);

  // Shirt Collar Fold
  const collarMesh = createSmoothCylinder('Shirt_Collar', 0.095, 0.105, 0.05, 18, materials.shirtCollar, [0, 0.02, 0], [0, 0, 0], [1.1, 1.0, 0.9]);
  neckGroup.add(collarMesh);

  // Head Pivot Group (Base of skull for natural tilting)
  const headGroup = new THREE.Group();
  headGroup.name = 'Head';
  headGroup.position.set(0, 0.10, 0);
  neckGroup.add(headGroup);

  // Sculpted Cranium & Face (Smooth contoured stylized humanoid)
  const headMesh = createSmoothSphere('Head_Cranium', 0.135, 26, 24, materials.skin, [0, 0.12, 0], [0.95, 1.08, 1.02]);
  headGroup.add(headMesh);

  // Stylized Hair Volume (Cap & Swept bangs)
  const hairCrown = createSmoothSphere('Hair_Crown', 0.144, 24, 22, materials.hair, [0, 0.145, -0.015], [0.98, 1.04, 1.06]);
  headGroup.add(hairCrown);

  // Front Swept Bangs Volume
  const bangsGeo = new THREE.CylinderGeometry(0.146, 0.142, 0.07, 18, 1, false, -Math.PI * 0.45, Math.PI * 0.90);
  const bangsMesh = new THREE.Mesh(bangsGeo, materials.hair);
  bangsMesh.name = 'Hair_Bangs';
  bangsMesh.position.set(0, 0.20, 0.02);
  bangsMesh.rotation.x = 0.28;
  headGroup.add(bangsMesh);

  // Left & Right Sideburns
  const sideburnL = createSmoothCylinder('Sideburn_L', 0.02, 0.015, 0.07, 10, materials.hair, [-0.125, 0.13, 0.02]);
  const sideburnR = createSmoothCylinder('Sideburn_R', 0.02, 0.015, 0.07, 10, materials.hair, [0.125, 0.13, 0.02]);
  headGroup.add(sideburnL);
  headGroup.add(sideburnR);

  // Ears
  const earL = createSmoothSphere('Ear_L', 0.03, 12, 10, materials.skin, [-0.132, 0.12, 0], [0.5, 1.2, 0.8]);
  const earR = createSmoothSphere('Ear_R', 0.03, 12, 10, materials.skin, [0.132, 0.12, 0], [0.5, 1.2, 0.8]);
  headGroup.add(earL);
  headGroup.add(earR);

  // 3D Stylized Eyes with Catchlights
  const eyeL = createSmoothSphere('Eye_L', 0.018, 14, 12, materials.eyes, [-0.046, 0.13, 0.128], [1.0, 1.15, 0.6]);
  const eyeR = createSmoothSphere('Eye_R', 0.018, 14, 12, materials.eyes, [0.046, 0.13, 0.128], [1.0, 1.15, 0.6]);
  headGroup.add(eyeL);
  headGroup.add(eyeR);

  const catchlightL = createSmoothSphere('Eye_Catchlight_L', 0.005, 8, 8, materials.eyeCatchlight, [-0.042, 0.136, 0.138]);
  const catchlightR = createSmoothSphere('Eye_Catchlight_R', 0.005, 8, 8, materials.eyeCatchlight, [0.050, 0.136, 0.138]);
  headGroup.add(catchlightL);
  headGroup.add(catchlightR);

  // Eyebrows
  const browL = createSmoothCylinder('Brow_L', 0.004, 0.005, 0.045, 8, materials.hair, [-0.048, 0.155, 0.125], [0, 0, 0.18]);
  const browR = createSmoothCylinder('Brow_R', 0.004, 0.005, 0.045, 8, materials.hair, [0.048, 0.155, 0.125], [0, 0, -0.18]);
  headGroup.add(browL);
  headGroup.add(browR);

  // ── Left Arm Hierarchy (Shoulder -> Elbow -> Wrist) ─────────────
  const leftShoulderGroup = new THREE.Group();
  leftShoulderGroup.name = 'LeftShoulder';
  leftShoulderGroup.position.set(-0.24, 0.20, 0);
  chestGroup.add(leftShoulderGroup);

  const leftShoulderCap = createSmoothSphere('LeftShoulder_Cap', 0.065, 16, 14, materials.shirt, [0, 0, 0]);
  leftShoulderGroup.add(leftShoulderCap);

  const leftUpperArmMesh = createSmoothCylinder('LeftUpperArm', 0.054, 0.046, 0.24, 16, materials.shirt, [0, -0.12, 0]);
  leftShoulderGroup.add(leftUpperArmMesh);

  // Left Elbow
  const leftElbowGroup = new THREE.Group();
  leftElbowGroup.name = 'LeftElbow';
  leftElbowGroup.position.set(0, -0.24, 0);
  leftShoulderGroup.add(leftElbowGroup);

  const leftForearmMesh = createSmoothCylinder('LeftForearm', 0.046, 0.038, 0.22, 16, materials.skin, [0, -0.11, 0]);
  leftElbowGroup.add(leftForearmMesh);

  // Left Hand & ShiftSync Tablet
  const leftWristGroup = new THREE.Group();
  leftWristGroup.name = 'LeftWrist';
  leftWristGroup.position.set(0, -0.22, 0);
  leftElbowGroup.add(leftWristGroup);

  const leftHandMesh = createSmoothSphere('LeftHand', 0.042, 14, 12, materials.skin, [0, -0.03, 0], [0.8, 1.1, 0.8]);
  leftWristGroup.add(leftHandMesh);

  // Manager Tablet held in left hand
  const tabletMesh = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.24, 0.012), materials.tabletBody);
  tabletMesh.name = 'Manager_Tablet_Body';
  tabletMesh.position.set(0.04, -0.02, 0.06);
  tabletMesh.rotation.set(-0.35, 0.2, -0.15);
  leftWristGroup.add(tabletMesh);

  const screenMesh = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.22, 0.003), materials.tabletScreen);
  screenMesh.name = 'Manager_Tablet_Screen';
  screenMesh.position.set(0.04, -0.02, 0.067);
  screenMesh.rotation.set(-0.35, 0.2, -0.15);
  leftWristGroup.add(screenMesh);

  // ── Right Arm Hierarchy (Shoulder -> Elbow -> Wrist) ────────────
  const rightShoulderGroup = new THREE.Group();
  rightShoulderGroup.name = 'RightShoulder';
  rightShoulderGroup.position.set(0.24, 0.20, 0);
  chestGroup.add(rightShoulderGroup);

  const rightShoulderCap = createSmoothSphere('RightShoulder_Cap', 0.065, 16, 14, materials.shirt, [0, 0, 0]);
  rightShoulderGroup.add(rightShoulderCap);

  const rightUpperArmMesh = createSmoothCylinder('RightUpperArm', 0.054, 0.046, 0.24, 16, materials.shirt, [0, -0.12, 0]);
  rightShoulderGroup.add(rightUpperArmMesh);

  // Right Elbow
  const rightElbowGroup = new THREE.Group();
  rightElbowGroup.name = 'RightElbow';
  rightElbowGroup.position.set(0, -0.24, 0);
  rightShoulderGroup.add(rightElbowGroup);

  const rightForearmMesh = createSmoothCylinder('RightForearm', 0.046, 0.038, 0.22, 16, materials.skin, [0, -0.11, 0]);
  rightElbowGroup.add(rightForearmMesh);

  // Right Hand
  const rightWristGroup = new THREE.Group();
  rightWristGroup.name = 'RightWrist';
  rightWristGroup.position.set(0, -0.22, 0);
  rightElbowGroup.add(rightWristGroup);

  const rightHandMesh = createSmoothSphere('RightHand', 0.042, 14, 12, materials.skin, [0, -0.03, 0], [0.8, 1.1, 0.8]);
  rightWristGroup.add(rightHandMesh);

  // ── Left Leg Hierarchy (Hip -> Knee -> Ankle -> Shoe) ───────────
  const leftHipGroup = new THREE.Group();
  leftHipGroup.name = 'LeftHip';
  leftHipGroup.position.set(-0.11, -0.06, 0);
  hipsGroup.add(leftHipGroup);

  const leftThighMesh = createSmoothCylinder('LeftThigh', 0.082, 0.066, 0.38, 18, materials.trousers, [0, -0.19, 0]);
  leftHipGroup.add(leftThighMesh);

  // Left Knee
  const leftKneeGroup = new THREE.Group();
  leftKneeGroup.name = 'LeftKnee';
  leftKneeGroup.position.set(0, -0.38, 0);
  leftHipGroup.add(leftKneeGroup);

  const leftKneeCap = createSmoothSphere('LeftKnee_Cap', 0.066, 14, 12, materials.trousers, [0, 0, 0.015]);
  leftKneeGroup.add(leftKneeCap);

  const leftCalfMesh = createSmoothCylinder('LeftCalf', 0.065, 0.052, 0.36, 18, materials.trousers, [0, -0.18, 0]);
  leftKneeGroup.add(leftCalfMesh);

  // Left Ankle & Shoe
  const leftAnkleGroup = new THREE.Group();
  leftAnkleGroup.name = 'LeftAnkle';
  leftAnkleGroup.position.set(0, -0.36, 0);
  leftKneeGroup.add(leftAnkleGroup);

  // Ergonomic Shoe Upper
  const leftShoeUpper = createSmoothSphere('LeftShoe_Upper', 0.068, 16, 14, materials.shoesLeather, [0, -0.04, 0.04], [0.95, 0.75, 1.6]);
  leftAnkleGroup.add(leftShoeUpper);

  // Shoe Sole Rim
  const leftShoeSole = createSmoothCylinder('LeftShoe_Sole', 0.075, 0.078, 0.032, 18, materials.shoesSole, [0, -0.075, 0.04], [0, 0, 0], [0.95, 1.0, 1.6]);
  leftAnkleGroup.add(leftShoeSole);

  // ── Right Leg Hierarchy (Hip -> Knee -> Ankle -> Shoe) ──────────
  const rightHipGroup = new THREE.Group();
  rightHipGroup.name = 'RightHip';
  rightHipGroup.position.set(0.11, -0.06, 0);
  hipsGroup.add(rightHipGroup);

  const rightThighMesh = createSmoothCylinder('RightThigh', 0.082, 0.066, 0.38, 18, materials.trousers, [0, -0.19, 0]);
  rightHipGroup.add(rightThighMesh);

  // Right Knee
  const rightKneeGroup = new THREE.Group();
  rightKneeGroup.name = 'RightKnee';
  rightKneeGroup.position.set(0, -0.38, 0);
  rightHipGroup.add(rightKneeGroup);

  const rightKneeCap = createSmoothSphere('RightKnee_Cap', 0.066, 14, 12, materials.trousers, [0, 0, 0.015]);
  rightKneeGroup.add(rightKneeCap);

  const rightCalfMesh = createSmoothCylinder('RightCalf', 0.065, 0.052, 0.36, 18, materials.trousers, [0, -0.18, 0]);
  rightKneeGroup.add(rightCalfMesh);

  // Right Ankle & Shoe
  const rightAnkleGroup = new THREE.Group();
  rightAnkleGroup.name = 'RightAnkle';
  rightAnkleGroup.position.set(0, -0.36, 0);
  rightKneeGroup.add(rightAnkleGroup);

  // Ergonomic Shoe Upper
  const rightShoeUpper = createSmoothSphere('RightShoe_Upper', 0.068, 16, 14, materials.shoesLeather, [0, -0.04, 0.04], [0.95, 0.75, 1.6]);
  rightAnkleGroup.add(rightShoeUpper);

  // Shoe Sole Rim
  const rightShoeSole = createSmoothCylinder('RightShoe_Sole', 0.075, 0.078, 0.032, 18, materials.shoesSole, [0, -0.075, 0.04], [0, 0, 0], [0.95, 1.0, 1.6]);
  rightAnkleGroup.add(rightShoeSole);

  return characterRoot;
}

// ── 4. Export glTF 2.0 Binary (.glb) ──────────────────────────────
const characterScene = buildEmployeeCharacter();

const exporter = new GLTFExporter();
const exportOptions = {
  binary: true,
  embedImages: true,
  includeCustomExtensions: true,
};

console.log('📦 Serializing ShiftSync 3D Employee Character to glTF 2.0 Binary...');
exporter.parse(
  characterScene,
  (gltfBinary) => {
    const buffer = Buffer.from(gltfBinary);
    const outputPathWeb = path.resolve(__dirname, '../ShiftSync-Web/public/models/ShiftSync_Employee.glb');
    const outputPathBackend = path.resolve(__dirname, '../shiftsync-backend/ShiftSync_Employee.glb');

    fs.mkdirSync(path.dirname(outputPathWeb), { recursive: true });
    fs.writeFileSync(outputPathWeb, buffer);
    console.log(`✅ Web GLB written to: ${outputPathWeb} (${(buffer.length / 1024).toFixed(1)} KB)`);

    try {
      fs.writeFileSync(outputPathBackend, buffer);
      console.log(`✅ Backend GLB copy written to: ${outputPathBackend}`);
    } catch (e) {
      // optional
    }

    // Geometry statistics
    let meshCount = 0;
    let triCount = 0;
    characterScene.traverse((child) => {
      if (child.isMesh && child.geometry) {
        meshCount++;
        const pos = child.geometry.attributes.position;
        if (child.geometry.index) {
          triCount += child.geometry.index.count / 3;
        } else if (pos) {
          triCount += pos.count / 3;
        }
      }
    });

    console.log('🎉 3D Employee Model Generation Finished Successfully!');
    console.log(`   • Meshes: ${meshCount}`);
    console.log(`   • Triangles: ${triCount.toLocaleString()}`);
    console.log(`   • File Size: ${(buffer.length / 1024).toFixed(2)} KB`);
    console.log('   • Articulated Joints: Spine, Neck, Head, Shoulders, Elbows, Wrists, Hips, Knees, Ankles');
  },
  (err) => {
    console.error('❌ GLTF Export Error:', err);
    process.exit(1);
  },
  exportOptions
);
