import { useState, useMemo } from 'react';
import {
  Layers,
  Eye,
  Compass,
  RotateCcw,
  Zap,
  Users,
  Box,
  Navigation,
  X,
  Grid,
  Shield,
  Tag,
  PanelRightClose,
  PanelRightOpen,
  MapPin,
  TrendingUp,
  LayoutGrid,
} from 'lucide-react';
import { getZoneThemeColor, getCapacityState, calculateZoneDistance } from './spatial.constants';

/**
 * SpatialControlsOverlay
 * Enterprise 2.5D floating HUD overlay for the 3D Spatial Canvas:
 * - Top Toolbar: Store meta badge, camera angle presets, 2D blueprint toggle, drawer toggle.
 * - Right Side Detail Drawer:
 *   1. Zone Selected View: Elevation, capacity meter, coordinates, stationed staff.
 *   2. Employee Selected View: Initials avatar, role badge, assigned zone with 3D jump.
 *   3. Allocation Analysis View (when Algorithm active): Real 2D derived dispersion metrics.
 *   4. Store Summary Overview (when nothing selected): Footprint, KPI grid, zone quick jump.
 * - Bottom Bar: Layer toggles (Distances OFF by default), Max-Min trigger, minimalist legend.
 */
export default function SpatialControlsOverlay({
  // Layer Toggles
  showZones = true,
  setShowZones,
  showStaff = true,
  setShowStaff,
  showWorkstations = true,
  setShowWorkstations,
  showDistances = false,
  setShowDistances,
  showAlgorithm = false,
  setShowAlgorithm,
  showGrid = true,
  setShowGrid,
  showWalls = true,
  setShowWalls,
  showLabels = true,
  setShowLabels,

  // Camera Presets & 2D Toggle
  onResetCamera,
  onTopDownCamera,
  onIsometricCamera,
  onToggle2D,

  // Selection & Details
  selectedZone = null,
  onSelectZone,
  onClearSelectedZone,
  selectedStaff = null,
  onSelectStaff,
  onClearSelectedStaff,
  zones = [],
  staffList = [],

  // Algorithm Trigger
  onRunAlgorithm,
  isAllocating = false,

  // Store layout metadata
  layout = { length: 24, width: 16, height: 5 },
  storeName = 'Chi nhánh cửa hàng',
}) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(true);

  // Group staff by zone
  const staffByZone = useMemo(() => {
    const map = {};
    staffList.forEach((s) => {
      const zid = s.zoneId || s.zone?.id;
      if (zid) {
        if (!map[zid]) map[zid] = [];
        map[zid].push(s);
      }
    });
    return map;
  }, [staffList]);

  // Aggregate store stats
  const totalCapacity = useMemo(() => {
    return zones.reduce((sum, z) => sum + (z.capacity || 4), 0);
  }, [zones]);

  const utilizationPercent = totalCapacity > 0
    ? Math.min(100, Math.round((staffList.length / totalCapacity) * 100))
    : 0;

  // Derive real algorithm dispersion metrics across staffed zones (Section 20 & 21)
  const algorithmMetrics = useMemo(() => {
    const staffedZoneIds = new Set(staffList.map((s) => s.zoneId || s.zone?.id).filter(Boolean));
    const activeZonesList = zones.filter((z) => staffedZoneIds.has(z.id));

    if (activeZonesList.length < 2) {
      return {
        activeCount: activeZonesList.length,
        minDist: '—',
        avgDist: '—',
        coverageRating: 'Cần ≥ 2 phân khu để tính khoảng cách phân tán',
      };
    }

    let totalDist = 0;
    let pairs = 0;
    let minD = Infinity;

    for (let i = 0; i < activeZonesList.length; i++) {
      for (let j = i + 1; j < activeZonesList.length; j++) {
        const d = calculateZoneDistance(activeZonesList[i], activeZonesList[j]);
        totalDist += d;
        pairs++;
        if (d < minD) minD = d;
      }
    }

    const avgD = pairs > 0 ? (totalDist / pairs).toFixed(1) : '0.0';
    const minStr = minD !== Infinity ? minD.toFixed(1) : '0.0';

    return {
      activeCount: activeZonesList.length,
      minDist: `${minStr}m`,
      avgDist: `${avgD}m`,
      coverageRating: Number(minStr) >= 6.0 ? 'Độ phân tán tối ưu' : 'Độ phân tán cục bộ',
    };
  }, [zones, staffList]);

  // Currently selected zone's staff
  const currentZoneStaff = selectedZone ? staffByZone[selectedZone.id] || [] : [];
  const selectedZoneCapState = selectedZone
    ? getCapacityState(currentZoneStaff.length, selectedZone.capacity || 4)
    : 'EMPTY';

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        padding: 14,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        fontFamily: 'var(--ss-font, sans-serif)',
        zIndex: 10,
        boxSizing: 'border-box',
      }}
    >
      {/* ── TOP BAR: STORE TITLE, CAMERA CONTROLS & 2D SCHEMATIC ── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 12,
        }}
      >
        {/* Store Title Badge */}
        <div
          style={{
            pointerEvents: 'auto',
            backgroundColor: 'rgba(255, 255, 255, 0.94)',
            backdropFilter: 'blur(12px)',
            padding: '8px 14px',
            borderRadius: 10,
            border: '1px solid #E2E8F0',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: '#0F172A',
              display: 'flex',
              alignItems: 'center',
              gap: 7,
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                backgroundColor: '#10B981',
                boxShadow: '0 0 0 2px rgba(16, 185, 129, 0.2)',
              }}
            />
            <span>{storeName}</span>
          </div>
          <div style={{ fontSize: 11, color: '#64748B', fontWeight: 500 }}>
            {layout.length || 24}m × {layout.width || 16}m • Cao {layout.height || 5}m (
            {Math.round((layout.length || 24) * (layout.width || 16))}m²)
          </div>
        </div>

        {/* Camera Presets, 2D Blueprint & Drawer Toggle */}
        <div
          style={{
            pointerEvents: 'auto',
            backgroundColor: 'rgba(255, 255, 255, 0.94)',
            backdropFilter: 'blur(12px)',
            padding: 5,
            borderRadius: 10,
            border: '1px solid #E2E8F0',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          {onToggle2D && (
            <button
              type="button"
              onClick={onToggle2D}
              title="Chuyển sang Mặt bằng 2D SVG trực quan"
              style={{
                padding: '6px 10px',
                borderRadius: 6,
                border: '1px solid #E2E8F0',
                backgroundColor: '#FFFFFF',
                color: '#0F172A',
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <LayoutGrid size={13} color="#0284C7" />
              <span>Sơ đồ 2D</span>
            </button>
          )}

          <button
            type="button"
            onClick={onIsometricCamera}
            title="Góc nhìn Isometric (3D Phối cảnh)"
            style={{
              padding: '6px 10px',
              borderRadius: 6,
              border: 'none',
              backgroundColor: '#F1F5F9',
              color: '#334155',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <Compass size={13} color="#475569" />
            <span>3D Góc chéo</span>
          </button>

          <button
            type="button"
            onClick={onTopDownCamera}
            title="Góc nhìn từ trên xuống (Mặt bằng 2D)"
            style={{
              padding: '6px 10px',
              borderRadius: 6,
              border: 'none',
              backgroundColor: '#F1F5F9',
              color: '#334155',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <Layers size={13} color="#475569" />
            <span>Mặt bằng</span>
          </button>

          <button
            type="button"
            onClick={onResetCamera}
            title="Đặt lại góc nhìn mặc định"
            style={{
              padding: '6px 8px',
              borderRadius: 6,
              border: 'none',
              backgroundColor: '#F1F5F9',
              color: '#334155',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <RotateCcw size={13} color="#475569" />
          </button>

          <div style={{ width: 1, height: 18, backgroundColor: '#E2E8F0', margin: '0 2px' }} />

          {/* Drawer Toggle */}
          <button
            type="button"
            onClick={() => setIsDrawerOpen(!isDrawerOpen)}
            title={isDrawerOpen ? 'Thu gọn bảng chi tiết' : 'Mở bảng chi tiết'}
            style={{
              padding: '6px 10px',
              borderRadius: 6,
              border: isDrawerOpen ? '1px solid #10B981' : '1px solid transparent',
              backgroundColor: isDrawerOpen ? '#EEFAEB' : '#F1F5F9',
              color: isDrawerOpen ? '#047857' : '#334155',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            {isDrawerOpen ? <PanelRightClose size={13} /> : <PanelRightOpen size={13} />}
            <span>Chi tiết</span>
          </button>
        </div>
      </div>

      {/* ── RIGHT SIDE DETAIL DRAWER (SCREEN-SPACE UI) ── */}
      {isDrawerOpen && (
        <div
          style={{
            position: 'absolute',
            top: 60,
            right: 14,
            bottom: 60,
            width: 310,
            pointerEvents: 'auto',
            backgroundColor: 'rgba(255, 255, 255, 0.96)',
            backdropFilter: 'blur(16px)',
            borderRadius: 12,
            border: '1px solid #E2E8F0',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            animation: 'fadeIn 0.2s ease',
            zIndex: 20,
          }}
        >
          {/* VIEW 1: ZONE SELECTED VIEW */}
          {selectedZone && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
              <div
                style={{
                  padding: '12px 14px',
                  borderBottom: '1px solid #F1F5F9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: '#FAFAFA',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 3,
                      backgroundColor: getZoneThemeColor(selectedZone.name),
                    }}
                  />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>
                      {selectedZone.name}
                    </div>
                    <div style={{ fontSize: 10, color: '#64748B' }}>Chi tiết khu vực 3D</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClearSelectedZone}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    padding: 4,
                    color: '#64748B',
                    borderRadius: 4,
                  }}
                  title="Đóng chi tiết"
                >
                  <X size={14} />
                </button>
              </div>

              <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* Elevation Staging Pill */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 10px',
                    borderRadius: 8,
                    backgroundColor: (selectedZone.z || 0) > 0.5 ? '#EEF2FF' : '#F8FAFC',
                    border: `1px solid ${(selectedZone.z || 0) > 0.5 ? '#C7D2FE' : '#E2E8F0'}`,
                  }}
                >
                  <span style={{ fontSize: 11, color: '#475569', fontWeight: 500 }}>Cao độ (Z-axis):</span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: (selectedZone.z || 0) > 0.5 ? '#4338CA' : '#0F172A',
                    }}
                  >
                    {(selectedZone.z || 0) > 0.5 ? `Z +${selectedZone.z}m (Gác lửng)` : 'Tầng trệt (Z 0m)'}
                  </span>
                </div>

                {/* Capacity & Occupancy Card */}
                <div
                  style={{
                    backgroundColor: '#F8FAFC',
                    borderRadius: 8,
                    padding: 10,
                    border: '1px solid #E2E8F0',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 6,
                    }}
                  >
                    <span style={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>
                      Sức chứa định biên:
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: 4,
                        backgroundColor:
                          selectedZoneCapState === 'OVER'
                            ? '#FEF2F2'
                            : selectedZoneCapState === 'FULL'
                            ? '#ECFDF5'
                            : selectedZoneCapState === 'PARTIAL'
                            ? '#F0F9FF'
                            : '#F1F5F9',
                        color:
                          selectedZoneCapState === 'OVER'
                            ? '#DC2626'
                            : selectedZoneCapState === 'FULL'
                            ? '#059669'
                            : selectedZoneCapState === 'PARTIAL'
                            ? '#0284C7'
                            : '#64748B',
                      }}
                    >
                      {selectedZoneCapState === 'OVER'
                        ? 'QUÁ TẢI'
                        : selectedZoneCapState === 'FULL'
                        ? 'ĐỦ ĐỊNH BIÊN'
                        : selectedZoneCapState === 'PARTIAL'
                        ? 'MỘT PHẦN'
                        : 'TRỐNG'}
                    </span>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'baseline',
                      gap: 4,
                      fontSize: 18,
                      fontWeight: 700,
                      color: '#0F172A',
                      marginBottom: 6,
                    }}
                  >
                    <span>{currentZoneStaff.length}</span>
                    <span style={{ fontSize: 12, color: '#94A3B8', fontWeight: 500 }}>
                      / {selectedZone.capacity || 4} vị trí
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div
                    style={{
                      width: '100%',
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: '#E2E8F0',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${Math.min(
                          100,
                          (currentZoneStaff.length / (selectedZone.capacity || 4)) * 100
                        )}%`,
                        height: '100%',
                        backgroundColor:
                          selectedZoneCapState === 'OVER'
                            ? '#EF4444'
                            : selectedZoneCapState === 'FULL'
                            ? '#10B981'
                            : '#0284C7',
                        borderRadius: 3,
                        transition: 'width 0.2s ease',
                      }}
                    />
                  </div>
                </div>

                {/* Spatial Coordinates Card */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr',
                    gap: 6,
                    textAlign: 'center',
                  }}
                >
                  <div style={{ backgroundColor: '#F8FAFC', padding: '6px 4px', borderRadius: 6, border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: 9, color: '#64748B' }}>Dài (X)</div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#1E293B' }}>{selectedZone.x}m</div>
                  </div>
                  <div style={{ backgroundColor: '#F8FAFC', padding: '6px 4px', borderRadius: 6, border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: 9, color: '#64748B' }}>Rộng (Y)</div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#1E293B' }}>{selectedZone.y}m</div>
                  </div>
                  <div style={{ backgroundColor: '#F8FAFC', padding: '6px 4px', borderRadius: 6, border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: 9, color: '#64748B' }}>Cao (Z)</div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#1E293B' }}>{selectedZone.z || 0}m</div>
                  </div>
                </div>

                {/* Stationed Staff List */}
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: '#334155',
                      marginBottom: 8,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span>Nhân sự trong khu vực:</span>
                    <span style={{ fontSize: 10, color: '#64748B' }}>{currentZoneStaff.length} người</span>
                  </div>

                  {currentZoneStaff.length === 0 ? (
                    <div
                      style={{
                        padding: '16px 10px',
                        textAlign: 'center',
                        backgroundColor: '#F8FAFC',
                        borderRadius: 8,
                        border: '1px dashed #CBD5E1',
                        fontSize: 11,
                        color: '#94A3B8',
                      }}
                    >
                      Chưa có nhân sự trong khu vực này
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {currentZoneStaff.map((emp, idx) => {
                        const name = emp.staffName || emp.fullName || 'Nhân viên';
                        const role = emp.skillName || emp.role || 'Nhân sự';
                        const initials = name
                          .trim()
                          .split(/\s+/)
                          .slice(-2)
                          .map((w) => w[0])
                          .join('')
                          .toUpperCase() || 'NV';

                        return (
                          <div
                            key={emp.id || idx}
                            onClick={() => onSelectStaff?.(emp)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '6px 8px',
                              borderRadius: 6,
                              backgroundColor: '#FFFFFF',
                              border: '1px solid #E2E8F0',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span
                                style={{
                                  width: 22,
                                  height: 22,
                                  borderRadius: '50%',
                                  backgroundColor: getZoneThemeColor(selectedZone.name),
                                  color: '#FFFFFF',
                                  fontSize: 9,
                                  fontWeight: 700,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                {initials}
                              </span>
                              <div>
                                <div style={{ fontSize: 11, fontWeight: 600, color: '#0F172A' }}>{name}</div>
                                <div style={{ fontSize: 9.5, color: '#64748B' }}>{role}</div>
                              </div>
                            </div>
                            <span style={{ fontSize: 9, color: '#10B981', fontWeight: 600 }}>● Xem</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* VIEW 2: EMPLOYEE SELECTED VIEW */}
          {selectedStaff && !selectedZone && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
              <div
                style={{
                  padding: '12px 14px',
                  borderBottom: '1px solid #F1F5F9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: '#FAFAFA',
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>Chi tiết Phân công</div>
                <button
                  type="button"
                  onClick={onClearSelectedStaff}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    padding: 4,
                    color: '#64748B',
                  }}
                  title="Đóng chi tiết"
                >
                  <X size={14} />
                </button>
              </div>

              <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* Avatar & Name */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: '50%',
                      backgroundColor: '#10B981',
                      color: '#FFF',
                      fontSize: 14,
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {(selectedStaff.staffName || selectedStaff.fullName || 'NV')
                      .trim()
                      .split(/\s+/)
                      .slice(-2)
                      .map((w) => w[0])
                      .join('')
                      .toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>
                      {selectedStaff.staffName || selectedStaff.fullName}
                    </div>
                    <div style={{ fontSize: 11, color: '#10B981', fontWeight: 600 }}>
                      {selectedStaff.skillName || selectedStaff.role || 'Nhân viên'}
                    </div>
                  </div>
                </div>

                {/* Assigned Zone Information */}
                <div
                  style={{
                    backgroundColor: '#F8FAFC',
                    padding: 10,
                    borderRadius: 8,
                    border: '1px solid #E2E8F0',
                  }}
                >
                  <div style={{ fontSize: 10, color: '#64748B', marginBottom: 4 }}>Khu vực phân bổ 3D:</div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: '#0F172A',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      marginBottom: 8,
                    }}
                  >
                    <MapPin size={13} color="#10B981" />
                    <span>{selectedStaff.zoneName || 'Theo thuật toán 3D'}</span>
                  </div>

                  {selectedStaff.zoneId && (
                    <button
                      type="button"
                      onClick={() => {
                        const targetZone = zones.find((z) => z.id === selectedStaff.zoneId);
                        if (targetZone) {
                          onSelectZone?.(targetZone);
                          onClearSelectedStaff?.();
                        }
                      }}
                      style={{
                        width: '100%',
                        padding: '6px 8px',
                        borderRadius: 6,
                        border: '1px solid #CBD5E1',
                        backgroundColor: '#FFFFFF',
                        color: '#0284C7',
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: 'pointer',
                        textAlign: 'center',
                      }}
                    >
                      Xem khu vực này trên mô hình 3D
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* VIEW 3: ALLOCATION ANALYSIS PANEL (WHEN ALGORITHM ACTIVE & NO ENTITY SELECTED) */}
          {showAlgorithm && !selectedZone && !selectedStaff && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
              <div
                style={{
                  padding: '12px 14px',
                  borderBottom: '1px solid #FDE68A',
                  backgroundColor: '#FFFBEB',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <div style={{ width: 24, height: 24, borderRadius: 6, backgroundColor: '#F59E0B', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Zap size={14} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#92400E' }}>Phân tích Phân bổ 3D</div>
                  <div style={{ fontSize: 10, color: '#B45309' }}>Greedy Max-Min Dispersion</div>
                </div>
              </div>

              <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* Algorithm Purpose Card */}
                <div
                  style={{
                    backgroundColor: '#F8FAFC',
                    padding: 10,
                    borderRadius: 8,
                    border: '1px solid #E2E8F0',
                    fontSize: 11,
                    lineHeight: 1.45,
                    color: '#475569',
                  }}
                >
                  <strong style={{ color: '#0F172A', display: 'block', marginBottom: 2 }}>Mục tiêu giải thuật:</strong>
                  Tự động phân bổ nhân sự vào các phân khu có khoảng cách Euclidean không gian 3D lớn nhất so với các khu đã xếp, đảm bảo độ phủ tối ưu và tránh quá tải tập trung.
                </div>

                {/* Derived Mathematical Metrics Grid (Section 21) */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div style={{ backgroundColor: '#F8FAFC', padding: 10, borderRadius: 8, border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: 10, color: '#64748B', fontWeight: 600 }}>KHOẢNG CÁCH MIN</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#D97706', marginTop: 2 }}>
                      {algorithmMetrics.minDist}
                    </div>
                  </div>

                  <div style={{ backgroundColor: '#F8FAFC', padding: 10, borderRadius: 8, border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: 10, color: '#64748B', fontWeight: 600 }}>KHOẢNG CÁCH TB</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#0284C7', marginTop: 2 }}>
                      {algorithmMetrics.avgDist}
                    </div>
                  </div>

                  <div style={{ backgroundColor: '#F8FAFC', padding: 10, borderRadius: 8, border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: 10, color: '#64748B', fontWeight: 600 }}>KHU VỰC PHÂN BỔ</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', marginTop: 2 }}>
                      {algorithmMetrics.activeCount} <span style={{ fontSize: 10, color: '#94A3B8' }}>/ {zones.length}</span>
                    </div>
                  </div>

                  <div style={{ backgroundColor: '#F8FAFC', padding: 10, borderRadius: 8, border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: 10, color: '#64748B', fontWeight: 600 }}>ĐÁNH GIÁ ĐỘ PHỦ</div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#10B981', marginTop: 4 }}>
                      {algorithmMetrics.coverageRating}
                    </div>
                  </div>
                </div>

                {/* Capacity metric */}
                <div style={{ backgroundColor: '#F8FAFC', padding: 10, borderRadius: 8, border: '1px solid #E2E8F0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: '#475569', marginBottom: 4, fontWeight: 600 }}>
                    <span>Tỷ lệ đáp ứng định biên:</span>
                    <span>{staffList.length} / {totalCapacity} ({utilizationPercent}%)</span>
                  </div>
                  <div style={{ width: '100%', height: 6, borderRadius: 3, backgroundColor: '#E2E8F0', overflow: 'hidden' }}>
                    <div style={{ width: `${utilizationPercent}%`, height: '100%', backgroundColor: '#10B981', borderRadius: 3 }} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* VIEW 4: STORE SUMMARY OVERVIEW (DEFAULT WHEN NOTHING SELECTED & ALGORITHM OFF) */}
          {!showAlgorithm && !selectedZone && !selectedStaff && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
              <div
                style={{
                  padding: '12px 14px',
                  borderBottom: '1px solid #F1F5F9',
                  backgroundColor: '#FAFAFA',
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>Tổng quan Không gian 3D</div>
                <div style={{ fontSize: 10.5, color: '#64748B' }}>Dữ liệu thời gian thực</div>
              </div>

              <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* 2x2 Metric Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div
                    style={{
                      backgroundColor: '#F8FAFC',
                      padding: '10px 12px',
                      borderRadius: 8,
                      border: '1px solid #E2E8F0',
                    }}
                  >
                    <div style={{ fontSize: 10, color: '#64748B', fontWeight: 600 }}>KHU VỰC 3D</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', marginTop: 2 }}>
                      {zones.length}
                    </div>
                  </div>

                  <div
                    style={{
                      backgroundColor: '#F8FAFC',
                      padding: '10px 12px',
                      borderRadius: 8,
                      border: '1px solid #E2E8F0',
                    }}
                  >
                    <div style={{ fontSize: 10, color: '#64748B', fontWeight: 600 }}>NHÂN SỰ TRỰC</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: '#10B981', marginTop: 2 }}>
                      {staffList.length}
                    </div>
                  </div>

                  <div
                    style={{
                      backgroundColor: '#F8FAFC',
                      padding: '10px 12px',
                      borderRadius: 8,
                      border: '1px solid #E2E8F0',
                    }}
                  >
                    <div style={{ fontSize: 10, color: '#64748B', fontWeight: 600 }}>TỔNG SỨC CHỨA</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', marginTop: 2 }}>
                      {totalCapacity}
                    </div>
                  </div>

                  <div
                    style={{
                      backgroundColor: '#F8FAFC',
                      padding: '10px 12px',
                      borderRadius: 8,
                      border: '1px solid #E2E8F0',
                    }}
                  >
                    <div style={{ fontSize: 10, color: '#64748B', fontWeight: 600 }}>LẤP ĐẦY</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: '#0284C7', marginTop: 2 }}>
                      {utilizationPercent}%
                    </div>
                  </div>
                </div>

                {/* Overall Capacity Utilization Bar */}
                <div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: 10.5,
                      color: '#475569',
                      marginBottom: 4,
                      fontWeight: 600,
                    }}
                  >
                    <span>Tỷ lệ phân bổ nhân sự:</span>
                    <span>{staffList.length} / {totalCapacity}</span>
                  </div>
                  <div
                    style={{
                      width: '100%',
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: '#E2E8F0',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${utilizationPercent}%`,
                        height: '100%',
                        backgroundColor: utilizationPercent > 90 ? '#EF4444' : '#10B981',
                        borderRadius: 3,
                      }}
                    />
                  </div>
                </div>

                {/* Zones Quick Select List */}
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: '#334155',
                      marginBottom: 8,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <TrendingUp size={12} color="#64748B" />
                    <span>Danh sách khu vực (Bấm để xem):</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5, maxHeight: 180, overflowY: 'auto' }}>
                    {zones.map((z) => {
                      const zStaff = staffByZone[z.id] || [];
                      const cap = z.capacity || 4;
                      const isOver = zStaff.length > cap;
                      const isElevated = (z.z || 0) > 0.5;

                      return (
                        <div
                          key={z.id || z.name}
                          onClick={() => onSelectZone?.(z)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '6px 8px',
                            borderRadius: 6,
                            backgroundColor: '#F8FAFC',
                            border: '1px solid #E2E8F0',
                            cursor: 'pointer',
                            transition: 'background-color 0.15s ease',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span
                              style={{
                                width: 8,
                                height: 8,
                                borderRadius: 2,
                                backgroundColor: getZoneThemeColor(z.name),
                              }}
                            />
                            <span style={{ fontSize: 11, fontWeight: 600, color: '#1E293B' }}>{z.name}</span>
                            {isElevated && (
                              <span
                                style={{
                                  fontSize: 8.5,
                                  padding: '1px 3px',
                                  borderRadius: 3,
                                  backgroundColor: '#EEF2FF',
                                  color: '#4338CA',
                                  fontWeight: 700,
                                }}
                              >
                                Z+{z.z}
                              </span>
                            )}
                          </div>
                          <span
                            style={{
                              fontSize: 9.5,
                              padding: '1px 5px',
                              borderRadius: 4,
                              backgroundColor: isOver ? '#FEF2F2' : '#FFFFFF',
                              color: isOver ? '#DC2626' : '#475569',
                              border: '1px solid #E2E8F0',
                              fontWeight: 700,
                            }}
                          >
                            {zStaff.length}/{cap}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── BOTTOM BAR: LAYER TOGGLES, ALGORITHM ACTION & MINIMALIST LEGEND ── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          gap: 12,
        }}
      >
        {/* Layer Toggles Toolbar */}
        <div
          style={{
            pointerEvents: 'auto',
            backgroundColor: 'rgba(255, 255, 255, 0.94)',
            backdropFilter: 'blur(12px)',
            padding: '6px 10px',
            borderRadius: 10,
            border: '1px solid #E2E8F0',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            flexWrap: 'wrap',
          }}
        >
          {/* Toggle Zones */}
          <button
            type="button"
            onClick={() => setShowZones?.(!showZones)}
            style={{
              padding: '5px 8px',
              borderRadius: 6,
              border: showZones ? '1px solid #10B981' : '1px solid #E2E8F0',
              backgroundColor: showZones ? '#EEFAEB' : '#FFFFFF',
              color: showZones ? '#047857' : '#64748B',
              fontSize: 10.5,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Box size={12} />
            <span>Khu vực</span>
          </button>

          {/* Toggle Staff */}
          <button
            type="button"
            onClick={() => setShowStaff?.(!showStaff)}
            style={{
              padding: '5px 8px',
              borderRadius: 6,
              border: showStaff ? '1px solid #10B981' : '1px solid #E2E8F0',
              backgroundColor: showStaff ? '#EEFAEB' : '#FFFFFF',
              color: showStaff ? '#047857' : '#64748B',
              fontSize: 10.5,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Users size={12} />
            <span>Nhân sự</span>
          </button>

          {/* Toggle Labels */}
          <button
            type="button"
            onClick={() => setShowLabels?.(!showLabels)}
            style={{
              padding: '5px 8px',
              borderRadius: 6,
              border: showLabels ? '1px solid #0284C7' : '1px solid #E2E8F0',
              backgroundColor: showLabels ? '#F0F9FF' : '#FFFFFF',
              color: showLabels ? '#0284C7' : '#64748B',
              fontSize: 10.5,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Tag size={12} />
            <span>Nhãn 3D</span>
          </button>

          {/* Toggle Workstations */}
          <button
            type="button"
            onClick={() => setShowWorkstations?.(!showWorkstations)}
            style={{
              padding: '5px 8px',
              borderRadius: 6,
              border: showWorkstations ? '1px solid #6366F1' : '1px solid #E2E8F0',
              backgroundColor: showWorkstations ? '#EEF2FF' : '#FFFFFF',
              color: showWorkstations ? '#4F46E5' : '#64748B',
              fontSize: 10.5,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Eye size={12} />
            <span>Quầy</span>
          </button>

          {/* Toggle Grid */}
          <button
            type="button"
            onClick={() => setShowGrid?.(!showGrid)}
            style={{
              padding: '5px 8px',
              borderRadius: 6,
              border: showGrid ? '1px solid #64748B' : '1px solid #E2E8F0',
              backgroundColor: showGrid ? '#F1F5F9' : '#FFFFFF',
              color: showGrid ? '#1E293B' : '#94A3B8',
              fontSize: 10.5,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Grid size={12} />
            <span>Lưới</span>
          </button>

          {/* Toggle Walls */}
          <button
            type="button"
            onClick={() => setShowWalls?.(!showWalls)}
            style={{
              padding: '5px 8px',
              borderRadius: 6,
              border: showWalls ? '1px solid #64748B' : '1px solid #E2E8F0',
              backgroundColor: showWalls ? '#F1F5F9' : '#FFFFFF',
              color: showWalls ? '#1E293B' : '#94A3B8',
              fontSize: 10.5,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Shield size={12} />
            <span>Tường</span>
          </button>

          {/* Toggle Distances (Progressive, off by default) */}
          <button
            type="button"
            onClick={() => setShowDistances?.(!showDistances)}
            style={{
              padding: '5px 8px',
              borderRadius: 6,
              border: showDistances ? '1px solid #6366F1' : '1px solid #E2E8F0',
              backgroundColor: showDistances ? '#EEF2FF' : '#FFFFFF',
              color: showDistances ? '#4F46E5' : '#64748B',
              fontSize: 10.5,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Navigation size={12} />
            <span>Khoảng cách</span>
          </button>

          {/* Toggle Algorithm (Max-Min Dispersion Analysis) */}
          <button
            type="button"
            onClick={() => setShowAlgorithm?.(!showAlgorithm)}
            style={{
              padding: '5px 8px',
              borderRadius: 6,
              border: showAlgorithm ? '1px solid #F59E0B' : '1px solid #E2E8F0',
              backgroundColor: showAlgorithm ? '#FFFBEB' : '#FFFFFF',
              color: showAlgorithm ? '#B45309' : '#64748B',
              fontSize: 10.5,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Zap size={12} />
            <span>Max-Min</span>
          </button>

          {/* Real Backend Allocation Trigger */}
          {onRunAlgorithm && (
            <button
              type="button"
              onClick={onRunAlgorithm}
              disabled={isAllocating}
              style={{
                padding: '5px 10px',
                borderRadius: 6,
                border: 'none',
                backgroundColor: isAllocating ? '#94A3B8' : '#10B981',
                color: '#FFFFFF',
                fontSize: 10.5,
                fontWeight: 600,
                cursor: isAllocating ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                boxShadow: '0 2px 6px rgba(16, 185, 129, 0.25)',
              }}
            >
              <Zap size={12} />
              <span>{isAllocating ? 'Đang phân bổ...' : 'Phân bổ 3D tự động'}</span>
            </button>
          )}
        </div>

        {/* Minimalist Legend (Prompt Rule #30) */}
        <div
          style={{
            pointerEvents: 'auto',
            backgroundColor: 'rgba(255, 255, 255, 0.94)',
            backdropFilter: 'blur(12px)',
            padding: '6px 12px',
            borderRadius: 8,
            border: '1px solid #E2E8F0',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            fontSize: 10,
            color: '#475569',
            fontWeight: 600,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: '#10B981' }} />
            <span>Nhân sự</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 7, height: 7, backgroundColor: '#0284C7', borderRadius: 2 }} />
            <span>Khu vực</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 5, height: 5, backgroundColor: '#8B5CF6', transform: 'rotate(45deg)' }} />
            <span>Quầy</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 12, height: 2, backgroundColor: '#6366F1' }} />
            <span>Khoảng cách</span>
          </div>
        </div>
      </div>
    </div>
  );
}
