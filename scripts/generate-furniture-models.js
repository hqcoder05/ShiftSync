/**
 * generate-furniture-models.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Sinh 4 mô hình 3D Bàn Ghế Cửa Hàng Chuyên Biệt chuẩn glTF 2.0 Binary (.glb):
 * 1. ShiftSync_Bistro_Set.glb      — Bộ bàn tròn Bistro đá thạch anh & 2 ghế Bentwood bọc nệm viền đồng
 * 2. ShiftSync_Communal_Table.glb  — Bàn làm việc nhóm dài gỗ sồi tự nhiên & 6 ghế bar xoay đệm da
 * 3. ShiftSync_Booth_Sofa.glb      — Cụm sofa booth nhà hàng cao cấp nỉ xanh ngọc & bàn chữ nhật
 * 4. ShiftSync_Lounge_Nook.glb     — Góc thư giãn 2 ghế bành da bò Mid-Century & bàn trà cẩm thạch
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

console.log('🚀 Bắt đầu tạo bộ sưu tập 4 mô hình 3D Bàn Ghế Cửa Hàng GLB chuẩn chỉnh...');

// ── Bảng Màu & Vật Liệu PBR Chuẩn F&B ──────────────────────────────────────
const materials = {
  naturalOak: new THREE.MeshStandardMaterial({
    name: 'mat_furn_natural_oak',
    color: 0xD4A373, // Gỗ sồi sáng Scandinavian
    roughness: 0.55,
    metalness: 0.02,
  }),
  darkWalnut: new THREE.MeshStandardMaterial({
    name: 'mat_furn_dark_walnut',
    color: 0x5C3D2E, // Gỗ óc chó trầm sang trọng
    roughness: 0.52,
    metalness: 0.02,
  }),
  whiteQuartz: new THREE.MeshStandardMaterial({
    name: 'mat_furn_white_quartz',
    color: 0xFDFBF7, // Đá thạch anh nhân tạo trắng ngà
    roughness: 0.28,
    metalness: 0.04,
  }),
  carraraMarble: new THREE.MeshStandardMaterial({
    name: 'mat_furn_carrara_marble',
    color: 0xF1F5F9, // Đá cẩm thạch Ý
    roughness: 0.22,
    metalness: 0.06,
  }),
  powderMetalDark: new THREE.MeshStandardMaterial({
    name: 'mat_furn_powder_metal_dark',
    color: 0x1E293B, // Thép sơn tĩnh điện đen mờ cao cấp
    roughness: 0.45,
    metalness: 0.75,
  }),
  brassTrim: new THREE.MeshStandardMaterial({
    name: 'mat_furn_brass_trim',
    color: 0xD97706, // Kim loại đồng thau ánh kim bóng
    roughness: 0.20,
    metalness: 0.90,
  }),
  upholsteryGreen: new THREE.MeshStandardMaterial({
    name: 'mat_furn_upholstery_green',
    color: 0x064E3B, // Nỉ nhung xanh ngọc lục bảo (Emerald Green)
    roughness: 0.78,
    metalness: 0.04,
  }),
  upholsteryCognac: new THREE.MeshStandardMaterial({
    name: 'mat_furn_upholstery_cognac',
    color: 0x9A3412, // Da bò thuộc màu rượu cognac
    roughness: 0.65,
    metalness: 0.08,
  }),
  leatherEspresso: new THREE.MeshStandardMaterial({
    name: 'mat_furn_leather_espresso',
    color: 0x27170E, // Da màu cà phê Espresso đậm
    roughness: 0.58,
    metalness: 0.10,
  }),
  cushionCream: new THREE.MeshStandardMaterial({
    name: 'mat_furn_cushion_cream',
    color: 0xFEF3C7, // Nệm ngồi màu be kem ấm
    roughness: 0.70,
    metalness: 0.02,
  }),
};

// ── Hàm Tiện Ích Tạo Khối Hình Học ─────────────────────────────────────────
function createBox(name, w, h, d, material, pos = [0, 0, 0], rot = [0, 0, 0]) {
  const geo = new THREE.BoxGeometry(w, h, d);
  const mesh = new THREE.Mesh(geo, material);
  mesh.name = name;
  mesh.position.set(...pos);
  mesh.rotation.set(...rot);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function createCylinder(name, rTop, rBottom, height, radialSegments, material, pos = [0, 0, 0], rot = [0, 0, 0]) {
  const geo = new THREE.CylinderGeometry(rTop, rBottom, height, radialSegments);
  const mesh = new THREE.Mesh(geo, material);
  mesh.name = name;
  mesh.position.set(...pos);
  mesh.rotation.set(...rot);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. SHIFTSYNC_BISTRO_SET.GLB (Bàn Tròn & 2 Ghế Bentwood)
// ─────────────────────────────────────────────────────────────────────────────
function buildBistroSet() {
  const root = new THREE.Group();
  root.name = 'ShiftSync_Bistro_Set';

  // 1.1 Bàn Tròn Bistro
  const table = new THREE.Group();
  table.name = 'Bistro_Table';
  table.position.set(0, 0, 0);

  // Mặt bàn đá thạch anh viền bo cạnh mềm
  const top = createCylinder('Bistro_Table_Top', 0.44, 0.44, 0.038, 32, materials.whiteQuartz, [0, 0.74, 0]);
  // Vòng đồng thau nẹp dưới mặt bàn
  const brassRing = createCylinder('Bistro_Table_BrassRing', 0.445, 0.445, 0.012, 32, materials.brassTrim, [0, 0.715, 0]);
  // Trụ chân thép sơn tĩnh điện
  const col = createCylinder('Bistro_Table_Column', 0.038, 0.048, 0.69, 16, materials.powderMetalDark, [0, 0.365, 0]);
  // Vòng đồng chân đế
  const collar = createCylinder('Bistro_Table_Collar', 0.055, 0.055, 0.025, 16, materials.brassTrim, [0, 0.05, 0]);
  // Đế tròn đúc nặng giữ thăng bằng
  const base = createCylinder('Bistro_Table_Base', 0.25, 0.27, 0.028, 24, materials.powderMetalDark, [0, 0.014, 0]);

  table.add(top);
  table.add(brassRing);
  table.add(col);
  table.add(collar);
  table.add(base);
  root.add(table);

  // 1.2 Hai Ghế Bentwood
  [-0.68, 0.68].forEach((cx, idx) => {
    const chair = new THREE.Group();
    chair.name = `Bistro_Chair_${idx + 1}`;
    chair.position.set(cx, 0, 0);
    chair.rotation.y = cx > 0 ? -Math.PI / 2 : Math.PI / 2;

    // Mặt đệm nệm ngồi
    const seatBase = createCylinder('Chair_Seat_Plinth', 0.22, 0.22, 0.03, 20, materials.naturalOak, [0, 0.435, 0]);
    const cushion = createCylinder('Chair_Seat_Cushion', 0.21, 0.21, 0.045, 20, materials.cushionCream, [0, 0.47, 0]);
    chair.add(seatBase);
    chair.add(cushion);

    // Lưng tựa uốn cong
    const backRest = createBox('Chair_Backrest', 0.42, 0.30, 0.03, materials.naturalOak, [0, 0.68, -0.18], [0.12, 0, 0]);
    const postL = createCylinder('Chair_Post_L', 0.012, 0.012, 0.28, 10, materials.powderMetalDark, [-0.15, 0.58, -0.16]);
    const postR = createCylinder('Chair_Post_R', 0.012, 0.012, 0.28, 10, materials.powderMetalDark, [0.15, 0.58, -0.16]);
    chair.add(backRest);
    chair.add(postL);
    chair.add(postR);

    // 4 chân ghế thanh mảnh với bọc đồng ferrule sang trọng
    [[-0.14, -0.14], [0.14, -0.14], [-0.14, 0.14], [0.14, 0.14]].forEach(([lx, lz], lIdx) => {
      const leg = createCylinder(`Chair_Leg_${lIdx}`, 0.013, 0.009, 0.43, 10, materials.powderMetalDark, [lx, 0.22, lz], [lz * 0.25, 0, -lx * 0.25]);
      const ferrule = createCylinder(`Chair_Ferrule_${lIdx}`, 0.010, 0.009, 0.04, 10, materials.brassTrim, [lx, 0.02, lz]);
      chair.add(leg);
      chair.add(ferrule);
    });

    root.add(chair);
  });

  return root;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. SHIFTSYNC_COMMUNAL_TABLE.GLB (Bàn Dài Trestle & 6 Ghế Bar)
// ─────────────────────────────────────────────────────────────────────────────
function buildCommunalTable() {
  const root = new THREE.Group();
  root.name = 'ShiftSync_Communal_Table';

  // 2.1 Mặt Bàn Gỗ Sồi Dài (4.6m x 1.0m)
  const top = createBox('Communal_Oak_Top', 4.6, 0.065, 1.0, materials.naturalOak, [0, 0.98, 0]);
  root.add(top);

  // Nắp che luồn dây điện âm bàn bằng đồng thau
  [-1.4, 0, 1.4].forEach((cx, idx) => {
    const lid = createBox(`Communal_Cable_Lid_${idx}`, 0.28, 0.005, 0.12, materials.brassTrim, [cx, 1.015, 0]);
    root.add(lid);
  });

  // Chân khung Trestle chữ U thép đen mờ
  [-1.85, 1.85].forEach((tx, idx) => {
    const legL = createBox(`Trestle_Leg_L_${idx}`, 0.08, 0.94, 0.06, materials.powderMetalDark, [tx, 0.47, -0.40]);
    const legR = createBox(`Trestle_Leg_R_${idx}`, 0.08, 0.94, 0.06, materials.powderMetalDark, [tx, 0.47, 0.40]);
    const topBar = createBox(`Trestle_Top_Bar_${idx}`, 0.08, 0.06, 0.86, materials.powderMetalDark, [tx, 0.92, 0]);
    const foot = createBox(`Trestle_Foot_${idx}`, 0.10, 0.04, 0.92, materials.powderMetalDark, [tx, 0.02, 0]);
    root.add(legL);
    root.add(legR);
    root.add(topBar);
    root.add(foot);
  });

  // Thanh gác chân chân đồng xuyên suốt
  const footStretcher = createCylinder('Communal_Foot_Stretcher', 0.022, 0.022, 4.0, 14, materials.brassTrim, [0, 0.28, 0], [0, 0, Math.PI / 2]);
  root.add(footStretcher);

  // 2.2 Sáu Ghế Bar Xoay Đệm Da Espresso
  [-1.5, 0, 1.5].forEach((sx, idx) => {
    [-0.68, 0.68].forEach((sz, sideIdx) => {
      const stool = new THREE.Group();
      stool.name = `Bar_Stool_${idx}_${sideIdx}`;
      stool.position.set(sx, 0, sz);

      const cushion = createCylinder('Stool_Seat_Cushion', 0.19, 0.19, 0.065, 24, materials.leatherEspresso, [0, 0.72, 0]);
      const plate = createCylinder('Stool_Seat_Plate', 0.195, 0.195, 0.015, 20, materials.powderMetalDark, [0, 0.685, 0]);
      const column = createCylinder('Stool_Column', 0.028, 0.028, 0.66, 14, materials.powderMetalDark, [0, 0.34, 0]);
      const footRing = createCylinder('Stool_Foot_Ring', 0.18, 0.18, 0.02, 18, materials.brassTrim, [0, 0.26, 0]);
      const baseDisc = createCylinder('Stool_Base_Disc', 0.23, 0.23, 0.02, 20, materials.powderMetalDark, [0, 0.01, 0]);

      stool.add(cushion);
      stool.add(plate);
      stool.add(column);
      stool.add(footRing);
      stool.add(baseDisc);
      root.add(stool);
    });
  });

  return root;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. SHIFTSYNC_BOOTH_SOFA.GLB (Cụm Sofa Booth & Bàn)
// ─────────────────────────────────────────────────────────────────────────────
function buildBoothSofa() {
  const root = new THREE.Group();
  root.name = 'ShiftSync_Booth_Sofa';

  // Đế chân gỗ sồi
  const plinth = createBox('Booth_Plinth', 1.8, 0.22, 1.4, materials.naturalOak, [0, 0.11, 0]);
  root.add(plinth);

  // 2 đệm ngồi êm ái hai bên
  const seatNorth = createBox('Booth_Seat_North', 1.76, 0.18, 0.50, materials.upholsteryGreen, [0, 0.31, -0.42]);
  const seatSouth = createBox('Booth_Seat_South', 1.76, 0.18, 0.50, materials.upholsteryGreen, [0, 0.31, 0.42]);
  root.add(seatNorth);
  root.add(seatSouth);

  // Vách tựa lưng cao cách âm sang trọng
  const backDivider = createBox('Booth_Divider_Backrest', 1.76, 1.15, 0.18, materials.upholsteryGreen, [0, 0.68, 0]);
  root.add(backDivider);

  // Bàn chữ nhật trung tâm đá thạch anh
  const tableTop = createBox('Booth_Table_Top', 1.35, 0.04, 0.70, materials.whiteQuartz, [0, 0.74, 0]);
  const tablePed = createCylinder('Booth_Table_Pedestal', 0.065, 0.075, 0.70, 14, materials.powderMetalDark, [0, 0.37, 0]);
  const tableFoot = createBox('Booth_Table_Foot', 0.65, 0.02, 0.45, materials.powderMetalDark, [0, 0.01, 0]);
  root.add(tableTop);
  root.add(tablePed);
  root.add(tableFoot);

  return root;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. SHIFTSYNC_LOUNGE_NOOK.GLB (2 Ghế Bành Mid-Century & Bàn Trà Cẩm Thạch)
// ─────────────────────────────────────────────────────────────────────────────
function buildLoungeNook() {
  const root = new THREE.Group();
  root.name = 'ShiftSync_Lounge_Nook';

  // 4.1 Bàn Trà Mặt Đá Cẩm Thạch Carrara
  const coffeeTable = new THREE.Group();
  coffeeTable.name = 'Lounge_Coffee_Table';
  coffeeTable.position.set(0, 0, 0);

  const top = createCylinder('Coffee_Table_Top', 0.48, 0.48, 0.03, 32, materials.carraraMarble, [0, 0.44, 0]);
  const brassRing = createCylinder('Coffee_Table_BrassRing', 0.49, 0.49, 0.01, 32, materials.brassTrim, [0, 0.425, 0]);
  coffeeTable.add(top);
  coffeeTable.add(brassRing);

  // 3 Chân Hairpin Đồng Thau
  [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3].forEach((ang, idx) => {
    const lx = Math.cos(ang) * 0.35;
    const lz = Math.sin(ang) * 0.35;
    const leg = createCylinder(`Coffee_Leg_${idx}`, 0.009, 0.009, 0.43, 10, materials.brassTrim, [lx, 0.215, lz], [0.15 * Math.sin(ang), 0, -0.15 * Math.cos(ang)]);
    coffeeTable.add(leg);
  });
  root.add(coffeeTable);

  // 4.2 Hai Ghế Bành Thư Giãn Da Rượu Cognac
  [-0.92, 0.92].forEach((ax, idx) => {
    const chair = new THREE.Group();
    chair.name = `Lounge_Armchair_${idx + 1}`;
    chair.position.set(ax, 0, 0);
    chair.rotation.y = ax > 0 ? -Math.PI / 4 : Math.PI / 4;

    // Vỏ gỗ óc chó uốn cong bao quanh
    const shell = createBox('Lounge_Wood_Shell', 0.68, 0.42, 0.65, materials.darkWalnut, [0, 0.32, 0]);
    // Đệm ngồi da bò thuộc êm ái
    const seatCushion = createBox('Lounge_Leather_Seat', 0.62, 0.16, 0.58, materials.upholsteryCognac, [0, 0.40, 0.02]);
    // Đệm tựa lưng ngả thoải mái
    const backCushion = createBox('Lounge_Leather_Back', 0.62, 0.48, 0.14, materials.upholsteryCognac, [0, 0.66, -0.22], [0.22, 0, 0]);
    chair.add(shell);
    chair.add(seatCushion);
    chair.add(backCushion);

    // 4 chân gỗ óc chó vuốt côn bọc đế đồng
    [[-0.26, -0.24], [0.26, -0.24], [-0.26, 0.24], [0.26, 0.24]].forEach(([lx, lz], lIdx) => {
      const leg = createCylinder(`Lounge_Leg_${lIdx}`, 0.016, 0.010, 0.26, 10, materials.darkWalnut, [lx, 0.13, lz], [lz * 0.3, 0, -lx * 0.3]);
      const ferrule = createCylinder(`Lounge_Ferrule_${lIdx}`, 0.012, 0.010, 0.04, 10, materials.brassTrim, [lx, 0.02, lz]);
      chair.add(leg);
      chair.add(ferrule);
    });

    root.add(chair);
  });

  return root;
}

// ── Hàm Xuất File GLB Nhị Phân ─────────────────────────────────────────────
async function exportGlb(group, fileName) {
  const exporter = new GLTFExporter();

  return new Promise((resolve, reject) => {
    exporter.parse(
      group,
      (result) => {
        const buffer = Buffer.from(result);
        const outDir = path.resolve(__dirname, '../ShiftSync-Web/public/models');
        if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

        // Ghi vào ShiftSync-Web/public/models/
        const webPath = path.resolve(outDir, fileName);
        fs.writeFileSync(webPath, buffer);

        // Ghi vào root repository
        const rootPath = path.resolve(__dirname, '../', fileName);
        fs.writeFileSync(rootPath, buffer);

        // Ghi vào shiftsync-backend/
        const backendPath = path.resolve(__dirname, '../shiftsync-backend', fileName);
        fs.writeFileSync(backendPath, buffer);

        const sizeKb = (buffer.length / 1024).toFixed(1);
        console.log(`✅ Xuất thành công: ${fileName} (${sizeKb} KB)`);
        resolve(buffer);
      },
      (error) => {
        console.error(`❌ Lỗi xuất ${fileName}:`, error);
        reject(error);
      },
      { binary: true }
    );
  });
}

// ── Chạy Toàn Bộ Quá Trình Xuất Bản ─────────────────────────────────────────
async function run() {
  const bistro = buildBistroSet();
  await exportGlb(bistro, 'ShiftSync_Bistro_Set.glb');

  const communal = buildCommunalTable();
  await exportGlb(communal, 'ShiftSync_Communal_Table.glb');

  const booth = buildBoothSofa();
  await exportGlb(booth, 'ShiftSync_Booth_Sofa.glb');

  const lounge = buildLoungeNook();
  await exportGlb(lounge, 'ShiftSync_Lounge_Nook.glb');

  console.log('🎉 Hoàn tất xuất bản toàn bộ 4 mô hình 3D Bàn Ghế Cửa Hàng GLB!');
}

run().catch((err) => {
  console.error('Fatal error generating furniture models:', err);
  process.exit(1);
});
