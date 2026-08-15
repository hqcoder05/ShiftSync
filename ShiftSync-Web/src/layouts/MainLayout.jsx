import { Outlet } from 'react-router-dom';
import Header from '../components/Header';

export default function MainLayout() {
  return (
    <div style={{ fontFamily: 'var(--ss-font)' }}>
      <Header />
      <main style={{ padding: '24px' }}>
        <Outlet />
      </main>
    </div>
  );
}