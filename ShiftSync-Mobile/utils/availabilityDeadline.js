export const AVAILABILITY_TIME_ZONE = 'Asia/Ho_Chi_Minh';

const VIETNAM_OFFSET = 7 * 60 * 60 * 1000;
const DAY = 24 * 60 * 60 * 1000;
const dateKey = (date) => `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;

export const getAvailabilityWeekStart = (now = new Date(), weekOffset = 1) => {
  const vietnamDate = new Date(new Date(now).getTime() + VIETNAM_OFFSET);
  vietnamDate.setUTCHours(0, 0, 0, 0);
  vietnamDate.setUTCDate(vietnamDate.getUTCDate() - ((vietnamDate.getUTCDay() + 6) % 7) + weekOffset * 7);
  return dateKey(vietnamDate);
};

export const shiftAvailabilityWeek = (weekStart, weekOffset) => {
  const date = new Date(`${weekStart}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + weekOffset * 7);
  return dateKey(date);
};

export const getAvailabilityWeekDates = (weekStart) => {
  const monday = new Date(`${weekStart}T00:00:00Z`);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday.getTime() + index * DAY);
    // These Date objects carry calendar labels for the device's UI, not instants
    // used to enforce the deadline; that calculation always uses Vietnam time.
    return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  });
};

export const getAvailabilityDeadline = (weekStart, now = new Date()) => {
  const monday = new Date(`${weekStart}T00:00:00+07:00`);
  const expiresAt = new Date(monday.getTime() - 2 * DAY);
  return {
    deadlineAt: new Date(expiresAt.getTime() - 1),
    expiresAt,
    expired: new Date(now).getTime() >= expiresAt.getTime(),
  };
};

export const getAvailabilityEditStatus = (weekStart, now = new Date()) => {
  const nextWeekStart = getAvailabilityWeekStart(now, 1);
  const deadline = getAvailabilityDeadline(weekStart, now);
  return {
    ...deadline,
    notYetOpen: weekStart > nextWeekStart,
    editable: weekStart === nextWeekStart && !deadline.expired,
  };
};
