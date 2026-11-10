const dayKey = (date) => {
  const vietnamDate = new Date(date.getTime() + 7 * 3600000);
  return `${vietnamDate.getUTCFullYear()}-${String(vietnamDate.getUTCMonth() + 1).padStart(2, '0')}-${String(vietnamDate.getUTCDate()).padStart(2, '0')}`;
};
export function isAttendanceDateCurrent(shift, now = new Date()) {
  if (!shift?.shiftDate) return false;
  if (shift.shiftDate === dayKey(now)) return true;
  if (String(shift.endTime) >= String(shift.startTime)) return false;
  const nextDay = new Date(`${shift.shiftDate}T12:00:00+07:00`);
  nextDay.setTime(nextDay.getTime() + 86400000);
  return dayKey(nextDay) === dayKey(now);
}
export function selectAttendanceShift(shifts, attendance, pending = [], now = new Date()) {
  const available = (shifts || []).filter((shift) => ['PUBLISHED', 'COMPLETED'].includes(shift.status) && isAttendanceDateCurrent(shift, now));
  const recordFor = (shift) => (attendance || []).find((record) => String(record.shiftId) === String(shift.id));
  const open = available.find((shift) => {
    const record = recordFor(shift);
    const events = pending.filter((event) => String(event.shiftId) === String(shift.id) && event.status !== 'blocked');
    return (record?.checkInTime || events.some((event) => event.action === 'CHECK_IN')) && !record?.checkOutTime && !events.some((event) => event.action === 'CHECK_OUT');
  });
  if (open) return open;
  const today = available.filter((shift) => shift.shiftDate === dayKey(now));
  const unstarted = today.filter((shift) => !recordFor(shift)?.checkInTime && !pending.some((event) =>
    String(event.shiftId) === String(shift.id) && event.status !== 'blocked' && event.action === 'CHECK_IN'));
  // Select only from this employee's assigned shifts today, including split shifts.
  unstarted.sort((a, b) => Math.abs(new Date(`${a.shiftDate}T${a.startTime}+07:00`).getTime() - now.getTime()) - Math.abs(new Date(`${b.shiftDate}T${b.startTime}+07:00`).getTime() - now.getTime()));
  return unstarted[0] || today[today.length - 1] || null;
}
