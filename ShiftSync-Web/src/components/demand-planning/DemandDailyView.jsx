import React, { useState, useMemo } from 'react';
import { toast } from '../../context/ToastContext';

export default function DemandDailyView({
  loading,
  error,
  data,
  onUpdateCount,
  onUpdateNorm,
  onAutoFill,
  onApplyToScheduler,
  onRetry,
  saving,
}) {
  const [editingNorm, setEditingNorm] = useState(null);

  const positionKpis = data?.positionKpis || [];
  const shifts = data?.shifts || [];
  const warningBanner = data?.warningBanner;
  const summary = data?.summary;

  // Calculate dynamic live statistics across all shifts and quotas
  const {
    violations,
    overstaffed,
    compliantLiveCells,
    totalLiveCells,
    totalHeadcount,
    liveSlaPct,
    activeBanner
  } = useMemo(() => {
    const viols = [];
    const overs = [];
    let compliantCount = 0;
    let totalCount = 0;
    let headcount = 0;

    shifts.forEach((s) => {
      (s.quotas || []).forEach((q) => {
        totalCount++;
        headcount += (q.count || 0);
        if (q.count < q.min) {
          viols.push({
            shiftName: s.name,
            positionName: q.positionName,
            count: q.count,
            min: q.min,
            diff: q.min - q.count,
          });
        } else {
          compliantCount++;
          if (q.max && q.count > q.max) {
            overs.push({
              shiftName: s.name,
              positionName: q.positionName,
              count: q.count,
              max: q.max,
            });
          }
        }
      });
    });

    const slaPct = totalCount > 0 ? Math.round((compliantCount / totalCount) * 100) : (summary?.slaComplianceRate ?? 100);

    let banner = warningBanner;
    if (viols.length > 0) {
      const violationSummary = viols.length <= 2
        ? viols.map((v) => `${v.shiftName} - ${v.positionName} (hiện có ${v.count}/${v.min} NV, thiếu ${v.diff} NV)`).join('; ')
        : `Phát hiện ${viols.length} vị trí thiếu quân số: ` +
          viols.slice(0, 3).map((v) => `${v.shiftName} (${v.positionName} thiếu ${v.diff})`).join(', ') +
          (viols.length > 3 ? ` và ${viols.length - 3} vị trí khác.` : '.');

      banner = {
        hasViolation: true,
        title: `⚠️ Cảnh báo thiếu quân số vận hành (${viols.length} vị trí chưa đạt định mức)`,
        message: violationSummary,
        impactDescription: `Tỷ lệ đáp ứng SLA hiện tại: ${slaPct}%. Cần bổ sung thêm ${viols.reduce((sum, v) => sum + v.diff, 0)} nhân sự trước khi áp dụng sang Scheduler để đảm bảo chất lượng phục vụ.`,
      };
    } else if (totalCount > 0) {
      const totalHours = summary?.totalHours ?? shifts.reduce(
        (sum, shift) => sum + (shift.quotas || []).reduce(
          (shiftSum, quota) => shiftSum + (quota.count || 0) * (shift.durationHours || 0), 0), 0);
      const extraOverstaffed = overs.length > 0
        ? ` (Ghi nhận ${overs.length} vị trí vượt mức trần tối đa: ${overs.map((o) => `${o.positionName} ${o.count}/${o.max}`).join(', ')})`
        : '';

      banner = {
        hasViolation: false,
        title: `✓ Đạt chuẩn SLA vận hành (${slaPct}% chuẩn định biên)`,
        message: `Tất cả ${shifts.length} ca trong ngày (${compliantCount}/${totalCount} vị trí) đã đạt chuẩn định biên SLA vận hành!${extraOverstaffed}`,
        impactDescription: `Đã phân bổ đủ ${headcount} lượt nhân sự (${totalHours} giờ công) theo đúng định mức nhân sự cho toàn bộ các ca làm việc.`,
      };
    }

    return {
      violations: viols,
      overstaffed: overs,
      compliantLiveCells: compliantCount,
      totalLiveCells: totalCount,
      totalHeadcount: headcount,
      liveSlaPct: slaPct,
      activeBanner: banner
    };
  }, [shifts, summary, warningBanner]);

  // 1. Loading Skeleton State
  if (loading) {
    return (
      <div className="dp-daily-view-container">
        {/* KPI Cards Skeleton */}
        <div className="dp-kpi-grid">
          <div className="dp-skeleton dp-skeleton-card" />
          <div className="dp-skeleton dp-skeleton-card" />
          <div className="dp-skeleton dp-skeleton-card" />
          <div className="dp-skeleton dp-skeleton-card" />
        </div>

        {/* Table Skeleton */}
        <div className="dp-table-container" style={{ marginTop: '24px' }}>
          <div className="dp-skeleton dp-skeleton-row" style={{ height: '48px' }} />
          <div className="dp-skeleton dp-skeleton-row" />
          <div className="dp-skeleton dp-skeleton-row" />
          <div className="dp-skeleton dp-skeleton-row" />
        </div>

        {/* Banner Skeleton */}
        <div className="dp-skeleton dp-skeleton-banner" />
      </div>
    );
  }

  // 2. Error State
  if (error) {
    return (
      <div className="dp-error-card">
        <h3 className="dp-error-title">Không thể tải dữ liệu định biên</h3>
        <p className="dp-error-msg">{error}</p>
        <button type="button" className="dp-btn-retry" onClick={onRetry}>
          Thử lại
        </button>
      </div>
    );
  }

  if (!data) return null;

  const morningShift = shifts.find((s) => s.name?.includes('Sáng')) || shifts[0];
  const afternoonShift = shifts.find((s) => s.name?.includes('Chiều')) || shifts[1];

  // Map quotas by position ID for each shift
  const morningQuotas = new Map((morningShift?.quotas || []).map((q) => [q.positionId, q]));
  const afternoonQuotas = new Map((afternoonShift?.quotas || []).map((q) => [q.positionId, q]));

  return (
    <div className="dp-daily-view-container">
      {/* ── A. KHỐI TỔNG QUAN VỊ TRÍ + TIẾN ĐỘ ĐỊNH BIÊN ── */}
      <div className="dp-daily-kpi-row">
        <div className="dp-daily-kpi-cards">
          {positionKpis.map((kpi) => {
            const isWarning = kpi.slaPercentage < 100;
            const displayName = kpi.positionName.includes('(')
              ? kpi.positionName
              : kpi.code === 'BARISTA'
              ? 'Barista (Pha chế)'
              : kpi.code === 'CASHIER'
              ? 'Thu ngân (Cashier)'
              : kpi.code === 'KITCHEN'
              ? 'Bếp (Kitchen)'
              : kpi.code === 'WAITER'
              ? 'Phục vụ (Waiter)'
              : kpi.code === 'LEADER'
              ? 'Trưởng ca (Leader)'
              : kpi.positionName;
            return (
              <div key={kpi.positionId} className={`dp-kpi-card ${isWarning ? 'kpi-warning' : ''}`}>
                <div className="dp-kpi-card-header">
                  <div className="dp-kpi-icon-title">
                    <span className="dp-kpi-name">{displayName}</span>
                  </div>
                  <span className={`dp-kpi-badge ${isWarning ? 'badge-warning' : 'badge-success'}`}>
                    {kpi.slaPercentage}%
                  </span>
                </div>
                <div className="dp-kpi-card-desc">
                  <span>
                    {kpi.assignedHours}h công
                  </span>
                  {isWarning && <span className="dp-violation-note">• Chưa đạt</span>}
                </div>

                {/* Inline Norm Box for Daily View */}
                <div className="dp-rci-norms-box" style={{ marginTop: '6px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span className="dp-rci-norms-lbl">Quy chuẩn:</span>
                  <span>
                    Min:{' '}
                    <input
                      type="number"
                      min="0"
                      max="10"
                      defaultValue={kpi.min ?? (kpi.code === 'LEADER' ? 0 : 1)}
                      style={{ width: '32px', textAlign: 'center', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '1px', fontSize: '11px' }}
                      onBlur={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val) && val !== kpi.min) {
                          onUpdateNorm && onUpdateNorm(kpi.positionId, val, kpi.target ?? 2, kpi.max ?? 4);
                        }
                      }}
                    />
                  </span>
                  <span className="dp-pipe" style={{ color: '#cbd5e1' }}>|</span>
                  <span>
                    Target:{' '}
                    <input
                      type="number"
                      min="0"
                      max="10"
                      defaultValue={kpi.target ?? 2}
                      style={{ width: '32px', textAlign: 'center', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '1px', fontSize: '11px' }}
                      onBlur={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val) && val !== kpi.target) {
                          onUpdateNorm && onUpdateNorm(kpi.positionId, kpi.min ?? 1, val, kpi.max ?? 4);
                        }
                      }}
                    />
                  </span>
                  <span className="dp-pipe" style={{ color: '#cbd5e1' }}>|</span>
                  <span>
                    Max:{' '}
                    <input
                      type="number"
                      min="0"
                      max="10"
                      defaultValue={kpi.max ?? (kpi.code === 'CASHIER' ? 2 : 4)}
                      style={{ width: '32px', textAlign: 'center', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '1px', fontSize: '11px' }}
                      onBlur={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val) && val !== kpi.max) {
                          onUpdateNorm && onUpdateNorm(kpi.positionId, kpi.min ?? 1, kpi.target ?? 2, val);
                        }
                      }}
                    />
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* SLA Progress Gauge Card */}
        <div className="dp-daily-sla-card">
          <div className="dp-sla-header">
            <span className="dp-sla-title">Tiến độ định biên hôm nay</span>
            <span className="dp-sla-value">
              {liveSlaPct}% ({compliantLiveCells}/{totalLiveCells} ca SLA)
            </span>
          </div>
          <div className="dp-sla-bar-wrap">
            <div
              className="dp-sla-bar-green"
              style={{ width: `${Math.min(100, liveSlaPct)}%` }}
            />
            <div
              className="dp-sla-bar-red"
              style={{ width: `${Math.max(0, 100 - liveSlaPct)}%` }}
            />
          </div>
          <div className="dp-sla-footer-labels">
            <span className="dp-sla-text-green">
              {compliantLiveCells} ca đạt chuẩn
            </span>
            {violations.length > 0 ? (
              <span className="dp-sla-text-red">
                {violations.length} ca vi phạm
              </span>
            ) : (
              <span className="dp-sla-text-green">0 ca vi phạm</span>
            )}
          </div>
        </div>
      </div>

      {/* ── B. BẢNG CHÍNH — SUB-TIMELINES 2 CA / NGÀY ── */}
      <div className="dp-daily-table-wrap">
        <div className="dp-daily-table-header">
          <div className="dp-col-role-header">
            <span className="dp-th-title">CHỨC DANH</span>
            <span className="dp-th-sub">2 CA / NGÀY</span>
          </div>

          <div className="dp-col-shifts-header-group">
            {/* Ca Sáng Header */}
            <div className="dp-shift-header-block">
              <div className="dp-shift-title-row">
                <span className="dp-shift-dot" style={{ background: '#f59e0b' }} />
                <span className="dp-shift-name">{morningShift?.name || data?.morningLabel || 'Ca Sáng'}</span>
                <span className="dp-shift-timerange">
                  {morningShift?.startTime || data?.openTime?.slice(0, 5) || '08:00'} – {morningShift?.endTime || data?.midTime?.slice(0, 5) || '15:30'} ({morningShift?.durationHours || 8} tiếng)
                </span>
              </div>
              <div className="dp-shift-timeline-ticks">
                {(morningShift?.timelineHours || [8, 10, 12, 14]).map((h) => (
                  <span key={h}>{h}h</span>
                ))}
              </div>
            </div>

            {/* Ca Chiều Header */}
            <div className="dp-shift-header-block">
              <div className="dp-shift-title-row">
                <span className="dp-shift-dot" style={{ background: '#6366f1' }} />
                <span className="dp-shift-name">{afternoonShift?.name || data?.afternoonLabel || 'Ca Chiều'}</span>
                <span className="dp-shift-timerange">
                  {afternoonShift?.startTime || data?.midTime?.slice(0, 5) || '15:30'} – {afternoonShift?.endTime || data?.closeTime?.slice(0, 5) || '23:00'} ({afternoonShift?.durationHours || 8} tiếng)
                </span>
              </div>
              <div className="dp-shift-timeline-ticks">
                {(afternoonShift?.timelineHours || [16, 18, 20, 22]).map((h) => (
                  <span key={h}>{h}h</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Rows */}
        <div className="dp-daily-table-body">
          {positionKpis.map((kpi) => {
            const mQuota = morningQuotas.get(kpi.positionId);
            const aQuota = afternoonQuotas.get(kpi.positionId);

            const mCount = mQuota?.count ?? 2;
            const mMin = mQuota?.min ?? kpi.min ?? 1;
            const mTarget = mQuota?.target ?? kpi.target ?? 2;
            const mMax = mQuota?.max ?? kpi.max ?? 4;
            const mIsViolation = mCount < mMin;
            const mIsExceed = mCount > mMax;
            const mCellClass = mIsViolation ? 'cell-violation' : mIsExceed ? 'cell-exceed' : 'cell-standard';
            const mDotColor = mIsViolation ? '#ef4444' : mIsExceed ? '#f59e0b' : '#2563eb';
            const mTextClass = mIsViolation ? 'text-violation' : mIsExceed ? 'text-exceed' : '';
            const mTagClass = mIsViolation ? 'sla-violation' : mIsExceed ? 'sla-exceed' : 'sla-standard';
            const mTagLabel = mIsViolation
              ? `Thiếu ${mMin - mCount} NV`
              : mIsExceed
              ? `Vượt chuẩn (+${mCount - mMax} NV)`
              : 'Đạt chuẩn';

            const aCount = aQuota?.count ?? 2;
            const aMin = aQuota?.min ?? kpi.min ?? 1;
            const aTarget = aQuota?.target ?? kpi.target ?? 2;
            const aMax = aQuota?.max ?? kpi.max ?? 4;
            const aIsViolation = aCount < aMin;
            const aIsExceed = aCount > aMax;
            const aCellClass = aIsViolation ? 'cell-violation' : aIsExceed ? 'cell-exceed' : 'cell-standard';
            const aDotColor = aIsViolation ? '#ef4444' : aIsExceed ? '#f59e0b' : '#2563eb';
            const aTextClass = aIsViolation ? 'text-violation' : aIsExceed ? 'text-exceed' : '';
            const aTagClass = aIsViolation ? 'sla-violation' : aIsExceed ? 'sla-exceed' : 'sla-standard';
            const aTagLabel = aIsViolation
              ? `Thiếu ${aMin - aCount} NV`
              : aIsExceed
              ? `Vượt chuẩn (+${aCount - aMax} NV)`
              : 'Đạt chuẩn';

            return (
              <div key={kpi.positionId} className="dp-daily-role-row">
                {/* Role Info Cell */}
                <div className="dp-role-info-cell">
                  <div className="dp-role-text-meta">
                    <span className="dp-role-title">{kpi.positionName}</span>
                    <span className="dp-role-subtitle">{kpi.positionDescription || kpi.normLabel}</span>
                  </div>
                </div>

                {/* 2 Shift Cells */}
                <div className="dp-shifts-cells-group">
                  {/* Morning Cell */}
                  <div className={`dp-shift-cell-card ${mCellClass}`}>
                    <div className="dp-cell-top-row">
                      <div className="dp-cell-headcount-badge">
                        <span
                          className="dp-cell-dot"
                          style={{ background: mDotColor }}
                        />
                        <span className={`dp-cell-number ${mTextClass}`}>{mCount} NV</span>
                      </div>
                      <span className={`dp-sla-tag ${mTagClass}`}>
                        {mTagLabel}
                      </span>
                    </div>

                    <div className="dp-cell-norm-desc">
                      {mIsViolation ? (
                        <span className="dp-norm-violation-text">Thiếu {mMin - mCount} NV (Mức sàn: {mMin} NV)</span>
                      ) : mIsExceed ? (
                        <span className="dp-norm-exceed-text">Vượt quá +{mCount - mMax} NV (Mức trần: {mMax} NV)</span>
                      ) : (
                        <span className="dp-norm-standard-text">Định mức: Min {mMin} • Chuẩn {mTarget} • Max {mMax} NV</span>
                      )}
                    </div>

                    <div className="dp-cell-actions-row">
                      <div className={`dp-stepper-wrap ${mIsViolation ? 'stepper-violation' : ''}`}>
                        <button
                          type="button"
                          className="dp-stepper-btn"
                          onClick={() =>
                            onUpdateCount &&
                            onUpdateCount(
                              mQuota?.quotaId,
                              Math.max(0, mCount - 1),
                              kpi.positionId,
                              'morning'
                            )
                          }
                          title="Giảm 1 nhân sự"
                        >
                          −
                        </button>
                        <span className="dp-stepper-input">{mCount}</span>
                        <button
                          type="button"
                          className="dp-stepper-btn"
                          onClick={() =>
                            onUpdateCount &&
                            onUpdateCount(
                              mQuota?.quotaId,
                              mCount + 1,
                              kpi.positionId,
                              'morning'
                            )
                          }
                          title="Tăng 1 nhân sự"
                        >
                          +
                        </button>
                      </div>

                      <button
                        type="button"
                        className="dp-cell-action-icon-btn"
                        onClick={() => {
                          setEditingNorm({
                            positionId: kpi.positionId,
                            positionName: kpi.positionName,
                            min: mMin,
                            target: mTarget,
                            max: mMax,
                          });
                        }}
                        title="Điều chỉnh định mức & Quy chuẩn"
                      >
                        Sửa
                      </button>
                    </div>
                  </div>

                  {/* Afternoon Cell */}
                  <div className={`dp-shift-cell-card ${aCellClass}`}>
                    <div className="dp-cell-top-row">
                      <div className="dp-cell-headcount-badge">
                        <span
                          className="dp-cell-dot"
                          style={{ background: aDotColor }}
                        />
                        <span className={`dp-cell-number ${aTextClass}`}>{aCount} NV</span>
                      </div>
                      <span className={`dp-sla-tag ${aTagClass}`}>
                        {aTagLabel}
                      </span>
                    </div>

                    <div className="dp-cell-norm-desc">
                      {aIsViolation ? (
                        <span className="dp-norm-violation-text">Thiếu {aMin - aCount} NV (Mức sàn: {aMin} NV)</span>
                      ) : aIsExceed ? (
                        <span className="dp-norm-exceed-text">Vượt quá +{aCount - aMax} NV (Mức trần: {aMax} NV)</span>
                      ) : (
                        <span className="dp-norm-standard-text">Định mức: Min {aMin} • Chuẩn {aTarget} • Max {aMax} NV</span>
                      )}
                    </div>

                    <div className="dp-cell-actions-row">
                      <div className={`dp-stepper-wrap ${aIsViolation ? 'stepper-violation' : ''}`}>
                        <button
                          type="button"
                          className="dp-stepper-btn"
                          onClick={() =>
                            onUpdateCount &&
                            onUpdateCount(
                              aQuota?.quotaId,
                              Math.max(0, aCount - 1),
                              kpi.positionId,
                              'afternoon'
                            )
                          }
                          title="Giảm 1 nhân sự"
                        >
                          −
                        </button>
                        <span className="dp-stepper-input">{aCount}</span>
                        <button
                          type="button"
                          className="dp-stepper-btn"
                          onClick={() =>
                            onUpdateCount &&
                            onUpdateCount(
                              aQuota?.quotaId,
                              aCount + 1,
                              kpi.positionId,
                              'afternoon'
                            )
                          }
                          title="Tăng 1 nhân sự"
                        >
                          +
                        </button>
                      </div>

                      <button
                        type="button"
                        className="dp-cell-action-icon-btn"
                        onClick={() => {
                          setEditingNorm({
                            positionId: kpi.positionId,
                            positionName: kpi.positionName,
                            min: aMin,
                            target: aTarget,
                            max: aMax,
                          });
                        }}
                        title="Điều chỉnh định mức & Quy chuẩn"
                      >
                        Sửa
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── C. KHỐI CẢNH BÁO / RÀ SOÁT ĐỊNH BIÊN ── */}
      {activeBanner && (
        <div className={`dp-daily-alert-banner ${!activeBanner.hasViolation ? 'alert-banner-success' : ''}`}>
          <div className="dp-alert-left">
            <div className={`dp-alert-icon-wrap ${!activeBanner.hasViolation ? 'success' : ''}`}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                {!activeBanner.hasViolation ? 'check_circle' : 'warning'}
              </span>
            </div>
            <div>
              <div className="dp-alert-title">{activeBanner.title}</div>
              <div className="dp-alert-desc">
                {activeBanner.message} {activeBanner.impactDescription ? `— ${activeBanner.impactDescription}` : ''}
              </div>
            </div>
          </div>

          <div className="dp-alert-actions">
            {activeBanner.hasViolation && (
              <>
                <button
                  type="button"
                  className="dp-btn-autofill"
                  onClick={onAutoFill}
                  disabled={saving}
                >
                  Tự động lấp đầy theo chuẩn
                </button>
                <button
                  type="button"
                  className="dp-btn-inspect"
                  onClick={() => {
                    const el = document.querySelector('.cell-violation');
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }}
                >
                  Xem ô vi phạm
                </button>
              </>
            )}
            <button
              type="button"
              className="dp-btn-apply-primary"
              onClick={onApplyToScheduler}
              disabled={saving}
            >
              Áp dụng định biên sang Scheduler
            </button>
          </div>
        </div>
      )}

      {/* ── D. TỔNG KẾT CUỐI TRANG (FOOTER SUMMARY) ── */}
      {summary && (
        <div className="dp-daily-footer-bar">
          <div className="dp-footer-meta-left">
            <span className="dp-footer-main-text">
              Tổng giờ công dự kiến: <strong>{summary.totalHours} giờ</strong> ({summary.totalShiftsCount} lượt ca) • Chi phí ước tính: ~<strong>{summary.estimatedCost?.toLocaleString('vi-VN')} đ</strong> {summary.costBreakdownText}
            </span>
            <span className="dp-footer-sub-rate">
              Tỷ lệ đáp ứng định biên: {summary.slaComplianceRate}% Tuân thủ SLA vận hành
            </span>
          </div>

          <div className="dp-footer-sync-status">
            <span>{summary.isBiometricSynced ? 'Đã đồng bộ với hệ thống chấm công vân tay' : 'Chưa đồng bộ máy chấm công'}</span>
          </div>
        </div>
      )}

      {/* ── E. MODAL ĐIỀU CHỈNH ĐỊNH MỨC QUY CHUẨN (MIN / TARGET / MAX) ── */}
      {editingNorm && (
        <div className="dp-norm-dialog-backdrop" onClick={() => setEditingNorm(null)}>
          <div className="dp-norm-dialog-card" onClick={(e) => e.stopPropagation()}>
            <div className="dp-norm-dialog-header">
              <h3>Điều chỉnh định mức quy chuẩn: {editingNorm.positionName}</h3>
              <button
                type="button"
                className="dp-norm-dialog-close"
                onClick={() => setEditingNorm(null)}
              >
                ✕
              </button>
            </div>
            <p className="dp-norm-dialog-desc">
              Cập nhật khung định mức nhân sự (Min / Target / Max) cho vị trí này. Hệ thống sẽ tự động đối chiếu số lượng và cảnh báo khi thiếu hụt hoặc vượt trần.
            </p>
            <div className="dp-norm-dialog-body">
              <div className="dp-norm-field">
                <label>Mức sàn (Min NV)</label>
                <input
                  type="number"
                  min="0"
                  value={editingNorm.min}
                  onChange={(e) =>
                    setEditingNorm({ ...editingNorm, min: Math.max(0, parseInt(e.target.value, 10) || 0) })
                  }
                />
                <span className="dp-norm-hint">Cảnh báo vi phạm nếu số NV dưới mức này</span>
              </div>
              <div className="dp-norm-field">
                <label>Mức chuẩn (Target NV)</label>
                <input
                  type="number"
                  min="1"
                  value={editingNorm.target}
                  onChange={(e) =>
                    setEditingNorm({ ...editingNorm, target: Math.max(1, parseInt(e.target.value, 10) || 1) })
                  }
                />
                <span className="dp-norm-hint">Số lượng mục tiêu khi xếp ca tối ưu</span>
              </div>
              <div className="dp-norm-field">
                <label>Mức trần (Max NV)</label>
                <input
                  type="number"
                  min="1"
                  value={editingNorm.max}
                  onChange={(e) =>
                    setEditingNorm({ ...editingNorm, max: Math.max(1, parseInt(e.target.value, 10) || 1) })
                  }
                />
                <span className="dp-norm-hint">Cảnh báo vượt ngân sách nếu số NV vượt mức này</span>
              </div>
            </div>
            <div className="dp-norm-dialog-actions">
              <button
                type="button"
                className="dp-btn-cancel-norm"
                onClick={() => setEditingNorm(null)}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                className="dp-btn-save-norm"
                onClick={() => {
                  if (editingNorm.min > editingNorm.max) {
                    toast.warning('Mức sàn (Min) không được lớn hơn Mức trần (Max)!');
                    return;
                  }
                  if (onUpdateNorm) {
                    onUpdateNorm(
                      editingNorm.positionId,
                      editingNorm.min,
                      editingNorm.target,
                      editingNorm.max
                    );
                  }
                  setEditingNorm(null);
                }}
              >
                Lưu quy chuẩn định mức
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
