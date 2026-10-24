import { useEffect, useState } from "react";
import Avatar3DWeb from "../Avatar3DWeb";
import { getAvatarForEmployee } from "../avatarConfigs";

const START = 6,
  END = 20,
  SPAN = END - START;
const hh = (h) =>
  `${String(Math.floor(h)).padStart(2, "0")}:${String(Math.round((h % 1) * 60)).padStart(2, "0")}`;
const initials = (n) =>
  (n || "")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

export default function ShiftTimeline({
  shifts = [],
  positions = [],
  isToday = false,
  onAssign,
}) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const color = (id) =>
    positions.find((p) => p.id === id)?.color ?? "var(--ss-mu)";
  const pos = (id) => positions.find((p) => p.id === id)?.name ?? "";

  if (!shifts.length) {
    return (
      <div className="db-empty">
        <strong>
          {isToday ? "Hôm nay chưa có ca nào" : "Chưa có ca trong ngày này"}
        </strong>
        Không có ca làm việc phù hợp với bộ lọc hiện tại.
        {onAssign && (
          <div>
            <button className="db-btn pri" onClick={onAssign}>
              Phân công ca ngay
            </button>
          </div>
        )}
      </div>
    );
  }

  const hr = now.getHours() + now.getMinutes() / 60;
  const showNow = isToday && hr >= START && hr < END;

  return (
    <div className="db-tl">
      <div className="db-tlin">
        <div className="db-tr h">
          <span />
          <div className="db-hrs">
            {Array.from({ length: SPAN }, (_, i) => (
              <span key={i}>{hh(START + i)}</span>
            ))}
          </div>
        </div>

        {shifts.map((s) => {
          const cStart = Math.max(START, s.start);
          const cEnd = Math.min(END, s.end);
          const barWidth = Math.max(1, ((cEnd - cStart) / SPAN) * 100);
          const barLeft = ((cStart - START) / SPAN) * 100;
          const avatarKey = s.avatarId || getAvatarForEmployee(s.employee);

          return (
            <div className="db-tr" key={s.id}>
              <div className="db-who">
                {avatarKey ? (
                  <div className="db-who-avatar" title={s.employee}>
                    <Avatar3DWeb avatarId={avatarKey} size={26} />
                  </div>
                ) : (
                  <i style={{ background: color(s.positionId) }}>
                    {initials(s.employee)}
                  </i>
                )}
                <div>
                  <b title={s.employee}>{s.employee}</b>
                  <small>{pos(s.positionId)}</small>
                </div>
              </div>
              <div className="db-trk">
                <div
                  className="db-bar"
                  style={{
                    left: `${barLeft}%`,
                    width: `${barWidth}%`,
                    borderColor: color(s.positionId),
                    background: `color-mix(in srgb, ${color(s.positionId)} 18%, transparent)`,
                  }}
                  title={`${s.employee} (${pos(s.positionId)}): ${hh(s.start)} – ${hh(s.end)}`}
                >
                  {hh(s.start)} – {hh(s.end)}
                </div>
              </div>
            </div>
          );
        })}

        {showNow && (
          <div className="db-now-layer">
            <div
              className="db-now"
              style={{ left: `${((hr - START) / SPAN) * 100}%` }}
              title={`Thời gian hiện tại: ${hh(hr)}`}
            />
          </div>
        )}
      </div>
    </div>
  );
}
