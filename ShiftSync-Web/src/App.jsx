import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import { WebSocketProvider } from './context/WebSocketContext';
import MainLayout from './layouts/MainLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import SchedulePage from './pages/SchedulePage';
import AttendancePage from './pages/AttendancePageLive';
import PayrollPage from './pages/PayrollPage';
import RequestPage from './pages/RequestPage';
import MarketplacePage from './pages/MarketplacePage';
import EmployeesPage from './pages/EmployeesPage';
import EmployeeDetailPage from './pages/EmployeeDetailPage';
import StoresPage from './pages/StoresPage';
import SkillsPage from './pages/SkillsPage';
import SettingsPage from './pages/SettingsPage';
import DemandPlanningPage from './pages/DemandPlanningPage';
import StaffAvailabilityPage from './pages/StaffAvailabilityPage';

function ManagerRoute({ children }) {
  const userRole = (localStorage.getItem('userRole') || 'STAFF').toUpperCase();
  if (userRole !== 'ADMIN' && userRole !== 'MANAGER') {
    return <Navigate to="/requests" replace />;
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

        <Route element={<MainLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/schedule" element={<SchedulePage />} />
          <Route path="/availability" element={<ManagerRoute><StaffAvailabilityPage /></ManagerRoute>} />
          <Route path="/staff-availability" element={<ManagerRoute><StaffAvailabilityPage /></ManagerRoute>} />
          <Route path="/demand-planning" element={<ManagerRoute><DemandPlanningPage /></ManagerRoute>} />
          <Route path="/quotas" element={<ManagerRoute><DemandPlanningPage /></ManagerRoute>} />
          <Route path="/attendance" element={<AttendancePage />} />
          <Route path="/marketplace" element={<MarketplacePage />} />
          <Route path="/payroll" element={<ManagerRoute><PayrollPage /></ManagerRoute>} />
          <Route path="/reports" element={<RequestPage />} />
          <Route path="/request" element={<RequestPage />} />
          <Route path="/requests" element={<RequestPage />} />
          <Route path="/employees" element={<ManagerRoute><EmployeesPage /></ManagerRoute>} />
          <Route path="/employees/:id" element={<ManagerRoute><EmployeeDetailPage /></ManagerRoute>} />
          <Route path="/employee/:id" element={<ManagerRoute><EmployeeDetailPage /></ManagerRoute>} />
          <Route path="/employees/profile" element={<ManagerRoute><EmployeeDetailPage /></ManagerRoute>} />
          <Route path="/stores" element={<ManagerRoute><StoresPage /></ManagerRoute>} />
          <Route path="/skills" element={<ManagerRoute><SkillsPage /></ManagerRoute>} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/config" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
    </WebSocketProvider>
    </ToastProvider>
  );
}
