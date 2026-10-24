/**
 * generate-vietnamese-employee-glb.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Sinh mô hình 3D Nhân Viên F&B / Barista Đậm Chất Văn Hóa Việt Nam
 * (Vietnamese Heritage F&B Staff / Barista 3D Model).
 * 
 * Đặc trưng thiết kế:
 * 1. Khuôn mặt & Vóc dáng Á Đông: Nước da vàng ấm tự nhiên, mắt nâu đen, tóc đen mượt side-part.
 * 2. Đồng phục Cà phê Di sản Việt:
 *    - Áo đũi màu xanh rêu quân đội trầm (đặc trưng Cộng Cà Phê / Phê La).
 *    - Khăn rằn Nam Bộ kẻ caro truyền thống quấn quanh cổ trang nhã.
 *    - Tạp dề canvas màu nâu cà phê Robusta với quai da bò đan chéo sau lưng.
 *    - Nón lá Việt Nam đan nan màu vàng rơm tự nhiên đeo nghiêng thanh lịch sau lưng.
 * 3. Phụ kiện biểu tượng:
 *    - Phin Cà Phê Nhôm Truyền Thống (Traditional Aluminum Coffee Phin) với đĩa lót, thân phin, nắp phin.
 *    - Ly Cà Phê Sữa Đá thủy tinh với lớp sữa đặc, lớp cà phê nâu và ống hút tre thân thiện môi trường.
 * 4. Hệ thống khớp chi linh hoạt (Shoulders, Elbows, Wrists, Hips, Knees, Ankles).
 * 5. Chuẩn xuất glTF 2.0 Binary (.glb) tối ưu PBR textures.
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

console.log('🇻🇳 Bắt đầu tạo mô hình 3D Nhân viên Barista Văn Hóa Việt Nam (ShiftSync Vietnamese Staff GLB)...');

// ── 1. Bảng Vật Liệu PBR Đặc Trưng Văn Hóa Việt Nam ────────────────────────
const materials = {
  // Làn da người Việt (Warm Asian golden-toned skin)
  skin: new THREE.MeshStandardMaterial({
    name: 'mat_vn_skin',
    color: 0xE8BA93,
    roughness: 0.60,
    metalness: 0.02,
  }),
  // Mái tóc đen tuyền tự nhiên
  hair: new THREE.MeshStandardMaterial({
    name: 'mat_vn_hair',
    color: 0x18181B, // Jet black with soft sheen
    roughness: 0.40,
    metalness: 0.08,
  }),
  // Đôi mắt Á Đông
  eyes: new THREE.MeshStandardMaterial({
    name: 'mat_vn_eyes',
    color: 0x0F172A,
    roughness: 0.12,
    metalness: 0.15,
  }),
  eyeCatchlight: new THREE.MeshBasicMaterial({
    name: 'mat_eye_catchlight',
    color: 0xFFFFFF,
  }),
  // Môi hồng tự nhiên
  lips: new THREE.MeshStandardMaterial({
    name: 'mat_vn_lips',
    color: 0xC47B6A,
    roughness: 0.50,
    metalness: 0.02,
  }),
  // Áo đũi xanh rêu quân đội (Heritage Olive Green Linen)
  shirtLinen: new THREE.MeshStandardMaterial({
    name: 'mat_vn_shirt_linen',
    color: 0x2D4536, // Deep Olive Forest Green
    roughness: 0.78,
    metalness: 0.02,
  }),
  shirtCollar: new THREE.MeshStandardMaterial({
    name: 'mat_vn_collar',
    color: 0x24382C,
    roughness: 0.75,
    metalness: 0.02,
  }),
  // Khăn Rằn Nam Bộ (Black & Cream White Gingham check pattern simulation)
  scarfBase: new THREE.MeshStandardMaterial({
    name: 'mat_khan_ran_base',
    color: 0xF5F2EB, // Cream Ivory
    roughness: 0.85,
    metalness: 0.02,
  }),
  scarfStripe: new THREE.MeshStandardMaterial({
    name: 'mat_khan_ran_stripe',
    color: 0x27272A, // Charcoal Black Stripe
    roughness: 0.85,
    metalness: 0.02,
  }),
  // Tạp dề Canvas màu Nâu Cà Phê Robusta Tây Nguyên
  apronCanvas: new THREE.MeshStandardMaterial({
    name: 'mat_vn_apron_canvas',
    color: 0x3E2723, // Deep Robusta Coffee Bean Brown
    roughness: 0.82,
    metalness: 0.02,
  }),
  // Quai da bò thuộc vàng nâu
  leatherStraps: new THREE.MeshStandardMaterial({
    name: 'mat_vn_leather_straps',
    color: 0x92400E, // Amber Cognac Leather
    roughness: 0.50,
    metalness: 0.10,
  }),
  // Khuy đồng & đinh tán
  brassHardware: new THREE.MeshStandardMaterial({
    name: 'mat_brass_hardware',
    color: 0xD4AF37, // Polished Vintage Brass
    roughness: 0.28,
    metalness: 0.85,
  }),
  // Nón Lá Việt Nam (Woven Golden Palm Leaf)
  nonLaLeaf: new THREE.MeshStandardMaterial({
    name: 'mat_non_la_leaf',
    color: 0xE8C88B, // Natural Palm Straw
    roughness: 0.70,
    metalness: 0.04,
  }),
  nonLaRing: new THREE.MeshStandardMaterial({
    name: 'mat_non_la_ring',
    color: 0xD4AF37,
    roughness: 0.60,
    metalness: 0.15,
  }),
  nonLaSilkRibbon: new THREE.MeshStandardMaterial({
    name: 'mat_non_la_silk',
    color: 0x059669, // Emerald Silk Ribbon
    roughness: 0.45,
    metalness: 0.10,
  }),
  // Phin Cà Phê Nhôm Sáng Bóng
  aluminumPhin: new THREE.MeshStandardMaterial({
    name: 'mat_aluminum_phin',
    color: 0xCBD5E1, // Brushed Aluminum
    roughness: 0.25,
    metalness: 0.90,
  }),
  aluminumPhinDark: new THREE.MeshStandardMaterial({
    name: 'mat_aluminum_phin_dark',
    color: 0x94A3B8,
    roughness: 0.35,
    metalness: 0.85,
  }),
  // Ly Thủy Tinh & Cà Phê Sữa Đá
  glassCup: new THREE.MeshPhysicalMaterial({
    name: 'mat_glass_cup',
    color: 0xFFFFFF,
    roughness: 0.1,
    transmission: 0.88,
    thickness: 0.02,
    transparent: true,
    opacity: 0.6,
  }),
  condensedMilk: new THREE.MeshStandardMaterial({
    name: 'mat_condensed_milk',
    color: 0xFEF3C7, // Sweet creamy milk
    roughness: 0.40,
    metalness: 0.05,
  }),
  coffeeLiquid: new THREE.MeshStandardMaterial({
    name: 'mat_coffee_liquid',
    color: 0x271406, // Rich dark roasted coffee
    roughness: 0.20,
    metalness: 0.08,
  }),
  bambooStraw: new THREE.MeshStandardMaterial({
    name: 'mat_bamboo_straw',
    color: 0x84CC16, // Natural bamboo green
    roughness: 0.65,
    metalness: 0.05,
  }),
  // Quần âu đũi xắn gấu
  trousers: new THREE.MeshStandardMaterial({
    name: 'mat_vn_trousers',
    color: 0x1E293B, // Charcoal slate linen
    roughness: 0.75,
    metalness: 0.02,
  }),
  // Giày sneaker vải trắng trẻ trung
  shoesWhite: new THREE.MeshStandardMaterial({
    name: 'mat_vn_shoes_white',
    color: 0xF8FAFC,
    roughness: 0.55,
    metalness: 0.05,
  }),
  shoesSole: new THREE.MeshStandardMaterial({
    name: 'mat_vn_shoes_sole',
    color: 0xE2E8F0,
    roughness: 0.85,
    metalness: 0.02,
  }),
  // Huy hiệu cờ đỏ sao vàng thu nhỏ
  flagRed: new THREE.MeshStandardMaterial({
    name: 'mat_flag_red',
    color: 0xDC2626,
    roughness: 0.50,
  }),
  flagStarGold: new THREE.MeshStandardMaterial({
    name: 'mat_flag_star_gold',
    color: 0xFACC15,
    roughness: 0.25,
    metalness: 0.60,
  }),
};

// ── 2. Xây Dựng Cấu Trúc Khối 3D Nhân Vật ──────────────────────────────────
const root = new THREE.Group();
root.name = 'ShiftSync_Vietnamese_Staff';

// ── Hips & Pelvis Pivot (Gốc tọa độ chuyển động) ──
const hipsGroup = new THREE.Group();
hipsGroup.name = 'Hips';
hipsGroup.position.set(0, 0.74, 0);
root.add(hipsGroup);

// Pelvis & Lower Torso
const pelvisGeo = new THREE.CylinderGeometry(0.18, 0.16, 0.16, 20);
const pelvisMesh = new THREE.Mesh(pelvisGeo, materials.trousers);
pelvisMesh.name = 'Pelvis';
pelvisMesh.castShadow = true;
hipsGroup.add(pelvisMesh);

// ── Spine & Upper Torso (Ngực & Thân trên) ──
const spineGroup = new THREE.Group();
spineGroup.name = 'Spine';
spineGroup.position.set(0, 0.10, 0);
hipsGroup.add(spineGroup);

// Ngực áo đũi xanh rêu
const chestGeo = new THREE.CylinderGeometry(0.20, 0.175, 0.32, 24);
const chestMesh = new THREE.Mesh(chestGeo, materials.shirtLinen);
chestMesh.name = 'Chest';
chestMesh.position.set(0, 0.16, 0);
chestMesh.castShadow = true;
spineGroup.add(chestMesh);

// Cúc áo gỗ truyền thống (3 cúc nhỏ dọc giữa ngực)
for (let b = 0; b < 3; b++) {
  const buttonGeo = new THREE.CylinderGeometry(0.009, 0.009, 0.005, 12);
  const buttonMesh = new THREE.Mesh(buttonGeo, materials.brassHardware);
  buttonMesh.rotation.x = Math.PI / 2;
  buttonMesh.position.set(0, 0.10 + b * 0.07, 0.18);
  spineGroup.add(buttonMesh);
}

// Huy hiệu Cờ Đỏ Sao Vàng nhỏ trên ngực trái
const badgeBaseGeo = new THREE.BoxGeometry(0.035, 0.024, 0.005);
const badgeBase = new THREE.Mesh(badgeBaseGeo, materials.flagRed);
badgeBase.position.set(0.10, 0.24, 0.185);
badgeBase.rotation.y = -0.15;
const starGeo = new THREE.ConeGeometry(0.007, 0.005, 5);
const starMesh = new THREE.Mesh(starGeo, materials.flagStarGold);
starMesh.rotation.x = Math.PI / 2;
starMesh.position.set(0, 0, 0.004);
badgeBase.add(starMesh);
spineGroup.add(badgeBase);

// Tạp dề Canvas màu Nâu Cà Phê Robusta (Barista Utility Apron)
const apronBibGeo = new THREE.CylinderGeometry(0.185, 0.18, 0.26, 20, 1, false, -Math.PI * 0.45, Math.PI * 0.9);
const apronBib = new THREE.Mesh(apronBibGeo, materials.apronCanvas);
apronBib.name = 'Apron_Bib';
apronBib.position.set(0, 0.14, 0.015);
apronBib.castShadow = true;
spineGroup.add(apronBib);

// Quai da đan chéo sau lưng (Cross-back leather straps)
const strapGeo = new THREE.BoxGeometry(0.022, 0.42, 0.006);
const leftStrap = new THREE.Mesh(strapGeo, materials.leatherStraps);
leftStrap.position.set(-0.11, 0.18, 0.02);
leftStrap.rotation.z = -0.15;
spineGroup.add(leftStrap);

const rightStrap = new THREE.Mesh(strapGeo, materials.leatherStraps);
rightStrap.position.set(0.11, 0.18, 0.02);
rightStrap.rotation.z = 0.15;
spineGroup.add(rightStrap);

// Đinh tán đồng thau trên 4 góc quai tạp dề
[-0.13, 0.13].forEach((sx) => {
  const rivetGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.008, 12);
  const rivet = new THREE.Mesh(rivetGeo, materials.brassHardware);
  rivet.rotation.x = Math.PI / 2;
  rivet.position.set(sx, 0.27, 0.18);
  spineGroup.add(rivet);
});

// Túi tạp dề trước bụng
const pocketGeo = new THREE.BoxGeometry(0.18, 0.11, 0.015);
const pocket = new THREE.Mesh(pocketGeo, materials.apronCanvas);
pocket.position.set(0, 0.05, 0.18);
spineGroup.add(pocket);

// Bút chì gỗ cắm trong túi
const pencilGeo = new THREE.CylinderGeometry(0.004, 0.004, 0.08, 8);
const pencil = new THREE.Mesh(pencilGeo, materials.brassHardware);
pencil.position.set(0.05, 0.10, 0.185);
pencil.rotation.z = 0.12;
spineGroup.add(pencil);

// ── KHĂN RẰN NAM BỘ TRUYỀN THỐNG QUẤN CỔ (Vietnamese Gingham Scarf) ──
const scarfGroup = new THREE.Group();
scarfGroup.name = 'KhanRan_Scarf';
scarfGroup.position.set(0, 0.31, 0);

// Vòng quấn quanh cổ
const scarfRingGeo = new THREE.TorusGeometry(0.11, 0.028, 16, 24);
const scarfRing = new THREE.Mesh(scarfRingGeo, materials.scarfBase);
scarfRing.rotation.x = Math.PI / 2;
scarfGroup.add(scarfRing);

// 8 sọc kẻ ca rô đen xen kẽ vòng cổ
for (let s = 0; s < 8; s++) {
  const stripeGeo = new THREE.TorusGeometry(0.111, 0.008, 12, 8, Math.PI * 0.18);
  const stripe = new THREE.Mesh(stripeGeo, materials.scarfStripe);
  stripe.rotation.x = Math.PI / 2;
  stripe.rotation.z = (s * Math.PI) / 4;
  scarfGroup.add(stripe);
}

// 2 dải khăn rủ xuống ngực mềm mại
const tailGeo = new THREE.BoxGeometry(0.045, 0.15, 0.015);
const leftTail = new THREE.Mesh(tailGeo, materials.scarfBase);
leftTail.position.set(-0.04, -0.07, 0.14);
leftTail.rotation.set(0.1, 0.05, -0.15);
scarfGroup.add(leftTail);

const rightTail = new THREE.Mesh(tailGeo, materials.scarfBase);
rightTail.position.set(0.04, -0.06, 0.14);
rightTail.rotation.set(0.1, -0.05, 0.2);
scarfGroup.add(rightTail);

spineGroup.add(scarfGroup);

// ── NÓN LÁ TRUYỀN THỐNG ĐEO SAU LƯNG (Traditional Conical Leaf Hat) ──
const nonLaGroup = new THREE.Group();
nonLaGroup.name = 'Non_La_Vietnam';
// Đặt nghiêng nhẹ sau lưng nhân viên
nonLaGroup.position.set(0, 0.20, -0.21);
nonLaGroup.rotation.set(0.35, 0, 0.05);

// Chóp nón hình nón lá nan vàng
const nonLaGeo = new THREE.ConeGeometry(0.30, 0.14, 36, 1, true);
const nonLaMesh = new THREE.Mesh(nonLaGeo, materials.nonLaLeaf);
nonLaMesh.rotation.x = Math.PI; // Mở nón úp vào lưng
nonLaMesh.castShadow = true;
nonLaGroup.add(nonLaMesh);

// Vành nón lá bo tròn
const rimGeo = new THREE.TorusGeometry(0.30, 0.007, 12, 36);
const rimMesh = new THREE.Mesh(rimGeo, materials.nonLaRing);
rimMesh.rotation.x = Math.PI / 2;
nonLaGroup.add(rimMesh);

// Dây nón lá bằng lụa xanh ngọc bích vắt qua vai
const ribbonGeo = new THREE.TorusGeometry(0.16, 0.008, 12, 24, Math.PI * 0.9);
const ribbonMesh = new THREE.Mesh(ribbonGeo, materials.nonLaSilkRibbon);
ribbonMesh.rotation.x = Math.PI / 2;
ribbonMesh.position.set(0, 0.06, 0.08);
nonLaGroup.add(ribbonMesh);

spineGroup.add(nonLaGroup);

// ── Cổ & Đầu (Neck & Head) ──
const neckGroup = new THREE.Group();
neckGroup.name = 'Neck';
neckGroup.position.set(0, 0.34, 0);
spineGroup.add(neckGroup);

const neckGeo = new THREE.CylinderGeometry(0.065, 0.075, 0.08, 18);
const neckMesh = new THREE.Mesh(neckGeo, materials.skin);
neckMesh.castShadow = true;
neckGroup.add(neckMesh);

const headGroup = new THREE.Group();
headGroup.name = 'Head';
headGroup.position.set(0, 0.12, 0);
neckGroup.add(headGroup);

// Hộp sọ gương mặt Á Đông thon gọn (Smooth Asian Cranium & Jaw)
const headGeo = new THREE.SphereGeometry(0.155, 32, 24);
headGeo.scale(1.0, 1.15, 1.05);
const headMesh = new THREE.Mesh(headGeo, materials.skin);
headMesh.name = 'Head_Mesh';
headMesh.castShadow = true;
headGroup.add(headMesh);

// Sống mũi cao thanh tú
const noseGeo = new THREE.ConeGeometry(0.024, 0.06, 12);
const noseMesh = new THREE.Mesh(noseGeo, materials.skin);
noseMesh.position.set(0, 0.01, 0.165);
noseMesh.rotation.x = 0.22;
headGroup.add(noseMesh);

// Đôi mắt Á Đông có chiều sâu & con ngươi
[-0.055, 0.055].forEach((eyeX, idx) => {
  const eyeBaseGeo = new THREE.SphereGeometry(0.024, 16, 12);
  const eyeBase = new THREE.Mesh(eyeBaseGeo, materials.eyes);
  eyeBase.position.set(eyeX, 0.035, 0.145);
  eyeBase.scale.set(1.2, 0.7, 0.6);

  // Điểm sáng phản chiếu trong mắt (catchlight)
  const catchGeo = new THREE.SphereGeometry(0.006, 8, 8);
  const catchMesh = new THREE.Mesh(catchGeo, materials.eyeCatchlight);
  catchMesh.position.set(eyeX > 0 ? 0.007 : -0.007, 0.008, 0.02);
  eyeBase.add(catchMesh);

  headGroup.add(eyeBase);

  // Lông mày đen thanh tú
  const browGeo = new THREE.BoxGeometry(0.045, 0.008, 0.012);
  const browMesh = new THREE.Mesh(browGeo, materials.hair);
  browMesh.position.set(eyeX, 0.065, 0.148);
  browMesh.rotation.z = eyeX > 0 ? -0.1 : 0.1;
  headGroup.add(browMesh);
});

// Đôi môi nụ cười nhẹ nhàng
const lipsGeo = new THREE.CylinderGeometry(0.026, 0.026, 0.012, 16);
const lipsMesh = new THREE.Mesh(lipsGeo, materials.lips);
lipsMesh.rotation.x = Math.PI / 2;
lipsMesh.scale.set(1.4, 0.45, 0.8);
lipsMesh.position.set(0, -0.055, 0.155);
headGroup.add(lipsMesh);

// Đôi tai Á Đông bo cong
[-0.155, 0.155].forEach((earX) => {
  const earGeo = new THREE.SphereGeometry(0.032, 14, 10);
  earGeo.scale(0.35, 1.2, 0.8);
  const earMesh = new THREE.Mesh(earGeo, materials.skin);
  earMesh.position.set(earX, 0.015, -0.01);
  headGroup.add(earMesh);
});

// Mái tóc rẽ ngôi 7/3 vuốt nhẹ hiện đại của thanh niên Việt
const hairCrownGeo = new THREE.SphereGeometry(0.165, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.58);
hairCrownGeo.scale(1.03, 1.14, 1.05);
const hairCrown = new THREE.Mesh(hairCrownGeo, materials.hair);
hairCrown.position.set(0, 0.03, -0.01);
headGroup.add(hairCrown);

// Lọn tóc mái bồng bềnh rẽ sóng
const fringeGeo = new THREE.CylinderGeometry(0.04, 0.08, 0.18, 16);
const fringe = new THREE.Mesh(fringeGeo, materials.hair);
fringe.rotation.z = Math.PI / 2.3;
fringe.rotation.y = 0.2;
fringe.position.set(-0.04, 0.135, 0.125);
fringe.scale.set(1.0, 0.5, 0.8);
headGroup.add(fringe);

// ── CÁNH TAY TRÁI & PHIN CÀ PHÊ NHÔM VIỆT NAM (Left Arm with Coffee Phin) ──
const leftShoulder = new THREE.Group();
leftShoulder.name = 'LeftShoulder';
leftShoulder.position.set(-0.24, 0.27, 0);
spineGroup.add(leftShoulder);

// Ống tay áo đũi xắn ngắn
const leftUpperArmGeo = new THREE.CylinderGeometry(0.065, 0.055, 0.22, 18);
const leftUpperArm = new THREE.Mesh(leftUpperArmGeo, materials.shirtLinen);
leftUpperArm.position.set(0, -0.11, 0);
leftUpperArm.castShadow = true;
leftShoulder.add(leftUpperArm);

// Khớp khuỷu tay trái (co góc nâng khay cà phê)
const leftElbow = new THREE.Group();
leftElbow.name = 'LeftElbow';
leftElbow.position.set(0, -0.22, 0);
leftElbow.rotation.set(0.65, 0, -0.25); // Nâng cánh tay về phía trước
leftShoulder.add(leftElbow);

// Cẳng tay da tự nhiên
const leftForearmGeo = new THREE.CylinderGeometry(0.05, 0.042, 0.20, 16);
const leftForearm = new THREE.Mesh(leftForearmGeo, materials.skin);
leftForearm.position.set(0, -0.10, 0);
leftForearm.castShadow = true;
leftElbow.add(leftForearm);

// Bàn tay trái
const leftWrist = new THREE.Group();
leftWrist.name = 'LeftWrist';
leftWrist.position.set(0, -0.20, 0);
leftWrist.rotation.set(-0.5, 0, 0);
leftElbow.add(leftWrist);

const leftHandGeo = new THREE.SphereGeometry(0.045, 14, 10);
leftHandGeo.scale(0.8, 1.2, 0.6);
const leftHand = new THREE.Mesh(leftHandGeo, materials.skin);
leftHand.position.set(0, -0.03, 0.02);
leftWrist.add(leftHand);

// ── CHIẾC PHIN CÀ PHÊ NHÔM TRUYỀN THỐNG VIỆT NAM TRÊN TAY TRÁI ──
const phinGroup = new THREE.Group();
phinGroup.name = 'Vietnamese_Coffee_Phin';
phinGroup.position.set(0, -0.02, 0.12);
phinGroup.scale.setScalar(0.7);

// 1. Đĩa lót phin (Phin saucer with rim)
const saucerGeo = new THREE.CylinderGeometry(0.12, 0.11, 0.012, 32);
const saucer = new THREE.Mesh(saucerGeo, materials.aluminumPhin);
saucer.castShadow = true;
phinGroup.add(saucer);

// 2. Thân phin cà phê hình trụ (Phin chamber)
const phinBodyGeo = new THREE.CylinderGeometry(0.085, 0.08, 0.14, 32);
const phinBody = new THREE.Mesh(phinBodyGeo, materials.aluminumPhin);
phinBody.position.set(0, 0.075, 0);
phinBody.castShadow = true;
phinGroup.add(phinBody);

// 3. Các gờ dập nổi vòng quanh thân phin
const phinRimGeo = new THREE.TorusGeometry(0.086, 0.005, 12, 32);
const phinRim1 = new THREE.Mesh(phinRimGeo, materials.aluminumPhinDark);
phinRim1.rotation.x = Math.PI / 2;
phinRim1.position.set(0, 0.05, 0);
phinGroup.add(phinRim1);

const phinRim2 = phinRim1.clone();
phinRim2.position.set(0, 0.11, 0);
phinGroup.add(phinRim2);

// 4. Nắp đậy phin (Phin lid with knob)
const lidGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.015, 32);
const lid = new THREE.Mesh(lidGeo, materials.aluminumPhin);
lid.position.set(0, 0.15, 0);
phinGroup.add(lid);

const knobGeo = new THREE.SphereGeometry(0.018, 14, 10);
const knob = new THREE.Mesh(knobGeo, materials.aluminumPhin);
knob.position.set(0, 0.17, 0);
phinGroup.add(knob);

leftWrist.add(phinGroup);

// ── CÁNH TAY PHẢI & LY CÀ PHÊ SỮA ĐÁ (Right Arm with Iced Coffee Glass) ──
const rightShoulder = new THREE.Group();
rightShoulder.name = 'RightShoulder';
rightShoulder.position.set(0.24, 0.27, 0);
spineGroup.add(rightShoulder);

const rightUpperArmGeo = new THREE.CylinderGeometry(0.065, 0.055, 0.22, 18);
const rightUpperArm = new THREE.Mesh(rightUpperArmGeo, materials.shirtLinen);
rightUpperArm.position.set(0, -0.11, 0);
rightUpperArm.castShadow = true;
rightShoulder.add(rightUpperArm);

const rightElbow = new THREE.Group();
rightElbow.name = 'RightElbow';
rightElbow.position.set(0, -0.22, 0);
rightElbow.rotation.set(0.45, 0, 0.2);
rightShoulder.add(rightElbow);

const rightForearmGeo = new THREE.CylinderGeometry(0.05, 0.042, 0.20, 16);
const rightForearm = new THREE.Mesh(rightForearmGeo, materials.skin);
rightForearm.position.set(0, -0.10, 0);
rightForearm.castShadow = true;
rightElbow.add(rightForearm);

const rightWrist = new THREE.Group();
rightWrist.name = 'RightWrist';
rightWrist.position.set(0, -0.20, 0);
rightElbow.add(rightWrist);

const rightHandGeo = new THREE.SphereGeometry(0.045, 14, 10);
rightHandGeo.scale(0.8, 1.2, 0.6);
const rightHand = new THREE.Mesh(rightHandGeo, materials.skin);
rightHand.position.set(0, -0.03, 0.02);
rightWrist.add(rightHand);

// ── LY CÀ PHÊ SỮA ĐÁ VIỆT NAM (Traditional Vietnamese Iced Milk Coffee) ──
const cupGroup = new THREE.Group();
cupGroup.name = 'CaPhe_Sua_Da_Glass';
cupGroup.position.set(0, -0.02, 0.10);
cupGroup.scale.setScalar(0.75);

// 1. Thân ly thủy tinh
const cupGlassGeo = new THREE.CylinderGeometry(0.065, 0.05, 0.20, 24, 1, true);
const cupGlass = new THREE.Mesh(cupGlassGeo, materials.glassCup);
cupGlass.castShadow = true;
cupGroup.add(cupGlass);

// 2. Lớp sữa đặc trắng ngà dưới đáy (1/3 ly)
const milkLayerGeo = new THREE.CylinderGeometry(0.054, 0.051, 0.05, 20);
const milkLayer = new THREE.Mesh(milkLayerGeo, materials.condensedMilk);
milkLayer.position.set(0, -0.07, 0);
cupGroup.add(milkLayer);

// 3. Lớp cà phê nâu đậm ở giữa (2/3 ly)
const coffeeLayerGeo = new THREE.CylinderGeometry(0.062, 0.055, 0.12, 20);
const coffeeLayer = new THREE.Mesh(coffeeLayerGeo, materials.coffeeLiquid);
coffeeLayer.position.set(0, 0.015, 0);
cupGroup.add(coffeeLayer);

// 4. Ống hút tre xanh mộc mạc cắm nghiêng trong ly
const strawGeo = new THREE.CylinderGeometry(0.006, 0.006, 0.28, 12);
const straw = new THREE.Mesh(strawGeo, materials.bambooStraw);
straw.position.set(0.02, 0.06, 0);
straw.rotation.set(0.18, 0, -0.22);
cupGroup.add(straw);

rightWrist.add(cupGroup);

// ── HAI CHÂN & KHỚP ĐỘNG HỌC (Articulated Legs & Shoes) ──
const legGeometryData = {
  thigh: new THREE.CylinderGeometry(0.082, 0.068, 0.34, 20),
  knee: new THREE.SphereGeometry(0.065, 14, 12),
  calf: new THREE.CylinderGeometry(0.065, 0.052, 0.32, 18),
  shoeUpper: new THREE.SphereGeometry(0.075, 16, 12),
  shoeSole: new THREE.CylinderGeometry(0.08, 0.085, 0.025, 20),
};

// Chân Trái
const leftHip = new THREE.Group();
leftHip.name = 'LeftHip';
leftHip.position.set(-0.11, -0.08, 0);
hipsGroup.add(leftHip);

const leftThigh = new THREE.Mesh(legGeometryData.thigh, materials.trousers);
leftThigh.position.set(0, -0.17, 0);
leftThigh.castShadow = true;
leftHip.add(leftThigh);

const leftKnee = new THREE.Group();
leftKnee.name = 'LeftKnee';
leftKnee.position.set(0, -0.34, 0);
leftHip.add(leftKnee);

const leftKneeCap = new THREE.Mesh(legGeometryData.knee, materials.trousers);
leftKnee.add(leftKneeCap);

const leftCalf = new THREE.Mesh(legGeometryData.calf, materials.trousers);
leftCalf.position.set(0, -0.16, 0);
leftCalf.castShadow = true;
leftKnee.add(leftCalf);

const leftAnkle = new THREE.Group();
leftAnkle.name = 'LeftAnkle';
leftAnkle.position.set(0, -0.32, 0);
leftKnee.add(leftAnkle);

const leftShoe = new THREE.Mesh(legGeometryData.shoeUpper, materials.shoesWhite);
leftShoe.position.set(0, 0, 0.03);
leftShoe.scale.set(0.9, 0.7, 1.4);
leftShoe.castShadow = true;
leftAnkle.add(leftShoe);

const leftSole = new THREE.Mesh(legGeometryData.shoeSole, materials.shoesSole);
leftSole.position.set(0, -0.04, 0.03);
leftSole.scale.set(0.95, 1.0, 1.45);
leftAnkle.add(leftSole);

// Chân Phải
const rightHip = new THREE.Group();
rightHip.name = 'RightHip';
rightHip.position.set(0.11, -0.08, 0);
hipsGroup.add(rightHip);

const rightThigh = new THREE.Mesh(legGeometryData.thigh, materials.trousers);
rightThigh.position.set(0, -0.17, 0);
rightThigh.castShadow = true;
rightHip.add(rightThigh);

const rightKnee = new THREE.Group();
rightKnee.name = 'RightKnee';
rightKnee.position.set(0, -0.34, 0);
rightHip.add(rightKnee);

const rightKneeCap = new THREE.Mesh(legGeometryData.knee, materials.trousers);
rightKnee.add(rightKneeCap);

const rightCalf = new THREE.Mesh(legGeometryData.calf, materials.trousers);
rightCalf.position.set(0, -0.16, 0);
rightCalf.castShadow = true;
rightKnee.add(rightCalf);

const rightAnkle = new THREE.Group();
rightAnkle.name = 'RightAnkle';
rightAnkle.position.set(0, -0.32, 0);
rightKnee.add(rightAnkle);

const rightShoe = new THREE.Mesh(legGeometryData.shoeUpper, materials.shoesWhite);
rightShoe.position.set(0, 0, 0.03);
rightShoe.scale.set(0.9, 0.7, 1.4);
rightShoe.castShadow = true;
rightAnkle.add(rightShoe);

const rightSole = new THREE.Mesh(legGeometryData.shoeSole, materials.shoesSole);
rightSole.position.set(0, -0.04, 0.03);
rightSole.scale.set(0.95, 1.0, 1.45);
rightAnkle.add(rightSole);

// ── 3. Thống Kê Lưới Hình Học & Đỉnh ───────────────────────────────────────
let triangleCount = 0;
let meshCount = 0;
root.traverse((child) => {
  if (child.isMesh && child.geometry) {
    meshCount++;
    const geo = child.geometry;
    if (geo.index) {
      triangleCount += geo.index.count / 3;
    } else if (geo.attributes.position) {
      triangleCount += geo.attributes.position.count / 3;
    }
  }
});

console.log(`📊 Thống kê Mô hình ShiftSync Vietnamese Staff:`);
console.log(`   - Tổng số lưới (Meshes): ${meshCount}`);
console.log(`   - Tổng số tam giác (Triangles): ${Math.round(triangleCount).toLocaleString()} tris`);

// ── 4. Xuất File Chuẩn glTF 2.0 Binary (.glb) ─────────────────────────────
const exporter = new GLTFExporter();
const exportOptions = {
  binary: true,
  embedImages: true,
  truncateDrawRange: false,
};

const outputWebDir = path.resolve(__dirname, '../ShiftSync-Web/public/models');
if (!fs.existsSync(outputWebDir)) {
  fs.mkdirSync(outputWebDir, { recursive: true });
}

const outputWebGlb = path.join(outputWebDir, 'ShiftSync_Vietnamese_Staff.glb');
const outputBackendGlb = path.resolve(__dirname, '../ShiftSync_Vietnamese_Staff.glb');

exporter.parse(
  root,
  (gltfBuffer) => {
    const buffer = Buffer.from(gltfBuffer);
    fs.writeFileSync(outputWebGlb, buffer);
    fs.writeFileSync(outputBackendGlb, buffer);

    const sizeKb = (buffer.length / 1024).toFixed(1);
    console.log(`✅ Xuất thành công tệp glTF 2.0 Binary:`);
    console.log(`   📍 Web Public Model: ${outputWebGlb} (${sizeKb} KB)`);
    console.log(`   📍 Backend Root:     ${outputBackendGlb} (${sizeKb} KB)`);
    console.log(`🎉 Hoàn tất sinh mô hình Nhân viên Văn Hóa Việt Nam 100%!`);
  },
  (error) => {
    console.error('❌ Lỗi xuất GLB:', error);
    process.exit(1);
  },
  exportOptions
);
