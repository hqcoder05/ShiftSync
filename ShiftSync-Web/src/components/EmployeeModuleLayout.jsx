import { useLocation, useNavigate } from 'react-router-dom';
import './EmployeeModuleLayout.css';

export const MODULE_TABS = [
  {
    id: 'employees',
    label: 'Danh sách nhân viên',
    to: '/employees',
    isActive: (pathname, search) => pathname === '/employees' && !search.includes('tab=payroll'),
  },
  {
    id: 'payroll',
    label: 'Bảng lương (Payroll)',
    to: '/employees?tab=payroll',
    isActive: (pathname, search) => pathname === '/payroll' || (pathname === '/employees' && search.includes('tab=payroll')),
  },
  {
    id: 'skills',
    label: 'Vị trí & Mức lương',
    to: '/skills',
    isActive: (pathname) => pathname === '/skills',
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
  subtitle,
  actions,
  children,
  headerExtra,
  containerClassName = '',
}) {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className={`emp-module-wrapper ${containerClassName}`}>
      {/* ═══ 1. MODULE TAB BAR (HORIZONTAL NAVIGATION) ═══ */}
      <div className="emp-module-tabs-bar">
        <div className="emp-module-tabs-track" role="tablist">
          {MODULE_TABS.map((tab) => {
            const active = tab.isActive(location.pathname, location.search);
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                className={`emp-module-tab-item ${active ? 'active' : ''}`}
                onClick={() => {
                  if (!active) navigate(tab.to);
                }}
                aria-selected={active}
                tabIndex={active ? 0 : -1}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ═══ 2. MODULE CONTAINER (HEADER + CONTENT) ═══ */}
      <div className="emp-module-container">
        {(title || subtitle || actions) && (
          <div className="emp-module-header">
            <div className="emp-module-header-text">
              {title && <h1 className="emp-module-title">{title}</h1>}
              {subtitle && <p className="emp-module-subtitle">{subtitle}</p>}
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
