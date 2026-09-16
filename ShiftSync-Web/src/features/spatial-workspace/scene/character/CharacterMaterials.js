/**
 * CharacterMaterials.js
 * Singleton Material Palette for Lightweight Stylized 3D Characters.
 * 
 * Reuses stylized standard and basic materials across all employees.
 * Keeps GPU state switches minimal and supports dynamic roles and states.
 */

import * as THREE from 'three';

class CharacterMaterialPalette {
  constructor() {
    this._roleMatCache = new Map();

    // --- Base Anatomy & Clothing Singletons ---
    this.skinWarm = new THREE.MeshStandardMaterial({ color: 0xFDE68A, roughness: 0.55 });
    this.skinFair = new THREE.MeshStandardMaterial({ color: 0xFEE2E2, roughness: 0.55 });
    this.skinTan = new THREE.MeshStandardMaterial({ color: 0xE2B788, roughness: 0.55 });
    this.eyes = new THREE.MeshStandardMaterial({ color: 0x0F172A, roughness: 0.2 });

    this.shirtWhite = new THREE.MeshStandardMaterial({ color: 0xF8FAFC, roughness: 0.6 });
    this.shirtDark = new THREE.MeshStandardMaterial({ color: 0x1E293B, roughness: 0.6 });
    this.pantsNavy = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7 });
    this.pantsBlack = new THREE.MeshStandardMaterial({ color: 0x18181B, roughness: 0.7 });
    this.shoeWhite = new THREE.MeshStandardMaterial({ color: 0xE2E8F0, roughness: 0.4 });
    this.shoeDark = new THREE.MeshStandardMaterial({ color: 0x27272A, roughness: 0.5 });
    this.badgeGold = new THREE.MeshStandardMaterial({ color: 0xF59E0B, metalness: 0.8, roughness: 0.25 });

    // --- Hair Singletons ---
    this.hairDark = new THREE.MeshStandardMaterial({ color: 0x27272A, roughness: 0.9 });
    this.hairBrown = new THREE.MeshStandardMaterial({ color: 0x451A03, roughness: 0.9 });

    // --- Role-Specific Uniform Singletons ---
    this.apronBarista = new THREE.MeshStandardMaterial({ color: 0x78350F, roughness: 0.6 }); // Cafe Espresso
    this.beretBarista = new THREE.MeshStandardMaterial({ color: 0x27272A, roughness: 0.8 });
    this.uniformCashier = new THREE.MeshStandardMaterial({ color: 0x0284C7, roughness: 0.5 }); // Cyan Navy
    this.uniformKitchen = new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 0.45 }); // Chef Crisp White
    this.vestStock = new THREE.MeshStandardMaterial({ color: 0xEA580C, roughness: 0.5 }); // High-Vis Amber
    this.uniformSecurity = new THREE.MeshStandardMaterial({ color: 0x0F172A, roughness: 0.65 }); // Tactical Navy
    this.blazerManager = new THREE.MeshStandardMaterial({ color: 0x374151, roughness: 0.55 }); // Charcoal Blazer
    this.lanyardManager = new THREE.MeshStandardMaterial({ color: 0x6366F1, roughness: 0.3 });

    // --- Props & Hardware Singletons ---
    this.metalInox = new THREE.MeshStandardMaterial({ color: 0xE2E8F0, metalness: 0.85, roughness: 0.2 });
    this.darkDevice = new THREE.MeshStandardMaterial({ color: 0x1E293B, roughness: 0.35 });
    this.tabletScreen = new THREE.MeshBasicMaterial({ color: 0x38BDF8 });

    // --- Visual Status Singletons ---
    this.ringSelected = new THREE.MeshBasicMaterial({
      color: 0x10B981,
      transparent: true,
      opacity: 0.95,
      side: THREE.DoubleSide,
    });
    this.haloSelected = new THREE.MeshBasicMaterial({ color: 0x10B981 });
    this.ringDefault = new THREE.MeshBasicMaterial({
      color: 0x3B82F6,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
    });

    // Ghost Hologram for Simulation Preview Mode
    this.ghostSimulation = new THREE.MeshStandardMaterial({
      color: 0x38BDF8,
      transparent: true,
      opacity: 0.65,
      roughness: 0.3,
    });

    // Desaturated tint for Leave / Unavailable staff
    this.unavailable = new THREE.MeshStandardMaterial({
      color: 0x94A3B8,
      transparent: true,
      opacity: 0.5,
      roughness: 0.8,
    });
  }

  getSkinBySeed(seed = 0) {
    const pick = Math.abs(Math.floor(seed)) % 3;
    if (pick === 0) return this.skinWarm;
    if (pick === 1) return this.skinFair;
    return this.skinTan;
  }

  getHairBySeed(seed = 0) {
    return Math.abs(Math.floor(seed)) % 2 === 0 ? this.hairDark : this.hairBrown;
  }

  getRoleUniformMaterial(roleColorHex) {
    if (!roleColorHex) return this.shirtWhite;
    if (!this._roleMatCache.has(roleColorHex)) {
      this._roleMatCache.set(
        roleColorHex,
        new THREE.MeshStandardMaterial({
          color: roleColorHex,
          roughness: 0.55,
          metalness: 0.05,
        })
      );
    }
    return this._roleMatCache.get(roleColorHex);
  }
}

export const characterMaterials = new CharacterMaterialPalette();
