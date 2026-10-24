/**
 * DigitalTwinMaterialEnhancer.js
 * High-Fidelity PBR Texture & Baked Ambient Occlusion Engine for ShiftSync 3D Digital Twin.
 * 
 * Unifies:
 * 1. PBR Texture Mapping (Realistic wood grain, Carrara marble veining, terrazzo aggregate, herringbone parquet)
 * 2. Baked Ambient Occlusion & Depth Gradients (Baked contact shadows & crevice occlusions)
 * 3. Complete Architectural glTF Asset Hierarchy Enhancement (Zero dynamic pass overhead, locked 60 FPS)
 */

import * as THREE from 'three';

// ── Cache for generated procedural canvas textures & materials ──
const textureCache = new Map();
const materialCache = new Map();

/**
 * Helper to check if DOM Canvas is available (safeguard for SSR / headless tests)
 */
function isCanvasSupported() {
  return typeof document !== 'undefined' && typeof document.createElement === 'function';
}

/**
 * 1. Scandinavian Natural Oak Wood Texture with Baked Grain & Edge Occlusion
 */
export function getOakWoodTexture() {
  if (textureCache.has('oak_wood')) return textureCache.get('oak_wood');
  if (!isCanvasSupported()) return null;

  try {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Base warm oak tone
    ctx.fillStyle = '#BA7A3E';
    ctx.fillRect(0, 0, 512, 512);

    // Fine wood grain layers with natural waviness
    for (let y = 0; y < 512; y += 2) {
      const wave = Math.sin(y * 0.04) * 12 + Math.sin(y * 0.12) * 6;
      const darkness = (Math.sin(y * 0.08 + wave * 0.1) + 1) * 0.5;
      
      ctx.fillStyle = `rgba(139, 80, 40, ${0.12 + darkness * 0.18})`;
      ctx.fillRect(0, y, 512, 1.5);
    }

    // Longitudinal wood fiber streaks
    for (let i = 0; i < 350; i++) {
      const rx = (i * 47) % 512;
      const ry = (i * 89) % 512;
      const rLen = 60 + ((i * 17) % 180);
      const alpha = 0.06 + ((i % 5) * 0.02);
      ctx.fillStyle = (i % 2 === 0) ? `rgba(90, 45, 18, ${alpha})` : `rgba(230, 180, 120, ${alpha * 0.8})`;
      ctx.fillRect(rx, ry, rLen, 1);
    }

    // Baked edge contact ambient occlusion
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, 'rgba(40, 20, 10, 0.15)');
    grad.addColorStop(0.1, 'rgba(0, 0, 0, 0)');
    grad.addColorStop(0.9, 'rgba(0, 0, 0, 0)');
    grad.addColorStop(1, 'rgba(40, 20, 10, 0.22)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    textureCache.set('oak_wood', texture);
    return texture;
  } catch {
    return null;
  }
}

/**
 * 2. Italian Carrara White Marble Texture with Branching Veins
 */
export function getCarraraMarbleTexture() {
  if (textureCache.has('carrara_marble')) return textureCache.get('carrara_marble');
  if (!isCanvasSupported()) return null;

  try {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Base warm polished white
    ctx.fillStyle = '#FAF8F5';
    ctx.fillRect(0, 0, 512, 512);

    // Soft cloudy dispersion
    for (let i = 0; i < 40; i++) {
      const cx = (i * 79) % 512;
      const cy = (i * 113) % 512;
      const rad = 60 + (i % 80);
      const radGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
      radGrad.addColorStop(0, 'rgba(215, 218, 224, 0.22)');
      radGrad.addColorStop(1, 'rgba(250, 248, 245, 0)');
      ctx.fillStyle = radGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, rad, 0, Math.PI * 2);
      ctx.fill();
    }

    // Realistic organic branching marble veins
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = 'rgba(120, 130, 145, 0.25)';
    ctx.beginPath();
    ctx.moveTo(30, 10);
    ctx.bezierCurveTo(120, 150, 210, 80, 320, 260);
    ctx.bezierCurveTo(390, 380, 460, 420, 500, 490);
    ctx.stroke();

    // Branch 1
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = 'rgba(140, 150, 165, 0.20)';
    ctx.beginPath();
    ctx.moveTo(210, 80);
    ctx.bezierCurveTo(280, 120, 360, 100, 480, 180);
    ctx.stroke();

    // Branch 2
    ctx.lineWidth = 1.0;
    ctx.strokeStyle = 'rgba(160, 170, 180, 0.18)';
    ctx.beginPath();
    ctx.moveTo(320, 260);
    ctx.bezierCurveTo(270, 340, 180, 390, 80, 460);
    ctx.stroke();

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    textureCache.set('carrara_marble', texture);
    return texture;
  } catch {
    return null;
  }
}

/**
 * 3. Polished Terrazzo Ceramic Floor Tile Texture with Mineral Chips & Grout
 */
export function getTerrazzoFloorTexture() {
  if (textureCache.has('terrazzo_floor')) return textureCache.get('terrazzo_floor');
  if (!isCanvasSupported()) return null;

  try {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Base ceramic warm tile
    ctx.fillStyle = '#F4EDE4';
    ctx.fillRect(0, 0, 512, 512);

    // Grout lines
    ctx.strokeStyle = '#D1C2B0';
    ctx.lineWidth = 8;
    ctx.strokeRect(4, 4, 504, 504);

    // Inner bevel highlight
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.lineWidth = 3;
    ctx.strokeRect(8, 8, 496, 496);

    // Subtle inner tile contact occlusion
    ctx.strokeStyle = 'rgba(80, 60, 45, 0.08)';
    ctx.lineWidth = 6;
    ctx.strokeRect(12, 12, 488, 488);

    // Terrazzo aggregate chips (Terracotta, Basalt, Quartz, Calcite)
    const chipColors = [
      'rgba(160, 82, 45, 0.28)',   // Terracotta
      'rgba(30, 41, 59, 0.32)',    // Charcoal basalt
      'rgba(255, 255, 255, 0.55)', // White quartz
      'rgba(202, 138, 4, 0.22)',   // Amber calcite
      'rgba(100, 116, 139, 0.24)', // Slate grey
    ];

    for (let i = 0; i < 550; i++) {
      const rx = 16 + ((i * 43) % 480);
      const ry = 16 + ((i * 79) % 480);
      const size = (i % 4) + 1.5;
      ctx.fillStyle = chipColors[i % chipColors.length];

      if (i % 3 === 0) {
        ctx.beginPath();
        ctx.arc(rx, ry, size * 0.8, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(rx, ry, size, size * 1.4);
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    textureCache.set('terrazzo_floor', texture);
    return texture;
  } catch {
    return null;
  }
}

/**
 * 4. European Oak Herringbone Parquet Floor Texture
 */
export function getHerringboneParquetTexture() {
  if (textureCache.has('herringbone_parquet')) return textureCache.get('herringbone_parquet');
  if (!isCanvasSupported()) return null;

  try {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.fillStyle = '#C89D6C';
    ctx.fillRect(0, 0, 512, 512);

    const plankW = 64;
    const plankH = 128;

    // Draw alternating angled planks with individual shading
    for (let py = -plankH; py < 512 + plankH; py += plankH) {
      for (let px = -plankW; px < 512 + plankW; px += plankW * 2) {
        const toneVar = ((px + py) % 3) * 12;
        ctx.fillStyle = `rgb(${190 + toneVar}, ${145 + toneVar}, ${95 + toneVar})`;
        ctx.fillRect(px, py, plankW, plankH);

        // Dark recessed grout seam
        ctx.strokeStyle = 'rgba(60, 35, 15, 0.35)';
        ctx.lineWidth = 2.5;
        ctx.strokeRect(px, py, plankW, plankH);

        // Baked plank surface grain
        ctx.fillStyle = 'rgba(100, 55, 25, 0.12)';
        for (let g = 4; g < plankH; g += 8) {
          ctx.fillRect(px + 4, py + g, plankW - 8, 1);
        }
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    textureCache.set('herringbone_parquet', texture);
    return texture;
  } catch {
    return null;
  }
}

/**
 * 5. Acoustic Slatted Wall Texture with Baked Slat Depth Shadows
 */
export function getAcousticSlatTexture() {
  if (textureCache.has('acoustic_slat')) return textureCache.get('acoustic_slat');
  if (!isCanvasSupported()) return null;

  try {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Dark acoustic felt backing
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(0, 0, 512, 512);

    const slatWidth = 24;
    const gap = 12;
    const step = slatWidth + gap;

    for (let x = 0; x < 512; x += step) {
      // Oak slat front face
      ctx.fillStyle = '#BA7A3E';
      ctx.fillRect(x + gap, 0, slatWidth, 512);

      // Slat edge highlight
      ctx.fillStyle = 'rgba(255, 230, 180, 0.35)';
      ctx.fillRect(x + gap, 0, 2, 512);

      // Deep baked shadow in crevice
      ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
      ctx.fillRect(x + gap + slatWidth - 3, 0, 3, 512);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    textureCache.set('acoustic_slat', texture);
    return texture;
  } catch {
    return null;
  }
}

/**
 * 6. Brushed Stainless Steel Roughness Map
 */
export function getBrushedMetalRoughnessTexture() {
  if (textureCache.has('brushed_metal')) return textureCache.get('brushed_metal');
  if (!isCanvasSupported()) return null;

  try {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.fillStyle = '#666666';
    ctx.fillRect(0, 0, 256, 256);

    // Fine linear brushing marks
    for (let y = 0; y < 256; y += 2) {
      const val = 100 + ((y * 37) % 60);
      ctx.fillStyle = `rgb(${val}, ${val}, ${val})`;
      ctx.fillRect(0, y, 256, 1);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    textureCache.set('brushed_metal', texture);
    return texture;
  } catch {
    return null;
  }
}

/**
 * 7. POS Cashier Touchscreen Interface Texture with Simulated Glow
 */
export function getPosScreenUiTexture() {
  if (textureCache.has('pos_screen_ui')) return textureCache.get('pos_screen_ui');
  if (!isCanvasSupported()) return null;

  try {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 320;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Dark sleek UI background
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(0, 0, 512, 320);

    // Top status bar
    ctx.fillStyle = '#1E293B';
    ctx.fillRect(0, 0, 512, 36);
    ctx.fillStyle = '#38BDF8';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText('ShiftSync POS • Terminal 01', 16, 24);
    ctx.fillStyle = '#10B981';
    ctx.fillText('● ONLINE', 420, 24);

    // Left order item lines
    ctx.fillStyle = '#E2E8F0';
    ctx.font = '14px sans-serif';
    ctx.fillText('1x Flat White (Oat Milk)         $5.20', 20, 75);
    ctx.fillText('1x Pour-Over Ethiopia Yirgacheffe $6.50', 20, 105);
    ctx.fillText('1x Almond Croissant (Warm)        $4.80', 20, 135);

    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(20, 160);
    ctx.lineTo(280, 160);
    ctx.stroke();

    ctx.fillStyle = '#38BDF8';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText('TOTAL: $16.50', 20, 195);

    // Right quick selection buttons
    const items = ['Espresso', 'Latte', 'Cold Brew', 'Matcha', 'Pastry', 'Pay Card'];
    items.forEach((it, idx) => {
      const bx = 310 + (idx % 2) * 95;
      const by = 60 + Math.floor(idx / 2) * 55;
      ctx.fillStyle = idx === 5 ? '#0284C7' : '#1E293B';
      ctx.fillRect(bx, by, 86, 44);
      ctx.strokeStyle = '#38BDF8';
      ctx.lineWidth = 1;
      ctx.strokeRect(bx, by, 86, 44);
      ctx.fillStyle = '#F8FAFC';
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText(it, bx + 12, by + 26);
    });

    const texture = new THREE.CanvasTexture(canvas);
    textureCache.set('pos_screen_ui', texture);
    return texture;
  } catch {
    return null;
  }
}

// ── Enhanced Materials Generator ──────────────────────────────────
export function getEnhancedPbrMaterials(layout) {
  const storeLen = Number(layout?.length) || 24.0;
  const storeWid = Number(layout?.width) || 16.0;

  if (materialCache.has('enhanced_pbr')) {
    return materialCache.get('enhanced_pbr');
  }

  const oakTex = getOakWoodTexture();
  if (oakTex) oakTex.repeat.set(2, 2);

  const marbleTex = getCarraraMarbleTexture();
  if (marbleTex) marbleTex.repeat.set(1.5, 1.5);

  const terrazzoTex = getTerrazzoFloorTexture();
  if (terrazzoTex) terrazzoTex.repeat.set(storeLen / 1.6, storeWid / 1.6);

  const herringboneTex = getHerringboneParquetTexture();
  if (herringboneTex) herringboneTex.repeat.set(storeLen / 3.0, storeWid / 3.0);

  const slatTex = getAcousticSlatTexture();
  if (slatTex) slatTex.repeat.set(4, 1);

  const metalRoughTex = getBrushedMetalRoughnessTexture();
  const posScreenTex = getPosScreenUiTexture();

  const mats = {
    // 1. Natural Scandinavian Oak (Used on Tabletop, Counter face, Columns)
    naturalOak: new THREE.MeshStandardMaterial({
      name: 'pbr_natural_oak',
      color: 0xFAF5EF,
      map: oakTex || null,
      roughness: 0.38,
      metalness: 0.02,
    }),

    // 2. Carrara White Marble / Quartz (Used on Countertops & Tables)
    carraraMarble: new THREE.MeshStandardMaterial({
      name: 'pbr_carrara_marble',
      color: 0xFFFFFF,
      map: marbleTex || null,
      roughness: 0.18,
      metalness: 0.02,
    }),

    // 3. Terrazzo Ceramic Tile Floor (Main Circulation)
    terrazzoFloor: new THREE.MeshStandardMaterial({
      name: 'pbr_terrazzo_floor',
      color: 0xFDFBF7,
      map: terrazzoTex || null,
      roughness: 0.58,
      metalness: 0.03,
    }),

    // 4. Herringbone Oak Parquet Floor (Dining Zone)
    herringboneFloor: new THREE.MeshStandardMaterial({
      name: 'pbr_herringbone_floor',
      color: 0xF5EBE0,
      map: herringboneTex || null,
      roughness: 0.50,
      metalness: 0.02,
    }),

    // 5. Acoustic Slatted Wood Wall & Fluted Counter Panels
    acousticSlats: new THREE.MeshStandardMaterial({
      name: 'pbr_acoustic_slats',
      color: 0xFDFBF7,
      map: slatTex || null,
      roughness: 0.48,
      metalness: 0.02,
    }),

    // 6. Brushed Stainless Steel Commercial Equipment (Espresso machine)
    brushedSteel: new THREE.MeshStandardMaterial({
      name: 'pbr_brushed_steel',
      color: 0xE2E8F0,
      roughnessMap: metalRoughTex || null,
      roughness: 0.28,
      metalness: 0.88,
    }),

    // 7. Interactive POS Screen Interface
    posScreenUi: new THREE.MeshStandardMaterial({
      name: 'pbr_pos_screen_ui',
      color: 0xFFFFFF,
      map: posScreenTex || null,
      emissive: 0x38BDF8,
      emissiveMap: posScreenTex || null,
      emissiveIntensity: 0.35,
      roughness: 0.2,
      metalness: 0.1,
    }),
  };

  materialCache.set('enhanced_pbr', mats);
  return mats;
}

/**
 * Traverses a glTF 3D model root and seamlessly upgrades solid-color materials
 * with rich PBR textures and baked ambient occlusion.
 * 
 * Preserves original material in mesh.userData.originalMat for clean X-Ray restoring.
 * 
 * @param {import('three').Object3D} modelRoot
 * @param {Object} layout
 */
export function enhanceDigitalTwinModelMaterials(modelRoot, layout = { length: 24, width: 16, height: 6 }) {
  if (!modelRoot) return;
  // Versioned cafe materials are authored together; keep their palette and finishes.
  if (modelRoot.userData.storeDesignVersion >= 2) return;
  const pbr = getEnhancedPbrMaterials(layout);

  modelRoot.traverse((child) => {
    if (!child.isMesh) return;

    const name = child.name || '';
    const matName = child.material?.name || '';

    // Cache original material
    if (!child.userData.originalMat) {
      child.userData.originalMat = child.material;
    }

    // 1. Terrazzo Main Floor
    if (name.includes('Floor_Terrazzo') || name === 'Store_Floor_Terrazzo' || matName.includes('terrazzo')) {
      child.material = pbr.terrazzoFloor;
      child.receiveShadow = true;
    }

    // 2. Herringbone Parquet Dining Floor
    else if (name.includes('Zone_Dining_Floor') || matName.includes('parquet')) {
      child.material = pbr.herringboneFloor;
      child.receiveShadow = true;
    }

    // 3. Countertops & Marble Tables
    else if (
      name.includes('Countertop') ||
      name.includes('Quartz') ||
      name.includes('White_Quartz') ||
      name.includes('Bistro_Tabletop') ||
      name.includes('Coffee_Table_Marble') ||
      matName.includes('white_quartz')
    ) {
      child.material = pbr.carraraMarble;
      child.castShadow = true;
      child.receiveShadow = true;
    }

    // 4. Acoustic Slats & Fluted Panels
    else if (
      name.includes('Acoustic_Slat') ||
      name.includes('Fluted') ||
      matName.includes('wall_feature_wood')
    ) {
      child.material = pbr.acousticSlats;
      child.castShadow = true;
      child.receiveShadow = true;
    }

    // 5. Natural Oak Furniture (Columns, Tables, Chairs, Counters)
    else if (
      name.includes('Oak') ||
      name.includes('Communal_Tabletop') ||
      name.includes('POS_Counter') ||
      name.includes('Barista_Counter') ||
      name.includes('Col1_OakShaft') ||
      name.includes('Col2_OakShaft') ||
      matName.includes('natural_oak')
    ) {
      child.material = pbr.naturalOak;
      child.castShadow = true;
      child.receiveShadow = true;
    }

    // 6. Commercial Stainless Steel Espresso Machine & Appliances
    else if (
      name.includes('Espresso_Faceplate') ||
      name.includes('Espresso_Side') ||
      name.includes('Espresso_Drip') ||
      name.includes('Grinder') ||
      name.includes('PourOver') ||
      name.includes('Bakery_Base') ||
      matName.includes('stainless_steel')
    ) {
      child.material = pbr.brushedSteel;
      child.castShadow = true;
    }

    // 7. POS Screen UI
    else if (name.includes('POS_Screen_UI') || matName.includes('posScreenUI')) {
      child.material = pbr.posScreenUi;
    }
  });
}
