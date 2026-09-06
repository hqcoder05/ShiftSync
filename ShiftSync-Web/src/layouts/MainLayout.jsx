import { Outlet, Navigate } from 'react-router-dom';
import Header from '../components/Header';

export default function MainLayout() {
  const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div style={{ fontFamily: 'var(--ss-font)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header />
      <main style={{ padding: 0, flex: 1 }}>
        <Outlet />
      </main>
    </div>
  );
}