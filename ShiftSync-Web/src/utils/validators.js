export function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validatePassword(password) {
  return password.length >= 6;
}

export function validateLoginForm(email, password) {
  if (!validateEmail(email)) return 'Email không hợp lệ';
  if (!validatePassword(password)) return 'Mật khẩu tối thiểu 6 ký tự';
  return '';
}