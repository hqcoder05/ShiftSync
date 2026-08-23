import { useState, useEffect, useRef } from 'react';
import { getRequests, createRequest, updateRequestStatus } from '../services/requestService';
import { getAllStores } from '../services/storeService';
import avatarPaul from '../assets/avatars/avatar-paul-lee.png';
import avatarThia from '../assets/avatars/avatar-thia-ago.png';
import avatarMew from '../assets/avatars/avatar-mew-ama.png';
import avatarDilan from '../assets/avatars/avatar-dilan-jon.png';
import './RequestPage.css';

const MONTH_NAMES_VI = [
  'Tháng Một', 'Tháng Hai', 'Tháng Ba', 'Tháng Tư', 'Tháng Năm', 'Tháng Sáu',
  'Tháng Bảy', 'Tháng Tám', 'Tháng Chín', 'Tháng Mười', 'Tháng Mười Một', 'Tháng Mười Hai'
];

const AVATAR_MAP = {
  'Paul. Lee': avatarPaul,
  'Thia. Ago': avatarThia,
  'Mew. Ama': avatarMew,
  'Dilan. Jon': avatarDilan,
  'Vivi.an': avatarThia,
};

const fmtDMY = (d) => {
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

const toISODate = (d) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function RequestPage() {
  const [requests, setRequests] = useState([]);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Filter Box 1: Types
  const [filterTypes, setFilterTypes] = useState({
    leave: false,   // Yêu cầu nghỉ việc
    swap: false,    // Yêu cầu hoán đổi ca
    absence: false, // Yêu cầu vắng mặt
    support: false  // Yêu cầu hỗ trợ
  });
  const [isTypeBoxOpen, setIsTypeBoxOpen] = useState(true);

  // Filter Box 2: Status
  const [filterStatus, setFilterStatus] = useState({
    pending: false,  // Đang chờ phê duyệt
    approved: false, // Đã phê duyệt
    rejected: false  // Đã từ chối
  });
  const [isStatusBoxOpen, setIsStatusBoxOpen] = useState(true);

  // Mini Calendar Popover state (Scheduler Style)
  const [showCalendarPopover, setShowCalendarPopover] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null); // specific day
  const [selectedWeek, setSelectedWeek] = useState(null); // array of 7 Date objects
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const clickTimerRef = useRef(null);
  const calRef = useRef(null);

  // Modals state
  const [selectedRequest, setSelectedRequest] = useState(null); // Detail modal
  const [showCreateModal, setShowCreateModal] = useState(false); // Create modal

  // Create Form State
  const [createForm, setCreateForm] = useState({
    storeOption: '',
    customStore: '',
    recipientRole: 'Quản lý cửa hàng (Store Manager)',
    customRecipient: '',
    requestType: 'Yêu cầu hỗ trợ',
    startDate: '',
    endDate: '',
    content: ''
  });

  // Toast feedback
  const [toast, setToast] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  // Close calendar popover on outside click
  useEffect(() => {
    const handler = (e) => {
      if (calRef.current && !calRef.current.contains(e.target)) {
        setShowCalendarPopover(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [reqData, storeRes] = await Promise.allSettled([
        getRequests(),
        getAllStores()
      ]);

      if (reqData.status === 'fulfilled') {
        setRequests(reqData.value);
      }

      if (storeRes.status === 'fulfilled') {
        const list = storeRes.value.data?.content || storeRes.value.data || [];
        setStores(Array.isArray(list) ? list : []);
        if (list.length > 0) {
          setCreateForm(prev => ({
            ...prev,
            storeOption: list[0].name || `Store #${list[0].id}`
          }));
        }
      }
    } catch (e) {
      console.error('Error loading data:', e);
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const getAvatar = (name = '') => AVATAR_MAP[name] || avatarPaul;

  // Calendar Helpers (Matching SchedulePage)
  const getCalendarWeeks = (year, month) => {
    const firstDay = new Date(year, month, 1);
    const dow = firstDay.getDay(); // 0 Sun, 1 Mon...
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

  const handleCalPrevMonth = () => {
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear(y => y - 1);
    } else {
      setCalMonth(m => m - 1);
    }
  };

  const handleCalNextMonth = () => {
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear(y => y + 1);
    } else {
      setCalMonth(m => m + 1);
    }
  };

  // Click on Calendar Day (single click = select week, double click = select specific day)
  const handleCalendarDayClick = (date, week) => {
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
      // Double click -> Chọn ngày cụ thể
      setSelectedDate(date);
      setSelectedWeek(null);
      setShowCalendarPopover(false);
    } else {
      clickTimerRef.current = setTimeout(() => {
        clickTimerRef.current = null;
        // Single click -> Chọn cả tuần
        setSelectedWeek(week);
        setSelectedDate(date);
        setShowCalendarPopover(false);
      }, 250);
    }
  };

  // Filter Reset
  const handleResetFilters = () => {
    setFilterTypes({ leave: false, swap: false, absence: false, support: false });
    setFilterStatus({ pending: false, approved: false, rejected: false });
    setSearch('');
    setSelectedDate(null);
    setSelectedWeek(null);
  };

  // Filter matching
  const filteredRequests = requests.filter(item => {
    // 1. Search text match (supports name, type, content, and status keywords)
    const q = search.trim().toLowerCase();
    if (q) {
      const matchName = item.requesterName?.toLowerCase().includes(q);
      const matchType = item.requestType?.toLowerCase().includes(q);
      const matchContent = item.content?.toLowerCase().includes(q);
      const matchStatus = item.status?.toLowerCase().includes(q);
      
      // smart status keywords
      const isPendingSearch = (q.includes('chờ') || q.includes('cho')) && item.status === 'Đang chờ phê duyệt';
      const isApprovedSearch = (q.includes('duyệt') || q.includes('duyet') || q.includes('đã duyệt')) && item.status === 'Đã phê duyệt';
      const isRejectedSearch = (q.includes('từ chối') || q.includes('tu choi') || q.includes('chối')) && item.status === 'Đã từ chối';

      if (!matchName && !matchType && !matchContent && !matchStatus && !isPendingSearch && !isApprovedSearch && !isRejectedSearch) {
        return false;
      }
    }

    // 2. Calendar Date match
    if (selectedWeek) {
      const weekDateStrings = selectedWeek.map(d => fmtDMY(d));
      const weekIsoStrings = selectedWeek.map(d => toISODate(d));
      const matchWeek = weekDateStrings.includes(item.requestDate) || weekIsoStrings.includes(item.startDate);
      if (!matchWeek) return false;
    } else if (selectedDate) {
      const selDmy = fmtDMY(selectedDate);
      const selIso = toISODate(selectedDate);
      if (item.requestDate !== selDmy && item.startDate !== selIso) {
        return false;
      }
    }

    // 3. Status filter match
    const hasStatusChecked = Object.values(filterStatus).some(Boolean);
    if (hasStatusChecked) {
      const isPending = filterStatus.pending && item.status === 'Đang chờ phê duyệt';
      const isApproved = filterStatus.approved && item.status === 'Đã phê duyệt';
      const isRejected = filterStatus.rejected && item.status === 'Đã từ chối';
      if (!isPending && !isApproved && !isRejected) {
        return false;
      }
    }

    // 4. Type filter match
    const hasTypeChecked = Object.values(filterTypes).some(Boolean);
    if (hasTypeChecked) {
      const rType = (item.requestType || '').toLowerCase();
      const isLeave = filterTypes.leave && (rType.includes('nghỉ') || item.typeCategory === 'leave');
      const isSwap = filterTypes.swap && (rType.includes('đổi') || rType.includes('hoán') || item.typeCategory === 'swap');
      const isAbsence = filterTypes.absence && (rType.includes('vắng') || item.typeCategory === 'absence');
      const isSupport = filterTypes.support && (rType.includes('hỗ trợ') || item.typeCategory === 'support');
      if (!isLeave && !isSwap && !isAbsence && !isSupport) {
        return false;
      }
    }

    return true;
  });

  // Handle Approve / Reject
  const handleApprove = async (id) => {
    try {
      await updateRequestStatus(id, 'Đã phê duyệt');
      await loadData();
      setSelectedRequest(null);
      showNotification('✓ Đã phê duyệt yêu cầu thành công!');
    } catch (e) {
      showNotification('❌ Có lỗi xảy ra khi phê duyệt.');
    }
  };

  const handleReject = async (id) => {
    try {
      await updateRequestStatus(id, 'Đã từ chối');
      await loadData();
      setSelectedRequest(null);
      showNotification('✓ Đã từ chối yêu cầu.');
    } catch (e) {
      showNotification('❌ Có lỗi xảy ra khi từ chối.');
    }
  };

  // Handle Create Submit
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!createForm.content.trim()) {
      alert('Vui lòng nhập thông điệp / nội dung yêu cầu');
      return;
    }

    const targetStore = createForm.storeOption === '__custom__' 
      ? createForm.customStore 
      : createForm.storeOption;
    
    const targetRecipient = createForm.recipientRole === '__custom__'
      ? createForm.customRecipient
      : createForm.recipientRole;

    const fullRecipient = targetStore 
      ? `${targetRecipient} - ${targetStore}`
      : targetRecipient;

    try {
      let typeCategory = 'support';
      if (createForm.requestType.includes('nghỉ')) typeCategory = 'leave';
      if (createForm.requestType.includes('đổi')) typeCategory = 'swap';
      if (createForm.requestType.includes('vắng')) typeCategory = 'absence';

      await createRequest({
        requesterName: 'Paul. Lee', // Current user
        avatarKey: 'paul',
        requestType: createForm.requestType,
        typeCategory,
        recipient: fullRecipient,
        startDate: createForm.startDate,
        endDate: createForm.endDate,
        content: `Kính gửi: ${fullRecipient}\n\n${createForm.content}`
      });

      await loadData();
      setShowCreateModal(false);
      setCreateForm({
        storeOption: stores.length > 0 ? (stores[0].name || `Store #${stores[0].id}`) : '',
        customStore: '',
        recipientRole: 'Quản lý cửa hàng (Store Manager)',
        customRecipient: '',
        requestType: 'Yêu cầu hỗ trợ',
        startDate: '',
        endDate: '',
        content: ''
      });
      showNotification('✓ Đã gửi yêu cầu mới thành công!');
    } catch (e) {
      showNotification('❌ Có lỗi xảy ra khi gửi yêu cầu.');
    }
  };

  const getStatusClass = (status) => {
    if (status === 'Đã phê duyệt') return 'req-status-approved';
    if (status === 'Đã từ chối') return 'req-status-rejected';
    return 'req-status-pending';
  };

  const activeTypeCount = Object.values(filterTypes).filter(Boolean).length;
  const activeStatusCount = Object.values(filterStatus).filter(Boolean).length;
  const isAnyFilterActive = activeTypeCount > 0 || activeStatusCount > 0 || search || selectedDate || selectedWeek;

  return (
    <div className="req-container">
      {/* ── Left Sidebar (Bộ lọc kiểu Scheduler) ─────────────── */}
      <aside className="req-sidebar">
        <div className="req-sidebar-title">
          <span>Bộ lọc & Tìm kiếm</span>
        </div>

        {/* Search input */}
        <div className="req-search-box">
          <span className="req-search-icon">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </span>
          <input
            type="text"
            className="req-search-input"
            placeholder="Tìm tên, loại, trạng thái..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="req-search-clear" onClick={() => setSearch('')} title="Xóa tìm kiếm">
              ✕
            </button>
          )}
        </div>

        {/* Filter Box 1: Loại yêu cầu */}
        <div className="req-filter-box">
          <div 
            className="req-filter-box-header"
            onClick={() => setIsTypeBoxOpen(!isTypeBoxOpen)}
          >
            <span className="req-filter-label">
              <span>Loại yêu cầu</span>
              {activeTypeCount > 0 && (
                <span className="req-filter-badge-count">{activeTypeCount}</span>
              )}
            </span>
            <span className={`req-filter-arrow ${isTypeBoxOpen ? 'open' : ''}`}>
              ▾
            </span>
          </div>

          {isTypeBoxOpen && (
            <div className="req-filter-content">
              <label className="req-checkbox-label">
                <input
                  type="checkbox"
                  className="req-checkbox"
                  checked={filterTypes.leave}
                  onChange={() => setFilterTypes(p => ({ ...p, leave: !p.leave }))}
                />
                <span>Yêu cầu nghỉ việc / nghỉ phép</span>
              </label>

              <label className="req-checkbox-label">
                <input
                  type="checkbox"
                  className="req-checkbox"
                  checked={filterTypes.swap}
                  onChange={() => setFilterTypes(p => ({ ...p, swap: !p.swap }))}
                />
                <span>Yêu cầu hoán đổi ca</span>
              </label>

              <label className="req-checkbox-label">
                <input
                  type="checkbox"
                  className="req-checkbox"
                  checked={filterTypes.absence}
                  onChange={() => setFilterTypes(p => ({ ...p, absence: !p.absence }))}
                />
                <span>Yêu cầu vắng mặt</span>
              </label>

              <label className="req-checkbox-label">
                <input
                  type="checkbox"
                  className="req-checkbox"
                  checked={filterTypes.support}
                  onChange={() => setFilterTypes(p => ({ ...p, support: !p.support }))}
                />
                <span>Yêu cầu hỗ trợ nhân sự</span>
              </label>
            </div>
          )}
        </div>

        {/* Filter Box 2: Trạng thái */}
        <div className="req-filter-box">
          <div 
            className="req-filter-box-header"
            onClick={() => setIsStatusBoxOpen(!isStatusBoxOpen)}
          >
            <span className="req-filter-label">
              <span>Trạng thái</span>
              {activeStatusCount > 0 && (
                <span className="req-filter-badge-count">{activeStatusCount}</span>
              )}
            </span>
            <span className={`req-filter-arrow ${isStatusBoxOpen ? 'open' : ''}`}>
              ▾
            </span>
          </div>

          {isStatusBoxOpen && (
            <div className="req-filter-content">
              <label className="req-checkbox-label">
                <input
                  type="checkbox"
                  className="req-checkbox"
                  checked={filterStatus.pending}
                  onChange={() => setFilterStatus(p => ({ ...p, pending: !p.pending }))}
                />
                <span>Đang chờ phê duyệt</span>
              </label>

              <label className="req-checkbox-label">
                <input
                  type="checkbox"
                  className="req-checkbox"
                  checked={filterStatus.approved}
                  onChange={() => setFilterStatus(p => ({ ...p, approved: !p.approved }))}
                />
                <span>Đã phê duyệt</span>
              </label>

              <label className="req-checkbox-label">
                <input
                  type="checkbox"
                  className="req-checkbox"
                  checked={filterStatus.rejected}
                  onChange={() => setFilterStatus(p => ({ ...p, rejected: !p.rejected }))}
                />
                <span>Đã từ chối</span>
              </label>
            </div>
          )}
        </div>

        {/* Reset Button */}
        {isAnyFilterActive && (
          <button className="req-filter-reset" onClick={handleResetFilters}>
            Đặt lại tất cả bộ lọc
          </button>
        )}
      </aside>

      {/* ── Right Main Area ─────────────────────────────────── */}
      <main className="req-main">
        {/* Top bar */}
        <div className="req-top-bar">
          <h1 className="req-heading">Yêu cầu</h1>

          {/* ── Capsule Action Card (Chuẩn gọn đẹp liền mạch) ─── */}
          <div className="req-capsule-wrapper" ref={calRef}>
            <div className="req-capsule-card">
              {/* Calendar Button inside capsule */}
              <button
                type="button"
                className={`req-capsule-calendar-btn ${showCalendarPopover ? 'active' : ''}`}
                onClick={() => setShowCalendarPopover(!showCalendarPopover)}
                title="Bấm để mở lịch chọn tuần / ngày"
              >
                {/* Modern Crisp Calendar SVG Icon */}
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                <span>{selectedDate ? fmtDMY(selectedDate) : 'Lịch tuần'}</span>
                {/* Arrow down */}
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>

              <div className="req-capsule-divider" />

              {/* Create Request Button inside capsule */}
              <button
                type="button"
                className="req-capsule-create-btn"
                onClick={() => setShowCreateModal(true)}
              >
                {/* Sleek Plus / Create SVG Icon */}
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                <span>Tạo yêu cầu</span>
              </button>
            </div>

            {/* ── Mini Calendar Popover (Matching SchedulePage Screenshot) ── */}
            {showCalendarPopover && (
              <div className="req-calendar-popover" onClick={(e) => e.stopPropagation()}>
                <div className="req-cal-popover-header">
                  <div className="req-cal-month-year">
                    <span>{MONTH_NAMES_VI[calMonth]} ▾</span>
                    <span>{calYear} ▾</span>
                  </div>
                  <div className="req-cal-header-nav">
                    <button
                      type="button"
                      className="req-cal-nav-btn"
                      onClick={handleCalPrevMonth}
                      title="Tháng trước"
                    >
                      ‹
                    </button>
                    <button
                      type="button"
                      className="req-cal-nav-btn"
                      onClick={handleCalNextMonth}
                      title="Tháng sau"
                    >
                      ›
                    </button>
                  </div>
                </div>

                <div className="req-cal-weekdays">
                  <span>Mo</span>
                  <span>Tu</span>
                  <span>We</span>
                  <span>Th</span>
                  <span>Fr</span>
                  <span>Sa</span>
                  <span>Su</span>
                </div>

                <div className="req-cal-grid">
                  {getCalendarWeeks(calYear, calMonth).map((week, wIdx) => {
                    const isWeekSelected = selectedWeek && week.every(d => 
                      selectedWeek.some(wd => toISODate(wd) === toISODate(d))
                    );

                    return (
                      <div 
                        key={wIdx} 
                        className={`req-cal-week-row ${isWeekSelected ? 'selected' : ''}`}
                      >
                        {week.map((d, dIdx) => {
                          const isOutside = d.getMonth() !== calMonth;
                          const isToday = toISODate(d) === toISODate(new Date());
                          const isSelectedDay = selectedDate && toISODate(d) === toISODate(selectedDate);

                          return (
                            <div
                              key={dIdx}
                              className={`req-cal-day-cell ${isOutside ? 'outside-month' : ''} ${
                                isToday ? 'is-today' : ''
                              } ${isSelectedDay ? 'is-selected-day' : ''}`}
                              onClick={() => handleCalendarDayClick(d, week)}
                              title="Bấm 1 lần: chọn cả tuần • Bấm đúp: chọn ngày cụ thể"
                            >
                              {d.getDate()}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>

                <div className="req-cal-hint">
                  <span>Bấm để chọn tuần • Bấm đúp để chọn ngày</span>
                  {(selectedDate || selectedWeek) && (
                    <button 
                      className="req-cal-clear-link"
                      onClick={() => { setSelectedDate(null); setSelectedWeek(null); setShowCalendarPopover(false); }}
                    >
                      Xóa lọc
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Requests Table (With user avatars & smooth hover transitions) */}
        <div className="req-table-card">
          <table className="req-table">
            <thead>
              <tr>
                <th style={{ width: '28%' }}>Người yêu cầu</th>
                <th style={{ width: '26%' }}>Loại yêu cầu</th>
                <th style={{ width: '26%' }}>Trạng thái</th>
                <th style={{ width: '20%' }}>Ngày yêu cầu</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="4" className="req-empty">Đang tải danh sách yêu cầu...</td>
                </tr>
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan="4" className="req-empty">
                    <span>Không tìm thấy yêu cầu nào phù hợp.</span>
                  </td>
                </tr>
              ) : (
                filteredRequests.map((item) => (
                  <tr 
                    key={item.id}
                    onClick={() => setSelectedRequest(item)}
                    title="Nhấn để xem chi tiết và duyệt"
                  >
                    <td>
                      <div className="req-user-cell">
                        <img 
                          src={getAvatar(item.requesterName)} 
                          alt={item.requesterName} 
                          className="req-avatar-img" 
                        />
                        <span className="req-user-name">{item.requesterName}</span>
                      </div>
                    </td>
                    <td>{item.requestType}</td>
                    <td>{item.status}</td>
                    <td>{item.requestDate}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>

      {/* ── Modal 1: Chi tiết & Phê duyệt yêu cầu ─────────────── */}
      {selectedRequest && (
        <div className="req-modal-overlay" onClick={() => setSelectedRequest(null)}>
          <div className="req-modal-detail" onClick={(e) => e.stopPropagation()}>
            <div className="req-modal-detail-header">
              <div className="req-modal-user-info">
                <img 
                  src={getAvatar(selectedRequest.requesterName)} 
                  alt={selectedRequest.requesterName} 
                  className="req-modal-avatar-lg" 
                />
                <div className="req-modal-username-wrap">
                  <span className="req-modal-username">{selectedRequest.requesterName}</span>
                  {selectedRequest.recipient && (
                    <span className="req-modal-recipient-tag">Gửi đến: {selectedRequest.recipient}</span>
                  )}
                </div>
              </div>
              <button 
                className="req-modal-close-btn"
                onClick={() => setSelectedRequest(null)}
              >
                ✕
              </button>
            </div>

            <div className="req-modal-meta">
              <span className="req-modal-type-title">{selectedRequest.requestType}</span>
              <span className="req-modal-time">{selectedRequest.requestTime}</span>
            </div>

            <div className="req-modal-divider" />

            <div className="req-modal-content-section">
              <span className="req-modal-content-title">Nội dung yêu cầu</span>
              <div className="req-modal-content-box">
                {selectedRequest.content}
              </div>
            </div>

            <div className="req-modal-actions">
              <button 
                className="req-btn-reject"
                onClick={() => handleReject(selectedRequest.id)}
              >
                Từ chối
              </button>
              <button 
                className="req-btn-approve"
                onClick={() => handleApprove(selectedRequest.id)}
              >
                Đồng ý
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal 2: Tạo yêu cầu mới ─────────────────────────── */}
      {showCreateModal && (
        <div className="req-modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="req-modal-create" onClick={(e) => e.stopPropagation()}>
            <div className="req-modal-create-header">
              <h2 className="req-modal-create-title">Tạo yêu cầu</h2>
              <button 
                className="req-modal-close-btn"
                onClick={() => setShowCreateModal(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit}>
              {/* Chọn Chi nhánh / Store */}
              <div className="req-form-group">
                <label className="req-form-label">Chi nhánh / Cửa hàng nhận</label>
                <select
                  className="req-form-select"
                  value={createForm.storeOption}
                  onChange={(e) => setCreateForm({ ...createForm, storeOption: e.target.value })}
                >
                  {stores.map(st => (
                    <option key={st.id} value={st.name || `Store #${st.id}`}>
                      {st.name || `Store #${st.id}`} {st.address ? `(${st.address})` : ''}
                    </option>
                  ))}
                  <option value="__custom__">-- Chi nhánh khác (Tự nhập) --</option>
                </select>

                {createForm.storeOption === '__custom__' && (
                  <input
                    type="text"
                    className="req-form-input"
                    style={{ marginTop: '8px' }}
                    placeholder="Nhập tên chi nhánh / store khác..."
                    value={createForm.customStore}
                    onChange={(e) => setCreateForm({ ...createForm, customStore: e.target.value })}
                    required
                  />
                )}
              </div>

              {/* Chọn Người nhận / Chức vụ */}
              <div className="req-form-group" style={{ marginTop: '12px' }}>
                <label className="req-form-label">Người nhận / Chức vụ</label>
                <select
                  className="req-form-select"
                  value={createForm.recipientRole}
                  onChange={(e) => setCreateForm({ ...createForm, recipientRole: e.target.value })}
                >
                  <option value="Quản lý cửa hàng (Store Manager)">Quản lý cửa hàng (Store Manager)</option>
                  <option value="Quản lý ca trực (Shift Leader)">Quản lý ca trực (Shift Leader)</option>
                  <option value="Vivi (Quản lý chi nhánh)">Vivi (Quản lý chi nhánh)</option>
                  <option value="Ban điều hành chuỗi">Ban điều hành chuỗi</option>
                  <option value="__custom__">-- Nhập tên người nhận cụ thể --</option>
                </select>

                {createForm.recipientRole === '__custom__' && (
                  <input
                    type="text"
                    className="req-form-input"
                    style={{ marginTop: '8px' }}
                    placeholder="Nhập họ tên người nhận..."
                    value={createForm.customRecipient}
                    onChange={(e) => setCreateForm({ ...createForm, customRecipient: e.target.value })}
                    required
                  />
                )}
              </div>

              {/* Loại yêu cầu */}
              <div className="req-form-group" style={{ marginTop: '12px' }}>
                <label className="req-form-label">Loại yêu cầu</label>
                <select 
                  className="req-form-select"
                  value={createForm.requestType}
                  onChange={(e) => setCreateForm({ ...createForm, requestType: e.target.value })}
                >
                  <option value="Yêu cầu hỗ trợ">Yêu cầu hỗ trợ</option>
                  <option value="Yêu cầu nghỉ">Yêu cầu nghỉ</option>
                  <option value="Yêu cầu hoán đổi ca">Yêu cầu hoán đổi ca</option>
                  <option value="Yêu cầu vắng mặt">Yêu cầu vắng mặt</option>
                </select>
              </div>

              {/* Ngày bắt đầu - Ngày kết thúc */}
              <div className="req-form-row" style={{ marginTop: '12px' }}>
                <div className="req-form-group">
                  <label className="req-form-label">Ngày bắt đầu</label>
                  <input 
                    type="date"
                    className="req-form-input"
                    value={createForm.startDate}
                    onChange={(e) => setCreateForm({ ...createForm, startDate: e.target.value })}
                    required
                  />
                </div>
                <div className="req-form-group">
                  <label className="req-form-label">Ngày kết thúc</label>
                  <input 
                    type="date"
                    className="req-form-input"
                    value={createForm.endDate}
                    onChange={(e) => setCreateForm({ ...createForm, endDate: e.target.value })}
                    required
                  />
                </div>
              </div>

              {/* Thông điệp */}
              <div className="req-form-group" style={{ marginTop: '12px' }}>
                <label className="req-form-label">Thông điệp</label>
                <textarea 
                  className="req-form-textarea"
                  rows="4"
                  placeholder="Nhập chi tiết ca trực cần đổi, lý do hoặc yêu cầu mượn/hỗ trợ nhân sự từ chi nhánh khác..."
                  value={createForm.content}
                  onChange={(e) => setCreateForm({ ...createForm, content: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button type="submit" className="req-btn-submit">
                  Gửi yêu cầu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Feedback */}
      {toast && <div className="req-toast">{toast}</div>}
    </div>
  );
}