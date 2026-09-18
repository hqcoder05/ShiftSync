import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../services/authService';
import { validateLoginForm } from '../utils/validators';
import LoginMascot3DWeb from '../components/LoginMascot3DWeb';
import './LoginPage.css';

const LogoIcon = ({ size = 32, color = '#4CAF50' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect x="2" y="4" width="8" height="3" rx="1" fill={color} />
    <rect x="12" y="4" width="10" height="3" rx="1" fill={color} />
    <rect x="2" y="10" width="14" height="3" rx="1" fill={color} />
    <rect x="18" y="10" width="4" height="3" rx="1" fill={color} />
    <rect x="2" y="16" width="6" height="3" rx="1" fill={color} />
    <rect x="10" y="16" width="12" height="3" rx="1" fill={color} />
  </svg>
);

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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

    const errMsg = validateLoginForm(email, password);
    if (errMsg) { 
      setError(errMsg);
      setMascotStatus('error');
      setTimeout(() => setMascotStatus('idle'), 2200);
      return; 
    }

    try {
      const res = await login(email, password);
      const token = res.accessToken;
      localStorage.setItem('token', token);
      localStorage.setItem('accessToken', token);

      setMascotStatus('success');
      setTimeout(() => {
        navigate('/');
      }, 1200);
    } catch (err) {
      setError(err.response?.data?.message || 'Sai email hoặc mật khẩu');
      setMascotStatus('error');
      setTimeout(() => setMascotStatus('idle'), 2200);
    }
  };

  return (
    <div className="login-page">
      <div className="login-logo-row">
        <LogoIcon />
        <span className="login-logo-text">ShiftSync</span>
      </div>

      {/* 🌟 Mascot 3D tương tác theo form */}
      <div style={{ marginBottom: -10, overflow: 'visible' }}>
        <LoginMascot3DWeb
          status={mascotStatus}
          emailLength={email.length}
          width={280}
          height={180}
        />
      </div>

      <div className="login-card">
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onFocus={handleEmailFocus}
            onBlur={handleBlur}
            className="login-input"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onFocus={() => setMascotStatus('password')}
            onBlur={handleBlur}
            className="login-input"
          />
          {error && <p className="login-error">{error}</p>}
          <button type="submit" className="login-button">Login</button>
        </form>
      </div>
    </div>
  );
}