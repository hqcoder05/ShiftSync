import './Header.css';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import iconBell from '../assets/icons/icon-bell.png';
import iconDashboard from '../assets/icons/icon-dashboard.png';
import iconCalendar from '../assets/icons/icon-calendar.png';
import iconClock from '../assets/icons/icon-clock.png';
import iconReports from '../assets/icons/icon-reports.png';
import iconSettings from '../assets/icons/icon-settings.png';

const NAV_ITEMS = [
  { to: '/', label: 'DASHBOARD', icon: iconDashboard, key: 'dashboard' },
  { to: '/schedule', label: 'SCHEDULER', icon: iconCalendar, key: 'scheduler' },
  { to: '/attendance', label: 'ATTENDANCE', icon: iconClock, key: 'attendance' },
  { to: '/reports', label: 'REPORTS', icon: iconReports, key: 'reports', aliases: ['/request', '/requests'] },
];

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    navigate('/login');
  };

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
      <button className="ss-header-icon ss-logout" onClick={handleLogout} title="Đăng xuất">
        <img src={iconSettings} alt="Cài đặt" className="ss-header-icon-img" />
      </button>
    </header>
  );
}