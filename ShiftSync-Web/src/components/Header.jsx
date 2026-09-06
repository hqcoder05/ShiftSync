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
              className={`ss-dropdown-item ${isSettingsActive ? 'selected' : ''}`}
              onClick={handleGoSettings}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
              <span>Cấu hình</span>
            </button>
            <div className="ss-dropdown-divider" />
            <button
              className="ss-dropdown-item ss-dropdown-logout"
              onClick={handleLogout}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
              <span>Đăng xuất</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}