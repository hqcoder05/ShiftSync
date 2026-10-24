import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_LAYERS, useSpatialViewStore } from './spatialViewStore.js';
test('player view accepts explicit controller mode and functional HUD toggle',()=>{
 const store=useSpatialViewStore;store.getState().resetViewState();
 store.getState().setPlayerViewMode('first_person');
 store.getState().setPlayerViewMode(previous=>previous==='first_person'?'third_person':'first_person');
 assert.equal(store.getState().playerViewMode,'third_person');
 store.getState().setPlayerViewMode('first_person');assert.equal(store.getState().playerViewMode,'first_person');store.getState().resetViewState();
});

test('attendance visibility is an independent spatial layer', () => {
  const store = useSpatialViewStore;
  store.getState().resetViewState();

  assert.equal(DEFAULT_LAYERS.showAttendance, true);
  store.getState().toggleLayer('showAttendance');
  assert.equal(store.getState().layers.showAttendance, false);
  assert.equal(store.getState().layers.showFurniture, true);
  assert.equal(store.getState().layers.showStaff, true);

  store.getState().resetViewState();
});
