import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import { ConfirmationProvider } from './context/ConfirmationContext';
import { WebSocketProvider } from './context/WebSocketContext';
import { ThemeProvider } from './components/navbar/theme';
import MainLayout from './layouts/MainLayout';
import LegacyRequestRedirect from './components/LegacyRequestRedirect';
import './components/employee-module-redesign.css';
import './pages/attendance-redesign.css';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const SchedulePage = lazy(() => import('./pages/SchedulePage'));
const AttendancePage = lazy(() => import('./pages/AttendancePageLive'));
const ShiftTemplatesPage = lazy(() => import('./pages/ShiftTemplatesPage'));
const MarketplacePage = lazy(() => import('./pages/MarketplacePage'));
const EmployeesPage = lazy(() => import('./pages/EmployeesPage'));
const EmployeeDetailPage = lazy(() => import('./pages/EmployeeDetailPage'));
const StoresPage = lazy(() => import('./pages/StoresPage'));
const SkillsPage = lazy(() => import('./pages/SkillsPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const DemandPlanningPage = lazy(() => import('./pages/DemandPlanningPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const AvatarStudioPage = lazy(() => import('./pages/AvatarStudioPage'));
const routeLoadingStyle = {
  display: 'grid',
  minHeight: '40dvh',
  placeItems: 'center',
  color: 'var(--ss-tx, #1c1612)',
  fontSize: '0.9375rem',
};

function RouteLoadingFallback() {
  return <main aria-busy="true" aria-label="Đang tải nội dung" style={routeLoadingStyle}>Đang tải nội dung…</main>;
}

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function ManagerRoute({ children }) {
  const userRole = (localStorage.getItem('userRole') || 'STAFF').toUpperCase();
  if (userRole !== 'ADMIN' && userRole !== 'MANAGER') {
    return <Navigate to="/attendance" replace />;
  }
  return children;
}

function AdminRoute({ children }) {
  const userRole = (localStorage.getItem('userRole') || 'STAFF').toUpperCase();
  if (userRole !== 'ADMIN') {
    return <Navigate to="/" replace />;
  }
  return children;
}

export default function App() {
  return (
    <ThemeProvider initial="dark">
      <ToastProvider>
        <ConfirmationProvider>
        <WebSocketProvider>
          <BrowserRouter>
            <Suspense fallback={<RouteLoadingFallback />}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />

              <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/dashboard/reports" element={<Navigate to="/attendance" replace />} />
                <Route path="/dashboard/labor-cost" element={<Navigate to="/employees?tab=payroll" replace />} />

                <Route path="/schedule" element={<SchedulePage />} />
                <Route path="/schedule/templates" element={<ManagerRoute><ShiftTemplatesPage /></ManagerRoute>} />
                <Route path="/schedule/auto" element={<Navigate to="/schedule?action=auto" replace />} />
                <Route path="/availability" element={<Navigate to="/schedule?tab=availability" replace />} />
                <Route path="/staff-availability" element={<Navigate to="/schedule?tab=availability" replace />} />
                <Route path="/demand-planning" element={<ManagerRoute><DemandPlanningPage /></ManagerRoute>} />

                <Route path="/attendance" element={<AttendancePage />} />
                <Route path="/attendance/leave" element={<AttendancePage />} />
                <Route path="/attendance/explain" element={<AttendancePage />} />
                <Route path="/time-workforce" element={<LegacyRequestRedirect />} />

                <Route path="/marketplace" element={<MarketplacePage />} />
                <Route path="/marketplace/swaps" element={<Navigate to="/marketplace?tab=SWAP" replace />} />
                <Route path="/marketplace/history" element={<Navigate to="/marketplace?tab=FILLED" replace />} />

                <Route path="/payroll" element={<Navigate to="/employees?tab=payroll" replace />} />
                <Route path="/reports" element={<Navigate to="/attendance" replace />} />
                <Route path="/request" element={<LegacyRequestRedirect />} />
                <Route path="/requests" element={<LegacyRequestRedirect />} />
                <Route path="/notifications" element={<LegacyRequestRedirect />} />

                <Route path="/employees" element={<ManagerRoute><EmployeesPage /></ManagerRoute>} />
                <Route path="/employees/contracts" element={<ManagerRoute><EmployeesPage /></ManagerRoute>} />
                <Route path="/employees/skills" element={<ManagerRoute><SkillsPage /></ManagerRoute>} />
                <Route path="/employees/:id" element={<ManagerRoute><EmployeeDetailPage /></ManagerRoute>} />
                <Route path="/employee/:id" element={<ManagerRoute><EmployeeDetailPage /></ManagerRoute>} />
                <Route path="/employees/profile" element={<ManagerRoute><EmployeeDetailPage /></ManagerRoute>} />

                <Route path="/stores" element={<ManagerRoute><StoresPage /></ManagerRoute>} />
                <Route path="/skills" element={<ManagerRoute><SkillsPage /></ManagerRoute>} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/config" element={<SettingsPage />} />
                <Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />
                <Route path="/avatar-studio" element={<AvatarStudioPage />} />
              </Route>
            </Routes>
            </Suspense>
          </BrowserRouter>
        </WebSocketProvider>
        </ConfirmationProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
