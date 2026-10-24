import { useEffect, useRef, useState } from 'react';
import { Compass, MapPin, Box, Layers, Users, Armchair, Activity, PanelRightOpen, PanelRightClose, RotateCcw, Footprints, Wrench, Eye, Undo2, Redo2, FlaskConical } from 'lucide-react';
import './store-explorer.css';

export default function SpatialToolbar({
 storeName = 'Cửa hàng', zonesCount = 0, staffCount = 0, currentMode = 'OVERVIEW',
 selectedZone, selectedWorkstation, onFocusSelectedZone, onFocusSelectedWorkstation,
 onResetCamera, onTopDownCamera, onOverviewCamera, onToggle2D, is2DView = false,
 onEnterExplore, isExploreMode = false, isSimulating = false, simulationDiffCount = 0,
 onToggleSimulation, onUndo, onRedo, canUndo = false, canRedo = false,
 activeSkillFilter = 'ALL', onSelectSkillFilter, skills = [], isFollowingEmployee = false,
 onStopFollowEmployee, followingStaffName, isXRayMode = false, onToggleXRay,
 layers = {}, onToggleLayer, heatmapMode = 'STAFFING', onChangeHeatmapMode,
 isEditingLayout = false, onToggleLayoutEditor, onOpenDesigner, canEditLayout = false,
 onFocusWorkstationAsset, isDrawerOpen = true, onToggleDrawer,
}) {
 const [advanced, setAdvanced] = useState(false);
 const root = useRef(null);
 useEffect(() => {
  const close = event => { if (!root.current?.contains(event.target)) setAdvanced(false); };
  const escape = event => { if (event.key === 'Escape') setAdvanced(false); };
  document.addEventListener('pointerdown', close); document.addEventListener('keydown', escape);
  return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', escape); };
 }, []);
 const modeButton = (id, label, Icon, active, handler, disabled = false, title = label) =>
  <button key={id} id={id} type="button" className="se-button" aria-pressed={active} disabled={disabled} onClick={handler} title={title}><Icon size={15}/><span>{label}</span></button>;
 return <div ref={root} className={`se-toolbar ${isDrawerOpen ? 'se-toolbar--docked' : ''}`} aria-label="Công cụ cửa hàng">
  <div className="se-camera-row" role="group" aria-label="Góc nhìn camera">
   {modeButton('btn-mode-overview', 'Toàn cảnh', Compass, !is2DView && !isExploreMode && currentMode === 'OVERVIEW', onOverviewCamera)}
   {modeButton('btn-mode-zone', 'Khu vực', MapPin, !is2DView && currentMode === 'FOCUS_ZONE', onFocusSelectedZone, !selectedZone, selectedZone ? `Xem ${selectedZone.name}` : 'Chọn khu vực để tập trung camera')}
   {modeButton('btn-mode-workstation', 'Trạm', Box, !is2DView && currentMode === 'FOCUS_WORKSTATION', onFocusSelectedWorkstation, !selectedWorkstation, selectedWorkstation ? `Xem ${selectedWorkstation.name}` : 'Chọn trạm để tập trung camera')}
   {modeButton('btn-mode-topdown', 'Mặt bằng 3D', Layers, !is2DView && currentMode === 'TOP_DOWN', onTopDownCamera)}
   {modeButton('btn-mode-floorplan', 'Sơ đồ 2D', MapPin, is2DView, onToggle2D)}
   {modeButton('btn-enter-explore', 'Tham quan 3D', Footprints, isExploreMode, onEnterExplore)}
   {onOpenDesigner && <button type="button" className="se-button" onClick={onOpenDesigner}><Wrench size={15}/>Thiết kế cửa hàng</button>}
   <button type="button" className="se-icon-button" onClick={onResetCamera} aria-label="Đặt lại góc nhìn"><RotateCcw size={16}/></button>
  </div>
  <div className="se-layer-row" role="group" aria-label="Lớp hiển thị chính">
   {[['showFurniture','Nội thất',Armchair],['showStaff','Nhân sự',Users],['showAttendance','Điểm danh',Activity]].map(([key,label,Icon]) => <button key={key} type="button" className="se-button se-layer" aria-pressed={layers[key] !== false} onClick={() => onToggleLayer?.(key)}><Icon size={14}/>{label}<span className="se-switch" aria-hidden="true"/></button>)}
   <button id="btn-toggle-layers" type="button" className="se-button" aria-expanded={advanced} onClick={() => setAdvanced(value => !value)}><Layers size={14}/>Tùy chọn</button>
  </div>
  {isFollowingEmployee && <div className="se-follow" role="status">Đang theo dõi {followingStaffName || 'nhân viên'}<button type="button" onClick={onStopFollowEmployee}>Dừng theo dõi</button></div>}
  {advanced && <div className="se-options" aria-label="Tùy chọn không gian">
   <fieldset><legend>Lớp không gian</legend>{[['showFloor','Mặt sàn'],['showWalls','Tường'],['showCeiling','Trần'],['showWorkstations','Trạm làm việc'],['showZones','Nhãn khu vực'],['showFlow','Luồng di chuyển'],['showGeofence','Vùng chấm công']].map(([key,label]) => <label key={key}><input type="checkbox" checked={Boolean(layers[key])} onChange={() => onToggleLayer?.(key)}/>{label}</label>)}</fieldset>
   <label className="se-field">Thông tin bản đồ<select value={heatmapMode} onChange={event => onChangeHeatmapMode?.(event.target.value)}><option value="STAFFING">Phân bổ nhân sự</option><option value="COVERAGE">Tỷ lệ bao phủ</option><option value="ATTENDANCE">Điểm danh</option><option value="WORKLOAD">Tải công việc</option></select></label>
   <label className="se-field">Lọc kỹ năng<select value={activeSkillFilter} onChange={event => onSelectSkillFilter?.(event.target.value)}><option value="ALL">Tất cả kỹ năng</option>{skills.map(skill => <option key={skill.id || skill.name} value={skill.name}>{skill.name}</option>)}</select></label>
   <div className="se-option-actions">
    {modeButton('btn-xray', 'Xuyên tường', Eye, isXRayMode, onToggleXRay)}
    {canEditLayout && modeButton('btn-layout-editor', 'Bố trí trạm', Wrench, isEditingLayout, onToggleLayoutEditor)}
    {onFocusWorkstationAsset && <button type="button" className="se-button" onClick={onFocusWorkstationAsset}><Box size={14}/>Xem trạm 3D</button>}
    {onToggleSimulation && modeButton('btn-simulation', `Mô phỏng${isSimulating ? ` (${simulationDiffCount})` : ''}`, FlaskConical, isSimulating, onToggleSimulation)}
    {isSimulating && <><button type="button" className="se-button" disabled={!canUndo} onClick={onUndo}><Undo2 size={14}/>Hoàn tác</button><button type="button" className="se-button" disabled={!canRedo} onClick={onRedo}><Redo2 size={14}/>Làm lại</button></>}
   </div>
  </div>}
 </div>;
}
