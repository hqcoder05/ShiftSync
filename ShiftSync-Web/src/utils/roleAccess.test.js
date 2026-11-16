import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canAccessSettingsScope,
  canAdministerSystem,
  canManageStore,
  getDefaultRoute,
  getDefaultSettingsRoute,
  getRoleLabel,
} from './roleAccess.js';

test('role homes and labels separate ADMIN, MANAGER, and STAFF', () => {
  assert.equal(getDefaultRoute('ADMIN'), '/admin');
  assert.equal(getDefaultRoute('MANAGER'), '/dashboard');
  assert.equal(getDefaultRoute('STAFF'), '/schedule');
  assert.equal(getRoleLabel('ADMIN'), 'Quản trị viên');
});

test('system access is ADMIN-only while store access also permits MANAGER', () => {
  assert.equal(canAdministerSystem('ADMIN'), true);
  assert.equal(canAdministerSystem('MANAGER'), false);
  assert.equal(canManageStore('ADMIN'), true);
  assert.equal(canManageStore('MANAGER'), true);
  assert.equal(canManageStore('STAFF'), false);
  assert.equal(canAccessSettingsScope('STAFF', 'personal'), true);
  assert.equal(canAccessSettingsScope('STAFF', 'store'), false);
  assert.equal(canAccessSettingsScope('MANAGER', 'system'), false);
  assert.equal(getDefaultSettingsRoute('ADMIN'), '/settings/system');
});
