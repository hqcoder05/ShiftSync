const WD = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const dm = (d) => `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
const same = (a, b) => a && b && a.toDateString() === b.toDateString();
const W = 840, H = 240, L = 42, R = 12, T = 18, B = 38;
const PW = W - L - R, PH = H - T - B;

/* Cột xếp chồng: số ca theo vị trí, trục dọc luôn là số nguyên đều */
export function AssignedChart({ days = [], positions = [], today = new Date() }) {
  if (!days.length) return null;
  const st = PW / days.length;
  const totals = days.map((d) => positions.reduce((a, p) => a + (d.counts?.[p.id] ?? 0), 0));
  const step = Math.max(1, Math.ceil(Math.max(4, ...totals) / 4));
  const mx = step * 4;
  const y = (v) => T + PH - (v / mx) * PH;

  return (
    <svg className="db-chart" viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Số ca được phân công theo vị trí">
      {[0, 1, 2, 3, 4].map((k) => (
        <g key={k}>
          <line className="gl" x1={L} x2={W - R} y1={y(k * step)} y2={y(k * step)} />
          <text x={L - 6} y={y(k * step) + 4} textAnchor="end">{k * step}</text>
        </g>
      ))}
      {days.map((d, i) => {
        const x = L + i * st + (st - 32) / 2;
        let acc = 0;
        return (
          <g key={i}>
            {positions.map((p) => {
              const c = d.counts?.[p.id] ?? 0;
              if (!c) return null;
              const top = y(acc + c);
              acc += c;
              return (
                <rect key={p.id} x={x} y={top} width={32} height={Math.max(1, (c / mx) * PH - 1)} rx={3} fill={p.color}>
                <title>{`${p.name}: ${c} ca (${d.label || dm(d.day)})`}</title>
                </rect>
              );
            })}
            {totals[i] > 0 && <text className="val" x={x + 16} y={y(totals[i]) - 5} textAnchor="middle">{totals[i]}</text>}
            <text className={d.isAnchor || same(d.day, today) ? "tdy" : ""} x={x + 16} y={H - 10} textAnchor="middle">
              {d.label || `${WD[d.day.getDay()]} ${dm(d.day)}`}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* Cột theo ngày giúp so sánh giờ phân công và giờ chấm công mà không làm một ngày đột biến kéo dẹt cả tuần. */
export function HoursChart({ days = [], today = new Date() }) {
  if (!days.length) return null;
  const st = PW / days.length;
  const maxValue = Math.max(...days.map((d) => Math.max(d.planned || 0, d.actual || 0)), 0);
  const step = Math.max(2, Math.ceil(maxValue / 4 / 2) * 2);
  const mx = Math.max(8, step * 4);
  const y = (v) => T + PH - (v / mx) * PH;

  return (
    <svg className="db-chart" viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="So sánh giờ đã phân công và giờ thực làm theo từng ngày trong 7 ngày">
      {[0, 1, 2, 3, 4].map((k) => (
        <g key={k}>
          <line className="gl" x1={L} x2={W - R} y1={y(step * k)} y2={y(step * k)} />
          <text x={L - 8} y={y(step * k) + 4} textAnchor="end">{step * k}h</text>
        </g>
      ))}
      {days.map((d, i) => (
        <g key={i}>
          {[
            { key: "planned", value: d.planned || 0, className: "db-hour-planned", label: "Đã phân công" },
            { key: "actual", value: d.actual || 0, className: "db-hour-actual", label: "Thực làm" },
          ].map((series, seriesIndex) => {
            const barWidth = Math.min(30, st * 0.3);
            const barX = L + st * i + st / 2 + (seriesIndex === 0 ? -barWidth - 2 : 2);
            const barHeight = series.value > 0 ? Math.max(2, (series.value / mx) * PH) : 0;
            return (
              <g key={series.key}>
                {barHeight > 0 && <rect x={barX} y={y(series.value)} width={barWidth} height={barHeight} rx={4} className={series.className} />}
                <title>{`${d.label || dm(d.day)} · ${series.label}: ${series.value} giờ`}</title>
                {series.value > 0 && <text className="db-hour-value" x={barX + barWidth / 2} y={y(series.value) - 6} textAnchor="middle">{series.value}</text>}
              </g>
            );
          })}
          <text className={d.isAnchor || same(d.day, today) ? "tdy" : ""} x={L + st * i + st / 2} y={H - 12} textAnchor="middle">
            {d.label || `${WD[d.day.getDay()]} ${dm(d.day)}`}
          </text>
        </g>
      ))}
    </svg>
  );
}
