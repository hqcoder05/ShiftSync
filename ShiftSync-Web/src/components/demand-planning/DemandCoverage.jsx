export default function DemandCoverage({ quota }) {
  if (!quota) return null;
  const source = quota.source === 'SAVED' ? 'Nhu cầu đã lưu' : quota.source === 'SUGGESTED' ? 'Gợi ý chưa lưu' : 'Chưa rõ nguồn';
  const sourceClass = quota.source === 'SAVED' ? 'is-saved' : quota.source === 'SUGGESTED' ? 'is-suggested' : 'is-unknown';
  const hasPlan = Number.isInteger(quota.count) && Number.isInteger(quota.target);
  const hasAssignment = Number.isInteger(quota.assignedCount);
  const planDelta = hasPlan ? quota.count - quota.target : null;
  const scheduledShortage = hasAssignment && Number.isInteger(quota.shortageCount)
    ? quota.shortageCount : hasAssignment ? Math.max(0, quota.count - quota.assignedCount) : null;
  const scheduledExcess = hasAssignment && Number.isInteger(quota.excessCount)
    ? quota.excessCount : hasAssignment ? Math.max(0, quota.assignedCount - quota.count) : 0;
  return <div className="dp-coverage" aria-label="Nhu cầu, mục tiêu định biên và độ phủ lịch đã xếp">
    <span className={`dp-coverage-source ${sourceClass}`}>{source}</span>
    <div className="dp-coverage-facts">
      <span>Nhu cầu <strong>{quota.count ?? '—'}</strong></span>
      <span>Mục tiêu <strong>{quota.target ?? '—'}</strong></span>
      {planDelta !== null && <span className={planDelta < 0 ? 'is-shortage' : planDelta > 0 ? 'is-excess' : 'is-covered'}>{planDelta < 0 ? `Dưới mục tiêu ${Math.abs(planDelta)}` : planDelta > 0 ? `Trên mục tiêu ${planDelta}` : 'Đạt mục tiêu'}</span>}
      {hasAssignment && <span>Đã xếp lịch <strong>{quota.assignedCount}</strong></span>}
      {scheduledShortage !== null && <span className={scheduledShortage > 0 ? 'is-shortage' : scheduledExcess > 0 ? 'is-excess' : 'is-covered'}>{scheduledShortage > 0 ? `Thiếu theo lịch ${scheduledShortage}` : scheduledExcess > 0 ? `Dư theo lịch ${scheduledExcess}` : 'Đủ theo lịch'}</span>}
    </div>
    {quota.unclassifiedAssignedCount > 0 && <span className="dp-coverage-note" title="Các phân công này chưa gắn vị trí, nên chưa được tính vào từng dòng định biên">Có {quota.unclassifiedAssignedCount} phân công chưa gắn vị trí</span>}
  </div>;
}
