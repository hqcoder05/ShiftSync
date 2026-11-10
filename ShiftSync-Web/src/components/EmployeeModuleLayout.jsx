import { Link, useLocation } from 'react-router-dom';
import { MODULE_TABS } from './employeeModuleTabs.js';
import './EmployeeModuleLayout.css';

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
