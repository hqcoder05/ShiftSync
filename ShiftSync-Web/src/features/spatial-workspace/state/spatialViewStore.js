/**
 * spatialViewStore.js
 * Dedicated Zustand store for 3D Digital Twin visualization view preferences.
 * 
 * ARC-001 (ARC-IMP-01): Separates visualization view configuration
 * (camera mode, layers, heatmap, X-ray) from authoritative domain state
 * (Store, Shift, Workstation records) and high-frequency ephemeral interaction state.
 */

import { create } from 'zustand';
import { CAMERA_MODES } from '../camera/CameraModes.js';

export const DEFAULT_LAYERS = Object.freeze({
  showFloor: true,
  showWalls: true,
  showCeiling: true,
  showFurniture: true,
  showWorkstations: true,
  showZones: true,
  showStaff: true,
  showAttendance: true,
  showFlow: true,
  showGeofence: false,
});

export const useSpatialViewStore = create((set, get) => ({
  // ── Visualization View State ──
  cameraMode: CAMERA_MODES.OVERVIEW,
  use2DFallback: false,
  isXRayMode: false,
  layers: { ...DEFAULT_LAYERS },
  heatmapMode: 'STAFFING',
  activeSkillFilter: 'ALL',
  isExploreMode: false,
  playerViewMode: 'third_person',
  followingStaff: null,

  // ── Actions ──
  setCameraMode: (mode) => set({ cameraMode: mode }),
  
  setUse2DFallback: (val) =>
    set((state) => ({
      use2DFallback: typeof val === 'function' ? Boolean(val(state.use2DFallback)) : Boolean(val),
    })),
  toggle2DFallback: () => set((state) => ({ use2DFallback: !state.use2DFallback })),
  
  setIsXRayMode: (val) =>
    set((state) => ({
      isXRayMode: typeof val === 'function' ? Boolean(val(state.isXRayMode)) : Boolean(val),
    })),
  toggleXRayMode: () => set((state) => ({ isXRayMode: !state.isXRayMode })),

  setLayers: (updater) =>
    set((state) => ({
      layers: typeof updater === 'function' ? updater(state.layers) : { ...state.layers, ...updater },
    })),
  toggleLayer: (layerKey) =>
    set((state) => ({
      layers: { ...state.layers, [layerKey]: !state.layers[layerKey] },
    })),

  setHeatmapMode: (mode) => set({ heatmapMode: mode }),
  setActiveSkillFilter: (filter) => set({ activeSkillFilter: filter }),
  
  setIsExploreMode: (val) =>
    set((state) => ({
      isExploreMode: typeof val === 'function' ? Boolean(val(state.isExploreMode)) : Boolean(val),
    })),
  setPlayerViewMode: (mode) => set(state=>({playerViewMode:typeof mode==='function'?mode(state.playerViewMode):mode})),
  setFollowingStaff: (staff) => set({ followingStaff: staff }),

  resetViewState: () =>
    set({
      cameraMode: CAMERA_MODES.OVERVIEW,
      use2DFallback: false,
      isXRayMode: false,
      layers: { ...DEFAULT_LAYERS },
      heatmapMode: 'STAFFING',
      activeSkillFilter: 'ALL',
      isExploreMode: false,
      playerViewMode: 'third_person',
      followingStaff: null,
    }),
}));
