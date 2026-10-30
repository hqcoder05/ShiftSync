import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  FileSpreadsheet,
  CalendarPlus,
  Clock,
  MapPin,
  CalendarDays,
  BarChart3,
  ArrowUpRight,
  ClipboardList,
  UsersRound,
  Fingerprint,
  Wallet,
} from "lucide-react";
import ShiftTimeline from "./ShiftTimeline";
import { AssignedChart, HoursChart } from "./charts";
import DashboardSpatialSummary from "../spatial/DashboardSpatialSummary";
import Avatar3DWeb from "../Avatar3DWeb";
import { getAvatarForEmployee } from "../avatarConfigs";
import { formatChartRange, shiftChartAnchor } from "./chartPeriods";
import "./dashboard.css";
import "./dashboard-redesign.css";

const DAYS = [
  "Chủ nhật",
  "Thứ Hai",
  "Thứ Ba",
  "Thứ Tư",
  "Thứ Năm",
  "Thứ Sáu",
  "Thứ Bảy",
];
const dm = (d) =>
  `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
const sum = (a) => a.reduce((x, y) => x + y, 0);

export default function Dashboard({
  data,
  employees = [],
  employeeId = "",
  onEmployeeChange,
  onDateChange,
  chartPeriod = "week",
  onChartPeriodChange,
  onExport,
  onOptimisticAction,
  storeName = "",
  assignTo = "/schedule",
}) {
  const navigate = useNavigate();
  const [scheduleTab, setScheduleTab] = useState("timeline"); // "timeline" | "spatial"
  const [chartTab, setChartTab] = useState("hours"); // "hours" | "assigned"
  const [processingId, setProcessingId] = useState(null);

  const {
    date = new Date(),
    kpis: k = {},
    positions = [],
    shifts = [],
    pendingItems = [],
    attendance = [],
    assigned = [],
    hours = [],
    spatial = {},
  } = data || {};

  const isToday = date.toDateString() === new Date().toDateString();

  const shiftDate = (n) => {
    const d = new Date(date);
    d.setDate(d.getDate() + n);
    onDateChange(d);
  };

  const shiftChartPeriod = (amount) => onDateChange(shiftChartAnchor(date, chartPeriod, amount));
  const chartRangeLabel = formatChartRange(date, chartPeriod);

  const handleAction = async (item, action) => {
    if (!onOptimisticAction || processingId) return;
    setProcessingId(item.id);
    try {
      await onOptimisticAction(item, action);
    } finally {
      setProcessingId(null);
    }
  };

  // Metrics summary
  const onTimeCount = attendance.filter(
    (a) => !a.action?.includes("trễ") && !a.action?.includes("vắng"),
  ).length;
  const lateCount = attendance.filter((a) => a.action?.includes("trễ")).length;
  const attendanceExceptions = attendance.filter(
    (a) => a.action?.includes("trễ") || a.action?.includes("vắng"),
  );
  const plannedHours = sum(hours.map((h) => h.planned || 0));
  const actualHours = sum(hours.map((h) => h.actual || 0));
  const hasHoursData = plannedHours > 0 || actualHours > 0;
  const hasAssignedData = assigned.some((day) =>
    Object.values(day.counts || {}).some((count) => count > 0),
  );
  const hasChartData = chartTab === "hours" ? hasHoursData : hasAssignedData;
  const coverage = shifts.length ? Math.round(k.coverage || 0) : null;

  return (
    <div className="db">
      {/* Store context and primary action */}
      <header className="db-head">
        <div className="db-title-block">
          <span className="db-eyebrow">
            <span className="db-live-dot" /> TRUNG TÂM VẬN HÀNH
          </span>
          <div className="db-title-row">
            <h1>{isToday ? "Tổng quan hôm nay" : "Tổng quan cửa hàng"}</h1>
          </div>
          <p className="db-subtitle">
            {storeName && <span className="db-store-pill">{storeName}</span>}
            <span>
              {shifts.length
                ? `${shifts.length} lượt phân công trong ngày`
                : "Theo dõi ca làm việc, nhân sự và yêu cầu tại một nơi"}
            </span>
          </p>
        </div>
        <div className="db-head-actions">
          <Link to="/schedule?view=3d" className="db-action-btn outline">
            <MapPin size={16} aria-hidden="true" />
            <span>Không gian 3D</span>
            <ArrowUpRight size={15} aria-hidden="true" />
          </Link>
          <Link to={assignTo} className="db-action-btn primary">
            <CalendarPlus size={16} aria-hidden="true" />
            <span>Phân công ca</span>
          </Link>
        </div>
      </header>

      <div className="db-filters" aria-label="Bộ lọc dashboard">
        <div className="db-filter-intro">
          <CalendarDays size={17} aria-hidden="true" />
          <span>Ngày làm việc</span>
        </div>
        <div className="db-head-controls">
          <div className="db-date-nav">
            <button
              type="button"
              aria-label="Ngày trước"
              onClick={() => shiftDate(-1)}
              className="db-icon-btn"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="db-date-label">
              {DAYS[date.getDay()]}, {dm(date)}
            </span>
            <button
              type="button"
              aria-label="Ngày sau"
              onClick={() => shiftDate(1)}
              className="db-icon-btn"
            >
              <ChevronRight size={16} />
            </button>
            <button
              type="button"
              className="db-today-btn"
              disabled={isToday}
              onClick={() => onDateChange(new Date())}
            >
              Hôm nay
            </button>
          </div>

          <select
            className="db-select"
            aria-label="Lọc theo nhân viên"
            value={employeeId}
            onChange={(e) => onEmployeeChange(e.target.value)}
          >
            <option value="">Tất cả nhân viên</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>

          {onExport && (
            <button
              type="button"
              className="db-action-btn outline"
              onClick={onExport}
              title="Xuất bảng kê giờ làm ra file CSV"
            >
              <FileSpreadsheet size={14} />
              <span>Xuất báo cáo</span>
            </button>
          )}
        </div>
      </div>

      <section className="db-status-strip" aria-label="Chỉ số vận hành">
        <Link to="/schedule" className="db-metric-item db-metric-schedule">
          <span className="db-metric-top">
            <span className="db-metric-icon">
              <ClipboardList size={19} aria-hidden="true" />
            </span>
            <ArrowUpRight size={16} aria-hidden="true" />
          </span>
          <span className="db-metric-label">Lượt phân công</span>
          <div className="db-metric-val">
            <strong>{shifts.length}</strong>
            <small>lượt</small>
          </div>
          <span className="db-metric-note">
            {k.openShifts > 0
              ? `Còn thiếu ${k.openShifts} vị trí`
              : coverage === null
                ? "Chưa có ca trong ngày"
                : `Độ phủ ${coverage}%`}
          </span>
          <span className="db-metric-track" aria-hidden="true">
            <span
              style={{ width: `${Math.max(0, Math.min(coverage ?? 0, 100))}%` }}
            />
          </span>
        </Link>

        <Link
          to="/requests"
          className={`db-metric-item db-metric-requests ${pendingItems.length > 0 ? "attention" : ""}`}
        >
          <span className="db-metric-top">
            <span className="db-metric-icon">
              <UsersRound size={19} aria-hidden="true" />
            </span>
            <ArrowUpRight size={16} aria-hidden="true" />
          </span>
          <span className="db-metric-label">Yêu cầu cần xử lý</span>
          <div className="db-metric-val">
            <strong>{pendingItems.length}</strong>
            <small>yêu cầu</small>
          </div>
          <span className="db-metric-note">
            {pendingItems.length > 0
              ? "Đang chờ quản lý duyệt"
              : "Chưa có yêu cầu hiển thị"}
          </span>
        </Link>

        <Link to="/attendance" className="db-metric-item db-metric-attendance">
          <span className="db-metric-top">
            <span className="db-metric-icon">
              <Fingerprint size={19} aria-hidden="true" />
            </span>
            <ArrowUpRight size={16} aria-hidden="true" />
          </span>
          <span className="db-metric-label">Điểm danh ca</span>
          <div className="db-metric-val">
            <strong>{attendance.length}</strong>
            <small>lượt</small>
          </div>
          <span className="db-metric-note">
            {lateCount > 0
              ? `${lateCount} đi trễ • ${onTimeCount} đúng giờ`
              : `${onTimeCount} đúng giờ`}
          </span>
        </Link>

        <div className="db-metric-item db-metric-labor">
          <span className="db-metric-top">
            <span className="db-metric-icon">
              <Wallet size={19} aria-hidden="true" />
            </span>
            <span className="db-estimate-tag">Ước tính</span>
          </span>
          <span className="db-metric-label">Dự toán nhân công</span>
          <div className="db-metric-val">
            <strong>{(k.laborCost || 0).toLocaleString("vi-VN")}</strong>
            <small>đ</small>
          </div>
          <span className="db-metric-note">
            {shifts.length ? "Ước tính từ ca trong ngày" : "Chưa có ca để tính"}
          </span>
        </div>
      </section>

      {/* Daily work and weekly context */}
      <div className="db-layout">
        <div className="db-main-col">
          <section className="db-card db-schedule-card">
            <div className="db-card-header">
              <div className="db-card-title-group">
                <span className="db-section-kicker">LỊCH TRỰC TRONG NGÀY</span>
                <h2>
                  {isToday
                  ? "Ai được phân công hôm nay?"
                    : `Lịch làm việc ${dm(date)}`}
                </h2>
                <p className="db-section-desc">
                  Theo dõi phân công và vị trí làm việc trong cửa hàng.
                </p>
                <div
                  className="db-subtabs"
                  role="group"
                  aria-label="Cách xem lịch trực"
                >
                  <button
                    type="button"
                    className={`db-subtab-btn ${scheduleTab === "timeline" ? "active" : ""}`}
                    aria-pressed={scheduleTab === "timeline"}
                    onClick={() => setScheduleTab("timeline")}
                  >
                    <Clock size={13} />
                    <span>Dạng Timeline</span>
                  </button>
                  <button
                    type="button"
                    className={`db-subtab-btn ${scheduleTab === "spatial" ? "active" : ""}`}
                    aria-pressed={scheduleTab === "spatial"}
                    onClick={() => setScheduleTab("spatial")}
                  >
                    <MapPin size={13} />
                    <span>Sơ đồ mặt bằng</span>
                  </button>
                </div>
              </div>

              <Link to="/schedule" className="db-card-link">
                Xem lịch tuần <ArrowUpRight size={15} aria-hidden="true" />
              </Link>
            </div>

            {scheduleTab === "timeline" ? (
              <ShiftTimeline
                shifts={shifts}
                positions={positions}
                isToday={isToday}
                onAssign={() => navigate(assignTo)}
              />
            ) : (
              <DashboardSpatialSummary
                store={spatial.store || { id: "store", name: storeName }}
                layout={spatial.layout || { length: 24, width: 16, height: 5 }}
                zones={spatial.zones || []}
                activeShifts={shifts}
              />
            )}
          </section>

          <section className="db-card db-chart-card">
            <div className="db-card-header">
              <div className="db-card-title-group">
                <span className="db-section-kicker">XU HƯỚNG {chartPeriod === "week" ? "THEO TUẦN" : chartPeriod === "month" ? "THEO THÁNG" : chartPeriod === "quarter" ? "THEO QUÝ" : "THEO NĂM"}</span>
                <h2>Nhịp làm việc</h2>
                <p className="db-section-desc">
                  {chartPeriod === "week" ? "Giờ theo từng ngày." : chartPeriod === "month" ? "Tổng giờ theo từng tuần trong tháng." : "Tổng giờ theo từng tháng."} Kỳ xem: {chartRangeLabel}.
                </p>
                <div
                  className="db-subtabs"
                  role="group"
                  aria-label="Chỉ số biểu đồ tuần"
                >
                  <button
                    type="button"
                    className={`db-subtab-btn ${chartTab === "hours" ? "active" : ""}`}
                    aria-pressed={chartTab === "hours"}
                    onClick={() => setChartTab("hours")}
                  >
                    <BarChart3 size={13} />
                    <span>Giờ làm việc</span>
                  </button>
                  <button
                    type="button"
                    className={`db-subtab-btn ${chartTab === "assigned" ? "active" : ""}`}
                    aria-pressed={chartTab === "assigned"}
                    onClick={() => setChartTab("assigned")}
                  >
                    <CalendarDays size={13} />
                    <span>Số ca theo vị trí</span>
                  </button>
                </div>
                <div className="db-chart-period-controls" aria-label="Chọn kỳ biểu đồ">
                  <div className="db-chart-period-options" role="group" aria-label="Khoảng thời gian">
                    {[
                      { value: "week", label: "Tuần" },
                      { value: "month", label: "Tháng" },
                      { value: "quarter", label: "Quý" },
                      { value: "year", label: "Năm" },
                    ].map((period) => (
                      <button
                        key={period.value}
                        type="button"
                        className={chartPeriod === period.value ? "active" : ""}
                        aria-pressed={chartPeriod === period.value}
                        onClick={() => onChartPeriodChange(period.value)}
                      >
                        {period.label}
                      </button>
                    ))}
                  </div>
                  <div className="db-chart-period-nav">
                    <button type="button" className="db-icon-btn" aria-label="Kỳ trước" onClick={() => shiftChartPeriod(-1)}><ChevronLeft size={15} /></button>
                    <strong>{chartRangeLabel}</strong>
                    <button type="button" className="db-icon-btn" aria-label="Kỳ sau" onClick={() => shiftChartPeriod(1)}><ChevronRight size={15} /></button>
                    <button type="button" className="db-today-btn" onClick={() => onDateChange(new Date())}>Kỳ hiện tại</button>
                  </div>
                </div>
              </div>
            </div>

            {!hasChartData ? (
              <div className="db-chart-empty">
                <span className="db-empty-icon">
                  <BarChart3 size={24} aria-hidden="true" />
                </span>
                <strong>Chưa có dữ liệu cho biểu đồ này</strong>
                <p>
                  Chưa có ca được phân công hoặc giờ chấm công trong kỳ {chartRangeLabel}.
                </p>
                <Link to="/schedule">
                  Mở lịch làm việc <ArrowUpRight size={15} aria-hidden="true" />
                </Link>
              </div>
            ) : chartTab === "hours" ? (
              <>
                <div className="db-chart-legend">
                  <span>
                    <i style={{ background: "var(--ss-ac)" }} />
                    Đã phân công: <b>{plannedHours}h</b>
                  </span>
                  <span>
                    <i style={{ background: "var(--ss-p3)" }} />
                    Thực làm: <b>{actualHours}h</b>
                  </span>
                </div>
                {plannedHours > 0 && actualHours === 0 && (
                  <p className="db-chart-note">
                    Chưa có giờ chấm công ghi nhận trong kỳ này. Ca chưa phân công không được tính vào tổng giờ đã phân công.
                  </p>
                )}
                <HoursChart days={hours} today={date} />
              </>
            ) : (
              <>
                <div className="db-chart-legend">
                  {positions.map((p) => (
                    <span key={p.id}>
                      <i style={{ background: p.color }} />
                      {p.name}
                    </span>
                  ))}
                </div>
                <AssignedChart
                  days={assigned}
                  positions={positions}
                  today={date}
                />
              </>
            )}
          </section>
        </div>

        <aside className="db-side-col">
          <section className="db-card db-requests-card">
            <div className="db-card-header">
              <div className="db-card-title-group">
                <span className="db-section-kicker">ƯU TIÊN XỬ LÝ</span>
                <h2>
                  Yêu cầu cần duyệt{" "}
                  {pendingItems.length > 0 && (
                    <span className="db-count-badge">
                      {pendingItems.length}
                    </span>
                  )}
                </h2>
              </div>
              <Link to="/requests" className="db-card-link">
                Xem tất cả <ArrowUpRight size={15} aria-hidden="true" />
              </Link>
            </div>

            <div className="db-requests-list">
              {pendingItems.length ? (
                pendingItems.map((item) => (
                  <div
                    key={item.id}
                    className={`db-request-row ${processingId === item.id ? "processing" : ""}`}
                  >
                    <div className="db-request-content">
                      <span
                        className="db-request-dot"
                        style={{
                          backgroundColor: item.color || "var(--ss-ac)",
                        }}
                      />
                      <div className="db-request-text">
                        <b>{item.title}</b>
                        <small>{item.subtitle}</small>
                      </div>
                    </div>
                    <div className="db-request-actions">
                      <button
                        type="button"
                        className="db-btn-approve"
                        onClick={() => handleAction(item, "approve")}
                        disabled={processingId === item.id}
                        aria-label={`Duyệt ${item.title}`}
                        title="Duyệt yêu cầu này ngay"
                      >
                        <Check size={13} />
                        <span>Duyệt</span>
                      </button>
                      <button
                        type="button"
                        className="db-btn-reject"
                        onClick={() => handleAction(item, "reject")}
                        disabled={processingId === item.id}
                        aria-label={`Từ chối ${item.title}`}
                        title="Từ chối yêu cầu"
                      >
                        <X size={13} />
                        <span>Từ chối</span>
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="db-empty-state">
                  <span className="db-empty-icon">
                    <Check size={20} aria-hidden="true" />
                  </span>
                  <strong>Chưa có yêu cầu hiển thị</strong>
                  <p>Các yêu cầu mới sẽ xuất hiện tại đây.</p>
                </div>
              )}
            </div>
          </section>

          <section className="db-card db-attendance-card">
            <div className="db-card-header">
              <div className="db-card-title-group">
                <span className="db-section-kicker">NGOẠI LỆ CẦN RÀ SOÁT</span>
                <h2>
                  Điểm danh {isToday ? "hôm nay" : dm(date)}{" "}
                  {attendanceExceptions.length > 0 && (
                    <span className="db-count-badge muted">
                      {attendanceExceptions.length}
                    </span>
                  )}
                </h2>
              </div>
              <Link to="/attendance" className="db-card-link">
                Mở chấm công <ArrowUpRight size={15} aria-hidden="true" />
              </Link>
            </div>

            <div className="db-attendance-list">
              {attendanceExceptions.length ? (
                attendanceExceptions.map((f) => {
                  const avatarKey =
                    f.avatarId || getAvatarForEmployee(f.employee);
                  let badgeType = "on-time";
                  if (f.action?.includes("trễ")) badgeType = "late";
                  else if (f.action?.includes("vắng")) badgeType = "absent";
                  else if (f.action?.includes("tan ca")) badgeType = "out";

                  return (
                    <div className="db-attendance-row" key={f.id}>
                      {avatarKey ? (
                        <div className="db-att-avatar" title={f.employee}>
                          <Avatar3DWeb avatarId={avatarKey} size={24} />
                        </div>
                      ) : (
                        <div className="db-att-initials">
                          {f.employee?.[0] || "?"}
                        </div>
                      )}
                      <div className="db-att-info">
                        <b>{f.employee}</b>
                        <span className={`db-att-badge ${badgeType}`}>
                          {f.action}
                        </span>
                      </div>
                      <time className="db-att-time">{f.time}</time>
                    </div>
                  );
                })
              ) : (
                <div className="db-empty-state">
                  <span className="db-empty-icon">
                    <Fingerprint size={20} aria-hidden="true" />
                  </span>
                  <strong>Không có ngoại lệ điểm danh</strong>
                  <p>Các lượt đi trễ hoặc vắng mặt sẽ xuất hiện tại đây.</p>
                </div>
              )}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
