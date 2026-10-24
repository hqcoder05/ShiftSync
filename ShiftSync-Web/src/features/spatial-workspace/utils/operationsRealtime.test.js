import test from 'node:test';
import assert from 'node:assert/strict';
import { getOperationsEventSummary, isEventForStore } from './operationsRealtime.js';

test('accepts only the selected store while allowing legacy local events without a store id', () => {
  assert.equal(isEventForStore({ storeId: 'store-a' }, 'store-a'), true);
  assert.equal(isEventForStore({ storeId: 'store-b' }, 'store-a'), false);
  assert.equal(isEventForStore({}, 'store-a'), true);
});

test('uses the verified nested attendance action instead of the generic envelope action', () => {
  const summary = getOperationsEventSummary('store_attendance_updated', { action: 'UPDATED', data: { action: 'CHECK_IN' }, timestamp: '2026-10-20T04:30:00.000Z' });
  assert.equal(summary.action, 'CHECK_IN');
  assert.equal(summary.label, 'Nhân viên đã check-in');
});

test('gives an explicit fallback for unknown event actions', () => {
  const summary = getOperationsEventSummary('store_marketplace_updated', { action: 'SOMETHING_NEW' });
  assert.equal(summary.label, 'Chợ ca được cập nhật');
  assert.ok(Date.parse(summary.timestamp));
});
