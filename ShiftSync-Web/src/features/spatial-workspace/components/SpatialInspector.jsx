/**
 * SpatialInspector.jsx
 * Enterprise SaaS contextual right-hand inspector panel:
 * Displays deep operational metrics for selected Zone, Employee, or Store overview,
 * with Follow Employee launcher, Focus framing, and What-If Simulation Sandbox.
 */

import { useState } from 'react';
import WorkstationEquipment from './WorkstationEquipment.jsx';
import {
  X,
  UserCheck,
  CalendarOff,
  Sparkles,
  ShieldAlert,
  MapPin,
  Users,
  Box,
  Zap,
  TrendingUp,
  Award,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Video,
  Search,
  FlaskConical,
  RotateCcw,
  RotateCw,
  UserMinus,
  MoveRight,
  Wrench,
  Check,
  Loader2,
} from 'lucide-react';
import { getZoneStatus, getZoneStatusColor, getZoneStatusExplanation, getRoleTheme } from '../visualization/ZoneStatus';
import { findReplacementCandidates } from '../simulation/SimulationValidator';
import { getZoneIcon, getShortZoneName, getZoneShiftRequirements } from '../../../components/spatial/spatial.constants';
import AttentionCenter from './inspector/AttentionCenter';
import { getStaffId, areSameStaff } from '../utils/staffIdentity';

export default function SpatialInspector({
  isOpen = true,
  onClose,
  selectedZone = null,
  selectedStaff = null,
  selectedWorkstation = null,
  storeId = null,
  onSelectZone,
  onSelectStaff,
  onSelectWorkstation,
  onClearSelection,
  onFocusZone,
  onFocusStaff,
  onFocusWorkstation,
  onFollowStaff,
  isFollowingEmployee = false,
  zones = [],
  staff = [],
  layout = { length: 24, width: 16, height: 6 },
  storeName = 'Chi nhánh cửa hàng',
  onRunAlgorithm,
  isAllocating = false,
  // Workstation Layout Editor
  isEditingLayout = false,
  onToggleLayoutEditor,
  draftWorkstationCoords = null,
  workstationCollision = null,
  isSavingWorkstation = false,
  onSaveWorkstationPosition,
  onCancelWorkstationPosition,
  onRotateWorkstation = null,
  canEditLayout = false,
  workstations = [],
  // Workstation Occupancy (Phase 2B)
  workstationOccupancies = null,
  // Simulation Sandbox
  isSimulating = false,
  onToggleSimulation,
  onSimulateRemoveStaff,
  onSimulateMoveStaff,
  onSimulateSwapStaff,
  onSimulateLeaveStaff,
  onResetSimulation,
  employees = [],
  skills = [],
  currentShift = null,
  onAssignCandidate = null,
  isAssigningCandidate = false,
  onSimulateAddStaff = null,
  onOpenAutoSchedule,
}) {
  const [showReplacementPanel, setShowReplacementPanel] = useState(true);
  const [stationView, setStationView] = useState(null);
  const stationKey = `${storeId}/${selectedWorkstation?.id}`;
  const stationSection = stationView?.key === stationKey ? stationView.section : 'overview';
  if (!isOpen) return null;

  // Group staff by zone
  const staffByZone = {};
  staff.forEach((s) => {
    const zid = s.zoneId || s.zone?.id;
    if (zid) {
      if (!staffByZone[zid]) staffByZone[zid] = [];
      staffByZone[zid].push(s);
    }
  });

  const totalCapacity = zones.reduce((sum, z) => sum + (z.capacity || 4), 0);
  const occupancyRate = totalCapacity > 0 ? Math.min(100, Math.round((staff.length / totalCapacity) * 100)) : 0;

  return (
    <aside className="se-inspector" aria-label="Chi tiết cửa hàng"
      style={{
        position: 'absolute',
        top: 14,
        right: 14,
        bottom: 14,
        width: 336,
        zIndex: 25,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--se-surface)',
        backdropFilter: 'blur(16px)',
        borderRadius: 16,
        border: isSimulating ? '1.5px solid #F59E0B' : '1px solid var(--se-border)',
        boxShadow: '0 10px 30px rgba(15, 23, 42, 0.12)',
        overflow: 'hidden',
      }}
    >
      {/* Simulation Banner if active */}
      {isSimulating && (
        <div
          style={{
            backgroundColor: '#FEF3C7',
            borderBottom: '1px solid #FDE68A',
            padding: '6px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 11,
            fontWeight: 700,
            color: '#B45309',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <FlaskConical size={13} />
            <span>Mô phỏng thử nghiệm</span>
          </div>
          <button
            type="button"
            onClick={onResetSimulation}
            style={{
              border: 'none',
              background: '#B45309',
              color: '#fff',
              padding: '2px 6px',
              borderRadius: 4,
              fontSize: 10,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Khôi phục
          </button>
        </div>
      )}

      {/* ── CASE 1: EMPLOYEE SELECTED ── */}
      {selectedStaff ? (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          {/* Header */}
          <div
            style={{
              padding: '16px 18px',
              borderBottom: '1px solid var(--se-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: 'var(--se-subtle)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  backgroundColor: getRoleTheme(selectedStaff.skillName || selectedStaff.role).color,
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: 14,
                }}
              >
                {(selectedStaff.staffName || selectedStaff.fullName || 'NV')
                  .trim()
                  .split(/\s+/)
                  .slice(-2)
                  .map((w) => w[0])
                  .join('')
                  .toUpperCase()}
              </span>
              <div>
                <h4 style={{ margin: 0, fontSize: 14.5, fontWeight: 700, color: 'var(--se-text)' }}>
                  {selectedStaff.staffName || selectedStaff.fullName || 'Nhân viên'}
                </h4>
                <span style={{ fontSize: 11.5, color: 'var(--se-muted)' }}>
                  {selectedStaff.staffCode || 'Chưa có mã nhân viên'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClearSelection}
              style={{
                border: 'none',
                background: 'transparent',
                color: '#94A3B8',
                cursor: 'pointer',
                padding: 4,
              }}
              title="Đóng chi tiết"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div style={{ padding: 18, overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Quick Action Buttons: Follow Employee & Focus */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button
                id="btn-follow-staff"
                type="button"
                onClick={() => onFollowStaff?.(selectedStaff)}
                style={{
                  padding: '7px 10px',
                  borderRadius: 8,
                  border: '1px solid #10B981',
                  backgroundColor: isFollowingEmployee ? '#047857' : '#ECFDF5',
                  color: isFollowingEmployee ? 'var(--se-surface)' : '#047857',
                  fontSize: 11.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 5,
                  transition: 'all 0.15s ease',
                }}
                title="Camera tự động bám theo nhân viên khi di chuyển"
              >
                <Video size={13} />
                <span>{isFollowingEmployee ? 'Dừng theo dõi' : 'Theo dõi NV'}</span>
              </button>

              <button
                type="button"
                onClick={() => onFocusStaff?.(selectedStaff)}
                style={{
                  padding: '7px 10px',
                  borderRadius: 8,
                  border: '1px solid var(--se-border)',
                  backgroundColor: 'var(--se-subtle)',
                  color: 'var(--se-text)',
                  fontSize: 11.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 5,
                }}
              >
                <Search size={13} />
                <span>Zoom cận cảnh</span>
              </button>
            </div>

            {/* Role Card */}
            <div
              style={{
                backgroundColor: 'var(--se-subtle)',
                borderRadius: 12,
                padding: '12px 14px',
                border: '1px solid var(--se-border)',
              }}
            >
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--se-muted)', textTransform: 'uppercase' }}>
                Vai trò ca trực
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--se-text)' }}>
                  {selectedStaff.skillName || selectedStaff.role || 'Nhân viên tổng hợp'}
                </span>
              </div>
            </div>

            {/* Zone Assignment */}
            <div
              style={{
                backgroundColor: 'var(--se-subtle)',
                borderRadius: 12,
                padding: '12px 14px',
                border: '1px solid var(--se-border)',
              }}
            >
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--se-muted)', textTransform: 'uppercase' }}>
                Phân khu đang bố trí
              </span>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
                <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--se-text)' }}>
                  {selectedStaff.zoneName || selectedZone?.name || 'Chưa gán phân khu'}
                </span>
                {selectedZone && (
                  <button
                    type="button"
                    onClick={() => {
                      onSelectStaff?.(null);
                      onSelectZone?.(selectedZone);
                      onFocusZone?.(selectedZone);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: 11,
                      fontWeight: 600,
                      color: '#0284C7',
                      background: '#E0F2FE',
                      border: 'none',
                      padding: '4px 8px',
                      borderRadius: 6,
                      cursor: 'pointer',
                    }}
                  >
                    Xem khu vực <ArrowRight size={11} />
                  </button>
                )}
              </div>
            </div>

            {/* Shift & Time Details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--se-muted)', textTransform: 'uppercase' }}>
                Thông tin ca trực
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--se-text)' }}>
                <Clock size={15} color="#64748B" />
                <span>
                  {selectedStaff.startTime && selectedStaff.endTime
                    ? `${selectedStaff.startTime.slice(0, 5)} - ${selectedStaff.endTime.slice(0, 5)}`
                    : 'Chưa có thông tin ca'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: '#16A34A' }}>
                <CheckCircle2 size={15} color="#16A34A" />
                <span>Đã phân công theo lịch; điểm danh xem trong bảng thông tin.</span>
              </div>
            </div>

            {/* What-If Simulation Sandbox Actions for Selected Employee */}
            {isSimulating && (
              <div
                style={{
                  backgroundColor: '#FFFBEB',
                  borderRadius: 12,
                  padding: '12px 14px',
                  border: '1px dashed #F59E0B',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <span style={{ fontSize: 11, fontWeight: 700, color: '#B45309', textTransform: 'uppercase' }}>
                   Thử nghiệm giả định
                </span>
                <button
                  type="button"
                  onClick={() => onSimulateRemoveStaff?.(getStaffId(selectedStaff))}
                  style={{
                    padding: '6px 10px',
                    borderRadius: 7,
                    border: '1px solid #F87171',
                    backgroundColor: '#FEF2F2',
                    color: '#DC2626',
                    fontSize: 11.5,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <UserMinus size={13} />
                  <span>Rút nhân sự này khỏi ca</span>
                </button>
                {/* Mô phỏng nghỉ phép (Leave Impact) */}
                <button
                  type="button"
                  onClick={() => onSimulateLeaveStaff?.(getStaffId(selectedStaff))}
                  style={{
                    padding: '6px 10px',
                    borderRadius: 7,
                    border: '1px solid #FCD34D',
                    backgroundColor: '#FEF3C7',
                    color: '#92400E',
                    fontSize: 11.5,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                  title="Mô phỏng nhân sự này xin nghỉ phép để kiểm tra hụt định biên"
                >
                  <CalendarOff size={13} />
                  <span>Mô phỏng nghỉ phép (Leave)</span>
                </button>


                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontSize: 10.5, color: '#78350F', fontWeight: 600 }}>
                    Chuyển phân khu khác:
                  </span>
                  <select
                    id="select-simulate-move"
                    onChange={(e) => {
                      if (e.target.value) {
                        const targetStaffId = getStaffId(selectedStaff);
                        if (targetStaffId) {
                          onSimulateMoveStaff?.(targetStaffId, e.target.value);
                        }
                      }
                    }}
                    defaultValue=""
                    style={{
                      padding: '5px 8px',
                      borderRadius: 6,
                      border: '1px solid #FCD34D',
                      backgroundColor: 'var(--se-surface)',
                      fontSize: 11.5,
                      color: 'var(--se-text)',
                    }}
                  >
                    <option value="" disabled>-- Chọn phân khu chuyển --</option>
                    {zones.map((z) => (
                      <option key={z.id} value={z.id}>{z.name}</option>
                    ))}
                  </select>
                </div>

                {/* Hoán đổi vị trí (Swap) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontSize: 10.5, color: '#78350F', fontWeight: 600 }}>
                    Hoán đổi vị trí (Swap) với:
                  </span>
                  <select
                    id="select-simulate-swap"
                    onChange={(e) => {
                      if (e.target.value) {
                        const targetStaffId = getStaffId(selectedStaff);
                        if (targetStaffId) {
                          onSimulateSwapStaff?.(targetStaffId, e.target.value);
                        }
                        e.target.value = '';
                      }
                    }}
                    defaultValue=""
                    style={{
                      padding: '5px 8px',
                      borderRadius: 6,
                      border: '1px solid #FCD34D',
                      backgroundColor: 'var(--se-surface)',
                      fontSize: 11.5,
                      color: 'var(--se-text)',
                    }}
                  >
                    <option value="" disabled>-- Chọn nhân sự hoán đổi --</option>
                    {staff
                      .filter((s) => !areSameStaff(s, selectedStaff))
                      .map((s) => {
                        const sStaffId = getStaffId(s);
                        return (
                          <option key={sStaffId || s.id} value={sStaffId}>
                            {s.staffName || s.fullName || 'Nhân sự'} ({s.zoneName || 'Khu vực khác'})
                          </option>
                        );
                      })}
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : selectedWorkstation ? (
        /* ── CASE 1.5: WORKSTATION SELECTED ── */
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          {/* Header */}
          <div
            style={{
              padding: '16px 18px',
              borderBottom: '1px solid var(--se-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: 'var(--se-subtle)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  backgroundColor: '#0284C7',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 18,
                }}
              >
                
              </span>
              <div>
                <h4 style={{ margin: 0, fontSize: 14.5, fontWeight: 700, color: 'var(--se-text)' }}>
                  {selectedWorkstation.name}
                </h4>
                <span style={{ fontSize: 11.5, color: 'var(--se-muted)' }}>
                  {selectedWorkstation.code || 'Chưa có mã trạm'} • {selectedWorkstation.workstationType || 'TRẠM'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClearSelection}
              aria-label="Bỏ chọn trạm"
              style={{
                border: 'none',
                background: 'transparent',
                color: '#94A3B8',
                cursor: 'pointer',
                padding: 4,
              }}
            >
              <X size={18} />
            </button>
          </div>

          <div className="se-inspector-sections" role="group" aria-label="Nội dung trạm">
            {[['overview', 'Thông tin trạm'], ['staff', 'Nhân sự & ca'], ['equipment', 'Thiết bị']].map(([section, label]) => <button type="button" key={section} className="se-button" aria-pressed={stationSection === section} onClick={() => setStationView({ key: stationKey, section })}>{label}</button>)}
          </div>
          {/* Body */}
          <div style={{ padding: '16px 18px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div hidden={stationSection !== 'overview'} className="se-station-overview">
            {/* Status & Zone */}
            <div style={{ display: 'flex', gap: 8 }}>
              <div
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  borderRadius: 10,
                  backgroundColor: 'var(--se-subtle)',
                  border: '1px solid var(--se-border)',
                }}
              >
                <span style={{ fontSize: 11, color: 'var(--se-muted)', display: 'block' }}>Phân vùng</span>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--se-text)' }}>
                  {selectedWorkstation.zoneName || 'Chưa gắn Zone'}
                </span>
              </div>

              <div
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  borderRadius: 10,
                  backgroundColor: 'var(--se-subtle)',
                  border: '1px solid var(--se-border)',
                }}
              >
                <span style={{ fontSize: 11, color: 'var(--se-muted)', display: 'block' }}>Trạng thái</span>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: selectedWorkstation.isActive !== false ? '#10B981' : '#94A3B8' }}>
                  {selectedWorkstation.isActive !== false ? '● Hoạt động' : '○ Tạm đóng'}
                </span>
              </div>
            </div>

            {/* Coordinates Card */}
            <div
              style={{
                padding: '12px 14px',
                borderRadius: 10,
                backgroundColor: draftWorkstationCoords ? '#ECFDF5' : 'var(--se-subtle)',
                border: draftWorkstationCoords ? '1px solid #A7F3D0' : '1px solid var(--se-border)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--se-muted)', textTransform: 'uppercase' }}>
                  {draftWorkstationCoords ? ' Tọa độ mới (Bản nháp)' : ' Tọa độ mặt bằng'}
                </span>
                {draftWorkstationCoords && (
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#059669', backgroundColor: '#D1FAE5', padding: '1px 6px', borderRadius: 4 }}>
                    Đã di chuyển
                  </span>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, textAlign: 'center' }}>
                <div style={{ backgroundColor: 'var(--se-surface)', padding: '6px', borderRadius: 6, border: '1px solid var(--se-border)' }}>
                  <span style={{ fontSize: 10, color: 'var(--se-muted)', display: 'block' }}>Dài (X)</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--se-text)' }}>
                    {draftWorkstationCoords?.x ?? selectedWorkstation.x ?? 0}m
                  </span>
                </div>
                <div style={{ backgroundColor: 'var(--se-surface)', padding: '6px', borderRadius: 6, border: '1px solid var(--se-border)' }}>
                  <span style={{ fontSize: 10, color: 'var(--se-muted)', display: 'block' }}>Rộng (Y)</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--se-text)' }}>
                    {draftWorkstationCoords?.y ?? selectedWorkstation.y ?? 0}m
                  </span>
                </div>
                <div style={{ backgroundColor: 'var(--se-surface)', padding: '6px', borderRadius: 6, border: '1px solid var(--se-border)' }}>
                  <span style={{ fontSize: 10, color: 'var(--se-muted)', display: 'block' }}>Cao (Z)</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--se-text)' }}>
                    {selectedWorkstation.z ?? 0}m
                  </span>
                </div>
              </div>

              {workstationCollision?.isColliding && (
                <div style={{ marginTop: 8, fontSize: 11, color: '#DC2626', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <AlertTriangle size={13} />
                  <span>Trùng vị trí với {workstationCollision.conflictingWorkstation?.name}!</span>
                </div>
              )}
            </div>

            </div>
            <div hidden={stationSection !== 'staff'}>
            {/* Workstation Occupancy & Staff Presence Card (PHASE 2B) */}
            {(() => {
              const occ = workstationOccupancies?.get(selectedWorkstation.id);
              const state = occ?.state || 'UNKNOWN';
              const isAssigned = state === 'ASSIGNED';
              const isUnassigned = state === 'UNASSIGNED';

              const badgeBg = isAssigned
                ? (occ.assignedStaff?.some((s) => s.isPresent) ? '#ECFDF5' : '#F0F9FF')
                : isUnassigned
                ? '#FFFBEB'
                : 'var(--se-subtle)';

              const badgeColor = isAssigned
                ? (occ.assignedStaff?.some((s) => s.isPresent) ? '#059669' : '#0284C7')
                : isUnassigned
                ? '#D97706'
                : 'var(--se-muted)';

              return (
                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: 10,
                    backgroundColor: 'var(--se-surface)',
                    border: '1px solid var(--se-border)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Users size={14} color="#64748B" />
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--se-muted)', textTransform: 'uppercase' }}>
                        Nhân sự trực trạm
                      </span>
                    </div>

                    <span
                      style={{
                        fontSize: 10.5,
                        fontWeight: 700,
                        backgroundColor: badgeBg,
                        color: badgeColor,
                        padding: '2px 8px',
                        borderRadius: 6,
                        border: `1px solid ${badgeColor}33`,
                      }}
                    >
                      {isAssigned
                        ? (occ.assignedStaff?.some((s) => s.isPresent) ? '● Đang làm việc' : '● Phân công ca')
                        : isUnassigned
                        ? '○ Trống'
                        : '○ Không xác định'}
                    </span>
                  </div>

                  {/* Staff List or Empty Reason */}
                  {isAssigned && occ.assignedStaff?.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {occ.assignedStaff.map((staffMember, sIdx) => (
                        <div
                          key={staffMember.staffId || sIdx}
                          style={{
                            padding: '8px 10px',
                            borderRadius: 8,
                            backgroundColor: 'var(--se-subtle)',
                            border: '1px solid var(--se-border)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--se-text)' }}>
                              {staffMember.staffName}
                            </span>
                            <span style={{ fontSize: 10.5, color: 'var(--se-muted)' }}>
                              {staffMember.skillName} • {staffMember.isDirectMapping ? 'Gán trực tiếp' : 'Theo phân vùng'}
                            </span>
                          </div>

                          <div style={{ textAlign: 'right' }}>
                            {staffMember.isPresent ? (
                              <span
                                style={{
                                  fontSize: 10,
                                  fontWeight: 700,
                                  color: '#059669',
                                  backgroundColor: '#D1FAE5',
                                  padding: '2px 6px',
                                  borderRadius: 4,
                                  display: 'inline-block',
                                }}
                                title={staffMember.checkInTime ? `Check-in: ${staffMember.checkInTime}` : 'Đã check-in'}
                              >
                                ✓ Có mặt
                              </span>
                            ) : staffMember.checkOutTime ? (
                              <span
                                style={{
                                  fontSize: 10,
                                  fontWeight: 700,
                                  color: '#D97706',
                                  backgroundColor: '#FEF3C7',
                                  padding: '2px 6px',
                                  borderRadius: 4,
                                  display: 'inline-block',
                                }}
                                title={`Check-out: ${staffMember.checkOutTime}`}
                              >
                                ✓ Đã về
                              </span>
                            ) : (
                              <span
                                style={{
                                  fontSize: 10,
                                  fontWeight: 600,
                                  color: 'var(--se-muted)',
                                  backgroundColor: 'var(--se-subtle)',
                                  padding: '2px 6px',
                                  borderRadius: 4,
                                  display: 'inline-block',
                                }}
                              >
                                Theo lịch
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: 11.5, color: 'var(--se-muted)', fontStyle: 'italic', padding: '4px 0' }}>
                      {occ?.statusReason || 'Chưa có thông tin phân công'}
                    </div>
                  )}

                  {/* Capacity & Shift Info */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: '#94A3B8', borderTop: '1px solid var(--se-border)', paddingTop: 6 }}>
                    <span>Sức chứa: {selectedWorkstation.capacity || 1} nhân sự</span>
                    <span>Đang trực: {occ?.occupancyCount || 0}/{selectedWorkstation.capacity || 1}</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--se-muted)', lineHeight: 1.5 }}>
                    <div><strong>Ca đang xem:</strong> {currentShift?.date || currentShift?.shiftDate || 'Chưa chọn ca'}{currentShift?.startTime && currentShift?.endTime ? ` · ${currentShift.startTime}–${currentShift.endTime}` : ''}</div>

                  </div>
                </div>
              );
            })()}

            </div>
            <div hidden={stationSection !== 'equipment'}><WorkstationEquipment key={`${storeId}/${selectedWorkstation.id}`} storeId={storeId} workstationId={selectedWorkstation.id} canEdit={canEditLayout && !isSimulating} /></div>
            {/* Layout Editor Actions */}
            <div hidden={stationSection !== 'overview'} style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {isEditingLayout ? (
                <>
                  {draftWorkstationCoords && (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        type="button"
                        onClick={onSaveWorkstationPosition}
                        disabled={isSavingWorkstation || workstationCollision?.isColliding}
                        style={{
                          flex: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                          padding: '8px 12px',
                          borderRadius: 8,
                          border: 'none',
                          backgroundColor: workstationCollision?.isColliding ? '#94A3B8' : '#10B981',
                          color: '#fff',
                          fontSize: 12.5,
                          fontWeight: 700,
                          cursor: workstationCollision?.isColliding || isSavingWorkstation ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {isSavingWorkstation ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                        {isSavingWorkstation ? 'Đang lưu...' : 'Lưu vị trí'}
                      </button>

                      <button
                        type="button"
                        onClick={onCancelWorkstationPosition}
                        disabled={isSavingWorkstation}
                        style={{
                          padding: '8px 12px',
                          borderRadius: 8,
                          border: '1px solid #CBD5E1',
                          backgroundColor: 'var(--se-surface)',
                          color: 'var(--se-muted)',
                          fontSize: 12.5,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Hủy
                      </button>
                    </div>
                  )}

                  <div style={{ fontSize: 11, color: 'var(--se-muted)', textAlign: 'center', backgroundColor: 'var(--se-subtle)', padding: '6px', borderRadius: 6 }}>
                     Nhấp giữ và kéo trạm trên sàn 3D để đổi vị trí
                  </div>
                </>
              ) : (
                canEditLayout ? (
                  <button
                    type="button"
                    onClick={onToggleLayoutEditor}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      padding: '9px 12px',
                      borderRadius: 8,
                      border: '1px solid #0284C7',
                      backgroundColor: '#E0F2FE',
                      color: '#0369A1',
                      fontSize: 12.5,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    <Wrench size={14} />
                    Bật chế độ di chuyển trạm
                  </button>
                ) : (
                  <div style={{ fontSize: 11, color: '#94A3B8', textAlign: 'center', padding: '6px' }}>
                     Chỉ Quản lý có quyền chỉnh sửa vị trí trạm (Read-only)
                  </div>
                )
              )}

              {/* Focus Camera Button */}
              <button
                type="button"
                onClick={() => onFocusWorkstation?.(selectedWorkstation)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: '1px solid var(--se-border)',
                  backgroundColor: 'var(--se-surface)',
                  color: 'var(--se-text)',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <Search size={14} />
                Đưa góc nhìn tới trạm
              </button>

              {/* Rotate Workstation Button */}
              {canEditLayout && (
                <button
                  type="button"
                  onClick={() => onRotateWorkstation?.(Math.PI / 2)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid #CBD5E1',
                    backgroundColor: 'var(--se-subtle)',
                    color: 'var(--se-text)',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  title="Xoay trạm 90° theo chiều kim đồng hồ"
                >
                  <RotateCw size={13} color="#0284C7" />
                  Xoay góc 90° ↻
                </button>
              )}
            </div>
          </div>
        </div>
      ) : selectedZone ? (
        /* ── CASE 2: ZONE SELECTED ── */
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          {/* Header */}
          <div
            style={{
              padding: '16px 18px',
              borderBottom: '1px solid var(--se-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: 'var(--se-subtle)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 22 }}>{getZoneIcon(selectedZone.name)}</span>
              <div>
                <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--se-text)' }}>
                  {selectedZone.name}
                </h4>
                <span style={{ fontSize: 11.5, color: 'var(--se-muted)' }}>
                  Tọa độ: X={selectedZone.x}m • Y={selectedZone.y}m
                  {selectedZone.z > 0.5 ? ` • Gác lửng (${selectedZone.z}m)` : ' • Sàn trệt'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClearSelection}
              style={{
                border: 'none',
                background: 'transparent',
                color: '#94A3B8',
                cursor: 'pointer',
                padding: 4,
              }}
              title="Đóng chi tiết"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div style={{ padding: 18, overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Quick Focus Button */}
            <button
              type="button"
              onClick={() => onFocusZone?.(selectedZone)}
              style={{
                padding: '8px 12px',
                borderRadius: 8,
                border: '1px solid var(--se-border)',
                backgroundColor: 'var(--se-subtle)',
                color: 'var(--se-text)',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              <Search size={14} color="#0284C7" />
              <span>Zoom cận cảnh phân khu này</span>
            </button>

            {/* Capacity Status */}
            {(() => {
              const zStaff = staffByZone[selectedZone.id] || [];
              const cap = selectedZone.capacity || 4;
              const zoneReqs = getZoneShiftRequirements(zones, currentShift, skills);
              const target = zoneReqs[selectedZone.id] !== undefined ? zoneReqs[selectedZone.id] : cap;
              const status = getZoneStatus(zStaff.length, cap, target);
              const statusColor = getZoneStatusColor(status);

              return (
                <div
                  style={{
                    backgroundColor: statusColor.bg,
                    borderRadius: 12,
                    padding: '12px 14px',
                    border: `1px solid ${statusColor.border}`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: statusColor.text }}>
                      {statusColor.label}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 800, color: statusColor.text }}>
                      {target > 0 ? `${zStaff.length} / ${target} theo ca` : `${zStaff.length} / ${cap}`}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: statusColor.text, opacity: 0.95, lineHeight: 1.4, fontWeight: 500 }}>
                    ℹ️ {getZoneStatusExplanation(zStaff.length, cap, target)}
                  </div>
                  <div style={{ fontSize: 10.5, color: 'var(--se-muted)', display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed rgba(100,116,139,0.2)', paddingTop: 4 }}>
                    <span>Sức chứa tối đa quầy:</span>
                    <strong>{cap} vị trí</strong>
                  </div>
                </div>
              );
            })()}


            {/* Smart Replacement Candidate Recommendations */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
              <button
                type="button"
                id="btn-find-replacement"
                onClick={() => setShowReplacementPanel(!showReplacementPanel)}
                style={{
                  padding: '7px 10px',
                  borderRadius: 8,
                  border: '1px solid #0284C7',
                  backgroundColor: showReplacementPanel ? '#0284C7' : '#F0F9FF',
                  color: showReplacementPanel ? 'var(--se-surface)' : '#0369A1',
                  fontSize: 11.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <Sparkles size={13} />
                <span>{showReplacementPanel ? 'Ẩn ứng viên thay thế' : ' Tìm người thay thế (Smart Candidate)'}</span>
              </button>

              {showReplacementPanel && (() => {
                const candidates = findReplacementCandidates(selectedZone, employees, staff, currentShift);
                return (
                  <div style={{
                    backgroundColor: 'var(--se-subtle)',
                    borderRadius: 10,
                    border: '1px solid var(--se-border)',
                    padding: '10px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--se-muted)' }}>
                        Ứng viên đạt chuẩn kỹ năng ({candidates.length}):
                      </span>
                      <span style={{ fontSize: 9.5, color: 'var(--se-muted)' }}>
                        Ưu tiên nhân sự rảnh / điều chuyển
                      </span>
                    </div>
                    {candidates.length === 0 ? (
                      <span style={{ fontSize: 11, color: '#94A3B8', fontStyle: 'italic' }}>
                        Không tìm thấy nhân sự phù hợp kỹ năng cho phân khu này.
                      </span>
                    ) : (
                      candidates.slice(0, 8).map((c) => {
                        const isCurrentItemLoading = typeof isAssigningCandidate === 'string'
                          ? isAssigningCandidate === c.id
                          : isAssigningCandidate;

                        let actionLabel = '+ Gán vào ca';
                        let actionColor = '#10B981';
                        let badgeText = 'Chưa xếp ca';
                        let badgeBg = '#E0F2FE';
                        let badgeColor = '#0369A1';

                        if (c.availabilityStatus === 'TRANSFER') {
                          actionLabel = '⇄ Điều chuyển';
                          actionColor = '#0284C7';
                          badgeText = `Tại: ${c.currentZoneName}`;
                          badgeBg = '#FEF3C7';
                          badgeColor = '#B45309';
                        } else if (c.availabilityStatus === 'AVAILABLE') {
                          actionLabel = '+ Gán vào ca';
                          actionColor = '#10B981';
                          badgeText = 'Sẵn sàng (Đúng giờ rảnh)';
                          badgeBg = '#DCFCE7';
                          badgeColor = '#15803D';
                        } else {
                          actionLabel = '+ Gán bổ sung';
                          actionColor = '#D97706';
                          badgeText = 'Chưa đăng ký ca này';
                          badgeBg = 'var(--se-subtle)';
                          badgeColor = 'var(--se-muted)';
                        }

                        const handleTriggerAssign = () => {
                          if (onAssignCandidate) {
                            onAssignCandidate(c, selectedZone);
                          } else if (onSimulateMoveStaff && c.isCurrentlyAssigned) {
                            onSimulateMoveStaff(c.id, selectedZone.id);
                          } else if (onSimulateAddStaff) {
                            onSimulateAddStaff(c.employee || c, selectedZone.id);
                          }
                        };

                        return (
                          <div
                            key={c.id}
                            onClick={handleTriggerAssign}
                            style={{
                              padding: '7px 10px',
                              backgroundColor: 'var(--se-surface)',
                              borderRadius: 8,
                              border: '1px solid var(--se-border)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              fontSize: 11.5,
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#F0FDF4';
                              e.currentTarget.style.borderColor = '#86EFAC';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'var(--se-surface)';
                              e.currentTarget.style.borderColor = 'var(--se-border)';
                            }}
                          >
                            <div style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                              <strong style={{ color: 'var(--se-text)', display: 'block', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {c.name}
                              </strong>
                              <div style={{ fontSize: 10.5, color: '#059669', display: 'flex', alignItems: 'center', gap: 6, marginTop: 2, flexWrap: 'wrap' }}>
                                <span>✓ {c.skillMatched}</span>
                                <span style={{
                                  fontSize: 9.5,
                                  padding: '1px 5px',
                                  borderRadius: 4,
                                  backgroundColor: badgeBg,
                                  color: badgeColor,
                                  fontWeight: 600,
                                }}>
                                  {badgeText}
                                </span>
                              </div>
                            </div>

                            <button
                              type="button"
                              disabled={Boolean(isAssigningCandidate)}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleTriggerAssign();
                              }}
                              style={{
                                padding: '4px 9px',
                                borderRadius: 6,
                                border: 'none',
                                backgroundColor: isCurrentItemLoading ? '#94A3B8' : actionColor,
                                color: '#fff',
                                fontSize: 11,
                                fontWeight: 700,
                                cursor: isCurrentItemLoading ? 'wait' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                transition: 'all 0.15s ease',
                                flexShrink: 0,
                              }}
                            >
                              {isCurrentItemLoading ? 'Đang gán...' : actionLabel}
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Staff list in Zone */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--se-muted)', textTransform: 'uppercase' }}>
                Nhân sự trực tại quầy ({(staffByZone[selectedZone.id] || []).length})
              </span>

              {(staffByZone[selectedZone.id] || []).length === 0 ? (
                <div style={{ padding: '12px', borderRadius: 8, backgroundColor: 'var(--se-subtle)', fontSize: 12, color: '#94A3B8', textAlign: 'center' }}>
                  Chưa có nhân sự nào được phân bổ vào phân khu này.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {(staffByZone[selectedZone.id] || []).map((emp) => (
                    <div
                      key={emp.id}
                      data-staff-card={emp.id}
                      onClick={() => {
                        onSelectStaff?.(emp);
                        onFocusStaff?.(emp);
                      }}
                      style={{
                        padding: '8px 10px',
                        borderRadius: 8,
                        backgroundColor: 'var(--se-subtle)',
                        border: '1px solid var(--se-border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                      }}
                    >
                      <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--se-text)' }}>
                        {emp.staffName || emp.fullName || 'Nhân viên'}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--se-muted)' }}>
                        {emp.skillName || emp.role || 'Nhân viên'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* ── CASE 3: STORE OVERVIEW & ATTENTION CENTER (DEFAULT) ── */
        <AttentionCenter
          zones={zones}
          staff={staff}
          currentShift={currentShift}
          skills={skills}
          workstations={workstations}
          workstationOccupancies={workstationOccupancies}
          onSelectZone={onSelectZone}
          onFocusZone={onFocusZone}
          onSelectWorkstation={onSelectWorkstation}
          onFocusWorkstation={onFocusWorkstation}
          onRunAlgorithm={onRunAlgorithm}
          isAllocating={isAllocating}
          onOpenAutoSchedule={onOpenAutoSchedule}
        />
      )}
    </aside>
  );
}
