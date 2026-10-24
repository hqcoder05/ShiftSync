/**
 * ResourceManager.js
 * Centralized WebGL Resource Lifecycle & Memory Leak Prevention Manager.
 * 
 * ADR-ARC-001 (DEC-04 / ARC-IMP-03):
 * - Maintains a WeakSet of protected shared singleton resources
 *   (CharacterMaterials, CharacterGeometries, FurnitureMaterials).
 * - Implements safe hierarchical disposal that cleans up ONLY instance-created
 *   geometries, materials, and textures (e.g., CanvasTexture on dynamic sprites)
 *   while guaranteeing that shared singletons are never prematurely disposed.
 */

import { materials as furnitureMaterials, isFurnitureSharedMaterial } from './FurnitureBuilder.js';
import { characterMaterials } from './character/CharacterMaterials.js';
import { characterGeometries } from './character/CharacterGeometries.js';

class ResourceManagerClass {
  constructor() {
    this.sharedResources = new WeakSet();
    this._initializeSharedSingletons();
  }

  /**
   * Registers all known static singleton materials and geometries.
   * @private
   */
  _initializeSharedSingletons() {
    // 1. Shared Furniture Materials
    if (furnitureMaterials) {
      Object.values(furnitureMaterials).forEach((m) => {
        if (m && typeof m === 'object') this.sharedResources.add(m);
      });
    }

    // 2. Shared Character Materials (base + dynamic uniforms)
    if (characterMaterials) {
      if (typeof characterMaterials.getAllMaterials === 'function') {
        characterMaterials.getAllMaterials().forEach((m) => {
          if (m && typeof m === 'object') this.sharedResources.add(m);
        });
      } else {
        Object.values(characterMaterials).forEach((m) => {
          if (m && typeof m === 'object') this.sharedResources.add(m);
        });
      }
    }

    // 3. Shared Character Geometries
    if (characterGeometries) {
      if (typeof characterGeometries.preloadAll === 'function') {
        characterGeometries.preloadAll().forEach((g) => {
          if (g && typeof g === 'object') this.sharedResources.add(g);
        });
      } else if (characterGeometries._geos) {
        Object.values(characterGeometries._geos).forEach((g) => {
          if (g && typeof g === 'object') this.sharedResources.add(g);
        });
      }
    }
  }

  /**
   * Explicitly protects a geometry, material, or texture from disposal.
   * @param {Object} res
   */
  registerSharedResource(res) {
    if (res && typeof res === 'object') {
      this.sharedResources.add(res);
    }
  }

  /**
   * Checks whether a Three.js resource is a protected singleton.
   * @param {Object} res
   * @returns {boolean}
   */
  isSharedResource(res) {
    if (!res) return false;
    if (this.sharedResources.has(res)) return true;
    if (res.userData?.isShared) return true;
    if (characterMaterials?.isSharedMaterial?.(res)) return true;
    if (characterGeometries?.isSharedGeometry?.(res)) return true;
    if (isFurnitureSharedMaterial?.(res)) return true;
    return false;
  }

  /**
   * Safely disposes ONLY instance-owned geometries, materials, and textures
   * across an Object3D hierarchy without touching shared singletons.
   * @param {import('three').Object3D} obj
   */
  disposeHierarchy(obj) {
    if (!obj) return;
    if (obj.userData?.isShared) return;

    obj.traverse((child) => {
      // 1. Dispose Geometry only if NOT shared
      if (child.geometry && !this.isSharedResource(child.geometry)) {
        child.geometry.dispose();
      }

      // 2. Dispose Material and its unique textures only if NOT shared
      if (child.material) {
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach((mat) => {
          if (!mat || this.isSharedResource(mat)) return;

          // Dispose textures created exclusively for this instance (e.g. CanvasTexture on sprites)
          if (mat.map && !this.isSharedResource(mat.map)) mat.map.dispose();
          if (mat.lightMap) mat.lightMap.dispose();
          if (mat.bumpMap) mat.bumpMap.dispose();
          if (mat.normalMap) mat.normalMap.dispose();
          if (mat.specularMap) mat.specularMap.dispose();
          if (mat.envMap) mat.envMap.dispose();
          if (mat.alphaMap) mat.alphaMap.dispose();

          mat.dispose();
        });
      }
    });
  }
}

export const ResourceManager = new ResourceManagerClass();
export const isSharedResource = (res) => ResourceManager.isSharedResource(res);
export const disposeHierarchy = (obj) => ResourceManager.disposeHierarchy(obj);
