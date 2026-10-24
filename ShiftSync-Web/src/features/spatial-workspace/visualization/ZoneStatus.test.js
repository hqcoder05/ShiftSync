/**
 * ZoneStatus.test.js
 * Unit tests for Data-driven Heatmap & Zone Staffing Status Logic
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ZONE_STATUS,
  getZoneStatus,
  getZoneStatusColor,
  getZoneStatusExplanation,
  getRoleTheme,
} from './ZoneStatus.js';

describe('Data-driven Heatmap & ZoneStatus Unit Tests', () => {
  it('1. Correctly identifies ZONE_STATUS states including NO_DATA', () => {
    assert.equal(ZONE_STATUS.OPTIMAL, 'OPTIMAL');
    assert.equal(ZONE_STATUS.UNDERSTAFFED, 'UNDERSTAFFED');
    assert.equal(ZONE_STATUS.OVERSTAFFED, 'OVERSTAFFED');
    assert.equal(ZONE_STATUS.FULL, 'FULL');
    assert.equal(ZONE_STATUS.EMPTY, 'EMPTY');
    assert.equal(ZONE_STATUS.NO_DATA, 'NO_DATA');
  });

  it('2. Evaluates staffing status against verified shift targetCount first', () => {
    // Empty when assigned is 0 and targetCount > 0
    assert.equal(getZoneStatus(0, 4, 2), ZONE_STATUS.EMPTY);

    // Understaffed when assigned < targetCount
    assert.equal(getZoneStatus(1, 4, 2), ZONE_STATUS.UNDERSTAFFED);

    // Optimal when assigned == targetCount
    assert.equal(getZoneStatus(2, 4, 2), ZONE_STATUS.OPTIMAL);

    // Overstaffed when assigned > targetCount
    assert.equal(getZoneStatus(3, 4, 2), ZONE_STATUS.OVERSTAFFED);

    // Not needed in shift (targetCount == 0)
    assert.equal(getZoneStatus(0, 4, 0), ZONE_STATUS.OPTIMAL);
    assert.equal(getZoneStatus(1, 4, 0), ZONE_STATUS.OVERSTAFFED);
  });

  it('3. Falls back safely to capacity when targetCount is null or undefined', () => {
    // Empty when 0 assigned
    assert.equal(getZoneStatus(0, 4, null), ZONE_STATUS.EMPTY);

    // Understaffed when assigned < 50% capacity
    assert.equal(getZoneStatus(1, 4, null), ZONE_STATUS.UNDERSTAFFED);

    // Optimal when assigned >= 50% capacity and <= capacity
    assert.equal(getZoneStatus(2, 4, null), ZONE_STATUS.OPTIMAL);
    assert.equal(getZoneStatus(3, 4, null), ZONE_STATUS.OPTIMAL);

    // Full when assigned == capacity
    assert.equal(getZoneStatus(4, 4, null), ZONE_STATUS.FULL);

    // Overstaffed when assigned > capacity
    assert.equal(getZoneStatus(5, 4, null), ZONE_STATUS.OVERSTAFFED);
  });

  it('4. Handles missing or invalid capacity without targetCount by returning NO_DATA', () => {
    assert.equal(getZoneStatus(0, null, null), ZONE_STATUS.NO_DATA);
    assert.equal(getZoneStatus(0, undefined, null), ZONE_STATUS.NO_DATA);
    assert.equal(getZoneStatus(0, 0, null), ZONE_STATUS.NO_DATA);
    assert.equal(getZoneStatus(0, -1, null), ZONE_STATUS.NO_DATA);

    // If staff is present without configuration, treat as optimal
    assert.equal(getZoneStatus(1, null, null), ZONE_STATUS.OPTIMAL);
  });

  it('5. Generates human-readable explanations explaining the exact status reason', () => {
    // With targetCount
    const expUnder = getZoneStatusExplanation(1, 4, 3);
    assert.match(expUnder, /Thiếu 2 nhân sự/);
    assert.match(expUnder, /1\/3/);

    const expOptimal = getZoneStatusExplanation(3, 4, 3);
    assert.match(expOptimal, /Đạt định biên ca/);
    assert.match(expOptimal, /3\/3/);

    const expOver = getZoneStatusExplanation(4, 4, 3);
    assert.match(expOver, /Vượt định biên ca \+1/);

    const expEmpty = getZoneStatusExplanation(0, 4, 2);
    assert.match(expEmpty, /Chưa có nhân sự được phân công/);

    // Without targetCount
    const expNoData = getZoneStatusExplanation(0, null, null);
    assert.match(expNoData, /Chưa cấu hình định biên/);
  });

  it('6. getZoneStatusColor maps each status to appropriate enterprise palette', () => {
    const colOptimal = getZoneStatusColor(ZONE_STATUS.OPTIMAL);
    assert.equal(colOptimal.main, '#10B981');
    assert.equal(colOptimal.label, 'Đủ nhân sự');

    const colUnder = getZoneStatusColor(ZONE_STATUS.UNDERSTAFFED);
    assert.equal(colUnder.main, '#F59E0B');
    assert.equal(colUnder.label, 'Thiếu nhân sự');

    const colOver = getZoneStatusColor(ZONE_STATUS.OVERSTAFFED);
    assert.equal(colOver.main, '#8B5CF6');
    assert.equal(colOver.label, 'Dư nhân sự');

    const colNoData = getZoneStatusColor(ZONE_STATUS.NO_DATA);
    assert.equal(colNoData.main, '#64748B');
    assert.equal(colNoData.label, 'Chưa có định biên');
  });

  it('7. role themes omit decorative emoji as requested', () => {
    for (const role of ['Barista Pha Chế', 'Thu ngân POS', 'Bếp bánh', 'Quản lý ca', 'Tùy biến']) {
      assert.equal(getRoleTheme(role).icon, '');
    }
  });
});
