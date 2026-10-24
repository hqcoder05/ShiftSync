import StoreDesigner from '../store-designer/StoreDesigner.jsx';
import {useStoreDesign} from '../store-designer/useStoreDesign.js';
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

import { getShiftTimeRange, isWithinShift } from './utils/shiftTimeRange.js';
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
import {
  buildZoneFurniture,
  buildWorkstationObject,
  createWorkstationTagSprite,
} from './scene/FurnitureBuilder';
import {
  createStylizedAvatar,
  setAvatarSelected,
  setAvatarTargetPosition,
  updateAvatarStateMachine,
} from './scene/StylizedAvatars';
import { CameraController } from './camera/CameraController';
import { CameraManager } from './camera/CameraManager';
import { toast } from '../../context/ToastContext';
import { useWebSocket } from '../../context/WebSocketContext';
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
import { useSpatialViewStore } from './state/spatialViewStore';
import { useSimulationStore } from './simulation/simulationStore';
import { compareSimulationImpact } from './simulation/SimulationImpactCalculator';
import { generateSimulationAutoSchedule } from './simulation/SimulationAutoScheduler';
import { DragTransfer } from './interaction/DragTransfer';
import SimulationBanner from './components/Simulation/SimulationBanner';
import SimulationImpactPanel from './components/Simulation/SimulationImpactPanel';
import SimulationDiffModal from './components/Simulation/SimulationDiffModal';
import ApplyConfirmModal from './components/Simulation/ApplyConfirmModal';
import ExitWarningModal from './components/Simulation/ExitWarningModal';
import { assignStaffToShift, removeStaffFromShift, swapStaffZones } from '../../services/shiftService';
import { getStoreWorkstations, updateStoreWorkstation } from '../../services/layoutService';
import { getStoreAttendance } from '../../services/attendanceService';
import { getStaffId, getAssignmentId, areSameStaff } from './utils/staffIdentity';
import { resolveWorkstationOccupancies } from './utils/workstationOccupancy';
import { WorkstationDragController } from './interaction/WorkstationDragController';
import WorkstationEditorBanner from './components/WorkstationEditorBanner';

// React DOM Overlays
import CommandHeader from './components/header/CommandHeader';
import StaffingKpiBar from './components/kpi/StaffingKpiBar';
import SpatialToolbar from './components/SpatialToolbar';
import SpatialInspector from './components/SpatialInspector';
import SpatialActionDialog from './components/SpatialActionDialog.jsx';
import { entityIdentity, resolveInfoSelection } from './utils/spatialInfoModel.js';
import SpatialTimeline from './components/SpatialTimeline';
import TwoDSpatialSchematic from '../../components/spatial/TwoDSpatialSchematic';
import { toThreeCoords, getDeterministicPersonOffset, getZoneShiftRequirements } from '../../components/spatial/spatial.constants';

import { ResourceManager, isSharedResource, disposeHierarchy } from './scene/ResourceManager';
import { SceneGraphManager } from './scene/SceneGraphManager';
import { mapWorkstationsToGlb, extractGlbObstacles } from './scene/DigitalTwinModelLoader';
import DigitalTwinCanvas from './components/canvas/DigitalTwinCanvas.jsx';
import { OPERATIONS_EVENT_NAMES, getOperationsEventSummary, isEventForStore } from './utils/operationsRealtime.js';

export default function SpatialWorkspace({
  layout: suppliedLayout = { length: 24, width: 16, height: 6 },
  zones = [],
  staff = [],
  storeName = 'Chi nhánh cửa hàng',
  storeCategory = 'OTHER',
  stores = [],
  selectedStoreId,
  onSelectStore,
  onExitWorkspace,
  onDateChange,
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
  workstations = null,
  onApplyComplete,
  planningMode = false,
  planningTimeMinutes = null,
  onPlanningZoneSelect = null,
}) {
  const {snapshot: designSnapshot, accept: acceptDesign} = useStoreDesign(selectedStoreId || storeId);
  const layout = designSnapshot?.document?.floor || suppliedLayout;
  const [designerOpen, setDesignerOpen] = useState(false);
  const { connected: isRealtimeConnected } = useWebSocket();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [operationsRefreshKey, setOperationsRefreshKey] = useState(0);
  const [operationsLiveState, setOperationsLiveState] = useState({ lastUpdatedAt: null, label: '' });
  const workspaceElement = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  useEffect(() => {
    const sync = () => setIsFullscreen(document.fullscreenElement === workspaceElement.current);
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  }, []);
  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await workspaceElement.current?.requestFullscreen();
    } catch { toast.warning('Trình duyệt chưa cho phép mở toàn màn hình.'); }
  };

  // ARC-IMP-01: Visualization View State (Zustand)
  const {
    cameraMode,
    setCameraMode,
    use2DFallback,
    setUse2DFallback,
    isXRayMode,
    setIsXRayMode,
    layers,
    setLayers,
    heatmapMode,
    setHeatmapMode,
    activeSkillFilter,
    setActiveSkillFilter,
    isExploreMode,
    setIsExploreMode,
    playerViewMode,
    setPlayerViewMode,
    followingStaff,
    setFollowingStaff,
  } = useSpatialViewStore();

  // Selection states
  const [selectedZone, setSelectedZone] = useState(null);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [selectedWorkstation, setSelectedWorkstation] = useState(null);
  const [cameraFocusTarget, setCameraFocusTarget] = useState(null);
  const [initialLockTarget, setInitialLockTarget] = useState(null);

  // Workstation Layout Editor states (Phase 2A)
  const [isEditingLayout, setIsEditingLayout] = useState(false);
  const [draftWorkstationCoords, setDraftWorkstationCoords] = useState(null);
  const [workstationCollision, setWorkstationCollision] = useState(null);
  const [isSavingWorkstation, setIsSavingWorkstation] = useState(false);
  const workstationDragControllerRef = useRef(null);
  const workstationMeshesRef = useRef([]);

  // RBAC permissions: Only ADMIN or MANAGER can reposition workstations
  const userRole = useMemo(() => {
    try {
      const stored = localStorage.getItem('userRole') || '';
      return stored.replace(/^ROLE_/, '').toUpperCase();
    } catch {
      return '';
    }
  }, []);
  const canEditLayout = userRole === 'ADMIN' || userRole === 'MANAGER';

  // Mode 2 Exploration states
  const [nearbyEntity, setNearbyEntity] = useState(null);
  const [reticleTarget, setReticleTarget] = useState(null);
  const [targetLock, setTargetLock] = useState(null);
  const [playerPosition, setPlayerPosition] = useState({ x: 0, z: 0 });
  const [playerYaw, setPlayerYaw] = useState(Math.PI);
  const [isPlayerFlying, setIsPlayerFlying] = useState(false);

  // Real Workstations state & dynamic fetch (W-01)
  const [internalWorkstations, setInternalWorkstations] = useState([]);
  const [isWorkstationsLoading, setIsWorkstationsLoading] = useState(false);
  const [workstationsError, setWorkstationsError] = useState(null);
  const [isGlbLoaded, setIsGlbLoaded] = useState(false);

  const effectiveWorkstations = useMemo(
    () => (Array.isArray(workstations) ? workstations : internalWorkstations),
    [workstations, internalWorkstations]
  );

  const activeStoreId = selectedStoreId || storeId;
  const refreshLiveOperations = useCallback((event) => {
    if (!isEventForStore(event?.detail, activeStoreId)) return;
    const summary = getOperationsEventSummary(event.type, event.detail);
    setOperationsLiveState({ lastUpdatedAt: summary.timestamp, label: summary.label });
    setOperationsRefreshKey((value) => value + 1);
  }, [activeStoreId]);

  useEffect(() => {
    OPERATIONS_EVENT_NAMES.forEach((eventName) => window.addEventListener(eventName, refreshLiveOperations));
    return () => OPERATIONS_EVENT_NAMES.forEach((eventName) => window.removeEventListener(eventName, refreshLiveOperations));
  }, [refreshLiveOperations]);
  useEffect(() => {
    setOperationsLiveState({ lastUpdatedAt: null, label: '' });
    const reconnect = event => {
      if (isEventForStore(event.detail, activeStoreId)) setOperationsRefreshKey(value => value + 1);
    };
    window.addEventListener('store_connection_restored', reconnect);
    return () => window.removeEventListener('store_connection_restored', reconnect);
  }, [activeStoreId]);
  const [physicalLayout,setPhysicalLayout]=useState(null);
  const handlePhysicalLayoutReady=useCallback(viewZones=>{
    setPhysicalLayout(previous=>previous?.storeId===activeStoreId&&JSON.stringify(previous.zones)===JSON.stringify(viewZones)?previous:{storeId:activeStoreId,zones:viewZones});
  },[activeStoreId]);
  const viewZones=physicalLayout?.storeId===activeStoreId?physicalLayout.zones:zones;

  useEffect(() => {
    if (Array.isArray(workstations)) return;
    if (!activeStoreId) {
      setInternalWorkstations([]);
      return;
    }

    let isCurrent = true;
    setInternalWorkstations([]);
    setIsWorkstationsLoading(true);
    setWorkstationsError(null);

    getStoreWorkstations(activeStoreId)
      .then((res) => {
        if (!isCurrent) return;
        if (res?.data && Array.isArray(res.data)) {
          setInternalWorkstations(res.data);
        } else {
          setInternalWorkstations([]);
        }
      })
      .catch((err) => {
        if (!isCurrent) return;
        console.warn('[SpatialWorkspace] Could not load store workstations:', err.message);
        setWorkstationsError(err.message || 'Lỗi tải trạm làm việc');
        setInternalWorkstations([]);
      })
      .finally(() => {
        if (isCurrent) setIsWorkstationsLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [activeStoreId, workstations]);

  // Store Selection Isolation Guard: Reset workstation selection and draft preview when activeStoreId changes (Scenario D & E)
  useEffect(() => {
    setSelectedZone(null);
    setSelectedStaff(null);
    setSelectedWorkstation(null);
    setDraftWorkstationCoords(null);
    setWorkstationCollision(null);
    setCameraFocusTarget(null);
    setCameraMode(CAMERA_MODES.OVERVIEW);
    workstationDragControllerRef.current?.clearSelection();
  }, [activeStoreId, setCameraMode]);

  // A deleted entity must not remain selectable or retain a camera focus target.
  useEffect(() => {
    const missingZone = selectedZone && !zones.some(zone => zone.id === selectedZone.id);
    const missingWorkstation = selectedWorkstation && !effectiveWorkstations.some(ws => ws.id === selectedWorkstation.id);
    if (missingZone) setSelectedZone(null);
    if (missingWorkstation) {
      setSelectedWorkstation(null);
      setDraftWorkstationCoords(null);
      workstationDragControllerRef.current?.clearSelection();
    }
    if (missingZone || missingWorkstation) {
      setCameraFocusTarget(null);
      setCameraMode(CAMERA_MODES.OVERVIEW);
    }
  }, [zones, effectiveWorkstations, selectedZone, selectedWorkstation, setCameraMode]);

  // Real Attendance records & dynamic fetch (Phase 2B)
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [isAttendanceLoading, setIsAttendanceLoading] = useState(false);
  const [attendanceError, setAttendanceError] = useState(null);

  useEffect(() => {
    if (!activeStoreId) {
      setAttendanceRecords([]);
      return;
    }

    const queryDate = activeDate || currentShift?.date || new Date().toISOString().split('T')[0];
    let isCurrent = true;
    setIsAttendanceLoading(true);
    setAttendanceError(null);

    getStoreAttendance(activeStoreId, queryDate, queryDate)
      .then((res) => {
        if (!isCurrent) return;
        if (res?.data && Array.isArray(res.data)) {
          setAttendanceRecords(res.data);
        } else {
          setAttendanceRecords([]);
        }
      })
      .catch((err) => {
        if (!isCurrent) return;
        console.warn('[SpatialWorkspace] Could not load store attendance:', err?.message);
        setAttendanceError(err?.message || 'Lỗi tải dữ liệu điểm danh');
        setAttendanceRecords([]);
      })
      .finally(() => {
        if (isCurrent) setIsAttendanceLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [activeStoreId, activeDate, currentShift?.date, operationsRefreshKey]);



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
  useEffect(()=>{if(planningMode&&Number.isFinite(planningTimeMinutes))setCurrentTimeMinutes(planningTimeMinutes);},[planningMode,planningTimeMinutes]);
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
  const isApplyingRef = useRef(false);

  // Digital Twin Subsystem & Interaction Refs
  const dragTransferRef = useRef(null);
  const cameraManagerRef = useRef(null);
  const playerControllerRef = useRef(null);
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
    // The selected Schedule shift is the single source of truth for the spatial view.
    // The timeline may animate within that shift, but must never merge assignments
    // from other shifts on the same date.
    const sourceShifts = currentShift ? [currentShift] : allDateShifts;
    if (!sourceShifts || sourceShifts.length === 0) return staff;

    const list = [];
    sourceShifts.forEach((shift) => {
      const partsStart = (shift.startTime || '06:00').split(':');
      const startM = parseInt(partsStart[0], 10) * 60 + parseInt(partsStart[1], 10);
      const partsEnd = (shift.endTime || '14:00').split(':');
      const endM = parseInt(partsEnd[0], 10) * 60 + parseInt(partsEnd[1], 10);

      // Check if this shift covers currentTimeMinutes
      if (isWithinShift(currentTimeMinutes, shift)) {
        if (Array.isArray(shift.shiftAssignments) && shift.shiftAssignments.length > 0) {
          shift.shiftAssignments.forEach((assign, idx) => {
            const matchedEmp = employees.find((e) => e.id === assign.staffId);
            const skObj = skills.find((s) => s.id === (assign.requiredSkillId || assign.skillId) || s.name === assign.skillName);
            const skillName = assign.skillName || skObj?.name || assign.role || matchedEmp?.skillName || matchedEmp?.position || 'Chưa xác định vị trí';

            let assignedZoneId = assign.zoneId;
            if (!assignedZoneId || !zones.some((z) => z.id === assignedZoneId)) {
              const reqMatch = shift.skillRequirements?.find(
                (r) => (r.skillId && r.skillId === (assign.requiredSkillId || assign.skillId)) || (r.skillName && r.skillName === skillName)
              );
              if (reqMatch && reqMatch.zoneId && zones.some((z) => z.id === reqMatch.zoneId)) {
                assignedZoneId = reqMatch.zoneId;
              } else {
                const namedZone = zones.find(
                  (zone) => assign.zoneName && String(zone.name).toLowerCase() === String(assign.zoneName).toLowerCase()
                );
                assignedZoneId = namedZone?.id || null;
              }
            }

            const normStaffId = getStaffId(assign) || assign.staffId;
            list.push({
              id: assign.id || normStaffId || `staff-${shift.id}-${idx}`,
              staffId: normStaffId,
              gender: assign.gender ?? matchedEmp?.gender,
              assignmentId: assign.id || null,
              staffName: assign.staffName || matchedEmp?.fullName || 'Nhân viên',
              skillName: skillName,
              zoneId: assignedZoneId,
              zoneName: assign.zoneName || zones.find((z) => z.id === assignedZoneId)?.name || null,
              workstationId: assign.workstationId || null,
              workstationName: assign.workstationName || null,
              startTime: shift.startTime,
              endTime: shift.endTime,
            });
          });
        } else if (shift.staffName || shift.staffId) {
          const skillName = shift.skillName || 'Chưa xác định vị trí';
          const assignedZoneId = shift.zoneId || null;
          const normStaffId = getStaffId(shift) || shift.staffId;
          list.push({
            id: normStaffId || shift.id,
            staffId: normStaffId,
            assignmentId: null,
            staffName: shift.staffName,
            skillName: skillName,
            zoneId: assignedZoneId,
            zoneName: shift.zoneName || zones.find((z) => z.id === assignedZoneId)?.name || null,
            workstationId: shift.workstationId || null,
            workstationName: shift.workstationName || null,
            startTime: shift.startTime,
            endTime: shift.endTime,
          });
        }
      }
    });

    return list.length > 0 ? list : (staff.length > 0 ? staff : []);
  }, [allDateShifts, currentShift, currentTimeMinutes, staff, employees, skills, zones]);

  // Active workforce to render (Real Temporal vs What-If Simulated)
  const displayStaff = useMemo(() => {
    if (isSimulating) {
      return simViewMode === 'before'
        ? (productionSnapshot.staff || [])
        : (storeSimulatedStaff || []);
    }
    return temporalStaff;
  }, [isSimulating, simViewMode, productionSnapshot.staff, storeSimulatedStaff, temporalStaff]);

  // Resolve Workstation Occupancy & Staff Presence (Phase 2B)
  const selectedEntity = useMemo(() => {
    const type = selectedStaff ? 'staff' : selectedWorkstation ? 'workstation' : selectedZone ? 'zone' : null;
    const item = selectedStaff || selectedWorkstation || selectedZone;
    return type ? { type, id: entityIdentity(type, item) } : null;
  }, [selectedStaff, selectedWorkstation, selectedZone]);
  const infoSelection = useMemo(() => resolveInfoSelection(selectedEntity, { staff: displayStaff, workstations: effectiveWorkstations, zones: viewZones }), [selectedEntity, displayStaff, effectiveWorkstations, viewZones]);
  useEffect(() => { setIsDrawerOpen(false); }, [selectedEntity?.type, selectedEntity?.id]);
  const closeInfo = useCallback(() => {
    setSelectedStaff(null); setSelectedWorkstation(null); setSelectedZone(null);
    workstationDragControllerRef.current?.clearSelection();
  }, []);
  useEffect(() => { closeInfo(); setIsDrawerOpen(false); }, [activeStoreId, currentShift?.id, activeDate, closeInfo]);
  useEffect(() => {
    if (selectedEntity && !infoSelection) { closeInfo(); setIsDrawerOpen(false); }
  }, [selectedEntity, infoSelection, closeInfo]);
  useEffect(() => {
    if (!infoSelection || planningMode || isEditingLayout) return;
    const escape = event => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); if (isDrawerOpen) setIsDrawerOpen(false); else closeInfo(); }
    };
    window.addEventListener('keydown', escape, true);
    return () => window.removeEventListener('keydown', escape, true);
  }, [infoSelection, isDrawerOpen, planningMode, isEditingLayout, closeInfo]);

  const workstationOccupancies = useMemo(() => {
    const activeAssignments =
      currentShift?.shiftAssignments && currentShift.shiftAssignments.length > 0
        ? currentShift.shiftAssignments
        : displayStaff;

    return resolveWorkstationOccupancies(
      effectiveWorkstations,
      activeAssignments,
      attendanceRecords,
      {
        isLoading: isWorkstationsLoading || isAttendanceLoading,
        error: workstationsError || attendanceError,
        hasShiftSelected: Boolean(currentShift),
        currentShift,
      }
    );
  }, [
    effectiveWorkstations,
    currentShift,
    displayStaff,
    attendanceRecords,
    isWorkstationsLoading,
    isAttendanceLoading,
    workstationsError,
    attendanceError,
  ]);

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
        const range = getShiftTimeRange(currentShift);
        if (next > range.end) return range.start;
        return next;
      });
    }, 400);
    return () => clearInterval(interval);
  }, [isPlayingTimeline, timelineSpeed, currentShift]);

  // ── Camera Preset Handlers (Delegated to CameraManager Facade & R3F Controller) ──
  const handleOverviewCamera = useCallback(() => {
    if (cameraManagerRef.current) {
      cameraManagerRef.current.setCameraMode(CAMERA_MODES.OVERVIEW);
    }
    setFollowingStaff(null);
    setCameraMode(CAMERA_MODES.OVERVIEW);
    setCameraFocusTarget(null);
  }, [setCameraMode, setFollowingStaff]);

  const handleTopDownCamera = useCallback(() => {
    if (cameraManagerRef.current) {
      cameraManagerRef.current.setCameraMode(CAMERA_MODES.TOP_DOWN);
    }
    setFollowingStaff(null);
    setCameraMode(CAMERA_MODES.TOP_DOWN);
    setCameraFocusTarget(null);
  }, [setCameraMode, setFollowingStaff]);

  const handleResetCamera = useCallback(() => {
    handleOverviewCamera();
    setSelectedZone(null);
    setSelectedStaff(null);
    setSelectedWorkstation(null);
  }, [handleOverviewCamera]);

  const handleFocusZone = useCallback((zone) => {
    if (!zone) return;
    setSelectedStaff(null);
    setSelectedWorkstation(null);
    if (cameraManagerRef.current) {
      cameraManagerRef.current.setCameraMode(CAMERA_MODES.FOCUS_ZONE, { zone });
    }
    setFollowingStaff(null);
    setCameraMode(CAMERA_MODES.FOCUS_ZONE);
    setCameraFocusTarget({ zone });
    setSelectedZone(zone);

  }, [setCameraMode, setFollowingStaff]);

  const handleSceneZoneSelection = useCallback((zone, { focus = true } = {}) => {
    setSelectedZone(zone || null);
    if(zone)onPlanningZoneSelect?.(zone);
    if (zone && focus) handleFocusZone(zone);
  }, [handleFocusZone,onPlanningZoneSelect]);

  const handleFocusStaff = useCallback((emp) => {
    if (!emp) return;
    const zone = zones.find((z) => z.id === (emp.zoneId || emp.zone?.id));
    if (cameraManagerRef.current) {
      cameraManagerRef.current.setCameraMode(CAMERA_MODES.FOCUS_EMPLOYEE, { employee: emp, zone });
    }
    setFollowingStaff(null);
    setCameraMode(CAMERA_MODES.FOCUS_EMPLOYEE);
    setCameraFocusTarget({ employee: emp, zone });
    setSelectedStaff(emp);
    if (zone) setSelectedZone(zone);

  }, [zones, setCameraMode, setFollowingStaff]);

  // Follow Employee in real-time
  const handleFollowStaff = useCallback((emp) => {
    if (!emp) return;
    setFollowingStaff(emp);
    setSelectedStaff(emp);
    setCameraMode(CAMERA_MODES.FOLLOW_EMPLOYEE);
    setCameraFocusTarget({ employee: emp });
  }, [setCameraMode, setFollowingStaff]);

  const handleStopFollowStaff = useCallback(() => {
    if (cameraManagerRef.current) {
      cameraManagerRef.current.stopFollowing();
    }
    setFollowingStaff(null);
    setCameraMode(CAMERA_MODES.OVERVIEW);
    setCameraFocusTarget(null);
  }, [setCameraMode, setFollowingStaff]);

  useEffect(()=>{
    if(followingStaff&&!displayStaff.some(person=>areSameStaff(person,followingStaff)))handleStopFollowStaff();
  },[followingStaff,displayStaff,handleStopFollowStaff]);

  // Verified Zone Shift Requirements Map (Data-driven Heatmap & Attention source of truth)
  const zoneReqMap = useMemo(
    () => getZoneShiftRequirements(zones, currentShift, skills),
    [zones, currentShift, skills]
  );

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
  const unresolvedAssignmentsCount = displayStaff.filter(
    (s) => !(s.zoneId || s.zone?.id)
  ).length;

  const handleOpenAttentionCenter = useCallback(() => {
    setSelectedZone(null);
    setSelectedStaff(null);
    setSelectedWorkstation(null);
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
    setIsXRayMode((prev) => !prev);
  }, [setIsXRayMode]);

  // Layer toggle
  const handleToggleLayer = useCallback((layerKey) => {
    setLayers((prev) => ({ ...prev, [layerKey]: !prev[layerKey] }));
  }, [setLayers]);

  // ── Mode 2 Exploration Handlers ──
  const handleExitExplore = useCallback(() => {
    if (playerControllerRef.current) {
      playerControllerRef.current.detach();
      playerControllerRef.current = null;
    }

    setIsExploreMode(false);
    setNearbyEntity(null);
    setReticleTarget(null);
    setTargetLock(null);
    setInitialLockTarget(null);
    handleOverviewCamera();
  }, [handleOverviewCamera, setIsExploreMode]);

  const handleEnterExplore = useCallback(() => {
    workstationDragControllerRef.current?.setEnabled(false);

    let target = null;
    if (selectedStaff) {
      const staffZone = viewZones.find((z) => z.id === (selectedStaff.zoneId || selectedStaff.zone?.id));
      if (staffZone) {
        const [zx, , zz] = toThreeCoords(staffZone.x, staffZone.y, staffZone.z, layout);
        target = {
          id: getStaffId(selectedStaff),
          type: 'staff',
          name: selectedStaff.fullName || selectedStaff.staffName || 'Nhân viên',
          position: new THREE.Vector3(zx, 0, zz),
          item: selectedStaff,
        };
      }
    } else if (selectedWorkstation) {
      const [wx, , wz] = toThreeCoords(selectedWorkstation.x || 0, selectedWorkstation.y || 0, selectedWorkstation.z || 0, layout);
      target = {
        id: selectedWorkstation.id,
        type: 'workstation',
        name: selectedWorkstation.name || selectedWorkstation.code || 'Trạm làm việc',
        position: new THREE.Vector3(wx, 0, wz),
        item: selectedWorkstation,
      };
    } else if (selectedZone) {
      const targetZone=viewZones.find(zone=>zone.id===selectedZone.id)||selectedZone;
      const [zx, , zz] = toThreeCoords(targetZone.x, targetZone.y, targetZone.z, layout);
      target = {
        id: selectedZone.id,
        type: 'zone',
        name: selectedZone.name,
        position: new THREE.Vector3(zx, 0, zz),
        item: selectedZone,
      };
    }

    setInitialLockTarget(target);
    setIsExploreMode(true);
    setIsDrawerOpen(false);
  }, [layout, selectedStaff, selectedWorkstation, selectedZone, setIsExploreMode,viewZones]);

  const handleTeleportToZone = useCallback((zone) => {
    const ctrl = playerControllerRef.current || window.__playerController;
    if (!ctrl || !zone) return;
    const target=viewZones.find(item=>item.id===zone.id)||zone;
    const [tx, , tz] = toThreeCoords(target.x, target.y, target.z, layout);
    const front=target.physicalFrame?target.physicalFrame.sizeZ/2+.85:1.4;
    if(ctrl.teleportTo(tx,tz+front,0)===false){toast.error('Không tìm được vị trí đứng trống gần khu vực này.');return;}
    setPlayerPosition({ x: ctrl.position.x, z: ctrl.position.z });
    setPlayerYaw(0);
  }, [layout,viewZones]);

  const handleTogglePlayerView = useCallback((mode) => {
    setPlayerViewMode(previous=>mode==='first_person'||mode==='third_person'?mode:previous==='third_person'?'first_person':'third_person');
  }, [setPlayerViewMode]);

  const handlePlayerStatusUpdate = useCallback(({ position, yaw, nearbyEntity: ne, reticleTarget: rt, isFlyMode: ifm }) => {
    if (position) setPlayerPosition(position);
    if (yaw !== undefined) setPlayerYaw(yaw);
    if (ne !== undefined) setNearbyEntity(ne);
    if (rt !== undefined) setReticleTarget(rt);
    if (ifm !== undefined) setIsPlayerFlying(ifm);
  }, []);

  const handleExploreInteract = useCallback((entity) => {
    if (entity.type === 'staff') {
      setSelectedStaff(entity.item);
      setSelectedZone(entity.zone || (entity.item?.zoneId ? zonesRef.current?.find(z => z.id === entity.item.zoneId) : null));
      setSelectedWorkstation(null);
    } else if (entity.type === 'workstation') {
      setSelectedWorkstation(entity.item);
      setSelectedStaff(null);
    } else {
      setSelectedZone(entity.item);
      setSelectedStaff(null);
      setSelectedWorkstation(null);
    }

  }, []);

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
      setPlayerViewMode('first_person');
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
    if (selectedStaff && areSameStaff(selectedStaff, staffId)) {
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

    const candidateStaffId = getStaffId(candidate);
    if (!candidateStaffId) {
      toast.error('Không xác định được mã nhân viên hợp lệ.');
      return;
    }

    if (isSimulating) {
      if (candidate.isCurrentlyAssigned) {
        handleSimulateMoveStaff(candidateStaffId, zone.id);
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
    let forceOverride = true;
    if (!candidate.isCurrentlyAssigned && !candidate.hasAvailabilityMatch) {
      const shiftTimeDesc = currentShift.startTime && currentShift.endTime ? ` (${currentShift.startTime} - ${currentShift.endTime})` : '';
      const confirmAssign = window.confirm(
        `Nhân sự ${candidate.name} chưa đăng ký lịch rảnh vào khung giờ này${shiftTimeDesc}.\n\nBạn có chắc chắn muốn chỉ định bổ sung vào ca làm việc này không?`
      );
      if (!confirmAssign) return;
    }

    try {
      setAssigningStaffId(candidateStaffId);
      await assignStaffToShift(activeStoreId, shiftId, candidateStaffId, zone.id, forceOverride);
      toast.success(`Đã phân công ${candidate.name} vào phân khu ${zone.name}!`);
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

  const handlePublishSchedule = useCallback(async () => {
    try {
      if (onPublishSchedule) {
        await onPublishSchedule();
      }
      toast.success('Đã lưu & xuất bản lịch làm việc thành công!');
    } catch (err) {
      console.error('Publish schedule error:', err);
      toast.error('Lỗi khi xuất bản lịch làm việc');
    }
  }, [onPublishSchedule]);

  const handleRunAutoScheduleSimulation = useCallback(() => {
    const allocated = generateSimulationAutoSchedule(zones, storeSimulatedStaff, skills);
    applyAutoScheduleSimulation(allocated, 'Tự động xếp ca AI (Tối ưu độ phủ)');
  }, [zones, storeSimulatedStaff, skills, applyAutoScheduleSimulation]);

  const handleApplySimulation = useCallback(async () => {
    if (isApplyingRef.current) return;
    isApplyingRef.current = true;
    setIsApplying(true);

    const succeededDiffs = [];
    const errors = [];
    const warnings = [];
    let hasTimeout = false;

    const isTimeout = (e) =>
      e?.code === 'ECONNABORTED' ||
      e?.message?.toLowerCase().includes('timeout') ||
      e?.message?.toLowerCase().includes('network error');

    try {
      if (storeId && currentShift?.id) {
        for (const diff of simulatedDiff) {
          if (diff.type === 'ASSIGN' && diff.staffId) {
            try {
              await assignStaffToShift(storeId, currentShift.id, diff.staffId, diff.toZoneId);
              succeededDiffs.push(diff);
            } catch (e) {
              console.error('Assign API error:', e);
              if (isTimeout(e)) hasTimeout = true;
              errors.push({ diff, error: e });
            }
          } else if (diff.type === 'REMOVE' && diff.staffId) {
            try {
              await removeStaffFromShift(storeId, currentShift.id, diff.staffId);
              succeededDiffs.push(diff);
            } catch (e) {
              console.error('Remove API error:', e);
              if (isTimeout(e)) hasTimeout = true;
              errors.push({ diff, error: e });
            }
          } else if (diff.type === 'TRANSFER' && diff.staffId) {
            try {
              await assignStaffToShift(storeId, currentShift.id, diff.staffId, diff.toZoneId);
              succeededDiffs.push(diff);
            } catch (e) {
              console.error('Transfer API error:', e);
              if (isTimeout(e)) hasTimeout = true;
              errors.push({ diff, error: e });
            }
          } else if (diff.type === 'SWAP') {
            if (!diff.staffAId || !diff.staffBId || !diff.zoneAId || !diff.zoneBId) {
              const err = new Error('Dữ liệu hoán đổi không hợp lệ: thiếu thông tin nhân sự hoặc phân khu');
              errors.push({ diff, error: err });
            } else {
              try {
                await swapStaffZones(storeId, currentShift.id, {
                  staffAId: diff.staffAId,
                  staffBId: diff.staffBId,
                  zoneAId: diff.zoneAId,
                  zoneBId: diff.zoneBId,
                  targetZoneForAId: diff.zoneBId,
                  targetZoneForBId: diff.zoneAId,
                });
                succeededDiffs.push(diff);
              } catch (e) {
                console.error('Atomic Swap API error:', e);
                if (isTimeout(e)) hasTimeout = true;
                errors.push({
                  diff,
                  error: new Error(`Không thể hoán đổi vị trí giữa ${diff.staffAName || 'Nhân sự A'} và ${diff.staffBName || 'Nhân sự B'}: ${e.response?.data?.message || e.message || 'Lỗi server'}`),
                });
              }
            }
          } else if (diff.type === 'LEAVE_ABSENCE') {
            // Thao tác mô phỏng What-If trong phòng 3D, không làm phát sinh đơn nghỉ phép chính thức trong HR
            warnings.push(`Mô phỏng vắng mặt của ${diff.staffName || 'nhân sự'} chỉ có hiệu lực phân tích 3D và không tạo đơn nghỉ phép.`);
            succeededDiffs.push(diff);
          } else if (diff.type === 'AUTO_SCHEDULE') {
            // Tóm tắt macro AI - hướng dẫn người dùng xuất bản toàn bộ ca
            warnings.push(`Kết quả Xếp ca AI (${diff.allocatedCount || 0} vị trí) là bản xem trước mô phỏng. Sử dụng nút 'Lưu & Xuất bản' để áp dụng chính thức.`);
            succeededDiffs.push(diff);
          } else {
            // Bất kỳ diff type nào không được hỗ trợ phải bị từ chối rõ ràng, không được âm thầm bỏ qua
            errors.push({
              diff,
              error: new Error(`Thao tác không được hỗ trợ lưu trữ: ${diff.type || 'UNKNOWN'}`),
            });
          }
        }
      }

      // 1. Phục hồi và đồng bộ dữ liệu backend ngay nếu có bất kỳ thao tác nào đã thành công hoặc có timeout
      if (succeededDiffs.length > 0 || hasTimeout) {
        try {
          await onApplyComplete?.();
        } catch (syncErr) {
          console.warn('Backend sync error after apply:', syncErr);
        }
      }

      // 2. Xử lý trường hợp có lỗi (partial or full failure)
      if (errors.length > 0) {
        // Loại bỏ các diff đã áp dụng thành công khỏi Zustand store để tránh lặp lại mutation khi user bấm Apply lại
        const remainingDiffs = simulatedDiff.filter((d) => !succeededDiffs.includes(d));
        useSimulationStore.setState({ simulatedDiff: remainingDiffs });

        const firstErrorMsg = errors[0]?.error?.message || errors[0]?.error?.response?.data?.message || 'Lỗi không xác định';
        if (hasTimeout) {
          toast.warning(`Phát hiện độ trễ mạng hoặc timeout. Đã kích hoạt đối soát dữ liệu với máy chủ. Vui lòng kiểm tra lại trạng thái ca trước khi thử lại.`);
        } else if (succeededDiffs.length > 0) {
          toast.warning(`Áp dụng một phần: ${succeededDiffs.length} thao tác thành công, ${errors.length} thao tác thất bại. Lỗi: ${firstErrorMsg}`);
        } else {
          toast.error(`Áp dụng mô phỏng thất bại (${errors.length}/${simulatedDiff.length} thao tác gặp lỗi): ${firstErrorMsg}`);
        }
        setIsApplyModalOpen(false);
        // Bảo toàn các diff còn lại chưa lưu để người dùng có thể điều chỉnh và thử lại
        return;
      }

      // 3. Toàn bộ thao tác thành công trọn vẹn
      if (warnings.length > 0) {
        toast.warning(`Đã áp dụng các thay đổi điều chuyển. Lưu ý: ${warnings.join(' ')}`);
      } else {
        toast.success('Đã áp dụng tất cả các thay đổi mô phỏng thành công!');
      }

      setIsApplyModalOpen(false);
      exitSimulation();
      dragTransferRef.current?.setEnabled(false);
    } catch (err) {
      console.error('Failed to apply simulation changes:', err);
      toast.error('Có lỗi xảy ra trong quá trình áp dụng mô phỏng');
    } finally {
      isApplyingRef.current = false;
      setIsApplying(false);
    }
  }, [storeId, currentShift, simulatedDiff, onApplyComplete, exitSimulation]);

  // ── Workstation Layout Editor Handlers (Phase 2A) ──
  const handleToggleLayoutEditor = useCallback(() => {
    if (planningMode) return;
    if (!canEditLayout) {
      toast.warning('Bạn cần quyền Quản lý (MANAGER) hoặc Quản trị viên (ADMIN) để chỉnh sửa bố cục trạm làm việc.');
      return;
    }
    if (isSimulating) {
      toast.warning('Vui lòng thoát khỏi Phòng thử nghiệm trước khi chỉnh sửa bố cục trạm.');
      return;
    }
    if (isExploreMode) {
      toast.warning('Vui lòng thoát khỏi Chế độ Khám phá góc nhìn thứ nhất trước khi chỉnh sửa bố cục.');
      return;
    }

    if (designSnapshot?.document) { setDesignerOpen(true); return; }

    setIsEditingLayout((prev) => {
      const next = !prev;
      if (!next) {
        if (draftWorkstationCoords) {
          workstationDragControllerRef.current?.revertPosition();
          setDraftWorkstationCoords(null);
          setWorkstationCollision(null);
        }
      }
      return next;
    });
  }, [canEditLayout, isSimulating, isExploreMode, draftWorkstationCoords, designSnapshot?.document, planningMode]);

  const handleSaveWorkstationPosition = useCallback(async () => {
    if (!canEditLayout) {
      toast.error('Bạn không có quyền lưu vị trí trạm làm việc (Chỉ dành cho ADMIN/MANAGER).');
      return;
    }
    if (!draftWorkstationCoords || !selectedWorkstation) return;
    if (!activeStoreId) {
      toast.error('Không tìm thấy thông tin cửa hàng hiện tại để cập nhật.');
      return;
    }
    if (workstationCollision?.isColliding) {
      toast.warning('Không thể lưu vị trí: Trạm đang va chạm với trạm khác hoặc ngoài biên sàn.');
      return;
    }

    setIsSavingWorkstation(true);
    try {
      await updateStoreWorkstation(activeStoreId, selectedWorkstation.id, {
        name: selectedWorkstation.name,
        code: selectedWorkstation.code,
        workstationType: selectedWorkstation.workstationType,
        capacity: selectedWorkstation.capacity || 1,
        zoneId: selectedWorkstation.zoneId,
        x: Number(draftWorkstationCoords.x.toFixed(2)),
        y: Number(draftWorkstationCoords.y.toFixed(2)),
        z: Number(draftWorkstationCoords.z.toFixed(2)),
        isActive: selectedWorkstation.isActive !== false,
      });

      toast.success(`Đã lưu vị trí mới cho trạm ${selectedWorkstation.name || selectedWorkstation.code || ''}!`);

      // Update local workstation state
      setInternalWorkstations((prev) =>
        prev.map((ws) =>
          ws.id === selectedWorkstation.id
            ? { ...ws, x: draftWorkstationCoords.x, y: draftWorkstationCoords.y, z: draftWorkstationCoords.z }
            : ws
        )
      );
      setSelectedWorkstation((prev) =>
        prev && prev.id === selectedWorkstation.id
          ? { ...prev, x: draftWorkstationCoords.x, y: draftWorkstationCoords.y, z: draftWorkstationCoords.z }
          : prev
      );

      // Commit 3D mesh position
      workstationDragControllerRef.current?.commitPosition();
      setDraftWorkstationCoords(null);
      setWorkstationCollision(null);

      // Notify parent to refresh if registered
      onApplyComplete?.();
    } catch (err) {
      console.error('Failed to update workstation position:', err);
      toast.error(`Lỗi khi lưu vị trí trạm: ${err.response?.data?.message || err.message || 'Lỗi server'}`);
      workstationDragControllerRef.current?.revertPosition();
      setDraftWorkstationCoords(null);
      setWorkstationCollision(null);
    } finally {
      setIsSavingWorkstation(false);
    }
  }, [canEditLayout, draftWorkstationCoords, selectedWorkstation, activeStoreId, workstationCollision, onApplyComplete]);

  const handleCancelWorkstationPosition = useCallback(() => {
    workstationDragControllerRef.current?.revertPosition();
    setDraftWorkstationCoords(null);
    setWorkstationCollision(null);
  }, []);

  const handleRotateWorkstation = useCallback((deltaRad = Math.PI / 2) => {
    if (!workstationDragControllerRef.current) return;
    const newRot = workstationDragControllerRef.current.rotateSelected(deltaRad);
    if (newRot !== null && selectedWorkstation) {
      setSelectedWorkstation((prev) => ({
        ...prev,
        rotation: { ...(prev?.rotation || {}), y: newRot },
      }));
    }
  }, [selectedWorkstation]);

  const handleFocusWorkstation = useCallback((ws) => {
    if (!ws) return;
    setSelectedStaff(null);
    if (cameraManagerRef.current) {
      cameraManagerRef.current.setCameraMode(CAMERA_MODES.FOCUS_WORKSTATION, { workstation: ws });
    }
    setFollowingStaff(null);
    setCameraMode(CAMERA_MODES.FOCUS_WORKSTATION);
    setCameraFocusTarget({ workstation: ws });
    setSelectedWorkstation(ws);

  }, [setCameraMode, setFollowingStaff]);

  const handleFocusWorkstationAsset = useCallback(() => {
    const target = selectedWorkstation || effectiveWorkstations[0];
    if (target) handleFocusWorkstation(target);
    else toast.info('Cửa hàng chưa có trạm làm việc để xem.');
  }, [selectedWorkstation, effectiveWorkstations, handleFocusWorkstation]);

  const handleWorkstationDraftMove = useCallback(({ ws, targetCoords, isValid, collision, isEnd, reset }) => {
    if (reset) { setDraftWorkstationCoords(null); setWorkstationCollision(null); return; }
    if (targetCoords) setDraftWorkstationCoords(targetCoords);
    if (collision !== undefined) setWorkstationCollision(collision);
  }, []);

  const handleSimulationTransfer = useCallback((emp, targetZone) => {
    useSimulationStore.getState().transferStaff(getStaffId(emp), targetZone);
  }, []);

  const handleSimulationValidationChange = useCallback((check, nearestZone) => {
    setDragValidationState(check);
    setDragTargetZone(nearestZone);
  }, []);

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
          isDrawerOpen={false}
        />
        <TwoDSpatialSchematic
          layout={layout}
          zones={viewZones}
          staff={displayStaff}
          selectedZone={selectedZone}
          onSelectZone={setSelectedZone}
          workstations={effectiveWorkstations}
          showWorkstations={layers.showWorkstations}
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
           Trở lại Không gian 3D
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

  const inspectorContent = (
<SpatialInspector
        storeId={activeStoreId}
        isOpen={!planningMode&&isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        selectedZone={infoSelection?.type === 'zone' ? infoSelection.data : selectedZone}
        selectedStaff={infoSelection?.type === 'staff' ? infoSelection.data : null}
        selectedWorkstation={infoSelection?.type === 'workstation' ? infoSelection.data : null}
        onSelectZone={setSelectedZone}
        onSelectStaff={setSelectedStaff}
        onSelectWorkstation={(ws) => {
          setSelectedStaff(null);
          setSelectedWorkstation(ws);
          workstationDragControllerRef.current?.selectWorkstation(ws);
        }}
        onClearSelection={() => {
          setSelectedZone(null);
          setSelectedStaff(null);
          setSelectedWorkstation(null);
          workstationDragControllerRef.current?.clearSelection();
        }}
        onFocusZone={item => { handleFocusZone(item); setIsDrawerOpen(false); }}
        onFocusStaff={item => { handleFocusStaff(item); setIsDrawerOpen(false); }}
        onFocusWorkstation={item => { handleFocusWorkstation(item); setIsDrawerOpen(false); }}
        onFollowStaff={item => { if(areSameStaff(item,followingStaff))handleStopFollowStaff();else handleFollowStaff(item); setIsDrawerOpen(false); }}
        isFollowingEmployee={Boolean(followingStaff&&selectedStaff&&areSameStaff(followingStaff,selectedStaff))}
        isEditingLayout={isEditingLayout}
        onToggleLayoutEditor={() => { handleToggleLayoutEditor(); setIsDrawerOpen(false); }}
        draftWorkstationCoords={draftWorkstationCoords}
        workstationCollision={workstationCollision}
        isSavingWorkstation={isSavingWorkstation}
        onSaveWorkstationPosition={handleSaveWorkstationPosition}
        onCancelWorkstationPosition={handleCancelWorkstationPosition}
        onRotateWorkstation={handleRotateWorkstation}
        canEditLayout={canEditLayout}
        workstations={effectiveWorkstations}
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
        workstationOccupancies={workstationOccupancies}
        onAssignCandidate={handleAssignCandidate}
        isAssigningCandidate={assigningStaffId}
        onSimulateAddStaff={handleSimulateAddStaff}
        onOpenAutoSchedule={onOpenAutoSchedule}
      />
  );

  return (
    <div
      id="spatial-workspace-container"
      ref={workspaceElement}
      className={`se-workspace ${infoSelection && !isEditingLayout ? 'se-workspace--info' : ''} ${planningMode?'se-workspace--planning':''}`}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: 0,
        backgroundColor: 'var(--ss-bg)',
        borderRadius: 12,
        overflow: 'hidden',
        border: isSimulating ? '1.5px solid #F59E0B' : '1px solid #1E293B',
        boxShadow: isSimulating ? '0 8px 32px rgba(245, 158, 11, 0.12)' : '0 6px 24px rgba(15, 23, 42, 0.06)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* 1. Global Command Header */}
      {!planningMode&&<CommandHeader
        onExitWorkspace={onExitWorkspace}
        onDateChange={onDateChange}
        onFullscreen={toggleFullscreen}
        isFullscreen={isFullscreen}
        isRealtimeConnected={isRealtimeConnected}
        lastOperationsUpdatedAt={operationsLiveState.lastUpdatedAt}
        latestOperationLabel={operationsLiveState.label}
        isEditingLayout={isEditingLayout}
        zones={zones}
        workstations={effectiveWorkstations}
        staff={displayStaff}
        onNavigate={(value) => {
          const [kind, id] = value.split(':');
          if (kind === 'zone') handleFocusZone(zones.find(item => item.id === id));
          if (kind === 'workstation') handleFocusWorkstation(effectiveWorkstations.find(item => item.id === id));
          if (kind === 'staff') handleFocusStaff(displayStaff.find(item => (item.staffId || item.id) === id));
        }}
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
        onPublishSchedule={handlePublishSchedule}
        isDrawerOpen={false}
        onToggleDrawer={handleOpenAttentionCenter}
      />}

      {/* 2. Secondary Staffing KPI Ribbon */}
      {!planningMode&&<StaffingKpiBar
        coveragePercent={coveragePercent}
        activeStaffCount={displayStaff.length}
        requiredStaffCount={totalShiftRequired}
        maxStoreCapacity={totalPhysicalCapacity}
        understaffedZonesCount={understaffedZonesCount}
        openShiftsCount={openShiftsCount}
        unresolvedAssignmentsCount={unresolvedAssignmentsCount}
        isSimulating={isSimulating}
        costDelta={simulationImpact?.delta?.costDelta || 0}
        onOpenAttentionCenter={handleOpenAttentionCenter}
        onFocusUnderstaffedZone={handleFocusUnderstaffedZone}
      />}

      {/* 3. Operational Command Canvas Area (Full 3D Viewport) */}
      <div
        className="se-canvas-stage"
        style={{
          flex: 1,
          position: 'relative',
          display: 'flex',
          overflow: 'hidden',
          minHeight: 0,
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
          {!designerOpen && (<DigitalTwinCanvas
            key={`${activeStoreId}/${designSnapshot?.revision || 0}`}
            designDocument={designSnapshot?.document || null}
            layout={layout}
            viewZones={viewZones}
            onPhysicalLayoutReady={handlePhysicalLayoutReady}
            zones={zones}
            staff={displayStaff}
            workstations={effectiveWorkstations}
            storeCategory={storeCategory}
            workstationOccupancies={workstationOccupancies}
            layers={layers}
            isXRayMode={isXRayMode}
            heatmapMode={heatmapMode}
            activeSkillFilter={activeSkillFilter}
            zoneReqMap={zoneReqMap}
            selectedZone={selectedZone}
            selectedStaff={selectedStaff}
            selectedWorkstation={selectedWorkstation}
            onSelectZone={handleSceneZoneSelection}
            onSelectStaff={setSelectedStaff}
            onSelectWorkstation={(ws) => {
              if(planningMode&&ws){const target=zones.find(z=>z.id===ws.zoneId);if(target)onPlanningZoneSelect?.(target);}
              setSelectedStaff(null);

              setSelectedWorkstation(ws);
            }}
            infoSelection={!planningMode && !isEditingLayout ? infoSelection : null}
            onCloseInfo={closeInfo}
            onOpenInfoActions={() => setIsDrawerOpen(true)}
            onFocusInfo={() => {
              if (infoSelection?.type === 'staff') handleFocusStaff(infoSelection.data);
              else if (infoSelection?.type === 'workstation') handleFocusWorkstation(infoSelection.data);
              else if (infoSelection) handleFocusZone(infoSelection.data);
            }}
            infoActions={isDrawerOpen && infoSelection ? inspectorContent : null}
            onBackInfo={() => setIsDrawerOpen(false)}
            isOperationDialogOpen={isDrawerOpen && !infoSelection}
            currentShift={currentShift}
            attendanceRecords={attendanceRecords}
            storeId={activeStoreId}
            isExploreMode={isExploreMode}
            playerViewMode={playerViewMode}
            onTogglePlayerView={handleTogglePlayerView}
            onExitExplore={handleExitExplore}
            onTargetLockChange={setTargetLock}
            onInteract={handleExploreInteract}
            onPlayerStatusUpdate={handlePlayerStatusUpdate}
            initialLockTarget={initialLockTarget}
            isEditingLayout={isEditingLayout}
            onWorkstationDraftMove={handleWorkstationDraftMove}
            cameraMode={cameraMode}
            cameraFocusTarget={cameraFocusTarget}
            onUserOrbitStart={() => setFollowingStaff(null)}
            isSimulating={isSimulating}
            simViewMode={simViewMode}
            onSimulationTransfer={handleSimulationTransfer}
            onSimulationValidationChange={handleSimulationValidationChange}
            cameraManagerRef={cameraManagerRef}
            workstationDragControllerRef={workstationDragControllerRef}
            dragTransferRef={dragTransferRef}
            playerControllerRef={playerControllerRef}
          />)}

          {(isWorkstationsLoading || isAttendanceLoading || workstationsError || attendanceError) && (
            <div
              role="status"
              style={{
                position: 'absolute', top: 76, left: '50%', transform: 'translateX(-50%)', zIndex: 16,
                padding: '8px 14px', borderRadius: 10, background: 'rgba(15, 23, 42, 0.9)',
                color: '#E2E8F0', fontSize: 12, boxShadow: '0 6px 20px rgba(0,0,0,.22)',
                pointerEvents: 'none', whiteSpace: 'nowrap',
              }}
            >
              {isWorkstationsLoading || isAttendanceLoading
                ? 'Đang tải dữ liệu trạm và điểm danh…'
                : `Một phần dữ liệu vận hành chưa tải được: ${workstationsError || attendanceError}`}
            </div>
          )}

          {/* Subtle Empty State Badge if no zones exist */}
          {(!zones || zones.length === 0) && (
            <div
              style={{
                position: 'absolute',
                top: 80,
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(15, 23, 42, 0.85)',
                color: '#E2E8F0',
                padding: '10px 20px',
                borderRadius: 12,
                fontSize: 13,
                fontWeight: 600,
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
                backdropFilter: 'blur(8px)',
                zIndex: 15,
                pointerEvents: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              <span>ℹ️</span>
              <span>Chưa có phân vùng (Zone) nào cho cửa hàng này. Hãy cấu hình mặt bằng để bắt đầu phân bổ 3D.</span>
            </div>
          )}

      {/* Top Floating Controls: Explore HUD vs Spatial Toolbar */}
      {isExploreMode ? (
        <ExploreHUD
          layout={layout}
          zones={viewZones}
          staff={displayStaff}
          playerPosition={playerPosition}
          playerYaw={playerYaw}
          nearbyEntity={nearbyEntity}
          reticleTarget={reticleTarget}
          targetLock={targetLock}
          viewMode={playerViewMode}
          isFlyMode={isPlayerFlying}
          isDrawerOpen={false}
          onToggleView={handleTogglePlayerView}
          onTeleportToZone={handleTeleportToZone}
          onInteract={(entity) => {
            if (entity.type === 'staff') {
              setSelectedStaff(entity.item);
              setSelectedZone(entity.zone || (entity.item?.zoneId ? zones.find((z) => z.id === entity.item.zoneId) : null));
              setSelectedWorkstation(null);
            } else if (entity.type === 'workstation') {
              setSelectedWorkstation(entity.item);
              setSelectedStaff(null);
            } else {
              setSelectedZone(entity.item);
              setSelectedStaff(null);
              setSelectedWorkstation(null);
            }

          }}
          onToggleTargetLock={(entity) => {
            if (playerControllerRef.current) {
              if (targetLock && targetLock.id === (entity.id || getStaffId(entity.item))) {
                playerControllerRef.current.releaseTargetLock();
              } else {
                playerControllerRef.current.setTargetLockFromEntity(
                  entity,
                  avatarMeshesRef.current,
                  workstationMeshesRef.current
                );
              }
            }
          }}
          onReleaseTargetLock={() => {
            playerControllerRef.current?.releaseTargetLock();
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
            selectedZone={selectedZone}
            selectedWorkstation={selectedWorkstation}
            onFocusSelectedZone={() => handleFocusZone(selectedZone)}
            onFocusSelectedWorkstation={() => handleFocusWorkstation(selectedWorkstation)}
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
            isEditingLayout={isEditingLayout}
            onOpenDesigner={!planningMode && canEditLayout ? () => {
              if (isSimulating) { toast.warning('Thoát mô phỏng trước khi thiết kế cửa hàng.'); return; }
              closeInfo(); setIsDrawerOpen(false); setIsExploreMode(false); setIsEditingLayout(false);
              workstationDragControllerRef.current?.setEnabled(false); setDesignerOpen(true);
            } : null}
            onToggleLayoutEditor={handleToggleLayoutEditor}
            canEditLayout={canEditLayout && !planningMode}
            onFocusWorkstationAsset={handleFocusWorkstationAsset}
            isDrawerOpen={false}
            onToggleDrawer={handleOpenAttentionCenter}
          />

          {/* Workstation Layout Editor Floating Banner (Phase 2A) */}
          {isEditingLayout && (
            <WorkstationEditorBanner
              isEditing={isEditingLayout}
              selectedWorkstation={selectedWorkstation}
              draftCoords={draftWorkstationCoords}
              collisionInfo={workstationCollision}
              isSaving={isSavingWorkstation}
              onSave={handleSaveWorkstationPosition}
              onCancel={handleCancelWorkstationPosition}
              onRotate={() => handleRotateWorkstation(Math.PI / 2)}
              onExit={handleToggleLayoutEditor}
            />
          )}

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
              isDrawerOpen={false}
            />
          )}

          {/* Heatmap Mini Legend Card in Overview Mode */}
          {!isExploreMode && heatmapMode && (
            <div
              id="spatial-heatmap-legend"
              style={{
                position: 'absolute',
                bottom: 14,
                left: 14,
                zIndex: 15,
                backgroundColor: 'rgba(15, 23, 42, 0.88)',
                backdropFilter: 'blur(10px)',
                borderRadius: 10,
                padding: '6px 12px',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: '#E2E8F0',
                fontSize: 11,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
                pointerEvents: 'auto',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontWeight: 700, color: '#38BDF8' }}>
                
                <span>Nhiệt {heatmapMode === 'STAFFING' ? 'Định biên' : heatmapMode === 'COVERAGE' ? 'Bao phủ' : 'Chấm công'}:</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: '#10B981' }} />
                <span>Đủ nhân sự</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: '#F59E0B' }} />
                <span>Thiếu</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: '#8B5CF6' }} />
                <span>Dư</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: '#64748B' }} />
                <span>Trống/Chưa rõ</span>
              </div>
            </div>
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
          <span>{dragValidationState.valid ? dragValidationState.message : dragValidationState.reason}</span>
        </div>
      )}

      {/* Bottom Temporal Timeline Controller */}
      {!planningMode&&!isExploreMode && (
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
          isDrawerOpen={false}
        />
      )}

      {/* Right Floating SaaS Inspector Drawer */}
      {!planningMode && designerOpen && canEditLayout && <StoreDesigner key={activeStoreId}
        storeId={activeStoreId} storeName={storeName} layout={layout} workstations={effectiveWorkstations}
        snapshot={designSnapshot} onSaved={acceptDesign} onClose={() => setDesignerOpen(false)}/>}
      <SpatialActionDialog open={!planningMode && isDrawerOpen && !infoSelection} title="Cảnh báo vận hành" className="se-alert-dialog" onClose={() => setIsDrawerOpen(false)}>
        {inspectorContent}
      </SpatialActionDialog>
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
