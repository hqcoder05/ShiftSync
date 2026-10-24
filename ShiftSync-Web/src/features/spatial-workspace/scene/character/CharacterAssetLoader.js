/**
 * CharacterAssetLoader.js
 * Loads the four versioned Crew V2 GLBs and matching procedural fallbacks.
 * Clones joint hierarchies while sharing cached geometry and materials.
 * Also creates floating name and role badges.
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {buildCrewModel} from './CrewModel.js';
import {resolveCharacterGender} from '../../utils/characterGender.js';

export const CHARACTER_MODEL_URLS = {
  barista: '/models/crew-v2/barista.glb',
  manager: '/models/crew-v2/manager.glb',
  cashier: '/models/crew-v2/cashier.glb',
  chef: '/models/crew-v2/chef.glb',
  barista_female: '/models/crew-v2/barista-female.glb?v=ponytail-1',
  manager_female: '/models/crew-v2/manager-female.glb?v=ponytail-1',
  cashier_female: '/models/crew-v2/cashier-female.glb?v=ponytail-1',
  chef_female: '/models/crew-v2/chef-female.glb?v=ponytail-1',
};

export const ROLE_THEMES = {
  barista: {
    label: ' Barista',
    badgeColor: '#D97706',
    border: 'rgba(217, 119, 6, 0.8)',
    glow: 0xD97706,
  },
  manager: {
    label: ' Quản lý',
    badgeColor: '#2563EB',
    border: 'rgba(37, 99, 235, 0.8)',
    glow: 0x2563EB,
  },
  cashier: {
    label: ' Thu ngân',
    badgeColor: '#0D9488',
    border: 'rgba(13, 148, 136, 0.8)',
    glow: 0x0D9488,
  },
  chef: {
    label: ' Đầu bếp',
    badgeColor: '#EA580C',
    border: 'rgba(234, 88, 12, 0.8)',
    glow: 0xEA580C,
  },
};

// Singleton GLTF Model Cache
const glbCache = new Map();
const fallbackCache = new Map();
let preloadPromise = null;

/**
 * Resolves role string / employee data to one of the 4 canonical roles
 */
export function resolveCharacterRole(roleName = '', employee = null) {
  const combined = (
    (employee?.skillName || '') + ' ' +
    (employee?.role || '') + ' ' +
    (employee?.position || '') + ' ' +
    (roleName || '')
  ).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  if (
    combined.includes('quan ly') ||
    combined.includes('manager') ||
    combined.includes('giam sat') ||
    combined.includes('supervisor') ||
    combined.includes('lead') ||
    combined.includes('truong')
  ) {
    return 'manager';
  }

  if (
    combined.includes('thu ngan') ||
    combined.includes('cashier') ||
    combined.includes('order') ||
    combined.includes('tiep tan') ||
    combined.includes('phuc vu') ||
    combined.includes('server') ||
    combined.includes('service') ||
    combined.includes('ban hang')
  ) {
    return 'cashier';
  }

  if (
    combined.includes('bep') ||
    combined.includes('chef') ||
    combined.includes('cook') ||
    combined.includes('bakery') ||
    combined.includes('banh') ||
    combined.includes('kitchen')
  ) {
    return 'chef';
  }

  // Default to Barista for beverage / coffee / general staff
  return 'barista';
}

/**
 * Preloads all 4 character GLB models in parallel
 */
export function preloadAllCharacterModels() {
  if (preloadPromise) return preloadPromise;

  if (typeof window === 'undefined') {
    preloadPromise = Promise.resolve(glbCache);
    return preloadPromise;
  }

  const loader = new GLTFLoader();
  const keys = Object.keys(CHARACTER_MODEL_URLS);

  preloadPromise = Promise.all(
    keys.map(
      (key) =>
        new Promise((resolve) => {
          if (glbCache.has(key)) {
            resolve({ key, scene: glbCache.get(key) });
            return;
          }
          loader.load(
            CHARACTER_MODEL_URLS[key],
            (gltf) => {
              const scene = gltf.scene;
              scene.traverse((child) => {
                if (child.isMesh) {
                  child.castShadow = true;
                  child.receiveShadow = true;
                  if (child.geometry) {
                    child.geometry.userData = child.geometry.userData || {};
                    child.geometry.userData.isShared = true;
                  }
                  if (child.material) {
                    child.material.side = THREE.FrontSide;
                    const mats = Array.isArray(child.material) ? child.material : [child.material];
                    mats.forEach((m) => {
                      m.userData = m.userData || {};
                      m.userData.isShared = true;
                    });
                  }
                }
              });
              glbCache.set(key, scene);
              resolve({ key, scene });
            },
            undefined,
            (err) => {
              console.warn(`[CharacterAssetLoader] Failed to load ${key} GLB:`, err);
              resolve({ key, scene: null });
            }
          );
        })
    )
  ).then(() => glbCache);

  return preloadPromise;
}

/**
 * Synchronously checks if a model is cached
 */
export function isCharacterModelCached(roleType) {
  return glbCache.has(roleType);
}

/**
 * Clones a cached character GLB model with limb joint bindings
 */
export function instantiateCharacterModel(roleType, genderValue) {
  const gender=resolveCharacterGender(genderValue);
  const baseRole=roleType;
  if(gender==='FEMALE')roleType += '_female';
  let cachedScene = glbCache.get(roleType);
  const isGlb=Boolean(cachedScene);
  if(!cachedScene){
    if(!fallbackCache.has(roleType)){
      const fallback=buildCrewModel(baseRole,gender);
      fallback.traverse(node=>{if(node.isMesh){node.geometry.userData.isShared=true;node.material.userData.isShared=true;}});
      fallbackCache.set(roleType,fallback);
    }
    cachedScene=fallbackCache.get(roleType);
  }

  const cloned = cachedScene.clone(true);

  // Traverse and bind named joints for high-performance animation
  let hips = null;
  let leftHip = null;
  let rightHip = null;
  let leftShoulder = null;
  let rightShoulder = null;
  let head = null;
  let spine = null;
  const extraJoints={};

  cloned.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
    if (child.name === 'Hips') hips = child;
    else if (child.name === 'LeftHip') leftHip = child;
    else if (child.name === 'RightHip') rightHip = child;
    else if (child.name === 'LeftShoulder') leftShoulder = child;
    else if (child.name === 'RightShoulder') rightShoulder = child;
    else if (child.name === 'Head') head = child;
    else if (child.name === 'Spine') spine = child;
    if(['LeftKnee','RightKnee','LeftElbow','RightElbow','LeftWrist','RightWrist'].includes(child.name))extraJoints[child.name[0].toLowerCase()+child.name.slice(1)]=child;
  });

  return {
    modelRoot: cloned,
    isGlb,
    joints: {
      hips,
      leftHip,
      rightHip,
      leftShoulder,
      rightShoulder,
      head,
      spine,
      ...extraJoints,
    },
  };
}

/**
 * Creates a high-fidelity 2D billboard sprite with employee name & role
 */
export function createStaffTagSprite(employee, roleName, roleType = 'barista') {
  if (typeof document === 'undefined') {
    const dummy = new THREE.Group();
    dummy.name = 'staffTagSprite';
    return dummy;
  }
  const canvas = document.createElement('canvas');
  canvas.width = 384;
  canvas.height = 112;
  const ctx = canvas.getContext('2d');

  const theme = ROLE_THEMES[roleType] || ROLE_THEMES.barista;
  const displayName = employee?.staffName || employee?.fullName || employee?.name || 'Nhân viên';
  const roleDisplay = roleName || theme.label;

  // Background rounded card
  const r = 20;
  ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
  ctx.beginPath();
  ctx.roundRect(8, 8, 368, 96, r);
  ctx.fill();

  // Subtle role accent border
  ctx.strokeStyle = theme.border;
  ctx.lineWidth = 3;
  ctx.stroke();

  // Status indicator dot (active green)
  ctx.fillStyle = '#10B981';
  ctx.beginPath();
  ctx.arc(36, 42, 8, 0, Math.PI * 2);
  ctx.fill();

  // Outer pulse ring for status dot
  ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(36, 42, 13, 0, Math.PI * 2);
  ctx.stroke();

  // Employee Name
  ctx.fillStyle = '#F8FAFC';
  ctx.font = 'bold 26px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const truncatedName = displayName.length > 18 ? displayName.substring(0, 16) + '...' : displayName;
  ctx.fillText(truncatedName, 58, 42);

  // Role Badge Pill
  ctx.fillStyle = theme.badgeColor;
  ctx.beginPath();
  ctx.roundRect(30, 70, 160, 26, 6);
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '600 15px sans-serif';
  ctx.fillText(roleDisplay, 40, 83);

  // Canvas texture and Three.js sprite
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.colorSpace = THREE.SRGBColorSpace;

  const spriteMat = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
  });

  const sprite = new THREE.Sprite(spriteMat);
  sprite.scale.set(1.4, 0.41, 1.0);
  sprite.position.set(0, 1.95, 0); // Positioned comfortably above character head
  sprite.name = 'staffTagSprite';
  sprite.userData.isStaffTag = true;

  return sprite;
}
