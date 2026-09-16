/**
 * FurnitureBuilder.js
 * Enhanced living 3D furniture & operational workstations for ShiftSync.
 * Builds highly recognizable, mature low-poly F&B equipment with soft shadows.
 */

import * as THREE from 'three';

// Shared reusable materials with matte SaaS finish
export const materials = {
  warmWood: new THREE.MeshStandardMaterial({ color: 0x8D6E63, roughness: 0.7 }),
  darkWood: new THREE.MeshStandardMaterial({ color: 0x3E2723, roughness: 0.75 }),
  oakParquet: new THREE.MeshStandardMaterial({ color: 0xC7A17A, roughness: 0.6 }),
  marbleTop: new THREE.MeshStandardMaterial({ color: 0xFAF8F5, roughness: 0.25 }),
  metalInox: new THREE.MeshStandardMaterial({ color: 0xCBD5E1, roughness: 0.2, metalness: 0.7 }),
  darkMetal: new THREE.MeshStandardMaterial({ color: 0x1E293B, roughness: 0.5, metalness: 0.5 }),
  espressoRed: new THREE.MeshStandardMaterial({ color: 0x991B1B, roughness: 0.35, metalness: 0.2 }),
  espressoChrome: new THREE.MeshStandardMaterial({ color: 0xE2E8F0, roughness: 0.15, metalness: 0.85 }),
  posScreen: new THREE.MeshStandardMaterial({ color: 0x0F172A, roughness: 0.2, emissive: 0x0284C7, emissiveIntensity: 0.3 }),
  posBody: new THREE.MeshStandardMaterial({ color: 0x1E293B, roughness: 0.4 }),
  bakeryGold: new THREE.MeshStandardMaterial({ color: 0xD97706, roughness: 0.55 }),
  bakeryChoc: new THREE.MeshStandardMaterial({ color: 0x451A03, roughness: 0.6 }),
  bakeryMacaron: new THREE.MeshStandardMaterial({ color: 0xF472B6, roughness: 0.4 }),
  trayMetal: new THREE.MeshStandardMaterial({ color: 0x94A3B8, roughness: 0.25, metalness: 0.6 }),
  plantPot: new THREE.MeshStandardMaterial({ color: 0xC2410C, roughness: 0.85 }),
  plantLeaf: new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.6 }),
  chairCushion: new THREE.MeshStandardMaterial({ color: 0x3B82F6, roughness: 0.7 }),
  glassCase: new THREE.MeshStandardMaterial({ color: 0xE0F2FE, transparent: true, opacity: 0.38, roughness: 0.1 }),
  chalkboard: new THREE.MeshStandardMaterial({ color: 0x18181B, roughness: 0.9 }),
  ovenGlow: new THREE.MeshStandardMaterial({ color: 0xEA580C, emissive: 0xF97316, emissiveIntensity: 0.8, roughness: 0.2 }),
  lampGold: new THREE.MeshStandardMaterial({ color: 0xF59E0B, emissive: 0xFEF08A, emissiveIntensity: 0.5, roughness: 0.3 }),
};

/**
 * Creates a stylized wall signage board with operational dashboard
 */
function createWallMenuTexture(title = 'SHIFTSYNC OPERATIONS') {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#0F172A';
  ctx.fillRect(0, 0, 512, 256);

  ctx.strokeStyle = '#38BDF8';
  ctx.lineWidth = 4;
  ctx.strokeRect(10, 10, 492, 236);

  ctx.fillStyle = '#38BDF8';
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(String(title || 'SHIFTSYNC OPERATIONS').toUpperCase(), 256, 45);

  ctx.fillStyle = '#E2E8F0';
  ctx.font = '16px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('• Real-time Spatial Monitoring', 36, 90);
  ctx.fillText('• Optimal Workforce Coverage', 36, 125);
  ctx.fillText('• Dynamic Station Allocation', 36, 160);
  ctx.fillText('• Geofenced Safety Constraints', 36, 195);

  ctx.fillStyle = '#10B981';
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('ONLINE', 476, 90);
  ctx.fillText('OPTIMAL', 476, 125);
  ctx.fillText('ACTIVE', 476, 160);
  ctx.fillText('SECURE', 476, 195);

  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  return tex;
}

/**
 * 1. Barista Coffee Bar Workstation (Living Detail Upgrade)
 */
export function buildBaristaWorkstation(width = 3.6, depth = 1.8) {
  const group = new THREE.Group();

  // 1.1 Main Wooden Counter Base with beveled front panels
  const base = new THREE.Mesh(new THREE.BoxGeometry(width * 0.88, 0.88, 0.75), materials.darkWood);
  base.position.set(0, 0.44, 0);
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);

  // Wooden slatted decorative front panels
  const slatsCount = 10;
  const slatW = (width * 0.84) / slatsCount - 0.04;
  for (let i = 0; i < slatsCount; i++) {
    const sx = -((width * 0.84) / 2) + i * (slatW + 0.04) + slatW / 2;
    const slat = new THREE.Mesh(new THREE.BoxGeometry(slatW, 0.82, 0.02), materials.warmWood);
    slat.position.set(sx, 0.44, 0.385);
    slat.castShadow = true;
    group.add(slat);
  }

  // 1.2 White Marble Countertop with subtle overhang
  const top = new THREE.Mesh(new THREE.BoxGeometry(width * 0.92, 0.07, 0.82), materials.marbleTop);
  top.position.set(0, 0.915, 0);
  top.castShadow = true;
  top.receiveShadow = true;
  group.add(top);

  // 1.3 High-Detail Espresso Machine
  const espGroup = new THREE.Group();
  espGroup.name = 'espressoMachine';
  espGroup.position.set(-width * 0.22, 0.95, 0.06);

  // Main chassis (Dark cherry red)
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.48, 0.46), materials.espressoRed);
  chassis.position.set(0, 0.24, 0);
  chassis.castShadow = true;
  chassis.receiveShadow = true;
  espGroup.add(chassis);

  // Chrome drip tray with grill
  const dripTray = new THREE.Mesh(new THREE.BoxGeometry(0.80, 0.06, 0.22), materials.espressoChrome);
  dripTray.position.set(0, 0.03, 0.31);
  dripTray.castShadow = true;
  espGroup.add(dripTray);

  // Dual Group Heads & Portafilters
  [-0.18, 0.18].forEach((px) => {
    // Group collar
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.08, 12), materials.espressoChrome);
    collar.position.set(px, 0.26, 0.23);
    espGroup.add(collar);

    // Portafilter handle pointing forward
    const pf = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.20, 8), materials.darkWood);
    pf.rotation.x = Math.PI / 2;
    pf.position.set(px, 0.25, 0.34);
    pf.castShadow = true;
    espGroup.add(pf);
  });

  // Dual Steam Wands angled outward
  [-0.32, 0.32].forEach((sx, i) => {
    const wand = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.22, 8), materials.espressoChrome);
    wand.rotation.z = i === 0 ? 0.35 : -0.35;
    wand.rotation.x = 0.2;
    wand.position.set(sx, 0.22, 0.26);
    wand.castShadow = true;
    espGroup.add(wand);
  });

  // Stainless milk pitcher next to wand
  const pitcher = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.12, 12), materials.metalInox);
  pitcher.position.set(-0.35, 0.06, 0.32);
  pitcher.castShadow = true;
  espGroup.add(pitcher);

  // Knockbox on counter
  const knockbox = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.18), materials.posBody);
  knockbox.position.set(-0.52, 0.06, 0.15);
  knockbox.castShadow = true;
  espGroup.add(knockbox);

  // Pressure gauge dials
  [-0.08, 0.08].forEach((gx) => {
    const dial = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.02, 12), materials.espressoChrome);
    dial.rotation.x = Math.PI / 2;
    dial.position.set(gx, 0.36, 0.235);
    espGroup.add(dial);
  });

  // Cup warming rack on top with stacked ceramic cups
  const cupGeo = new THREE.CylinderGeometry(0.045, 0.035, 0.065, 12);
  [-0.26, -0.13, 0.0, 0.13, 0.26].forEach((cx) => {
    const cup1 = new THREE.Mesh(cupGeo, materials.marbleTop);
    cup1.position.set(cx, 0.51, -0.05);
    cup1.castShadow = true;
    espGroup.add(cup1);

    const cup2 = new THREE.Mesh(cupGeo, materials.marbleTop);
    cup2.position.set(cx, 0.575, -0.05);
    cup2.castShadow = true;
    espGroup.add(cup2);
  });
  group.add(espGroup);

  // 1.4 Professional Coffee Grinder
  const grinderGroup = new THREE.Group();
  grinderGroup.position.set(width * 0.12, 0.95, 0.06);

  const grinderBody = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.38, 0.24), materials.posBody);
  grinderBody.position.set(0, 0.19, 0);
  grinderBody.castShadow = true;
  grinderGroup.add(grinderBody);

  const hopper = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.06, 0.24, 14), materials.glassCase);
  hopper.position.set(0, 0.49, 0);
  grinderGroup.add(hopper);

  const hopperCap = new THREE.Mesh(new THREE.CylinderGeometry(0.135, 0.135, 0.03, 14), materials.posBody);
  hopperCap.position.set(0, 0.62, 0);
  grinderGroup.add(hopperCap);
  group.add(grinderGroup);

  // 1.5 Pastry Display Glass Case on the right side of counter
  const caseGroup = new THREE.Group();
  caseGroup.position.set(width * 0.35, 0.95, 0.04);

  // Glass enclosure
  const glass = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.42, 0.55), materials.glassCase);
  glass.position.set(0, 0.21, 0);
  caseGroup.add(glass);

  // Interior 2 shelves
  [0.08, 0.24].forEach((sy, sIdx) => {
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.02, 0.50), materials.trayMetal);
    shelf.position.set(0, sy, 0);
    shelf.castShadow = true;
    caseGroup.add(shelf);

    if (sIdx === 0) {
      // Golden croissants
      [-0.18, 0, 0.18].forEach((bx) => {
        const croissant = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.028, 6, 12, Math.PI), materials.bakeryGold);
        croissant.rotation.x = -Math.PI / 2;
        croissant.position.set(bx, sy + 0.035, 0);
        croissant.castShadow = true;
        caseGroup.add(croissant);
      });
    } else {
      // Macarons / Pastries
      [-0.18, -0.06, 0.06, 0.18].forEach((mx) => {
        const macaron = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.03, 10), materials.bakeryMacaron);
        macaron.position.set(mx, sy + 0.025, 0);
        macaron.castShadow = true;
        caseGroup.add(macaron);
      });
    }
  });
  group.add(caseGroup);

  // 1.6 Wall Chalkboard Menu mounted behind Barista (Z = -1.0m)
  const menuMat = new THREE.MeshStandardMaterial({
    map: createWallMenuTexture(),
    roughness: 0.85,
  });
  const menuBoard = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.2, 0.04), menuMat);
  menuBoard.position.set(0, 2.3, -1.05);
  menuBoard.castShadow = true;
  group.add(menuBoard);

  // Wooden frame around chalkboard
  const frameGeo = new THREE.BoxGeometry(2.48, 1.28, 0.03);
  const frame = new THREE.Mesh(frameGeo, materials.warmWood);
  frame.position.set(0, 2.3, -1.06);
  group.add(frame);

  // 1.7 Hanging Bell Pendant Lamps above the counter
  [-width * 0.25, width * 0.25].forEach((lx) => {
    const lampGroup = new THREE.Group();
    lampGroup.name = 'pendantLamp';
    lampGroup.position.set(lx, 2.8, 0);

    // Cord
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 1.4, 6), materials.darkMetal);
    cord.position.y = -0.7;
    lampGroup.add(cord);

    // Bell shade
    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.18, 12, 1, true), materials.darkMetal);
    shade.position.y = -1.4;
    shade.castShadow = true;
    lampGroup.add(shade);

    // Warm glowing bulb
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 12), materials.lampGold);
    bulb.position.y = -1.42;
    lampGroup.add(bulb);

    group.add(lampGroup);
  });

  return group;
}

/**
 * 2. POS & Cashier Station (Living Detail Upgrade)
 */
export function buildCashierWorkstation(width = 3.0) {
  const group = new THREE.Group();

  // Modern Counter with customer ledge
  const base = new THREE.Mesh(new THREE.BoxGeometry(width * 0.85, 0.88, 0.72), materials.darkWood);
  base.position.set(0, 0.44, 0);
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);

  const top = new THREE.Mesh(new THREE.BoxGeometry(width * 0.90, 0.07, 0.78), materials.marbleTop);
  top.position.set(0, 0.915, 0);
  top.castShadow = true;
  top.receiveShadow = true;
  group.add(top);

  // Customer raised bag ledge
  const ledge = new THREE.Mesh(new THREE.BoxGeometry(width * 0.85, 0.04, 0.22), materials.warmWood);
  ledge.position.set(0, 0.78, 0.42);
  ledge.castShadow = true;
  group.add(ledge);

  // Touchscreen POS terminal
  const posGroup = new THREE.Group();
  posGroup.position.set(-0.28, 0.95, 0.06);

  const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.07, 0.18, 12), materials.posBody);
  stand.position.set(0, 0.09, 0);
  stand.castShadow = true;
  posGroup.add(stand);

  const screenBody = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.30, 0.04), materials.posBody);
  screenBody.position.set(0, 0.25, 0);
  screenBody.rotation.x = -0.32;
  screenBody.castShadow = true;
  posGroup.add(screenBody);

  const screenFace = new THREE.Mesh(new THREE.PlaneGeometry(0.40, 0.26), materials.posScreen);
  screenFace.position.set(0, 0.25, 0.022);
  screenFace.rotation.x = -0.32;
  posGroup.add(screenFace);
  group.add(posGroup);

  // Customer payment terminal & Receipt printer
  const cardTerminal = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.07, 0.18), materials.darkMetal);
  cardTerminal.rotation.x = 0.2;
  cardTerminal.position.set(-0.28, 0.96, 0.26);
  cardTerminal.castShadow = true;
  group.add(cardTerminal);

  const printer = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.16, 0.20), materials.posBody);
  printer.position.set(0.32, 1.03, 0.08);
  printer.castShadow = true;
  group.add(printer);

  // Tip jar on counter
  const tipJar = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.16, 12), materials.glassCase);
  tipJar.position.set(0.62, 1.03, 0.15);
  tipJar.castShadow = true;
  group.add(tipJar);

  // Queue Stanchion Posts with velvet rope in front of counter
  [-0.9, 0.9].forEach((stx) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.9, 10), materials.espressoChrome);
    post.position.set(stx, 0.45, 1.1);
    post.castShadow = true;
    group.add(post);

    const baseDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.03, 16), materials.espressoChrome);
    baseDisc.position.set(stx, 0.015, 1.1);
    baseDisc.receiveShadow = true;
    group.add(baseDisc);
  });

  return group;
}

/**
 * 3. Commercial Kitchen & Bakery Station (Living Detail Upgrade)
 */
export function buildKitchenWorkstation(width = 3.6) {
  const group = new THREE.Group();

  // Stainless prep island
  const tableTop = new THREE.Mesh(new THREE.BoxGeometry(width * 0.86, 0.06, 0.85), materials.metalInox);
  tableTop.position.set(0, 0.88, 0);
  tableTop.castShadow = true;
  tableTop.receiveShadow = true;
  group.add(tableTop);

  const legGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.85, 8);
  const halfW = (width * 0.86) / 2 - 0.08;
  const halfD = 0.85 / 2 - 0.08;
  [[-halfW, -halfD], [halfW, -halfD], [-halfW, halfD], [halfW, halfD]].forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(legGeo, materials.metalInox);
    leg.position.set(lx, 0.425, lz);
    leg.castShadow = true;
    group.add(leg);
  });

  // Cutting board with knife
  const board = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.03, 0.35), materials.warmWood);
  board.position.set(-0.35, 0.925, 0);
  board.castShadow = true;
  group.add(board);

  // Large Commercial Bakery Deck Oven with glowing glass
  const ovenGroup = new THREE.Group();
  ovenGroup.position.set(width * 0.32, 0.85, -0.05);

  const ovenBody = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.95, 0.75), materials.metalInox);
  ovenBody.castShadow = true;
  ovenBody.receiveShadow = true;
  ovenGroup.add(ovenBody);

  // Oven glowing glass windows
  [-0.18, 0.18].forEach((oy) => {
    const windowMesh = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.22, 0.03), materials.ovenGlow);
    windowMesh.position.set(0, oy, 0.38);
    ovenGroup.add(windowMesh);
  });
  group.add(ovenGroup);

  return group;
}

/**
 * 4. Dining Hall Arrangements (Round table + Communal table)
 */
export function buildDiningSet() {
  const group = new THREE.Group();

  // 4.1 Round Table Setup
  const roundTable = new THREE.Group();
  roundTable.position.set(-0.85, 0, 0);

  const tableTop = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 0.05, 24), materials.oakParquet);
  tableTop.position.set(0, 0.74, 0);
  tableTop.castShadow = true;
  tableTop.receiveShadow = true;
  roundTable.add(tableTop);

  const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.72, 12), materials.darkMetal);
  pedestal.position.set(0, 0.36, 0);
  pedestal.castShadow = true;
  roundTable.add(pedestal);

  const baseDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.02, 16), materials.darkMetal);
  baseDisc.position.set(0, 0.01, 0);
  baseDisc.receiveShadow = true;
  roundTable.add(baseDisc);

  // Minimalist flower vase on table
  const vase = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.14, 10), materials.marbleTop);
  vase.position.set(0, 0.83, 0);
  vase.castShadow = true;
  roundTable.add(vase);

  // 2 Dining Chairs with comfortable cushions
  [-0.78, 0.78].forEach((cx, i) => {
    const chair = new THREE.Group();
    chair.position.set(cx, 0, 0);
    chair.rotation.y = i === 0 ? Math.PI / 2 : -Math.PI / 2;

    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.06, 0.38), materials.chairCushion);
    seat.position.set(0, 0.44, 0);
    seat.castShadow = true;
    chair.add(seat);

    const back = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.35, 0.04), materials.warmWood);
    back.position.set(0, 0.68, -0.17);
    back.castShadow = true;
    chair.add(back);

    const chairLegGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.42, 8);
    [[-0.15, -0.15], [0.15, -0.15], [-0.15, 0.15], [0.15, 0.15]].forEach(([lx, lz]) => {
      const leg = new THREE.Mesh(chairLegGeo, materials.darkMetal);
      leg.position.set(lx, 0.21, lz);
      leg.castShadow = true;
      chair.add(leg);
    });
    roundTable.add(chair);
  });
  group.add(roundTable);

  // 4.2 Communal Long Bar Table Setup
  const communalTable = new THREE.Group();
  communalTable.position.set(1.1, 0, 0);

  const longTop = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.06, 0.7), materials.warmWood);
  longTop.position.set(0, 0.95, 0);
  longTop.castShadow = true;
  longTop.receiveShadow = true;
  communalTable.add(longTop);

  // Table frame legs
  [[-0.72, 0], [0.72, 0]].forEach(([fx, fz]) => {
    const legFrame = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.92, 0.62), materials.darkMetal);
    legFrame.position.set(fx, 0.46, fz);
    legFrame.castShadow = true;
    communalTable.add(legFrame);
  });

  // 4 Bar Stools
  [[-0.45, -0.48], [0.45, -0.48], [-0.45, 0.48], [0.45, 0.48]].forEach(([sx, sz]) => {
    const stool = new THREE.Group();
    stool.position.set(sx, 0, sz);

    const stoolSeat = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.05, 16), materials.oakParquet);
    stoolSeat.position.set(0, 0.65, 0);
    stoolSeat.castShadow = true;
    stool.add(stoolSeat);

    const stoolLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.63, 8), materials.darkMetal);
    stoolLeg.position.set(0, 0.315, 0);
    stoolLeg.castShadow = true;
    stool.add(stoolLeg);

    communalTable.add(stool);
  });
  group.add(communalTable);

  return group;
}

/**
 * 5. Potted Plant (Ficus / Monstera)
 */
export function buildIndoorPlant() {
  const group = new THREE.Group();

  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.17, 0.40, 16), materials.plantPot);
  pot.position.set(0, 0.20, 0);
  pot.castShadow = true;
  pot.receiveShadow = true;
  group.add(pot);

  const leafGeo = new THREE.SphereGeometry(0.20, 8, 8);
  leafGeo.scale(1.2, 0.2, 0.8);

  const angles = [0, Math.PI * 0.4, Math.PI * 0.8, Math.PI * 1.2, Math.PI * 1.6];
  angles.forEach((ang, i) => {
    const leaf = new THREE.Mesh(leafGeo, materials.plantLeaf);
    const radius = 0.18 + (i % 2) * 0.06;
    leaf.position.set(Math.cos(ang) * radius, 0.40 + i * 0.05, Math.sin(ang) * radius);
    leaf.rotation.y = ang;
    leaf.rotation.z = 0.38;
    leaf.castShadow = true;
    group.add(leaf);
  });

  return group;
}

/**
 * 5. Retail Display Rack (Footwear, Shoes, Apparel, Packaged Goods)
 */
export function buildRetailDisplayRack(width = 3.2, depth = 1.4) {
  const group = new THREE.Group();

  // Tier 1 Base platform
  const base = new THREE.Mesh(new THREE.BoxGeometry(width * 0.85, 0.35, depth * 0.8), materials.warmWood);
  base.position.set(0, 0.175, 0);
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);

  // Tier 2 Raised Display Pedestal
  const tier2 = new THREE.Mesh(new THREE.BoxGeometry(width * 0.65, 0.35, depth * 0.5), materials.marbleTop);
  tier2.position.set(0, 0.525, 0);
  tier2.castShadow = true;
  tier2.receiveShadow = true;
  group.add(tier2);

  // Tier 3 Accent Highlight Block
  const tier3 = new THREE.Mesh(new THREE.BoxGeometry(width * 0.4, 0.25, depth * 0.3), materials.darkMetal);
  tier3.position.set(0, 0.825, 0);
  tier3.castShadow = true;
  group.add(tier3);

  // Displayed items (e.g. shoe boxes / retail packaging)
  const boxMatA = new THREE.MeshStandardMaterial({ color: 0x9333EA, roughness: 0.4 });
  const boxMatB = new THREE.MeshStandardMaterial({ color: 0x0284C7, roughness: 0.4 });
  const boxMatC = new THREE.MeshStandardMaterial({ color: 0x10B981, roughness: 0.4 });

  for (let i = -1; i <= 1; i++) {
    const itemA = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.14, 0.22), i === 0 ? boxMatA : boxMatB);
    itemA.position.set(i * 0.8, 0.42, 0.25);
    itemA.rotation.y = i * 0.15;
    itemA.castShadow = true;
    group.add(itemA);

    const itemB = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.12, 0.18), boxMatC);
    itemB.position.set(i * 0.5, 0.76, 0);
    itemB.castShadow = true;
    group.add(itemB);
  }

  // Modern overhead slim light bar
  const postL = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.4, 8), materials.metalInox);
  postL.position.set(-width * 0.38, 0.7, -depth * 0.35);
  group.add(postL);

  const postR = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.4, 8), materials.metalInox);
  postR.position.set(width * 0.38, 0.7, -depth * 0.35);
  group.add(postR);

  const lightBar = new THREE.Mesh(new THREE.BoxGeometry(width * 0.8, 0.04, 0.06), materials.darkMetal);
  lightBar.position.set(0, 1.4, -depth * 0.35);
  group.add(lightBar);

  return group;
}

/**
 * 6. Salon & Beauty Styling Station (Mirrors, Vanity, Salon Chair)
 */
export function buildStylingStation(width = 3.2) {
  const group = new THREE.Group();

  // Vanity table
  const vanity = new THREE.Mesh(new THREE.BoxGeometry(width * 0.75, 0.85, 0.6), materials.darkWood);
  vanity.position.set(0, 0.425, -0.2);
  vanity.castShadow = true;
  vanity.receiveShadow = true;
  group.add(vanity);

  const vanityTop = new THREE.Mesh(new THREE.BoxGeometry(width * 0.78, 0.04, 0.64), materials.marbleTop);
  vanityTop.position.set(0, 0.87, -0.2);
  group.add(vanityTop);

  // Large vanity illuminated mirror
  const mirrorFrame = new THREE.Mesh(new THREE.BoxGeometry(width * 0.65, 1.25, 0.05), materials.darkMetal);
  mirrorFrame.position.set(0, 1.55, -0.48);
  mirrorFrame.castShadow = true;
  group.add(mirrorFrame);

  const mirrorGlass = new THREE.Mesh(new THREE.PlaneGeometry(width * 0.6, 1.15), materials.glassCase);
  mirrorGlass.position.set(0, 1.55, -0.45);
  group.add(mirrorGlass);

  // Swivel styling chair with hydraulic chrome stem
  const chairBase = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.03, 16), materials.metalInox);
  chairBase.position.set(0, 0.015, 0.55);
  group.add(chairBase);

  const chairStem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.4, 12), materials.metalInox);
  chairStem.position.set(0, 0.22, 0.55);
  group.add(chairStem);

  const chairSeat = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.24, 0.1, 16), materials.chairCushion);
  chairSeat.position.set(0, 0.47, 0.55);
  chairSeat.castShadow = true;
  group.add(chairSeat);

  const chairBack = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.35, 0.06), materials.chairCushion);
  chairBack.position.set(0, 0.7, 0.7);
  chairBack.castShadow = true;
  group.add(chairBack);

  return group;
}

/**
 * 7. Warehouse & Stockroom Industrial Shelves
 */
export function buildStorageShelves(width = 3.0) {
  const group = new THREE.Group();

  // 4 Upright steel pillars
  const postGeo = new THREE.BoxGeometry(0.06, 2.1, 0.06);
  const xOffsets = [-width * 0.42, width * 0.42];
  const zOffsets = [-0.35, 0.35];

  xOffsets.forEach((x) => {
    zOffsets.forEach((z) => {
      const post = new THREE.Mesh(postGeo, materials.darkMetal);
      post.position.set(x, 1.05, z);
      post.castShadow = true;
      group.add(post);
    });
  });

  // 4 Heavy duty steel shelf decks
  [0.1, 0.75, 1.4, 2.05].forEach((y) => {
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(width * 0.88, 0.05, 0.78), materials.metalInox);
    shelf.position.set(0, y, 0);
    shelf.castShadow = true;
    shelf.receiveShadow = true;
    group.add(shelf);
  });

  // Stacked inventory shipping boxes
  const boxMat = new THREE.MeshStandardMaterial({ color: 0xD97706, roughness: 0.8 });
  const boxMatDark = new THREE.MeshStandardMaterial({ color: 0x92400E, roughness: 0.8 });

  [
    [-0.6, 0.4, 0, 0.5, 0.5, 0.6, boxMat],
    [0.1, 0.35, 0.05, 0.55, 0.45, 0.55, boxMatDark],
    [0.7, 0.4, -0.05, 0.45, 0.5, 0.5, boxMat],
    [-0.3, 1.05, 0, 0.6, 0.5, 0.55, boxMatDark],
    [0.5, 1.05, 0, 0.5, 0.5, 0.55, boxMat],
  ].forEach(([bx, by, bz, bw, bh, bd, mat]) => {
    const box = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), mat);
    box.position.set(bx, by, bz);
    box.castShadow = true;
    group.add(box);
  });

  return group;
}

/**
 * 8. Customer Service & Reception Counter
 */
export function buildServiceCounter(width = 3.2) {
  const group = new THREE.Group();

  const counter = new THREE.Mesh(new THREE.BoxGeometry(width * 0.85, 1.0, 0.75), materials.darkWood);
  counter.position.set(0, 0.5, 0);
  counter.castShadow = true;
  counter.receiveShadow = true;
  group.add(counter);

  const top = new THREE.Mesh(new THREE.BoxGeometry(width * 0.88, 0.05, 0.82), materials.marbleTop);
  top.position.set(0, 1.025, 0);
  group.add(top);

  // Reception check-in tablet
  const tablet = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.25, 0.03), materials.darkMetal);
  tablet.position.set(0, 1.2, 0);
  tablet.rotation.x = -0.3;
  group.add(tablet);

  return group;
}

/**
 * 9. Generic Modular Operational Workstation
 */
export function buildGenericWorkstation(width = 2.8) {
  const group = new THREE.Group();

  const desk = new THREE.Mesh(new THREE.BoxGeometry(width * 0.8, 0.78, 0.8), materials.warmWood);
  desk.position.set(0, 0.39, 0);
  desk.castShadow = true;
  desk.receiveShadow = true;
  group.add(desk);

  const deskTop = new THREE.Mesh(new THREE.BoxGeometry(width * 0.84, 0.04, 0.85), materials.metalInox);
  deskTop.position.set(0, 0.8, 0);
  group.add(deskTop);

  // Modern flat monitor
  const screen = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.36, 0.03), materials.posScreen);
  screen.position.set(0, 1.05, -0.15);
  group.add(screen);

  const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.22, 8), materials.darkMetal);
  stand.position.set(0, 0.91, -0.15);
  group.add(stand);

  return group;
}

/**
 * Dispatcher: Build appropriate workstation based on zone object, spatialType, or name
 */
export function buildZoneFurniture(zoneOrName = '', width = 3.6) {
  let zoneType = '';
  let name = '';

  if (typeof zoneOrName === 'object' && zoneOrName !== null) {
    zoneType = String(zoneOrName.zoneType || '').toUpperCase();
    name = String(zoneOrName.name || '').toLowerCase();
  } else {
    name = String(zoneOrName || '').toLowerCase();
  }

  // 1. Dispatch by explicit zoneType first
  if (zoneType === 'DISPLAY') return buildRetailDisplayRack(width);
  if (zoneType === 'CONSULTATION') return buildStylingStation(width);
  if (zoneType === 'STORAGE') return buildStorageShelves(width);
  if (zoneType === 'SERVICE_STATION') return buildServiceCounter(width);
  if (zoneType === 'CHECKOUT') return buildCashierWorkstation(width);
  if (zoneType === 'SEATING') return buildDiningSet();
  if (zoneType === 'PRODUCTION') {
    if (name.includes('barista') || name.includes('pha chế') || name.includes('cà phê')) {
      return buildBaristaWorkstation(width);
    }
    return buildKitchenWorkstation(width);
  }

  // 2. Dispatch by keywords for backward compatibility
  if (name.includes('barista') || name.includes('pha chế') || name.includes('cà phê')) {
    return buildBaristaWorkstation(width);
  }
  if (name.includes('thu ngân') || name.includes('cashier') || name.includes('pos')) {
    return buildCashierWorkstation(width);
  }
  if (name.includes('giày') || name.includes('trưng bày') || name.includes('kệ') || name.includes('display')) {
    return buildRetailDisplayRack(width);
  }
  if (name.includes('styling') || name.includes('salon') || name.includes('tóc') || name.includes('gội')) {
    return buildStylingStation(width);
  }
  if (name.includes('kho') || name.includes('storage') || name.includes('warehouse')) {
    return buildStorageShelves(width);
  }
  if (name.includes('dịch vụ') || name.includes('service') || name.includes('tiếp tân') || name.includes('reception')) {
    return buildServiceCounter(width);
  }
  if (name.includes('bếp') || name.includes('kitchen') || name.includes('bánh') || name.includes('bakery')) {
    return buildKitchenWorkstation(width);
  }
  if (name.includes('sảnh') || name.includes('dining') || name.includes('bàn') || name.includes('hall')) {
    return buildDiningSet();
  }

  // 3. Fallback to generic modern operational workstation
  return buildGenericWorkstation(width);
}
