import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../services/authService';
import { validateLoginForm } from '../utils/validators';
import LoginMascot3DWeb from '../components/LoginMascot3DWeb';
import './LoginPage.css';

const LogoIcon = ({ size = 36, color = '#16A34A' }) => (
  <svg width={size} height={size} viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="3" width="10" height="4.5" rx="2" fill={color} />
    <rect x="15" y="3" width="11" height="4.5" rx="2" fill={color} fillOpacity="0.8" />
    <rect x="2" y="11.5" width="16" height="4.5" rx="2" fill={color} />
    <rect x="21" y="11.5" width="5" height="4.5" rx="2" fill={color} fillOpacity="0.6" />
    <rect x="2" y="20" width="7" height="4.5" rx="2" fill={color} fillOpacity="0.7" />
    <rect x="12" y="20" width="14" height="4.5" rx="2" fill={color} />
  </svg>
);

const MailIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="16" x="2" y="4" rx="2" />
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </svg>
);

const LockIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const EyeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
    <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
    <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
    <line x1="2" x2="22" y1="2" y2="22" />
  </svg>
);

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mascotStatus, setMascotStatus] = useState('idle');
  const navigate = useNavigate();

  const handleEmailFocus = () => {
    setMascotStatus('email');
  };

  const handleBlur = () => {
    setMascotStatus('idle');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const cleanEmail = email.trim().toLowerCase();
    const errMsg = validateLoginForm(cleanEmail, password);
    if (errMsg) {
      setError(errMsg);
      setMascotStatus('error');
      setTimeout(() => setMascotStatus('idle'), 2200);
      return;
    }

    setLoading(true);
    try {
      const res = await login(cleanEmail, password);
      const token = res.accessToken;
      localStorage.setItem('token', token);
      localStorage.setItem('accessToken', token);
      if (res.role) localStorage.setItem('userRole', res.role);
      if (res.email) localStorage.setItem('userEmail', res.email);
      localStorage.removeItem('selectedStoreId');

      setMascotStatus('success');
      setTimeout(() => {
        navigate('/');
      }, 1000);
    } catch (err) {
      setError(err.response?.data?.message || 'Sai email hoặc mật khẩu. Vui lòng thử lại!');
      setMascotStatus('error');
      setTimeout(() => setMascotStatus('idle'), 2200);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (demoEmail) => {
    setEmail(demoEmail);
    setPassword('password123');
    setError('');
    setMascotStatus('idle');
  };

  return (
    <div className="login-page">
      <div className="login-container">
        {/* Brand Header */}
        <div className="login-brand-header">
          <div className="login-logo-badge">
            <LogoIcon size={32} />
          </div>
          <h1 className="login-brand-title">ShiftSync</h1>
          <p className="login-brand-subtitle">Nền tảng Quản lý Ca làm & Lập lịch Thông minh</p>
        </div>

        {/* 🌟 3D Mascot tương tác */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: -15, overflow: 'visible' }}>
          <LoginMascot3DWeb
            status={mascotStatus}
            emailLength={email.length}
            width={260}
            height={160}
          />
        </div>

        {/* Login Form Card */}
        <div className="login-card">
          <div className="login-card-header">
            <h2 className="login-form-title">Đăng nhập tài khoản</h2>
            <p className="login-form-subtitle">Nhập thông tin xác thực để truy cập hệ thống</p>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            {/* Email Field */}
            <div className="login-field-group">
              <label htmlFor="login-email" className="login-label">
                Email công việc <span className="login-required">*</span>
              </label>
              <div className="login-input-wrapper">
                <span className="login-input-icon" aria-hidden="true">
                  <MailIcon />
                </span>
                <input
                  id="login-email"
                  type="email"
                  placeholder="name@shiftsync.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={handleEmailFocus}
                  onBlur={handleBlur}
                  disabled={loading}
                  className="login-input"
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="login-field-group">
              <div className="login-label-row">
                <label htmlFor="login-password" className="login-label">
                  Mật khẩu <span className="login-required">*</span>
                </label>
              </div>
              <div className="login-input-wrapper">
                <span className="login-input-icon" aria-hidden="true">
                  <LockIcon />
                </span>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setMascotStatus('password')}
                  onBlur={handleBlur}
                  disabled={loading}
                  className="login-input login-input-password"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="login-password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            {/* Error Notification Banner */}
            {error && (
              <div className="login-error-alert" role="alert">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="login-error-icon">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" x2="12" y1="8" y2="12" />
                  <line x1="12" x2="12.01" y1="16" y2="16" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* Submit CTA */}
            <button
              type="submit"
              disabled={loading}
              className={`login-submit-btn ${loading ? 'loading' : ''}`}
            >
              {loading ? (
                <>
                  <span className="ss-spinner" aria-hidden="true" />
                  <span>Đang đăng nhập...</span>
                </>
              ) : (
                <span>Đăng nhập hệ thống</span>
              )}
            </button>
          </form>

          <div className="login-quick-roles" style={{ marginTop: '18px', paddingTop: '14px', borderTop: '1px dashed #e2e8f0' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '8px', textAlign: 'center' }}>
              ⚡ Tài khoản thử nghiệm (Click để điền nhanh)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              <button
                type="button"
                onClick={() => handleQuickFill('manager@shiftsync.com')}
                style={{ fontSize: '11.5px', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f8fafc', cursor: 'pointer', textAlign: 'left' }}
              >
                🏢 <strong>QL Chi nhánh 1</strong><br /><span style={{ color: '#64748b' }}>manager@shiftsync.com</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('manager.store2@shiftsync.com')}
                style={{ fontSize: '11.5px', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f8fafc', cursor: 'pointer', textAlign: 'left' }}
              >
                🏬 <strong>QL Chi nhánh 2</strong><br /><span style={{ color: '#64748b' }}>manager.store2@...</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('admin@shiftsync.com')}
                style={{ fontSize: '11.5px', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f8fafc', cursor: 'pointer', textAlign: 'left' }}
              >
                👑 <strong>Quản trị viên</strong><br /><span style={{ color: '#64748b' }}>admin@shiftsync.com</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('emp01@shiftsync.com')}
                style={{ fontSize: '11.5px', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f8fafc', cursor: 'pointer', textAlign: 'left' }}
              >
                👤 <strong>Nhân viên</strong><br /><span style={{ color: '#64748b' }}>emp01@shiftsync.com</span>
              </button>
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8', textAlign: 'center', marginTop: '6px' }}>
              Mật khẩu mặc định: <strong style={{ color: '#475569' }}>password123</strong>
            </div>
          </div>

          <div className="login-card-footer">
            <span className="login-security-badge">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
              </svg>
              ShiftSync RBAC Security & SSO Ready
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}