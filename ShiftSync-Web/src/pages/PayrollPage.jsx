import { useEffect, useMemo, useState } from 'react';
import { getAllStores } from '../services/storeService';
import {
  exportPayrollExcel,
  generatePayroll,
  getPayrollPeriods,
  getPayslips,
  updatePayrollStatus,
} from '../services/payrollService';
import './PayrollPage.css';

// Illustrations & Avatars
import luongIllustration from '../assets/illustrations/luong.png';
import avatarDilan from '../assets/avatars/avatar-dilan-jon.png';
import avatarMew from '../assets/avatars/avatar-mew-ama.png';
import avatarThia from '../assets/avatars/avatar-thia-ago.png';
import avatarPaul from '../assets/avatars/avatar-paul-lee.png';

const AVATAR_MAP = {
  'Dilan. Jon': avatarDilan,
  'Dilan . Jon': avatarDilan,
  'Mew. Ama': avatarMew,
  'Thia. Ago': avatarThia,
  'Paul. Lee': avatarPaul,
};

const DEFAULT_STAFF_LIST = [
  {
    id: 'emp-1',
    name: 'Dilan. Jon',
    role: 'Barista',
    hours: 180,
    otHours: 10,
    totalHours: 190,
    bonus: 0,
    allowance: 150000,
    deduction: 0,
    hourlyRate: 26000,
  },
  {
    id: 'emp-2',
    name: 'Mew. Ama',
    role: 'Barista',
    hours: 175,
    otHours: 0,
    totalHours: 175,
    bonus: 0,
    allowance: 150000,
    deduction: 150000,
    hourlyRate: 26000,
  },
  {
    id: 'emp-3',
    name: 'Thia. Ago',
    role: 'Cashier',
    hours: 160,
    otHours: 12,
    totalHours: 172,
    bonus: 0,
    allowance: 150000,
    deduction: 0,
    hourlyRate: 26000,
  },
  {
    id: 'emp-4',
    name: 'Paul. Lee',
    role: 'Cashier',
    hours: 168,
    otHours: 0,
    totalHours: 168,
    bonus: 0,
    allowance: 150000,
    deduction: 150000,
    hourlyRate: 26000,
  },
  {
    id: 'emp-5',
    name: 'Thia. Ago',
    role: 'Parking Staff',
    hours: 120,
    otHours: 8,
    totalHours: 128,
    bonus: 0,
    allowance: 100000,
    deduction: 0,
    hourlyRate: 24000,
  },
  {
    id: 'emp-6',
    name: 'Mew. Ama',
    role: 'Server',
    hours: 110,
    otHours: 0,
    totalHours: 110,
    bonus: 0,
    allowance: 100000,
    deduction: 0,
    hourlyRate: 24000,
  },
];

const PRESET_PERIODS = [
  { id: 'p-2026-07', label: '01-31 tháng 7 năm 2026', startDate: '2026-07-01', endDate: '2026-07-31', status: 'CONFIRMED' },
  { id: 'p-2026-08', label: '01-31 tháng 8 năm 2026', startDate: '2026-08-01', endDate: '2026-08-31', status: 'DRAFT' },
  { id: 'p-2026-06', label: '01-30 tháng 6 năm 2026', startDate: '2026-06-01', endDate: '2026-06-30', status: 'PAID' },
  { id: 'p-2026-05', label: '01-31 tháng 5 năm 2026', startDate: '2026-05-01', endDate: '2026-05-31', status: 'PAID' },
  { id: 'p-2026-04', label: '01-30 tháng 4 năm 2026', startDate: '2026-04-01', endDate: '2026-04-30', status: 'PAID' },
];

const formatVND = (num) => {
  if (!num && num !== 0) return '—';
  return new Intl.NumberFormat('vi-VN').format(num) + 'đ';
};

export default function PayrollPage() {
  const [stores, setStores] = useState([]);
  const [storeId, setStoreId] = useState('');
  const [periods, setPeriods] = useState(PRESET_PERIODS);
  const [selectedPeriod, setSelectedPeriod] = useState(PRESET_PERIODS[0]);
  const [selectedStaff, setSelectedStaff] = useState('ALL');
  const [staffData, setStaffData] = useState(DEFAULT_STAFF_LIST);
  const [baseHourlyRate, setBaseHourlyRate] = useState(26000);
  const [showExportModal, setShowExportModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showPeriodDropdown, setShowPeriodDropdown] = useState(false);

  // Load stores on mount
  useEffect(() => {
    getAllStores()
      .then(({ data }) => {
        const list = data.content || data || [];
        setStores(list);
        if (list[0]) setStoreId(list[0].id);
      })
      .catch(() => {
        setStores([{ id: 'default-store', name: 'Highlands Coffee - Chi nhánh Tân Phú' }]);
        setStoreId('default-store');
      });
  }, []);

  // Load periods and payslips from API when store changes
  useEffect(() => {
    if (!storeId) return;
    getPayrollPeriods(storeId)
      .then(({ data }) => {
        if (data && data.length > 0) {
          const mapped = data.map((p) => ({
            id: p.id,
            label: `${p.startDate} – ${p.endDate}`,
            startDate: p.startDate,
            endDate: p.endDate,
            status: p.status,
          }));
          setPeriods(mapped);
          setSelectedPeriod(mapped[0]);
        }
      })
      .catch(() => {
        // use preset periods
      });
  }, [storeId]);

  // Try fetching API payslips or compute from attendance
  useEffect(() => {
    if (!storeId || !selectedPeriod?.id) return;
    getPayslips(storeId, selectedPeriod.id)
      .then(({ data }) => {
        if (data && data.length > 0) {
          const mapped = data.map((ps, idx) => {
            const hRate = ps.baseAmount && ps.totalHours ? Math.round(Number(ps.baseAmount) / Number(ps.totalHours)) : baseHourlyRate;
            return {
              id: ps.id || `ps-${idx}`,
              name: ps.staffName || `Nhân viên #${idx + 1}`,
              role: 'Barista',
              hours: Number(ps.totalHours || 0) - Number(ps.otHours || 0),
              otHours: Number(ps.otHours || 0),
              totalHours: Number(ps.totalHours || 0),
              bonus: Number(ps.holidayAmount || 0),
              allowance: 150000,
              deduction: 0,
              hourlyRate: hRate || baseHourlyRate,
            };
          });
          setStaffData(mapped);
        }
      })
      .catch(() => {
        // Fallback to default staff calculation
      });
  }, [storeId, selectedPeriod, baseHourlyRate]);

  // Compute calculated salary rows based on hourly rate
  const computedRows = useMemo(() => {
    return staffData.map((emp) => {
      const rate = emp.hourlyRate || baseHourlyRate;
      const baseSalary = emp.hours * rate;
      const otSalary = emp.otHours * rate * 1.5;
      const bonus = emp.bonus || 0;
      const allowance = emp.allowance || 0;
      const deduction = emp.deduction || 0;
      const totalSalary = baseSalary + otSalary + bonus + allowance - deduction;

      return {
        ...emp,
        rate,
        baseSalary,
        otSalary,
        totalSalary,
      };
    });
  }, [staffData, baseHourlyRate]);

  // Filter rows based on selected staff in sidebar
  const visibleRows = useMemo(() => {
    if (selectedStaff === 'ALL') return computedRows;
    return computedRows.filter((r) => r.name.trim() === selectedStaff.trim() || r.id === selectedStaff);
  }, [computedRows, selectedStaff]);

  // Calculate totals
  const totals = useMemo(() => {
    return visibleRows.reduce(
      (acc, r) => {
        acc.hours += r.hours;
        acc.otHours += r.otHours;
        acc.totalHours += r.totalHours;
        acc.bonus += r.bonus || 0;
        acc.allowance += r.allowance || 0;
        acc.deduction += r.deduction || 0;
        acc.totalSalary += r.totalSalary;
        return acc;
      },
      {
        hours: 0,
        otHours: 0,
        totalHours: 0,
        bonus: 0,
        allowance: 0,
        deduction: 0,
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
        const url = URL.createObjectURL(data);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Bang_Luong_${selectedPeriod.startDate}_${selectedPeriod.endDate}.xlsx`;
        link.click();
        URL.revokeObjectURL(url);
      } else {
        // Generate and download client-side CSV / Excel
        let csvContent = '\uFEFFNhân viên,Chức vụ,Giờ làm,Tăng ca,Tổng giờ làm,Thưởng,Trợ cấp,Chi phí khác,Tổng lương (VNĐ)\n';
        computedRows.forEach((r) => {
          csvContent += `"${r.name}","${r.role}",${r.hours}h,${r.otHours}h,${r.totalHours}h,${r.bonus},${r.allowance},${r.deduction ? '-' + r.deduction : 0},${r.totalSalary}\n`;
        });
        csvContent += `"Tổng cộng:","",${totals.hours}h,${totals.otHours}h,${totals.totalHours}h,${totals.bonus},${totals.allowance},-${totals.deduction},${totals.totalSalary}\n`;

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Bang_Luong_${selectedPeriod?.label || 'Thang7_2026'}.csv`;
        link.click();
        URL.revokeObjectURL(url);
      }

      // If DRAFT, update status to CONFIRMED
      if (selectedPeriod?.status === 'DRAFT' && storeId) {
        try {
          await updatePayrollStatus(storeId, selectedPeriod.id, 'CONFIRMED');
          setSelectedPeriod((p) => ({ ...p, status: 'CONFIRMED' }));
        } catch (e) {
          // ignore
        }
      }
    } catch (err) {
      // Fallback CSV download
      const csvContent = '\uFEFF' + computedRows.map((r) => `${r.name},${r.role},${r.totalHours}h,${r.totalSalary}`).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'bang-luong.csv';
      link.click();
    } finally {
      setIsExporting(false);
      setShowExportModal(false);
    }
  };

  return (
    <div className="pay-container">
      {/* ═══ LEFT SIDEBAR ═══ */}
      <aside className="pay-sidebar">
        {/* Period Selector Dropdown */}
        <div className="pay-period-select-wrap">
          <button
            type="button"
            className="pay-period-btn"
            onClick={() => setShowPeriodDropdown(!showPeriodDropdown)}
          >
            <span>{selectedPeriod?.label || '01-31 tháng 7 năm 2026'}</span>
            <span className="pay-arrow">▾</span>
          </button>

          {showPeriodDropdown && (
            <div className="pay-period-dropdown">
              {periods.map((p) => (
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
                    {p.status === 'PAID' ? 'Đã thanh toán' : p.status === 'CONFIRMED' ? 'Đã chốt' : 'Bản nháp'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Close / Export Period Action Button */}
        <div className="pay-period-action-wrap">
          <span className="pay-close-period-label">CLOSE PERIOD</span>
          <button
            type="button"
            className={`pay-close-period-btn ${selectedPeriod?.status === 'CONFIRMED' ? 'confirmed' : ''}`}
            onClick={() => setShowExportModal(true)}
          >
            {selectedPeriod?.status === 'CONFIRMED' ? 'XUẤT BẢNG LƯƠNG' : 'CLOSE PERIOD'}
          </button>
        </div>

        {/* Manager Hourly Rate Setup Box */}
        <div className="pay-rate-config-box">
          <div className="pay-rate-header">
            <span>Thiết lập lương/giờ</span>
            <span className="pay-rate-tag">Mặc định</span>
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
        </div>

        {/* Staff Filter List */}
        <div className="pay-staff-filter-card">
          <div
            className={`pay-staff-header-row ${selectedStaff === 'ALL' ? 'active' : ''}`}
            onClick={() => setSelectedStaff('ALL')}
          >
            <span className="pay-staff-all-text">All</span>
            <span className="pay-staff-all-arrow">▲</span>
          </div>

          <div className="pay-staff-list">
            {computedRows.map((emp) => {
              const isSelected = selectedStaff === emp.name || selectedStaff === emp.id;
              const avatarSrc = AVATAR_MAP[emp.name] || AVATAR_MAP['Dilan. Jon'];
              return (
                <div
                  key={emp.id}
                  className={`pay-staff-item ${isSelected ? 'active' : ''}`}
                  onClick={() => setSelectedStaff(isSelected ? 'ALL' : emp.name)}
                >
                  <img src={avatarSrc} alt={emp.name} className="pay-staff-avatar" />
                  <div className="pay-staff-info">
                    <span className="pay-staff-name">{emp.name}</span>
                    <span className="pay-staff-role">{emp.role}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </aside>

      {/* ═══ MAIN CONTENT AREA (Payroll Table) ═══ */}
      <main className="pay-main">
        <div className="pay-table-card">
          <table className="pay-table">
            <thead>
              <tr>
                <th className="th-staff">Nhân viên</th>
                <th className="th-hours">Giờ làm</th>
                <th className="th-ot">Tăng ca</th>
                <th className="th-total-hours">Tổng giờ làm</th>
                <th className="th-bonus">Thưởng</th>
                <th className="th-allowance">Trợ cấp</th>
                <th className="th-other">Chi phí khác</th>
                <th className="th-total-salary">Tổng lương</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => {
                const avatarSrc = AVATAR_MAP[row.name] || AVATAR_MAP['Dilan. Jon'];
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
                    <td className="td-hours">{row.hours}h</td>
                    <td className="td-ot">{row.otHours ? `${row.otHours}h` : '-'}</td>
                    <td className="td-total-hours">{row.totalHours}h</td>
                    <td className="td-bonus">{row.bonus ? formatVND(row.bonus) : '-'}</td>
                    <td className="td-allowance">{row.allowance ? formatVND(row.allowance) : '-'}</td>
                    <td className="td-other">
                      {row.deduction ? (
                        <span className="pay-text-deduction">- {formatVND(row.deduction)}</span>
                      ) : (
                        ''
                      )}
                    </td>
                    <td className="td-total-salary">{formatVND(row.totalSalary)}</td>
                  </tr>
                );
              })}

              {visibleRows.length === 0 && (
                <tr>
                  <td colSpan="8" className="pay-empty-row">
                    Không tìm thấy dữ liệu nhân viên.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="pay-total-row">
                <td className="td-total-label">Tổng cộng:</td>
                <td className="td-hours">{totals.hours}h</td>
                <td className="td-ot">{totals.otHours ? `${totals.otHours}h` : '0h'}</td>
                <td className="td-total-hours">{totals.totalHours}h</td>
                <td className="td-bonus">{totals.bonus ? formatVND(totals.bonus) : '0đ'}</td>
                <td className="td-allowance">{formatVND(totals.allowance)}</td>
                <td className="td-other">
                  {totals.deduction ? (
                    <span className="pay-text-deduction">- {formatVND(totals.deduction)}</span>
                  ) : (
                    '0đ'
                  )}
                </td>
                <td className="td-total-salary">{formatVND(totals.totalSalary)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </main>

      {/* ═══ EXPORT PAYROLL MODAL (Chuẩn theo luongweb.docx & image4.png) ═══ */}
      {showExportModal && (
        <div className="pay-modal-backdrop" onClick={() => setShowExportModal(false)}>
          <div className="pay-export-dialog" onClick={(e) => e.stopPropagation()}>
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

                {/* Big Download Card */}
                <div className="pay-download-card">
                  <div className="pay-download-icon-wrap">
                    <svg
                      width="52"
                      height="60"
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
                  <button
                    type="button"
                    className="pay-download-btn"
                    onClick={handleDownloadExcel}
                    disabled={isExporting}
                  >
                    {isExporting ? 'Đang xuất file...' : 'Download Excel File'}
                  </button>
                </div>

                {/* Yellow Warning Card */}
                <div className="pay-warning-card">
                  <h3 className="pay-warning-title">Bạn có chắc xuất bảng lương không ?</h3>
                  <p className="pay-warning-desc">
                    Bạn có chắc chắn muốn xuất bảng lương này không? Sau khi xuất, dữ liệu sẽ được
                    chốt và gửi đi xử lý lương.
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
