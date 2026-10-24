const WD = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const dm = (d) => `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
const same = (a, b) => a && b && a.toDateString() === b.toDateString();
const W = 640, H = 200, L = 32, R = 8, T = 10, B = 28;
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
                  <title>{`${p.name}: ${c} ca (${dm(d.day)})`}</title>
                </rect>
              );
            })}
            {totals[i] > 0 && <text className="val" x={x + 16} y={y(totals[i]) - 5} textAnchor="middle">{totals[i]}</text>}
            <text className={same(d.day, today) ? "tdy" : ""} x={x + 16} y={H - 10} textAnchor="middle">
              {WD[d.day.getDay()]} {dm(d.day)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* Đường thẳng nối điểm */
export function HoursChart({ days = [], today = new Date() }) {
  if (!days.length) return null;
  const st = PW / days.length;
  const mx = Math.max(8, Math.ceil(Math.max(...days.map((d) => Math.max(d.planned || 0, d.actual || 0)), 0) / 8) * 8);
  const x = (i) => L + st * i + st / 2;
  const y = (v) => T + PH - (v / mx) * PH;
  const path = (k) => days.map((d, i) => `${i ? "L" : "M"}${x(i)} ${y(d[k] || 0)}`).join(" ");
  const hasPlan = days.some((d) => (d.planned || 0) > 0);

  return (
    <svg className="db-chart" viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Giờ lịch xếp và giờ thực làm theo ngày">
      {[0, 1, 2, 3].map((k) => (
        <g key={k}>
          <line className="gl" x1={L} x2={W - R} y1={y((mx / 3) * k)} y2={y((mx / 3) * k)} />
          <text x={L - 6} y={y((mx / 3) * k) + 4} textAnchor="end">{Math.round((mx / 3) * k)}</text>
        </g>
      ))}
      {hasPlan && <path d={`${path("planned")} L${x(days.length - 1)} ${y(0)} L${x(0)} ${y(0)}Z`} fill="var(--ss-ac)" opacity={0.1} />}
      <path d={path("planned")} className="l1" fill="none" strokeWidth={2.5} strokeLinejoin="round" />
      <path d={path("actual")} className="l2" fill="none" strokeWidth={2.5} strokeLinejoin="round" />
      {days.map((d, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(d.planned || 0)} r={same(d.day, today) ? 5 : 3.5} className="l1 dot" strokeWidth={2}>
            <title>{`${dm(d.day)}: xếp ${d.planned || 0} giờ`}</title>
          </circle>
          <circle cx={x(i)} cy={y(d.actual || 0)} r={3.5} className="l2 dot" strokeWidth={2}>
            <title>{`${dm(d.day)}: làm ${d.actual || 0} giờ`}</title>
          </circle>
          <text className={same(d.day, today) ? "tdy" : ""} x={x(i)} y={H - 10} textAnchor="middle">
            {WD[d.day.getDay()]} {dm(d.day)}
          </text>
        </g>
      ))}
    </svg>
  );
}
