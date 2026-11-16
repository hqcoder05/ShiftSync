import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import { ConfirmationProvider } from './context/ConfirmationContext';
import { WebSocketProvider } from './context/WebSocketContext';
import { ThemeProvider } from './components/navbar/theme';
import { AuthSessionProvider } from './context/AuthSessionContext';
import { useAuthSession } from './context/authSessionHooks';
import { getSessionRole } from './services/authSession';
import { canAccessSettingsScope, canAdministerSystem, canManageStore, getDefaultRoute, getDefaultSettingsRoute } from './utils/roleAccess';
import { SPATIAL_WORKSPACE_PATH } from './utils/spatialRoute';
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
const Store3DPage = lazy(() => import('./pages/Store3DPage'));
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
  const { ready, authenticated } = useAuthSession();
  const location = useLocation();
  if (!ready) return <RouteLoadingFallback />;
  if (!authenticated) {
    return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />;
  }
  return children;
}

function OperationsRoute({ children }) {
  const userRole = getSessionRole();
  if (!canManageStore(userRole)) {
    return <Navigate to={getDefaultRoute(userRole)} replace />;
  }
  return children;
}

function AdminRoute({ children }) {
  const userRole = getSessionRole();
  if (!canAdministerSystem(userRole)) {
    return <Navigate to={getDefaultRoute(userRole)} replace />;
  }
  return children;
}

function SettingsRoute({ scope, children }) {
  const userRole = getSessionRole();
  if (!canAccessSettingsScope(userRole, scope)) {
    return <Navigate to={getDefaultSettingsRoute(userRole)} replace />;
  }
  return children;
}

function RoleHome() {
  return <Navigate to={getDefaultRoute(getSessionRole())} replace />;
}

function SettingsHomeRedirect() {
  const location = useLocation();
  return <Navigate to={`${getDefaultSettingsRoute(getSessionRole())}${location.search}`} replace />;
}

export default function App() {
  return (
    <ThemeProvider initial="dark">
      <AuthSessionProvider>
      <ToastProvider>
        <ConfirmationProvider>
        <WebSocketProvider>
          <BrowserRouter>
            <Suspense fallback={<RouteLoadingFallback />}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />

              <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
                <Route path="/" element={<RoleHome />} />
                <Route path="/dashboard" element={<OperationsRoute><DashboardPage /></OperationsRoute>} />
                <Route path="/dashboard/reports" element={<Navigate to="/attendance" replace />} />
                <Route path="/dashboard/labor-cost" element={<Navigate to="/employees?tab=payroll" replace />} />

                <Route path="/schedule" element={<SchedulePage />} />
                <Route path={SPATIAL_WORKSPACE_PATH} element={<OperationsRoute><Store3DPage /></OperationsRoute>} />
                <Route path="/schedule/templates" element={<OperationsRoute><ShiftTemplatesPage /></OperationsRoute>} />
                <Route path="/schedule/auto" element={<Navigate to="/schedule?action=auto" replace />} />
                <Route path="/availability" element={<Navigate to="/schedule?tab=availability" replace />} />
                <Route path="/staff-availability" element={<Navigate to="/schedule?tab=availability" replace />} />
                <Route path="/demand-planning" element={<OperationsRoute><DemandPlanningPage /></OperationsRoute>} />

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

                <Route path="/employees" element={<OperationsRoute><EmployeesPage /></OperationsRoute>} />
                <Route path="/employees/contracts" element={<OperationsRoute><EmployeesPage /></OperationsRoute>} />
                <Route path="/employees/skills" element={<OperationsRoute><SkillsPage /></OperationsRoute>} />
                <Route path="/employees/:id" element={<OperationsRoute><EmployeeDetailPage /></OperationsRoute>} />
                <Route path="/employee/:id" element={<OperationsRoute><EmployeeDetailPage /></OperationsRoute>} />
                <Route path="/employees/profile" element={<OperationsRoute><EmployeeDetailPage /></OperationsRoute>} />

                <Route path="/stores" element={<OperationsRoute><StoresPage /></OperationsRoute>} />
                <Route path="/skills" element={<OperationsRoute><SkillsPage /></OperationsRoute>} />
                <Route path="/settings" element={<SettingsHomeRedirect />} />
                <Route path="/config" element={<SettingsHomeRedirect />} />
                <Route path="/settings/personal" element={<SettingsRoute scope="personal"><SettingsPage scope="personal" /></SettingsRoute>} />
                <Route path="/settings/store" element={<SettingsRoute scope="store"><SettingsPage scope="store" /></SettingsRoute>} />
                <Route path="/settings/system" element={<SettingsRoute scope="system"><SettingsPage scope="system" /></SettingsRoute>} />
                <Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />
                <Route path="/avatar-studio" element={<AvatarStudioPage />} />
              </Route>
            </Routes>
            </Suspense>
          </BrowserRouter>
        </WebSocketProvider>
        </ConfirmationProvider>
      </ToastProvider>
      </AuthSessionProvider>
    </ThemeProvider>
  );
}
