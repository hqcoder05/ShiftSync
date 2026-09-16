/**
 * CharacterGeometries.js
 * Singleton Geometry Cache for Lightweight Stylized 3D Characters.
 * 
 * All geometries are instantiated once at module load and shared across
 * all 50-100+ character instances in the scene graph.
 * This completely eliminates per-avatar GPU BufferGeometry allocations.
 */

import * as THREE from 'three';

class CharacterGeometryCache {
  constructor() {
    this._geos = {};
  }

  get(key, factory) {
    if (!this._geos[key]) {
      this._geos[key] = factory();
    }
    return this._geos[key];
  }

  // --- Base Skeleton Geometries ---

  get head() {
    // Stylized rounded low-poly head (10x8 segments = 140 triangles vs 612 in old system)
    return this.get('head', () => new THREE.SphereGeometry(0.18, 10, 8));
  }

  get torso() {
    // Tapered cylinder torso (8 segments = 32 triangles)
    return this.get('torso', () => new THREE.CylinderGeometry(0.17, 0.14, 0.46, 8));
  }

  get leg() {
    // Tapered low-poly leg (6 segments = 24 triangles)
    return this.get('leg', () => new THREE.CylinderGeometry(0.06, 0.055, 0.42, 6));
  }

  get arm() {
    // Slender low-poly arm (6 segments = 24 triangles)
    return this.get('arm', () => new THREE.CylinderGeometry(0.045, 0.04, 0.34, 6));
  }

  get hand() {
    // Low-poly stylized hand / mitten (6x6 segments = 60 triangles)
    return this.get('hand', () => new THREE.SphereGeometry(0.045, 6, 6));
  }

  get shoe() {
    // Clean low-poly sneaker/shoe (12 triangles)
    return this.get('shoe', () => new THREE.BoxGeometry(0.10, 0.07, 0.16));
  }

  get eye() {
    // Stylized minimalist eye block (12 triangles)
    return this.get('eye', () => new THREE.BoxGeometry(0.022, 0.032, 0.015));
  }

  get nameBadge() {
    // Small staff ID card on chest (12 triangles)
    return this.get('nameBadge', () => new THREE.BoxGeometry(0.035, 0.045, 0.012));
  }

  get groundRing() {
    // 16-segment contact ring on floor (32 triangles vs 48)
    return this.get('groundRing', () => new THREE.RingGeometry(0.18, 0.30, 16));
  }

  get selectionHalo() {
    // Lightweight halo ring above head when selected (4x16 = 128 triangles vs 384)
    return this.get('selectionHalo', () => new THREE.TorusGeometry(0.22, 0.018, 4, 16));
  }

  // --- Modular Outfits & Accessories ---

  get apron() {
    // Front & side protective bib apron (12 triangles)
    return this.get('apron', () => new THREE.BoxGeometry(0.23, 0.36, 0.20));
  }

  get baristaBeret() {
    // Stylish angled flat cap / beret (8 segments = 24 triangles)
    return this.get('baristaBeret', () => new THREE.CylinderGeometry(0.21, 0.17, 0.065, 8));
  }

  get milkPitcher() {
    // Barista stainless steel milk frothing pitcher (8 segments = 24 triangles)
    return this.get('milkPitcher', () => new THREE.CylinderGeometry(0.038, 0.048, 0.10, 8));
  }

  get orderTablet() {
    // Cashier handheld POS tablet (12 triangles)
    return this.get('orderTablet', () => new THREE.BoxGeometry(0.11, 0.16, 0.012));
  }

  get headsetBand() {
    // Cashier slim communication headset band (4x10 = 80 triangles vs 192)
    return this.get('headsetBand', () => new THREE.TorusGeometry(0.185, 0.016, 4, 10, Math.PI));
  }

  get headsetPad() {
    // Headset single-ear speaker pad (6 segments = 18 triangles)
    return this.get('headsetPad', () => new THREE.CylinderGeometry(0.04, 0.04, 0.03, 6));
  }

  get chefToque() {
    // Baker / Kitchen traditional chef toque (8 segments = 24 triangles)
    return this.get('chefToque', () => new THREE.CylinderGeometry(0.19, 0.16, 0.19, 8));
  }

  get servingTray() {
    // Server circular inox platter (10 segments = 30 triangles vs 64)
    return this.get('servingTray', () => new THREE.CylinderGeometry(0.19, 0.19, 0.015, 10));
  }

  get warehouseVest() {
    // Stock / Logistics high-visibility vest (12 triangles)
    return this.get('warehouseVest', () => new THREE.BoxGeometry(0.23, 0.38, 0.20));
  }

  get clipboard() {
    // Stock / Logistics inventory clipboard (12 triangles)
    return this.get('clipboard', () => new THREE.BoxGeometry(0.12, 0.17, 0.012));
  }

  get securityCap() {
    // Security peaked duty cap crown (8 segments = 24 triangles)
    return this.get('securityCap', () => new THREE.CylinderGeometry(0.19, 0.19, 0.06, 8));
  }

  get securityVisor() {
    // Cap visor (12 triangles)
    return this.get('securityVisor', () => new THREE.BoxGeometry(0.15, 0.014, 0.08));
  }

  get securityBadge() {
    // Star / Shield chest badge (12 triangles)
    return this.get('securityBadge', () => new THREE.BoxGeometry(0.035, 0.045, 0.012));
  }

  get managerBlazer() {
    // Formal store manager blazer lapel overlay (12 triangles)
    return this.get('managerBlazer', () => new THREE.BoxGeometry(0.23, 0.40, 0.20));
  }

  get managerLanyard() {
    // Corporate lanyard ID card (12 triangles)
    return this.get('managerLanyard', () => new THREE.BoxGeometry(0.04, 0.06, 0.012));
  }

  get generalHair() {
    // Neutral stylized low-poly haircut (8x8 segments = 80 triangles)
    return this.get('generalHair', () => new THREE.SphereGeometry(0.192, 8, 8, 0, Math.PI * 2, 0, Math.PI * 0.55));
  }

  // --- LOD 0 & LOD 1 Simplified Geometries ---

  get lod0Capsule() {
    // Ultra-lightweight silhouette for distance > 22m (6 segments = 24 triangles total!)
    return this.get('lod0Capsule', () => new THREE.CylinderGeometry(0.16, 0.13, 1.15, 6));
  }

  get lod0Head() {
    // LOD 0 silhouette head topper (6x4 segments = 18 triangles)
    return this.get('lod0Head', () => new THREE.SphereGeometry(0.15, 6, 4));
  }

  get lod1Limb() {
    // Fast 5-segment limb for LOD 1 (18 triangles)
    return this.get('lod1Limb', () => new THREE.CylinderGeometry(0.055, 0.045, 0.38, 5));
  }
}

export const characterGeometries = new CharacterGeometryCache();
