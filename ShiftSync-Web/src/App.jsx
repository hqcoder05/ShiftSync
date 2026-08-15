import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import SchedulePage from './pages/SchedulePage';
import AttendancePage from './pages/AttendancePage';
import PayrollPage from './pages/PayrollPage';
import RequestPage from './pages/RequestPage';
import EmployeesPage from './pages/EmployeesPage';
import StoresPage from './pages/StoresPage';
import SkillsPage from './pages/SkillsPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<MainLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/schedule" element={<SchedulePage />} />
          <Route path="/attendance" element={<AttendancePage />} />
          <Route path="/payroll" element={<PayrollPage />} />
          <Route path="/request" element={<RequestPage />} />
          <Route path="/employees" element={<EmployeesPage />} />
          <Route path="/stores" element={<StoresPage />} />
          <Route path="/skills" element={<SkillsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}