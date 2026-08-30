import { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllStores } from '../services/storeService';
import { getEmployees } from '../services/employeeService';
import { getStoreAttendance } from '../services/attendanceService';
import avatarPaul from '../assets/avatars/avatar-paul-lee.png';
import avatarThia from '../assets/avatars/avatar-thia-ago.png';
import avatarMew from '../assets/avatars/avatar-mew-ama.png';
import avatarDilan from '../assets/avatars/avatar-dilan-jon.png';
import './AttendancePageLive.css';

const AVATARS = {
  'Paul. Lee': avatarPaul,
  'Thia. Ago': avatarThia,
  'Mew. Ama': avatarMew,
  'Dilan. Jon': avatarDilan,
};
const DEFAULT_AVATAR = avatarPaul;

const MONTH_NAMES_VI = [
  'Tháng Một', 'Tháng Hai', 'Tháng Ba', 'Tháng Tư', 'Tháng Năm', 'Tháng Sáu',
  'Tháng Bảy', 'Tháng Tám', 'Tháng Chín', 'Tháng Mười', 'Tháng Mười Một', 'Tháng Mười Hai'
];

const DOW_VI = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

function getWeekDates(baseDate = new Date()) {
  const monday = new Date(baseDate);
  const dow = baseDate.getDay();
  monday.setDate(baseDate.getDate() + (dow === 0 ? -6 : 1 - dow));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

const fmtDM = (d) =>
  `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}`;

const toISODate = (d) => d.toISOString().slice(0, 10);

const fmtDateRangeText = (d) => {
  return `${d.getDate()} Tháng ${d.getMonth() + 1}, ${d.getFullYear()}`;
};

const fmtShortDate = (dStr) => {
  if (!dStr) return '—';
  try {
    const d = new Date(`${dStr}T00:00:00`);
    const dow = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][d.getDay()];
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${dow}, ${day}/${month}`;
  } catch (e) {
    return dStr;
  }
};

const fmtTimeAMPM = (value) => {
  if (!value) return '—';
  try {
    const d = new Date(value);
    let h = d.getHours();
    const m = String(d.getMinutes()).padStart(2, '0');
    const period = h < 12 ? 'AM' : 'PM';
    h = h % 12 === 0 ? 12 : h % 12;
    return `${String(h).padStart(2, '0')}:${m} ${period}`;
  } catch (e) {
    return '—';
  }
};

const calcHours = (row) => {
  if (!row.checkInTime || !row.checkOutTime) return null;
  const diffMs = new Date(row.checkOutTime) - new Date(row.checkInTime);
  if (diffMs <= 0) return 0;
  return Number((diffMs / 3600000).toFixed(1));
};

const calcScheduledHours = (row) => {
  if (!row.scheduledStart || !row.scheduledEnd) return null;
  const [sh, sm] = row.scheduledStart.split(':').map(Number);
  const [eh, em] = row.scheduledEnd.split(':').map(Number);
  let dur = eh + em / 60 - (sh + sm / 60);
  if (dur < 0) dur += 24;
  return Number(dur.toFixed(1));
};

const statusLabel = (val) => {
  const map = {
    PRESENT: 'Đúng giờ',
    LATE: 'Đi trễ',
    EARLY_LEAVE: 'Về sớm',
    ABSENT: 'Vắng',
  };
  return map[val] || val || '—';
};

export default function AttendancePageLive() {
  const navigate = useNavigate();

  // Stores & Employees state
  const [stores, setStores] = useState([]);
  const [storeId, setStoreId] = useState('');
  const [showStoreList, setShowStoreList] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [userFilter, setUserFilter] = useState('All');
  const [showUserList, setShowUserList] = useState(true);

  // Date Navigation State
  const [viewMode, setViewMode] = useState('Tuần'); // 'Ngày' | 'Tuần'
  const [weekOffset, setWeekOffset] = useState(0);
  const [dayOffset, setDayOffset] = useState(0);
  const [showCalendarPopover, setShowCalendarPopover] = useState(false);
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());

  // Attendance data
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [previewPhoto, setPreviewPhoto] = useState(null);

  // Refs for outside click handling
  const dateNavWrapRef = useRef(null);
  const clickTimeoutRef = useRef(null);
  const storeFilterRef = useRef(null);

  // Compute dates based on offset
  const today = new Date(Date.now() + dayOffset * 86400000);
  const weekDatesFull = useMemo(() => {
    const base = new Date();
    base.setDate(base.getDate() + weekOffset * 7);
    return getWeekDates(base);
  }, [weekOffset]);

  const displayedDates = viewMode === 'Ngày' ? [today] : weekDatesFull;
  const fromDate = toISODate(displayedDates[0]);
  const toDate = toISODate(displayedDates[displayedDates.length - 1]);

  // Load stores & employees
  useEffect(() => {
    getAllStores()
      .then((res) => {
        const list = res.data.content || res.data || [];
        setStores(list);
        if (list.length > 0) {
          setStoreId(list[0].id);
        }
      })
      .catch(() => setError('Không tải được danh sách chi nhánh'));

    getEmployees(0, 100)
      .then((res) => {
        const empList = res.data.content || res.data || [];
        setEmployees(empList);
      })
      .catch(() => setError('Không tải được danh sách nhân viên'));
  }, []);

  // Load attendance data
  useEffect(() => {
    if (!storeId) return;
    setLoading(true);
    setError('');
    getStoreAttendance(storeId, fromDate, toDate)
      .then((res) => {
        setRows(res.data || []);
      })
      .catch((err) => {
        setError(err.response?.data?.message || 'Không thể tải dữ liệu chấm công.');
        setRows([]);
      })
      .finally(() => setLoading(false));
  }, [storeId, fromDate, toDate]);

  // Close calendar on outside click
  useEffect(() => {
    const handleDocClick = (e) => {
      if (dateNavWrapRef.current && !dateNavWrapRef.current.contains(e.target)) {
        setShowCalendarPopover(false);
      }
      if (storeFilterRef.current && !storeFilterRef.current.contains(e.target)) {
        setShowStoreList(false);
      }
    };
    document.addEventListener('mousedown', handleDocClick);
    return () => document.removeEventListener('mousedown', handleDocClick);
  }, []);

  // Handlers for Date Navigator & Calendar Popover
  const openCalendarPopover = () => {
    const refDate = viewMode === 'Ngày' ? today : weekDatesFull[0];
    setCalMonth(refDate.getMonth());
    setCalYear(refDate.getFullYear());
    setShowCalendarPopover((v) => !v);
  };

  const handleCalPrevMonth = (e) => {
    e.stopPropagation();
    setCalMonth((prev) => {
      if (prev === 0) {
        setCalYear((y) => y - 1);
        return 11;
      }
      return prev - 1;
    });
  };

  const handleCalNextMonth = (e) => {
    e.stopPropagation();
    setCalMonth((prev) => {
      if (prev === 11) {
        setCalYear((y) => y + 1);
        return 0;
      }
      return prev + 1;
    });
  };

  const handlePrevDate = () => {
    if (viewMode === 'Ngày') {
      setDayOffset((d) => d - 1);
    } else {
      setWeekOffset((w) => w - 1);
    }
  };

  const handleNextDate = () => {
    if (viewMode === 'Ngày') {
      setDayOffset((d) => d + 1);
    } else {
      setWeekOffset((w) => w + 1);
    }
  };

  const handleTodayClick = () => {
    setDayOffset(0);
    setWeekOffset(0);
  };

  const handleSelectWeek = (targetDate) => {
    const baseMonday = getWeekDates(new Date())[0];
    const targetMonday = getWeekDates(targetDate)[0];
    const diffWeeks = Math.round((targetMonday - baseMonday) / (7 * 86400000));
    setWeekOffset(diffWeeks);
    setViewMode('Tuần');
    setShowCalendarPopover(false);
  };

  const handleSelectSpecificDay = (targetDate) => {
    const todayBase = new Date();
    todayBase.setHours(0, 0, 0, 0);
    const target = new Date(targetDate);
    target.setHours(0, 0, 0, 0);
    const diffDays = Math.round((target - todayBase) / 86400000);
    setDayOffset(diffDays);

    const baseMonday = getWeekDates(new Date())[0];
    const targetMonday = getWeekDates(targetDate)[0];
    setWeekOffset(Math.round((targetMonday - baseMonday) / (7 * 86400000)));

    setViewMode('Ngày');
    setShowCalendarPopover(false);
  };

  const handleCalendarDayClick = (date) => {
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
      handleSelectSpecificDay(date);
    } else {
      clickTimeoutRef.current = setTimeout(() => {
        clickTimeoutRef.current = null;
        handleSelectWeek(date);
      }, 260);
    }
  };

  const getCalendarWeeks = (year, month) => {
    const firstDay = new Date(year, month, 1);
    const dow = firstDay.getDay();
    const startMonday = new Date(firstDay);
    startMonday.setDate(1 - (dow === 0 ? 6 : dow - 1));

    const weeks = [];
    let cur = new Date(startMonday);
    for (let w = 0; w < 6; w++) {
      const week = [];
      for (let d = 0; d < 7; d++) {
        week.push(new Date(cur));
        cur.setDate(cur.getDate() + 1);
      }
      weeks.push(week);
    }
    return weeks;
  };

  // Current selected store object
  const currentStore = stores.find((s) => s.id === storeId);

  // Filter rows by selected user name
  const visibleRows = useMemo(() => {
    if (userFilter === 'All') return rows;
    return rows.filter((r) => (r.staffName || '').trim() === userFilter.trim());
  }, [rows, userFilter]);

  // Calculate total hours for filtered employee
  const totalFilteredHours = useMemo(() => {
    return visibleRows.reduce((sum, r) => {
      const h = calcHours(r);
      return sum + (h || 0);
    }, 0);
  }, [visibleRows]);

  const flagged = (row) => row.status === 'LATE' || row.status === 'EARLY_LEAVE';

  // Export attendance data to CSV
  const handleExport = () => {
    if (visibleRows.length === 0) {
      alert('Không có dữ liệu chấm công để xuất.');
      return;
    }
    const headers = ['Ngày', 'Nhân viên', 'Vào', 'Ra', 'Lịch', 'Tổng giờ', 'Trạng thái'];
    const csvRows = visibleRows.map((r) => [
      r.shiftDate || '',
      r.staffName || '',
      fmtTimeAMPM(r.checkInTime),
      fmtTimeAMPM(r.checkOutTime),
      r.scheduledStart ? `${r.scheduledStart} - ${r.scheduledEnd}` : '',
      calcHours(r) ? `${calcHours(r)} giờ` : '',
      statusLabel(r.status),
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...csvRows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `cham_cong_${storeId}_${fromDate}_den_${toDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="att-page">
      {/* ═══ SIDEBAR (Bộ lọc y hệt bên trang Schedule) ═══ */}
      <aside className="att-sidebar">
        {/* Day-mode header shown at top of sidebar */}
        {viewMode === 'Ngày' && (
          <div className="att-sidebar-day-header">
            <div className="att-sidebar-day-label">
              {DOW_VI[today.getDay()]}
              <span>{fmtDM(today)}-{today.getFullYear()}</span>
            </div>
          </div>
        )}

        <div className="att-sidebar-inner">
          <div className="att-sidebar-title">Bộ lọc</div>

          {/* ── Chi nhánh (Box 1) ── */}
          <div className="att-filter-box" ref={storeFilterRef}>
            <div
              className="att-filter-box-header clickable"
              onClick={() => setShowStoreList((v) => !v)}
            >
              <span className="att-filter-label">Chi nhánh</span>
              <span className={`att-filter-arrow${showStoreList ? ' open' : ''}`}>▾</span>
            </div>

            {/* List các chi nhánh xổ xuống */}
            <div className={`att-filter-collapse${showStoreList ? ' expanded' : ''}`}>
              {stores.map((s) => {
                const isSelected = storeId === s.id;
                return (
                  <div
                    key={s.id}
                    className={`att-user-list-item${isSelected ? ' active' : ''}`}
                    onClick={() => {
                      setStoreId(s.id);
                      setShowStoreList(false);
                    }}
                  >
                    <span style={{ flex: 1 }}>{s.name}</span>
                    {isSelected && <span style={{ color: '#256b1f', fontWeight: 'bold' }}>✓</span>}
                  </div>
                );
              })}
              {stores.length === 0 && (
                <div className="att-user-list-item" style={{ color: '#aaa', fontStyle: 'italic' }}>
                  Đang tải chi nhánh...
                </div>
              )}
            </div>

            {/* Current Selected Store Name display when collapsed */}
            {!showStoreList && (
              <div
                className="att-selected-branch-preview"
                onClick={() => setShowStoreList(true)}
              >
                {currentStore?.name || 'Chọn chi nhánh...'}
              </div>
            )}
          </div>

          {/* ── Người dùng (Box 2: Collapsible y hệt trang Schedule) ── */}
          <div className="att-filter-box">
            <div
              className="att-filter-box-header clickable"
              onClick={() => setShowUserList((v) => !v)}
            >
              <span className="att-filter-label">Người dùng</span>
              <span className={`att-filter-arrow${showUserList ? ' open' : ''}`}>▾</span>
            </div>
            <div className={`att-filter-collapse${showUserList ? ' expanded' : ''}`}>
              <div
                className={`att-user-list-item${userFilter === 'All' ? ' active' : ''}`}
                onClick={() => setUserFilter('All')}
              >
                Tất cả
              </div>
              {employees.map((emp) => {
                const name = emp.staffFullName || emp.fullName || '';
                const empId = emp.staffId || emp.id;
                const isSelected = userFilter === name;
                return (
                  <div
                    key={empId}
                    className={`att-user-list-item${isSelected ? ' active' : ''}`}
                    onClick={() => setUserFilter(isSelected ? 'All' : name)}
                  >
                    <img
                      src={AVATARS[name] || DEFAULT_AVATAR}
                      alt={name}
                      className="att-filter-avatar"
                    />
                    <span style={{ flex: 1 }}>{name}</span>
                  </div>
                );
              })}
              {employees.length === 0 && (
                <div className="att-user-list-item" style={{ color: '#aaa', fontStyle: 'italic' }}>
                  Chưa có nhân viên
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* ═══ MAIN CONTENT ═══ */}
      <main className="att-main">
        {/* ═══ TOPBAR (Row 1: Day/Week Toggle & Tóm tắt bảng lương) ═══ */}
        <div className="att-topbar">
          <div className="att-viewmode-toggle">
            <button
              type="button"
              className={`att-toggle-btn ${viewMode === 'Ngày' ? 'active' : ''}`}
              onClick={() => setViewMode('Ngày')}
            >
              Day
            </button>
            <button
              type="button"
              className={`att-toggle-btn ${viewMode === 'Tuần' ? 'active' : ''}`}
              onClick={() => setViewMode('Tuần')}
            >
              Week
            </button>
          </div>

          <div className="att-topbar-actions">
            <div className="att-capsule-card">
              <button
                type="button"
                className="att-capsule-payroll-btn"
                onClick={() => navigate('/payroll')}
                title="Xem tóm tắt bảng lương"
              >
                Tóm tắt bảng lương
              </button>
              <div className="att-capsule-divider" />
              <button
                type="button"
                className="att-capsule-export-btn"
                onClick={handleExport}
                title="Xuất bảng chấm công ra file CSV"
              >
                Xuất
              </button>
            </div>
          </div>
        </div>

        {/* ═══ HEADER TOOLBAR (Row 2: Date Navigator & Calendar Popover) ═══ */}
        <div className="att-header-toolbar">
          <div className="att-date-navigator-wrap" ref={dateNavWrapRef}>
            <div className="att-date-navigator">
              <button
                type="button"
                className="att-date-nav-arrow"
                onClick={handlePrevDate}
                title="Trước"
              >
                ‹
              </button>
              <div
                className="att-date-nav-center"
                onClick={openCalendarPopover}
                title="Bấm 1 lần để xem lịch • Bấm ngày để chọn tuần • Bấm đúp để chọn ngày"
              >
                <span>
                  {viewMode === 'Ngày'
                    ? fmtDateRangeText(today)
                    : `${fmtDateRangeText(weekDatesFull[0])}`}
                </span>
                {viewMode === 'Tuần' && (
                  <>
                    <span className="att-date-arrow-sep">→</span>
                    <span>{fmtDateRangeText(weekDatesFull[6])}</span>
                  </>
                )}
              </div>
              <button
                type="button"
                className="att-date-nav-arrow"
                onClick={handleNextDate}
                title="Sau"
              >
                ›
              </button>
            </div>

            <button
              type="button"
              className="att-today-btn"
              onClick={handleTodayClick}
            >
              Hôm nay
            </button>

            {/* ── Datepicker Popover (Y hệt trang Schedule) ── */}
            {showCalendarPopover && (
              <div className="att-calendar-popover" onClick={(e) => e.stopPropagation()}>
                <div className="att-cal-popover-header">
                  <div className="att-cal-month-year">
                    <span>{MONTH_NAMES_VI[calMonth]} ▾</span>
                    <span>{calYear} ▾</span>
                  </div>
                  <div className="att-cal-header-nav">
                    <button
                      type="button"
                      className="att-cal-nav-btn"
                      onClick={handleCalPrevMonth}
                      title="Tháng trước"
                    >
                      ‹
                    </button>
                    <button
                      type="button"
                      className="att-cal-nav-btn"
                      onClick={handleCalNextMonth}
                      title="Tháng sau"
                    >
                      ›
                    </button>
                  </div>
                </div>

                <div className="att-cal-weekdays">
                  <div>T2</div><div>T3</div><div>T4</div><div>T5</div><div>T6</div><div>T7</div><div>CN</div>
                </div>

                <div className="att-cal-grid">
                  {getCalendarWeeks(calYear, calMonth).map((week, wIdx) => {
                    const isCurWeek = week.some((d) => {
                      const curMonday = weekDatesFull[0];
                      const dMon = getWeekDates(d)[0];
                      return dMon.toDateString() === curMonday.toDateString();
                    });

                    return (
                      <div
                        key={wIdx}
                        className={`att-cal-week-row ${isCurWeek && viewMode === 'Tuần' ? 'selected' : ''}`}
                        onClick={() => handleSelectWeek(week[0])}
                      >
                        {week.map((dateObj, dIdx) => {
                          const isCurMonth = dateObj.getMonth() === calMonth;
                          const isTodayDate = dateObj.toDateString() === new Date().toDateString();
                          const isSelDay = viewMode === 'Ngày' && dateObj.toDateString() === today.toDateString();

                          return (
                            <div
                              key={dIdx}
                              className={`att-cal-day-cell ${isCurMonth ? '' : 'outside'} ${isTodayDate ? 'today' : ''} ${isSelDay ? 'selected' : ''}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCalendarDayClick(dateObj);
                              }}
                            >
                              <span>{dateObj.getDate()}</span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Error Banner ── */}
        {error && <div className="att-error-banner">{error}</div>}

        {/* ═══ ATTENDANCE TABLE ═══ */}
        <div className="att-table-card">
          {loading ? (
            <div className="att-loading-box">
              <div className="att-spinner"></div>
              <span>Đang tải dữ liệu chấm công...</span>
            </div>
          ) : visibleRows.length === 0 ? (
            <div className="att-empty-box">
              <h3>Không có dữ liệu chấm công</h3>
              <p>Chưa có bản ghi chấm công nào trong khoảng thời gian đã chọn.</p>
            </div>
          ) : (
            <div className="att-table-responsive">
              <table className="att-table">
                <thead>
                  <tr>
                    <th>Nhân viên</th>
                    <th>Ngày</th>
                    <th>In</th>
                    <th>Out</th>
                    <th>Lịch</th>
                    <th>Khác</th>
                    <th>Tổng</th>
                    <th>Trạng thái</th>
                    <th>Ảnh / GPS</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((row) => {
                    const hoursWorked = calcHours(row);
                    const schedHours = calcScheduledHours(row);
                    const diffHours = (hoursWorked && schedHours) ? Number((hoursWorked - schedHours).toFixed(1)) : null;
                    const isIrregular = flagged(row);

                    return (
                      <tr key={row.id}>
                        {/* Nhân viên */}
                        <td>
                          <div className="att-user-cell">
                            <img
                              src={AVATARS[row.staffName] || DEFAULT_AVATAR}
                              alt=""
                              className="att-user-avatar"
                            />
                            <div className="att-user-info">
                              <span className="att-user-name">{row.staffName || 'Nhân viên'}</span>
                              <span className="att-user-pos">{row.jobPosition || 'Nhân viên'}</span>
                            </div>
                            {isIrregular && (
                              <span
                                className="att-table-warn-icon"
                                title="Đi trễ hoặc về sớm"
                              >
                                !
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Ngày */}
                        <td>
                          <span className="att-date-text">{fmtShortDate(row.shiftDate)}</span>
                        </td>

                        {/* In */}
                        <td>
                          <span className="att-time-badge in">{fmtTimeAMPM(row.checkInTime)}</span>
                        </td>

                        {/* Out */}
                        <td>
                          <span className="att-time-badge out">{fmtTimeAMPM(row.checkOutTime)}</span>
                        </td>

                        {/* Lịch */}
                        <td>
                          <span className="att-sched-text">
                            {row.scheduledStart && row.scheduledEnd
                              ? `${row.scheduledStart.slice(0, 5)} - ${row.scheduledEnd.slice(0, 5)}`
                              : '—'}
                          </span>
                        </td>

                        {/* Khác (OT / Chênh lệch) */}
                        <td>
                          {diffHours !== null && diffHours !== 0 ? (
                            <span className={`att-diff-badge ${diffHours > 0 ? 'plus' : 'minus'}`}>
                              {diffHours > 0 ? `+${diffHours} Giờ` : `${diffHours} Giờ`}
                            </span>
                          ) : (
                            <span className="att-muted">—</span>
                          )}
                        </td>

                        {/* Tổng */}
                        <td>
                          <strong className="att-total-text">
                            {hoursWorked !== null ? `${hoursWorked} Giờ` : '—'}
                          </strong>
                        </td>

                        {/* Trạng thái */}
                        <td>
                          <span className={`att-status-pill ${row.status?.toLowerCase() || 'present'}`}>
                            {statusLabel(row.status)}
                          </span>
                        </td>

                        {/* Ảnh / GPS */}
                        <td>
                          <div className="att-proof-cell">
                            {row.checkInPhotoBase64 ? (
                              <img
                                src={`data:image/jpeg;base64,${row.checkInPhotoBase64}`}
                                alt="Selfie"
                                className="att-proof-thumb"
                                onClick={() => setPreviewPhoto(`data:image/jpeg;base64,${row.checkInPhotoBase64}`)}
                                title="Bấm để xem ảnh phóng to"
                              />
                            ) : (
                              <span className="att-muted">—</span>
                            )}
                            <div className="att-gps-info">
                              {row.checkInLat ? (
                                <span className="att-gps-text">
                                  {row.checkInLat.toFixed(3)}, {row.checkInLng.toFixed(3)}
                                </span>
                              ) : (
                                <span className="att-gps-text muted">N/A</span>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* ── Summary Footer when filtering single user ── */}
              {userFilter !== 'All' && visibleRows.length > 0 && (
                <div className="att-table-footer">
                  <span>Tổng thời gian làm việc:</span>
                  <strong>{totalFilteredHours.toFixed(1)} Giờ</strong>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* ═══ PHOTO PREVIEW MODAL ═══ */}
      {previewPhoto && (
        <div className="att-photo-modal-overlay" onClick={() => setPreviewPhoto(null)}>
          <div className="att-photo-modal" onClick={(e) => e.stopPropagation()}>
            <div className="att-photo-modal-header">
              <h3>Ảnh xác thực check-in</h3>
              <button
                type="button"
                className="att-photo-close-btn"
                onClick={() => setPreviewPhoto(null)}
              >
                ✕
              </button>
            </div>
            <div className="att-photo-modal-body">
              <img src={previewPhoto} alt="Xác thực" className="att-photo-full" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
