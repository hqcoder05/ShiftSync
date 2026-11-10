import { colors as uiColors } from '../theme/koreanPalette';
import { vietnamDateKey } from './vietnamTime';
/**
 * Unified Currency & Date Formatters for ShiftSync Mobile
 * Backend is SOURCE OF TRUTH: All currency amounts are stored and returned in VND (Đồng).
 */

export const formatVND = (num) => {
  if (num === null || num === undefined || !Number.isFinite(Number(num))) return '—';
  let val = Number(num);
  if (val === 0) return '0 đ';
  return Math.round(val).toLocaleString('vi-VN') + ' đ';
};

export const formatHourlyRate = (num) => {
  if (num === null || num === undefined || !Number.isFinite(Number(num))) return '—';
  let val = Number(num);
  if (val === 0) return '0 đ/giờ';
  return Math.round(val).toLocaleString('vi-VN') + ' đ/giờ';
};

export const formatDateDMY = (dateStr) => {
  if (!dateStr) return '';
  const parts = vietnamDateKey(dateStr).split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
};

export const getPayrollStatusInfo = (status, isEstimate = false) => {
  if (isEstimate) {
    return { text: 'Ước tính (Kỳ đang mở)', color: uiColors.warningText };
  }
  const s = String(status || '').toUpperCase();
  switch (s) {
    case 'PAID':
      return { text: 'Đã thanh toán', color: uiColors.successStrong };
    case 'CONFIRMED':
      return { text: 'Đã chốt (Chờ thanh toán)', color: uiColors.info };
    case 'DRAFT':
      return { text: 'Bản nháp (Đang tính toán)', color: uiColors.warningText };
    case 'OPEN':
      return { text: 'Ước tính (Kỳ đang mở)', color: uiColors.warningText };
    default:
      return { text: 'Chưa có trạng thái', color: uiColors.successStrong };
  }
};
