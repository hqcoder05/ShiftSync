import { useEffect, useMemo, useState } from 'react';
import { getAllStores } from '../services/storeService';
import { getStaffByStore } from '../services/employmentService';
import {
  exportPayrollExcel,
  generatePayroll,
  getPayrollPeriods,
  getPayslips,
  updatePayrollStatus,
} from '../services/payrollService';
import { toast } from '../context/ToastContext';
import './PayrollPage.css';

// Illustrations & Avatars
import luongIllustration from '../assets/illustrations/luong.png';
import avatarDilan from '../assets/avatars/avatar-dilan-jon.png';
import avatarMew from '../assets/avatars/avatar-mew-ama.png';
import avatarThia from '../assets/avatars/avatar-thia-ago.png';
import avatarPaul from '../assets/avatars/avatar-paul-lee.png';

const AVATAR_LIST = [avatarPaul, avatarThia, avatarMew, avatarDilan];
const AVATAR_MAP = {
  'Dilan. Jon': avatarDilan,
  'Dilan . Jon': avatarDilan,
  'Mew. Ama': avatarMew,
  'Thia. Ago': avatarThia,
  'Paul. Lee': avatarPaul,
  'Quoc Manager': avatarPaul,
  'Quoc Staff': avatarDilan,
  'Store Manager Alice': avatarThia,
  'Store Manager Bob': avatarPaul,
};

// Deterministic diverse avatar generator
const getStaffAvatar = (name = '', id = '') => {
  if (AVATAR_MAP[name]) return AVATAR_MAP[name];
  const key = String(id || name || '');
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = key.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_LIST[Math.abs(hash) % AVATAR_LIST.length];
};

// Format currency to standard Vietnamese Dong (normalize if legacy seed had thousands)
export const formatVND = (num) => {
  if (num === null || num === undefined || isNaN(num)) return '—';
  let val = Number(num);
  // Auto-detect and normalize if amount is represented in thousands (e.g. 5600 -> 5,600,000 VND)
  if (val > 0 && val < 100000) {
    val = val * 1000;
  }
  return new Intl.NumberFormat('vi-VN').format(Math.round(val)) + 'đ';
};

// Format nice period label
const formatPeriodLabel = (startDate, endDate) => {
  if (!startDate || !endDate) return 'Chọn kỳ lương';
  try {
    const [sy, sm, sd] = startDate.split('-');
    const [ey, em, ed] = endDate.split('-');
    return `Tháng ${sm}/${sy} (${sd}/${sm} – ${ed}/${em}/${ey})`;
  } catch (e) {
    return `${startDate} – ${endDate}`;
  }
};

export default function PayrollPage() {
  const [stores, setStores] = useState([]);
  const [storeId, setStoreId] = useState(() => localStorage.getItem('selectedStoreId') || '');
  const [periods, setPeriods] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [selectedStaff, setSelectedStaff] = useState('ALL');
  const [staffData, setStaffData] = useState([]);
  const [employmentMap, setEmploymentMap] = useState({});
  const [baseHourlyRate, setBaseHourlyRate] = useState(23000);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showNewPeriodModal, setShowNewPeriodModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPeriodDropdown, setShowPeriodDropdown] = useState(false);
  const [targetMonth, setTargetMonth] = useState('2026-09');

  // Load stores on mount and sync with selectedStoreId
  useEffect(() => {
    getAllStores()
      .then(({ data }) => {
        const list = data.content || data || [];
        setStores(list);
        const currentSaved = localStorage.getItem('selectedStoreId');
        if (currentSaved && list.some((s) => String(s.id) === String(currentSaved))) {
          setStoreId(currentSaved);
        } else if (list[0]) {
          setStoreId(list[0].id);
          localStorage.setItem('selectedStoreId', list[0].id);
        }
      })
      .catch(() => {
        setStores([]);
      });
  }, []);

  // Listen to store changes from Header store selector
  useEffect(() => {
    const handleStoreChange = (e) => {
      const newId = e.detail?.storeId;
      if (newId && newId !== storeId) {
        setStoreId(newId);
      }
    };
    window.addEventListener('storeChanged', handleStoreChange);
    return () => window.removeEventListener('storeChanged', handleStoreChange);
  }, [storeId]);

  // Load employments for the store to map real contract types, roles, and rates
  useEffect(() => {
    if (!storeId) return;
    getStaffByStore(storeId, 0, 100)
      .then(({ data }) => {
        const empList = data.content || data || [];
        const map = {};
        empList.forEach((emp) => {
          let rawRate = Number(emp.hourlyRate || 0);
          if (rawRate > 0 && rawRate < 1000) rawRate *= 1000;
          const roleTitle =
            emp.systemRole === 'MANAGER'
              ? 'Quản lý cửa hàng'
              : emp.contractType?.name || 'Nhân viên';

          map[emp.staffId] = {
            contractType: emp.contractType?.name || '',
            hourlyRate: rawRate || null,
            systemRole: emp.systemRole,
            roleTitle,
          };
        });
        setEmploymentMap(map);
      })
      .catch(() => {
        setEmploymentMap({});
      });
  }, [storeId]);

  // Load periods from API when store changes
  const fetchPeriods = (selectFirst = true) => {
    if (!storeId) return;
    getPayrollPeriods(storeId)
      .then(({ data }) => {
        if (data && Array.isArray(data) && data.length > 0) {
          const mapped = data.map((p) => ({
            id: p.id,
            label: formatPeriodLabel(p.startDate, p.endDate),
            startDate: p.startDate,
            endDate: p.endDate,
            status: p.status,
          }));
          setPeriods(mapped);
          if (selectFirst || !selectedPeriod) {
            setSelectedPeriod(mapped[0]);
          } else {
            const matched = mapped.find((p) => p.id === selectedPeriod.id);
            setSelectedPeriod(matched || mapped[0]);
          }
        } else {
          setPeriods([]);
          setSelectedPeriod(null);
          setStaffData([]);
        }
      })
      .catch(() => {
        setPeriods([]);
        setSelectedPeriod(null);
        setStaffData([]);
      });
  };

  useEffect(() => {
    fetchPeriods(true);
  }, [storeId]);

  // Fetch payslips for selected period
  useEffect(() => {
    if (!storeId || !selectedPeriod?.id) {
      setStaffData([]);
      return;
    }
    getPayslips(storeId, selectedPeriod.id)
      .then(({ data }) => {
        if (data && Array.isArray(data) && data.length > 0) {
          const mapped = data.map((ps, idx) => {
            const totalHours = Number(ps.totalHours || 0);
            const otHours = Number(ps.otHours || 0);
            const holidayHours = Number(ps.holidayHours || 0);
            const stdHours = Math.max(
              0,
              Math.round((totalHours - otHours - holidayHours) * 100) / 100
            );

            let baseSalary = Number(ps.baseAmount || 0);
            if (baseSalary > 0 && baseSalary < 100000) baseSalary *= 1000;

            let otSalary = Number(ps.otAmount || 0);
            if (otSalary > 0 && otSalary < 100000) otSalary *= 1000;

            let bonus = Number(ps.holidayAmount || 0);
            if (bonus > 0 && bonus < 100000) bonus *= 1000;

            let totalSalary = Number(ps.totalAmount || baseSalary + otSalary + bonus);
            if (totalSalary > 0 && totalSalary < 100000) totalSalary *= 1000;

            const empInfo = employmentMap[ps.staffId];
            // Do not show Managers or Admins in hourly staff payroll
            const isManager =
              empInfo?.systemRole === 'MANAGER' ||
              empInfo?.systemRole === 'ADMIN' ||
              ps.role === 'MANAGER' ||
              ps.role === 'ADMIN' ||
              ps.staffName?.toLowerCase().includes('manager') ||
              ps.staffName?.toLowerCase().includes('admin');
            if (isManager) return null;

            const role = empInfo?.contractType || 'Full-Time';
            const hRate =
              empInfo?.hourlyRate ||
              (baseSalary && stdHours > 0
                ? Math.round(baseSalary / stdHours)
                : baseHourlyRate);

            return {
              id: ps.id || `ps-${idx}`,
              staffId: ps.staffId,
              name: ps.staffName || `Nhân viên #${idx + 1}`,
              role,
              hours: stdHours,
              otHours,
              holidayHours,
              totalHours,
              baseSalary,
              otSalary,
              bonus,
              allowance: 0,
              deduction: 0,
              totalSalary,
              hourlyRate: hRate,
            };
          }).filter(Boolean);
          setStaffData(mapped);
        } else {
          setStaffData([]);
        }
      })
      .catch(() => {
        setStaffData([]);
      });
  }, [storeId, selectedPeriod, baseHourlyRate, employmentMap]);

  // Handle Calculate / Generate Payroll for selected month
  const handleGeneratePayrollForMonth = async (monthStr) => {
    if (!storeId) return;
    setIsGenerating(true);
    try {
      const [yStr, mStr] = (monthStr || targetMonth).split('-');
      const year = parseInt(yStr, 10);
      const month = parseInt(mStr, 10);
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

      await generatePayroll(storeId, { startDate, endDate });
      const { data } = await getPayrollPeriods(storeId);
      if (data && data.length > 0) {
        const mapped = data.map((p) => ({
          id: p.id,
          label: formatPeriodLabel(p.startDate, p.endDate),
          startDate: p.startDate,
          endDate: p.endDate,
          status: p.status,
        }));
        setPeriods(mapped);
        const newlyCreated = mapped.find(
          (p) => p.startDate === startDate && p.endDate === endDate
        );
        setSelectedPeriod(newlyCreated || mapped[0]);
      }
      setShowNewPeriodModal(false);
      toast.success('Đã khởi tạo và tính toán kỳ lương thành công!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi tính toán bảng lương.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Update period status (DRAFT -> CONFIRMED -> PAID)
  const handleUpdatePeriodStatus = async (newStatus) => {
    if (!storeId || !selectedPeriod?.id) return;
    try {
      await updatePayrollStatus(storeId, selectedPeriod.id, newStatus);
      setSelectedPeriod((prev) => ({ ...prev, status: newStatus }));
      setPeriods((prev) =>
        prev.map((p) => (p.id === selectedPeriod.id ? { ...p, status: newStatus } : p))
      );
      toast.success(`Đã cập nhật trạng thái kỳ lương thành ${newStatus}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể cập nhật trạng thái kỳ lương.');
    }
  };

  // Direct rows from backend DTO
  const computedRows = useMemo(() => {
    return staffData.map((emp) => ({
      ...emp,
      rate: emp.hourlyRate || baseHourlyRate,
    }));
  }, [staffData, baseHourlyRate]);

  // Filter rows based on selected staff in sidebar
  const visibleRows = useMemo(() => {
    if (selectedStaff === 'ALL') return computedRows;
    return computedRows.filter(
      (r) => r.name.trim() === selectedStaff.trim() || r.id === selectedStaff
    );
  }, [computedRows, selectedStaff]);

  // Calculate totals directly from server amounts
  const totals = useMemo(() => {
    return visibleRows.reduce(
      (acc, r) => {
        acc.hours += r.hours;
        acc.otHours += r.otHours;
        acc.totalHours += r.totalHours;
        acc.baseSalary += r.baseSalary || 0;
        acc.otSalary += r.otSalary || 0;
        acc.bonus += r.bonus || 0;
        acc.totalSalary += r.totalSalary || 0;
        return acc;
      },
      {
        hours: 0,
        otHours: 0,
        totalHours: 0,
        baseSalary: 0,
        otSalary: 0,
        bonus: 0,
        totalSalary: 0,
      }
    );
  }, [visibleRows]);

  // Handle Export Excel Action
  const handleDownloadExcel = async () => {
    setIsExporting(true);
    try {
      if (storeId && selectedPeriod?.id && selectedPeriod.id.length > 10) {
        const { data } = await exportPayrollExcel(storeId, selectedPeriod.id);
        const blob = new Blob([data], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Bang_Luong_${selectedPeriod.startDate}_${selectedPeriod.endDate}.xlsx`;
        link.click();
        URL.revokeObjectURL(url);
      } else {
        handleDownloadCsv();
        return;
      }

      // If DRAFT, auto confirm
      if (selectedPeriod?.status === 'DRAFT' && storeId) {
        try {
          await updatePayrollStatus(storeId, selectedPeriod.id, 'CONFIRMED');
          setSelectedPeriod((p) => ({ ...p, status: 'CONFIRMED' }));
        } catch (e) {
          // ignore
        }
      }
    } catch (err) {
      toast.error('Không thể tải file excel: ' + (err.message || 'Lỗi mạng'));
    } finally {
      setIsExporting(false);
      setShowExportModal(false);
    }
  };

  // Handle Export CSV Action
  const handleDownloadCsv = async () => {
    let csvContent =
      '\uFEFFNhân viên,Loại hợp đồng,Giờ làm,Tăng ca,Tổng giờ làm,Lương cơ bản,Lương OT,Thưởng,Tổng lương (VNĐ)\n';
    visibleRows.forEach((r) => {
      csvContent += `"${r.name}","${r.role}",${r.hours}h,${r.otHours}h,${r.totalHours}h,${r.baseSalary},${r.otSalary},${r.bonus},${r.totalSalary}\n`;
    });
    csvContent += `"Tổng cộng:","",${totals.hours}h,${totals.otHours}h,${totals.totalHours}h,${totals.baseSalary},${totals.otSalary},${totals.bonus},${totals.totalSalary}\n`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Bang_Luong_${selectedPeriod?.startDate || 'Period'}_${selectedPeriod?.endDate || ''}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    if (selectedPeriod?.status === 'DRAFT' && storeId) {
      try {
        await updatePayrollStatus(storeId, selectedPeriod.id, 'CONFIRMED');
        setSelectedPeriod((p) => ({ ...p, status: 'CONFIRMED' }));
      } catch (e) {
        // ignore
      }
    }
    setShowExportModal(false);
  };

  const currentStore = stores.find((s) => String(s.id) === String(storeId));

  return (
    <div className="pay-container">
      {/* ═══ LEFT SIDEBAR ═══ */}
      <aside className="pay-sidebar">
        {/* Active Store Indicator */}
        <div className="pay-store-badge">
          <span className="pay-store-dot" />
          <span className="pay-store-name">
            {currentStore ? currentStore.name : 'ShiftSync Store'}
          </span>
        </div>

        {/* Period Selector Dropdown */}
        <div className="pay-period-select-wrap">
          <div className="pay-period-header-row">
            <span className="pay-section-label">KỲ LƯƠNG</span>
            <button
              type="button"
              className="pay-add-period-btn"
              title="Tính toán kỳ lương mới"
              onClick={() => setShowNewPeriodModal(true)}
            >
              + Kỳ mới
            </button>
          </div>
          <button
            type="button"
            className="pay-period-btn"
            onClick={() => setShowPeriodDropdown(!showPeriodDropdown)}
          >
            <span className="pay-period-label-text">
              {selectedPeriod?.label ||
                (periods.length === 0 ? 'Chưa có kỳ lương' : 'Chọn kỳ lương')}
            </span>
            <span className="pay-arrow">▾</span>
          </button>

          {showPeriodDropdown && (
            <div className="pay-period-dropdown">
              {periods.length === 0 ? (
                <div className="pay-period-empty">
                  Chưa có kỳ lương nào được tạo.
                </div>
              ) : (
                periods.map((p) => (
                  <div
                    key={p.id}
                    className={`pay-period-item ${selectedPeriod?.id === p.id ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedPeriod(p);
                      setShowPeriodDropdown(false);
                    }}
                  >
                    <span>{p.label}</span>
                    <span className={`pay-status-pill ${p.status?.toLowerCase()}`}>
                      {p.status === 'PAID'
                        ? 'Đã thanh toán'
                        : p.status === 'CONFIRMED'
                          ? 'Đã chốt'
                          : 'Bản nháp'}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Action Buttons for Current Period */}
        <div className="pay-period-action-wrap">
          <div className="pay-status-meta">
            TRẠNG THÁI:{' '}
            <strong
              className={`pay-meta-tag ${selectedPeriod?.status?.toLowerCase() || 'draft'}`}
            >
              {selectedPeriod?.status === 'PAID'
                ? 'ĐÃ THANH TOÁN'
                : selectedPeriod?.status === 'CONFIRMED'
                  ? 'ĐÃ CHỐT'
                  : 'BẢN NHÁP'}
            </strong>
          </div>

          {periods.length === 0 ? (
            <button
              type="button"
              className="pay-close-period-btn ss-btn-elevated"
              onClick={() => setShowNewPeriodModal(true)}
              disabled={isGenerating}
            >
              {isGenerating ? 'ĐANG TÍNH...' : '+ TẠO KỲ LƯƠNG ĐẦU TIÊN'}
            </button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                type="button"
                className={`pay-close-period-btn ss-btn-elevated ${
                  selectedPeriod?.status === 'CONFIRMED' ||
                  selectedPeriod?.status === 'PAID'
                    ? 'confirmed'
                    : ''
                }`}
                onClick={() => setShowExportModal(true)}
              >
                XUẤT BẢNG LƯƠNG
              </button>

              {selectedPeriod?.status === 'DRAFT' && (
                <>
                  <button
                    type="button"
                    className="pay-close-period-btn ss-btn-elevated"
                    style={{ background: '#2563EB', color: '#FFFFFF', borderColor: '#1D4ED8' }}
                    onClick={() => handleUpdatePeriodStatus('CONFIRMED')}
                  >
                    ✓ CHỐT BẢNG LƯƠNG
                  </button>
                  <button
                    type="button"
                    className="pay-close-period-btn ss-btn-elevated"
                    style={{ background: '#F3F4F6', color: '#374151', borderColor: '#D1D5DB', fontSize: '12px' }}
                    onClick={() =>
                      handleGeneratePayrollForMonth(
                        selectedPeriod.startDate.substring(0, 7)
                      )
                    }
                    disabled={isGenerating}
                  >
                    {isGenerating ? 'ĐANG TÍNH...' : '🔄 TÍNH LẠI KỲ NÀY'}
                  </button>
                </>
              )}

              {selectedPeriod?.status === 'CONFIRMED' && (
                <button
                  type="button"
                  className="pay-close-period-btn ss-btn-elevated"
                  style={{ background: '#16A34A', color: '#FFFFFF', borderColor: '#15803D' }}
                  onClick={() => handleUpdatePeriodStatus('PAID')}
                >
                  ✓ ĐÃ THANH TOÁN
                </button>
              )}
            </div>
          )}
        </div>

        {/* Manager Hourly Rate Setup Box */}
        <div className="pay-rate-config-box ss-card-25d">
          <div className="pay-rate-header">
            <span>Thiết lập lương/giờ</span>
            <span className="pay-rate-tag">Tiêu chuẩn</span>
          </div>
          <div className="pay-rate-input-wrap">
            <input
              type="number"
              className="pay-rate-input"
              value={baseHourlyRate}
              step={1000}
              onChange={(e) => setBaseHourlyRate(Number(e.target.value) || 0)}
            />
            <span className="pay-rate-currency">đ/giờ</span>
          </div>
          <div style={{ fontSize: '11px', color: '#71717A', marginTop: '2px' }}>
            Mức lương cơ bản áp dụng khi chưa gán hợp đồng riêng
          </div>
        </div>

        {/* Staff Filter List */}
        <div className="pay-staff-filter-card ss-card-25d">
          <div
            className={`pay-staff-header-row ${selectedStaff === 'ALL' ? 'active' : ''}`}
            onClick={() => setSelectedStaff('ALL')}
          >
            <span className="pay-staff-all-text">Tất cả ({computedRows.length})</span>
            <span className="pay-staff-all-arrow">▲</span>
          </div>

          <div className="pay-staff-list">
            {computedRows.map((emp) => {
              const isSelected = selectedStaff === emp.name || selectedStaff === emp.id;
              const avatarSrc = getStaffAvatar(emp.name, emp.staffId || emp.id);
              return (
                <div
                  key={emp.id}
                  className={`pay-staff-item ${isSelected ? 'active' : ''}`}
                  onClick={() => setSelectedStaff(emp.name)}
                >
                  <img src={avatarSrc} alt={emp.name} className="pay-staff-avatar" />
                  <div className="pay-staff-info">
                    <div className="pay-staff-name">{emp.name}</div>
                    <div className="pay-staff-role">{emp.role}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </aside>

      {/* ═══ MAIN CONTENT AREA (Payroll Table) ═══ */}
      <main className="pay-main">
        <div className="pay-table-card ss-card-25d">
          <table className="pay-table">
            <thead>
              <tr>
                <th className="th-staff">Nhân viên</th>
                <th className="th-hours">Giờ làm</th>
                <th className="th-ot">Tăng ca</th>
                <th className="th-total-hours">Tổng giờ</th>
                <th className="th-base">Lương cơ bản</th>
                <th className="th-ot-amount">Lương OT</th>
                <th className="th-bonus">Thưởng / Lễ</th>
                <th className="th-total-salary">Tổng lương</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => {
                const avatarSrc = getStaffAvatar(row.name, row.staffId || row.id);
                return (
                  <tr key={row.id}>
                    <td className="td-staff">
                      <div className="pay-cell-staff">
                        <img src={avatarSrc} alt={row.name} className="pay-table-avatar" />
                        <div>
                          <div className="pay-table-name">{row.name}</div>
                          <div className="pay-table-role">{row.role}</div>
                        </div>
                      </div>
                    </td>
                    <td className="td-hours">{row.hours.toFixed(1)}h</td>
                    <td className="td-ot">{row.otHours ? `${row.otHours.toFixed(1)}h` : '-'}</td>
                    <td className="td-total-hours">{row.totalHours.toFixed(1)}h</td>
                    <td className="td-base">{formatVND(row.baseSalary)}</td>
                    <td className="td-ot-amount">
                      {row.otSalary ? formatVND(row.otSalary) : '-'}
                    </td>
                    <td className="td-bonus">
                      {row.bonus ? formatVND(row.bonus) : '-'}
                    </td>
                    <td className="td-total-salary">
                      <strong>{formatVND(row.totalSalary)}</strong>
                    </td>
                  </tr>
                );
              })}

              {visibleRows.length === 0 && (
                <tr>
                  <td colSpan="8" className="pay-empty-row">
                    Không tìm thấy dữ liệu bảng lương cho kỳ này.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="pay-total-row">
                <td className="td-total-label">Tổng cộng ({visibleRows.length} NV):</td>
                <td className="td-hours">{totals.hours.toFixed(1)}h</td>
                <td className="td-ot">{totals.otHours ? `${totals.otHours.toFixed(1)}h` : '0h'}</td>
                <td className="td-total-hours">{totals.totalHours.toFixed(1)}h</td>
                <td className="td-base">{formatVND(totals.baseSalary)}</td>
                <td className="td-ot-amount">{formatVND(totals.otSalary)}</td>
                <td className="td-bonus">{totals.bonus ? formatVND(totals.bonus) : '0đ'}</td>
                <td className="td-total-salary">
                  <strong>{formatVND(totals.totalSalary)}</strong>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </main>

      {/* ═══ MODAL: TẠO / TÍNH KỲ LƯƠNG MỚI ═══ */}
      {showNewPeriodModal && (
        <div
          className="pay-modal-backdrop"
          onClick={() => setShowNewPeriodModal(false)}
        >
          <div
            className="pay-new-period-dialog ss-card-25d"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pay-new-period-header">
              <h3 style={{ margin: 0, fontSize: '18px', color: '#18181B' }}>
                Tính toán kỳ lương mới
              </h3>
              <button
                type="button"
                className="pay-modal-close"
                onClick={() => setShowNewPeriodModal(false)}
              >
                ✕
              </button>
            </div>
            <p style={{ fontSize: '13px', color: '#71717A', margin: '8px 0 16px' }}>
              Hệ thống sẽ tự động quét toàn bộ ca làm việc (shifts) và bản chấm công (attendances) trong tháng được chọn để tính lương, giờ làm và tăng ca cho nhân viên.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#3F3F46' }}>
                Chọn tháng tính lương:
              </label>
              <input
                type="month"
                className="pay-month-picker"
                value={targetMonth}
                onChange={(e) => setTargetMonth(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="pay-modal-btn-cancel"
                onClick={() => setShowNewPeriodModal(false)}
              >
                Hủy
              </button>
              <button
                type="button"
                className="pay-modal-btn-primary"
                onClick={() => handleGeneratePayrollForMonth(targetMonth)}
                disabled={isGenerating}
              >
                {isGenerating ? 'Đang tính toán...' : 'Bắt đầu tính lương'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ EXPORT PAYROLL MODAL ═══ */}
      {showExportModal && (
        <div
          className="pay-modal-backdrop"
          onClick={() => setShowExportModal(false)}
        >
          <div
            className="pay-export-dialog ss-card-25d"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pay-export-grid">
              {/* Left Column: Illustration luong.png */}
              <div className="pay-export-left">
                <img
                  src={luongIllustration}
                  alt="Xuất bảng lương"
                  className="pay-export-illustration"
                />
              </div>

              {/* Center Green Divider */}
              <div className="pay-export-divider" />

              {/* Right Column: Export Actions & Warning Box */}
              <div className="pay-export-right">
                <div className="pay-export-header">
                  <h2 className="pay-export-title">Xuất bảng lương</h2>
                  <button
                    type="button"
                    className="pay-modal-close"
                    onClick={() => setShowExportModal(false)}
                  >
                    ✕
                  </button>
                </div>

                <div className="pay-export-summary">
                  <div>
                    Kỳ lương: <strong>{selectedPeriod?.label}</strong>
                  </div>
                  <div>
                    Số lượng nhân sự: <strong>{visibleRows.length} nhân viên</strong>
                  </div>
                  <div>
                    Tổng chi lương:{' '}
                    <strong style={{ color: '#15803D' }}>
                      {formatVND(totals.totalSalary)}
                    </strong>
                  </div>
                </div>

                {/* Big Download Card */}
                <div className="pay-download-card">
                  <div className="pay-download-icon-wrap">
                    <svg
                      width="48"
                      height="54"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#51A33D"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <line x1="16" y1="13" x2="8" y2="13"></line>
                      <line x1="16" y1="17" x2="8" y2="17"></line>
                      <polyline points="10 9 9 9 8 9"></polyline>
                    </svg>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', width: '100%', justifyContent: 'center' }}>
                    <button
                      type="button"
                      className="pay-download-btn"
                      onClick={handleDownloadExcel}
                      disabled={isExporting}
                    >
                      {isExporting ? 'Đang xuất...' : 'Tải Excel (.xlsx)'}
                    </button>
                    <button
                      type="button"
                      className="pay-download-btn"
                      style={{ background: '#0284C7', borderColor: '#0369A1' }}
                      onClick={handleDownloadCsv}
                    >
                      Tải CSV (.csv)
                    </button>
                  </div>
                </div>

                {/* Yellow Warning Card */}
                <div className="pay-warning-card">
                  <h3 className="pay-warning-title">
                    Xác nhận chốt và xuất bảng lương
                  </h3>
                  <p className="pay-warning-desc">
                    File bảng lương sẽ được tải về máy của bạn. Nếu kỳ lương đang ở
                    trạng thái Bản nháp, hệ thống sẽ tự động chuyển sang Đã chốt
                    (Confirmed).
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
