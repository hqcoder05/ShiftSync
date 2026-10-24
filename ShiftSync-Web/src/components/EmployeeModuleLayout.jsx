import { Link, useLocation } from 'react-router-dom';
import './EmployeeModuleLayout.css';

export const MODULE_TABS = [
  {
    id: 'employees',
    label: 'Danh sách nhân viên',
    to: '/employees',
    isActive: (pathname, search) => pathname === '/employees' && !search.includes('tab=payroll'),
  },
  {
    id: 'contracts',
    label: 'Hợp đồng',
    to: '/employees/contracts',
    isActive: (pathname) => pathname === '/employees/contracts',
  },
  {
    id: 'payroll',
    label: 'Bảng lương (Payroll)',
    to: '/employees?tab=payroll',
    isActive: (pathname, search) => pathname === '/payroll' || (pathname === '/employees' && search.includes('tab=payroll')),
  },
  {
    id: 'skills',
    label: 'Vị trí & kỹ năng',
    to: '/employees/skills',
    isActive: (pathname) => pathname === '/skills' || pathname === '/employees/skills',
  },
  {
    id: 'stores',
    label: 'Chi nhánh',
    to: '/stores',
    isActive: (pathname) => pathname === '/stores',
  },
];

export default function EmployeeModuleLayout({
  title,
  actions,
  children,
  headerExtra,
  containerClassName = '',
}) {
  const location = useLocation();

  return (
    <div className={`emp-module-wrapper ${containerClassName}`}>
      {/* ═══ 1. MODULE TAB BAR (HORIZONTAL NAVIGATION) ═══ */}
      <div className="emp-module-tabs-bar">
        <nav className="emp-module-tabs-track" aria-label="Phân hệ nhân sự">
          {MODULE_TABS.map((tab) => {
            const active = tab.isActive(location.pathname, location.search);
            return (
              <Link key={tab.id} to={tab.to} className={`emp-module-tab-item ${active ? 'active' : ''}`} aria-current={active ? 'page' : undefined}>{tab.label}</Link>
            );
          })}
        </nav>
      </div>

      {/* ═══ 2. MODULE CONTAINER (HEADER + CONTENT) ═══ */}
      <div className="emp-module-container">
        {(title || actions) && (
          <div className="emp-module-header">
            <div className="emp-module-header-text">
              {title && <h1 className="emp-module-title">{title}</h1>}
            </div>
            {actions && <div className="emp-module-actions">{actions}</div>}
          </div>
        )}

        {headerExtra}

        <div className="emp-module-body">
          {children}
        </div>
      </div>
    </div>
  );
}
