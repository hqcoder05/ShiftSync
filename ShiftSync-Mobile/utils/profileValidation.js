export function normalizePersonalInfo(form) {
  const value = String(form.birthDate || '').trim();
  const match = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/) || value.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  const parts = match && (match[1].length === 4 ? [match[1], match[2], match[3]] : [match[3], match[2], match[1]]);
  return {
    phone: String(form.phone || '').replace(/[\s.-]/g, ''),
    birthDate: parts ? `${parts[0].padStart(4, '0')}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}` : null,
    birthPlace: String(form.birthPlace || '').trim(),
    gender: String(form.gender || '').trim(),
  };
}
export function validatePersonalInfo(form) {
  const errors = {};
  const phone = String(form.phone || '').replace(/[\s.-]/g, '');
  if (phone && !/^(?:0|\+84)(?:3|5|7|8|9)\d{8}$/.test(phone)) errors.phone = 'Số điện thoại Việt Nam chưa đúng định dạng.';
  const value = String(form.birthDate || '').trim();
  if (value) {
    const match = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/) || value.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    const parts = match && (match[1].length === 4 ? [match[1], match[2], match[3]] : [match[3], match[2], match[1]]).map(Number);
    const date = parts && new Date(`${String(parts[0]).padStart(4, '0')}-${String(parts[1]).padStart(2, '0')}-${String(parts[2]).padStart(2, '0')}T00:00:00+07:00`);
    const vietnam = date && new Date(date.getTime() + 7 * 3600000);
    if (!date || vietnam.getUTCFullYear() !== parts[0] || vietnam.getUTCMonth() !== parts[1] - 1 || vietnam.getUTCDate() !== parts[2] || date > new Date()) errors.birthDate = 'Ngày sinh không hợp lệ. Dùng DD/MM/YYYY hoặc YYYY-MM-DD.';
  }
  if (String(form.birthPlace || '').trim().length > 160) errors.birthPlace = 'Nơi sinh tối đa 160 ký tự.';
  if (form.gender && !['Nam', 'Nữ', 'Khác'].includes(form.gender)) errors.gender = 'Giới tính không hợp lệ.';
  return errors;
}
