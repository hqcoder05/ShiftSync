export default function DemandCoverage({ quota }) {
  if (!quota) return null;
  const source = quota.source === 'SAVED' ? 'Nhu cầu đã lưu' : quota.source === 'SUGGESTED' ? 'Gợi ý chưa lưu' : 'Chưa rõ nguồn';
  const known = Number.isInteger(quota.assignedCount);
  const sourceClass = quota.source === 'SAVED' ? 'is-saved' : quota.source === 'SUGGESTED' ? 'is-suggested' : 'is-unknown';
  const shortage = Number.isInteger(quota.shortageCount) ? quota.shortageCount : null;
  const excess = Number.isInteger(quota.excessCount) ? quota.excessCount : 0;
  return <div className="dp-coverage" aria-label="Nhu cầu, phân công và độ phủ thực tế">
    <span className={`dp-coverage-source ${sourceClass}`}>{source}</span>
    <div className="dp-coverage-facts">
      <span>Nhu cầu <strong>{quota.count ?? '—'}</strong></span>
      {known ? <span>Đã phân công <strong>{quota.assignedCount}</strong></span> : <span>Chưa có phân công</span>}
      {shortage !== null && <span className={shortage > 0 ? 'is-shortage' : excess > 0 ? 'is-excess' : 'is-covered'}>{shortage > 0 ? `Thiếu thực tế ${shortage}` : excess > 0 ? `Dư ${excess}` : 'Đủ người'}</span>}
    </div>
    {quota.unclassifiedAssignedCount > 0 && <span className="dp-coverage-note" title="Tổng của cả ca, không cộng lại theo từng vị trí">Có {quota.unclassifiedAssignedCount} phân công chưa rõ vị trí</span>}
  </div>;
}
