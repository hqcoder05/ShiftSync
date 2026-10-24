/**
 * SceneGraphManager.js
 * Centralized Three.js Scene Graph, Lighting Rig, and Environment Hierarchy Manager.
 * 
 * ADR-ARC-001 (ARC-IMP-03):
 * - Isolates Scene construction, lighting configuration, and static/dynamic group hierarchies.
 * - Manages environmental visual layers (Walls, Floor, Ceiling, Furniture) and X-Ray transparency.
 * - Handles particle systems (steam) and ambient decorative animations (pendant lamp micro-sway).
 * - Implements deterministic teardown and resource disposal via ResourceManager.
 */

import * as THREE from 'three';
import {
  buildStoreEnvironment,
  setEnvironmentXRayMode,
  setEnvironmentLayersVisibility,
} from './StoreEnvironment.js';
import { ResourceManager, disposeHierarchy } from './ResourceManager.js';
import {
  loadDigitalTwinModel,
  DEFAULT_DIGITAL_TWIN_GLB_URL,
} from './DigitalTwinModelLoader.js';

export class SceneGraphManager {
  /**
   * @param {Object} options
   * @param {Object} options.layout - Store layout { length, width, height }
   * @param {Object} [options.layers] - Layer visibility flags
   * @param {boolean} [options.isXRayMode=false] - Initial X-Ray mode
   */
  constructor({
    layout = { length: 24, width: 16, height: 6 },
    layers = null,
    isXRayMode = false,
  } = {}) {
    this.layout = layout;
    this.layers = layers;
    this.isXRayMode = isXRayMode;
    this.isGlbActive = false;
    this.glbModel = null;

    // 1. Scene Root
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#F1F5F9');

    // 2. Lighting Rig
    this.lights = this._buildLightingRig(layout);
    this.lights.forEach((l) => this.scene.add(l));

    // 3. Static Store Environment
    const showWalls = layers?.showWalls !== undefined ? layers.showWalls : true;
    this.envGroup = buildStoreEnvironment(layout, showWalls);
    this.scene.add(this.envGroup);

    if (layers) {
      setEnvironmentLayersVisibility(this.envGroup, layers);
    }
    setEnvironmentXRayMode(this.envGroup, isXRayMode);

    // 4. Dynamic Entities Group (zones, workstations, staff avatars)
    this.dynamicGroup = new THREE.Group();
    this.dynamicGroup.name = 'dynamicGroup';
    this.scene.add(this.dynamicGroup);

    // 5. Decorative Steam Particles
    this.steamParticles = [];
    this.steamGroup = this._buildSteamSystem(layout);
    this.scene.add(this.steamGroup);
  }

  /**
   * Builds the stylized lighting rig with tuned soft shadows.
   * @private
   */
  _buildLightingRig(layout) {
    const storeLen = Number(layout?.length) || 24.0;
    const storeWid = Number(layout?.width) || 16.0;
    const storeH = Number(layout?.height) || 6.0;

    const hemiLight = new THREE.HemisphereLight(0xE0F2FE, 0xFEF3C7, 0.85);

    const dirLight = new THREE.DirectionalLight(0xFFFBEB, 1.25);
    dirLight.position.set(storeLen * 0.75, storeH * 2.6, storeWid * 0.85);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 1;
    dirLight.shadow.camera.far = 120;
    dirLight.shadow.bias = -0.0004;

    const frustumSize = Math.max(storeLen, storeWid) * 1.1;
    dirLight.shadow.camera.left = -frustumSize;
    dirLight.shadow.camera.right = frustumSize;
    dirLight.shadow.camera.top = frustumSize;
    dirLight.shadow.camera.bottom = -frustumSize;

    const fillLight = new THREE.DirectionalLight(0xE2E8F0, 0.4);
    fillLight.position.set(-storeLen * 0.6, storeH * 1.4, -storeWid * 0.6);

    return [hemiLight, dirLight, fillLight];
  }

  /**
   * Builds decorative rising steam particles for cafe/barista counters.
   * @private
   */
  _buildSteamSystem(layout) {
    const storeLen = Number(layout?.length) || 24.0;
    const storeWid = Number(layout?.width) || 16.0;

    const steamGroup = new THREE.Group();
    steamGroup.name = 'steamGroup';
    steamGroup.position.set(-storeLen * 0.22, 1.8, -storeWid * 0.18);

    const steamMat = new THREE.MeshBasicMaterial({
      color: 0xFFFFFF,
      transparent: true,
      opacity: 0.28,
    });
    const steamGeo = new THREE.SphereGeometry(0.04, 8, 8);

    for (let i = 0; i < 6; i++) {
      const p = new THREE.Mesh(steamGeo, steamMat);
      p.position.set(
        (Math.random() - 0.5) * 0.2,
        Math.random() * 0.6,
        (Math.random() - 0.5) * 0.2
      );
      p.userData = { speed: 0.003 + Math.random() * 0.004, startY: 0, seed: i * 2 };
      steamGroup.add(p);
      this.steamParticles.push(p);
    }

    return steamGroup;
  }

  /**
   * Retrieves the master Three.js Scene.
   */
  getScene() {
    return this.scene;
  }

  /**
   * Retrieves the environment meshes group.
   */
  getEnvGroup() {
    return this.envGroup;
  }

  /**
   * Retrieves the dynamic entities group.
   */
  getDynamicGroup() {
    return this.dynamicGroup;
  }

  /**
   * Asynchronously loads and applies the Coffee Shop Digital Twin GLB asset,
   * replacing procedural store geometry cleanly without double-rendering.
   * 
   * @param {string} [url=DEFAULT_DIGITAL_TWIN_GLB_URL]
   * @param {Object} [options]
   * @returns {Promise<Object|null>}
   */
  async loadAndApplyStoreModel(url = DEFAULT_DIGITAL_TWIN_GLB_URL, options = {}) {
    try {
      const modelData = await loadDigitalTwinModel({
        url,
        layout: this.layout,
        ...options,
      });

      if (!modelData || (!modelData.scene && !modelData.modelRoot)) {
        throw new Error('Loaded model data is invalid or empty');
      }

      return this.setStoreModelDirect(modelData);
    } catch (err) {
      console.warn(
        '[SceneGraphManager] Could not load GLB model, preserving procedural environment:',
        err?.message || err
      );
      this.isGlbActive = false;
      return null;
    }
  }

  /**
   * Directly applies a preloaded or parsed Digital Twin model result.
   * @param {Object} modelData
   * @returns {Object}
   */
  setStoreModelDirect(modelData) {
    if (!modelData || (!modelData.scene && !modelData.modelRoot)) {
      throw new Error('Invalid modelData passed to setStoreModelDirect');
    }

    // 1. Cleanly dispose existing procedural environment meshes in envGroup
    if (this.envGroup) {
      while (this.envGroup.children.length > 0) {
        const c = this.envGroup.children[0];
        this.envGroup.remove(c);
        disposeHierarchy(c);
      }
    } else {
      this.envGroup = new THREE.Group();
      this.envGroup.name = 'storeEnvironment';
      this.scene.add(this.envGroup);
    }

    // 2. Add GLB model root to envGroup
    const rootToAdd = modelData.modelRoot || modelData.scene;
    this.envGroup.add(rootToAdd);
    this.glbModel = modelData;
    this.isGlbActive = true;

    // 3. Re-apply current layer visibility and X-Ray mode
    if (this.layers) {
      setEnvironmentLayersVisibility(this.envGroup, this.layers);
    }
    setEnvironmentXRayMode(this.envGroup, this.isXRayMode);

    return modelData;
  }

  /**
   * Retrieves loaded GLB model data.
   */
  getGlbModel() {
    return this.glbModel;
  }

  /**
   * Checks if GLB model is currently loaded and active.
   */
  isGlbModelActive() {
    return this.isGlbActive;
  }

  /**
   * Updates environment layers visibility.
   */
  setLayersVisibility(layers) {
    this.layers = layers;
    if (this.envGroup && layers) {
      setEnvironmentLayersVisibility(this.envGroup, layers);
    }
  }

  /**
   * Toggles X-Ray glass transparency on environment walls.
   */
  setXRayMode(isXRay) {
    this.isXRayMode = isXRay;
    if (this.envGroup) {
      setEnvironmentXRayMode(this.envGroup, isXRay);
    }
  }

  /**
   * Called within the render loop to animate steam particles and pendant lamp sway.
   * @param {number} elapsedTime
   */
  updateAnimations(elapsedTime) {
    // 1. Steam rising particles
    this.steamParticles.forEach((sp) => {
      sp.position.y += sp.userData.speed;
      sp.position.x += Math.sin(elapsedTime * 2.0 + sp.userData.seed) * 0.001;
      sp.scale.setScalar(1.0 + sp.position.y * 1.5);
      if (sp.position.y > 0.75) {
        sp.position.y = 0;
        sp.scale.setScalar(1.0);
      }
    });

    // 2. Micro-swaying pendant lamps
    this.scene.traverse((obj) => {
      if (obj.name === 'pendantLamp') {
        obj.rotation.z = Math.sin(elapsedTime * 1.4) * 0.018;
        obj.rotation.x = Math.cos(elapsedTime * 1.1) * 0.012;
      }
    });
  }

  /**
   * Safely clears non-avatar entities in dynamicGroup before repopulating.
   */
  clearDynamicNonAvatarEntities() {
    if (!this.dynamicGroup) return;
    const toRemove = [];
    this.dynamicGroup.children.forEach((c) => {
      if (!c.userData?.isPerson) {
        toRemove.push(c);
      }
    });
    toRemove.forEach((c) => {
      this.dynamicGroup.remove(c);
      disposeHierarchy(c);
    });
  }

  /**
   * Full teardown and disposal of the scene graph.
   */
  dispose() {
    if (!this.scene) return;
    this.scene.traverse((obj) => {
      disposeHierarchy(obj);
    });
    this.steamParticles = [];
    this.envGroup = null;
    this.dynamicGroup = null;
    this.steamGroup = null;
    this.lights = [];
    this.glbModel = null;
    this.isGlbActive = false;
    this.scene = null;
  }
}
