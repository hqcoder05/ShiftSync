// Role configurations, salary rates, norms and SLA standards
export const DEFAULT_ROLE_CONFIGS = [
  {
    code: 'barista',
    name: 'Barista',
    fullName: 'Barista (Pha chế)',
    subTitle: 'Pha chế & Quầy',
    rate: 28000,
    rateFormatted: '28.000 đ/h',
    min: 1,
    target: 2,
    max: 4,
    normLabel: 'Chuẩn: 2 - 4 NV/ca',
    applyRule: 'Áp dụng: Mọi ca',
    icon: '☕',
    keywords: ['barista', 'pha chế', 'cà phê', 'bar'],
  },
  {
    code: 'cashier',
    name: 'Cashier',
    fullName: 'Thu ngân (Cashier)',
    subTitle: 'Order & Tính tiền',
    rate: 26000,
    rateFormatted: '26.000 đ/h',
    min: 1,
    target: 2,
    max: 2,
    normLabel: 'Chuẩn: 1 - 2 NV/ca',
    applyRule: 'Áp dụng: Chỉ ca cao điểm',
    icon: '💳',
    keywords: ['cashier', 'thu ngân', 'pos', 'checkout'],
  },
  {
    code: 'kitchen',
    name: 'Kitchen',
    fullName: 'Bếp (Kitchen)',
    subTitle: 'Bếp nóng & Bánh',
    rate: 30000,
    rateFormatted: '30.000 đ/h',
    min: 1,
    target: 2,
    max: 3,
    normLabel: 'Chuẩn: 2 - 3 NV/ca',
    applyRule: 'Áp dụng: Mọi ca',
    icon: '🍳',
    keywords: ['kitchen', 'bếp', 'bánh', 'bakery'],
  },
  {
    code: 'waiter',
    name: 'Waiter',
    fullName: 'Phục vụ (Waiter)',
    subTitle: 'Sảnh & Bàn khách',
    rate: 25000,
    rateFormatted: '25.000 đ/h',
    min: 1,
    target: 2,
    max: 3,
    normLabel: 'Chuẩn: 1 - 2 NV/ca',
    applyRule: 'Áp dụng: Giờ cao điểm',
    icon: '🍽️',
    keywords: ['waiter', 'phục vụ', 'server', 'sảnh'],
  },
  {
    code: 'leader',
    name: 'Trưởng ca',
    fullName: 'Trưởng ca (Leader)',
    subTitle: 'Điều phối & Giám sát ca',
    rate: 35000,
    rateFormatted: '35.000 đ/h',
    min: 1,
    target: 1,
    max: 1,
    normLabel: 'Chuẩn: 1 NV/ca',
    applyRule: 'Áp dụng: Mọi ca',
    icon: '⭐',
    keywords: ['leader', 'trưởng ca', 'giám sát', 'supervisor'],
  },
];

export const MONTHLY_SALARY_BUDGET = 85000000; // 85 triệu đồng

export function matchRoleConfig(skillName = '') {
  const lower = (skillName || '').toLowerCase();
  const found = DEFAULT_ROLE_CONFIGS.find((cfg) =>
    cfg.keywords.some((kw) => lower.includes(kw))
  );
  if (found) return found;

  return {
    code: 'other',
    name: skillName || 'Vị trí',
    fullName: skillName || 'Vị trí chuyên môn',
    subTitle: 'Vận hành cửa hàng',
    rate: 25000,
    rateFormatted: '25.000 đ/h',
    min: 1,
    target: 1,
    max: 2,
    normLabel: 'Chuẩn: 1 - 2 NV/ca',
    applyRule: 'Áp dụng: Mọi ca',
    icon: '💼',
    keywords: [],
  };
}

export function evaluateSLAStatus(count, roleConfig, isWeekend = false) {
  const c = parseInt(count, 10) || 0;
  if (c < roleConfig.min) {
    return {
      status: 'VIOLATION',
      label: 'Vi phạm quy chuẩn',
      shortLabel: `Thiếu ${roleConfig.min - c} NV`,
      colorClass: 'sla-violation',
    };
  }
  if (isWeekend && c > roleConfig.target) {
    return {
      status: 'PEAK',
      label: 'Cao điểm (+50% DT)',
      shortLabel: 'Cao điểm',
      colorClass: 'sla-peak',
    };
  }
  if (!isWeekend && c > roleConfig.max) {
    return {
      status: 'EXCEED',
      label: 'Vượt chuẩn',
      shortLabel: 'Vượt chuẩn',
      colorClass: 'sla-exceed',
    };
  }
  return {
    status: 'STANDARD',
    label: 'Đạt chuẩn',
    shortLabel: 'Đạt chuẩn',
    colorClass: 'sla-standard',
  };
}
