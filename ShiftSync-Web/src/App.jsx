import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import { WebSocketProvider } from './context/WebSocketContext';
import MainLayout from './layouts/MainLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import SchedulePage from './pages/SchedulePage';
import AttendancePage from './pages/AttendancePageLive';
import RequestPage from './pages/RequestPage';
import MarketplacePage from './pages/MarketplacePage';
import EmployeesPage from './pages/EmployeesPage';
import EmployeeDetailPage from './pages/EmployeeDetailPage';
import StoresPage from './pages/StoresPage';
import SkillsPage from './pages/SkillsPage';
import SettingsPage from './pages/SettingsPage';
import DemandPlanningPage from './pages/DemandPlanningPage';
import AdminPage from './pages/AdminPage';

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
    return <Navigate to="/time-workforce" replace />;
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
    <ToastProvider>
      <WebSocketProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/schedule" element={<SchedulePage />} />
              {/* Legacy URL redirects → new nav structure */}
              <Route path="/availability" element={<Navigate to="/schedule?tab=availability" replace />} />
              <Route path="/staff-availability" element={<Navigate to="/schedule?tab=availability" replace />} />
              <Route path="/demand-planning" element={<ManagerRoute><DemandPlanningPage /></ManagerRoute>} />
              <Route path="/time-workforce" element={<AttendancePage />} />
              <Route path="/attendance" element={<Navigate to="/time-workforce" replace />} />
              <Route path="/marketplace" element={<MarketplacePage />} />
              {/* Payroll → Employees with payroll tab */}
              <Route path="/payroll" element={<Navigate to="/employees?tab=payroll" replace />} />
              {/* Requests → Time & Workforce (requests are handled within that domain) */}
              <Route path="/reports" element={<Navigate to="/time-workforce" replace />} />
              <Route path="/request" element={<Navigate to="/time-workforce" replace />} />
              <Route path="/requests" element={<RequestPage />} />
              <Route path="/employees" element={<ManagerRoute><EmployeesPage /></ManagerRoute>} />
              <Route path="/employees/:id" element={<ManagerRoute><EmployeeDetailPage /></ManagerRoute>} />
              <Route path="/employee/:id" element={<ManagerRoute><EmployeeDetailPage /></ManagerRoute>} />
              <Route path="/employees/profile" element={<ManagerRoute><EmployeeDetailPage /></ManagerRoute>} />
              <Route path="/stores" element={<ManagerRoute><StoresPage /></ManagerRoute>} />
              <Route path="/skills" element={<ManagerRoute><SkillsPage /></ManagerRoute>} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/config" element={<SettingsPage />} />
              <Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />
            </Route>
          </Routes>
        </BrowserRouter>
      </WebSocketProvider>
    </ToastProvider>
  );
}

