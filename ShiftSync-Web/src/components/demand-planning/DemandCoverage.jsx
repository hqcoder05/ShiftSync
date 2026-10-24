export default function DemandCoverage({ quota }) {
  if (!quota) return null;
  const source = quota.source === 'SAVED' ? 'Đã lưu' : quota.source === 'SUGGESTED' ? 'Gợi ý' : 'Chưa rõ nguồn';
  const known = Number.isInteger(quota.assignedCount);
  return <div className="dp-coverage" aria-label="Nguồn nhu cầu và phân công">
    <span>{source}</span>
    <span>{known ? `Đã xếp ${quota.assignedCount} · Thiếu ${quota.shortageCount ?? '—'}${quota.excessCount > 0 ? ` · Dư ${quota.excessCount}` : ''}` : 'Chưa có số liệu phân công'}</span>
    {quota.unclassifiedAssignedCount > 0 && <span title="Tổng của cả ca, không cộng lại theo từng vị trí">Ca có {quota.unclassifiedAssignedCount} phân công chưa rõ vị trí</span>}
  </div>;
}
