/**
 * SceneAndResourceManager.test.js
 * Unit test suite for ResourceManager and SceneGraphManager (ARC-IMP-03).
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { ResourceManager, isSharedResource, disposeHierarchy } from './ResourceManager.js';
import { SceneGraphManager } from './SceneGraphManager.js';
import { materials as furnitureMaterials } from './FurnitureBuilder.js';

describe('ARC-IMP-03: ResourceManager & SceneGraphManager Unit Tests', () => {
  const layout = { length: 24, width: 16, height: 6 };

  describe('1. ResourceManager Tests', () => {
    it('1.1. Identifies built-in shared furniture materials as protected', () => {
      if (furnitureMaterials?.woodCounter) {
        assert.strictEqual(ResourceManager.isSharedResource(furnitureMaterials.woodCounter), true);
        assert.strictEqual(isSharedResource(furnitureMaterials.woodCounter), true);
      }
    });

    it('1.2. Allows registering custom shared resources in WeakSet', () => {
      const customMat = new THREE.MeshBasicMaterial({ color: 0x123456 });
      assert.strictEqual(ResourceManager.isSharedResource(customMat), false);

      ResourceManager.registerSharedResource(customMat);
      assert.strictEqual(ResourceManager.isSharedResource(customMat), true);
    });

    it('1.3. Preserves shared resources and disposes instance resources in disposeHierarchy', () => {
      let sharedMatDisposed = false;
      let instanceMatDisposed = false;
      let instanceGeoDisposed = false;
      let instanceTextureDisposed = false;

      const sharedMat = new THREE.MeshBasicMaterial();
      sharedMat.dispose = () => { sharedMatDisposed = true; };
      ResourceManager.registerSharedResource(sharedMat);

      const instanceTexture = { dispose: () => { instanceTextureDisposed = true; } };
      const instanceMat = new THREE.MeshBasicMaterial({ map: instanceTexture });
      instanceMat.dispose = () => { instanceMatDisposed = true; };

      const instanceGeo = new THREE.BoxGeometry(1, 1, 1);
      instanceGeo.dispose = () => { instanceGeoDisposed = true; };

      const parentGroup = new THREE.Group();
      const sharedChild = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), sharedMat);
      const instanceChild = new THREE.Mesh(instanceGeo, instanceMat);

      parentGroup.add(sharedChild);
      parentGroup.add(instanceChild);

      disposeHierarchy(parentGroup);

      assert.strictEqual(sharedMatDisposed, false, 'Shared material must NEVER be disposed');
      assert.strictEqual(instanceMatDisposed, true, 'Instance material must be disposed');
      assert.strictEqual(instanceGeoDisposed, true, 'Instance geometry must be disposed');
      assert.strictEqual(instanceTextureDisposed, true, 'Instance texture map must be disposed');
    });
  });

  describe('2. SceneGraphManager Tests', () => {
    it('2.1. Initializes scene, lights, envGroup, and dynamicGroup properly', () => {
      const mgr = new SceneGraphManager({ layout });

      assert.ok(mgr.getScene() instanceof THREE.Scene);
      assert.ok(mgr.getEnvGroup() instanceof THREE.Group);
      assert.ok(mgr.getDynamicGroup() instanceof THREE.Group);
      assert.strictEqual(mgr.getScene().background.getHexString(), 'f1f5f9');

      mgr.dispose();
    });

    it('2.2. Updates layer visibility and X-Ray mode safely', () => {
      const mgr = new SceneGraphManager({
        layout,
        layers: { showWalls: true, showFloor: true },
        isXRayMode: false,
      });

      // Toggling layers and X-Ray should not throw
      assert.doesNotThrow(() => {
        mgr.setLayersVisibility({ showWalls: false, showFloor: true });
        mgr.setXRayMode(true);
        mgr.setXRayMode(false);
      });

      mgr.dispose();
    });

    it('2.3. Updates steam particle animations without throwing', () => {
      const mgr = new SceneGraphManager({ layout });

      assert.doesNotThrow(() => {
        mgr.updateAnimations(1.5);
        mgr.updateAnimations(3.0);
      });

      mgr.dispose();
    });

    it('2.4. clearDynamicNonAvatarEntities removes non-avatars and keeps avatars', () => {
      const mgr = new SceneGraphManager({ layout });
      const dynamicGroup = mgr.getDynamicGroup();

      const avatarMesh = new THREE.Mesh();
      avatarMesh.userData = { isPerson: true, employee: { id: 'staff-1' } };

      const zoneDecalMesh = new THREE.Mesh();
      zoneDecalMesh.userData = { isZone: true };

      const workstationMesh = new THREE.Mesh();
      workstationMesh.userData = { isWorkstation: true };

      dynamicGroup.add(avatarMesh);
      dynamicGroup.add(zoneDecalMesh);
      dynamicGroup.add(workstationMesh);

      assert.strictEqual(dynamicGroup.children.length, 3);

      mgr.clearDynamicNonAvatarEntities();

      assert.strictEqual(dynamicGroup.children.length, 1);
      assert.strictEqual(dynamicGroup.children[0], avatarMesh);

      mgr.dispose();
    });

    it('2.5. Full teardown disposes scene and resets group references', () => {
      const mgr = new SceneGraphManager({ layout });
      assert.ok(mgr.getScene());

      mgr.dispose();
      assert.strictEqual(mgr.getScene(), null);
      assert.strictEqual(mgr.getEnvGroup(), null);
      assert.strictEqual(mgr.getDynamicGroup(), null);
    });
  });
});
