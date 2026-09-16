/**
 * CharacterOutfits.js
 * Modular Outfit & Accessory Builder for Stylized Workforce Characters.
 * 
 * Attaches role-specific clothing, headwear, and workstation props to the
 * shared base character skeleton using pre-cached geometries and materials.
 */

import * as THREE from 'three';
import { characterGeometries as geo } from './CharacterGeometries';
import { characterMaterials as mat } from './CharacterMaterials';

export function buildRoleOutfit({ roleName = '', roleTheme = {}, seed = 0 }) {
  const norm = (roleName || '').toLowerCase();
  const outfitMeshes = [];
  const headwearMeshes = [];
  let leftArmProp = null;
  let rightArmProp = null;
  let roleType = 'general';

  // 1. Barista / Pha chế
  if (norm.includes('barista') || norm.includes('pha chế')) {
    roleType = 'barista';

    // Brown/olive barista apron
    const apron = new THREE.Mesh(geo.apron, mat.apronBarista);
    apron.position.set(0, 0.68, 0.01);
    outfitMeshes.push(apron);

    // Stylish beret / flat cap
    const beret = new THREE.Mesh(geo.baristaBeret, mat.beretBarista);
    beret.position.set(0, 0.15, -0.01);
    beret.rotation.z = 0.12;
    headwearMeshes.push(beret);

    // Stainless steel milk pitcher on right hand
    const pitcher = new THREE.Mesh(geo.milkPitcher, mat.metalInox);
    pitcher.position.set(0, -0.38, 0.05);
    pitcher.rotation.x = -0.2;
    rightArmProp = pitcher;
  }
  // 2. Cashier / Thu ngân / POS
  else if (norm.includes('thu ngân') || norm.includes('cashier') || norm.includes('pos')) {
    roleType = 'cashier';

    // Slim role accent / uniform
    const accentMat = mat.getRoleUniformMaterial(roleTheme.hexInt || 0x0284C7);
    const uniform = new THREE.Mesh(geo.apron, accentMat);
    uniform.position.set(0, 0.68, 0.01);
    outfitMeshes.push(uniform);

    // Communication headset
    const band = new THREE.Mesh(geo.headsetBand, mat.uniformCashier);
    band.rotation.x = -Math.PI / 2;
    band.position.set(0, 0.06, 0);
    headwearMeshes.push(band);

    const earPad = new THREE.Mesh(geo.headsetPad, mat.uniformCashier);
    earPad.rotation.z = Math.PI / 2;
    earPad.position.set(0.18, 0.02, 0);
    headwearMeshes.push(earPad);

    // Handheld POS ordering tablet in left hand
    const tabletGroup = new THREE.Group();
    const tablet = new THREE.Mesh(geo.orderTablet, mat.darkDevice);
    tabletGroup.add(tablet);
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.09, 0.13), mat.tabletScreen);
    screen.position.z = 0.007;
    tabletGroup.add(screen);

    tabletGroup.position.set(0, -0.38, 0.07);
    tabletGroup.rotation.x = -0.35;
    leftArmProp = tabletGroup;
  }
  // 3. Kitchen / Đầu bếp / Baker / Làm bánh
  else if (norm.includes('bếp') || norm.includes('kitchen') || norm.includes('baker') || norm.includes('cook')) {
    roleType = 'kitchen';

    // Crisp chef uniform apron
    const chefApron = new THREE.Mesh(geo.apron, mat.uniformKitchen);
    chefApron.position.set(0, 0.68, 0.01);
    outfitMeshes.push(chefApron);

    // Traditional chef toque blanche
    const toque = new THREE.Mesh(geo.chefToque, mat.uniformKitchen);
    toque.position.set(0, 0.22, 0);
    headwearMeshes.push(toque);
  }
  // 4. Stock / Kho / Warehouse / Tiếp liệu
  else if (norm.includes('kho') || norm.includes('stock') || norm.includes('warehouse')) {
    roleType = 'stock';

    // High-visibility safety vest
    const vest = new THREE.Mesh(geo.warehouseVest, mat.vestStock);
    vest.position.set(0, 0.68, 0.01);
    outfitMeshes.push(vest);

    // Work cap
    const cap = new THREE.Mesh(geo.securityCap, mat.uniformSecurity);
    cap.position.set(0, 0.15, 0);
    headwearMeshes.push(cap);

    // Inventory clipboard on left arm
    const clipboard = new THREE.Mesh(geo.clipboard, mat.shirtWhite);
    clipboard.position.set(0, -0.38, 0.07);
    clipboard.rotation.x = -0.3;
    leftArmProp = clipboard;
  }
  // 5. Security / Bảo vệ / An ninh
  else if (norm.includes('an ninh') || norm.includes('bảo vệ') || norm.includes('security') || norm.includes('guard')) {
    roleType = 'security';

    // Dark uniform vest with badge
    const vest = new THREE.Mesh(geo.apron, mat.uniformSecurity);
    vest.position.set(0, 0.68, 0.01);
    outfitMeshes.push(vest);

    const badge = new THREE.Mesh(geo.securityBadge, mat.badgeGold);
    badge.position.set(-0.07, 0.76, 0.12);
    outfitMeshes.push(badge);

    // Security peaked cap
    const cap = new THREE.Mesh(geo.securityCap, mat.uniformSecurity);
    cap.position.set(0, 0.15, 0);
    headwearMeshes.push(cap);

    const visor = new THREE.Mesh(geo.securityVisor, mat.shoeDark);
    visor.position.set(0, 0.11, 0.15);
    visor.rotation.x = 0.2;
    headwearMeshes.push(visor);
  }
  // 6. Manager / Quản lý / Giám sát
  else if (norm.includes('quản lý') || norm.includes('manager') || norm.includes('lead') || norm.includes('supervisor')) {
    roleType = 'manager';

    // Formal charcoal blazer overlay
    const blazer = new THREE.Mesh(geo.managerBlazer, mat.blazerManager);
    blazer.position.set(0, 0.68, 0.01);
    outfitMeshes.push(blazer);

    // Lanyard ID badge
    const lanyard = new THREE.Mesh(geo.managerLanyard, mat.lanyardManager);
    lanyard.position.set(-0.06, 0.72, 0.12);
    outfitMeshes.push(lanyard);

    // Professional haircut
    const hair = new THREE.Mesh(geo.generalHair, mat.getHairBySeed(seed));
    hair.position.set(0, 0.04, 0);
    headwearMeshes.push(hair);
  }
  // 7. Server / Phục vụ / Bàn / General staff
  else {
    roleType = 'server';

    // Role-tinted apron
    const apronMat = mat.getRoleUniformMaterial(roleTheme.hexInt || 0x10B981);
    const apron = new THREE.Mesh(geo.apron, apronMat);
    apron.position.set(0, 0.68, 0.01);
    outfitMeshes.push(apron);

    // Server serving platter / tray if server
    if (norm.includes('phục vụ') || norm.includes('server') || norm.includes('waiter')) {
      const tray = new THREE.Mesh(geo.servingTray, mat.metalInox);
      tray.position.set(0, -0.38, 0.12);
      leftArmProp = tray;
    }

    // Stylized hairstyle
    const hair = new THREE.Mesh(geo.generalHair, mat.getHairBySeed(seed));
    hair.position.set(0, 0.04, 0);
    headwearMeshes.push(hair);
  }

  return {
    outfitMeshes,
    headwearMeshes,
    leftArmProp,
    rightArmProp,
    roleType,
  };
}
