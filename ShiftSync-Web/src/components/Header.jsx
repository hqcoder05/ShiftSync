import { useState, useRef, useEffect } from 'react';
import './Header.css';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import iconBell from '../assets/icons/icon-bell.png';
import iconDashboard from '../assets/icons/icon-dashboard.png';
import iconCalendar from '../assets/icons/icon-calendar.png';
import iconClock from '../assets/icons/icon-clock.png';
import iconReports from '../assets/icons/icon-reports.png';
import iconUser from '../assets/icons/icon-user.png';
import iconSettings from '../assets/icons/icon-settings.png';

const NAV_ITEMS = [
  { to: '/', label: 'DASHBOARD', icon: iconDashboard, key: 'dashboard' },
  { to: '/schedule', label: 'SCHEDULER', icon: iconCalendar, key: 'scheduler' },
  { to: '/attendance', label: 'ATTENDANCE', icon: iconClock, key: 'attendance' },
  { to: '/reports', label: 'REPORTS', icon: iconReports, key: 'reports', aliases: ['/request', '/requests'] },
  { to: '/employees', label: 'EMPLOYEES', icon: iconUser, key: 'employees', aliases: ['/skills', '/stores'] },
];

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('accessToken');
    setMenuOpen(false);
    navigate('/login');
  };

  const handleGoSettings = () => {
    setMenuOpen(false);
    navigate('/settings');
  };

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isSettingsActive = location.pathname === '/settings' || location.pathname === '/config';

  return (
    <header className="ss-header">
      <img src={iconBell} alt="Thông báo" className="ss-header-icon-img" />
      <nav className="ss-header-nav">
        {NAV_ITEMS.map(item => {
          const isCustomActive = item.aliases && item.aliases.includes(location.pathname);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => (isActive || isCustomActive ? 'active' : '')}
            >
              <img
                src={item.icon}
                alt=""
                className={`ss-nav-icon ${item.key === 'reports' ? 'ss-nav-icon-reports' : ''}`}
              />
              <span>{item.label}</span>
            </NavLink>
          );
        })}

        {/* Admin Portal Tab Button */}
        <NavLink
          to="/admin"
          className={({ isActive }) => `ss-admin-portal-link ${isActive ? 'active' : ''}`}
          title="Trang quản trị toàn hệ thống (Admin Portal)"
        >
          <span className="ss-admin-portal-badge">ADMIN</span>
        </NavLink>
      </nav>

      {/* Settings / Gear Icon with Dropdown */}
      <div className="ss-header-settings-wrapper" ref={menuRef}>
        <button
          className={`ss-header-icon ss-settings-btn ${isSettingsActive || menuOpen ? 'active' : ''}`}
          onClick={() => setMenuOpen(prev => !prev)}
          title="Cài đặt & Tuỳ chọn"
        >
          <img src={iconSettings} alt="Cài đặt" className="ss-header-icon-img" />
        </button>

        {menuOpen && (
          <div className="ss-dropdown-menu">
            <button
              className={`ss-dropdown-item ${location.pathname === '/admin' ? 'selected' : ''}`}
              onClick={() => {
                setMenuOpen(false);
                navigate('/admin');
              }}
            >
              <span>Quản Trị Hệ Thống (Admin)</span>
            </button>
            <button
              className={`ss-dropdown-item ${isSettingsActive ? 'selected' : ''}`}
              onClick={handleGoSettings}
            >
              <span>Cấu hình</span>
            </button>
            <div className="ss-dropdown-divider" />
            <button
              className="ss-dropdown-item ss-dropdown-logout"
              onClick={handleLogout}
            >
              <span>Đăng xuất</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}