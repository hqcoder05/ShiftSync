export function minuteOfDay(time = '00:00') {
  const [hours, minutes] = String(time).split(':').map(Number);
  return Number.isFinite(hours) && Number.isFinite(minutes) ? hours * 60 + minutes : 0;
}
export function getShiftTimeRange(shift) {
  if (!shift) return { start: 0, end: 1440 };
  const start = minuteOfDay(shift.startTime);
  let end = minuteOfDay(shift.endTime);
  if (end <= start) end += 1440;
  return { start, end };
}
export function formatShiftMinute(value) {
  const minute = ((Math.round(value) % 1440) + 1440) % 1440;
  return `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}${value >= 1440 ? ' (+1 ngày)' : ''}`;
}
export function isWithinShift(minute, shift) {
  const { start, end } = getShiftTimeRange(shift);
  return minute >= start && minute <= end;
}
