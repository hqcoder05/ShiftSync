/**
 * DigitalTwinCanvas.jsx
 * Master React Three Fiber Canvas for the ShiftSync 3D Store Digital Twin.
 * 
 * Architectural Highlights:
 * - Single active WebGL Canvas context across the entire Digital Twin workspace.
 * - Declarative scene composition integrating GLB environment, lighting, zones, workstations, and avatars.
 * - Dedicated sub-controllers for Camera transitions, First-Person walkthrough, Workstation dragging, and Simulation transfer.
 * - Zero double-rendering and zero parallel imperative render loops.
 */

import { useState, useRef, useEffect, useMemo } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import * as THREE from 'three';

import SceneLabels from './SceneLabels.jsx';
import WorldInfoCard from './WorldInfoCard.jsx';
import CafeFlowLayer from './CafeFlowLayer.jsx';
import DigitalTwinLighting from './DigitalTwinLighting.jsx';
import SteamParticles from './SteamParticles.jsx';
import CoffeeShopModel from './CoffeeShopModel.jsx';
import ZoneVisualizationLayer from './ZoneVisualizationLayer.jsx';
import WorkstationLayer from './WorkstationLayer.jsx';
import AvatarLayer from './AvatarLayer.jsx';
import OverviewCameraController from './OverviewCameraController.jsx';
import FirstPersonController from './FirstPersonController.jsx';

import { WorkstationDragController } from '../../interaction/WorkstationDragController.js';
import { DragTransfer } from '../../interaction/DragTransfer.js';
import { pickSceneEntity } from '../../utils/sceneSelection.js';
import { toThreeCoords } from '../../../../components/spatial/spatial.constants.js';

/**
 * Inner bridge component to access R3F context (gl, scene, camera)
 * and manage raycasting, workstation drag editing, and simulation drag-and-drop.
 */
function CanvasInteractionBridge({
  layout,
  zones,
  workstations,
  isExploreMode,
  isEditingLayout,
  isSimulating,
  simViewMode,
  avatarMeshes,
  workstationMeshes,
  onSelectStaff,
  onSelectZone,
  onSelectWorkstation,
  onWorkstationDraftMove,
  onSimulationTransfer,
  onSimulationValidationChange,
  cameraManagerRef,
  workstationDragControllerRef,
  dragTransferRef,
  setIsDraggingObject,
}) {
  const { gl, scene, camera } = useThree();

  // 1. Setup WorkstationDragController (Phase 2A)
  useEffect(() => {
    const controls = cameraManagerRef?.current?.getControls();

    const dragCtrl = new WorkstationDragController({
      domElement: gl.domElement,
      camera,
      scene,
      controls,
      layout,
      onSelect: (ws) => {
        onWorkstationDraftMove?.({ reset: true });
        if (typeof onSelectWorkstation === 'function') onSelectWorkstation(ws);
      },
      onDragStart: (ws) => {
        setIsDraggingObject(true);
        if (typeof onSelectWorkstation === 'function') onSelectWorkstation(ws);
      },
      onDragMove: (ws, targetCoords, isValid, collision) => {
        if (typeof onWorkstationDraftMove === 'function') {
          onWorkstationDraftMove({ ws, targetCoords, isValid, collision });
        }
      },
      onDragEnd: (ws, targetCoords) => {
        setIsDraggingObject(false);
        if (typeof onWorkstationDraftMove === 'function') {
          onWorkstationDraftMove({ ws, targetCoords, isEnd: true });
        }
      },
      onValidationChange: (val) => {
        if (typeof onWorkstationDraftMove === 'function') {
          onWorkstationDraftMove({ collision: val.collision });
        }
      },
    });

    if (workstationDragControllerRef) {
      workstationDragControllerRef.current = dragCtrl;
    }

    return () => {
      dragCtrl.dispose();
      if (workstationDragControllerRef) {
        workstationDragControllerRef.current = null;
      }
    };
  }, [gl.domElement, layout?.length, layout?.width]);

  // Synchronize WorkstationDragController state & meshes
  useEffect(() => {
    const dragCtrl = workstationDragControllerRef?.current;
    if (!dragCtrl) return;

    dragCtrl.camera = camera;
    dragCtrl.controls = cameraManagerRef?.current?.getControls();
    dragCtrl.setEnabled(isEditingLayout && !isSimulating && !isExploreMode);
    dragCtrl.updateContext({
      workstationMeshes,
      workstations,
      layout,
    });
  }, [
    isEditingLayout,
    isSimulating,
    isExploreMode,
    workstationMeshes,
    workstations,
    layout,
    camera,
  ]);

  // 2. Setup DragTransfer (Mode D Simulation Room)
  useEffect(() => {
    const controls = cameraManagerRef?.current?.getControls();

    const dt = new DragTransfer({
      domElement: gl.domElement,
      camera,
      scene,
      controls,
      layout,
      toThreeCoords,
      onTransferComplete: (emp, targetZone) => {
        if (typeof onSimulationTransfer === 'function') onSimulationTransfer(emp, targetZone);
      },
      onValidationChange: (check, nearestZone) => {
        if (typeof onSimulationValidationChange === 'function') {
          onSimulationValidationChange(check, nearestZone);
        }
      },
      onDragStateChange: (isDragging) => {
        setIsDraggingObject(isDragging);
      },
    });

    if (dragTransferRef) {
      dragTransferRef.current = dt;
    }

    return () => {
      dt.detach();
      if (dragTransferRef) {
        dragTransferRef.current = null;
      }
    };
  }, [gl.domElement, layout?.length, layout?.width]);

  // Synchronize DragTransfer state & meshes
  useEffect(() => {
    const dt = dragTransferRef?.current;
    if (!dt) return;

    dt.camera = camera;
    dt.controls = cameraManagerRef?.current?.getControls();
    const active = isSimulating && simViewMode === 'after';
    dt.setEnabled(active);
    dt.updateContext({
      avatarMeshes,
      zones,
    });
  }, [isSimulating, simViewMode, avatarMeshes, zones, camera]);

  // 3. Pointer Raycast Click Handler for Entity Selection
  useEffect(() => {
    let startX = 0;
    let startY = 0;
    let pointerTravel = 0;
    let pointerWasLocked = false;
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onPointerDown = (e) => {
      startX = e.clientX;
      startY = e.clientY;
      pointerTravel = 0;
      pointerWasLocked = document.pointerLockElement === gl.domElement;
    };
    const onPointerMove = (e) => { if (e.buttons) pointerTravel += Math.hypot(e.movementX || 0, e.movementY || 0); };

    const onPointerUp = (e) => {
      if (workstationDragControllerRef?.current?.isDragging) return;
      if (dragTransferRef?.current?.isDragging) return;

      const dist = Math.hypot(e.clientX - startX, e.clientY - startY);
      if (dist > 6 || pointerTravel > 6) return; // Ignore orbit, mouse-look and object drags.

      const rect = gl.domElement.getBoundingClientRect();
      mouse.x = pointerWasLocked ? 0 : ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = pointerWasLocked ? 0 : -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const targets = [
        ...(avatarMeshes || []),
        ...(workstationMeshes || []),
        ...scene.children,
      ];
      const hits = raycaster.intersectObjects(targets, true);

      const selection = pickSceneEntity(hits);
      if (selection?.type === 'staff') {
        onSelectZone?.(selection.zone || null, { focus: false });
        onSelectWorkstation?.(null);
        onSelectStaff?.(selection.value);
      } else if (selection?.type === 'zone') {
        onSelectStaff?.(null);
        onSelectWorkstation?.(null);
        onSelectZone?.(selection.value, { focus: false });
      } else if (selection?.type === 'workstation') {
        const ws = selection.value;
        const parentZone = zones?.find(zone => zone.id === ws.zoneId);
        // Do not focus the parent zone: it would clear the workstation selection.
        onSelectZone?.(parentZone || null, { focus: false });
        onSelectStaff?.(null);
        onSelectWorkstation?.(ws);
        workstationDragControllerRef?.current?.selectWorkstation(ws);
      } else {
        onSelectZone?.(null);
        onSelectStaff?.(null);
        onSelectWorkstation?.(null);
        workstationDragControllerRef?.current?.clearSelection();
      }
    };

    const onDblClick = (e) => {
      if (isExploreMode) return;
      const rect = gl.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const targets = [
        ...(avatarMeshes || []),
        ...(workstationMeshes || []),
        ...scene.children,
      ];
      const hits = raycaster.intersectObjects(targets, true);
      if (hits.length > 0) {
        cameraManagerRef?.current?.setOrbitTarget?.(hits[0].point);
      }
    };

    const dom = gl.domElement;
    dom.addEventListener('pointerdown', onPointerDown);
    dom.addEventListener('pointermove', onPointerMove);
    dom.addEventListener('pointerup', onPointerUp);
    dom.addEventListener('dblclick', onDblClick);

    return () => {
      dom.removeEventListener('pointerdown', onPointerDown);
      dom.removeEventListener('pointermove', onPointerMove);
      dom.removeEventListener('pointerup', onPointerUp);
      dom.removeEventListener('dblclick', onDblClick);
    };
  }, [
    isExploreMode,
    avatarMeshes,
    workstationMeshes,
    zones,
    camera,
    gl.domElement,
    scene,
    cameraManagerRef,
  ]);

  return null;
}

export default function DigitalTwinCanvas({
  layout = { length: 24, width: 16, height: 6 },
  storeCategory = 'OTHER',
  zones = [],
  staff = [],
  viewZones = zones,
  workstations = [],
  workstationOccupancies = new Map(),
  layers = {
    showWalls: true,
    showFloor: true,
    showCeiling: false,
    showFurniture: true,
    showZones: true,
    showWorkstations: true,
    showStaff: true,
    showGeofence: false,
  },
  isXRayMode = false,
  heatmapMode = 'NONE',
  activeSkillFilter = 'ALL',
  zoneReqMap = {},
  selectedZone = null,
  selectedStaff = null,
  selectedWorkstation = null,
  onSelectZone = null,
  onPhysicalLayoutReady = null,
  onSelectStaff = null,
  onSelectWorkstation = null,
  isExploreMode = false,
  playerViewMode = 'first_person',
  onTogglePlayerView = null,
  onExitExplore = null,
  onTargetLockChange = null,
  onInteract = null,
  onPlayerStatusUpdate = null,
  initialLockTarget = null,
  isEditingLayout = false,
  onWorkstationDraftMove = null,
  cameraMode = 'OVERVIEW',
  cameraFocusTarget = null,
  onUserOrbitStart = null,
  isSimulating = false,
  simViewMode = 'after',
  onSimulationTransfer = null,
  onSimulationValidationChange = null,
  cameraManagerRef = null,
  workstationDragControllerRef = null,
  dragTransferRef = null,
  playerControllerRef = null,
  designDocument = null,
  infoSelection = null,
  onCloseInfo = null,
  onOpenInfoActions = null,
  infoActions = null,
  onBackInfo = null,
  onFocusInfo = null,
  currentShift = null,
  attendanceRecords = [],
  storeId = null,
  isOperationDialogOpen = false,
}) {
  const [modelData, setModelData] = useState(null);
  const [modelLoadState,setModelLoadState]=useState({status:'idle'});
  const [modelRetryKey,setModelRetryKey]=useState(0);
  const [avatarMeshes, setAvatarMeshes] = useState([]);
  const [workstationMeshes, setWorkstationMeshes] = useState([]);
  const [isDraggingObject, setIsDraggingObject] = useState(false);
  const [isInfoOffscreen, setIsInfoOffscreen] = useState(false);
  const infoAnchor = useRef(new THREE.Vector3());
  const reframeInfo = () => {
    const player = playerControllerRef?.current;
    if (!isExploreMode || !player) { onFocusInfo?.(); return; }
    player.lookAtTarget(infoAnchor.current);
  };
  const initialCamConfig = useMemo(() => {
    const storeLen = Number(layout?.length) || 24.0;
    const storeWid = Number(layout?.width) || 16.0;
    const maxDim = Math.max(storeLen, storeWid);
    return {
      position: [maxDim * 0.85, maxDim * 0.85, maxDim * 1.05],
      fov: 48,
      near: 0.1,
      far: 300,
    };
  }, [layout?.length, layout?.width]);
  const sceneContents = (<>
        {/* 1. Declarative Lighting Rig */}
        <DigitalTwinLighting layout={layout} />

        {/* 2. Environmental Model (GLB Coffee Shop with Procedural Fallback) */}
        <CoffeeShopModel
          layout={layout}
          useGLB={Boolean(designDocument) || String(storeCategory).toUpperCase() === 'FOOD_BEVERAGE'}
          designDocument={designDocument}
          layers={layers}
          isXRayMode={isXRayMode}
          onModelLoaded={setModelData}
          onLoadStateChange={setModelLoadState}
          retryKey={modelRetryKey}
        />

        {/* 3. Ambient Steam Particles */}
        <SteamParticles layout={layout} />

        {/* 4. Functional Zone Visualization & Heatmap Layer */}
        <ZoneVisualizationLayer
          hasStoreModel={Boolean(modelData?.isGlb)}
          modelRoot={modelData?.modelRoot}
          workstationMeshes={workstationMeshes}
          zones={zones}
          staff={staff}
          layout={layout}
          layers={layers}
          selectedZone={selectedZone}
          heatmapMode={heatmapMode}
          activeSkillFilter={activeSkillFilter}
          zoneReqMap={zoneReqMap}
          workstations={workstations}
        />

        {/* 5. Workstations Layer with Live Occupancy Tags */}
        <WorkstationLayer
          workstations={workstations}
          workstationOccupancies={workstationOccupancies}
          modelData={modelData}
          layout={layout}
          zones={zones}
          showWorkstations={layers?.showWorkstations !== false}
          showAttendance={layers?.showAttendance !== false}
          selectedWorkstation={selectedWorkstation}
          onWorkstationMeshesReady={setWorkstationMeshes}
          onPhysicalLayoutReady={onPhysicalLayoutReady}
        />

        <CafeFlowLayer modelRoot={modelData?.isGlb?modelData.modelRoot:null} workstationMeshes={workstationMeshes} visible={layers?.showZones!==false} />

        {/* 6. Staff Avatars Layer with Smooth Walking */}
        {(String(storeCategory).toUpperCase()!=='FOOD_BEVERAGE'||modelData?.isGlb||modelLoadState.status==='error')&&<AvatarLayer
          modelRoot={modelData?.modelRoot}
          workstationMeshes={workstationMeshes}
          workstations={workstations}
          staff={staff}
          zones={viewZones}
          layout={layout}
          selectedStaff={selectedStaff}
          showStaff={layers?.showStaff !== false}
          onAvatarMeshesReady={setAvatarMeshes}
        />}

        <SceneLabels activeInfoSelection={infoSelection} />
        {infoSelection && !isOperationDialogOpen && <WorldInfoCard key={`${infoSelection.type}/${infoSelection.id}`}
          selection={infoSelection} avatarMeshes={avatarMeshes} workstationMeshes={workstationMeshes}
          layout={layout} staff={staff} zones={viewZones} currentShift={currentShift}
          attendanceRecords={attendanceRecords} workstationOccupancies={workstationOccupancies}
          zoneReqMap={zoneReqMap} storeId={storeId} onClose={onCloseInfo} onActions={onOpenInfoActions}
          actions={infoActions} onBack={onBackInfo}
          onVisibilityChange={setIsInfoOffscreen} anchorRef={infoAnchor}/>}

        {isEditingLayout && <gridHelper args={[Math.max(layout.length || 24, layout.width || 16), Math.round(Math.max(layout.length || 24, layout.width || 16) * 4), '#a8a29e', '#d6d3d1']} position={[0, .035, 0]} />}
        {/* 7. Overview & Blueprint Camera Controller */}
        <OverviewCameraController
          layout={layout}
          cameraMode={cameraMode}
          cameraFocusTarget={cameraFocusTarget}
          isExploreMode={isExploreMode}
          isDraggingObject={isDraggingObject || isOperationDialogOpen}
          onUserOrbitStart={onUserOrbitStart}
          cameraManagerRef={cameraManagerRef}
        />

        {/* 8. First-Person 3D Walking & Sliding Collision Controller */}
        {isExploreMode && (
          <FirstPersonController
            layout={layout}
            zones={viewZones}
            staff={staff}
            workstations={workstations}
            modelData={modelData}
            avatarMeshes={avatarMeshes}
            workstationMeshes={workstationMeshes}
            playerViewMode={playerViewMode}
            onTogglePlayerView={onTogglePlayerView}
            onExitExplore={onExitExplore}
            onTargetLockChange={onTargetLockChange}
            onInteract={onInteract}
            onPlayerStatusUpdate={onPlayerStatusUpdate}
            initialLockTarget={initialLockTarget}
            playerControllerRef={playerControllerRef}
            paused={Boolean(infoSelection) || isOperationDialogOpen}
          />
        )}

        {/* 9. Interaction Bridge (Workstation dragging, raycasting selection, simulation transfers) */}
        <CanvasInteractionBridge
          layout={layout}
          zones={zones}
          workstations={workstations}
          isExploreMode={isExploreMode}
          isEditingLayout={isEditingLayout}
          isSimulating={isSimulating}
          simViewMode={simViewMode}
          avatarMeshes={avatarMeshes}
          workstationMeshes={workstationMeshes}
          selectedWorkstation={selectedWorkstation}
          onSelectStaff={onSelectStaff}
          onSelectZone={onSelectZone}
          onSelectWorkstation={onSelectWorkstation}
          onWorkstationDraftMove={onWorkstationDraftMove}
          onSimulationTransfer={onSimulationTransfer}
          onSimulationValidationChange={onSimulationValidationChange}
          cameraManagerRef={cameraManagerRef}
          workstationDragControllerRef={workstationDragControllerRef}
          dragTransferRef={dragTransferRef}
          setIsDraggingObject={setIsDraggingObject}
        />
  </>);

  return (
    <div className="se-webgl-surface" aria-busy={modelLoadState.status==='loading'}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      <Canvas
        shadows={{ type: THREE.PCFShadowMap }}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
        }}
        camera={initialCamConfig}
        dpr={[1, 2]}
        style={{
          width: '100%',
          height: '100%',
          position: 'absolute',
          top: 0,
          left: 0,
        }}
      >
        {sceneContents}
      </Canvas>
      {infoSelection && isInfoOffscreen && !isOperationDialogOpen && <button type="button" className="se-info-reframe se-button" onClick={reframeInfo}>Đưa đối tượng vào khung nhìn</button>}
      {modelLoadState.status==='loading'&&<div role="status" className="se-model-status">Đang tải mô hình cửa hàng 3D…</div>}
      {modelLoadState.status==='error'&&<div role="alert" className="se-model-status">Không tải được mô hình chi tiết. Đang dùng mô hình đơn giản. <button type="button" onClick={()=>setModelRetryKey(key=>key+1)}>Thử tải lại mô hình</button></div>}
    </div>
  );
}
