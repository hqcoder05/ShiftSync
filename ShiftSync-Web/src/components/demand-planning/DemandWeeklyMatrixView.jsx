import React, { useState } from 'react';

export default function DemandWeeklyMatrixView({
  loading,
  error,
  data,
  onUpdateCell,
  onUpdateNorm,
  onAutoFill,
  onApplyToScheduler,
  onUpdateBudget,
  onRetry,
  saving,
}) {
  const [warningsCollapsed, setWarningsCollapsed] = useState(false);
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [editingBudgetValue, setEditingBudgetValue] = useState('');

  // 1. Loading Skeleton State
  if (loading) {
    return (
      <div className="dp-weekly-view-container">
        {/* Progress Bar Skeleton */}
        <div className="dp-skeleton dp-skeleton-row" style={{ height: '56px' }} />

        {/* Position Cards Skeleton */}
        <div className="dp-wk-kpi-grid" style={{ marginTop: '16px' }}>
          <div className="dp-skeleton dp-skeleton-card" />
          <div className="dp-skeleton dp-skeleton-card" />
          <div className="dp-skeleton dp-skeleton-card" />
        </div>

        {/* Matrix Skeleton */}
        <div className="dp-wk-matrix-wrap" style={{ marginTop: '24px' }}>
          <div className="dp-skeleton dp-skeleton-row" style={{ height: '60px' }} />
          <div className="dp-skeleton dp-skeleton-row" style={{ height: '90px' }} />
          <div className="dp-skeleton dp-skeleton-row" style={{ height: '90px' }} />
          <div className="dp-skeleton dp-skeleton-row" style={{ height: '90px' }} />
        </div>

        {/* Warnings Skeleton */}
        <div className="dp-skeleton dp-skeleton-banner" style={{ height: '80px' }} />
      </div>
    );
  }

  // 2. Error State
  if (error) {
    return (
      <div className="dp-error-card">
        <h3 className="dp-error-title">Không thể tải ma trận định biên tuần</h3>
        <p className="dp-error-msg">{error}</p>
        <button type="button" className="dp-btn-retry" onClick={onRetry}>
          Thử lại
        </button>
      </div>
    );
  }

  if (!data) return null;

  const {
    progressTitle,
    progressPills,
    positionCards = [],
    days = [],
    matrixRows = [],
    summaryRows,
    warnings = [],
    budget,
  } = data;

  return (
    <div className="dp-weekly-container">
      {/* ── A. THANH TIẾN ĐỘ PHÂN BỔ ĐỊNH BIÊN TUẦN ── */}
      <div className="dp-weekly-progress-section">
        <div className="dp-wp-header">
          <div className="dp-wp-title-row">
            <strong>{progressTitle || 'TIẾN ĐỘ PHÂN BỔ ĐỊNH BIÊN TUẦN'}</strong>
            {progressPills?.needsReviewCount > 0 && (
              <span className="dp-wp-violation-badge">
                ({progressPills.needsReviewCount} ca vi phạm cần xử lý)
              </span>
            )}
          </div>
          <div className="dp-wp-pills-group">
            {progressPills && (
              <>
                <span className="dp-wp-pill pill-standard">
                  Đạt chuẩn: {progressPills.compliantCount} ca ({progressPills.compliantPercent}%)
                </span>
                <span className="dp-wp-pill pill-peak">
                  Cao điểm: {progressPills.peakCount} ca ({progressPills.peakPercent}%)
                </span>
                {progressPills.needsReviewCount > 0 && (
                  <span className="dp-wp-pill pill-violation">
                    Cần sửa: {progressPills.needsReviewCount} ca ({progressPills.needsReviewPercent}%)
                  </span>
                )}
              </>
            )}
          </div>
        </div>

        {/* Multi-segment Progress Bar */}
        <div className="dp-wp-progress-track">
          <div
            className="dp-wp-seg green"
            style={{ width: `${progressPills?.compliantPercent || 97}%` }}
            title="Đạt chuẩn"
          />
          <div
            className="dp-wp-seg blue"
            style={{ width: `${progressPills?.peakPercent || 3}%` }}
            title="Cao điểm"
          />
          {progressPills?.needsReviewPercent > 0 && (
            <div
              className="dp-wp-seg red"
              style={{ width: `${progressPills?.needsReviewPercent}%` }}
              title="Vi phạm"
            />
          )}
        </div>
      </div>

      {/* ── B. KHỐI THẺ ĐỊNH MỨC VỊ TRÍ ── */}
      <div className="dp-weekly-role-cards-grid">
        {positionCards.map((card) => {
          const isWarning = card.slaPercentage < 100;
          return (
            <div key={card.positionId} className={`dp-role-card-item ${isWarning ? 'card-warning' : ''}`}>
              <div className="dp-rci-top-row">
                <div className="dp-rci-title-block">
                  <div>
                    <div className="dp-rci-title">{card.positionName.toUpperCase()}</div>
                    <div className="dp-rci-meta">
                      Định mức: {card.hourlyRate?.toLocaleString('vi-VN')} đ/h • Chuẩn: {card.min} - {card.max} NV/ca
                    </div>
                  </div>
                </div>
                <span className={`dp-rci-tag ${isWarning ? 'tag-warn' : 'tag-pass'}`}>
                  {card.slaPercentage}% Đạt
                </span>
              </div>

              <div className="dp-rci-stats-row">
                <span className="dp-rci-count-hours">
                  {card.assignedSlots} / {card.targetSlots} Lượt NV ({card.totalHours}h)
                </span>
                <span className="dp-rci-apply-badge">{card.applyScope}</span>
              </div>

              {/* Inline Quy Chuẩn (Min / Target / Max) */}
              <div className="dp-rci-norms-box">
                <span className="dp-rci-norms-lbl">Quy chuẩn:</span>
                <span>
                  Min:{' '}
                  <input
                    type="number"
                    min="0"
                    max="10"
                    defaultValue={card.min}
                    style={{ width: '38px', textAlign: 'center', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '1px' }}
                    onBlur={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val) && val !== card.min) {
                        onUpdateNorm && onUpdateNorm(card.positionId, val, card.target, card.max);
                      }
                    }}
                  />
                </span>
                <span className="dp-pipe">|</span>
                <span>
                  Target:{' '}
                  <input
                    type="number"
                    min="0"
                    max="10"
                    defaultValue={card.target}
                    style={{ width: '38px', textAlign: 'center', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '1px' }}
                    onBlur={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val) && val !== card.target) {
                        onUpdateNorm && onUpdateNorm(card.positionId, card.min, val, card.max);
                      }
                    }}
                  />
                </span>
                <span className="dp-pipe">|</span>
                <span>
                  Max:{' '}
                  <input
                    type="number"
                    min="0"
                    max="10"
                    defaultValue={card.max}
                    style={{ width: '38px', textAlign: 'center', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '1px' }}
                    onBlur={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val) && val !== card.max) {
                        onUpdateNorm && onUpdateNorm(card.positionId, card.min, card.target, val);
                      }
                    }}
                  />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── C. MA TRẬN ĐỊNH BIÊN 7 NGÀY (MATRIX STEPPER) ── */}
      <div className="dp-matrix-section">
        <div className="dp-matrix-subhead">
          <span className="dp-matrix-title">
            Ma trận định biên 7 ngày (Matrix Stepper) <span style={{ color: '#94a3b8' }}>| Nhấp nút [+] hoặc [-] cỡ lớn để tăng/giảm quân số từng ca.</span>
          </span>
          <div className="dp-matrix-legend">
            <span className="dp-legend-item">
              <span className="dp-legend-dot dot-green" /> Đạt chuẩn định biên
            </span>
            <span className="dp-legend-item">
              <span className="dp-legend-dot dot-blue" /> Cao điểm (+50% DT)
            </span>
            <span className="dp-legend-item">
              <span className="dp-legend-dot dot-yellow" /> Vượt chuẩn
            </span>
            <span className="dp-legend-item">
              <span className="dp-legend-dot dot-red" /> Vi phạm quy chuẩn
            </span>
          </div>
        </div>

        <div className="dp-matrix-scroll-wrap">
          <table className="dp-matrix-table">
            <thead>
              {/* Row 1: Day Headers */}
              <tr>
                <th rowSpan="2" className="dp-col-role-fixed dp-matrix-th-role">
                  <span>VỊ TRÍ TRỰC & CHUẨN</span>
                  <small>Khung giờ trực</small>
                </th>

                {days.map((d) => (
                  <th
                    key={d.date}
                    colSpan="2"
                    className={`dp-col-day-head ${(d.isPeakWeekend || d.peakWeekend) ? 'head-weekend' : ''}`}
                  >
                    <div className="dp-day-header-content">
                      <span className="dp-day-name-date">{d.dayOfWeekName}</span>
                      {(d.isPeakWeekend || d.peakWeekend) ? (
                        <span className="dp-day-peak-pill">Cuối tuần cao điểm</span>
                      ) : (
                        <span className="dp-day-revenue-text">{d.expectedRevenueText}</span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>

              {/* Row 2: Sub-shift Columns (Ca Sáng, Ca Chiều) */}
              <tr>
                {days.map((d) => (
                  <React.Fragment key={d.date}>
                    <th className="dp-col-subshift-head">
                      {data?.morningLabel || (data?.openTime && data?.midTime ? `Ca Sáng (${data.openTime.slice(0, 5)}-${data.midTime.slice(0, 5)})` : 'Ca Sáng')}
                    </th>
                    <th className="dp-col-subshift-head">
                      {data?.afternoonLabel || (data?.midTime && data?.closeTime ? `Ca Chiều (${data.midTime.slice(0, 5)}-${data.closeTime.slice(0, 5)})` : 'Ca Chiều')}
                    </th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>

            <tbody>
              {matrixRows.map((row) => (
                <tr key={row.positionId}>
                  {/* Cột Vị trí bên trái */}
                  <td className="dp-col-role-fixed dp-matrix-role-meta">
                    <div className="dp-mrm-name">{row.positionName}</div>
                    <div className="dp-mrm-sub">{row.description}</div>
                    <div className="dp-mrm-rate">{row.hourlyRate?.toLocaleString('vi-VN')} đ/h</div>
                    <div className="dp-mrm-target">{row.targetSummary}</div>
                  </td>

                  {/* 14 Cells (7 ngày x 2 ca) */}
                  {row.cells.map((cell) => {
                    const isViolation = cell.status === 'VIOLATION';
                    const isPeak = cell.status === 'PEAK' || cell.isPeakSlot || cell.peakSlot;
                    const isOver = cell.status === 'OVER';

                    return (
                      <td
                        key={cell.quotaId}
                        id={`cell_${cell.quotaId}`}
                        className={`dp-matrix-cell ${
                          isViolation
                            ? 'cell-violation'
                            : isPeak
                            ? 'cell-peak'
                            : isOver
                            ? 'cell-exceed'
                            : 'cell-standard'
                        }`}
                      >
                        <div className="dp-cell-stepper-box">
                          <div className="dp-csb-badge">
                            <span className="dp-csb-count">{cell.count} NV</span>
                            <span className="dp-csb-status">{cell.statusLabel}</span>
                          </div>

                          {/* Stepper Buttons [-] and [+] */}
                          <div className="dp-csb-btns-row">
                            <button
                              type="button"
                              className="dp-csb-btn btn-minus"
                              onClick={() =>
                                onUpdateCell &&
                                onUpdateCell(
                                  cell.quotaId,
                                  -1,
                                  cell.count,
                                  row.positionId,
                                  cell.date,
                                  cell.shiftType
                                )
                              }
                              disabled={saving || cell.count <= 0}
                              title="Giảm 1 nhân sự"
                            >
                              −
                            </button>
                            <button
                              type="button"
                              className="dp-csb-btn btn-plus"
                              onClick={() =>
                                onUpdateCell &&
                                onUpdateCell(
                                  cell.quotaId,
                                  1,
                                  cell.count,
                                  row.positionId,
                                  cell.date,
                                  cell.shiftType
                                )
                              }
                              disabled={saving}
                              title="Tăng 1 nhân sự"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}

              {/* ── Summary Row 1: Tổng quân số ca (Sáng / Chiều) ── */}
              {summaryRows?.shiftTotals && (
                <tr className="dp-matrix-summary-row">
                  <td className="dp-col-role-fixed dp-msr-label">
                    <span style={{ fontWeight: 700, color: '#1e293b' }}>TỔNG QUÂN SỐ CA</span>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>(SÁNG / CHIỀU)</span>
                  </td>
                  {days.map((d, idx) => (
                    <React.Fragment key={d.date + '_tot'}>
                      <td className="dp-msr-cell">
                        Sáng: <strong>{summaryRows.shiftTotals[idx * 2]}</strong>
                      </td>
                      <td className="dp-msr-cell">
                        Chiều: <strong>{summaryRows.shiftTotals[idx * 2 + 1]}</strong>
                      </td>
                    </React.Fragment>
                  ))}
                </tr>
              )}

              {/* ── Summary Row 2: Tổng ngày & Mức chuẩn ── */}
              {summaryRows?.dayTotals && (
                <tr className="dp-matrix-summary-row">
                  <td className="dp-col-role-fixed dp-msr-label">
                    <span style={{ fontWeight: 700, color: '#1e293b' }}>Tổng ngày & Mức chuẩn</span>
                  </td>
                  {summaryRows.dayTotals.map((dt, idx) => (
                    <td key={idx} colSpan="2" className="dp-msr-day-cell">
                      <div className="dp-day-summary-text">
                        <span>
                          Tổng: <strong>{dt.totalStaff} NV</strong> / Chuẩn {dt.standardNorm} NV
                          {dt.maxNorm ? (
                            <span style={{ fontSize: '11.5px', color: '#64748b', display: 'block', marginTop: '1px' }}>
                              (Tối đa: <strong>{dt.maxNorm} NV</strong>)
                            </span>
                          ) : null}
                        </span>
                        <span
                          className={
                            dt.badgeType === 'COMPLIANT'
                              ? 'dp-tag-ok'
                              : dt.badgeType === 'OVER'
                              ? 'dp-tag-over'
                              : 'dp-tag-warn'
                          }
                        >
                          {dt.statusBadge}
                        </span>
                      </div>
                    </td>
                  ))}
                </tr>
              )}

              {/* ── Summary Row 3: Giờ công quy đổi (8h/NV) ── */}
              {summaryRows?.manHours && (
                <tr className="dp-matrix-summary-row">
                  <td className="dp-col-role-fixed dp-msr-label">
                    <span style={{ fontWeight: 700, color: '#1e293b' }}>Giờ công quy đổi</span>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>(8h/NV)</span>
                  </td>
                  {summaryRows.manHours.map((h, idx) => (
                    <td key={idx} colSpan="2" className="dp-msr-hours-cell">
                      {h} giờ
                    </td>
                  ))}
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── D. KHỐI CẢNH BÁO / RÀ SOÁT QUY CHUẨN TUẦN ── */}
      <div className="dp-weekly-warnings-box">
        <div className="dp-wwb-header">
          <div className="dp-wwb-header-left">
            <div>
              <span className="dp-wwb-title">Danh mục rà soát & Cảnh báo quy chuẩn tuần</span>
              <p className="dp-wwb-subtitle">
                Phân loại theo mức độ nghiêm trọng đối với các vị trí vận hành trực tiếp.
              </p>
            </div>
          </div>

          <div className="dp-wwb-header-actions">
            <button
              type="button"
              className="dp-btn-autofill"
              onClick={onAutoFill}
              disabled={saving}
            >
              Tự động lấp đầy định biên theo chuẩn
            </button>
            <button
              type="button"
              className="dp-btn-collapse"
              onClick={() => setWarningsCollapsed(!warningsCollapsed)}
            >
              {warningsCollapsed ? 'Mở rộng ∨' : 'Thu gọn ∧'}
            </button>
          </div>
        </div>

        {!warningsCollapsed && (
          <div className="dp-wwb-list">
            {warnings.map((item) => {
              const sevClass =
                item.severity === 'RED'
                  ? 'badge-violation'
                  : item.severity === 'YELLOW'
                  ? 'badge-exceed'
                  : 'badge-peak';

              return (
                <div key={item.id} className={`dp-wwb-item ${sevClass}`}>
                  <div className="dp-wwb-item-left">
                    <span className={`dp-wwb-type-pill ${sevClass}`}>
                      {item.severityBadge}
                    </span>
                    <span className="dp-wwb-item-text">
                      <strong>{item.title}</strong> — {item.description}
                    </span>
                  </div>

                  <div>
                    {item.isLocked ? (
                      <span className="dp-wwb-locked-tag">Hệ thống đã khóa tự động</span>
                    ) : item.targetQuotaId ? (
                      <button
                        type="button"
                        className="dp-wwb-action-link"
                        onClick={() => {
                          const el = document.getElementById(`cell_${item.targetQuotaId}`);
                          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }}
                      >
                        [Xem ô]
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── E. TỔNG KẾT CUỐI TRANG & ĐỐI SOÁT NGÂN SÁCH THÁNG ── */}
      {budget && (
        <div className="dp-weekly-budget-bar">
          <div className="dp-wbb-top-stats">
            <div className="dp-wbb-stat-item">
              <div>
                <div className="dp-wbb-stat-lbl">TỔNG ĐỊNH BIÊN TOÀN TUẦN</div>
                <div className="dp-wbb-stat-val">
                  <strong>{budget.totalQuotas} lượt ca</strong> | {budget.totalHours} giờ công
                </div>
              </div>
            </div>

            <div className="dp-wbb-stat-item">
              <div>
                <div className="dp-wbb-stat-lbl">DỰ TOÁN CHI PHÍ TUẦN</div>
                <div className="dp-wbb-stat-val green">
                  <strong>{budget.formattedEstimatedCost}</strong>
                </div>
              </div>
            </div>

            <div className="dp-wbb-stat-item">
              <div>
                <div className="dp-wbb-stat-lbl">TỶ LỆ TUÂN THỦ ĐỊNH BIÊN SLA</div>
                <div className="dp-wbb-stat-val blue">
                  <strong>{budget.slaComplianceRate}%</strong> SLA Chuỗi
                </div>
              </div>
            </div>

            <button
              type="button"
              className="dp-btn-primary-apply"
              onClick={onApplyToScheduler}
              disabled={saving}
            >
              Áp dụng sang Scheduler xếp ca
            </button>
          </div>

          {/* Đối soát hạn ngạch ngân sách lương tháng */}
          <div className="dp-wbb-monthly-quota-box">
            <div className="dp-mq-header">
              <div className="dp-mq-header-title">
                <span>Đối soát hạn ngạch ngân sách lương tháng (Vận hành trực tiếp): </span>
                <strong>{budget.monthlyUsedBudget?.toLocaleString('vi-VN')} đ</strong> /{' '}
                {isEditingBudget ? (
                  <span className="dp-budget-edit-wrap">
                    <input
                      type="number"
                      step="1000000"
                      min="1000000"
                      className="dp-budget-input"
                      value={editingBudgetValue}
                      onChange={(e) => setEditingBudgetValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const num = parseInt(editingBudgetValue, 10);
                          if (!isNaN(num) && num > 0 && onUpdateBudget) {
                            onUpdateBudget(num);
                          }
                          setIsEditingBudget(false);
                        } else if (e.key === 'Escape') {
                          setIsEditingBudget(false);
                        }
                      }}
                      autoFocus
                    />
                    <span style={{ fontSize: '12px', color: '#64748b' }}>đ</span>
                    <button
                      type="button"
                      className="dp-btn-budget-save"
                      onClick={() => {
                        const num = parseInt(editingBudgetValue, 10);
                        if (!isNaN(num) && num > 0 && onUpdateBudget) {
                          onUpdateBudget(num);
                        }
                        setIsEditingBudget(false);
                      }}
                      title="Lưu ngân sách"
                    >
                      ✓ Lưu
                    </button>
                    <button
                      type="button"
                      className="dp-btn-budget-cancel"
                      onClick={() => setIsEditingBudget(false)}
                      title="Hủy"
                    >
                      ✕
                    </button>
                  </span>
                ) : (
                  <span
                    className="dp-budget-clickable-value"
                    onClick={() => {
                      setEditingBudgetValue(budget.monthlyQuotaBudget || 85000000);
                      setIsEditingBudget(true);
                    }}
                    title="Nhấp để chỉnh sửa ngân sách tối đa"
                  >
                    <strong className="dp-budget-display-text">
                      {budget.monthlyQuotaBudget?.toLocaleString('vi-VN')} đ
                    </strong>
                    <button
                      type="button"
                      className="dp-btn-edit-inline"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingBudgetValue(budget.monthlyQuotaBudget || 85000000);
                        setIsEditingBudget(true);
                      }}
                      title="Chỉnh sửa ngân sách tháng"
                    >
                      ✏️ Đổi ngân sách
                    </button>
                  </span>
                )}
              </div>
              <span className={`dp-mq-safe-tag ${budget.monthlyUsedPercentage > 100 ? 'over-budget' : ''}`}>
                {budget.budgetStatusText}
              </span>
            </div>
            <div className="dp-mq-track">
              <div
                className={`dp-mq-fill ${budget.monthlyUsedPercentage > 100 ? 'over-budget' : ''}`}
                style={{ width: `${Math.min(100, budget.monthlyUsedPercentage || 0)}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
