// Shift dates and local times are Vietnam calendar values, independent of the device timezone.
const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const sameId = (left, right) => left != null && right != null && String(left) === String(right);

const dateMilliseconds = (value) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ''));
  if (!match) return null;
  const [, year, month, day] = match.map(Number);
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(0, 0, 0, 0);
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return date.getTime();
};

const timeMilliseconds = (value) => {
  let hour, minute, second = 0, millisecond = 0;
  if (value && typeof value === 'object') {
    hour = Number(value.hour); minute = Number(value.minute);
    second = Number(value.second || 0); millisecond = Math.floor(Number(value.nano || 0) / 1000000);
  } else {
    const match = /^(\d{1,2}):(\d{2})(?::(\d{2})(?:\.(\d{1,9}))?)?$/.exec(String(value || ''));
    if (!match) return null;
    hour = Number(match[1]); minute = Number(match[2]); second = Number(match[3] || 0);
    millisecond = Number((match[4] || '').padEnd(3, '0').slice(0, 3));
  }
  if (![hour, minute, second, millisecond].every(Number.isInteger) || hour < 0 || hour > 23
      || minute < 0 || minute > 59 || second < 0 || second > 59 || millisecond < 0 || millisecond > 999) return null;
  return ((hour * 60 + minute) * 60 + second) * 1000 + millisecond;
};

export const shiftIntervalVN = (shift) => {
  const day = dateMilliseconds(shift?.shiftDate);
  const startTime = timeMilliseconds(shift?.startTime);
  const endTime = timeMilliseconds(shift?.endTime);
  if (day == null || startTime == null || endTime == null || startTime === endTime) return null;
  const start = day + startTime - VN_OFFSET_MS;
  const end = day + endTime - VN_OFFSET_MS + (endTime < startTime ? DAY_MS : 0);
  return { start, end };
};

export const isAssignedTo = (shift, userId) => Boolean(userId && (
  sameId(shift?.staffId, userId) || sameId(shift?.assignedStaffId, userId)
  || shift?.shiftAssignments?.some((assignment) => sameId(assignment.staffId, userId))
));

// Half-open intervals allow an existing shift to end exactly when the next starts.
export const intervalsOverlap = (left, right) => Boolean(left && right && left.start < right.end && right.start < left.end);

export const findScheduleConflicts = (candidate, shifts, { userId, storeId, excludedShiftId, activeStoreIds } = {}) => {
  if (!userId || !storeId || !sameId(candidate?.storeId, storeId) || !Array.isArray(shifts)) {
    throw new Error('Không xác minh được tài khoản, chi nhánh hoặc lịch làm hiện tại.');
  }
  const candidateInterval = shiftIntervalVN(candidate);
  if (!candidateInterval) throw new Error('Ca làm thiếu ngày hoặc giờ hợp lệ. Vui lòng tải lại lịch.');
  return shifts.flatMap((shift) => {
    if (!isAssignedTo(shift, userId)
        || (activeStoreIds && !activeStoreIds.some((id) => sameId(shift.storeId, id)))
        || sameId(shift.id, excludedShiftId) || ['CANCELLED', 'DRAFT'].includes(shift.status)) return [];
    const interval = shiftIntervalVN(shift);
    if (!interval) throw new Error('Lịch làm của bạn có ca thiếu ngày hoặc giờ hợp lệ. Vui lòng liên hệ quản lý.');
    return intervalsOverlap(candidateInterval, interval) ? [{
      shift, interval,
      overlapStart: Math.max(candidateInterval.start, interval.start),
      overlapEnd: Math.min(candidateInterval.end, interval.end),
    }] : [];
  });
};

const localParts = (milliseconds) => {
  const date = new Date(milliseconds + VN_OFFSET_MS);
  const pad = (value) => String(value).padStart(2, '0');
  return {
    date: `${pad(date.getUTCDate())}/${pad(date.getUTCMonth() + 1)}/${date.getUTCFullYear()}`,
    time: `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`,
  };
};

export const formatIntervalVN = (interval) => {
  if (!interval) return 'Chưa xác định ngày giờ';
  const start = localParts(interval.start), end = localParts(interval.end);
  return start.date === end.date
    ? `${start.date} · ${start.time} – ${end.time}`
    : `${start.date} ${start.time} – ${end.date} ${end.time}`;
};
