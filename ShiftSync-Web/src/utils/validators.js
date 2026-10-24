export function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validatePassword(password) {
  return Boolean(password && password.trim());
}

export function validateLoginForm(email, password) {
  if (!validateEmail(email)) return 'Email không hợp lệ';
  if (!validatePassword(password)) return 'Vui lòng nhập mật khẩu';
  return '';
}
