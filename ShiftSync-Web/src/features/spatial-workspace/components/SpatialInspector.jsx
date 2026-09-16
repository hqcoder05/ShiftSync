/**
 * SpatialInspector.jsx
 * Enterprise SaaS contextual right-hand inspector panel:
 * Displays deep operational metrics for selected Zone, Employee, or Store overview,
 * with Follow Employee launcher, Focus framing, and What-If Simulation Sandbox.
 */

import { useState } from 'react';
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
  UserMinus,
  MoveRight,
} from 'lucide-react';
import { getZoneStatus, getZoneStatusColor, getRoleTheme } from '../visualization/ZoneStatus';
import { findReplacementCandidates } from '../simulation/SimulationValidator';
import { getZoneIcon, getShortZoneName, getZoneShiftRequirements } from '../../../components/spatial/spatial.constants';
import AttentionCenter from './inspector/AttentionCenter';

export default function SpatialInspector({
  isOpen = true,
  onClose,
  selectedZone = null,
  selectedStaff = null,
  onSelectZone,
  onSelectStaff,
  onClearSelection,
  onFocusZone,
  onFocusStaff,
  onFollowStaff,
  isFollowingEmployee = false,
  zones = [],
  staff = [],
  layout = { length: 24, width: 16, height: 6 },
  storeName = 'Chi nhánh cửa hàng',
  onRunAlgorithm,
  isAllocating = false,
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
}) {
  const [showReplacementPanel, setShowReplacementPanel] = useState(true);
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
    <aside
      style={{
        position: 'absolute',
        top: 14,
        right: 14,
        bottom: 14,
        width: 336,
        zIndex: 25,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'rgba(255, 255, 255, 0.96)',
        backdropFilter: 'blur(16px)',
        borderRadius: 16,
        border: isSimulating ? '1.5px solid #F59E0B' : '1px solid #E2E8F0',
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
              color: '#FFF',
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
              borderBottom: '1px solid #F1F5F9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#FAFAFA',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  backgroundColor: getRoleTheme(selectedStaff.skillName || selectedStaff.role).color,
                  color: '#FFFFFF',
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
                <h4 style={{ margin: 0, fontSize: 14.5, fontWeight: 700, color: '#0F172A' }}>
                  {selectedStaff.staffName || selectedStaff.fullName || 'Nhân viên'}
                </h4>
                <span style={{ fontSize: 11.5, color: '#64748B' }}>
                  {selectedStaff.staffCode || 'Mã NV: SS-' + (selectedStaff.id || '01').slice(0, 4)}
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
                  color: isFollowingEmployee ? '#FFFFFF' : '#047857',
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
                <span>{isFollowingEmployee ? 'Đang theo dõi' : 'Theo dõi NV'}</span>
              </button>

              <button
                type="button"
                onClick={() => onFocusStaff?.(selectedStaff)}
                style={{
                  padding: '7px 10px',
                  borderRadius: 8,
                  border: '1px solid #E2E8F0',
                  backgroundColor: '#F8FAFC',
                  color: '#334155',
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
                backgroundColor: '#F8FAFC',
                borderRadius: 12,
                padding: '12px 14px',
                border: '1px solid #E2E8F0',
              }}
            >
              <span style={{ fontSize: 11, fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
                Vai trò ca trực
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <span style={{ fontSize: 18 }}>
                  {getRoleTheme(selectedStaff.skillName || selectedStaff.role).icon}
                </span>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>
                  {selectedStaff.skillName || selectedStaff.role || 'Nhân viên tổng hợp'}
                </span>
              </div>
            </div>

            {/* Zone Assignment */}
            <div
              style={{
                backgroundColor: '#F8FAFC',
                borderRadius: 12,
                padding: '12px 14px',
                border: '1px solid #E2E8F0',
              }}
            >
              <span style={{ fontSize: 11, fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
                Phân khu đang bố trí
              </span>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
                <span style={{ fontSize: 13.5, fontWeight: 700, color: '#0F172A' }}>
                  {selectedStaff.zoneName || selectedZone?.name || 'Chưa gán phân khu'}
                </span>
                {selectedZone && (
                  <button
                    type="button"
                    onClick={() => onFocusZone?.(selectedZone)}
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
              <span style={{ fontSize: 11, fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
                Thông tin ca trực
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: '#334155' }}>
                <Clock size={15} color="#64748B" />
                <span>
                  {selectedStaff.startTime && selectedStaff.endTime
                    ? `${selectedStaff.startTime.slice(0, 5)} - ${selectedStaff.endTime.slice(0, 5)}`
                    : 'Ca hiện tại: 06:00 - 14:00'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: '#16A34A' }}>
                <CheckCircle2 size={15} color="#16A34A" />
                <span>Trạng thái: Đang trong ca trực (Active)</span>
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
                  🧪 Thử nghiệm giả định
                </span>
                <button
                  type="button"
                  onClick={() => onSimulateRemoveStaff?.(selectedStaff.id || selectedStaff.staffId)}
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
                  onClick={() => onSimulateLeaveStaff?.(selectedStaff.id || selectedStaff.staffId)}
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
                        onSimulateMoveStaff?.(selectedStaff.id || selectedStaff.staffId, e.target.value);
                      }
                    }}
                    defaultValue=""
                    style={{
                      padding: '5px 8px',
                      borderRadius: 6,
                      border: '1px solid #FCD34D',
                      backgroundColor: '#FFFFFF',
                      fontSize: 11.5,
                      color: '#0F172A',
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
                        onSimulateSwapStaff?.(selectedStaff.id || selectedStaff.staffId, e.target.value);
                        e.target.value = '';
                      }
                    }}
                    defaultValue=""
                    style={{
                      padding: '5px 8px',
                      borderRadius: 6,
                      border: '1px solid #FCD34D',
                      backgroundColor: '#FFFFFF',
                      fontSize: 11.5,
                      color: '#0F172A',
                    }}
                  >
                    <option value="" disabled>-- Chọn nhân sự hoán đổi --</option>
                    {staff
                      .filter((s) => (s.id || s.staffId) !== (selectedStaff.id || selectedStaff.staffId))
                      .map((s) => (
                        <option key={s.id || s.staffId} value={s.id || s.staffId}>
                          {s.staffName || s.fullName || 'Nhân sự'} ({s.zoneName || 'Khu vực khác'})
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : selectedZone ? (
        /* ── CASE 2: ZONE SELECTED ── */
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          {/* Header */}
          <div
            style={{
              padding: '16px 18px',
              borderBottom: '1px solid #F1F5F9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#FAFAFA',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 22 }}>{getZoneIcon(selectedZone.name)}</span>
              <div>
                <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0F172A' }}>
                  {selectedZone.name}
                </h4>
                <span style={{ fontSize: 11.5, color: '#64748B' }}>
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
                border: '1px solid #E2E8F0',
                backgroundColor: '#F8FAFC',
                color: '#0F172A',
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
                  <div style={{ fontSize: 10.5, color: '#64748B', display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed rgba(100,116,139,0.2)', paddingTop: 4 }}>
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
                  color: showReplacementPanel ? '#FFFFFF' : '#0369A1',
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
                <span>{showReplacementPanel ? 'Ẩn ứng viên thay thế' : '🔍 Tìm người thay thế (Smart Candidate)'}</span>
              </button>

              {showReplacementPanel && (() => {
                const candidates = findReplacementCandidates(selectedZone, employees, staff, currentShift);
                return (
                  <div style={{
                    backgroundColor: '#F8FAFC',
                    borderRadius: 10,
                    border: '1px solid #E2E8F0',
                    padding: '10px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>
                        Ứng viên đạt chuẩn kỹ năng ({candidates.length}):
                      </span>
                      <span style={{ fontSize: 9.5, color: '#64748B' }}>
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
                          badgeBg = '#F1F5F9';
                          badgeColor = '#64748B';
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
                              backgroundColor: '#FFFFFF',
                              borderRadius: 8,
                              border: '1px solid #E2E8F0',
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
                              e.currentTarget.style.backgroundColor = '#FFFFFF';
                              e.currentTarget.style.borderColor = '#E2E8F0';
                            }}
                          >
                            <div style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                              <strong style={{ color: '#0F172A', display: 'block', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
                                color: '#FFFFFF',
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
              <span style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                Nhân sự trực tại quầy ({(staffByZone[selectedZone.id] || []).length})
              </span>

              {(staffByZone[selectedZone.id] || []).length === 0 ? (
                <div style={{ padding: '12px', borderRadius: 8, backgroundColor: '#F8FAFC', fontSize: 12, color: '#94A3B8', textAlign: 'center' }}>
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
                        backgroundColor: '#F8FAFC',
                        border: '1px solid #E2E8F0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                      }}
                    >
                      <span style={{ fontSize: 12.5, fontWeight: 600, color: '#0F172A' }}>
                        {emp.staffName || emp.fullName || 'Nhân viên'}
                      </span>
                      <span style={{ fontSize: 11, color: '#64748B' }}>
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
          onSelectZone={onSelectZone}
          onFocusZone={onFocusZone}
          onRunAlgorithm={onRunAlgorithm}
          isAllocating={isAllocating}
          onOpenAutoSchedule={onToggleSimulation}
        />
      )}
    </aside>
  );
}
