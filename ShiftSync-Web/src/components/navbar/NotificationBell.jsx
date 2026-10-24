import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bell, ArrowLeftRight, CalendarX, ShoppingBag, Clock, Info, CheckCheck, Inbox,
} from "lucide-react";
import "./notifications.css";

const ICON = {
  swap: { el: <ArrowLeftRight size={18} strokeWidth={2.2} />, tone: "" },
  leave: { el: <CalendarX size={18} strokeWidth={2.2} />, tone: "warn" },
  open_shift: { el: <ShoppingBag size={18} strokeWidth={2.2} />, tone: "" },
  attendance: { el: <Clock size={18} strokeWidth={2.2} />, tone: "warn" },
  system: { el: <Info size={18} strokeWidth={2.2} />, tone: "mute" },
};

function timeAgo(d) {
  if (!d) return "";
  const s = (Date.now() - new Date(d).getTime()) / 1000;
  if (s < 60) return "Vừa xong";
  if (s < 3600) return `${Math.floor(s / 60)} phút trước`;
  if (s < 86400) return `${Math.floor(s / 3600)} giờ trước`;
  if (s < 172800) return "Hôm qua";
  return new Date(d).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}
const isToday = (d) => new Date(d).toDateString() === new Date().toDateString();

export default function NotificationBell({
  items = [],
  unreadCount,
  onOpen,
  onMarkRead,
  onMarkAllRead,
  onAction,
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("all");
  const [busy, setBusy] = useState(null);
  const root = useRef(null);
  const trigger = useRef(null);

  useEffect(() => {
    if (!open) return;
    const down = (e) => { if (!root.current?.contains(e.target)) setOpen(false); };
    const key = (e) => { if (e.key === "Escape") { setOpen(false); trigger.current?.focus(); } };
    document.addEventListener("mousedown", down);
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("mousedown", down); document.removeEventListener("keydown", key); };
  }, [open]);

  const safeItems = useMemo(() => Array.isArray(items) ? items : [], [items]);
  const calculatedUnread = safeItems.filter((n) => !n.read).length;
  const unread = typeof unreadCount === "number" && unreadCount >= 0 ? unreadCount : calculatedUnread;
  const requests = safeItems.filter((n) => n.needsAction).length;

  const groups = useMemo(() => {
    const list = safeItems
      .filter((n) => (tab === "unread" ? !n.read : tab === "requests" ? n.needsAction : true))
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    const todo = tab === "requests" ? [] : list.filter((n) => n.needsAction);
    const rest = tab === "requests" ? list : list.filter((n) => !n.needsAction);
    return [
      { label: "Cần xử lý", rows: todo },
      { label: tab === "requests" ? "" : "Hôm nay", rows: rest.filter((n) => tab === "requests" || isToday(n.createdAt)) },
      { label: "Trước đó", rows: tab === "requests" ? [] : rest.filter((n) => !isToday(n.createdAt)) },
    ].filter((g) => g.rows.length);
  }, [safeItems, tab]);

  const run = async (id, a) => {
    setBusy(id);
    try { await onAction?.(id, a); } finally { setBusy(null); }
  };

  const tabs = [
    ["all", "Tất cả", 0], ["unread", "Chưa đọc", unread], ["requests", "Yêu cầu", requests],
  ];

  const getIcon = (type) => {
    const key = (type || "system").toLowerCase();
    return ICON[key] || ICON.system;
  };

  return (
    <div className="ssnf" ref={root}>
      <button ref={trigger} type="button" className="ssn-ico" aria-label={`Thông báo, ${unread} chưa đọc`} aria-expanded={open}
        aria-haspopup="dialog" onClick={() => setOpen((v) => !v)}>
        <Bell size={18} strokeWidth={2} />{unread > 0 && <em>{unread > 99 ? "99+" : unread}</em>}
      </button>

      {open && (
        <section className="ssnf-pop" role="dialog" aria-label="Thông báo">
          <div className="ssnf-head">
            <h2>Thông báo</h2>
            <button className="ssnf-link" disabled={!unread} onClick={onMarkAllRead}>
              <CheckCheck size={16} />Đánh dấu đã đọc
            </button>
          </div>

          <div className="ssnf-tabs" role="tablist">
            {tabs.map(([k, label, n]) => (
              <button key={k} role="tab" aria-selected={tab === k} className="ssnf-tab" onClick={() => setTab(k)}>
                {label}{n > 0 && <span className="ssnf-n">{n}</span>}
              </button>
            ))}
          </div>

          <div className="ssnf-body">
            {groups.length === 0 && (
              <div className="ssnf-empty">
                <Inbox />
                <strong>{tab === "requests" ? "Không có yêu cầu nào" : tab === "unread" ? "Bạn đã đọc hết" : "Chưa có thông báo"}</strong>
                {tab === "requests" ? "Yêu cầu đổi ca và nghỉ phép sẽ hiện ở đây." : "Thông báo mới sẽ hiện ở đây."}
              </div>
            )}

            {groups.map((g) => (
              <div key={g.label || "list"}>
                {g.label && <div className="ssnf-group">{g.label}</div>}
                {g.rows.map((n) => {
                  const iconObj = getIcon(n.type);
                  return (
                    <article key={n.id} className={`ssnf-item${n.read ? "" : " unread"}`}
                      onClick={() => { onMarkRead?.(n.id); onOpen?.(n); setOpen(false); }}>
                      <span className={`ssnf-ic ${iconObj.tone}`}>{iconObj.el}</span>
                      <div className="ssnf-main">
                        <div className="ssnf-row">
                          <span className="ssnf-title">{n.title}</span>
                          <time className="ssnf-time">{timeAgo(n.createdAt)}</time>
                        </div>
                        <p className="ssnf-desc">{n.description || n.message}</p>
                        {n.needsAction && (
                          <div className="ssnf-acts" onClick={(e) => e.stopPropagation()}>
                            <button className="ssnf-btn pri" disabled={busy === n.id} onClick={() => run(n.id, "approve")}>Duyệt</button>
                            <button className="ssnf-btn" disabled={busy === n.id} onClick={() => run(n.id, "reject")}>Từ chối</button>
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            ))}
          </div>

          <div className="ssnf-foot"><button type="button" onClick={() => { setOpen(false); trigger.current?.focus(); }}>Đóng thông báo</button></div>
        </section>
      )}
    </div>
  );
}
