export const APP_TIME_ZONE = 'Asia/Ho_Chi_Minh';
const OFFSET = 7 * 3600000;
const pad = (value) => String(value).padStart(2, '0');

// A work date is a civil date, not a UTC timestamp or the device's current day.
export function vietnamDateKey(value = new Date()) {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return validDateKey(value) ? value : '';
  const date = parseVietnamInstant(value);
  if (!date) return '';
  const vn = new Date(date.getTime() + OFFSET);
  return `${vn.getUTCFullYear()}-${pad(vn.getUTCMonth() + 1)}-${pad(vn.getUTCDate())}`;
}
export function validDateKey(key) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(key))) return false;
  const date = new Date(`${key}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === key;
}
export function parseVietnamInstant(value) {
  if (value == null || value === '') return null;
  let raw = value;
  // Legacy timestamp without offset is interpreted as Vietnam wall time.
  if (typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(raw) && !/(Z|[+-]\d{2}:?\d{2})$/i.test(raw)) raw += '+07:00';
  const date = new Date(raw);
  return Number.isFinite(date.getTime()) ? date : null;
}
// UI Date pickers require a local Date. This carrier contains only a civil day;
// never serialize its timestamp or use it to decide whether a shift has begun.
export function calendarDate(key) {
  if (!validDateKey(key)) return null;
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day, 12);
}
export const vietnamCalendarDate = (now = new Date()) => calendarDate(vietnamDateKey(now));
export const calendarKey = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
export function shiftCalendarMonth(key, offset) {
  if (!validDateKey(key) || !Number.isInteger(offset)) return '';
  const date = new Date(`${key}T12:00:00Z`);
  date.setUTCDate(1); date.setUTCMonth(date.getUTCMonth() + offset);
  return date.toISOString().slice(0, 10);
}
export const calendarDayDifference = (a, b) => (Date.parse(`${calendarKey(a)}T00:00:00Z`) - Date.parse(`${calendarKey(b)}T00:00:00Z`)) / 86400000;
export function formatVietnamTime(value, options = {}, locale = 'vi-VN', fallback = '—') {
  const date = parseVietnamInstant(value);
  if (!date) return fallback;
  return new Intl.DateTimeFormat(locale, { ...options, timeZone: APP_TIME_ZONE }).format(date);
}
export const vietnamHour = (now = new Date()) => new Date(new Date(now).getTime() + OFFSET).getUTCHours();
