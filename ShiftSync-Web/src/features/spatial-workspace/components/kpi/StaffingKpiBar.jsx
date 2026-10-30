import {AlertTriangle, CheckCircle2, ChevronRight, MapPin, Radio, Users} from 'lucide-react';
import './staffing-kpi-bar.css';

/**
 * The real-time operations strip deliberately speaks in operational facts,
 * not inferred attendance. "Đã phân công" is schedule data; attendance
 * stays visible in the canvas/employee card where it can be sourced safely.
 */
export default function StaffingKpiBar({
  coveragePercent = 100,
  activeStaffCount = 0,
  requiredStaffCount = 0,
  understaffedZonesCount = 0,
  openShiftsCount = 0,
  unresolvedAssignmentsCount = 0,
  isRealtimeConnected = false,
  lastOperationsUpdatedAt = null,
  latestOperationLabel = '',
  onOpenAttentionCenter,
  onFocusUnderstaffedZone,
}) {
  const needsAttention = understaffedZonesCount > 0 || openShiftsCount > 0 || unresolvedAssignmentsCount > 0;
  const connectionLabel = isRealtimeConnected ? 'Trực tiếp' : 'Mất kết nối';
  const updatedLabel = lastOperationsUpdatedAt
    ? new Intl.DateTimeFormat('vi-VN', {hour: '2-digit', minute: '2-digit', second: '2-digit'}).format(new Date(lastOperationsUpdatedAt))
    : 'Chưa có sự kiện mới';

  return (
    <section className="se-operations-strip" aria-label="Tình hình vận hành theo ca">
      <div className="se-operations-strip__signal" title={latestOperationLabel || `Cập nhật: ${updatedLabel}`}>
        <Radio size={14} aria-hidden="true" />
        <span>{connectionLabel}</span>
        <small>{latestOperationLabel || `Cập nhật ${updatedLabel}`}</small>
      </div>

      <div className="se-operations-strip__facts">
        <div className="se-operation-fact se-operation-fact--coverage">
          <span>Độ phủ</span><strong>{coveragePercent}%</strong>
        </div>
        <div className="se-operation-fact">
          <Users size={14} aria-hidden="true" />
          <span>Đã phân công</span><strong>{activeStaffCount}/{requiredStaffCount || '—'}</strong>
        </div>
        <button
          type="button"
          className={`se-operation-fact se-operation-fact--action ${understaffedZonesCount > 0 ? 'is-critical' : ''}`}
          onClick={understaffedZonesCount > 0 ? onFocusUnderstaffedZone : onOpenAttentionCenter}
        >
          <MapPin size={14} aria-hidden="true" />
          <span>{understaffedZonesCount > 0 ? `${understaffedZonesCount} khu vực thiếu` : 'Khu vực đủ người'}</span>
          <ChevronRight size={14} aria-hidden="true" />
        </button>
        {openShiftsCount > 0 && <button type="button" className="se-operation-fact se-operation-fact--action is-warning" onClick={onOpenAttentionCenter}>
          <AlertTriangle size={14} aria-hidden="true" /><span>{openShiftsCount} vị trí cần bù</span><ChevronRight size={14} aria-hidden="true" />
        </button>}
      </div>

      <button type="button" className={`se-operations-strip__attention ${needsAttention ? 'has-alerts' : ''}`} onClick={onOpenAttentionCenter}>
        {needsAttention ? <AlertTriangle size={15} aria-hidden="true" /> : <CheckCircle2 size={15} aria-hidden="true" />}
        <span>{needsAttention ? 'Xem việc cần xử lý' : 'Tình hình ổn định'}</span>
        <ChevronRight size={14} aria-hidden="true" />
      </button>
    </section>
  );
}
