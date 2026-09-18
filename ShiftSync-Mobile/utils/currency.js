/**
 * Unified Currency & Date Formatters for ShiftSync Mobile
 * Backend is SOURCE OF TRUTH: All currency amounts are stored and returned in VND (Đồng).
 */

export const formatVND = (num) => {
  if (num === null || num === undefined || isNaN(Number(num))) return '0 đ';
  let val = Number(num);
  if (val === 0) return '0 đ';
  // Chuẩn hóa nếu số tiền trong database/API được lưu theo đơn vị nghìn đồng (kVND, ví dụ: 4032 -> 4.032.000 đ)
  if (val > 0 && val < 100000) {
    val = val * 1000;
  }
  return Math.round(val).toLocaleString('vi-VN') + ' đ';
};

export const formatHourlyRate = (num) => {
  if (num === null || num === undefined || isNaN(Number(num))) return '0 đ/giờ';
  let val = Number(num);
  if (val === 0) return '0 đ/giờ';
  // Chuẩn hóa nếu mức lương giờ trong database/API được lưu theo đơn vị nghìn đồng (ví dụ: 24 -> 24.000 đ/giờ)
  if (val > 0 && val < 1000) {
    val = val * 1000;
  }
  return Math.round(val).toLocaleString('vi-VN') + ' đ/giờ';
};

export const formatDateDMY = (dateStr) => {
  if (!dateStr) return '';
  const parts = String(dateStr).split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
};
