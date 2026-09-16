/**
 * SpatialToolbar.jsx
 * Enterprise SaaS top floating toolbar with Camera Presets, X-Ray Mode,
 * Layer Management Popover, Workforce Heatmap Selector, and Explore Mode launcher.
 */

import { useState } from 'react';
import {
  Compass,
  RotateCcw,
  Layers,
  MapPin,
  Users,
  Grid,
  Box,
  PanelRightClose,
  PanelRightOpen,
  Eye,
  Footprints,
  Activity,
  Flame,
  Check,
  VideoOff,
  FlaskConical,
  Undo2,
  Redo2,
  GraduationCap,
} from 'lucide-react';

export default function SpatialToolbar({
  storeName = 'Chi nhánh cửa hàng',
  layout = { length: 24, width: 16 },
  zonesCount = 0,
  staffCount = 0,
  currentMode = 'OVERVIEW',
  onResetCamera,
  onTopDownCamera,
  onIsometricCamera,
  onOverviewCamera,
  onToggle2D,
  is2DView = false,
  onEnterExplore,
  isExploreMode = false,
  isSimulating = false,
  simulationDiffCount = 0,
  onToggleSimulation,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  activeSkillFilter = 'ALL',
  onSelectSkillFilter,
  skills = [],
  isFollowingEmployee = false,
  onStopFollowEmployee,
  followingStaffName = '',
  // X-Ray Mode
  isXRayMode = false,
  onToggleXRay,
  // Layer toggles
  layers = {
    showFloor: true,
    showWalls: true,
    showCeiling: true,
    showFurniture: true,
    showZones: true,
    showStaff: true,
    showFlow: true,
  },
  onToggleLayer,
  // Heatmap mode
  heatmapMode = 'STAFFING',
  onChangeHeatmapMode,
  // Drawer
  isDrawerOpen = true,
  onToggleDrawer,
}) {
  const storeArea = Math.round((layout.length || 24) * (layout.width || 16));
  const [showLayerMenu, setShowLayerMenu] = useState(false);
  const [showHeatmapMenu, setShowHeatmapMenu] = useState(false);

  return (
    <div
      style={{
        position: 'absolute',
        top: 14,
        left: 14,
        right: isDrawerOpen ? 362 : 14,
        transition: 'right 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        zIndex: 20,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        pointerEvents: 'none',
      }}
    >


      {/* Center: Camera Presets & Follow Indicator */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          pointerEvents: 'auto',
          backgroundColor: 'rgba(255, 255, 255, 0.94)',
          backdropFilter: 'blur(12px)',
          padding: '4px 6px',
          borderRadius: 12,
          border: '1px solid #E2E8F0',
          boxShadow: '0 4px 16px rgba(15, 23, 42, 0.08)',
        }}
      >
        {isFollowingEmployee ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '4px 10px',
              borderRadius: 8,
              backgroundColor: '#ECFDF5',
              border: '1px solid #A7F3D0',
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 700, color: '#047857' }}>
              🎥 Đang theo dõi: {followingStaffName || 'Nhân viên'}
            </span>
            <button
              type="button"
              onClick={onStopFollowEmployee}
              style={{
                border: 'none',
                background: '#047857',
                color: '#FFF',
                padding: '2px 6px',
                borderRadius: 5,
                fontSize: 10.5,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Hủy
            </button>
          </div>
        ) : (
          <>
            {/* Mode A: Toàn cảnh */}
            <button
              id="btn-mode-overview"
              type="button"
              onClick={onOverviewCamera}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '6px 11px',
                borderRadius: 8,
                border: 'none',
                backgroundColor: !is2DView && !isExploreMode && !isSimulating ? '#0F172A' : 'transparent',
                color: !is2DView && !isExploreMode && !isSimulating ? '#FFFFFF' : '#475569',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              title="Góc nhìn 3D toàn cảnh cửa hàng"
            >
              <Compass size={14} />
              Toàn cảnh
            </button>

            {/* Mode B: Mặt bằng (2D/2.5D) */}
            <button
              id="btn-mode-floorplan"
              type="button"
              onClick={onToggle2D}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '6px 11px',
                borderRadius: 8,
                border: 'none',
                backgroundColor: is2DView ? '#0F172A' : 'transparent',
                color: is2DView ? '#FFFFFF' : '#475569',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              title="Sơ đồ kiến trúc mặt bằng 2D/2.5D"
            >
              <Layers size={14} />
              Mặt bằng
            </button>

            {/* Mode C: Tham quan 3D */}
            <button
              id="btn-enter-explore"
              type="button"
              onClick={onEnterExplore}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '6px 12px',
                borderRadius: 8,
                border: isExploreMode ? '1px solid #0284C7' : '1px solid rgba(56, 189, 248, 0.4)',
                backgroundColor: isExploreMode ? '#0284C7' : '#0F172A',
                color: isExploreMode ? '#FFFFFF' : '#38BDF8',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(15, 23, 42, 0.12)',
                transition: 'all 0.15s ease',
              }}
              title="Khám phá nhập vai đi lại bằng WASD"
            >
              <Footprints size={14} color={isExploreMode ? '#FFFFFF' : '#38BDF8'} />
              Tham quan 3D
            </button>


            {/* Undo / Redo in Simulation Room */}
            {isSimulating && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginLeft: 2 }}>
                <button
                  type="button"
                  id="btn-simulation-undo"
                  onClick={onUndo}
                  disabled={!canUndo}
                  style={{
                    padding: '6px 8px',
                    borderRadius: 7,
                    border: '1px solid #E2E8F0',
                    backgroundColor: canUndo ? '#FFFFFF' : '#F1F5F9',
                    color: canUndo ? '#0F172A' : '#94A3B8',
                    cursor: canUndo ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 3,
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                  title="Hoàn tác thay đổi vừa thực hiện (Ctrl+Z)"
                >
                  <Undo2 size={13} />
                  <span>Undo</span>
                </button>

                <button
                  type="button"
                  id="btn-simulation-redo"
                  onClick={onRedo}
                  disabled={!canRedo}
                  style={{
                    padding: '6px 8px',
                    borderRadius: 7,
                    border: '1px solid #E2E8F0',
                    backgroundColor: canRedo ? '#FFFFFF' : '#F1F5F9',
                    color: canRedo ? '#0F172A' : '#94A3B8',
                    cursor: canRedo ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 3,
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                  title="Làm lại thay đổi vừa hủy (Ctrl+Y)"
                >
                  <Redo2 size={13} />
                  <span>Redo</span>
                </button>
              </div>
            )}

            {/* Mode D: Phòng thử nghiệm */}
            <button
              id="btn-mode-simulation"
              type="button"
              onClick={onToggleSimulation}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '6px 12px',
                borderRadius: 8,
                border: isSimulating ? '1.5px solid #F59E0B' : '1px solid #E2E8F0',
                backgroundColor: isSimulating ? '#FEF3C7' : '#F8FAFC',
                color: isSimulating ? '#B45309' : '#334155',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              title="Môi trường Sandbox thử nghiệm điều chuyển & tối ưu nhân sự"
            >
              <FlaskConical size={14} color={isSimulating ? '#D97706' : '#64748B'} />
              <span>Phòng thử nghiệm</span>
              {isSimulating && simulationDiffCount > 0 && (
                <span
                  style={{
                    backgroundColor: '#F59E0B',
                    color: '#FFFFFF',
                    borderRadius: 999,
                    padding: '0 5px',
                    fontSize: 10,
                    fontWeight: 800,
                    lineHeight: '14px',
                  }}
                >
                  {simulationDiffCount}
                </span>
              )}
            </button>
          </>
        )}

        <div style={{ width: 1, height: 18, backgroundColor: '#E2E8F0', margin: '0 4px' }} />

        {/* X-Ray Mode Toggle Button */}
        <button
          id="btn-toggle-xray"
          type="button"
          onClick={onToggleXRay}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '6px 10px',
            borderRadius: 8,
            border: isXRayMode ? '1px solid #38BDF8' : '1px solid #E2E8F0',
            backgroundColor: isXRayMode ? '#0F172A' : '#F8FAFC',
            color: isXRayMode ? '#38BDF8' : '#334155',
            fontSize: 11.5,
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          title="Bật/Tắt chế độ X-Ray nhìn xuyên tường"
        >
          <span>👁️</span>
          X-Ray
        </button>

        <button
          id="btn-reset-camera"
          type="button"
          onClick={onResetCamera}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '6px 9px',
            borderRadius: 8,
            border: 'none',
            backgroundColor: 'transparent',
            color: '#64748B',
            fontSize: 11.5,
            fontWeight: 500,
            cursor: 'pointer',
          }}
          title="Đặt lại camera về ban đầu"
        >
          <RotateCcw size={13} />
          Reset
        </button>
      </div>

      {/* Right: Heatmap, Layers Popover & Drawer Toggle */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          pointerEvents: 'auto',
          position: 'relative',
        }}
      >

        {/* Skill Layer Selector */}
        {skills && skills.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              backgroundColor: activeSkillFilter !== 'ALL' ? '#ECFEFF' : '#FFFFFF',
              border: activeSkillFilter !== 'ALL' ? '1.5px solid #06B6D4' : '1px solid #E2E8F0',
              borderRadius: 12,
              padding: '2px 8px',
              boxShadow: '0 4px 16px rgba(15, 23, 42, 0.08)',
            }}>
              <GraduationCap size={14} color={activeSkillFilter !== 'ALL' ? '#0891B2' : '#64748B'} />
              <select
                id="select-skill-filter"
                value={activeSkillFilter}
                onChange={(e) => onSelectSkillFilter?.(e.target.value)}
                style={{
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: activeSkillFilter !== 'ALL' ? '#0E7490' : '#334155',
                  fontSize: 11.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: '4px 2px',
                  outline: 'none',
                }}
                title="Lớp trực quan hóa Kỹ năng (Skill Layer)"
              >
                <option value="ALL">Tất cả Kỹ năng</option>
                {skills.map((s) => (
                  <option key={s.id || s.name} value={s.name || s.id}>
                    Kỹ năng: {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Heatmap Selector */}
        <div style={{ position: 'relative' }}>
          <button
            id="btn-toggle-heatmap"
            type="button"
            onClick={() => {
              setShowHeatmapMenu(!showHeatmapMenu);
              setShowLayerMenu(false);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '7px 11px',
              borderRadius: 12,
              border: '1px solid #E2E8F0',
              backgroundColor: heatmapMode !== 'STAFFING' ? '#0F172A' : '#FFFFFF',
              color: heatmapMode !== 'STAFFING' ? '#38BDF8' : '#334155',
              fontSize: 11.5,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(15, 23, 42, 0.08)',
            }}
            title="Chọn chế độ biểu diễn sa bàn nhiệt"
          >
            <Flame size={14} />
            <span>Nhiệt: {heatmapMode === 'STAFFING' ? 'Định biên' : heatmapMode === 'COVERAGE' ? 'Bao phủ' : 'Chấm công'}</span>
          </button>

          {showHeatmapMenu && (
            <div
              style={{
                position: 'absolute',
                top: 44,
                right: 0,
                width: 170,
                backgroundColor: '#FFFFFF',
                borderRadius: 12,
                border: '1px solid #E2E8F0',
                boxShadow: '0 10px 25px rgba(15, 23, 42, 0.14)',
                padding: '6px',
                display: 'flex',
                flexDirection: 'column',
                gap: 3,
                zIndex: 35,
              }}
            >
              {[
                { id: 'STAFFING', label: '👥 Lấp đầy định biên' },
                { id: 'COVERAGE', label: '🛡️ Tỷ lệ bao phủ SLA' },
                { id: 'ATTENDANCE', label: '⏱️ Trạng thái chấm công' },
                { id: 'WORKLOAD', label: '📈 Tải giờ cao điểm' },
              ].map((hm) => (
                <button
                  key={hm.id}
                  type="button"
                  onClick={() => {
                    onChangeHeatmapMode?.(hm.id);
                    setShowHeatmapMenu(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '7px 10px',
                    borderRadius: 8,
                    border: 'none',
                    backgroundColor: heatmapMode === hm.id ? '#ECFDF5' : 'transparent',
                    color: heatmapMode === hm.id ? '#047857' : '#334155',
                    fontSize: 11.5,
                    fontWeight: heatmapMode === hm.id ? 700 : 500,
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <span>{hm.label}</span>
                  {heatmapMode === hm.id && <Check size={13} color="#047857" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Layers Popover */}
        <div style={{ position: 'relative' }}>
          <button
            id="btn-toggle-layers"
            type="button"
            onClick={() => {
              setShowLayerMenu(!showLayerMenu);
              setShowHeatmapMenu(false);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '7px 11px',
              borderRadius: 12,
              border: '1px solid #E2E8F0',
              backgroundColor: '#FFFFFF',
              color: '#334155',
              fontSize: 11.5,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(15, 23, 42, 0.08)',
            }}
            title="Bật/Tắt các lớp hiển thị"
          >
            <Layers size={14} />
            <span>Lớp (Layers)</span>
          </button>

          {showLayerMenu && (
            <div
              style={{
                position: 'absolute',
                top: 44,
                right: 0,
                width: 200,
                backgroundColor: '#FFFFFF',
                borderRadius: 12,
                border: '1px solid #E2E8F0',
                boxShadow: '0 10px 25px rgba(15, 23, 42, 0.14)',
                padding: '8px',
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                zIndex: 35,
              }}
            >
              <span style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', padding: '2px 8px', textTransform: 'uppercase' }}>
                Quản lý lớp hiển thị
              </span>

              {[
                { key: 'showFloor', label: '🏁 Mặt sàn & Phân vùng' },
                { key: 'showWalls', label: '🧱 Tường & Cửa sổ' },
                { key: 'showCeiling', label: '💡 Trần & Đèn rọi' },
                { key: 'showFurniture', label: '🪑 Quầy kệ & Thiết bị' },
                { key: 'showZones', label: '📍 Phân khu & Nhãn 3D' },
                { key: 'showStaff', label: '👤 Nhân sự 3D' },
                { key: 'showFlow', label: '〰️ Luồng di chuyển' },
                { key: 'showGeofence', label: '🌐 Vòng bán kính Geofence' },
              ].map((ly) => {
                const isActive = layers[ly.key];
                return (
                  <button
                    key={ly.key}
                    type="button"
                    onClick={() => onToggleLayer?.(ly.key)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '6px 10px',
                      borderRadius: 8,
                      border: 'none',
                      backgroundColor: isActive ? '#F8FAFC' : 'transparent',
                      color: isActive ? '#0F172A' : '#94A3B8',
                      fontSize: 12,
                      fontWeight: isActive ? 600 : 500,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <span>{ly.label}</span>
                    <span
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: 4,
                        border: isActive ? 'none' : '1px solid #CBD5E1',
                        backgroundColor: isActive ? '#10B981' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {isActive && <Check size={11} color="#FFF" />}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Drawer Toggle */}
        <button
          type="button"
          onClick={onToggleDrawer}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 36,
            height: 36,
            borderRadius: 12,
            border: '1px solid #E2E8F0',
            backgroundColor: isDrawerOpen ? '#0F172A' : '#FFFFFF',
            color: isDrawerOpen ? '#FFFFFF' : '#475569',
            boxShadow: '0 4px 16px rgba(15, 23, 42, 0.08)',
            cursor: 'pointer',
          }}
          title={isDrawerOpen ? 'Đóng bảng chi tiết' : 'Mở bảng chi tiết'}
        >
          {isDrawerOpen ? <PanelRightClose size={17} /> : <PanelRightOpen size={17} />}
        </button>
      </div>
    </div>
  );
}
