import { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllStores } from '../services/storeService';
import { getEmployees } from '../services/employeeService';
import { getSkillsByStore } from '../services/skillService';
import { getStoreAttendance, updateAttendanceRecord } from '../services/attendanceService';
import CompactDropdownFilter from '../components/CompactDropdownFilter';
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

const statusLabel = (val, lateMins) => {
  if (val === 'LATE') {
    return lateMins && lateMins > 0 ? `Đi trễ (${lateMins}p)` : 'Đi trễ';
  }
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
  const [skills, setSkills] = useState([]);
  const [selectedPositions, setSelectedPositions] = useState(['ALL']);
  const [selectedEmployees, setSelectedEmployees] = useState(['ALL']);

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

  // Edit attendance state (Quản lý chỉnh sửa giờ chấm công)
  const [editingRow, setEditingRow] = useState(null);
  const [editForm, setEditForm] = useState({
    checkInTimeString: '',
    checkOutTimeString: '',
    status: 'PRESENT',
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleOpenEdit = (row) => {
    setEditingRow(row);
    let inStr = '';
    if (row.checkInTime) {
      const d = new Date(row.checkInTime);
      inStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    }
    let outStr = '';
    if (row.checkOutTime) {
      const d = new Date(row.checkOutTime);
      outStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    }
    setEditForm({
      checkInTimeString: inStr,
      checkOutTimeString: outStr,
      status: row.status || 'PRESENT',
    });
  };

  const handleSaveEdit = async (e) => {
    if (e) e.preventDefault();
    if (!editingRow || !storeId) return;
    setIsSaving(true);
    try {
      await updateAttendanceRecord(storeId, editingRow.id, {
        checkInTimeString: editForm.checkInTimeString || null,
        checkOutTimeString: editForm.checkOutTimeString || null,
        status: editForm.status,
      });
      setEditingRow(null);
      const res = await getStoreAttendance(storeId, fromDate, toDate);
      setRows(res.data || []);
    } catch (err) {
      alert(err.response?.data?.message || 'Không thể cập nhật giờ chấm công. Vui lòng thử lại.');
    } finally {
      setIsSaving(false);
    }
  };

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
          const saved = localStorage.getItem('selectedStoreId');
          const target = (saved && list.find((s) => String(s.id) === String(saved))) || list[0];
          setStoreId(target.id);
          localStorage.setItem('selectedStoreId', String(target.id));
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

  // Load skills for selected store
  useEffect(() => {
    if (!storeId) return;
    getSkillsByStore(storeId)
      .then((res) => {
        setSkills(res.data || []);
      })
      .catch(() => setSkills([]));
  }, [storeId]);

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

  // Filter rows by compact dropdown (positions & employees)
  const visibleRows = useMemo(() => {
    return rows.filter((r) => {
      // Match employee
      if (!selectedEmployees.includes('ALL')) {
        const matchEmp = selectedEmployees.some((selId) => {
          const emp = employees.find((e) => String(e.id || e.staffId) === String(selId));
          return (
            String(r.staffId) === String(selId) ||
            (emp && (emp.staffFullName || emp.fullName) === r.staffName)
          );
        });
        if (!matchEmp) return false;
      }

      // Match position/skill
      if (!selectedPositions.includes('ALL')) {
        const emp = employees.find(
          (e) => String(e.id || e.staffId) === String(r.staffId) || (e.staffFullName || e.fullName) === r.staffName
        );
        const skillId = emp?.skillId || emp?.skill?.id;
        const skillName = emp?.skillName || emp?.position || r.position || r.skillName;
        const matchPos = selectedPositions.some((posId) => {
          const skObj = skills.find((s) => String(s.id) === String(posId));
          return (
            String(skillId) === String(posId) ||
            (skObj && skObj.name === skillName) ||
            String(r.skillId) === String(posId)
          );
        });
        if (!matchPos) return false;
      }

      return true;
    });
  }, [rows, selectedEmployees, selectedPositions, employees, skills]);

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
      {/* ═══ MAIN CONTENT (Full width, sidebar ảnh 3 đã xóa) ═══ */}
      <main className="att-main">
        {/* ═══ TOPBAR (Row 1: Day/Week Toggle & Tóm tắt bảng lương) ═══ */}
        <div className="att-topbar">
          <div className="att-viewmode-toggle">
            <button
              type="button"
              className={`att-toggle-btn ${viewMode === 'Ngày' ? 'active' : ''}`}
              onClick={() => setViewMode('Ngày')}
            >
              Ngày
            </button>
            <button
              type="button"
              className={`att-toggle-btn ${viewMode === 'Tuần' ? 'active' : ''}`}
              onClick={() => setViewMode('Tuần')}
            >
              Tuần
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

        {/* ═══ HEADER TOOLBAR (Row 2: Date Navigator & Inline Compact Filters) ═══ */}
        <div className="att-header-toolbar">
          <div className="att-toolbar-row-left">
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

              {/* ── Datepicker Popover ── */}
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

          <div className="att-toolbar-row-right">
            {/* Bộ lọc vị trí & nhân viên */}
            <div className="att-compact-filter-wrap">
              <CompactDropdownFilter
                skills={skills}
                selectedSkills={selectedPositions}
                onSkillsChange={setSelectedPositions}
                employees={employees}
                selectedEmployees={selectedEmployees}
                onEmployeesChange={setSelectedEmployees}
              />
            </div>
          </div>
        </div>

        {/* ── Error Banner ── */}
        {error && <div className="att-error-banner">{error}</div>}

        {/* ── Late Alert Banner ── */}
        {visibleRows.filter((r) => r.status === 'LATE').length > 0 && (
          <div
            style={{
              backgroundColor: '#FEF2F2',
              border: '1px solid #FCA5A5',
              borderRadius: '10px',
              padding: '12px 16px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              color: '#991B1B',
              fontSize: '13px',
              fontWeight: '600',
            }}
          >
            <span style={{ fontSize: '18px' }}>⚠️</span>
            <span>
              Hệ thống phát hiện{' '}
              <strong>
                {visibleRows.filter((r) => r.status === 'LATE').length} lượt check-in đi trễ
              </strong>{' '}
              trong khoảng thời gian này. Hãy kiểm tra các mục có nhãn cảnh báo đỏ bên dưới.
            </span>
          </div>
        )}

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
                    <th>Thao tác</th>
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
                            {statusLabel(row.status, row.lateMinutes)}
                          </span>
                        </td>

                        {/* Ảnh / GPS */}
                        <td>
                          <div className="att-proof-cell">
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                              {row.checkInPhotoBase64 && (
                                <img
                                  src={`data:image/jpeg;base64,${row.checkInPhotoBase64}`}
                                  alt="In"
                                  className="att-proof-thumb"
                                  onClick={() =>
                                    setPreviewPhoto({
                                      uri: `data:image/jpeg;base64,${row.checkInPhotoBase64}`,
                                      title: `Ảnh Check-In (${row.staffName || 'Nhân viên'})`,
                                    })
                                  }
                                  title="Bấm để xem ảnh Check-in"
                                />
                              )}
                              {row.checkOutPhotoBase64 && (
                                <img
                                  src={`data:image/jpeg;base64,${row.checkOutPhotoBase64}`}
                                  alt="Out"
                                  className="att-proof-thumb"
                                  style={{ borderColor: '#F59E0B' }}
                                  onClick={() =>
                                    setPreviewPhoto({
                                      uri: `data:image/jpeg;base64,${row.checkOutPhotoBase64}`,
                                      title: `Ảnh Check-Out (${row.staffName || 'Nhân viên'})`,
                                    })
                                  }
                                  title="Bấm để xem ảnh Check-out"
                                />
                              )}
                              {!row.checkInPhotoBase64 && !row.checkOutPhotoBase64 && (
                                <span className="att-muted">—</span>
                              )}
                            </div>
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

                        {/* Thao tác */}
                        <td>
                          <button
                            type="button"
                            className="att-edit-btn"
                            onClick={() => handleOpenEdit(row)}
                            title="Chỉnh sửa giờ chấm công của nhân viên"
                          >
                            ✏️ Sửa
                          </button>
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
              <h3>{previewPhoto.title || 'Ảnh xác thực chấm công'}</h3>
              <button
                type="button"
                className="att-photo-close-btn"
                onClick={() => setPreviewPhoto(null)}
              >
                ✕
              </button>
            </div>
            <div className="att-photo-modal-body">
              <img
                src={previewPhoto.uri || previewPhoto}
                alt="Xác thực"
                className="att-photo-full"
              />
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL CHỈNH SỬA CHẤM CÔNG (DÀNH CHO QUẢN LÝ) ═══ */}
      {editingRow && (
        <div className="att-modal-overlay" onClick={() => !isSaving && setEditingRow(null)}>
          <div className="att-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="att-modal-header">
              <h3>Điều chỉnh giờ chấm công</h3>
              <button
                type="button"
                className="att-modal-close"
                onClick={() => setEditingRow(null)}
                disabled={isSaving}
              >
                ✕
              </button>
            </div>
            <form className="att-edit-form" onSubmit={handleSaveEdit}>
              <div className="att-form-info-box">
                <div className="att-info-row">
                  <span className="att-info-label">Nhân viên:</span>
                  <span className="att-info-val">{editingRow.staffName || 'Nhân viên'}</span>
                </div>
                <div className="att-info-row">
                  <span className="att-info-label">Ngày ca làm:</span>
                  <span className="att-info-val">{fmtShortDate(editingRow.shiftDate)}</span>
                </div>
                <div className="att-info-row">
                  <span className="att-info-label">Giờ theo lịch:</span>
                  <span className="att-info-val">
                    {editingRow.scheduledStart && editingRow.scheduledEnd
                      ? `${editingRow.scheduledStart.slice(0, 5)} - ${editingRow.scheduledEnd.slice(0, 5)}`
                      : '—'}
                  </span>
                </div>
              </div>

              <div className="att-form-group">
                <label>Giờ vào (Check-In)</label>
                <input
                  type="time"
                  className="att-time-input"
                  value={editForm.checkInTimeString}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, checkInTimeString: e.target.value }))}
                  required
                />
              </div>

              <div className="att-form-group">
                <label>Giờ ra (Check-Out)</label>
                <input
                  type="time"
                  className="att-time-input"
                  value={editForm.checkOutTimeString}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, checkOutTimeString: e.target.value }))}
                />
              </div>

              <div className="att-form-group">
                <label>Trạng thái</label>
                <select
                  className="att-select-input"
                  value={editForm.status}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, status: e.target.value }))}
                >
                  <option value="PRESENT">Đúng giờ (PRESENT)</option>
                  <option value="LATE">Đi trễ (LATE)</option>
                  <option value="EARLY_LEAVE">Về sớm (EARLY_LEAVE)</option>
                  <option value="ABSENT">Vắng (ABSENT)</option>
                </select>
              </div>

              <div className="att-modal-actions">
                <button
                  type="button"
                  className="att-cancel-btn"
                  onClick={() => setEditingRow(null)}
                  disabled={isSaving}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="att-save-btn"
                  disabled={isSaving}
                >
                  {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
