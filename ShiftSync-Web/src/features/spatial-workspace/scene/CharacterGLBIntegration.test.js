/**
 * CharacterGLBIntegration.test.js
 * Verification of 3D GLB Character Model Architecture, Role Resolution & State Machine.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import * as THREE from 'three';
import {
  resolveCharacterRole,
  ROLE_THEMES,
  CHARACTER_MODEL_URLS,
} from './character/CharacterAssetLoader.js';
import {
  createStylizedAvatar,
  setAvatarSelected,
  setAvatarTargetPosition,
  updateAvatarStateMachine,
} from './StylizedAvatars.js';

describe('Character GLB Integration Suite', () => {
  it('1. Correctly resolves roles to canonical character types', () => {
    assert.strictEqual(resolveCharacterRole('Pha chế Barista'), 'barista');
    assert.strictEqual(resolveCharacterRole('Barista'), 'barista');
    assert.strictEqual(resolveCharacterRole('Quản lý ca'), 'manager');
    assert.strictEqual(resolveCharacterRole('Store Manager'), 'manager');
    assert.strictEqual(resolveCharacterRole('Thu ngân POS'), 'cashier');
    assert.strictEqual(resolveCharacterRole('Cashier'), 'cashier');
    assert.strictEqual(resolveCharacterRole('Phục vụ bàn'), 'cashier');
    assert.strictEqual(resolveCharacterRole('Bếp bánh'), 'chef');
    assert.strictEqual(resolveCharacterRole('Chef De Partie'), 'chef');
    assert.strictEqual(resolveCharacterRole('Đầu bếp chính'), 'chef');
    assert.strictEqual(resolveCharacterRole('Khác'), 'barista'); // fallback
  });

  it('2. Model URLs and Role Themes are correctly registered', () => {
    assert.ok(CHARACTER_MODEL_URLS.barista.endsWith('crew-v2/barista.glb'));
    assert.ok(CHARACTER_MODEL_URLS.manager.endsWith('crew-v2/manager.glb'));
    assert.ok(CHARACTER_MODEL_URLS.cashier.endsWith('crew-v2/cashier.glb'));
    assert.ok(CHARACTER_MODEL_URLS.chef.endsWith('crew-v2/chef.glb'));

    assert.ok(ROLE_THEMES.barista.badgeColor);
    assert.ok(ROLE_THEMES.manager.badgeColor);
    assert.ok(ROLE_THEMES.cashier.badgeColor);
    assert.ok(ROLE_THEMES.chef.badgeColor);
  });

  it('3. createStylizedAvatar constructs valid avatar group with selection and tags', () => {
    const emp = {
      id: 'EMP_TEST_01',
      fullName: 'Lê Hoàng Cường',
      skillName: 'Pha chế Barista',
    };
    const zone = { id: 'ZONE_01', name: 'Khu Barista' };

    const avatar = createStylizedAvatar({
      employee: emp,
      zone,
      x: 2.0,
      y: 0.0,
      z: 3.5,
      isSelected: false,
    });

    assert.ok(avatar instanceof THREE.Group);
    assert.strictEqual(avatar.position.x, 2.0);
    assert.strictEqual(avatar.position.z, 3.5);
    assert.strictEqual(avatar.userData.isPerson, true);
    assert.strictEqual(avatar.userData.employee.id, 'EMP_TEST_01');
    assert.strictEqual(avatar.userData.roleType, 'barista');

    // Selection toggle test
    assert.strictEqual(avatar.userData.isSelected, false);
    setAvatarSelected(avatar, true);
    assert.strictEqual(avatar.userData.isSelected, true);
    assert.strictEqual(avatar.userData.halo.visible, true);

    setAvatarSelected(avatar, false);
    assert.strictEqual(avatar.userData.isSelected, false);
    assert.strictEqual(avatar.userData.halo.visible, false);
  });

  it('4. updateAvatarStateMachine smoothly drives walking and arrival states', () => {
    const emp = { id: 'EMP_WALK', fullName: 'Trần Thị Bích', skillName: 'Thu ngân' };
    const avatar = createStylizedAvatar({
      employee: emp,
      x: 0,
      y: 0,
      z: 0,
    });

    // Send avatar to (2.0, 0, 0)
    setAvatarTargetPosition(avatar, 2.0, 0, 0);
    assert.strictEqual(avatar.userData.state, 'WALKING');

    // Tick animation frame
    updateAvatarStateMachine(avatar, 0.1, 1.0);
    assert.ok(avatar.position.x > 0);
    assert.strictEqual(avatar.userData.state, 'WALKING');

    // Teleport close to target
    avatar.position.set(1.98, 0, 0);
    avatar.userData.currentPos.set(1.98, 0, 0);
    updateAvatarStateMachine(avatar, 0.1, 2.0);

    // Arrives at destination
    assert.strictEqual(avatar.userData.state, 'WORKING');
    assert.strictEqual(avatar.position.x, 2.0);
  });
});
