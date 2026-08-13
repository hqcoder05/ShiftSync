import { Link } from 'react-router-dom';

export default function Sidebar() {
  return (
    <nav style={{ width: '200px', padding: '16px', borderRight: '1px solid #ddd' }}>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        <li><Link to="/">Dashboard</Link></li>
        <li><Link to="/schedule">Lịch làm việc</Link></li>
        <li><Link to="/attendance">Điểm danh</Link></li>
        <li><Link to="/payroll">Phiếu lương</Link></li>
        <li><Link to="/request">Yêu cầu</Link></li>
      </ul>
    </nav>
  );
}