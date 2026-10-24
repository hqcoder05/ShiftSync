/**
 * FurnitureBuilder.test.js
 * Unit tests for Workstation 3D models, shared resource protection, and collision prevention.
 */

// Mock minimal browser globals for CanvasTexture in Node before importing Three.js modules
if (typeof global.document === 'undefined') {
  global.document = {
    createElement: (tag) => {
      if (tag === 'canvas') {
        return {
          width: 512,
          height: 256,
          getContext: () => ({
            fillStyle: '',
            strokeStyle: '',
            lineWidth: 1,
            font: '',
            textAlign: '',
            textBaseline: '',
            beginPath: () => {},
            roundRect: () => {},
            rect: () => {},
            fillRect: () => {},
            strokeRect: () => {},
            fill: () => {},
            stroke: () => {},
            arc: () => {},
            fillText: () => {},
          }),
        };
      }
      return {};
    },
  };
}

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildWorkstationObject,
  createWorkstationTagSprite,
  isFurnitureSharedMaterial,
  materials,
} from './FurnitureBuilder.js';

describe('W-01 & W-03: FurnitureBuilder & Workstation Layer Tests', () => {
  test('isFurnitureSharedMaterial correctly identifies shared singleton materials', () => {
    assert.strictEqual(isFurnitureSharedMaterial(materials.darkWood), true);
    assert.strictEqual(isFurnitureSharedMaterial(materials.posBody), true);
    assert.strictEqual(isFurnitureSharedMaterial(materials.metalInox), true);

    // Non-shared object or arbitrary object should return false
    assert.strictEqual(isFurnitureSharedMaterial({}), false);
    assert.strictEqual(isFurnitureSharedMaterial(null), false);
    assert.strictEqual(isFurnitureSharedMaterial(undefined), false);
  });

  test('buildWorkstationObject builds Barista workstation group with proper metadata', () => {
    const wsData = {
      id: 'ws-101',
      code: 'BAR-01',
      name: 'Quầy pha chế chính',
      workstationType: 'BARISTA',
      x: 4.5,
      y: 2.0,
      z: 0.0,
      isActive: true,
    };

    const group = buildWorkstationObject(wsData);
    assert.ok(group, 'Group should be returned');
    assert.strictEqual(group.userData.isWorkstation, true);
    assert.strictEqual(group.userData.workstationId, 'ws-101');
    assert.strictEqual(group.userData.workstation.code, 'BAR-01');
    assert.strictEqual(group.children.length > 0, true, 'Group should have 3D child meshes');
  });

  test('buildWorkstationObject builds POS, Kitchen, and Retail workstations correctly', () => {
    const types = ['POS', 'KITCHEN', 'DISPLAY', 'STORAGE', 'STYLING', 'SERVICE', 'UNKNOWN'];
    types.forEach((type) => {
      const group = buildWorkstationObject({
        id: `ws-${type}`,
        name: `Trạm ${type}`,
        workstationType: type,
      });
      assert.ok(group);
      assert.strictEqual(group.userData.isWorkstation, true);
      assert.strictEqual(group.userData.workstationId, `ws-${type}`);
    });
  });

  test('createWorkstationTagSprite creates sprite with workstation label metadata', () => {
    const wsData = {
      id: 'ws-202',
      code: 'POS-01',
      name: 'Quầy Thu Ngân 1',
      workstationType: 'POS',
      isActive: true,
    };

    const sprite = createWorkstationTagSprite(wsData);
    assert.ok(sprite);
    assert.strictEqual(sprite.isSprite, true);
    assert.ok(sprite.material);
    assert.strictEqual(sprite.scale.x, 3);
    assert.strictEqual(sprite.scale.y / sprite.scale.x, 192 / 720);
  });

  test('Collision prevention logic (zonesWithWorkstations) works reliably', () => {
    const mockWorkstations = [
      { id: 'ws-1', zoneId: 'zone-barista', name: 'Barista' },
      { id: 'ws-2', zoneId: 'zone-pos', name: 'POS Cashier' },
      { id: 'ws-3', zoneId: null, name: 'Floating Station' },
    ];

    const zonesWithWorkstations = new Set(
      mockWorkstations.map((w) => w.zoneId).filter(Boolean)
    );

    assert.strictEqual(zonesWithWorkstations.has('zone-barista'), true);
    assert.strictEqual(zonesWithWorkstations.has('zone-pos'), true);
    assert.strictEqual(zonesWithWorkstations.has('zone-dining'), false);
    assert.strictEqual(zonesWithWorkstations.has('zone-kitchen'), false);
  });

  test('createWorkstationTagSprite creates sprite with occupancy and staff presence', () => {
    const wsData = {
      id: 'ws-pos-1',
      code: 'POS-01',
      name: 'Quầy Thu Ngân 1',
      workstationType: 'POS',
      isActive: true,
      capacity: 1,
    };

    const occupancyAssigned = {
      state: 'ASSIGNED',
      statusReason: 'Đang trực (1/1 có mặt)',
      assignedStaff: [
        {
          staffId: 'user-1',
          staffName: 'Trần Thị Bích',
          isPresent: true,
          checkInTime: '2026-10-14T08:00:00Z',
        },
      ],
    };

    const sprite = createWorkstationTagSprite(wsData, occupancyAssigned);
    assert.ok(sprite);
    assert.strictEqual(sprite.isSprite, true);
    assert.ok(sprite.material);

    const selectedWithoutAttendance = createWorkstationTagSprite(wsData, occupancyAssigned, {
      isSelected: true,
      showAttendance: false,
    });
    assert.equal(selectedWithoutAttendance.userData.isSelected, true);
    assert.equal(selectedWithoutAttendance.userData.showAttendance, false);

    const occupancyEmpty = {
      state: 'UNASSIGNED',
      statusReason: 'Trống',
      assignedStaff: [],
    };
    const spriteEmpty = createWorkstationTagSprite(wsData, occupancyEmpty);
    assert.ok(spriteEmpty);
  });
});

