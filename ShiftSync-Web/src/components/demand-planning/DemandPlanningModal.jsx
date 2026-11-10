import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useConfirmation } from '../../context/ConfirmationContext';
import DemandDailyView from './DemandDailyView';
import DemandWeeklyMatrixView from './DemandWeeklyMatrixView';
import headcountQuotaService from '../../services/headcountQuotaService';
import * as shiftService from '../../services/shiftService';
import './DemandPlanning.css';
import './DemandPlanningRedesign.css';
import './DemandPlanningViewport.css';

const replaceDailyQuotaCount = (data, quotaId, count) => ({
  ...data,
  shifts: (data.shifts || []).map(shift => ({
    ...shift,
    quotas: (shift.quotas || []).map(quota => String(quota.quotaId) === String(quotaId)
      ? {...quota, count, source: 'SAVED'}
      : quota),
  })),
});

const replaceWeeklyQuotaCount = (data, quotaId, count) => ({
  ...data,
  matrixRows: (data.matrixRows || []).map(row => ({
    ...row,
    cells: (row.cells || []).map(cell => String(cell.quotaId) === String(quotaId)
      ? {...cell, count, source: 'SAVED'}
      : cell),
  })),
});

export default function DemandPlanningModal({
  isOpen,
  onClose,
  storeId,
  initialDateIso,
  onSuccess,
}) {
  const confirm = useConfirmation();
  const overlayRef=useRef(null);
  const requestSequence = useRef(0);
  const activeScope = useRef(null);
  useEffect(()=>{
    if(!isOpen)return;
    const viewport=window.visualViewport;
    const resize=()=>overlayRef.current?.style.setProperty('--dp-viewport-height',`${Math.floor(viewport?.height||window.innerHeight)}px`);
    resize();
    window.addEventListener('resize',resize);
    viewport?.addEventListener('resize',resize);
    return()=>{window.removeEventListener('resize',resize);viewport?.removeEventListener('resize',resize);};
  },[isOpen]);
  const [viewMode, setViewMode] = useState('day'); // 'day' | 'week' | 'month'
  const [quotaSummary, setQuotaSummary] = useState(null);

  const userRole = (localStorage.getItem('userRole') || 'STAFF').toUpperCase();
  const isAdmin = userRole === 'ADMIN';

  // Branches & Store Selection
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState(storeId || localStorage.getItem('storeId') || '');

  // Date & Week Range
  const [selectedDateIso, setSelectedDateIso] = useState(
    () => initialDateIso || new Date().toISOString().slice(0, 10)
  );
  const [selectedWeekStartIso, setSelectedWeekStartIso] = useState(() => {
    const d = initialDateIso ? new Date(initialDateIso) : new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
    const monday = new Date(d.setDate(diff));
    return monday.toISOString().slice(0, 10);
  });

  // Data States
  const [dailyData, setDailyData] = useState(null);
  const [weeklyData, setWeeklyData] = useState(null);

  // Status States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [applyReview, setApplyReview] = useState(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  }, [isOpen]);

  const showToast = (msg, type = 'success') => {
    setToastMessage({ msg, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 1. Fetch Branches for Store Dropdown on mount
  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;
    const fetchBranches = async () => {
      try {
        const branchList = await headcountQuotaService.getBranches();
        if (mounted && branchList && branchList.length > 0) {
          setBranches(branchList);
          if (!isAdmin) {
            // Manager is locked to their store
            const currentStoreId = storeId || localStorage.getItem('storeId') || branchList[0].id;
            setSelectedBranchId(currentStoreId);
          } else if (!selectedBranchId) {
            setSelectedBranchId(branchList[0].id);
          }
        }
      } catch (err) {
        console.warn('Could not fetch branches from API:', err.message);
        if (mounted && branches.length === 0) {
          const fallbackStoreId = storeId || localStorage.getItem('storeId');
          if (fallbackStoreId) {
            setBranches([
              { id: fallbackStoreId, name: 'Current Store' },
            ]);
            setSelectedBranchId(fallbackStoreId);
          }
        }
      }
    };

    fetchBranches();
    return () => { mounted = false; };
  }, [isOpen, selectedBranchId, branches.length, isAdmin, storeId]);

  // 2. Fetch Daily or Weekly Quota Data when branch, mode, or date changes
  const fetchData = useCallback(async () => {
    if (!isOpen || !selectedBranchId) return;
    const scope = `${selectedBranchId}:${viewMode}:${selectedDateIso}:${selectedWeekStartIso}`;
    if (activeScope.current !== scope) return;
    const sequence = ++requestSequence.current;

    setLoading(true);
    setError(null);

    try {
      const summaryPromise = headcountQuotaService.getQuotaSummary(
        selectedBranchId,
        viewMode === 'day' ? selectedDateIso : undefined,
        viewMode === 'week' ? selectedWeekStartIso : undefined
      ).catch(err => {
        console.warn('Quota summary load error:', err);
        return null;
      });

      if (viewMode === 'day') {
        const [res, sumRes] = await Promise.all([
          headcountQuotaService.getDailyQuotas(selectedBranchId, selectedDateIso),
          summaryPromise
        ]);
        if (sequence === requestSequence.current) {
          setDailyData(res);
          if (sumRes) setQuotaSummary(sumRes);
        }
      } else {
        const [res, sumRes] = await Promise.all([
          headcountQuotaService.getWeeklyQuotas(selectedBranchId, selectedWeekStartIso),
          summaryPromise
        ]);
        if (sequence === requestSequence.current) {
          setWeeklyData(res);
          if (sumRes) setQuotaSummary(sumRes);
        }
      }
    } catch (err) {
      if (sequence !== requestSequence.current) return;
      console.error('Error fetching headcount quotas:', err);
      setError(
        err.response?.data?.message ||
        'Không thể tải dữ liệu định biên từ máy chủ. Vui lòng kiểm tra kết nối mạng và thử lại.'
      );
    } finally {
      if (sequence === requestSequence.current) setLoading(false);
    }
  }, [isOpen, selectedBranchId, viewMode, selectedDateIso, selectedWeekStartIso]);

  useEffect(() => {
    const sequenceAtSetup = requestSequence.current;
    activeScope.current = `${selectedBranchId}:${viewMode}:${selectedDateIso}:${selectedWeekStartIso}`;
    queueMicrotask(fetchData);
    return () => {
      activeScope.current = null;
      requestSequence.current = sequenceAtSetup + 1;
    };
  }, [fetchData, selectedBranchId, viewMode, selectedDateIso, selectedWeekStartIso]);

  // ── OPTIMISTIC UPDATE HANDLERS ──

  // A. Day View: Update Count (+/-)
  const handleDailyUpdateCount = async (quotaId, newCount, positionId, shiftType) => {
    if (!dailyData || saving) return;
    const previousData = dailyData;
    setDailyData(replaceDailyQuotaCount(previousData, quotaId, newCount));
    setSaving(true);
    try {
      await headcountQuotaService.updateQuota(quotaId, {branchId:selectedBranchId,date:selectedDateIso,shiftType,positionId,count:newCount});
    } catch (err) {
      setDailyData(previousData);
      showToast(err.response?.data?.message || 'Không thể lưu nhu cầu. Số liệu chưa thay đổi.', 'error');
    } finally { setSaving(false); }
  };

  // B. Weekly View: Update Cell (+/-)
  const handleWeeklyUpdateCell = async (quotaId, delta, currentCount, positionId, date, shiftType) => {
    if (!weeklyData || saving) return;
    const newCount = Math.max(0, currentCount + delta);
    const previousData = weeklyData;
    setWeeklyData(replaceWeeklyQuotaCount(previousData, quotaId, newCount));
    setSaving(true);
    try {
      await headcountQuotaService.updateQuota(quotaId, {branchId:selectedBranchId,date,shiftType,positionId,count:newCount});
    } catch (err) {
      setWeeklyData(previousData);
      showToast(err.response?.data?.message || 'Không thể lưu nhu cầu. Số liệu chưa thay đổi.', 'error');
    } finally { setSaving(false); }
  };

  // C. Update Norms (Min / Target / Max inline)
  const handleUpdateNorm = async (positionId, min, target, max) => {
    if (saving) return false;
    if (![min,target,max].every(n=>Number.isInteger(n)&&n>=0)||min>target||target>max) {
      showToast('Tối thiểu ≤ mục tiêu ≤ tối đa; các giá trị phải là số nguyên không âm.', 'error');
      return false;
    }
    setSaving(true);
    try {
      await headcountQuotaService.updateQuota(`norm_${positionId}`, {branchId:selectedBranchId,positionId,min,target,max});
      showToast('Đã lưu quy chuẩn.');
      await fetchData();
      return true;
    } catch (err) {
      showToast(err.response?.data?.message || 'Không thể lưu quy chuẩn.', 'error');
      return false;
    } finally { setSaving(false); }
  };

  // ── ACTION HANDLERS ──

  // Create Custom Shift on selected date
  const handleCreateCustomShift = async ({ startTime, endTime, name }) => {
    if (saving || !selectedBranchId) return false;
    setSaving(true);
    try {
      await shiftService.createShift(selectedBranchId, {
        shiftDate: selectedDateIso,
        startTime: startTime.length === 5 ? `${startTime}:00` : startTime,
        endTime: endTime.length === 5 ? `${endTime}:00` : endTime,
        note: name || 'Ca tùy chỉnh',
      });
      showToast('Đã tạo ca làm việc mới!');
      await fetchData();
      return true;
    } catch (err) {
      showToast(err.response?.data?.message || 'Không thể tạo ca làm việc mới.', 'error');
      return false;
    } finally {
      setSaving(false);
    }
  };

  // Delete Custom Shift
  const handleDeleteCustomShift = async (shiftId) => {
    if (saving || !selectedBranchId || !shiftId) return false;
    if (!(await confirm({ message: 'Bạn có chắc chắn muốn xóa ca làm việc này không?', confirmLabel: 'Xóa' }))) return false;
    setSaving(true);
    try {
      await shiftService.deleteShift(selectedBranchId, shiftId);
      showToast('Đã xóa ca làm việc.');
      await fetchData();
      return true;
    } catch (err) {
      showToast(err.response?.data?.message || 'Không thể xóa ca làm việc.', 'error');
      return false;
    } finally {
      setSaving(false);
    }
  };

  // Auto-fill quotas according to standard norms
  const handleAutoFill = async () => {
    setSaving(true);
    try {
      await headcountQuotaService.autoFillQuotas({
        branchId: selectedBranchId,
        scope: viewMode === 'day' ? 'DAY' : 'WEEK',
        ...(viewMode === 'day' ? {date:selectedDateIso} : {weekStart:selectedWeekStartIso}),
      });
      showToast('Đã điền nhu cầu theo quy tắc của hệ thống.');
      await fetchData();
    } catch (err) {
      console.error('Auto fill failed:', err);
      showToast('Không thể tự động lấp đầy định biên!', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Apply quotas directly to Scheduler
  const handleApplyToScheduler = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const res = await headcountQuotaService.applyToScheduler({
        branchId: selectedBranchId,
        scope: viewMode === 'day' ? 'DAY' : 'WEEK',
        ...(viewMode === 'day' ? {date:selectedDateIso} : {weekStart:selectedWeekStartIso}),
      });

      showToast(res.message || 'Đã áp dụng định biên vào lịch ca thành công!');

      if (onSuccess) {
        onSuccess({
          scope: viewMode === 'day' ? 'DAY' : 'WEEK',
          date: selectedDateIso,
          weekStart: selectedWeekStartIso,
        });
      }

      if (res.reviewShiftIds?.length) {
        setApplyReview(res.message);
        await fetchData();
      } else {
        onClose();
      }
    } catch (err) {
      console.error('Apply to scheduler failed:', err);
      showToast('Không thể áp dụng vào lịch ca!', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Update Monthly Salary Budget
  const handleUpdateMonthlyBudget = async (newBudget) => {
    if (!selectedBranchId || saving || !Number.isFinite(newBudget) || newBudget<=0) return false;
    setSaving(true);
    try {
      await headcountQuotaService.updateMonthlyBudget(selectedBranchId,newBudget);
      await fetchData();
      showToast('Đã lưu ngân sách tháng.');
      return true;
    } catch (err) {
      showToast(err.response?.data?.message || 'Không thể lưu ngân sách mới.', 'error');
      return false;
    } finally { setSaving(false); }
  };

  // Week Navigation
  const handlePrevWeek = () => {
    const current = new Date(selectedWeekStartIso);
    current.setDate(current.getDate() - 7);
    setSelectedWeekStartIso(current.toISOString().slice(0, 10));
  };

  const handleNextWeek = () => {
    const current = new Date(selectedWeekStartIso);
    current.setDate(current.getDate() + 7);
    setSelectedWeekStartIso(current.toISOString().slice(0, 10));
  };

  const handleCurrentWeek = () => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    setSelectedWeekStartIso(monday.toISOString().slice(0, 10));
  };

  if (!isOpen) return null;

  return createPortal(
    <div ref={overlayRef} className="dp-fullscreen-modal-overlay" tabIndex={0} aria-label="Nội dung định biên ca">
      <div className="dp-fullscreen-workspace" role="dialog" aria-modal="true" aria-labelledby="dp-workspace-title">
        {/* Toast Alert */}
        {toastMessage && (
          <div className={`dp-toast-banner dp-toast-${toastMessage.type}`}>
            {toastMessage.msg}
          </div>
        )}

        {/* ── 1. Top Breadcrumb & Actions Bar ── */}
        <div className="dp-modal-top-bar">
          <div className="dp-top-bar-left">
            <div className="dp-breadcrumb">
              <span className="dp-bc-item">Kế hoạch ca làm</span>
              <span className="dp-bc-sep">/</span>
              <span className="dp-bc-item">Định biên nhân sự</span>
              <span className="dp-bc-sep">/</span>
              <span className="dp-bc-item active">Chỉ tiêu theo ca</span>
            </div>

            <div className="dp-modal-title-row">
              <div>
                <div className="dp-title-flex">
                  <h1 id="dp-workspace-title" className="dp-modal-main-title">Định biên ca</h1>
                </div>
                <p className="dp-modal-sub-desc">Thiết lập nhu cầu nhân sự theo vị trí và ca làm việc.</p>
              </div>
            </div>
          </div>

          <div className="dp-top-bar-right">
            <button
              type="button"
              className="dp-modal-close-round"
              onClick={onClose}
              title="Đóng cửa sổ"
              aria-label="Đóng định biên ca"
            >
              ✕
            </button>

          </div>
        </div>

        {/* ── 2. Filters & View Switcher Controls Strip ── */}
        <div className="dp-controls-strip">
          <div className="dp-cs-left">
            {/* Branch Dropdown: Only ADMIN can switch branches; MANAGER is locked to their store */}
            <div className="dp-store-dropdown-wrap">
              {isAdmin ? (
                <select
                  value={selectedBranchId}
                  onChange={(e) => setSelectedBranchId(e.target.value)}
                  className="dp-store-select"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="dp-store-locked-badge">
                  <span className="dp-store-locked-name">
                    {branches.find((b) => String(b.id) === String(selectedBranchId))?.name || 'Chi nhánh hiện tại'}
                  </span>
                </div>
              )}
            </div>

            {/* Date or Week Selector */}
            {viewMode === 'day' ? (
              <div className="dp-date-selector-wrap">
                <span className="dp-date-label">Ngày: {dailyData?.dateFormatted || selectedDateIso}</span>
                <input
                  type="date"
                  aria-label="Chọn ngày định biên"
                  value={selectedDateIso}
                  onChange={(e) => setSelectedDateIso(e.target.value)}
                  className="dp-native-date-picker"
                />
              </div>
            ) : (
              <div className="dp-week-selector-wrap">
                <span className="dp-week-range-text">
                  Tuần: {weeklyData?.weekFormatted || selectedWeekStartIso}
                </span>
                <button type="button" className="dp-week-nav-btn" onClick={handlePrevWeek} aria-label="Tuần trước">‹</button>
                <button type="button" className="dp-week-nav-btn" onClick={handleNextWeek} aria-label="Tuần sau">›</button>
                <button type="button" className="dp-week-today-pill" onClick={handleCurrentWeek}>Tuần này</button>
              </div>
            )}
          </div>

          <div className="dp-cs-right">
            {/* View Switcher Tabs (Dạng ngày | Dạng tuần) */}
            <div className="dp-view-switcher-pill">
              <button
                type="button"
                className={`dp-vs-btn ${viewMode === 'day' ? 'active' : ''}`}
                onClick={() => setViewMode('day')}
              >
                Dạng ngày
              </button>
              <button
                type="button"
                className={`dp-vs-btn ${viewMode === 'week' ? 'active' : ''}`}
                onClick={() => setViewMode('week')}
              >
                Dạng tuần
              </button>
            </div>
          </div>
        </div>

        {/* ── KPI Summary Bar (100% Backend Headcount Quota Summary API) ── */}
        {quotaSummary && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            padding: '12px 24px',
            background: 'linear-gradient(90deg, #f0fdfa 0%, #f8fafc 100%)',
            borderBottom: '1px solid #ccfbf1',
            flexWrap: 'wrap'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
              {/* Total Hours */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>Tổng giờ định biên:</span>
                <strong style={{ fontSize: '15px', color: '#0f766e', fontWeight: 700 }}>
                  {quotaSummary.totalHours ? quotaSummary.totalHours.toLocaleString('vi-VN') : 0} giờ
                </strong>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                  ({quotaSummary.totalQuotas || 0} lượt ca)
                </span>
              </div>

              {/* Estimated Cost */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>Chi phí ước tính:</span>
                <strong style={{ fontSize: '15px', color: '#b45309', fontWeight: 700 }}>
                  {quotaSummary.formattedEstimatedCost || (quotaSummary.estimatedCost ? quotaSummary.estimatedCost.toLocaleString('vi-VN') + ' đ' : '0 đ')}
                </strong>
              </div>

              {/* SLA Compliance */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>Tuân thủ định biên SLA:</span>
                <span style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '12px',
                  background: (quotaSummary.slaComplianceRate ?? 100) >= 90 ? '#dcfce7' : '#fee2e2',
                  color: (quotaSummary.slaComplianceRate ?? 100) >= 90 ? '#15803d' : '#b91c1c'
                }}>
                  {quotaSummary.slaComplianceRate != null ? `${quotaSummary.slaComplianceRate.toFixed(1)}%` : '100%'}
                </span>
              </div>
            </div>

            {/* Monthly Budget Usage */}
            {quotaSummary.monthlyQuotaBudget > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>
                    Ngân sách tháng: <strong>{Math.round(quotaSummary.monthlyUsedPercentage || 0)}%</strong> ({quotaSummary.budgetStatusText || 'Đang vận hành'})
                  </div>
                  <div style={{
                    width: '120px',
                    height: '6px',
                    background: '#e2e8f0',
                    borderRadius: '3px',
                    overflow: 'hidden',
                    marginTop: '3px'
                  }}>
                    <div style={{
                      width: `${Math.min(100, Math.max(0, quotaSummary.monthlyUsedPercentage || 0))}%`,
                      height: '100%',
                      background: (quotaSummary.monthlyUsedPercentage || 0) > 100 ? '#ef4444' : (quotaSummary.monthlyUsedPercentage || 0) > 85 ? '#f59e0b' : '#0d9488'
                    }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── 3. Main Workspace Content Area ── */}
        <div className="dp-modal-content-area">
          {applyReview && <div role="alert" className="dp-error-card"><p>{applyReview}</p><button type="button" onClick={()=>setApplyReview(null)}>Đã hiểu</button></div>}
          {viewMode === 'day' ? (
            <DemandDailyView
              loading={loading}
              error={error}
              data={dailyData}
              onUpdateCount={handleDailyUpdateCount}
              onUpdateNorm={handleUpdateNorm}
              onAutoFill={handleAutoFill}
              onCreateShift={handleCreateCustomShift}
              onDeleteShift={handleDeleteCustomShift}
              onRetry={fetchData}
              saving={saving}
            />
          ) : (
            <DemandWeeklyMatrixView
              loading={loading}
              error={error}
              data={weeklyData}
              onUpdateCell={handleWeeklyUpdateCell}
              onUpdateNorm={handleUpdateNorm}
              onAutoFill={handleAutoFill}
              onUpdateBudget={handleUpdateMonthlyBudget}
              onRetry={fetchData}
              saving={saving}
            />
          )}
        </div>
        <footer className="dp-demand-savebar"><div><strong>Định biên {viewMode==='day'?'ngày':'tuần'}</strong><span>{viewMode==='day'?(dailyData?.dateFormatted||selectedDateIso):(weeklyData?.weekFormatted||selectedWeekStartIso)} · Chỉ đồng bộ nhu cầu, chưa phân công nhân viên.</span></div><button type="button" className="dp-btn-primary-apply" onClick={handleApplyToScheduler} disabled={saving||loading||!!error||!(viewMode==='day'?dailyData?.shifts?.length:weeklyData?.matrixRows?.length)}>{saving?'Đang xử lý…':'Áp dụng nhu cầu vào lịch ca'}</button></footer>
      </div>
    </div>, document.body
  );
}
