import test from 'node:test';
import assert from 'node:assert/strict';
import { SPATIAL_WORKSPACE_PATH, isLegacySpatialScheduleSearch } from './spatialRoute.js';

test('the standalone 3D workspace has a stable route', () => {
  assert.equal(SPATIAL_WORKSPACE_PATH, '/store-3d');
});

test('only the legacy 3D schedule query is redirected to the workspace', () => {
  assert.equal(isLegacySpatialScheduleSearch('?view=3d'), true);
  assert.equal(isLegacySpatialScheduleSearch('?view=3D&tab=availability'), true);
  assert.equal(isLegacySpatialScheduleSearch('?tab=availability'), false);
  assert.equal(isLegacySpatialScheduleSearch('?view=week'), false);
});
