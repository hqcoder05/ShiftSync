import React, { useState, useEffect, useCallback } from 'react';
import DemandDailyView from './DemandDailyView';
import DemandWeeklyMatrixView from './DemandWeeklyMatrixView';
import headcountQuotaService from '../../services/headcountQuotaService';
import './DemandPlanning.css';

export default function DemandPlanningModal({
  isOpen,
  onClose,
  storeId,
  initialDateIso,
  onSuccess,
}) {
  const [viewMode, setViewMode] = useState('day'); // 'day' | 'week' | 'month'

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
        // Fallback branch if not yet seeded
        if (mounted && branches.length === 0) {
          const fallbackStoreId = storeId || localStorage.getItem('storeId') || '11111111-1111-1111-1111-111111111111';
          setBranches([
            { id: fallbackStoreId, name: 'ShiftSync Store' },
          ]);
          setSelectedBranchId(fallbackStoreId);
        }
      }
    };

    fetchBranches();
    return () => { mounted = false; };
  }, [isOpen, selectedBranchId]);

  // 2. Fetch Daily or Weekly Quota Data when branch, mode, or date changes
  const fetchData = useCallback(async () => {
    if (!isOpen || !selectedBranchId) return;

    setLoading(true);
    setError(null);

    try {
      if (viewMode === 'day') {
        const res = await headcountQuotaService.getDailyQuotas(selectedBranchId, selectedDateIso);
        setDailyData(res);
      } else {
        const res = await headcountQuotaService.getWeeklyQuotas(selectedBranchId, selectedWeekStartIso);
        setWeeklyData(res);
      }
    } catch (err) {
      console.error('Error fetching headcount quotas:', err);
      setError(
        err.response?.data?.message ||
        'Không thể tải dữ liệu định biên từ máy chủ. Vui lòng kiểm tra kết nối mạng và thử lại.'
      );
    } finally {
      setLoading(false);
    }
  }, [isOpen, selectedBranchId, viewMode, selectedDateIso, selectedWeekStartIso]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── OPTIMISTIC UPDATE HANDLERS ──

  // A. Day View: Update Count (+/-)
  const handleDailyUpdateCount = async (quotaId, newCount, positionId, shiftType) => {
    if (!dailyData) return;

    // Snapshot previous data for rollback
    const prevData = JSON.parse(JSON.stringify(dailyData));

    // Optimistic Update with full summary & KPI recalculation
    setDailyData((prev) => {
      if (!prev) return prev;
      const updatedShifts = prev.shifts.map((s) => {
        const isTargetShift =
          (shiftType === 'morning' && s.startTime?.startsWith('06')) ||
          (shiftType === 'afternoon' && s.startTime?.startsWith('14')) ||
          s.quotas.some((q) => q.quotaId === quotaId);
        if (!isTargetShift) return s;

        const updatedQuotas = s.quotas.map((q) => {
          if (q.quotaId === quotaId || q.positionId === positionId) {
            const isUnder = newCount < q.min;
            const isOver = newCount > q.max;
            return {
              ...q,
              count: newCount,
              status: isUnder ? 'UNDERSTAFFED' : isOver ? 'OVERSTAFFED' : 'COMPLIANT',
              statusLabel: isUnder ? `⚠️ Thiếu ${q.min - newCount} NV` : isOver ? '⚠️ Vượt chuẩn' : '✓ Đạt chuẩn',
              isViolation: isUnder,
            };
          }
          return q;
        });
        return { ...s, quotas: updatedQuotas };
      });

      // Recalculate position KPIs and Summary
      let totalAssignedHoursAll = 0;
      let totalCostAll = 0;
      let compliantCellsCount = 0;
      let totalCellsCount = 0;
      const violations = [];
      const overstaffed = [];

      const updatedPositionKpis = (prev.positionKpis || []).map((kpi) => {
        let posAssignedHours = 0;
        let posTotalCount = 0;
        let posCompliantCount = 0;

        for (const s of updatedShifts) {
          for (const q of s.quotas) {
            if (q.positionId === kpi.positionId) {
              totalCellsCount++;
              posTotalCount++;
              posAssignedHours += (q.count || 0) * 8;
              totalCostAll += (q.count || 0) * 8 * (kpi.hourlyRate || 28000);

              if (q.status === 'COMPLIANT') {
                posCompliantCount++;
                compliantCellsCount++;
              } else if (q.status === 'UNDERSTAFFED') {
                violations.push({
                  shiftName: s.name,
                  positionName: kpi.positionName,
                  count: q.count,
                  min: q.min,
                  diff: q.min - q.count,
                });
              } else if (q.status === 'OVERSTAFFED') {
                overstaffed.push({
                  shiftName: s.name,
                  positionName: kpi.positionName,
                  count: q.count,
                  max: q.max,
                });
              }
            }
          }
        }

        totalAssignedHoursAll += posAssignedHours;
        const slaPct = posTotalCount > 0 ? Math.round((posCompliantCount / posTotalCount) * 100) : 100;
        return {
          ...kpi,
          assignedHours: posAssignedHours,
          slaPercentage: slaPct,
        };
      });

      const totalSlots = totalCellsCount || 1;
      const overallSla = Math.round((compliantCellsCount / totalSlots) * 100);

      const totalHeadcount = updatedShifts.reduce(
        (acc, s) => acc + s.quotas.reduce((a, q) => a + (q.count || 0), 0),
        0
      );

      let warningBanner;
      if (violations.length > 0) {
        const violationSummary = violations.length <= 2
          ? violations.map((v) => `${v.shiftName} - ${v.positionName} (hiện có ${v.count}/${v.min} NV, thiếu ${v.diff} NV)`).join('; ')
          : `Phát hiện ${violations.length} vị trí thiếu quân số: ` +
            violations.slice(0, 3).map((v) => `${v.shiftName} (${v.positionName} thiếu ${v.diff})`).join(', ') +
            (violations.length > 3 ? ` và ${violations.length - 3} vị trí khác.` : '.');

        warningBanner = {
          hasViolation: true,
          title: `⚠️ Cảnh báo thiếu quân số vận hành (${violations.length} vị trí chưa đạt định mức)`,
          message: violationSummary,
          impactDescription: `Tỷ lệ đáp ứng SLA hiện tại: ${overallSla}%. Cần bổ sung thêm ${violations.reduce((sum, v) => sum + v.diff, 0)} nhân sự trước khi áp dụng sang Scheduler để đảm bảo chất lượng phục vụ.`,
        };
      } else {
        const extraOverstaffed = overstaffed.length > 0
          ? ` (Ghi nhận ${overstaffed.length} vị trí vượt mức trần tối đa: ${overstaffed.map((o) => `${o.positionName} ${o.count}/${o.max}`).join(', ')})`
          : '';

        warningBanner = {
          hasViolation: false,
          title: `✓ Đạt chuẩn SLA vận hành (${overallSla}% chuẩn định biên)`,
          message: `Tất cả ${updatedShifts.length} ca trong ngày (${compliantCellsCount}/${totalSlots} vị trí) đã đạt chuẩn định biên SLA vận hành!${extraOverstaffed}`,
          impactDescription: `Đã phân bổ đủ ${totalHeadcount} lượt nhân sự (${totalAssignedHoursAll} giờ công) theo đúng định mức nhân sự cho toàn bộ các ca làm việc.`,
        };
      }

      return {
        ...prev,
        shifts: updatedShifts,
        positionKpis: updatedPositionKpis,
        slaPercentage: overallSla,
        warningBanner,
        summary: {
          ...prev.summary,
          totalHours: totalAssignedHoursAll,
          totalShiftsCount: totalHeadcount,
          estimatedCost: totalCostAll,
          slaComplianceRate: overallSla,
          compliantSlotsCount: compliantCellsCount,
          totalSlotsCount: totalCellsCount,
          violationSlotsCount: totalCellsCount - compliantCellsCount,
        },
      };
    });

    try {
      await headcountQuotaService.updateQuota(quotaId, {
        branchId: selectedBranchId,
        date: selectedDateIso,
        shiftType,
        positionId,
        count: newCount,
      });
    } catch (err) {
      console.error('Update quota failed, rolling back:', err);
      setDailyData(prevData); // Rollback
      showToast('Không thể cập nhật định biên. Đã hoàn tác lại số liệu cũ!', 'error');
    }
  };

  // B. Weekly View: Update Cell (+/-)
  const handleWeeklyUpdateCell = async (quotaId, delta, currentCount, positionId, date, shiftType) => {
    if (!weeklyData) return;

    const newCount = Math.max(0, currentCount + delta);

    // Snapshot previous data for rollback
    const prevData = JSON.parse(JSON.stringify(weeklyData));

    // Optimistic Update with FULL summary, day totals, man-hours, KPI cards & budget recalculation
    setWeeklyData((prev) => {
      if (!prev) return prev;
      const updatedRows = prev.matrixRows.map((row) => {
        if (row.positionId !== positionId) return row;
        const updatedCells = row.cells.map((cell) => {
          if (cell.quotaId === quotaId) {
            const isViolation = newCount < cell.min;
            const isPeak = cell.isPeakSlot;
            const isOver = newCount > cell.max;
            return {
              ...cell,
              count: newCount,
              status: isViolation ? 'VIOLATION' : isPeak ? 'PEAK' : isOver ? 'OVER' : 'COMPLIANT',
              statusLabel: isViolation ? 'Vi phạm' : isPeak ? 'Cao điểm' : isOver ? 'Vượt chuẩn' : 'Đạt chuẩn',
            };
          }
          return cell;
        });
        return { ...row, cells: updatedCells };
      });

      // 1. Recalculate Summary Rows (shiftTotals, dayTotals, manHours)
      const shiftTotals = [];
      const dayTotals = [];
      const manHours = [];

      for (let i = 0; i < 7; i++) {
        let morningTotal = 0;
        let afternoonTotal = 0;
        let dayMin = 0;
        let dayTarget = 0;
        let dayMax = 0;

        for (const row of updatedRows) {
          const mCell = row.cells && row.cells[i * 2];
          const aCell = row.cells && row.cells[i * 2 + 1];
          if (mCell) {
            morningTotal += (mCell.count || 0);
            dayMin += (mCell.min || 0);
            dayTarget += (mCell.target || 0);
            dayMax += (mCell.max || 0);
          }
          if (aCell) {
            afternoonTotal += (aCell.count || 0);
            dayMin += (aCell.min || 0);
            dayTarget += (aCell.target || 0);
            dayMax += (aCell.max || 0);
          }
        }
        shiftTotals.push(morningTotal);
        shiftTotals.push(afternoonTotal);

        const dayTotal = morningTotal + afternoonTotal;
        let badge = 'Đạt chuẩn';
        let badgeType = 'COMPLIANT';
        if (dayTotal > dayMax) {
          badge = `Vượt +${dayTotal - dayMax} NV`;
          badgeType = 'OVER';
        } else if (dayTotal < dayMin) {
          badge = `Thiếu ${dayMin - dayTotal} NV`;
          badgeType = 'UNDER';
        } else if (dayTotal > dayTarget) {
          badge = `Trong định biên (Tối đa ${dayMax} NV)`;
          badgeType = 'COMPLIANT';
        } else {
          badge = 'Đạt chuẩn';
          badgeType = 'COMPLIANT';
        }

        dayTotals.push({
          totalStaff: dayTotal,
          standardNorm: dayTarget,
          maxNorm: dayMax,
          minNorm: dayMin,
          statusBadge: badge,
          badgeType: badgeType,
        });

        manHours.push(dayTotal * 8);
      }

      // 2. Recalculate Position Cards (assignedSlots, totalHours, slaPercentage)
      const updatedPositionCards = (prev.positionCards || []).map((card) => {
        const row = updatedRows.find((r) => r.positionId === card.positionId);
        const assignedSlots = row ? row.cells.reduce((sum, c) => sum + (c.count || 0), 0) : card.assignedSlots;
        const totalHours = assignedSlots * 8;
        const targetSlots = card.targetSlots || 28;
        const slaPercentage = targetSlots > 0 ? Math.min(100, Math.round((assignedSlots / targetSlots) * 100)) : 100;
        return {
          ...card,
          assignedSlots,
          totalHours,
          slaPercentage,
        };
      });

      // 3. Recalculate Overall Stats, Cost, & SLA
      let totalSlotsAll = 0;
      let totalSlotsCompliant = 0;
      let totalSlotsPeak = 0;
      let totalSlotsReview = 0;
      let totalWeeklyCost = 0;

      for (const row of updatedRows) {
        const rate = row.hourlyRate || 28000;
        for (const c of row.cells) {
          totalSlotsAll++;
          totalWeeklyCost += (c.count || 0) * 8 * rate;
          if (c.status === 'COMPLIANT') totalSlotsCompliant++;
          else if (c.status === 'PEAK') totalSlotsPeak++;
          else totalSlotsReview++;
        }
      }

      const totalStaffSum = shiftTotals.reduce((a, b) => a + b, 0);
      const totalSla = totalSlotsAll > 0 ? Math.round(((totalSlotsCompliant + totalSlotsPeak) / totalSlotsAll) * 1000) / 10 : 100;
      const totalHoursAll = totalStaffSum * 8;
      const monthlyBudget = prev.budget?.monthlyQuotaBudget || 85000000;
      const budgetPct = Math.round((totalWeeklyCost / monthlyBudget) * 1000) / 10;
      const formattedCost = new Intl.NumberFormat('vi-VN').format(totalWeeklyCost) + ' đ';

      return {
        ...prev,
        matrixRows: updatedRows,
        summaryRows: {
          shiftTotals,
          dayTotals,
          manHours,
        },
        positionCards: updatedPositionCards,
        slaPercentage: totalSla,
        progressTitle: `TIẾN ĐỘ PHÂN BỔ ĐỊNH BIÊN TUẦN: ${totalStaffSum} / ${totalSlotsAll} Lượt ca vị trí (${Math.round(totalSla)}%)`,
        progressPills: {
          compliantCount: totalSlotsCompliant,
          compliantPercent: totalSlotsAll > 0 ? Math.round((totalSlotsCompliant / totalSlotsAll) * 1000) / 10 : 97.1,
          peakCount: totalSlotsPeak,
          peakPercent: totalSlotsAll > 0 ? Math.round((totalSlotsPeak / totalSlotsAll) * 1000) / 10 : 2.9,
          needsReviewCount: totalSlotsReview,
          needsReviewPercent: totalSlotsAll > 0 ? Math.round((totalSlotsReview / totalSlotsAll) * 1000) / 10 : 0,
        },
        budget: {
          ...prev.budget,
          totalQuotas: totalStaffSum,
          totalHours: totalHoursAll,
          estimatedCost: totalWeeklyCost,
          formattedEstimatedCost: formattedCost,
          slaComplianceRate: totalSla,
          monthlyUsedBudget: totalWeeklyCost,
          monthlyUsedPercentage: budgetPct,
          budgetStatusText: `${budgetPct}% ngân sách tháng — ${budgetPct > 100 ? 'Vượt hạn mức ngân sách' : 'Đang trong hạn mức an toàn'}`,
        },
      };
    });

    try {
      await headcountQuotaService.updateQuota(quotaId, {
        branchId: selectedBranchId,
        date,
        shiftType,
        positionId,
        count: newCount,
      });
    } catch (err) {
      console.error('Update weekly cell failed, rolling back:', err);
      setWeeklyData(prevData); // Rollback
      showToast('Không thể cập nhật ô ma trận. Đã hoàn tác lại số liệu cũ!', 'error');
    }
  };

  // C. Update Norms (Min / Target / Max inline)
  const handleUpdateNorm = async (positionId, min, target, max) => {
    // Optimistically update weeklyData so UI responds instantly
    setWeeklyData((prev) => {
      if (!prev) return prev;
      const updatedPositionCards = (prev.positionCards || []).map((card) => {
        if (card.positionId === positionId) {
          const targetSlots = card.targetSlots || 28;
          const assignedSlots = card.assignedSlots || 0;
          const slaPercentage = targetSlots > 0 ? Math.min(100, Math.round((assignedSlots / targetSlots) * 100)) : 100;
          return { ...card, min, target, max, slaPercentage };
        }
        return card;
      });

      const updatedRows = (prev.matrixRows || []).map((row) => {
        if (row.positionId === positionId) {
          const updatedCells = row.cells.map((cell) => {
            const isViolation = cell.count < min;
            const isPeak = cell.isPeakSlot;
            const isOver = cell.count > max;
            return {
              ...cell,
              min,
              target,
              max,
              status: isViolation ? 'VIOLATION' : isPeak ? 'PEAK' : isOver ? 'OVER' : 'COMPLIANT',
              statusLabel: isViolation ? 'Vi phạm' : isPeak ? 'Cao điểm' : isOver ? 'Vượt chuẩn' : 'Đạt chuẩn',
            };
          });
          return { ...row, cells: updatedCells };
        }
        return row;
      });

      const dayTotals = [];
      for (let i = 0; i < 7; i++) {
        let morningTotal = 0;
        let afternoonTotal = 0;
        let dayMin = 0;
        let dayTarget = 0;
        let dayMax = 0;

        for (const row of updatedRows) {
          const mCell = row.cells && row.cells[i * 2];
          const aCell = row.cells && row.cells[i * 2 + 1];
          if (mCell) {
            morningTotal += (mCell.count || 0);
            dayMin += (mCell.min || 0);
            dayTarget += (mCell.target || 0);
            dayMax += (mCell.max || 0);
          }
          if (aCell) {
            afternoonTotal += (aCell.count || 0);
            dayMin += (aCell.min || 0);
            dayTarget += (aCell.target || 0);
            dayMax += (aCell.max || 0);
          }
        }
        const dayTotal = morningTotal + afternoonTotal;
        let badge = 'Đạt chuẩn';
        let badgeType = 'COMPLIANT';
        if (dayTotal > dayMax) {
          badge = `Vượt +${dayTotal - dayMax} NV`;
          badgeType = 'OVER';
        } else if (dayTotal < dayMin) {
          badge = `Thiếu ${dayMin - dayTotal} NV`;
          badgeType = 'UNDER';
        } else if (dayTotal > dayTarget) {
          badge = `Trong định biên (Tối đa ${dayMax} NV)`;
          badgeType = 'COMPLIANT';
        } else {
          badge = 'Đạt chuẩn';
          badgeType = 'COMPLIANT';
        }

        dayTotals.push({
          totalStaff: dayTotal,
          standardNorm: dayTarget,
          maxNorm: dayMax,
          minNorm: dayMin,
          statusBadge: badge,
          badgeType: badgeType,
        });
      }

      return {
        ...prev,
        positionCards: updatedPositionCards,
        matrixRows: updatedRows,
        summaryRows: {
          ...prev.summaryRows,
          dayTotals,
        },
      };
    });

    try {
      await headcountQuotaService.updateQuota(`norm_${positionId}`, {
        branchId: selectedBranchId,
        positionId,
        min,
        target,
        max,
      });
      showToast('Đã lưu quy chuẩn định mức thành công!');
      fetchData(); // Refresh to ensure state is in sync with server
    } catch (err) {
      console.error('Update norm failed:', err);
      showToast('Không thể lưu quy chuẩn định mức!', 'error');
    }
  };

  // ── ACTION HANDLERS ──

  // Auto-fill quotas according to standard norms
  const handleAutoFill = async () => {
    setSaving(true);
    try {
      await headcountQuotaService.autoFillQuotas({
        branchId: selectedBranchId,
        scope: viewMode === 'day' ? 'DAY' : 'WEEK',
        date: selectedDateIso,
        weekStart: selectedWeekStartIso,
      });
      showToast('Đã tự động lấp đầy định biên theo đúng chuẩn SLA!');
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
    setSaving(true);
    try {
      const res = await headcountQuotaService.applyToScheduler({
        branchId: selectedBranchId,
        scope: viewMode === 'day' ? 'DAY' : 'WEEK',
        date: selectedDateIso,
        weekStart: selectedWeekStartIso,
      });

      showToast(res.message || 'Đã áp dụng định biên sang Scheduler thành công!');

      if (onSuccess) {
        onSuccess({
          scope: viewMode === 'day' ? 'DAY' : 'WEEK',
          date: selectedDateIso,
          weekStart: selectedWeekStartIso,
        });
      }

      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err) {
      console.error('Apply to scheduler failed:', err);
      showToast('Không thể áp dụng sang Scheduler!', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Update Monthly Salary Budget
  const handleUpdateMonthlyBudget = async (newBudget) => {
    if (!selectedBranchId || !newBudget || isNaN(newBudget) || newBudget <= 0) return;

    // Optimistic UI update for weeklyData
    setWeeklyData((prev) => {
      if (!prev) return prev;
      const totalWeeklyCost = prev.budget?.monthlyUsedBudget || prev.budget?.estimatedCost || 0;
      const budgetPct = Math.round((totalWeeklyCost / newBudget) * 1000) / 10;
      return {
        ...prev,
        budget: {
          ...prev.budget,
          monthlyQuotaBudget: newBudget,
          monthlyUsedPercentage: budgetPct,
          budgetStatusText: `${budgetPct}% ngân sách tháng — ${budgetPct > 100 ? 'Vượt hạn mức ngân sách' : 'Đang trong hạn mức an toàn'}`,
        },
      };
    });

    try {
      await headcountQuotaService.updateMonthlyBudget(selectedBranchId, newBudget);
      showToast('Cập nhật hạn ngạch ngân sách lương tháng thành công!', 'success');
    } catch (err) {
      console.error('Error updating monthly budget:', err);
      showToast('Không thể lưu ngân sách mới. Vui lòng thử lại!', 'error');
      fetchData();
    }
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

  const currentSlaPercentage = viewMode === 'day'
    ? (dailyData?.slaPercentage ?? 96.8)
    : (weeklyData?.slaPercentage ?? 97.8);

  return (
    <div className="dp-fullscreen-modal-overlay">
      <div className="dp-fullscreen-workspace">
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
                  <h1 className="dp-modal-main-title">
                    {viewMode === 'day' ? 'Định biên nhân sự — Dạng ngày' : 'Kế hoạch định biên nhân sự'}
                  </h1>
                  <span className="dp-title-badge-green">
                    {currentSlaPercentage}% Chuẩn SLA
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="dp-top-bar-right">
            <button
              type="button"
              className="dp-modal-close-round"
              onClick={onClose}
              title="Đóng cửa sổ"
            >
              ✕
            </button>

            <div className="dp-top-actions-cluster">
              <button
                type="button"
                className="dp-btn-light-copy"
                onClick={handleAutoFill}
                title="Sao chép chuẩn cho tuần sau"
              >
                Sao chép tuần sau
              </button>
              <button
                type="button"
                className="dp-btn-light-draft"
                onClick={handleApplyToScheduler}
                disabled={saving}
              >
                Lưu nháp
              </button>
              <button
                type="button"
                className="dp-btn-primary-apply"
                onClick={handleApplyToScheduler}
                disabled={saving}
              >
                {saving ? 'Đang áp dụng...' : 'Áp dụng sang Scheduler xếp ca'}
              </button>
            </div>
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
                <span className="dp-date-label">Hôm nay: {dailyData?.dateFormatted || selectedDateIso}</span>
                <input
                  type="date"
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
                <button type="button" className="dp-week-nav-btn" onClick={handlePrevWeek}>‹</button>
                <button type="button" className="dp-week-nav-btn" onClick={handleNextWeek}>›</button>
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

        {/* ── 3. Main Workspace Content Area ── */}
        <div className="dp-modal-content-area">
          {viewMode === 'day' ? (
            <DemandDailyView
              loading={loading}
              error={error}
              data={dailyData}
              onUpdateCount={handleDailyUpdateCount}
              onUpdateNorm={handleUpdateNorm}
              onAutoFill={handleAutoFill}
              onApplyToScheduler={handleApplyToScheduler}
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
              onApplyToScheduler={handleApplyToScheduler}
              onUpdateBudget={handleUpdateMonthlyBudget}
              onRetry={fetchData}
              saving={saving}
            />
          )}
        </div>
      </div>
    </div>
  );
}
