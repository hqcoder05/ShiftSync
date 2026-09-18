/**
 * Unified Currency & Date Formatters for ShiftSync Mobile
 * Backend is SOURCE OF TRUTH: All currency amounts are stored and returned in VND (Đồng).
 */

export const formatVND = (num) => {
  if (num === null || num === undefined || isNaN(Number(num))) return '0 đ';
  return Math.round(Number(num)).toLocaleString('vi-VN') + ' đ';
};

export const formatHourlyRate = (num) => {
  if (num === null || num === undefined || isNaN(Number(num))) return '0 đ/giờ';
  return Math.round(Number(num)).toLocaleString('vi-VN') + ' đ/giờ';
};

export const formatDateDMY = (dateStr) => {
  if (!dateStr) return '';
  const parts = String(dateStr).split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
};
