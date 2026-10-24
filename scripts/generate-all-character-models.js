/**
 * generate-all-character-models.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Sinh bộ 4 mô hình 3D Nhân Sự F&B Hoàn Chỉnh chuẩn glTF 2.0 Binary:
 * 1. ShiftSync_Manager.glb  — Quản lý Cửa Hàng (Áo Polo Navy, Bảng Tên Vàng, Tablet iPad)
 * 2. ShiftSync_Barista.glb  — Thợ Pha Chế Hiện Đại (Sơ mi đen xắn tay, Tạp dề da Espresso, Ca Latte Art)
 * 3. ShiftSync_Cashier.glb  — Thu Ngân & Phục Vụ (Áo Be kem, Tạp dề lửng eo, Tai nghe Headset, Máy POS)
 * 4. ShiftSync_Chef.glb     — Đầu Bếp Bánh Ngọt (Áo Chef Coat trắng viền đen, Mũ Beret Bếp, Khay Bánh)
 * 
 * Toàn bộ mô hình tuân thủ quy chuẩn:
 * - Hình học hữu cơ bo cong mượt mà, vóc dáng chuẩn công thái học (~1.72m).
 * - KHÔNG ghép các khối layer phẳng chắp vá.
 * - Khớp chi động học hoàn chỉnh (Shoulders, Elbows, Wrists, Hips, Knees, Ankles).
 * - Hiệu năng 60 FPS locked, tệp gọn nhẹ ~300KB - 400KB.
 * ─────────────────────────────────────────────────────────────────────────────
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

console.log('🚀 Bắt đầu tạo bộ sưu tập 4 mô hình 3D Nhân sự F&B Chuyên Nghiệp...');

// ── Bảng Màu & Vật Liệu PBR Dùng Chung ─────────────────────────────────────
const sharedMaterials = {
  skinAsian: new THREE.MeshStandardMaterial({
    name: 'mat_skin_asian',
    color: 0xF2C6A0, // Làn da sáng ấm tự nhiên
    roughness: 0.62,
    metalness: 0.02,
  }),
  hairBlack: new THREE.MeshStandardMaterial({
    name: 'mat_hair_black',
    color: 0x18181B, // Tóc đen tự nhiên ánh mượt
    roughness: 0.38,
    metalness: 0.08,
  }),
  hairBrown: new THREE.MeshStandardMaterial({
    name: 'mat_hair_brown',
    color: 0x332219, // Nâu hạt dẻ hiện đại
    roughness: 0.42,
    metalness: 0.06,
  }),
  eyesDark: new THREE.MeshStandardMaterial({
    name: 'mat_eyes_dark',
    color: 0x0F172A,
    roughness: 0.12,
    metalness: 0.15,
  }),
  eyeCatchlight: new THREE.MeshBasicMaterial({
    name: 'mat_eye_catchlight',
    color: 0xFFFFFF,
  }),
  eyeWhite: new THREE.MeshStandardMaterial({
    name: 'mat_eye_white',
    color: 0xF8FAFC, // Lòng trắng mắt tự nhiên
    roughness: 0.20,
    metalness: 0.02,
  }),
  blushPink: new THREE.MeshStandardMaterial({
    name: 'mat_blush_pink',
    color: 0xF4A596, // Má hồng hào tươi tắn tự nhiên
    roughness: 0.85,
    metalness: 0.0,
  }),
  lipsNatural: new THREE.MeshStandardMaterial({
    name: 'mat_lips_natural',
    color: 0xDE7A85, // Đôi môi hồng đào tươi tắn cười thân thiện
    roughness: 0.40,
    metalness: 0.02,
  }),
  trousersCharcoal: new THREE.MeshStandardMaterial({
    name: 'mat_trousers_charcoal',
    color: 0x1E293B, // Quần tây âu xám than
    roughness: 0.75,
    metalness: 0.02,
  }),
  trousersBlack: new THREE.MeshStandardMaterial({
    name: 'mat_trousers_black',
    color: 0x0F172A,
    roughness: 0.72,
    metalness: 0.02,
  }),
  shoesLeatherBlack: new THREE.MeshStandardMaterial({
    name: 'mat_shoes_leather_black',
    color: 0x0F172A,
    roughness: 0.30,
    metalness: 0.18,
  }),
  shoesSneakerWhite: new THREE.MeshStandardMaterial({
    name: 'mat_shoes_sneaker_white',
    color: 0xF8FAFC,
    roughness: 0.55,
    metalness: 0.05,
  }),
  shoesSoleWhite: new THREE.MeshStandardMaterial({
    name: 'mat_shoes_sole_white',
    color: 0xE2E8F0,
    roughness: 0.85,
    metalness: 0.01,
  }),
  brassGold: new THREE.MeshStandardMaterial({
    name: 'mat_brass_gold',
    color: 0xD4AF37,
    roughness: 0.25,
    metalness: 0.88,
  }),
  stainlessSteel: new THREE.MeshStandardMaterial({
    name: 'mat_stainless_steel',
    color: 0xE2E8F0,
    roughness: 0.18,
    metalness: 0.92,
  }),
};

// ── Hàm Tiện Ích Dựng Hình Hữu Cơ Bo Cong ──────────────────────────────────
function createSmoothCylinder(name, rTop, rBottom, height, segments, mat, pos = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1]) {
  const geo = new THREE.CylinderGeometry(rTop, rBottom, height, segments);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = name;
  mesh.position.set(...pos);
  mesh.rotation.set(...rot);
  mesh.scale.set(...scale);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function createSmoothSphere(name, radius, wSeg, hSeg, mat, pos = [0, 0, 0], scale = [1, 1, 1]) {
  const geo = new THREE.SphereGeometry(radius, wSeg, hSeg);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = name;
  mesh.position.set(...pos);
  mesh.scale.set(...scale);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

// ── Dựng Phần Đầu & Gương Mặt Stylized Chuẩn Mực ───────────────────────────
function buildHeadGroup(hairMat, hairStyle = 'barista') {
  const headGroup = new THREE.Group();
  headGroup.name = 'Head';

  // 1. Hộp sọ gương mặt Stylized mượt mà tỉ lệ vàng (Clean Sculpted Cranium)
  const headMesh = createSmoothSphere('Head_Cranium', 0.135, 28, 24, sharedMaterials.skinAsian, [0, 0.12, 0], [0.95, 1.08, 1.02]);
  headGroup.add(headMesh);

  // 2. Mái tóc bao bọc đỉnh đầu và sau gáy (Hair Crown)
  const hairCrown = createSmoothSphere('Hair_Crown', 0.144, 24, 22, hairMat, [0, 0.145, -0.015], [0.98, 1.04, 1.06]);
  headGroup.add(hairCrown);

  // 3. Tóc mai hai bên gọn gàng ôm sát đầu (Sideburns)
  const sideburnL = createSmoothCylinder('Sideburn_L', 0.02, 0.015, 0.07, 10, hairMat, [-0.125, 0.13, 0.02]);
  const sideburnR = createSmoothCylinder('Sideburn_R', 0.02, 0.015, 0.07, 10, hairMat, [0.125, 0.13, 0.02]);
  headGroup.add(sideburnL);
  headGroup.add(sideburnR);

  // 4. Đôi tai (Ears)
  const earL = createSmoothSphere('Ear_L', 0.03, 14, 10, sharedMaterials.skinAsian, [-0.132, 0.12, 0], [0.5, 1.2, 0.8]);
  const earR = createSmoothSphere('Ear_R', 0.03, 14, 10, sharedMaterials.skinAsian, [0.132, 0.12, 0], [0.5, 1.2, 0.8]);
  headGroup.add(earL);
  headGroup.add(earR);

  // 5. Đôi mắt 3D Stylized to tròn, sáng ngời (Eyes with Catchlights)
  [-0.046, 0.046].forEach((eyeX) => {
    const isRight = eyeX > 0;
    const eye = createSmoothSphere(isRight ? 'Eye_R' : 'Eye_L', 0.018, 16, 12, sharedMaterials.eyesDark, [eyeX, 0.13, 0.128], [1.0, 1.15, 0.6]);
    headGroup.add(eye);

    const catchlight = createSmoothSphere(isRight ? 'Catchlight_R' : 'Catchlight_L', 0.005, 8, 8, sharedMaterials.eyeCatchlight, [eyeX + (isRight ? 0.004 : -0.004), 0.136, 0.138]);
    headGroup.add(catchlight);

    // Lông mày thanh tú sắc sảo (Eyebrows)
    const brow = createSmoothCylinder(isRight ? 'Brow_R' : 'Brow_L', 0.004, 0.005, 0.045, 8, hairMat, [eyeX, 0.155, 0.125], [0, 0, isRight ? -0.18 : 0.18]);
    headGroup.add(brow);
  });

  // 6. Sống mũi nhỏ thanh tú & Đôi môi mỉm cười nhẹ nhàng thân thiện
  const nose = createSmoothSphere('Nose_Tip', 0.012, 14, 12, sharedMaterials.skinAsian, [0, 0.116, 0.138], [1.0, 1.1, 0.9]);
  headGroup.add(nose);

  const lips = createSmoothCylinder('Lips_Smile', 0.005, 0.005, 0.038, 16, sharedMaterials.lipsNatural, [0, 0.082, 0.132], [0, 0, Math.PI / 2], [0.6, 1.0, 0.6]);
  headGroup.add(lips);

  // 7. Kiểu tóc đặc thù theo từng vai trò F&B (Khối tóc hữu cơ bo cong mềm mại)
  if (hairStyle === 'barista') {
    // ☕ Barista: Soft Stylized Quiff (Khối tóc vuốt phồng hữu cơ mềm mại)
    const mainQuiff = createSmoothSphere('Barista_MainQuiff', 0.082, 18, 16, hairMat, [0.03, 0.22, 0.045], [1.3, 0.75, 1.0]);
    mainQuiff.rotation.set(-0.25, 0.15, -0.20);
    headGroup.add(mainQuiff);

    const sideTress = createSmoothSphere('Barista_SideTress', 0.065, 16, 14, hairMat, [-0.065, 0.20, 0.035], [1.0, 0.70, 0.95]);
    sideTress.rotation.set(-0.20, -0.10, 0.15);
    headGroup.add(sideTress);

    const frontLock = createSmoothSphere('Barista_FrontLock', 0.045, 14, 12, hairMat, [0.01, 0.205, 0.075], [1.1, 0.60, 0.85]);
    frontLock.rotation.set(-0.35, 0.10, -0.10);
    headGroup.add(frontLock);

  } else if (hairStyle === 'manager') {
    // 👔 Manager: Gentleman 7/3 Part (Khối tóc rẽ ngôi 7/3 lịch thiệp)
    const mgrPartR = createSmoothSphere('Manager_PartR', 0.085, 18, 16, hairMat, [0.04, 0.21, 0.04], [1.25, 0.70, 1.05]);
    mgrPartR.rotation.set(-0.20, 0.20, -0.25);
    headGroup.add(mgrPartR);

    const mgrPartL = createSmoothSphere('Manager_PartL', 0.060, 16, 14, hairMat, [-0.06, 0.195, 0.03], [0.95, 0.65, 0.95]);
    mgrPartL.rotation.set(-0.15, -0.15, 0.15);
    headGroup.add(mgrPartL);

  } else if (hairStyle === 'cashier') {
    // 💳 Cashier: Soft front bangs + High Ponytail Bun
    const cashFringe = createSmoothSphere('Cashier_Fringe', 0.075, 18, 14, hairMat, [0, 0.21, 0.04], [1.3, 0.60, 0.95]);
    cashFringe.rotation.set(-0.25, 0, 0);
    headGroup.add(cashFringe);

    // Búi tóc cao phía sau
    const bun = createSmoothSphere('Cashier_Bun', 0.055, 18, 14, hairMat, [0, 0.19, -0.12]);
    headGroup.add(bun);
    const scrunchie = createSmoothCylinder('Cashier_Scrunchie', 0.045, 0.045, 0.015, 16, sharedMaterials.brassGold, [0, 0.185, -0.105], [0.4, 0, 0]);
    headGroup.add(scrunchie);

  } else if (hairStyle === 'chef') {
    // 🥐 Chef: Soft Under-Hair + Crisp White Chef Toque
    const chefHair = createSmoothSphere('Chef_HairEdge', 0.070, 16, 12, hairMat, [0, 0.19, 0.03], [1.3, 0.50, 0.9]);
    headGroup.add(chefHair);

    const hatGroup = new THREE.Group();
    hatGroup.name = 'ChefHat';
    hatGroup.position.set(0, 0.19, 0);

    const hatBand = createSmoothCylinder('HatBand', 0.148, 0.152, 0.04, 24, sharedMaterials.shoesSneakerWhite, [0, 0, 0], [0.1, 0, 0]);
    hatGroup.add(hatBand);

    const hatPuff = createSmoothSphere('HatPuff', 0.17, 24, 18, sharedMaterials.shoesSneakerWhite, [0, 0.05, -0.01], [1.1, 0.55, 1.1]);
    hatGroup.add(hatPuff);

    headGroup.add(hatGroup);
  }

  return headGroup;
}

// ── Dựng Hệ Thống Hai Chân & Giày ──────────────────────────────────────────
function buildLegs(trousersMat, shoeMat, soleMat) {
  const legGroup = new THREE.Group();
  legGroup.name = 'LegsContainer';

  const legGeo = {
    thigh: new THREE.CylinderGeometry(0.082, 0.068, 0.34, 20),
    knee: new THREE.SphereGeometry(0.065, 14, 12),
    calf: new THREE.CylinderGeometry(0.065, 0.052, 0.32, 18),
    shoeUpper: new THREE.SphereGeometry(0.075, 16, 12),
    shoeSole: new THREE.CylinderGeometry(0.08, 0.085, 0.025, 20),
  };

  [-0.11, 0.11].forEach((legX, idx) => {
    const side = idx === 0 ? 'Left' : 'Right';
    const hip = new THREE.Group();
    hip.name = `${side}Hip`;
    hip.position.set(legX, -0.08, 0);

    const thigh = new THREE.Mesh(legGeo.thigh, trousersMat);
    thigh.position.set(0, -0.17, 0);
    thigh.castShadow = true;
    hip.add(thigh);

    const knee = new THREE.Group();
    knee.name = `${side}Knee`;
    knee.position.set(0, -0.34, 0);
    hip.add(knee);

    const kneeCap = new THREE.Mesh(legGeo.knee, trousersMat);
    knee.add(kneeCap);

    const calf = new THREE.Mesh(legGeo.calf, trousersMat);
    calf.position.set(0, -0.16, 0);
    calf.castShadow = true;
    knee.add(calf);

    const ankle = new THREE.Group();
    ankle.name = `${side}Ankle`;
    ankle.position.set(0, -0.32, 0);
    knee.add(ankle);

    const shoe = new THREE.Mesh(legGeo.shoeUpper, shoeMat);
    shoe.position.set(0, 0, 0.03);
    shoe.scale.set(0.9, 0.7, 1.4);
    shoe.castShadow = true;
    ankle.add(shoe);

    const sole = new THREE.Mesh(legGeo.shoeSole, soleMat);
    sole.position.set(0, -0.04, 0.03);
    sole.scale.set(0.95, 1.0, 1.45);
    ankle.add(sole);

    legGroup.add(hip);
  });

  return legGroup;
}

// =============================================================================
// MODEL 1: QUẢN LÝ CỬA HÀNG (Store Manager - Polo & Tablet)
// =============================================================================
function buildManagerModel() {
  const root = new THREE.Group();
  root.name = 'ShiftSync_Manager';

  const poloMat = new THREE.MeshStandardMaterial({
    name: 'mat_manager_polo',
    color: 0x1E3A8A, // Navy Blue Polo thanh lịch
    roughness: 0.70,
    metalness: 0.02,
  });
  const collarWhite = new THREE.MeshStandardMaterial({
    name: 'mat_manager_collar',
    color: 0xF8FAFC,
    roughness: 0.65,
  });

  // Hips
  const hips = new THREE.Group();
  hips.name = 'Hips';
  hips.position.set(0, 0.76, 0);
  root.add(hips);

  const pelvis = createSmoothCylinder('Pelvis', 0.175, 0.16, 0.16, 20, sharedMaterials.trousersCharcoal);
  hips.add(pelvis);

  // Legs
  hips.add(buildLegs(sharedMaterials.trousersCharcoal, sharedMaterials.shoesLeatherBlack, sharedMaterials.shoesSoleWhite));

  // Spine & Chest
  const spine = new THREE.Group();
  spine.name = 'Spine';
  spine.position.set(0, 0.08, 0);
  hips.add(spine);

  const chest = createSmoothCylinder('Chest', 0.205, 0.175, 0.32, 24, poloMat, [0, 0.16, 0]);
  spine.add(chest);

  // Cổ bẻ Polo sắc sảo
  const collar = createSmoothCylinder('Collar', 0.09, 0.12, 0.05, 20, collarWhite, [0, 0.33, 0.02], [0.15, 0, 0]);
  spine.add(collar);

  // Thẻ Quản lý mạ vàng
  const badge = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.025, 0.006), sharedMaterials.brassGold);
  badge.position.set(0.10, 0.25, 0.185);
  badge.rotation.y = -0.15;
  spine.add(badge);

  // Neck & Head
  const neck = new THREE.Group();
  neck.name = 'Neck';
  neck.position.set(0, 0.35, 0);
  spine.add(neck);
  neck.add(createSmoothCylinder('Neck_Cyl', 0.065, 0.075, 0.08, 18, sharedMaterials.skinAsian, [0, 0.04, 0]));

  const head = buildHeadGroup(sharedMaterials.hairBlack, 'manager');
  head.position.set(0, 0.04, 0);
  neck.add(head);

  // Left Arm (Cầm Tablet Quản lý)
  const lShoulder = new THREE.Group();
  lShoulder.name = 'LeftShoulder';
  lShoulder.position.set(-0.24, 0.28, 0);
  spine.add(lShoulder);
  lShoulder.add(createSmoothCylinder('L_UpperArm', 0.065, 0.055, 0.22, 18, poloMat, [0, -0.11, 0]));

  const lElbow = new THREE.Group();
  lElbow.name = 'LeftElbow';
  lElbow.position.set(0, -0.22, 0);
  lElbow.rotation.set(0.75, 0, -0.25);
  lShoulder.add(lElbow);
  lElbow.add(createSmoothCylinder('L_Forearm', 0.05, 0.042, 0.20, 16, sharedMaterials.skinAsian, [0, -0.10, 0]));

  const lWrist = new THREE.Group();
  lWrist.name = 'LeftWrist';
  lWrist.position.set(0, -0.20, 0);
  lElbow.add(lWrist);
  lWrist.add(createSmoothSphere('L_Hand', 0.045, 14, 10, sharedMaterials.skinAsian, [0, -0.03, 0.02], [0.8, 1.2, 0.6]));

  // iPad Manager Tablet
  const tabletGeo = new THREE.BoxGeometry(0.16, 0.22, 0.012);
  const tablet = new THREE.Mesh(tabletGeo, new THREE.MeshStandardMaterial({ color: 0x0F172A, metalness: 0.8, roughness: 0.2 }));
  tablet.position.set(0, 0.02, 0.12);
  tablet.rotation.set(-0.4, 0.2, 0);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.19), new THREE.MeshBasicMaterial({ color: 0x0284C7 }));
  screen.position.set(0, 0, 0.007);
  tablet.add(screen);
  lWrist.add(tablet);

  // Right Arm (Thả lỏng tự nhiên)
  const rShoulder = new THREE.Group();
  rShoulder.name = 'RightShoulder';
  rShoulder.position.set(0.24, 0.28, 0);
  spine.add(rShoulder);
  rShoulder.add(createSmoothCylinder('R_UpperArm', 0.065, 0.055, 0.22, 18, poloMat, [0, -0.11, 0]));

  const rElbow = new THREE.Group();
  rElbow.name = 'RightElbow';
  rElbow.position.set(0, -0.22, 0);
  rElbow.rotation.set(0.15, 0, 0.08);
  rShoulder.add(rElbow);
  rElbow.add(createSmoothCylinder('R_Forearm', 0.05, 0.042, 0.20, 16, sharedMaterials.skinAsian, [0, -0.10, 0]));

  const rWrist = new THREE.Group();
  rWrist.name = 'RightWrist';
  rWrist.position.set(0, -0.20, 0);
  rElbow.add(rWrist);
  rWrist.add(createSmoothSphere('R_Hand', 0.045, 14, 10, sharedMaterials.skinAsian, [0, -0.03, 0.02], [0.8, 1.2, 0.6]));

  return root;
}

// =============================================================================
// MODEL 2: THỢ PHA CHẾ HIỆN ĐẠI (Specialty Barista - Rolled Sleeves, Pitcher & Coffee)
// =============================================================================
function buildBaristaModel() {
  const root = new THREE.Group();
  root.name = 'ShiftSync_Barista';

  // Sơ mi đen tay xắn gập nếp & Tạp dề nâu cà phê Espresso
  const shirtBlack = new THREE.MeshStandardMaterial({
    name: 'mat_barista_shirt',
    color: 0x1E1E24, // Sơ mi đen nhung cao cấp
    roughness: 0.75,
    metalness: 0.02,
  });
  const apronEspresso = new THREE.MeshStandardMaterial({
    name: 'mat_barista_apron',
    color: 0x3E2723, // Nâu sẫm hạt cà phê Robusta rang mộc
    roughness: 0.80,
    metalness: 0.02,
  });
  const leatherHarness = new THREE.MeshStandardMaterial({
    name: 'mat_barista_leather',
    color: 0x92400E, // Dây đai da bò cognac
    roughness: 0.50,
    metalness: 0.12,
  });

  // Hips
  const hips = new THREE.Group();
  hips.name = 'Hips';
  hips.position.set(0, 0.76, 0);
  root.add(hips);

  const pelvis = createSmoothCylinder('Pelvis', 0.175, 0.16, 0.16, 20, sharedMaterials.trousersBlack);
  hips.add(pelvis);

  // Legs & Sneaker
  hips.add(buildLegs(sharedMaterials.trousersBlack, sharedMaterials.shoesSneakerWhite, sharedMaterials.shoesSoleWhite));

  // Spine & Chest
  const spine = new THREE.Group();
  spine.name = 'Spine';
  spine.position.set(0, 0.08, 0);
  hips.add(spine);

  const chest = createSmoothCylinder('Chest', 0.205, 0.175, 0.32, 24, shirtBlack, [0, 0.16, 0]);
  spine.add(chest);

  // Tạp dề Yếm Barista ôm sát người (Sleek Barista Bib Apron)
  const apronBibGeo = new THREE.CylinderGeometry(0.188, 0.18, 0.28, 24, 1, false, -Math.PI * 0.45, Math.PI * 0.9);
  const apronBib = new THREE.Mesh(apronBibGeo, apronEspresso);
  apronBib.position.set(0, 0.15, 0.015);
  apronBib.castShadow = true;
  spine.add(apronBib);

  // Quai da đan chéo sau lưng & Đinh tán đồng
  [-0.11, 0.11].forEach((sx, idx) => {
    const strap = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.40, 0.006), leatherHarness);
    strap.position.set(sx, 0.18, 0.02);
    strap.rotation.z = idx === 0 ? -0.15 : 0.15;
    spine.add(strap);

    const rivet = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.008, 12), sharedMaterials.brassGold);
    rivet.rotation.x = Math.PI / 2;
    rivet.position.set(idx === 0 ? -0.13 : 0.13, 0.27, 0.18);
    spine.add(rivet);
  });

  // Túi da đựng nhiệt kế & khăn barista
  const pocket = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.10, 0.015), apronEspresso);
  pocket.position.set(0, 0.05, 0.185);
  spine.add(pocket);

  // Nhiệt kế inox cắm trong túi
  const thermo = createSmoothCylinder('Thermometer', 0.003, 0.003, 0.09, 8, sharedMaterials.stainlessSteel, [0.05, 0.09, 0.19], [0, 0, 0.12]);
  spine.add(thermo);

  // Neck & Head
  const neck = new THREE.Group();
  neck.name = 'Neck';
  neck.position.set(0, 0.35, 0);
  spine.add(neck);
  neck.add(createSmoothCylinder('Neck_Cyl', 0.065, 0.075, 0.08, 18, sharedMaterials.skinAsian, [0, 0.04, 0]));
  neck.add(createSmoothCylinder('Shirt_Collar', 0.095, 0.105, 0.045, 20, shirtBlack, [0, 0.02, 0], [0, 0, 0], [1.1, 1.0, 0.9]));

  const head = buildHeadGroup(sharedMaterials.hairBrown, 'barista');
  head.position.set(0, 0.04, 0);
  neck.add(head);

  // Left Arm (Cầm Ca Đánh Sữa Inox Latte Art)
  const lShoulder = new THREE.Group();
  lShoulder.name = 'LeftShoulder';
  lShoulder.position.set(-0.24, 0.28, 0);
  spine.add(lShoulder);
  lShoulder.add(createSmoothCylinder('L_UpperArm', 0.065, 0.055, 0.15, 18, shirtBlack, [0, -0.075, 0]));
  // Gấp nếp xắn tay áo (Rolled cuff)
  lShoulder.add(createSmoothCylinder('L_Cuff', 0.062, 0.062, 0.04, 18, shirtBlack, [0, -0.16, 0]));

  const lElbow = new THREE.Group();
  lElbow.name = 'LeftElbow';
  lElbow.position.set(0, -0.19, 0);
  lElbow.rotation.set(0.65, 0, -0.22);
  lShoulder.add(lElbow);
  lElbow.add(createSmoothCylinder('L_Forearm', 0.05, 0.042, 0.20, 16, sharedMaterials.skinAsian, [0, -0.10, 0]));

  const lWrist = new THREE.Group();
  lWrist.name = 'LeftWrist';
  lWrist.position.set(0, -0.20, 0);
  lElbow.add(lWrist);
  lWrist.add(createSmoothSphere('L_Hand', 0.045, 14, 10, sharedMaterials.skinAsian, [0, -0.03, 0.02], [0.8, 1.2, 0.6]));

  // Ca Đánh Sữa Inox Latte Art (Stainless Steel Milk Pitcher)
  const pitcherGroup = new THREE.Group();
  pitcherGroup.name = 'MilkPitcher';
  pitcherGroup.position.set(0, 0, 0.11);
  pitcherGroup.scale.setScalar(0.7);

  const pitcherBody = createSmoothCylinder('PitcherBody', 0.075, 0.09, 0.16, 24, sharedMaterials.stainlessSteel, [0, 0.08, 0]);
  pitcherGroup.add(pitcherBody);
  // Vòi rót nhọn
  const spout = createSmoothCylinder('Spout', 0.015, 0.035, 0.04, 12, sharedMaterials.stainlessSteel, [0, 0.15, 0.085], [0.5, 0, 0]);
  pitcherGroup.add(spout);
  // Quai cầm ca inox
  const handleGeo = new THREE.TorusGeometry(0.055, 0.01, 10, 20, Math.PI);
  const handle = new THREE.Mesh(handleGeo, sharedMaterials.stainlessSteel);
  handle.position.set(0, 0.08, -0.09);
  handle.rotation.y = Math.PI / 2;
  pitcherGroup.add(handle);

  lWrist.add(pitcherGroup);

  // Right Arm (Cầm Ly Cà Phê Takeaway Cao Cấp)
  const rShoulder = new THREE.Group();
  rShoulder.name = 'RightShoulder';
  rShoulder.position.set(0.24, 0.28, 0);
  spine.add(rShoulder);
  rShoulder.add(createSmoothCylinder('R_UpperArm', 0.065, 0.055, 0.15, 18, shirtBlack, [0, -0.075, 0]));
  rShoulder.add(createSmoothCylinder('R_Cuff', 0.062, 0.062, 0.04, 18, shirtBlack, [0, -0.16, 0]));

  const rElbow = new THREE.Group();
  rElbow.name = 'RightElbow';
  rElbow.position.set(0, -0.19, 0);
  rElbow.rotation.set(0.55, 0, 0.22);
  rShoulder.add(rElbow);
  rElbow.add(createSmoothCylinder('R_Forearm', 0.05, 0.042, 0.20, 16, sharedMaterials.skinAsian, [0, -0.10, 0]));

  const rWrist = new THREE.Group();
  rWrist.name = 'RightWrist';
  rWrist.position.set(0, -0.20, 0);
  rElbow.add(rWrist);
  rWrist.add(createSmoothSphere('R_Hand', 0.045, 14, 10, sharedMaterials.skinAsian, [0, -0.03, 0.02], [0.8, 1.2, 0.6]));

  // Ly Takeaway gốm sứ đen cao cấp
  const cupGroup = new THREE.Group();
  cupGroup.name = 'ArtisanCoffeeCup';
  cupGroup.position.set(0, 0, 0.10);
  cupGroup.scale.setScalar(0.7);

  const cupBody = createSmoothCylinder('CupBody', 0.065, 0.048, 0.14, 20, new THREE.MeshStandardMaterial({ color: 0xF5F2EB, roughness: 0.4 }), [0, 0.07, 0]);
  cupGroup.add(cupBody);
  const cupSleeve = createSmoothCylinder('Sleeve', 0.066, 0.055, 0.06, 20, new THREE.MeshStandardMaterial({ color: 0x92400E, roughness: 0.8 }), [0, 0.07, 0]);
  cupGroup.add(cupSleeve);
  const cupLid = createSmoothCylinder('Lid', 0.068, 0.068, 0.02, 20, new THREE.MeshStandardMaterial({ color: 0x0F172A, roughness: 0.3 }), [0, 0.14, 0]);
  cupGroup.add(cupLid);

  rWrist.add(cupGroup);

  return root;
}

// =============================================================================
// MODEL 3: THU NGÂN & DỊCH VỤ (Cashier & Service Specialist - Headset & POS)
// =============================================================================
function buildCashierModel() {
  const root = new THREE.Group();
  root.name = 'ShiftSync_Cashier';

  // Áo màu Be cát/Kem sữa ấm áp & Tạp dề lửng ngang hông
  const shirtBeige = new THREE.MeshStandardMaterial({
    name: 'mat_cashier_shirt',
    color: 0xE8DFD0, // Be cát ấm sáng
    roughness: 0.72,
    metalness: 0.02,
  });
  const apronShortNavy = new THREE.MeshStandardMaterial({
    name: 'mat_cashier_apron',
    color: 0x1E293B, // Tạp dề lửng xanh than
    roughness: 0.80,
    metalness: 0.02,
  });

  // Hips & Tạp dề ngắn ngang eo
  const hips = new THREE.Group();
  hips.name = 'Hips';
  hips.position.set(0, 0.76, 0);
  root.add(hips);

  const pelvis = createSmoothCylinder('Pelvis', 0.175, 0.16, 0.16, 20, sharedMaterials.trousersCharcoal);
  hips.add(pelvis);

  // Tạp dề lửng thắt eo
  const waistApron = createSmoothCylinder('WaistApron', 0.185, 0.19, 0.20, 22, apronShortNavy, [0, -0.04, 0.01]);
  hips.add(waistApron);

  // Legs & Sneaker
  hips.add(buildLegs(sharedMaterials.trousersCharcoal, sharedMaterials.shoesSneakerWhite, sharedMaterials.shoesSoleWhite));

  // Spine & Chest
  const spine = new THREE.Group();
  spine.name = 'Spine';
  spine.position.set(0, 0.08, 0);
  hips.add(spine);

  const chest = createSmoothCylinder('Chest', 0.205, 0.175, 0.32, 24, shirtBeige, [0, 0.16, 0]);
  spine.add(chest);

  // Thẻ tên nhân viên dịch vụ
  const badge = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.025, 0.006), sharedMaterials.brassGold);
  badge.position.set(0.10, 0.25, 0.185);
  badge.rotation.y = -0.15;
  spine.add(badge);

  // Neck & Head
  const neck = new THREE.Group();
  neck.name = 'Neck';
  neck.position.set(0, 0.35, 0);
  spine.add(neck);
  neck.add(createSmoothCylinder('Neck_Cyl', 0.065, 0.075, 0.08, 18, sharedMaterials.skinAsian, [0, 0.04, 0]));
  neck.add(createSmoothCylinder('Shirt_Collar', 0.095, 0.105, 0.045, 20, shirtBeige, [0, 0.02, 0], [0, 0, 0], [1.1, 1.0, 0.9]));

  const head = buildHeadGroup(sharedMaterials.hairBlack, 'cashier');
  head.position.set(0, 0.04, 0);
  neck.add(head);

  // Tai nghe bộ đàm F&B không dây (Wireless Headset on Ear)
  const headset = new THREE.Group();
  headset.name = 'Headset';
  const earpiece = createSmoothSphere('Earpiece', 0.022, 12, 10, new THREE.MeshStandardMaterial({ color: 0x0F172A, metalness: 0.8 }), [0.165, 0.02, 0]);
  headset.add(earpiece);
  const micBoom = createSmoothCylinder('MicBoom', 0.003, 0.003, 0.08, 8, sharedMaterials.stainlessSteel, [0.155, -0.015, 0.05], [0.6, 0.2, 0]);
  headset.add(micBoom);
  head.add(headset);

  // Left Arm (Cầm Máy Quét POS Không Dây)
  const lShoulder = new THREE.Group();
  lShoulder.name = 'LeftShoulder';
  lShoulder.position.set(-0.24, 0.28, 0);
  spine.add(lShoulder);
  lShoulder.add(createSmoothCylinder('L_UpperArm', 0.065, 0.055, 0.22, 18, shirtBeige, [0, -0.11, 0]));

  const lElbow = new THREE.Group();
  lElbow.name = 'LeftElbow';
  lElbow.position.set(0, -0.22, 0);
  lElbow.rotation.set(0.65, 0, -0.20);
  lShoulder.add(lElbow);
  lElbow.add(createSmoothCylinder('L_Forearm', 0.05, 0.042, 0.20, 16, sharedMaterials.skinAsian, [0, -0.10, 0]));

  const lWrist = new THREE.Group();
  lWrist.name = 'LeftWrist';
  lWrist.position.set(0, -0.20, 0);
  lElbow.add(lWrist);
  lWrist.add(createSmoothSphere('L_Hand', 0.045, 14, 10, sharedMaterials.skinAsian, [0, -0.03, 0.02], [0.8, 1.2, 0.6]));

  // Máy Quét POS Thông Minh Cầm Tay (Smart POS Terminal)
  const posGroup = new THREE.Group();
  posGroup.position.set(0, 0, 0.10);
  posGroup.scale.setScalar(0.75);
  const posBody = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.18, 0.035), new THREE.MeshStandardMaterial({ color: 0x0F172A, roughness: 0.25, metalness: 0.7 }));
  posGroup.add(posBody);
  const posScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.075, 0.11), new THREE.MeshBasicMaterial({ color: 0x10B981 })); // Green ready screen
  posScreen.position.set(0, 0.02, 0.018);
  posGroup.add(posScreen);
  lWrist.add(posGroup);

  // Right Arm (Chào khách thân thiện)
  const rShoulder = new THREE.Group();
  rShoulder.name = 'RightShoulder';
  rShoulder.position.set(0.24, 0.28, 0);
  spine.add(rShoulder);
  rShoulder.add(createSmoothCylinder('R_UpperArm', 0.065, 0.055, 0.22, 18, shirtBeige, [0, -0.11, 0]));

  const rElbow = new THREE.Group();
  rElbow.name = 'RightElbow';
  rElbow.position.set(0, -0.22, 0);
  rElbow.rotation.set(0.40, 0, 0.15);
  rShoulder.add(rElbow);
  rElbow.add(createSmoothCylinder('R_Forearm', 0.05, 0.042, 0.20, 16, sharedMaterials.skinAsian, [0, -0.10, 0]));

  const rWrist = new THREE.Group();
  rWrist.name = 'RightWrist';
  rWrist.position.set(0, -0.20, 0);
  rElbow.add(rWrist);
  rWrist.add(createSmoothSphere('R_Hand', 0.045, 14, 10, sharedMaterials.skinAsian, [0, -0.03, 0.02], [0.8, 1.2, 0.6]));

  return root;
}

// =============================================================================
// MODEL 4: ĐẦU BẾP BÁNH NGỌT (Bakery Chef - Chef Coat & Hat)
// =============================================================================
function buildChefModel() {
  const root = new THREE.Group();
  root.name = 'ShiftSync_Chef';

  const coatWhite = new THREE.MeshStandardMaterial({
    name: 'mat_chef_coat',
    color: 0xFAFAFA, // Áo bếp trắng tinh khiết
    roughness: 0.68,
    metalness: 0.02,
  });
  const apronGrey = new THREE.MeshStandardMaterial({
    name: 'mat_chef_apron',
    color: 0x334155, // Tạp dề xám than
    roughness: 0.78,
  });

  // Hips
  const hips = new THREE.Group();
  hips.name = 'Hips';
  hips.position.set(0, 0.76, 0);
  root.add(hips);

  const pelvis = createSmoothCylinder('Pelvis', 0.175, 0.16, 0.16, 20, sharedMaterials.trousersCharcoal);
  hips.add(pelvis);

  // Legs & Shoes
  hips.add(buildLegs(sharedMaterials.trousersCharcoal, sharedMaterials.shoesLeatherBlack, sharedMaterials.shoesSoleWhite));

  // Spine & Chest
  const spine = new THREE.Group();
  spine.name = 'Spine';
  spine.position.set(0, 0.08, 0);
  hips.add(spine);

  // Áo bếp 2 hàng cúc (Double-breasted Chef Coat)
  const chest = createSmoothCylinder('Chest', 0.205, 0.175, 0.32, 24, coatWhite, [0, 0.16, 0]);
  spine.add(chest);

  // 2 hàng cúc đen trên áo bếp
  [-0.045, 0.045].forEach((bx) => {
    for (let c = 0; c < 4; c++) {
      const btn = createSmoothCylinder('ChefButton', 0.007, 0.007, 0.005, 12, sharedMaterials.shoesLeatherBlack, [bx, 0.08 + c * 0.06, 0.18], [Math.PI / 2, 0, 0]);
      spine.add(btn);
    }
  });

  // Tạp dề dài thắt eo
  const apron = createSmoothCylinder('ChefApron', 0.185, 0.18, 0.24, 20, apronGrey, [0, -0.02, 0.015]);
  hips.add(apron);

  // Neck & Head
  const neck = new THREE.Group();
  neck.name = 'Neck';
  neck.position.set(0, 0.35, 0);
  spine.add(neck);
  neck.add(createSmoothCylinder('Neck_Cyl', 0.065, 0.075, 0.08, 18, sharedMaterials.skinAsian, [0, 0.04, 0]));
  neck.add(createSmoothCylinder('Chef_Collar', 0.095, 0.105, 0.045, 20, coatWhite, [0, 0.02, 0], [0, 0, 0], [1.1, 1.0, 0.9]));

  const head = buildHeadGroup(sharedMaterials.hairBlack, 'chef');
  head.position.set(0, 0.04, 0);
  neck.add(head);

  // Left Arm (Nâng Khay Bánh Nướng)
  const lShoulder = new THREE.Group();
  lShoulder.name = 'LeftShoulder';
  lShoulder.position.set(-0.24, 0.28, 0);
  spine.add(lShoulder);
  lShoulder.add(createSmoothCylinder('L_UpperArm', 0.065, 0.055, 0.22, 18, coatWhite, [0, -0.11, 0]));

  const lElbow = new THREE.Group();
  lElbow.name = 'LeftElbow';
  lElbow.position.set(0, -0.22, 0);
  lElbow.rotation.set(0.70, 0, -0.25);
  lShoulder.add(lElbow);
  lElbow.add(createSmoothCylinder('L_Forearm', 0.05, 0.042, 0.20, 16, coatWhite, [0, -0.10, 0]));

  const lWrist = new THREE.Group();
  lWrist.name = 'LeftWrist';
  lWrist.position.set(0, -0.20, 0);
  lElbow.add(lWrist);
  lWrist.add(createSmoothSphere('L_Hand', 0.045, 14, 10, sharedMaterials.skinAsian, [0, -0.03, 0.02], [0.8, 1.2, 0.6]));

  // Khay bánh nướng inox kèm bánh sừng bò (Bakery Tray)
  const trayGroup = new THREE.Group();
  trayGroup.position.set(0, 0, 0.12);
  trayGroup.scale.setScalar(0.75);

  const tray = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.012, 0.18), sharedMaterials.stainlessSteel);
  trayGroup.add(tray);

  // Bánh sừng bò nướng vàng ươm (Croissant)
  const croissantMat = new THREE.MeshStandardMaterial({ color: 0xD97706, roughness: 0.65 });
  const croissantGeo = new THREE.TorusGeometry(0.045, 0.022, 12, 18, Math.PI * 0.9);
  const croissant1 = new THREE.Mesh(croissantGeo, croissantMat);
  croissant1.position.set(-0.04, 0.02, 0);
  croissant1.rotation.x = Math.PI / 2;
  trayGroup.add(croissant1);

  const croissant2 = croissant1.clone();
  croissant2.position.set(0.04, 0.02, 0);
  trayGroup.add(croissant2);

  lWrist.add(trayGroup);

  // Right Arm
  const rShoulder = new THREE.Group();
  rShoulder.name = 'RightShoulder';
  rShoulder.position.set(0.24, 0.28, 0);
  spine.add(rShoulder);
  rShoulder.add(createSmoothCylinder('R_UpperArm', 0.065, 0.055, 0.22, 18, coatWhite, [0, -0.11, 0]));

  const rElbow = new THREE.Group();
  rElbow.name = 'RightElbow';
  rElbow.position.set(0, -0.22, 0);
  rElbow.rotation.set(0.30, 0, 0.12);
  rShoulder.add(rElbow);
  rElbow.add(createSmoothCylinder('R_Forearm', 0.05, 0.042, 0.20, 16, coatWhite, [0, -0.10, 0]));

  const rWrist = new THREE.Group();
  rWrist.name = 'RightWrist';
  rWrist.position.set(0, -0.20, 0);
  rElbow.add(rWrist);
  rWrist.add(createSmoothSphere('R_Hand', 0.045, 14, 10, sharedMaterials.skinAsian, [0, -0.03, 0.02], [0.8, 1.2, 0.6]));

  return root;
}

// ── Hàm Xuất Mô Hình Ra File GLB ──────────────────────────────────────────
const outputWebDir = path.resolve(__dirname, '../ShiftSync-Web/public/models');
const outputBackendDir = path.resolve(__dirname, '../shiftsync-backend');
const outputRootDir = path.resolve(__dirname, '..');

if (!fs.existsSync(outputWebDir)) fs.mkdirSync(outputWebDir, { recursive: true });

const exporter = new GLTFExporter();
const exportOptions = { binary: true, embedImages: true, truncateDrawRange: false };

function exportGlb(modelRoot, filename) {
  return new Promise((resolve, reject) => {
    let tris = 0, meshes = 0;
    modelRoot.traverse((c) => {
      if (c.isMesh && c.geometry) {
        meshes++;
        const g = c.geometry;
        tris += g.index ? g.index.count / 3 : (g.attributes.position ? g.attributes.position.count / 3 : 0);
      }
    });

    exporter.parse(
      modelRoot,
      (gltfBuffer) => {
        const buffer = Buffer.from(gltfBuffer);
        const webPath = path.join(outputWebDir, filename);
        const rootPath = path.join(outputRootDir, filename);
        const backendPath = path.join(outputBackendDir, filename);

        fs.writeFileSync(webPath, buffer);
        fs.writeFileSync(rootPath, buffer);
        try { fs.writeFileSync(backendPath, buffer); } catch (e) {}

        const sizeKb = (buffer.length / 1024).toFixed(1);
        console.log(`✅ [${filename}] ${sizeKb} KB | ${meshes} meshes | ${Math.round(tris).toLocaleString()} tris`);
        resolve({ filename, sizeKb, meshes, tris });
      },
      (err) => reject(err),
      exportOptions
    );
  });
}

async function generateAll() {
  try {
    console.log('📦 1/4 Đang xuất mô hình Quản lý Cửa Hàng (ShiftSync_Manager.glb)...');
    await exportGlb(buildManagerModel(), 'ShiftSync_Manager.glb');

    console.log('☕ 2/4 Đang xuất mô hình Thợ Pha Chế Hiện Đại (ShiftSync_Barista.glb)...');
    await exportGlb(buildBaristaModel(), 'ShiftSync_Barista.glb');

    console.log('💳 3/4 Đang xuất mô hình Thu Ngân & Dịch Vụ (ShiftSync_Cashier.glb)...');
    await exportGlb(buildCashierModel(), 'ShiftSync_Cashier.glb');

    console.log('🥐 4/4 Đang xuất mô hình Đầu Bếp Bánh Ngọt (ShiftSync_Chef.glb)...');
    await exportGlb(buildChefModel(), 'ShiftSync_Chef.glb');

    console.log('🎉 TOÀN BỘ 4 MÔ HÌNH 3D ĐÃ ĐƯỢC XUẤT THÀNH CÔNG RỰC RỠ!');
  } catch (err) {
    console.error('❌ Lỗi xuất mô hình:', err);
    process.exit(1);
  }
}

generateAll();
