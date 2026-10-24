import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  CalendarDays,
  Clock,
  ShoppingBag,
  Users,
  Search,
  ChevronDown,
  ChevronRight,
  Store,
  Menu,
  Moon,
  Sun,
  LogOut,
  CalendarCheck,
  Settings,
  Palette,
  X,
  Check,
  Box,
  ArrowUpRight,
} from "lucide-react";
import { useTheme } from "./theme";
import NotificationBell from "./NotificationBell";
import {notificationRoute} from "../../utils/notificationNavigation.js";
import "./navbar.css";
import "./navbar-layout.css";

const normalize = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .toLowerCase();
export default function Navbar({
  user = { name: "Tài khoản", role: "Quản lý", systemRole: "MANAGER" },
  storeName = "Chưa chọn cửa hàng",
  stores = [],
  selectedStoreId = "",
  onSelectStore,
  counts = {},
  notificationsList = [],
  onMarkNotificationRead,
  onMarkAllRead,
  onAction,
  onLogout,
}) {
  const location = useLocation(),
    navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(null),
    [mobile, setMobile] = useState(false),
    [query, setQuery] = useState("");
  const [compact, setCompact] = useState(
    () => window.matchMedia("(max-width: 1020px)").matches,
  );
  const root = useRef(null),
    returnFocus = useRef(null),
    searchPanel = useRef(null),
    searchInput = useRef(null),
    drawer = useRef(null),
    burger = useRef(null);
  const manager = ["ADMIN", "MANAGER"].includes(
    user.systemRole || String(user.role).toUpperCase(),
  );
  const {
    pendingLeave = 0,
    openShifts = 0,
    pendingSwap = 0,
    pendingAdj = 0,
    notifications = 0,
  } = counts;
  const groups = [
    {
      key: "dash",
      label: "Tổng quan",
      icon: LayoutDashboard,
      base: "/dashboard",
      items: [
        {
          label: "Tổng quan",
          desc: "Tình hình vận hành và việc cần xử lý",
          to: "/dashboard",
        },
        {
          label: "Báo cáo nhân sự",
          desc: "Giờ làm, đi trễ và vắng mặt",
          to: "/dashboard/reports",
        },
        ...(manager
          ? [
              {
                label: "Chi phí nhân công",
                desc: "Theo dõi chi phí và nhân sự",
                to: "/dashboard/labor-cost",
              },
            ]
          : []),
      ],
    },
    {
      key: "sched",
      label: "Lập lịch ca",
      icon: CalendarDays,
      base: "/schedule",
      items: [
        {
          label: "Lịch tuần",
          desc: "Xếp ca theo ngày và vị trí",
          to: "/schedule",
        },
        {
          label: "Không gian 3D",
          desc: "Xem cửa hàng, vị trí và nhân sự",
          to: "/schedule?view=3d",
        },
        {
          label: "Mẫu ca",
          desc: "Ca sáng, ca tối và ca gãy",
          to: "/schedule/templates",
        },
        {
          label: "Xếp ca tự động",
          desc: "Phân bổ theo nhu cầu và khả dụng",
          to: "/schedule/auto",
        },
      ],
    },
    {
      key: "time",
      label: "Chấm công & Phép",
      icon: Clock,
      base: "/attendance",
      badge: pendingLeave + pendingAdj,
      items: [
        {
          label: "Bảng chấm công",
          desc: "Giờ vào, giờ ra của từng người",
          to: "/attendance",
        },
        {
          label: "Đơn nghỉ phép",
          desc: `${pendingLeave} đơn chờ duyệt`,
          to: "/attendance/leave",
          badge: pendingLeave,
        },
        {
          label: "Giải trình chấm công",
          desc: `${pendingAdj} giải trình chờ duyệt`,
          to: "/attendance/explain",
          badge: pendingAdj,
        },
      ],
    },
    {
      key: "market",
      label: "Chợ ca mở",
      icon: ShoppingBag,
      base: "/marketplace",
      badge: openShifts + pendingSwap,
      items: [
        {
          label: "Ca đang mở",
          desc: `${openShifts} ca chưa có người nhận`,
          to: "/marketplace",
          badge: openShifts,
        },
        {
          label: "Đổi ca",
          desc: `${pendingSwap} yêu cầu chờ duyệt`,
          to: "/marketplace/swaps",
          badge: pendingSwap,
        },
        {
          label: "Lịch sử nhận ca",
          desc: "Nhân sự và thời gian nhận ca",
          to: "/marketplace/history",
        },
      ],
    },
    ...(manager
      ? [
          {
            key: "hr",
            label: "Hồ sơ nhân sự",
            icon: Users,
            base: "/employees",
            items: [
              {
                label: "Nhân viên",
                desc: "Danh sách và thông tin liên hệ",
                to: "/employees",
              },
              {
                label: "Hợp đồng",
                desc: "Thời hạn và loại hợp đồng",
                to: "/employees/contracts",
              },
              {
                label: "Vị trí & kỹ năng",
                desc: "Năng lực theo vị trí làm việc",
                to: "/employees/skills",
              },
            ],
          },
        ]
      : []),
    {
      key: "settings",
      label: "Cài đặt",
      icon: Settings,
      base: "/settings",
      items: [
        {
          label: "Cấu hình cửa hàng",
          desc: "Thông tin điểm bán và vận hành",
          to: "/settings",
        },
        {
          label: "Giao diện & Chủ đề",
          desc: "Màu sắc và chế độ sáng tối",
          to: "/settings?tab=appearance",
        },
        {
          label: "Quy tắc lên lịch",
          desc: "Giờ làm và khoảng nghỉ giữa ca",
          to: "/settings?tab=schedule",
        },
        {
          label: "Phân quyền",
          desc: "Quyền truy cập theo vai trò",
          to: "/settings?tab=permissions",
        },
      ],
    },
  ];
  const activeGroup = groups.find(
    (g) =>
      location.pathname.startsWith(g.base) ||
      (g.key === "dash" && location.pathname === "/") ||
      (g.key === "time" && location.pathname.startsWith("/time-workforce")),
  );
  const isCurrent = (to) => {
    const url = new URL(to, window.location.origin);
    return location.pathname === url.pathname && location.search === url.search;
  };
  const results = groups
    .flatMap((g) =>
      g.items.map((item) => ({ ...item, group: g.label, icon: g.icon })),
    )
    .filter((item) =>
      normalize(`${item.label} ${item.group}`).includes(normalize(query)),
    );
  const items = useMemo(
    () =>
      (Array.isArray(notificationsList) ? notificationsList : []).map((n) => {
        const type = String(n.type || "system").toLowerCase();
        return {
          ...n,
          id: String(n.id),
          rawId: n.rawId || n.id,
          sourceType: n.sourceType || n.type,
          type: type.includes("swap")
            ? "swap"
            : type.includes("leave")
              ? "leave"
              : type.includes("market") || type.includes("shift")
                ? "open_shift"
                : type.includes("attendance")
                  ? "attendance"
                  : "system",
          title: n.title || "Thông báo hệ thống",
          description: n.description || n.message || "",
          read: Boolean(n.isRead ?? n.read),
          needsAction: Boolean(
            n.needsAction ??
              (n.status === "PENDING" || n.status === "PROPOSED"),
          ),
        };
      }),
    [notificationsList],
  );

  const close = useCallback(
    (restore) => {
      const target = mobile ? burger.current : returnFocus.current;
      setOpen(null);
      setMobile(false);
      if (restore && target?.isConnected) target.focus();
    },
    [mobile],
  );
  const toggle = (key, event) => {
    returnFocus.current = event.currentTarget;
    setOpen((value) => (value === key ? null : key));
  };
  const openSearch = useCallback(() => {
    returnFocus.current = document.activeElement;
    setQuery("");
    setMobile(false);
    setOpen("search");
  }, []);
  const initials = String(user.name || "SS")
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
  useEffect(() => {
    const media = window.matchMedia("(max-width: 1020px)");
    const change = (event) => {
      setCompact(event.matches);
      setMobile(false);
      setOpen(null);
    };
    media.addEventListener("change", change);
    return () => media.removeEventListener("change", change);
  }, []);
  useEffect(() => {
    const down = (event) => {
      if (!root.current?.contains(event.target)) close(false);
    };
    const key = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        openSearch();
        return;
      }
      if (event.key === "Escape" && (open || mobile)) {
        event.preventDefault();
        close(true);
      }
      const panel =
        open === "search"
          ? searchPanel.current
          : mobile
            ? drawer.current
            : null;
      if (event.key === "Tab" && panel) {
        const focusable = [
          ...panel.querySelectorAll("a[href],button:not([disabled]),input"),
        ].filter((n) => n.getClientRects().length);
        const first = focusable[0],
          last = focusable.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("pointerdown", down);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerdown", down);
      document.removeEventListener("keydown", key);
    };
  }, [open, mobile, close, openSearch]);
  useEffect(() => {
    if (open === "search") searchInput.current?.focus();
  }, [open]);
  useEffect(() => {
    if (mobile) drawer.current?.querySelector("button")?.focus();
  }, [mobile]);
  useEffect(() => {
    // This navbar is the only owner of the document scroll lock. A route remount
    // must also clear a lock left behind by an interrupted menu/search lifecycle.
    document.body.style.overflow = mobile || open === "search" ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobile, open]);

  const focusDropdown = (event, key) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      returnFocus.current = event.currentTarget;
      setOpen(key);
      requestAnimationFrame(() => {
        const links = root.current?.querySelectorAll(
          `#ssn-${key}-panel a,#ssn-${key}-panel button`,
        );
        (event.key === "ArrowUp"
          ? links?.[links.length - 1]
          : links?.[0]
        )?.focus();
      });
    }
  };
  const storeButton = (mobileContext = false) => (
    <div
      className={`ssn-store-wrap${mobileContext ? " ssn-store-mobile" : ""}`}
    >
      <button
        type="button"
        className="ssn-store"
        aria-label={`Chọn cửa hàng: ${storeName}`}
        aria-expanded={open === "store"}
        aria-controls="ssn-store-panel"
        title={storeName}
        onClick={(event) => toggle("store", event)}
        onKeyDown={(event) => focusDropdown(event, "store")}
      >
        <span className="ssn-store-icon">
          <Store aria-hidden="true" />
        </span>
        <span className="ssn-store-copy">
          <small>Cửa hàng đang xem</small>
          <strong>{storeName}</strong>
        </span>
        <ChevronDown className="chev" aria-hidden="true" />
      </button>
      {open === "store" && compact === mobileContext && (
        <div id="ssn-store-panel" className="ssn-menu ssn-store-menu">
          <div className="ssn-menu-heading">
            Chuyển cửa hàng <span>{stores.length}</span>
          </div>
          {stores.length ? (
            stores.map((store) => (
              <button
                type="button"
                key={store.id}
                aria-pressed={String(store.id) === String(selectedStoreId)}
                onClick={() => {
                  onSelectStore?.(String(store.id));
                  close(false);
                }}
              >
                <Store aria-hidden="true" />
                <span className="txt">
                  <strong>{store.name}</strong>
                  <small>{store.address || "Cửa hàng trong hệ thống"}</small>
                </span>
                {String(store.id) === String(selectedStoreId) && (
                  <Check className="ssn-check" aria-hidden="true" />
                )}
              </button>
            ))
          ) : (
            <p className="ssn-empty">Chưa có cửa hàng để chọn.</p>
          )}
        </div>
      )}
    </div>
  );

  return (
    <header className="ssn" ref={root}>
      <a className="ssn-skip" href="#ss-main-content">
        Bỏ qua điều hướng
      </a>
      <div className="ssn-topbar">
        <Link
          to="/dashboard"
          className="ssn-logo"
          aria-label="ShiftSync — Tổng quan"
        >
          <i>
            <CalendarCheck aria-hidden="true" />
          </i>
          <span>
            Shift<b>Sync</b>
            <small>WORKFORCE MANAGEMENT</small>
          </span>
        </Link>
        {!compact && storeButton()}
        <div className="ssn-top-spacer" />
        <button
          type="button"
          className="ssn-search"
          aria-label="Tìm trang và chức năng"
          aria-haspopup="dialog"
          onClick={openSearch}
        >
          <Search aria-hidden="true" />
          <span>Tìm trang, chức năng…</span>
          <kbd>Ctrl K</kbd>
        </button>
        <div className="ssn-actions">
          <button
            type="button"
            className="ssn-ico ssn-theme"
            aria-label={
              theme === "dark"
                ? "Chuyển sang giao diện sáng"
                : "Chuyển sang giao diện tối"
            }
            title="Đổi sáng / tối"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? <Sun /> : <Moon />}
          </button>
          <div
            onClickCapture={() => {
              setOpen(null);
              setMobile(false);
            }}
          >
            <NotificationBell
              items={items}
              unreadCount={notifications}
              onOpen={(n) => navigate(notificationRoute(n))}
              onMarkRead={onMarkNotificationRead}
              onMarkAllRead={onMarkAllRead}
              onAction={onAction}
            />
          </div>
          <div className="ssn-account">
            <button
              type="button"
              className="ssn-user"
              aria-label={`Tài khoản ${user.name}`}
              aria-expanded={open === "user"}
              aria-controls="ssn-user-panel"
              onClick={(event) => toggle("user", event)}
              onKeyDown={(event) => focusDropdown(event, "user")}
            >
              <span className="ssn-av">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt="" />
                ) : (
                  initials
                )}
              </span>
              <span className="who">
                <b>{user.name}</b>
                <small>{user.role}</small>
              </span>
              <ChevronDown className="chev" aria-hidden="true" />
            </button>
            {open === "user" && (
              <div id="ssn-user-panel" className="ssn-menu right">
                <div className="ssn-account-summary">
                  <strong>{user.name}</strong>
                  <small>{user.role}</small>
                </div>
                <Link to="/settings">
                  <Settings />
                  <span>Cài đặt hệ thống</span>
                </Link>
                <Link to="/settings?tab=appearance">
                  <Palette />
                  <span>Giao diện & Chủ đề</span>
                </Link>
                <button
                  type="button"
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                >
                  {theme === "dark" ? <Sun /> : <Moon />}
                  <span>
                    {theme === "dark" ? "Giao diện sáng" : "Giao diện tối"}
                  </span>
                </button>
                <div className="ssn-menu-divider" />
                <button type="button" className="ssn-logout" onClick={onLogout}>
                  <LogOut />
                  <span>Đăng xuất</span>
                </button>
              </div>
            )}
          </div>
          <button
            ref={burger}
            type="button"
            className="ssn-ico ssn-burger"
            aria-label={mobile ? "Đóng menu điều hướng" : "Mở menu điều hướng"}
            aria-expanded={mobile}
            aria-controls="ssn-navigation"
            onClick={(event) => {
              returnFocus.current = event.currentTarget;
              setMobile(!mobile);
              setOpen(null);
            }}
          >
            <Menu />
          </button>
        </div>
      </div>
      <div className="ssn-secondary">
        {compact && (
          <div className="ssn-mobile-context">
            {storeButton(true)}
            <span className="ssn-current-page">
              {activeGroup?.label || "Điều hướng"}
            </span>
          </div>
        )}
        {mobile && (
          <button
            type="button"
            className="ssn-backdrop"
            aria-label="Đóng menu"
            onClick={() => close(true)}
          />
        )}
        <div
          id="ssn-navigation"
          ref={drawer}
          className={`ssn-nav-shell${mobile ? " show" : ""}`}
          role={compact && mobile ? "dialog" : undefined}
          aria-modal={compact && mobile ? "true" : undefined}
          aria-label={compact ? "Menu điều hướng" : undefined}
        >
          <div className="ssn-drawer-heading">
            <span>Điều hướng</span>
            <button
              type="button"
              className="ssn-close"
              aria-label="Đóng điều hướng"
              onClick={() => close(true)}
            >
              <X />
            </button>
          </div>
          <nav className="ssn-nav" aria-label="Điều hướng chính">
            {groups.map((g) => {
              const Icon = g.icon;
              return (
                <div
                  key={g.key}
                  className={`ssn-item${activeGroup?.key === g.key ? " on" : ""}${open === g.key ? " open" : ""}`}
                >
                  <button
                    type="button"
                    className="ssn-tab"
                    aria-expanded={open === g.key}
                    aria-controls={`ssn-${g.key}-panel`}
                    onClick={(event) => toggle(g.key, event)}
                    onKeyDown={(event) => focusDropdown(event, g.key)}
                  >
                    <Icon aria-hidden="true" />
                    <span>{g.label}</span>
                    {g.badge > 0 && <span className="ssn-cnt">{g.badge}</span>}
                    <ChevronDown className="chev" aria-hidden="true" />
                  </button>
                  {open === g.key && (
                    <div id={`ssn-${g.key}-panel`} className="ssn-menu">
                      <div className="ssn-menu-heading">{g.label}</div>
                      {g.items.map((item) => (
                        <Link
                          key={item.to}
                          to={item.to}
                          aria-current={isCurrent(item.to) ? "page" : undefined}
                          className={isCurrent(item.to) ? "active" : ""}
                          onClick={() => close(false)}
                        >
                          <span className="txt">
                            <strong>{item.label}</strong>
                            <small>{item.desc}</small>
                          </span>
                          {item.badge > 0 ? (
                            <span className="ssn-cnt">{item.badge}</span>
                          ) : (
                            <ChevronRight
                              className="ssn-link-arrow"
                              aria-hidden="true"
                            />
                          )}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
          <Link
            to="/schedule?view=3d"
            className="ssn-store-link"
            aria-current={isCurrent("/schedule?view=3d") ? "page" : undefined}
            onClick={() => close(false)}
          >
            <Box aria-hidden="true" />
            <span>Cửa hàng 3D</span>
            <ArrowUpRight aria-hidden="true" />
          </Link>
        </div>
      </div>
      {open === "search" && (
        <div
          className="ssn-search-overlay"
          onClick={(event) => {
            if (event.target === event.currentTarget) close(true);
          }}
        >
          <section
            ref={searchPanel}
            className="ssn-command"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ssn-search-title"
          >
            <div className="ssn-command-head">
              <h2 id="ssn-search-title">Tìm trang và chức năng</h2>
              <button
                type="button"
                className="ssn-close"
                aria-label="Đóng tìm kiếm"
                onClick={() => close(true)}
              >
                <X />
              </button>
            </div>
            <label className="ssn-command-input">
              <Search aria-hidden="true" />
              <input
                ref={searchInput}
                aria-label="Tên trang hoặc chức năng"
                placeholder="Ví dụ: lịch tuần, giao diện, 3D…"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "ArrowDown") {
                    event.preventDefault();
                    searchPanel.current
                      ?.querySelector(".ssn-command-results a")
                      ?.focus();
                  }
                  if (event.key === "Enter" && results.length) {
                    event.preventDefault();
                    navigate(results[0].to);
                    close(false);
                  }
                }}
              />
              <kbd>Esc</kbd>
            </label>
            <div className="ssn-command-results" aria-label="Kết quả tìm kiếm">
              {results.length ? (
                results.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => close(false)}
                    >
                      <Icon aria-hidden="true" />
                      <span>
                        <strong>{item.label}</strong>
                        <small>{item.group}</small>
                      </span>
                      <ArrowUpRight aria-hidden="true" />
                    </Link>
                  );
                })
              ) : (
                <p className="ssn-empty" role="status">
                  Không tìm thấy trang. Thử tên chức năng khác.
                </p>
              )}
            </div>
            <div className="ssn-command-foot">
              Tìm trong các trang bạn có quyền truy cập.
            </div>
          </section>
        </div>
      )}
    </header>
  );
}
