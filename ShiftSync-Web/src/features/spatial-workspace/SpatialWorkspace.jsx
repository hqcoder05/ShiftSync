/**
 * SpatialWorkspace.jsx
 * Master Feature Orchestrator for the Play Together-inspired 3D Workforce Digital Twin.
 * 
 * Bridges React DOM SaaS UI (Toolbar, Inspector, Timeline Scrubber) with
 * a high-performance, stylized Three.js 3D Store Digital Twin supporting:
 * - SPATIAL: Clear zone, workstation, and employee distribution
 * - TEMPORAL: Real-time Timeline Scrubbing & Shift Animation based on Spring Boot data
 * - INTERACTIVE: 3D Exploration, Follow Employee, X-Ray, Layer System, Heatmaps, and What-If Simulation.
 */

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// Feature modules
import {
  buildStoreEnvironment,
  setEnvironmentXRayMode,
  setEnvironmentLayersVisibility,
} from './scene/StoreEnvironment';
import { buildZoneDecal, createZoneTagSprite } from './scene/ZoneDecals';
import { buildZoneFurniture } from './scene/FurnitureBuilder';
import {
  createStylizedAvatar,
  setAvatarSelected,
  setAvatarTargetPosition,
  updateAvatarStateMachine,
} from './scene/StylizedAvatars';
import { CameraController } from './camera/CameraController';
import { toast } from '../../context/ToastContext';
import {
  CAMERA_MODES,
  getOverviewCameraConfig,
  getTopDownCameraConfig,
  getZoneFocusCameraConfig,
  getEmployeeFocusCameraConfig,
  getWorkstationFocusCameraConfig,
} from './camera/CameraModes';

// Mode 2 Exploration
import { createPlayerAvatar } from './explore/PlayerAvatar';
import { PlayerController } from './explore/PlayerController';
import ExploreHUD from './components/ExploreHUD';

// Mode 4 Simulation Room
import { useSimulationStore } from './simulation/simulationStore';
import { compareSimulationImpact } from './simulation/SimulationImpactCalculator';
import { generateSimulationAutoSchedule } from './simulation/SimulationAutoScheduler';
import { DragTransfer } from './interaction/DragTransfer';
import SimulationBanner from './components/Simulation/SimulationBanner';
import SimulationImpactPanel from './components/Simulation/SimulationImpactPanel';
import SimulationDiffModal from './components/Simulation/SimulationDiffModal';
import ApplyConfirmModal from './components/Simulation/ApplyConfirmModal';
import ExitWarningModal from './components/Simulation/ExitWarningModal';
import { assignStaffToShift, removeStaffFromShift } from '../../services/shiftService';

// React DOM Overlays
import CommandHeader from './components/header/CommandHeader';
import StaffingKpiBar from './components/kpi/StaffingKpiBar';
import SpatialToolbar from './components/SpatialToolbar';
import SpatialInspector from './components/SpatialInspector';
import SpatialTimeline from './components/SpatialTimeline';
import TwoDSpatialSchematic from '../../components/spatial/TwoDSpatialSchematic';
import { toThreeCoords, getDeterministicPersonOffset, resolveSemanticZone, getZoneShiftRequirements } from '../../components/spatial/spatial.constants';

export default function SpatialWorkspace({
  layout = { length: 24, width: 16, height: 6 },
  zones = [],
  staff = [],
  storeName = 'Chi nhánh cửa hàng',
  stores = [],
  selectedStoreId,
  onSelectStore,
  onRunAlgorithm,
  isAllocating = false,
  allocatedSequence = [],
  allDateShifts = [],
  activeDate,
  currentShift = null,
  onSelectShift,
  employees = [],
  skills = [],
  onOpenAutoSchedule,
  onPublishSchedule,
  storeId,
  onApplyComplete,
}) {
  const mountRef = useRef(null);
  const [use2DFallback, setUse2DFallback] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(true);

  // Selection states
  const [selectedZone, setSelectedZone] = useState(null);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [cameraMode, setCameraMode] = useState(CAMERA_MODES.OVERVIEW);

  // Follow Employee state
  const [followingStaff, setFollowingStaff] = useState(null);

  // Mode 2 Exploration states
  const [isExploreMode, setIsExploreMode] = useState(false);
  const [playerViewMode, setPlayerViewMode] = useState('third_person');
  const [nearbyEntity, setNearbyEntity] = useState(null);
  const [playerPosition, setPlayerPosition] = useState({ x: 0, z: 0 });
  const [playerYaw, setPlayerYaw] = useState(Math.PI);

  // X-Ray Mode
  const [isXRayMode, setIsXRayMode] = useState(false);

  // Layer toggles
  const [layers, setLayers] = useState({
    showFloor: true,
    showWalls: true,
    showCeiling: true,
    showFurniture: true,
    showZones: true,
    showStaff: true,
    showFlow: true,
    showGeofence: false,
  });

  // Heatmap mode
  const [heatmapMode, setHeatmapMode] = useState('STAFFING');
  // Skill Layer Filter
  const [activeSkillFilter, setActiveSkillFilter] = useState('ALL');

  // DragTransfer real-time validation HUD state
  const [dragValidationState, setDragValidationState] = useState(null);
  const [dragTargetZone, setDragTargetZone] = useState(null);



  // Temporal Timeline Engine
  const [currentTimeMinutes, setCurrentTimeMinutes] = useState(() => {
    if (currentShift?.startTime) {
      const parts = currentShift.startTime.split(':');
      return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
    }
    return 600; // 10:00 default
  });
  const [isPlayingTimeline, setIsPlayingTimeline] = useState(false);
  const [timelineSpeed, setTimelineSpeed] = useState(1);

  // Mode D: Dedicated Workforce Simulation Store
  const {
    isSimulating,
    viewMode: simViewMode,
    productionSnapshot,
    simulatedStaff: storeSimulatedStaff,
    simulatedDiff,
    enterSimulation,
    exitSimulation,
    setViewMode: setSimViewMode,
    transferStaff,
    swapStaff,
    removeSimulatedStaff,
    addSimulatedStaff,
    applyAutoScheduleSimulation,
    resetCurrentScenario,
    simulateLeaveAbsence,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useSimulationStore();
  if (typeof window !== 'undefined') window.__useSimulationStore = useSimulationStore;

  // Keyboard shortcuts for Simulation Undo / Redo
  useEffect(() => {
    if (!isSimulating) return;
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (canUndo()) undo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'Z'))) {
        e.preventDefault();
        if (canRedo()) redo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSimulating, undo, redo, canUndo, canRedo]);

  // Simulation UI Dialog States
  const [isDiffModalOpen, setIsDiffModalOpen] = useState(false);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [isExitWarningOpen, setIsExitWarningOpen] = useState(false);
  const [pendingExitTarget, setPendingExitTarget] = useState(null); // 'OVERVIEW' | '2D' | 'EXPLORE'
  const [isApplying, setIsApplying] = useState(false);

  // DragTransfer controller ref
  const dragTransferRef = useRef(null);

  // Three.js instances refs
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const controlsRef = useRef(null);
  const cameraControllerRef = useRef(null);
  const envGroupRef = useRef(null);
  const dynamicGroupRef = useRef(null);
  const avatarMeshesRef = useRef([]);

  // Exploration refs
  const isExploreModeRef = useRef(false);
  const playerControllerRef = useRef(null);
  const playerAvatarRef = useRef(null);
  const savedOverviewCameraRef = useRef(null);
  const zonesRef = useRef(zones);
  const staffRef = useRef(staff);

  useEffect(() => {
    zonesRef.current = zones;
  }, [zones]);

  useEffect(() => {
    staffRef.current = staff;
  }, [staff]);

  // Sync timeline needle to current shift's start time when shift changes
  useEffect(() => {
    if (currentShift?.startTime) {
      const parts = currentShift.startTime.split(':');
      const newMinutes = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
      setCurrentTimeMinutes(newMinutes);
      setIsPlayingTimeline(false); // pause auto-play when shift switches
    }
  }, [currentShift?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── 1. Temporal Staff Resolver (Bridges Real Shift Data to Timeline) ──
  const temporalStaff = useMemo(() => {
    if (!allDateShifts || allDateShifts.length === 0) return staff;

    const list = [];
    allDateShifts.forEach((shift) => {
      const partsStart = (shift.startTime || '06:00').split(':');
      const startM = parseInt(partsStart[0], 10) * 60 + parseInt(partsStart[1], 10);
      const partsEnd = (shift.endTime || '14:00').split(':');
      const endM = parseInt(partsEnd[0], 10) * 60 + parseInt(partsEnd[1], 10);

      // Check if this shift covers currentTimeMinutes
      if (currentTimeMinutes >= startM && currentTimeMinutes <= endM) {
        const usedCounts = {};
        if (Array.isArray(shift.shiftAssignments) && shift.shiftAssignments.length > 0) {
          shift.shiftAssignments.forEach((assign, idx) => {
            const matchedEmp = employees.find((e) => e.id === assign.staffId);
            const skObj = skills.find((s) => s.id === (assign.requiredSkillId || assign.skillId) || s.name === assign.skillName);
            const skillName = assign.skillName || skObj?.name || assign.role || matchedEmp?.skillName || matchedEmp?.position || 'Nhân viên';

            let assignedZoneId = assign.zoneId;
            if (!assignedZoneId || !zones.some((z) => z.id === assignedZoneId)) {
              const reqMatch = shift.skillRequirements?.find(
                (r) => (r.skillId && r.skillId === (assign.requiredSkillId || assign.skillId)) || (r.skillName && r.skillName === skillName)
              );
              if (reqMatch && reqMatch.zoneId && zones.some((z) => z.id === reqMatch.zoneId)) {
                assignedZoneId = reqMatch.zoneId;
              } else {
                const semanticZone = resolveSemanticZone(skillName, zones, usedCounts);
                assignedZoneId = semanticZone?.id || zones[idx % Math.max(1, zones.length)]?.id;
              }
            } else {
              usedCounts[assignedZoneId] = (usedCounts[assignedZoneId] || 0) + 1;
            }

            list.push({
              id: assign.id || assign.staffId || `staff-${shift.id}-${idx}`,
              staffId: assign.staffId,
              staffName: assign.staffName || matchedEmp?.fullName || 'Nhân viên',
              skillName: skillName,
              zoneId: assignedZoneId,
              zoneName: zones.find((z) => z.id === assignedZoneId)?.name,
              startTime: shift.startTime,
              endTime: shift.endTime,
            });
          });
        } else if (shift.staffName || shift.staffId) {
          const skillName = shift.skillName || 'Nhân viên';
          const semanticZone = resolveSemanticZone(skillName, zones, usedCounts);
          const assignedZoneId = shift.zoneId || semanticZone?.id || zones[0]?.id;
          list.push({
            id: shift.staffId || shift.id,
            staffId: shift.staffId,
            staffName: shift.staffName,
            skillName: skillName,
            zoneId: assignedZoneId,
            zoneName: zones.find((z) => z.id === assignedZoneId)?.name,
            startTime: shift.startTime,
            endTime: shift.endTime,
          });
        }
      }
    });

    return list.length > 0 ? list : (staff.length > 0 ? staff : []);
  }, [allDateShifts, currentTimeMinutes, staff, employees, skills, zones]);

  // Active workforce to render (Real Temporal vs What-If Simulated)
  const displayStaff = useMemo(() => {
    if (isSimulating) {
      return simViewMode === 'before'
        ? (productionSnapshot.staff || [])
        : (storeSimulatedStaff || []);
    }
    return temporalStaff;
  }, [isSimulating, simViewMode, productionSnapshot.staff, storeSimulatedStaff, temporalStaff]);

  // Real-time Operational Impact Comparison
  const simulationImpact = useMemo(() => {
    if (!isSimulating) return null;
    return compareSimulationImpact(
      productionSnapshot.staff || [],
      storeSimulatedStaff || [],
      zones,
      skills
    );
  }, [isSimulating, productionSnapshot.staff, storeSimulatedStaff, zones, skills]);

  // Auto-playback loop for temporal timeline
  useEffect(() => {
    if (!isPlayingTimeline) return;
    const interval = setInterval(() => {
      setCurrentTimeMinutes((prev) => {
        const next = prev + 5 * timelineSpeed;
        if (next > 1380) return 360; // Loop back to 06:00
        return next;
      });
    }, 400);
    return () => clearInterval(interval);
  }, [isPlayingTimeline, timelineSpeed]);

  // ── Camera Preset Handlers ──
  const handleOverviewCamera = useCallback(() => {
    if (!cameraControllerRef.current) return;
    cameraControllerRef.current.stopFollowing();
    setFollowingStaff(null);
    const cfg = getOverviewCameraConfig(layout);
    cameraControllerRef.current.flyTo(cfg.position, cfg.target);
    setCameraMode(CAMERA_MODES.OVERVIEW);
  }, [layout]);

  const handleTopDownCamera = useCallback(() => {
    if (!cameraControllerRef.current) return;
    cameraControllerRef.current.stopFollowing();
    setFollowingStaff(null);
    const cfg = getTopDownCameraConfig(layout);
    cameraControllerRef.current.flyTo(cfg.position, cfg.target);
    setCameraMode(CAMERA_MODES.TOP_DOWN);
  }, [layout]);

  const handleResetCamera = useCallback(() => {
    handleOverviewCamera();
    setSelectedZone(null);
    setSelectedStaff(null);
  }, [handleOverviewCamera]);

  const handleFocusZone = useCallback((zone) => {
    if (!cameraControllerRef.current || !zone) return;
    cameraControllerRef.current.stopFollowing();
    setFollowingStaff(null);
    const [tx, ty, tz] = toThreeCoords(zone.x, zone.y, zone.z, layout);
    const cfg = getZoneFocusCameraConfig([tx, ty, tz]);
    cameraControllerRef.current.flyTo(cfg.position, cfg.target);
    setCameraMode(CAMERA_MODES.FOCUS_ZONE);
    setSelectedZone(zone);
    setIsDrawerOpen(true);
  }, [layout]);

  const handleFocusStaff = useCallback((emp) => {
    if (!cameraControllerRef.current || !emp) return;
    cameraControllerRef.current.stopFollowing();
    setFollowingStaff(null);
    const zone = zones.find((z) => z.id === (emp.zoneId || emp.zone?.id)) || zones[0];
    const [tx, ty, tz] = toThreeCoords(zone?.x || 0, zone?.y || 0, zone?.z || 0, layout);
    const cfg = getEmployeeFocusCameraConfig([tx, ty, tz]);
    cameraControllerRef.current.flyTo(cfg.position, cfg.target);
    setCameraMode(CAMERA_MODES.FOCUS_EMPLOYEE);
    setSelectedStaff(emp);
    if (zone) setSelectedZone(zone);
    setIsDrawerOpen(true);
  }, [zones, layout]);

  // Follow Employee in real-time
  const handleFollowStaff = useCallback((emp) => {
    if (!cameraControllerRef.current || !emp) return;
    const avatar = avatarMeshesRef.current.find(
      (a) => a.userData?.employee?.id === emp.id || a.userData?.employee?.staffId === emp.staffId
    );
    if (avatar) {
      cameraControllerRef.current.followObject(avatar, new THREE.Vector3(0, 2.4, 3.2));
      setFollowingStaff(emp);
      setSelectedStaff(emp);
      setCameraMode(CAMERA_MODES.FOLLOW_EMPLOYEE);
    }
  }, []);

  const handleStopFollowStaff = useCallback(() => {
    if (cameraControllerRef.current) {
      cameraControllerRef.current.stopFollowing();
    }
    setFollowingStaff(null);
    setCameraMode(CAMERA_MODES.OVERVIEW);
  }, []);

  // Calculate Attention Center alerts & KPI metrics
  const {
    understaffedZones,
    understaffedZonesCount,
    coveragePercent,
    openShiftsCount,
    totalShiftRequired,
    totalPhysicalCapacity,
  } = useMemo(() => {
    let underCount = 0;
    const underZones = [];
    const zStaffMap = {};
    displayStaff.forEach((s) => {
      const zid = s.zoneId || s.zone?.id;
      if (zid) {
        zStaffMap[zid] = (zStaffMap[zid] || 0) + 1;
      }
    });

    const totalCap = zones.reduce((sum, z) => sum + (z.capacity || 4), 0);
    const zoneReqMap = getZoneShiftRequirements(zones, currentShift, skills);
    const totalReq = Object.values(zoneReqMap).reduce((a, b) => a + b, 0);

    zones.forEach((z) => {
      const target = zoneReqMap[z.id] !== undefined ? zoneReqMap[z.id] : Math.ceil((z.capacity || 4) * 0.5);
      const count = zStaffMap[z.id] || 0;
      if (target > 0 && count < target) {
        underCount++;
        underZones.push(z);
      }
    });

    const targetBase = totalReq > 0 ? totalReq : totalCap;
    const cov = targetBase > 0
      ? Math.min(100, Math.round((displayStaff.length / targetBase) * 100))
      : 100;

    let openShifts = 0;
    allDateShifts.forEach((s) => {
      const assigns = Array.isArray(s.shiftAssignments) ? s.shiftAssignments.length : (s.staffId ? 1 : 0);
      const req = s.requiredStaff || s.requiredStaffCount || (Array.isArray(s.skillRequirements) ? s.skillRequirements.reduce((sum, r) => sum + (r.requiredCount || r.requiredStaff || r.minQuantity || 1), 0) : 1);
      if (assigns < req) openShifts += (req - assigns);
    });

    return {
      understaffedZones: underZones,
      understaffedZonesCount: underCount,
      coveragePercent: cov,
      openShiftsCount: openShifts,
      totalShiftRequired: totalReq > 0 ? totalReq : totalCap,
      totalPhysicalCapacity: totalCap,
    };
  }, [zones, displayStaff, allDateShifts, currentShift, skills]);

  const attentionCount = understaffedZonesCount + (openShiftsCount > 0 ? 1 : 0);

  const handleOpenAttentionCenter = useCallback(() => {
    setSelectedZone(null);
    setSelectedStaff(null);
    setIsDrawerOpen(true);
  }, []);

  const handleFocusUnderstaffedZone = useCallback(() => {
    if (understaffedZones.length > 0) {
      handleFocusZone(understaffedZones[0]);
    } else {
      handleOpenAttentionCenter();
    }
  }, [understaffedZones, handleFocusZone, handleOpenAttentionCenter]);

  // X-Ray Mode toggle
  const handleToggleXRay = useCallback(() => {
    setIsXRayMode((prev) => {
      const next = !prev;
      if (envGroupRef.current) {
        setEnvironmentXRayMode(envGroupRef.current, next);
      }
      return next;
    });
  }, []);

  // Layer toggle
  const handleToggleLayer = useCallback((layerKey) => {
    setLayers((prev) => {
      const next = { ...prev, [layerKey]: !prev[layerKey] };
      if (envGroupRef.current) {
        setEnvironmentLayersVisibility(envGroupRef.current, next);
      }
      return next;
    });
  }, []);


  // ── Mode 2 Exploration Handlers ──
  const handleExitExplore = useCallback(() => {
    if (playerControllerRef.current) {
      playerControllerRef.current.detach();
      playerControllerRef.current = null;
    }

    if (playerAvatarRef.current && sceneRef.current) {
      sceneRef.current.remove(playerAvatarRef.current.group);
      playerAvatarRef.current = null;
    }

    if (controlsRef.current) {
      controlsRef.current.enabled = true;
      handleOverviewCamera();
    }

    isExploreModeRef.current = false;
    setIsExploreMode(false);
    setNearbyEntity(null);
  }, [handleOverviewCamera]);

  const handleEnterExplore = useCallback(() => {
    if (!sceneRef.current || !cameraRef.current || !rendererRef.current) return;

    if (controlsRef.current) {
      savedOverviewCameraRef.current = {
        position: cameraRef.current.position.clone(),
        target: controlsRef.current.target.clone(),
      };
      controlsRef.current.enabled = false;
    }

    if (!playerAvatarRef.current) {
      const avatar = createPlayerAvatar();
      sceneRef.current.add(avatar.group);
      playerAvatarRef.current = avatar;
    }

    const storeWid = Number(layout?.width) || 16.0;
    const startZ = storeWid * 0.36;
    playerAvatarRef.current.group.position.set(0, 0, startZ);

    const controller = new PlayerController(
      rendererRef.current.domElement,
      cameraRef.current,
      playerAvatarRef.current,
      layout
    );
    controller.position.set(0, 0, startZ);
    controller.yaw = 0;
    controller.pitch = 0.14;
    controller.rebuildObstacles(layout, zonesRef.current, toThreeCoords);

    controller.onToggleView = (mode) => setPlayerViewMode(mode);
    controller.onExit = () => handleExitExplore();
    controller.onInteract = (entity) => {
      if (entity.type === 'staff') {
        setSelectedStaff(entity.item);
        setSelectedZone(entity.zone);
      } else {
        setSelectedZone(entity.item);
        setSelectedStaff(null);
      }
      setIsDrawerOpen(true);
    };

    playerControllerRef.current = controller;
    window.__playerController = controller;
    window.__handleExitExplore = handleExitExplore;
    isExploreModeRef.current = true;
    setIsExploreMode(true);
    setIsDrawerOpen(false);
    setPlayerYaw(0);
  }, [layout, handleExitExplore]);

  const handleTeleportToZone = useCallback((zone) => {
    if (!playerControllerRef.current || !zone) return;
    const [tx, , tz] = toThreeCoords(zone.x, zone.y, zone.z, layout);
    playerControllerRef.current.teleportTo(tx, tz + 1.4, 0);
    setPlayerPosition({ x: tx, z: tz + 1.4 });
    setPlayerYaw(0);
  }, [layout]);

  const handleTogglePlayerView = useCallback(() => {
    if (!playerControllerRef.current) return;
    const nextMode = playerViewMode === 'third_person' ? 'first_person' : 'third_person';
    playerControllerRef.current.viewMode = nextMode;
    setPlayerViewMode(nextMode);
  }, [playerViewMode]);

  // ── Mode D Simulation Room Handlers & Safe Mode Transitions ──
  const requestModeSwitch = useCallback((targetMode) => {
    // Architectural Rule 41: Exit Warning if unsaved diffs exist
    if (isSimulating && simulatedDiff.length > 0 && targetMode !== 'SIMULATION') {
      setPendingExitTarget(targetMode);
      setIsExitWarningOpen(true);
      return;
    }

    if (isSimulating && targetMode !== 'SIMULATION') {
      exitSimulation();
      dragTransferRef.current?.setEnabled(false);
    }

    if (targetMode === 'OVERVIEW') {
      if (isExploreMode) handleExitExplore();
      setUse2DFallback(false);
      handleOverviewCamera();
    } else if (targetMode === '2D') {
      if (isExploreMode) handleExitExplore();
      setUse2DFallback(true);
    } else if (targetMode === 'EXPLORE') {
      if (use2DFallback) setUse2DFallback(false);
      handleEnterExplore();
    } else if (targetMode === 'SIMULATION') {
      if (isExploreMode) handleExitExplore();
      if (use2DFallback) setUse2DFallback(false);
      enterSimulation({ staff: temporalStaff, zones, shifts: allDateShifts, skills });
    }
  }, [
    isSimulating,
    simulatedDiff.length,
    exitSimulation,
    isExploreMode,
    use2DFallback,
    handleExitExplore,
    handleOverviewCamera,
    handleEnterExplore,
    enterSimulation,
    temporalStaff,
    zones,
    allDateShifts,
    skills,
  ]);

  const handleDiscardAndExit = useCallback(() => {
    exitSimulation();
    setIsExitWarningOpen(false);
    dragTransferRef.current?.setEnabled(false);

    const target = pendingExitTarget || 'OVERVIEW';
    setPendingExitTarget(null);

    if (target === '2D') {
      if (isExploreMode) handleExitExplore();
      setUse2DFallback(true);
    } else if (target === 'EXPLORE') {
      if (use2DFallback) setUse2DFallback(false);
      handleEnterExplore();
    } else {
      if (isExploreMode) handleExitExplore();
      setUse2DFallback(false);
      handleOverviewCamera();
    }
  }, [exitSimulation, pendingExitTarget, isExploreMode, use2DFallback, handleExitExplore, handleEnterExplore, handleOverviewCamera]);

  const handleStayInSimulation = useCallback(() => {
    setIsExitWarningOpen(false);
    setPendingExitTarget(null);
  }, []);

  const handleToggleSimulationMode = useCallback(() => {
    if (isSimulating) {
      requestModeSwitch('OVERVIEW');
    } else {
      requestModeSwitch('SIMULATION');
    }
  }, [isSimulating, requestModeSwitch]);

  const handleSimulateRemoveStaff = useCallback((staffId) => {
    removeSimulatedStaff(staffId);
    if (selectedStaff && (selectedStaff.id || selectedStaff.staffId) === staffId) {
      setSelectedStaff(null);
    }
  }, [removeSimulatedStaff, selectedStaff]);

  const handleSimulateMoveStaff = useCallback((staffId, targetZoneId) => {
    const targetZone = zones.find((z) => z.id === targetZoneId);
    if (targetZone) {
      transferStaff(staffId, targetZone);
    }
  }, [zones, transferStaff]);

  const handleSimulateSwapStaff = useCallback((staffAId, staffBId) => {
    swapStaff(staffAId, staffBId);
  }, [swapStaff]);

  const handleSimulateAddStaff = useCallback((employee, targetZoneId) => {
    const targetZone = zones.find((z) => z.id === targetZoneId);
    if (targetZone) {
      addSimulatedStaff(employee, targetZone);
    }
  }, [zones, addSimulatedStaff]);

  const [assigningStaffId, setAssigningStaffId] = useState(null);

  const handleAssignCandidate = useCallback(async (candidate, zone) => {
    if (!zone || !candidate) return;

    if (isSimulating) {
      if (candidate.isCurrentlyAssigned) {
        handleSimulateMoveStaff(candidate.id, zone.id);
      } else {
        handleSimulateAddStaff(candidate.employee || candidate, zone.id);
      }
      return;
    }

    // Real-time assignment via API
    const shiftId = currentShift?.id;
    const activeStoreId = selectedStoreId || storeId;
    if (!shiftId || !activeStoreId) {
      toast.warning('Vui lòng chọn ca làm việc để thực hiện phân công nhân sự.');
      return;
    }

    // If candidate is outside registered availability and not currently in this shift, prompt confirmation
    let forceOverride = false;
    if (!candidate.isCurrentlyAssigned && !candidate.hasAvailabilityMatch) {
      const shiftTimeDesc = currentShift.startTime && currentShift.endTime ? ` (${currentShift.startTime} - ${currentShift.endTime})` : '';
      const confirmAssign = window.confirm(
        `Nhân sự ${candidate.name} chưa đăng ký lịch rảnh vào khung giờ này${shiftTimeDesc}.\n\nBạn có chắc chắn muốn chỉ định bổ sung vào ca làm việc này không?`
      );
      if (!confirmAssign) return;
      forceOverride = true;
    }

    try {
      setAssigningStaffId(candidate.id);
      await assignStaffToShift(activeStoreId, shiftId, candidate.id, zone.id, forceOverride);
      if (onApplyComplete) {
        await onApplyComplete();
      }
    } catch (err) {
      console.error('Failed to assign staff:', err);
      const rawMsg = err.response?.data?.message || err.message || '';
      let friendlyMsg = 'Lỗi khi gán nhân sự vào ca trực.';
      if (rawMsg.includes('outside registered availability')) {
        friendlyMsg = `Nhân sự ${candidate.name} chưa đăng ký lịch rảnh cho khung giờ ca trực này.`;
      } else if (rawMsg.includes('already assigned')) {
        friendlyMsg = `Nhân sự ${candidate.name} đã được phân công trong ca này.`;
      } else if (rawMsg.includes('blackout date')) {
        friendlyMsg = `Nhân sự ${candidate.name} có ngày nghỉ phép trùng với ngày của ca trực.`;
      } else if (rawMsg.includes('LOCKED/PAID')) {
        friendlyMsg = 'Kỳ công/lương của ngày này đã bị khóa, không thể phân công thêm.';
      } else if (rawMsg) {
        friendlyMsg = rawMsg;
      }
      toast.error(friendlyMsg);
    } finally {
      setAssigningStaffId(null);
    }
  }, [isSimulating, currentShift, selectedStoreId, storeId, handleSimulateMoveStaff, handleSimulateAddStaff, onApplyComplete]);

  const handleRunAutoScheduleSimulation = useCallback(() => {
    const allocated = generateSimulationAutoSchedule(zones, storeSimulatedStaff, skills);
    applyAutoScheduleSimulation(allocated, 'Tự động xếp ca AI (Tối ưu độ phủ)');
  }, [zones, storeSimulatedStaff, skills, applyAutoScheduleSimulation]);

  const handleApplySimulation = useCallback(async () => {
    setIsApplying(true);
    try {
      if (storeId && currentShift?.id) {
        for (const diff of simulatedDiff) {
          if (diff.type === 'ASSIGN' && diff.staffId) {
            try {
              await assignStaffToShift(storeId, currentShift.id, diff.staffId);
            } catch (e) {
              console.warn('Assign API:', e.message);
            }
          } else if (diff.type === 'REMOVE' && diff.staffId) {
            try {
              await removeStaffFromShift(storeId, currentShift.id, diff.staffId);
            } catch (e) {
              console.warn('Remove API:', e.message);
            }
          } else if (diff.type === 'TRANSFER' && diff.staffId) {
            try {
              await assignStaffToShift(storeId, currentShift.id, diff.staffId);
            } catch (e) {
              console.warn('Transfer API:', e.message);
            }
          }
        }
      }
      onApplyComplete?.();
      setIsApplyModalOpen(false);
      exitSimulation();
      dragTransferRef.current?.setEnabled(false);
    } catch (err) {
      console.error('Failed to apply simulation changes:', err);
    } finally {
      setIsApplying(false);
    }
  }, [storeId, currentShift, simulatedDiff, onApplyComplete, exitSimulation]);

  /* ── 2. Master Three.js Lifecycle ── */
  useEffect(() => {
    const container = mountRef.current;
    if (!container || use2DFallback) return;

    const width = container.clientWidth || 900;
    const height = container.clientHeight || 600;

    // 2.1 Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#F1F5F9');
    sceneRef.current = scene;

    // 2.2 Camera
    const camera = new THREE.PerspectiveCamera(36, width / height, 0.5, 200);
    const initCam = getOverviewCameraConfig(layout);
    camera.position.set(...initCam.position);
    cameraRef.current = camera;

    // 2.3 WebGLRenderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    container.appendChild(renderer.domElement);

    // 2.4 OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minPolarAngle = 0.1;
    controls.maxPolarAngle = 1.48; // Prevent flipping below floor
    controls.minDistance = 1.0; // Unconstrained closeup zoom
    controls.maxDistance = 80;
    controls.target.set(...initCam.target);
    controlsRef.current = controls;

    // Disengage follow mode if user begins manual orbit drag
    controls.addEventListener('start', () => {
      if (cameraControllerRef.current?.isFollowing) {
        cameraControllerRef.current.stopFollowing();
        setFollowingStaff(null);
      }
    });

    // 2.5 Camera Controller
    const cameraController = new CameraController(camera, controls);
    cameraControllerRef.current = cameraController;

    // 2.5b 3D Drag & Drop Transfer Controller (Mode D Simulation)
    const dragTransfer = new DragTransfer({
      domElement: renderer.domElement,
      camera,
      scene,
      controls,
      layout,
      toThreeCoords,
      onTransferComplete: (emp, targetZone) => {
        useSimulationStore.getState().transferStaff(emp.id || emp.staffId, targetZone);
      },
      onValidationChange: (check, nearestZone) => {
        setDragValidationState(check);
        setDragTargetZone(nearestZone);
      },
      onDragStateChange: (isDragging) => {
        if (!isDragging) {
          setDragValidationState(null);
          setDragTargetZone(null);
        }
      },
    });
    dragTransferRef.current = dragTransfer;

    window.__three = { scene, camera, renderer, controls, cameraController, dragTransfer };

    // 2.6 Stylized Lighting Setup
    const hemiLight = new THREE.HemisphereLight(0xE0F2FE, 0xFEF3C7, 0.85);
    scene.add(hemiLight);

    const storeLen = Number(layout?.length) || 24.0;
    const storeWid = Number(layout?.width) || 16.0;
    const storeH = Number(layout?.height) || 6.0;

    const dirLight = new THREE.DirectionalLight(0xFFFBEB, 1.25);
    dirLight.position.set(storeLen * 0.75, storeH * 2.6, storeWid * 0.85);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 1;
    dirLight.shadow.camera.far = 120;
    dirLight.shadow.bias = -0.0004;

    const frustumSize = Math.max(storeLen, storeWid) * 1.1;
    dirLight.shadow.camera.left = -frustumSize;
    dirLight.shadow.camera.right = frustumSize;
    dirLight.shadow.camera.top = frustumSize;
    dirLight.shadow.camera.bottom = -frustumSize;
    scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0xE2E8F0, 0.4);
    fillLight.position.set(-storeLen * 0.6, storeH * 1.4, -storeWid * 0.6);
    scene.add(fillLight);

    // 2.7 Static Store Environment
    const envGroup = buildStoreEnvironment(layout, layers.showWalls);
    envGroupRef.current = envGroup;
    scene.add(envGroup);

    // Apply initial layer visibilities & X-Ray
    setEnvironmentLayersVisibility(envGroup, layers);
    setEnvironmentXRayMode(envGroup, isXRayMode);

    // 2.8 Dynamic Entity Group
    const dynamicGroup = new THREE.Group();
    scene.add(dynamicGroup);
    dynamicGroupRef.current = dynamicGroup;

    // 2.9 Steam Particles Group
    const steamGroup = new THREE.Group();
    steamGroup.name = 'steamGroup';
    steamGroup.position.set(-storeLen * 0.22, 1.8, -storeWid * 0.18);
    const steamParticles = [];
    const steamMat = new THREE.MeshBasicMaterial({
      color: 0xFFFFFF,
      transparent: true,
      opacity: 0.28,
    });
    const steamGeo = new THREE.SphereGeometry(0.04, 8, 8);

    for (let i = 0; i < 6; i++) {
      const p = new THREE.Mesh(steamGeo, steamMat);
      p.position.set(
        (Math.random() - 0.5) * 0.2,
        Math.random() * 0.6,
        (Math.random() - 0.5) * 0.2
      );
      p.userData = { speed: 0.003 + Math.random() * 0.004, startY: 0, seed: i * 2 };
      steamGroup.add(p);
      steamParticles.push(p);
    }
    scene.add(steamGroup);

    // 2.10 Resize Observer
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: w, height: h } = entry.contentRect;
        if (w > 0 && h > 0) {
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
        }
      }
    });
    ro.observe(container);

    // 2.11 Raycasting Click Detection
    let startX = 0;
    let startY = 0;
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onPointerDown = (e) => {
      startX = e.clientX;
      startY = e.clientY;
    };

    const onPointerUp = (e) => {
      if (isExploreModeRef.current) return;
      if (dragTransferRef.current?.isDragging) return;
      const dist = Math.hypot(e.clientX - startX, e.clientY - startY);
      if (dist > 6) return;

      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(dynamicGroup.children, true);

      if (hits.length > 0) {
        let target = hits[0].object;
        while (target && !target.userData?.isZone && !target.userData?.isPerson && target.parent) {
          target = target.parent;
        }

        if (target?.userData?.isPerson) {
          setSelectedStaff(target.userData.employee);
          if (target.userData.zone) setSelectedZone(target.userData.zone);
          setIsDrawerOpen(true);
        } else if (target?.userData?.isZone) {
          setSelectedZone(target.userData.zone);
          setSelectedStaff(null);
          setIsDrawerOpen(true);
        }
      } else {
        setSelectedZone(null);
        setSelectedStaff(null);
      }
    };

    const dom = renderer.domElement;
    dom.addEventListener('pointerdown', onPointerDown);
    dom.addEventListener('pointerup', onPointerUp);

    // 2.12 Master RAF Animation Loop
    let animId;
    let clock = new THREE.Clock();
    let frameCount = 0;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const delta = Math.min(clock.getDelta(), 0.08);
      const elapsedTime = clock.getElapsedTime();

      // Exploration Mode vs Camera Controller
      if (isExploreModeRef.current && playerControllerRef.current) {
        playerControllerRef.current.update(
          delta,
          elapsedTime,
          zonesRef.current,
          staffRef.current,
          toThreeCoords
        );

        frameCount++;
        if (frameCount % 3 === 0) {
          setPlayerPosition({
            x: playerControllerRef.current.position.x,
            z: playerControllerRef.current.position.z,
          });
          setPlayerYaw(playerControllerRef.current.yaw);
          setNearbyEntity(playerControllerRef.current.nearbyEntity);
        }
      } else {
        cameraController.update();
      }

      // Update avatar state machine (Working, Walking transitions, Idle breathing, Dynamic LOD)
      avatarMeshesRef.current.forEach((avatar) => {
        updateAvatarStateMachine(avatar, delta, elapsedTime, camera);
      });

      // Subtle steam rising
      steamParticles.forEach((sp) => {
        sp.position.y += sp.userData.speed;
        sp.position.x += Math.sin(elapsedTime * 2.0 + sp.userData.seed) * 0.001;
        sp.scale.setScalar(1.0 + sp.position.y * 1.5);
        if (sp.position.y > 0.75) {
          sp.position.y = 0;
          sp.scale.setScalar(1.0);
        }
      });

      // Micro-swaying pendant lamps
      scene.traverse((obj) => {
        if (obj.name === 'pendantLamp') {
          obj.rotation.z = Math.sin(elapsedTime * 1.4) * 0.018;
          obj.rotation.x = Math.cos(elapsedTime * 1.1) * 0.012;
        }
      });

      renderer.render(scene, camera);
    };
    animate();

    // 2.13 Cleanup
    return () => {
      cancelAnimationFrame(animId);
      dom.removeEventListener('pointerdown', onPointerDown);
      dom.removeEventListener('pointerup', onPointerUp);
      ro.disconnect();
      if (playerControllerRef.current) {
        playerControllerRef.current.detach();
      }
      if (dragTransferRef.current) {
        dragTransferRef.current.detach();
        dragTransferRef.current = null;
      }
      if (dom.parentNode) dom.parentNode.removeChild(dom);
      controls.dispose();
      renderer.dispose();
      delete window.__three;
      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
          else obj.material.dispose();
        }
      });
    };
  }, [use2DFallback, layout?.length, layout?.width, layout?.height]);

  /* ── 3. Dynamic Entities Rendering & Smooth Walking Reallocation ── */
  useEffect(() => {
    const dynamicGroup = dynamicGroupRef.current;
    if (!dynamicGroup) return;

    // Clear previous non-avatar entities
    const toRemove = [];
    dynamicGroup.children.forEach((c) => {
      if (!c.userData?.isPerson) {
        toRemove.push(c);
      }
    });
    toRemove.forEach((c) => dynamicGroup.remove(c));

    const storeLen = Number(layout?.length) || 24.0;
    const storeWid = Number(layout?.width) || 16.0;
    const zoneSizeX = Math.min(4.4, storeLen * 0.22);
    const zoneSizeZ = Math.min(3.6, storeWid * 0.22);

    // Group active staff by zone
    const staffByZone = {};
    displayStaff.forEach((s) => {
      const zid = s.zoneId || s.zone?.id;
      if (zid) {
        if (!staffByZone[zid]) staffByZone[zid] = [];
        staffByZone[zid].push(s);
      }
    });

    // 3.1 Render Zones & Furniture
    if (layers.showZones) {
      zones.forEach((zone) => {
        const [tx, ty, tz] = toThreeCoords(zone.x, zone.y, zone.z, layout);
        const zoneStaff = staffByZone[zone.id] || [];
                const isSelected = selectedZone?.id === zone.id;
        const isSkillMatched = activeSkillFilter !== 'ALL' && (
          (zone.name || '').toLowerCase().includes(activeSkillFilter.toLowerCase()) ||
          (zone.requiredSkill && (zone.requiredSkill || '').toLowerCase().includes(activeSkillFilter.toLowerCase()))
        );

        const decal = buildZoneDecal({
          zone,
          tx,
          ty,
          tz,
          sizeX: zoneSizeX,
          sizeZ: zoneSizeZ,
          assignedCount: zoneStaff.length,
          isSelected,
          heatmapMode,
          requiredStaff: zone.requiredStaff || null,
          isSkillMatched,
        });
        dynamicGroup.add(decal);

        if (layers.showFurniture) {
          const furniture = buildZoneFurniture(zone.name, zoneSizeX);
          furniture.position.set(tx, ty, tz);
          dynamicGroup.add(furniture);
        }

        const sprite = createZoneTagSprite(
          zone,
          zoneStaff.length,
          zone.capacity || 4,
          isSelected,
          heatmapMode,
          zone.requiredStaff || null,
          isSkillMatched
        );
        sprite.position.set(tx, ty + 2.15, tz);
        dynamicGroup.add(sprite);
      });
    }

    
      // 3.1b Optional Geofence Boundary Layer
      if (layers.showGeofence) {
        const storeLen = Number(layout?.length) || 24.0;
        const storeWid = Number(layout?.width) || 16.0;
        const fenceRadius = Math.max(storeLen, storeWid) * 0.72;
        const fenceGeo = new THREE.RingGeometry(fenceRadius - 0.18, fenceRadius + 0.18, 64);
        fenceGeo.rotateX(-Math.PI / 2);
        const fenceMat = new THREE.MeshBasicMaterial({
          color: 0x0284C7,
          transparent: true,
          opacity: 0.7,
          side: THREE.DoubleSide,
        });
        const fenceMesh = new THREE.Mesh(fenceGeo, fenceMat);
        fenceMesh.position.set(0, 0.04, 0);
        dynamicGroup.add(fenceMesh);

        // Geofence label sprite
        const fenceCanvas = document.createElement('canvas');
        fenceCanvas.width = 384;
        fenceCanvas.height = 76;
        const fctx = fenceCanvas.getContext('2d');
        fctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        fctx.beginPath();
        fctx.roundRect(4, 4, 376, 68, 16);
        fctx.fill();
        fctx.strokeStyle = '#0284C7';
        fctx.lineWidth = 4;
        fctx.stroke();
        fctx.font = 'bold 22px "Segoe UI", sans-serif';
        fctx.fillStyle = '#38BDF8';
        fctx.textAlign = 'center';
        fctx.textBaseline = 'middle';
        fctx.fillText('🌐 Bán Kính Chấm Công Geofence (150m)', 192, 38);

        const fenceTex = new THREE.CanvasTexture(fenceCanvas);
        const fenceSpriteMat = new THREE.SpriteMaterial({ map: fenceTex, transparent: true });
        const fenceSprite = new THREE.Sprite(fenceSpriteMat);
        fenceSprite.scale.set(3.2, 0.65, 1);
        fenceSprite.position.set(0, 1.2, -fenceRadius);
        dynamicGroup.add(fenceSprite);
      }

    // 3.2 Dynamic Avatar Reallocation with Walking State Machine
    if (layers.showStaff) {
      const activeEmpIds = new Set(displayStaff.map((s) => s.id || s.staffId));

      // Remove meshes for employees who are no longer active
      const survivingAvatars = [];
      avatarMeshesRef.current.forEach((avatar) => {
        const empId = avatar.userData?.employee?.id || avatar.userData?.employee?.staffId;
        if (!activeEmpIds.has(empId)) {
          dynamicGroup.remove(avatar);
        } else {
          survivingAvatars.push(avatar);
        }
      });
      avatarMeshesRef.current = survivingAvatars;

      // Update or create avatars
      zones.forEach((zone) => {
        const [tx, ty, tz] = toThreeCoords(zone.x, zone.y, zone.z, layout);
        const zoneStaff = staffByZone[zone.id] || [];

        zoneStaff.forEach((emp, sIdx) => {
          const [ox, oz] = getDeterministicPersonOffset(
            zone.id,
            sIdx,
            zoneStaff.length,
            zoneSizeX,
            zoneSizeZ
          );
          const targetX = tx + ox;
          const targetY = ty;
          const targetZ = tz + oz;

          const isSelected = selectedStaff?.id === emp.id || selectedStaff?.staffId === emp.staffId;

          // Find existing avatar
          const existingAvatar = avatarMeshesRef.current.find(
            (a) => (a.userData?.employee?.id || a.userData?.employee?.staffId) === (emp.id || emp.staffId)
          );

          if (existingAvatar) {
            // Update selection state and initiate smooth walking transition if position changed
            setAvatarSelected(existingAvatar, isSelected);
            setAvatarTargetPosition(existingAvatar, targetX, targetY, targetZ, zone);
            existingAvatar.userData.employee = emp;
          } else {
            // Brand new avatar appearing in this shift
            const avatar = createStylizedAvatar({
              employee: emp,
              zone,
              x: targetX,
              y: targetY,
              z: targetZ,
              isSelected,
              seed: sIdx * 15 + (zone.x || 1),
            });

            dynamicGroup.add(avatar);
            avatarMeshesRef.current.push(avatar);
          }
        });
      });
    } else {
      // Staff layer disabled
      avatarMeshesRef.current.forEach((a) => dynamicGroup.remove(a));
      avatarMeshesRef.current = [];
    }

    // Keep DragTransfer controller synced with latest avatar meshes and staff distribution
    if (dragTransferRef.current) {
      dragTransferRef.current.updateContext({
        avatarMeshes: avatarMeshesRef.current,
        zones,
        simulatedStaff: displayStaff,
      });
    }
  }, [
    zones,
    displayStaff,
    layout,
    layers.showZones,
    layers.showStaff,
    layers.showFurniture,
    selectedZone,
    selectedStaff,
    heatmapMode,
    activeSkillFilter,
    layers.showGeofence,
  ]);

  // Enable or disable 3D Drag-and-Drop depending on Simulation Room active state and view mode
  useEffect(() => {
    if (dragTransferRef.current) {
      const active = isSimulating && simViewMode === 'after';
      dragTransferRef.current.setEnabled(active);
    }
  }, [isSimulating, simViewMode]);

  // 2D Fallback view (Mode B: Mặt bằng)
  if (use2DFallback) {
    return (
      <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: 560 }}>
        <SpatialToolbar
          storeName={storeName}
          layout={layout}
          zonesCount={zones.length}
          staffCount={displayStaff.length}
          currentMode="2D"
          onResetCamera={handleResetCamera}
          onTopDownCamera={handleTopDownCamera}
          onIsometricCamera={handleOverviewCamera}
          onOverviewCamera={() => requestModeSwitch('OVERVIEW')}
          onToggle2D={() => requestModeSwitch('2D')}
          is2DView={true}
          onEnterExplore={() => requestModeSwitch('EXPLORE')}
          isExploreMode={false}
          isSimulating={isSimulating}
          simulationDiffCount={simulatedDiff.length}
          onToggleSimulation={handleToggleSimulationMode}
          isFollowingEmployee={false}
          onStopFollowEmployee={handleStopFollowStaff}
          followingStaffName=""
          isXRayMode={isXRayMode}
          onToggleXRay={handleToggleXRay}
          layers={layers}
          onToggleLayer={handleToggleLayer}
          heatmapMode={heatmapMode}
          onChangeHeatmapMode={setHeatmapMode}
          isDrawerOpen={isDrawerOpen}
          onToggleDrawer={() => setIsDrawerOpen(!isDrawerOpen)}
        />
        <TwoDSpatialSchematic
          layout={layout}
          zones={zones}
          staff={displayStaff}
          selectedZone={selectedZone}
          onSelectZone={setSelectedZone}
          showWorkstations={layers.showFurniture}
        />
        <button
          type="button"
          onClick={() => requestModeSwitch('OVERVIEW')}
          style={{
            position: 'absolute',
            bottom: 18,
            right: 18,
            padding: '9px 18px',
            borderRadius: 10,
            border: 'none',
            backgroundColor: '#0F172A',
            color: '#FFFFFF',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(0,0,0,0.2)',
            zIndex: 30,
          }}
        >
          🌐 Trở lại Không gian 3D
        </button>

        {/* Exit Warning Modal in 2D mode */}
        <ExitWarningModal
          isOpen={isExitWarningOpen}
          diffCount={simulatedDiff.length}
          onStay={handleStayInSimulation}
          onDiscardAndExit={handleDiscardAndExit}
        />
      </div>
    );
  }

  return (
    <div
      id="spatial-workspace-container"
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: 680,
        backgroundColor: '#0F172A',
        borderRadius: 16,
        overflow: 'hidden',
        border: isSimulating ? '1.5px solid #F59E0B' : '1px solid #1E293B',
        boxShadow: isSimulating ? '0 8px 32px rgba(245, 158, 11, 0.12)' : '0 6px 24px rgba(15, 23, 42, 0.06)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* 1. Global Command Header */}
      <CommandHeader
        storeName={storeName}
        stores={stores}
        selectedStoreId={selectedStoreId || storeId}
        onSelectStore={onSelectStore}
        activeDate={activeDate}
        currentShift={currentShift}
        allDateShifts={allDateShifts}
        onSelectShift={onSelectShift}
        attentionCount={attentionCount}
        onOpenAttentionCenter={handleOpenAttentionCenter}
        isSimulating={isSimulating}
        onToggleSimulation={handleToggleSimulationMode}
        onOpenAutoSchedule={onOpenAutoSchedule}
        onPublishSchedule={onPublishSchedule}
        isDrawerOpen={isDrawerOpen}
        onToggleDrawer={() => setIsDrawerOpen(!isDrawerOpen)}
      />

      {/* 2. Secondary Staffing KPI Ribbon */}
      <StaffingKpiBar
        coveragePercent={coveragePercent}
        activeStaffCount={displayStaff.length}
        requiredStaffCount={totalShiftRequired}
        maxStoreCapacity={totalPhysicalCapacity}
        understaffedZonesCount={understaffedZonesCount}
        openShiftsCount={openShiftsCount}
        isSimulating={isSimulating}
        costDelta={simulationImpact?.delta?.costDelta || 0}
        onOpenAttentionCenter={handleOpenAttentionCenter}
        onFocusUnderstaffedZone={handleFocusUnderstaffedZone}
      />

      {/* 3. Operational Command Canvas Area (Full 3D Viewport) */}
      <div
        style={{
          flex: 1,
          position: 'relative',
          display: 'flex',
          overflow: 'hidden',
          width: '100%',
          minHeight: 700,
        }}
      >
        {/* 3D WebGL Canvas Viewport (Always 100% Full Width) */}
        <div
          style={{
            flex: 1,
            position: 'relative',
            height: '100%',
            overflow: 'hidden',
          }}
        >
          <div
            ref={mountRef}
            style={{
              width: '100%',
              height: '100%',
              position: 'absolute',
              top: 0,
              left: 0,
            }}
          />

      {/* Top Floating Controls: Explore HUD vs Spatial Toolbar */}
      {isExploreMode ? (
        <ExploreHUD
          layout={layout}
          zones={zones}
          staff={displayStaff}
          playerPosition={playerPosition}
          playerYaw={playerYaw}
          nearbyEntity={nearbyEntity}
          viewMode={playerViewMode}
          isDrawerOpen={isDrawerOpen}
          onToggleView={handleTogglePlayerView}
          onTeleportToZone={handleTeleportToZone}
          onInteract={(entity) => {
            if (entity.type === 'staff') {
              setSelectedStaff(entity.item);
              setSelectedZone(entity.zone);
            } else {
              setSelectedZone(entity.item);
              setSelectedStaff(null);
            }
            setIsDrawerOpen(true);
          }}
          onExit={handleExitExplore}
        />
      ) : (
        <>
          <SpatialToolbar
            storeName={storeName}
            layout={layout}
            zonesCount={zones.length}
            staffCount={displayStaff.length}
            currentMode={isSimulating ? 'SIMULATION' : cameraMode}
            onResetCamera={handleResetCamera}
            onTopDownCamera={handleTopDownCamera}
            onIsometricCamera={handleOverviewCamera}
            onOverviewCamera={() => requestModeSwitch('OVERVIEW')}
            onToggle2D={() => requestModeSwitch('2D')}
            is2DView={use2DFallback}
            onEnterExplore={() => requestModeSwitch('EXPLORE')}
            isExploreMode={isExploreMode}
            isSimulating={isSimulating}
            simulationDiffCount={simulatedDiff.length}
            onToggleSimulation={handleToggleSimulationMode}
            isFollowingEmployee={Boolean(followingStaff)}
            onStopFollowEmployee={handleStopFollowStaff}
            followingStaffName={followingStaff?.staffName || ''}
            isXRayMode={isXRayMode}
            onToggleXRay={handleToggleXRay}
            layers={layers}
            onToggleLayer={handleToggleLayer}
            heatmapMode={heatmapMode}
            onChangeHeatmapMode={setHeatmapMode}
            onUndo={undo}
            onRedo={redo}
            canUndo={canUndo()}
            canRedo={canRedo()}
            activeSkillFilter={activeSkillFilter}
            onSelectSkillFilter={setActiveSkillFilter}
            skills={skills}
            isDrawerOpen={isDrawerOpen}
            onToggleDrawer={() => setIsDrawerOpen(!isDrawerOpen)}
          />

          {/* Mode D: Top Simulation Status Banner */}
          {isSimulating && (
            <SimulationBanner
              diffCount={simulatedDiff.length}
              viewMode={simViewMode}
              onToggleViewMode={setSimViewMode}
              onOpenDiffModal={() => setIsDiffModalOpen(true)}
              onOpenApplyModal={() => setIsApplyModalOpen(true)}
              onRunAutoScheduleSim={handleRunAutoScheduleSimulation}
              onResetSimulation={resetCurrentScenario}
              onExitSimulation={() => requestModeSwitch('OVERVIEW')}
              isApplying={isApplying}
            />
          )}

          {/* Mode D: Real-time Operational Impact Panel */}
          {isSimulating && (
            <SimulationImpactPanel
              impact={simulationImpact}
              isDrawerOpen={isDrawerOpen}
            />
          )}
        </>
      )}

      
      {/* Real-time 3D Drag & Drop Validation Floating HUD */}
      {dragValidationState && (
        <div
          id="drag-validation-hud"
          style={{
            position: 'absolute',
            top: 72,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 35,
            padding: '8px 18px',
            borderRadius: 999,
            backgroundColor: dragValidationState.valid ? 'rgba(16, 185, 129, 0.95)' : 'rgba(239, 68, 68, 0.95)',
            color: '#FFFFFF',
            fontSize: 12.5,
            fontWeight: 700,
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.22)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            pointerEvents: 'none',
          }}
        >
          <span>{dragValidationState.valid ? '✅' : '⚠️'}</span>
          <span>{dragValidationState.valid ? dragValidationState.message : dragValidationState.reason}</span>
        </div>
      )}

      {/* Bottom Temporal Timeline Controller */}
      {!isExploreMode && (
        <SpatialTimeline
          allDateShifts={allDateShifts}
          currentTimeMinutes={currentTimeMinutes}
          onTimeChange={setCurrentTimeMinutes}
          isPlaying={isPlayingTimeline}
          onTogglePlay={() => setIsPlayingTimeline(!isPlayingTimeline)}
          playSpeed={timelineSpeed}
          onChangePlaySpeed={setTimelineSpeed}
          activeStaffCount={displayStaff.length}
          activeShift={currentShift}
          onSelectShift={onSelectShift}
          isDrawerOpen={isDrawerOpen}
        />
      )}

      {/* Right Floating SaaS Inspector Drawer */}
      <SpatialInspector
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        selectedZone={selectedZone}
        selectedStaff={selectedStaff}
        onSelectZone={setSelectedZone}
        onSelectStaff={setSelectedStaff}
        onClearSelection={() => {
          setSelectedZone(null);
          setSelectedStaff(null);
        }}
        onFocusZone={handleFocusZone}
        onFocusStaff={handleFocusStaff}
        onFollowStaff={handleFollowStaff}
        isFollowingEmployee={Boolean(followingStaff)}
        zones={zones}
        staff={displayStaff}
        layout={layout}
        storeName={storeName}
        onRunAlgorithm={onRunAlgorithm}
        isAllocating={isAllocating}
        isSimulating={isSimulating}
        onToggleSimulation={handleToggleSimulationMode}
        onSimulateRemoveStaff={handleSimulateRemoveStaff}
        onSimulateMoveStaff={handleSimulateMoveStaff}
        onSimulateSwapStaff={handleSimulateSwapStaff}
        onSimulateLeaveStaff={(staffId) => simulateLeaveAbsence(staffId)}
        onResetSimulation={resetCurrentScenario}
        employees={employees}
        skills={skills}
        currentShift={currentShift}
        onAssignCandidate={handleAssignCandidate}
        isAssigningCandidate={assigningStaffId}
        onSimulateAddStaff={handleSimulateAddStaff}
      />
        </div>
      </div>

      {/* Simulation Room Diff Audit Modal */}
      <SimulationDiffModal
        isOpen={isDiffModalOpen}
        onClose={() => setIsDiffModalOpen(false)}
        diffList={simulatedDiff}
      />

      {/* Two-step Safety Apply Modal (Architectural Rules 37, 38, 39) */}
      <ApplyConfirmModal
        isOpen={isApplyModalOpen}
        onClose={() => setIsApplyModalOpen(false)}
        onConfirmApply={handleApplySimulation}
        diffList={simulatedDiff}
        isApplying={isApplying}
      />

      {/* Unsaved Changes Protection Modal (Architectural Rule 41) */}
      <ExitWarningModal
        isOpen={isExitWarningOpen}
        diffCount={simulatedDiff.length}
        onStay={handleStayInSimulation}
        onDiscardAndExit={handleDiscardAndExit}
      />
    </div>
  );
}
