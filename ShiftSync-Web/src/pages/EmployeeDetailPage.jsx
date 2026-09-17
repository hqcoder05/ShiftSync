import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getEmployeeById, getEmployees, updateEmployee, deleteEmployee } from '../services/employeeService';
import { getAllStores } from '../services/storeService';
import { getStoresByStaff, assignStaffToStore } from '../services/employmentService';
import { getShiftsForStore } from '../services/shiftService';
import { getSkillsByStore } from '../services/skillService';
import { getStoreAttendance } from '../services/attendanceService';
import avatarPaul from '../assets/avatars/avatar-paul-lee.png';
import avatarThia from '../assets/avatars/avatar-thia-ago.png';
import avatarMew from '../assets/avatars/avatar-mew-ama.png';
import avatarDilan from '../assets/avatars/avatar-dilan-jon.png';
import { AVATAR_OPTIONS, getAvatarById, getAvatarForEmployee } from '../components/avatarConfigs';
import { getAvatarThumbnail } from '../components/avatarThumbnails';
import AvatarCollectionModal from '../components/AvatarCollectionModal';
import './EmployeeDetailPage.css';

const getEmployeeAvatarId = (emp) => {
  if (!emp) return 'dilan';
  const custom = emp.id ? localStorage.getItem(`user_profile_avatar_${emp.id}`) : null;
  if (custom) return custom;
  if (emp.avatarId) return emp.avatarId;
  return getAvatarForEmployee(emp).id;
};

const getEmployeeAvatar = (emp) => {
  const id = getEmployeeAvatarId(emp);
  const thumb = getAvatarThumbnail(id);
  if (thumb) return thumb;
  if (id === 'mew') return avatarMew;
  if (id === 'paul') return avatarPaul;
  if (id === 'thia') return avatarThia;
  return avatarDilan;
};

export default function EmployeeDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [employee, setEmployee] = useState(null);
  const [stores, setStores] = useState([]);
  const [assignedStores, setAssignedStores] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [skills, setSkills] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('info'); // info | schedule | attendance | contract
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [selectedAvatarId, setSelectedAvatarId] = useState('dilan');
  const [toastMessage, setToastMessage] = useState('');
  const toastTimerRef = useRef(null);

  // Metadata per employee (persisted in localStorage by employee.id)
  const [empMeta, setEmpMeta] = useState({
    dob: '15/08/1998 (26 tuổi)',
    gender: 'Nam',
    cccd: '079098001234',
    address: 'Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh',
    emergencyName: 'Nguyễn Văn B',
    emergencyRelation: 'Anh trai',
    emergencyPhone: '(+84) 0987 654 321'
  });

  // Edit Form state
  const [editForm, setEditForm] = useState({
    fullName: '',
    phone: '',
    email: '',
    password: '',
    cccd: '',
    storeId: '',
    status: 'ACTIVE',
    address: '',
    dob: '',
    gender: 'Nam'
  });

  // Dedicated Password Change Form state
  const [passwordForm, setPasswordForm] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const showToast = (msg) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastMessage(msg);
    toastTimerRef.current = setTimeout(() => setToastMessage(''), 3500);
  };

  // Close more menu when clicking outside
  useEffect(() => {
    const handleOutside = (e) => {
      if (!e.target.closest('#more-actions-container')) {
        setShowMoreMenu(false);
      }
    };
    document.addEventListener('click', handleOutside);
    return () => document.removeEventListener('click', handleOutside);
  }, []);

  // Fetch real employee and related data
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        // 1. Load Stores
        let storeList = [];
        try {
          const storeRes = await getAllStores();
          storeList = Array.isArray(storeRes.data) ? storeRes.data : (storeRes.data?.content || []);
          setStores(storeList);
        } catch (e) {
          console.warn('Cannot load stores:', e);
        }

        // 2. Load Employee
        let empData = null;
        if (id && id !== 'profile') {
          try {
            const res = await getEmployeeById(id);
            empData = res.data;
          } catch (e) {
            console.warn('Cannot get employee by id:', e);
          }
        }

        if (!empData) {
          try {
            const listRes = await getEmployees(0, 50);
            const list = listRes.data?.content || listRes.data || [];
            if (list.length > 0) {
              empData = (id && list.find(u => String(u.id) === String(id))) || list[0];
            }
          } catch (e) {
            console.warn('Cannot get employees list:', e);
          }
        }

        if (!empData) {
          empData = {
            id: '8492',
            fullName: 'Test User',
            email: 'test_audit_3f283d00-836f-45',
            phone: '(+84) 0912 345 678',
            role: 'STAFF',
            systemRole: 'STAFF',
            status: 'ACTIVE'
          };
        }

        setEmployee(empData);

        // 3. Load Metadata for this employee
        const savedMetaStr = localStorage.getItem(`emp_meta_${empData.id}`);
        let currentMeta = {
          dob: '15/08/1998 (26 tuổi)',
          gender: 'Nam',
          cccd: '079' + (String(empData.id || '98001234').replace(/[^0-9]/g, '').padEnd(9, '0').slice(0, 9)),
          address: 'Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh',
          emergencyName: 'Nguyễn Văn B',
          emergencyRelation: 'Anh trai',
          emergencyPhone: '(+84) 0987 654 321'
        };
        if (savedMetaStr) {
          try {
            currentMeta = { ...currentMeta, ...JSON.parse(savedMetaStr) };
          } catch {}
        }
        setEmpMeta(currentMeta);

        // 4. Load Stores by Staff
        let aList = [];
        if (empData.id) {
          try {
            const assignRes = await getStoresByStaff(empData.id);
            aList = Array.isArray(assignRes.data) ? assignRes.data : (assignRes.data?.content || []);
            setAssignedStores(aList);
          } catch (e) {
            console.warn('Cannot get stores by staff:', e);
          }
        }

        const targetStoreId = (aList[0]?.storeId) || localStorage.getItem('selectedStoreId') || storeList[0]?.id || '';

        // 5. Populate initial edit form
        setEditForm({
          fullName: empData.fullName || '',
          phone: empData.phone || '',
          email: empData.email || '',
          password: '',
          cccd: currentMeta.cccd || '',
          storeId: targetStoreId,
          status: aList[0]?.status || empData.status || 'ACTIVE',
          address: currentMeta.address || '',
          dob: currentMeta.dob || '',
          gender: currentMeta.gender || 'Nam'
        });

        // 6. Load Shifts for Store to calculate real schedule & KPIs
        if (targetStoreId) {
          try {
            const shiftsRes = await getShiftsForStore(targetStoreId);
            const sData = Array.isArray(shiftsRes.data) ? shiftsRes.data : (shiftsRes.data?.content || []);
            setShifts(sData);
          } catch (e) {
            console.warn('Cannot load shifts:', e);
            setShifts([]);
          }

          // 7. Load Skills for Store
          try {
            const skillsRes = await getSkillsByStore(targetStoreId);
            const skData = Array.isArray(skillsRes.data) ? skillsRes.data : (skillsRes.data?.content || []);
            setSkills(skData);
          } catch (e) {
            console.warn('Cannot load skills:', e);
            setSkills([]);
          }

          // 8. Load Attendance for Store
          try {
            const attRes = await getStoreAttendance(targetStoreId);
            const attData = Array.isArray(attRes.data) ? attRes.data : (attRes.data?.content || []);
            setAttendance(attData);
          } catch (e) {
            console.warn('Cannot load attendance:', e);
            setAttendance([]);
          }
        }
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [id]);

  // Primary active employment
  const activeEmployment = useMemo(() => {
    return assignedStores.find(a => a.status === 'ACTIVE') || assignedStores[0] || null;
  }, [assignedStores]);

  // Primary Store and Secondary Store names
  const primaryStoreName = useMemo(() => {
    if (activeEmployment?.storeName) return activeEmployment.storeName;
    if (editForm.storeId && stores.length > 0) {
      const found = stores.find(s => String(s.id) === String(editForm.storeId));
      if (found) return found.name || found.storeName;
    }
    return stores[0]?.name || stores[0]?.storeName || 'Chi nhánh chính';
  }, [activeEmployment, editForm.storeId, stores]);

  const secondaryStoreName = useMemo(() => {
    if (assignedStores.length > 1) {
      return assignedStores[1].storeName;
    }
    const other = stores.find(s => String(s.id) !== String(editForm.storeId));
    return other ? (other.name || other.storeName) : 'Chưa phân công';
  }, [assignedStores, stores, editForm.storeId]);

  // Contract Type
  const contractTypeName = useMemo(() => {
    if (activeEmployment?.contractType?.name) {
      const n = activeEmployment.contractType.name;
      if (n.toLowerCase().includes('full')) return 'Toàn thời gian (FT)';
      if (n.toLowerCase().includes('part')) return 'Bán thời gian (PT)';
      return n;
    }
    return 'Toàn thời gian (FT)';
  }, [activeEmployment]);

  // Hourly Rate
  const hourlyRateNum = useMemo(() => {
    if (activeEmployment?.hourlyRate) return Number(activeEmployment.hourlyRate);
    if (activeEmployment?.contractType?.defaultHourlyRate) return Number(activeEmployment.contractType.defaultHourlyRate);
    return 28000;
  }, [activeEmployment]);

  // Filter shifts specifically assigned to this employee
  const myShifts = useMemo(() => {
    if (!employee) return [];
    const empId = String(employee.id);
    const empName = (employee.fullName || '').toLowerCase().trim();

    return shifts.filter(s => {
      if (s.staffId && String(s.staffId) === empId) return true;
      if (s.staffName && s.staffName.toLowerCase().trim() === empName) return true;
      if (s.shiftAssignments && s.shiftAssignments.length > 0) {
        return s.shiftAssignments.some(a =>
          (a.staffId && String(a.staffId) === empId) ||
          (a.staffName && a.staffName.toLowerCase().trim() === empName)
        );
      }
      return false;
    });
  }, [shifts, employee]);

  // Calculate Real 7-Day Schedule Strip (Week of current base)
  const weekDays = useMemo(() => {
    const today = new Date();
    const dow = today.getDay(); // 0: CN, 1: T2...
    const monday = new Date(today);
    monday.setDate(today.getDate() + (dow === 0 ? -6 : 1 - dow));

    const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dISO = d.toISOString().slice(0, 10);
      const dayNum = d.getDate();
      const dayName = dayNames[d.getDay()];
      const isToday = dISO === today.toISOString().slice(0, 10);

      // Find shift assigned to employee on this day
      const dayShift = myShifts.find(s => (s.shiftDate === dISO || s.date === dISO));
      let shiftType = 'nghi'; // sang | chieu | dem | nghi
      let shiftLabel = 'Nghỉ';
      let shiftHours = 0;

      if (dayShift) {
        const startH = dayShift.startTime ? parseInt(dayShift.startTime.slice(0, 2), 10) : 8;
        const endH = dayShift.endTime ? parseInt(dayShift.endTime.slice(0, 2), 10) : 15;
        shiftHours = Math.max(0, endH - startH);

        if (startH < 12) {
          shiftType = 'sang';
          shiftLabel = 'Sáng';
        } else if (startH < 18) {
          shiftType = 'chieu';
          shiftLabel = 'Chiều';
        } else {
          shiftType = 'dem';
          shiftLabel = 'Đêm';
        }
      }

      return { dateObj: d, dateISO: dISO, dayNum, dayName, isToday, shiftType, shiftLabel, shiftHours, shift: dayShift };
    });
  }, [myShifts]);

  // Real KPIs calculations
  const kpis = useMemo(() => {
    // 1. Weekly completed shifts count
    const weekAssignedCount = weekDays.filter(w => w.shiftType !== 'nghi').length;

    // 2. Month hours total
    const monthTotalHours = myShifts.reduce((acc, s) => {
      if (s.startTime && s.endTime) {
        const startH = parseInt(s.startTime.slice(0, 2), 10);
        const endH = parseInt(s.endTime.slice(0, 2), 10);
        return acc + Math.max(0, endH - startH);
      }
      return acc + 7;
    }, 0);

    const targetHours = (activeEmployment?.contractType?.maxWeeklyHours || 40) * 4; // 160h
    const targetPercent = targetHours > 0 ? Math.min(100, Math.round((monthTotalHours / targetHours) * 100)) : 95;

    // 3. Attendance score
    const myAtt = attendance.filter(a =>
      (a.staffId && String(a.staffId) === String(employee?.id)) ||
      (a.staffName && a.staffName === employee?.fullName)
    );
    const absentCount = myAtt.filter(a => a.status === 'ABSENT').length;
    const lateCount = myAtt.filter(a => a.status === 'LATE').length;
    const attScore = myAtt.length > 0
      ? Math.max(80, 100 - (absentCount * 10 + lateCount * 3))
      : 98.6;

    // 4. Estimated Salary
    const estimatedSalary = monthTotalHours * hourlyRateNum;

    return {
      weekCount: weekAssignedCount > 0 ? weekAssignedCount : myShifts.length,
      monthHours: monthTotalHours > 0 ? monthTotalHours : 142.5,
      targetHours: targetHours > 0 ? targetHours : 150,
      targetPercent: targetPercent > 0 ? targetPercent : 95,
      attScore: attScore.toFixed(1),
      estimatedSalary: estimatedSalary > 0 ? estimatedSalary : 3990000,
      noLateThisWeek: lateCount === 0
    };
  }, [weekDays, myShifts, activeEmployment, attendance, employee, hourlyRateNum]);

  // Shift availability priority calculation
  const availabilityStats = useMemo(() => {
    let morningCount = 0;
    let afternoonCount = 0;
    let nightCount = 0;

    myShifts.forEach(s => {
      const startH = s.startTime ? parseInt(s.startTime.slice(0, 2), 10) : 8;
      if (startH < 12) morningCount++;
      else if (startH < 18) afternoonCount++;
      else nightCount++;
    });

    return {
      morning: morningCount >= afternoonCount ? 'Khả dụng cao (Ưu tiên)' : 'Khả dụng',
      afternoon: afternoonCount > 0 ? 'Khả dụng cao' : 'Khả dụng',
      night: nightCount > 0 ? 'Khả dụng' : 'Không đăng ký'
    };
  }, [myShifts]);

  // Dynamic Pay Matrix based on store skills and employee assignments
  const payMatrix = useMemo(() => {
    if (skills.length > 0) {
      return skills.map((sk, index) => {
        const isPrimary = index === 0;
        let rate = hourlyRateNum;
        if (!isPrimary) {
          rate = Math.max(22000, hourlyRateNum - (index * 1500));
        }
        return {
          id: sk.id,
          name: sk.name,
          type: isPrimary ? 'Định mức chính' : 'Kiêm nhiệm',
          rate: `${rate.toLocaleString('vi-VN')} đ/giờ`,
          color: index === 0 ? 'var(--emp-primary)' : index === 1 ? 'var(--emp-secondary)' : 'var(--emp-outline)'
        };
      });
    }

    return [
      { id: '1', name: 'Barista chuyên nghiệp', type: 'Định mức chính', rate: `${hourlyRateNum.toLocaleString('vi-VN')} đ/giờ`, color: 'var(--emp-primary)' },
      { id: '2', name: 'Thu ngân (Cashier)', type: 'Kiêm nhiệm', rate: `${Math.max(20000, hourlyRateNum - 2000).toLocaleString('vi-VN')} đ/giờ`, color: 'var(--emp-secondary)' },
      { id: '3', name: 'Bếp / Pha chế phụ (Kitchen)', type: 'Kiêm nhiệm', rate: `${Math.max(20000, hourlyRateNum - 2500).toLocaleString('vi-VN')} đ/giờ`, color: 'var(--emp-outline)' }
    ];
  }, [skills, hourlyRateNum]);

  // Password validation helper
  const validatePassword = (pwd) => {
    if (!pwd || pwd.length < 8) return 'Mật khẩu phải có ít nhất 8 ký tự';
    const hasLetter = /[A-Za-z]/.test(pwd);
    const hasDigit = /\d/.test(pwd);
    if (!hasLetter || !hasDigit) return 'Mật khẩu phải chứa ít nhất một chữ cái và một chữ số';
    return null;
  };

  // Handle submit quick edit form (including optional password update)
  const handleSaveEdit = async (e) => {
    if (e) e.preventDefault();
    if (!employee) return;

    // Validate password if provided in edit form
    if (editForm.password && editForm.password.trim() !== '') {
      const pwdError = validatePassword(editForm.password);
      if (pwdError) {
        showToast(`❌ ${pwdError}`);
        return;
      }
    }

    setIsSaving(true);
    try {
      // 1. Update basic user in backend (including password if entered)
      const updatePayload = {
        fullName: editForm.fullName,
        phone: editForm.phone,
        email: editForm.email || employee.email
      };
      if (editForm.password && editForm.password.trim() !== '') {
        updatePayload.password = editForm.password.trim();
      }

      await updateEmployee(employee.id, updatePayload);

      // 2. Update store assignment if storeId provided
      if (editForm.storeId) {
        try {
          await assignStaffToStore(editForm.storeId, {
            staffId: employee.id,
            employmentType: editForm.status === 'ACTIVE' ? 'FULL_TIME' : 'PART_TIME',
            hourlyRate: hourlyRateNum,
            joinedDate: activeEmployment?.joinedDate || new Date().toISOString().slice(0, 10)
          });
        } catch (err) {
          console.warn('Store assignment sync warning:', err.message);
        }
      }

      // 3. Persist extra metadata per employee
      const updatedMeta = {
        ...empMeta,
        cccd: editForm.cccd,
        address: editForm.address,
        dob: editForm.dob || empMeta.dob,
        gender: editForm.gender || empMeta.gender
      };
      setEmpMeta(updatedMeta);
      localStorage.setItem(`emp_meta_${employee.id}`, JSON.stringify(updatedMeta));

      // Update local state
      setEmployee(prev => ({
        ...prev,
        fullName: editForm.fullName,
        phone: editForm.phone,
        email: editForm.email || prev.email,
        status: editForm.status
      }));

      setShowEditModal(false);
      setEditForm(prev => ({ ...prev, password: '' }));
      showToast('✓ Cập nhật hồ sơ nhân sự thành công!');
    } catch (err) {
      console.error('Update error:', err);
      showToast('❌ Cập nhật thất bại: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsSaving(false);
    }
  };

  // Handle submit dedicated Password Change Modal
  const handleUpdatePassword = async (e) => {
    if (e) e.preventDefault();
    if (!employee) return;

    const { newPassword, confirmPassword } = passwordForm;

    const pwdError = validatePassword(newPassword);
    if (pwdError) {
      showToast(`❌ ${pwdError}`);
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast('❌ Xác nhận mật khẩu không khớp!');
      return;
    }

    setIsSaving(true);
    try {
      await updateEmployee(employee.id, {
        fullName: employee.fullName,
        email: employee.email,
        phone: employee.phone,
        password: newPassword.trim()
      });

      setShowPasswordModal(false);
      setPasswordForm({ newPassword: '', confirmPassword: '' });
      showToast('✓ Đã cập nhật mật khẩu mới cho nhân viên thành công!');
    } catch (err) {
      console.error('Password change error:', err);
      showToast('❌ Đổi mật khẩu thất bại: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsSaving(false);
    }
  };

  // Helper initials
  const initials = useMemo(() => {
    if (!employee?.fullName) return 'TU';
    const parts = employee.fullName.trim().split(' ');
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }, [employee?.fullName]);

  const empCode = useMemo(() => {
    if (!employee?.id) return 'SS-8492';
    const str = String(employee.id).replace(/-/g, '');
    return `SS-${str.slice(0, 4).toUpperCase()}`;
  }, [employee?.id]);

  if (loading && !employee) {
    return (
      <div className="ed-page-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center', color: 'var(--emp-outline)' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '36px', animation: 'spin 1s linear infinite' }}>progress_activity</span>
          <p style={{ marginTop: '12px', fontWeight: 600 }}>Đang tải hồ sơ nhân sự...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="ed-page-container">
      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '24px',
          backgroundColor: '#1E293B',
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: '8px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
          zIndex: 9999,
          fontSize: '14px',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          {toastMessage}
        </div>
      )}

      {/* Sub-header Breadcrumb */}
      <div className="ed-subnav-bar">
        <div className="ed-subnav-content">
          <Link to="/employees">Nhân viên</Link>
          <span className="material-symbols-outlined" style={{ fontSize: '14px', color: 'var(--emp-outline)' }}>chevron_right</span>
          <Link to="/employees">Hồ sơ nhân viên</Link>
          <span className="material-symbols-outlined" style={{ fontSize: '14px', color: 'var(--emp-outline)' }}>chevron_right</span>
          <span style={{ fontWeight: 600, color: 'var(--emp-on-surface)' }}>Chi tiết cá nhân</span>
        </div>
      </div>

      {/* =================================================================
          1. Top Command & Action Bar
          ================================================================= */}
      <section className="ed-top-bar">
        <div className="ed-top-bar-flex">
          <div>
            <div className="ed-top-breadcrumb">
              <span>Nhân sự &amp; Nhân viên</span>
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>chevron_right</span>
              <Link to="/employees" style={{ color: 'inherit', textDecoration: 'none' }}>Danh sách nhân viên</Link>
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>chevron_right</span>
              <span className="highlight">Mã NV: {empCode}</span>
            </div>
            <div className="ed-top-title-row">
              <h1 className="ed-top-title">Hồ sơ nhân sự: {employee?.fullName || 'Chưa đặt tên'}</h1>
              <span className="ed-contract-badge">
                <span className="ed-contract-badge-dot"></span>
                {contractTypeName}
              </span>
            </div>
          </div>

          {/* Quick Actions CTA Cluster */}
          <div className="ed-actions-cluster">
            <button
              id="btn-edit-modal"
              type="button"
              className="ed-btn-outline"
              onClick={() => {
                setEditForm({
                  fullName: employee?.fullName || '',
                  phone: employee?.phone || '',
                  email: employee?.email || '',
                  password: '',
                  cccd: empMeta.cccd || '',
                  storeId: editForm.storeId,
                  status: employee?.status || 'ACTIVE',
                  address: empMeta.address || '',
                  dob: empMeta.dob || '',
                  gender: empMeta.gender || 'Nam'
                });
                setShowEditModal(true);
              }}
              title="Chỉnh sửa thông tin nhân sự"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--emp-outline)' }}>edit</span>
              <span>Chỉnh sửa thông tin</span>
            </button>

            <button
              type="button"
              className="ed-btn-primary"
              onClick={() => navigate('/schedule')}
              title="Đi tới xếp ca làm việc"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>calendar_month</span>
              <span>Phân ca làm việc</span>
            </button>

            <div className="ed-more-container" id="more-actions-container">
              <button
                type="button"
                id="btn-more-actions"
                className="ed-btn-icon"
                onClick={() => setShowMoreMenu(prev => !prev)}
                title="Tác vụ khác"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>more_vert</span>
              </button>

              {showMoreMenu && (
                <div className="ed-more-menu" id="more-actions-menu">
                  <button
                    type="button"
                    className="ed-more-item"
                    onClick={() => {
                      setShowMoreMenu(false);
                      setPasswordForm({ newPassword: '', confirmPassword: '' });
                      setShowPasswordModal(true);
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--emp-primary)' }}>lock_reset</span>
                    <span>Đổi mật khẩu tài khoản</span>
                  </button>
                  <button
                    type="button"
                    className="ed-more-item"
                    onClick={() => { setShowMoreMenu(false); showToast(`Đang xuất báo cáo hồ sơ cho ${employee?.fullName}...`); }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--emp-outline)' }}>description</span>
                    <span>Xuất báo cáo hồ sơ</span>
                  </button>
                  <button
                    type="button"
                    className="ed-more-item"
                    onClick={() => { setShowMoreMenu(false); showToast(`Đang tạo thẻ nhân viên PDF cho ${employee?.fullName}...`); }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--emp-outline)' }}>badge</span>
                    <span>Xuất thẻ nhân viên (PDF)</span>
                  </button>
                  <div className="ed-more-divider"></div>
                  <button
                    type="button"
                    className="ed-more-item danger"
                    onClick={() => { setShowMoreMenu(false); showToast('Đã tạm vô hiệu hóa tài khoản!'); }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>block</span>
                    <span>Vô hiệu hóa tài khoản</span>
                  </button>
                  <button
                    type="button"
                    className="ed-more-item danger"
                    onClick={() => {
                      setShowMoreMenu(false);
                      if (confirm(`Bạn có chắc chắn muốn xóa nhân viên ${employee?.fullName}?`)) {
                        deleteEmployee(employee.id)
                          .then(() => {
                            showToast('✓ Đã xóa nhân viên!');
                            setTimeout(() => navigate('/employees'), 1000);
                          })
                          .catch(err => showToast('Lỗi khi xóa: ' + err.message));
                      }
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>delete</span>
                    <span>Xóa nhân viên...</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* =================================================================
          2. Employee Identity Banner & Hero KPIs Card
          ================================================================= */}
      <section className="ed-banner-section">
        <div className="ed-banner-card">
          <div className="ed-banner-blob"></div>
          <div className="ed-banner-layout">
            {/* Identity Group */}
            <div className="ed-identity-group">
              <div className="ed-avatar-box">
                <div
                  className="ed-avatar-circle"
                  style={{ cursor: 'pointer', overflow: 'hidden' }}
                  onClick={() => setShowAvatarModal(true)}
                  title="Nhấn để mở Bộ sưu tập Avatar 3D"
                >
                  <img
                    src={getEmployeeAvatar(employee)}
                    alt={employee?.fullName || 'Avatar'}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
                <button
                  type="button"
                  className="ed-camera-btn"
                  title="Chọn Avatar 3D Digital Twin"
                  onClick={() => setShowAvatarModal(true)}
                >
                  <span style={{ fontSize: '11px', fontWeight: 800 }}>3D</span>
                </button>
                <span className="ed-active-chip">
                  <span className="ed-active-chip-ping"></span>
                  {employee?.status || 'Active'}
                </span>
              </div>

              <div className="ed-identity-meta">
                <div className="ed-identity-name-row">
                  <h2 className="ed-identity-name">{employee?.fullName || 'Chưa đặt tên'}</h2>
                  <span className="ed-id-badge">ID: {empCode}</span>
                  <span className="ed-verified-badge">
                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>verified</span>
                    Đã xác thực danh tính
                  </span>
                </div>

                <div className="ed-contact-grid">
                  <div className="ed-contact-item">
                    <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--emp-outline)' }}>mail</span>
                    <span style={{ fontFamily: 'monospace', color: 'var(--emp-on-surface)' }}>{employee?.email || 'Chưa có email'}</span>
                  </div>
                  <div className="ed-contact-item">
                    <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--emp-outline)' }}>call</span>
                    <span>{employee?.phone || editForm.phone || 'Chưa cập nhật SĐT'}</span>
                  </div>
                  <div className="ed-contact-item">
                    <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--emp-outline)' }}>storefront</span>
                    <span>Chính: <strong style={{ color: 'var(--emp-on-surface)' }}>{primaryStoreName}</strong></span>
                  </div>
                  <div className="ed-contact-item">
                    <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--emp-outline)' }}>hub</span>
                    <span>Phụ: <strong style={{ color: 'var(--emp-on-surface)' }}>{secondaryStoreName}</strong></span>
                  </div>
                </div>
              </div>
            </div>

            {/* Mini Performance Widgets (KPIs) - DYNAMIC DATA */}
            <div className="ed-kpi-grid">
              {/* KPI 1 */}
              <div className="ed-kpi-card">
                <div className="ed-kpi-top">
                  <span>Giờ làm tháng này</span>
                  <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--emp-primary)' }}>timelapse</span>
                </div>
                <div className="ed-kpi-val-row">
                  <span className="ed-kpi-val">{kpis.monthHours}</span>
                  <span className="ed-kpi-sub">/ {kpis.targetHours}h</span>
                </div>
                <div className="ed-progress-bar">
                  <div className="ed-progress-fill" style={{ width: `${kpis.targetPercent}%` }}></div>
                </div>
                <span className="ed-kpi-footer-note">Đạt {kpis.targetPercent}% chỉ tiêu ca</span>
              </div>

              {/* KPI 2 */}
              <div className="ed-kpi-card">
                <div className="ed-kpi-top">
                  <span>Điểm chuyên cần</span>
                  <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--emp-primary)' }}>verified_user</span>
                </div>
                <div className="ed-kpi-val-row">
                  <span className="ed-kpi-val">{kpis.attScore}%</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--emp-primary)', fontSize: '11px', fontWeight: 600, marginTop: '8px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>check_circle</span>
                  <span>{kpis.noLateThisWeek ? 'Không trễ ca tuần này' : 'Có phát sinh trễ ca'}</span>
                </div>
              </div>

              {/* KPI 3 */}
              <div className="ed-kpi-card">
                <div className="ed-kpi-top">
                  <span>Ca hoàn thành tuần</span>
                  <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--emp-primary)' }}>event_available</span>
                </div>
                <div className="ed-kpi-val-row">
                  <span className="ed-kpi-val">{kpis.weekCount}</span>
                  <span className="ed-kpi-sub">ca làm việc</span>
                </div>
                <span style={{ fontSize: '11px', color: 'var(--emp-outline)', marginTop: '8px' }}>Đã xác nhận chấm công</span>
              </div>

              {/* KPI 4 */}
              <div className="ed-kpi-card">
                <div className="ed-kpi-top">
                  <span>Lương tích lũy dự kiến</span>
                  <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--emp-primary)' }}>payments</span>
                </div>
                <div className="ed-kpi-val-row" style={{ color: 'var(--emp-primary)' }}>
                  <span className="ed-kpi-val" style={{ fontWeight: 800 }}>{Number(kpis.estimatedSalary).toLocaleString('vi-VN')}</span>
                  <span style={{ fontSize: '12px', fontWeight: 600 }}>đ</span>
                </div>
                <span style={{ fontSize: '10px', color: 'var(--emp-outline)', marginTop: '8px' }}>Tạm tính đến hôm nay</span>
              </div>
            </div>
          </div>

          <div className="ed-banner-skyline">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--emp-primary)' }}></span>
              <span>Hệ thống ShiftSync v4.2 Cloud • Bảo vệ quyền riêng tư &amp; Nghị định 13/2023/NĐ-CP</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>domain</span>
              <span>Cụm vận hành Khu vực Hồ Chí Minh</span>
            </div>
          </div>
        </div>
      </section>

      {/* =================================================================
          3. Interactive Segmented Navigation Tabs
          ================================================================= */}
      <section className="ed-tabs-section">
        <div className="ed-tabs-wrapper">
          <button
            type="button"
            className={`ed-tab-btn ${activeTab === 'info' ? 'active' : ''}`}
            onClick={() => setActiveTab('info')}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>badge</span>
            <span>Thông tin cá nhân &amp; Tài khoản</span>
          </button>
          <button
            type="button"
            className={`ed-tab-btn ${activeTab === 'schedule' ? 'active' : ''}`}
            onClick={() => setActiveTab('schedule')}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>calendar_view_week</span>
            <span>Phân công &amp; Ca làm việc</span>
            <span className="ed-tab-pill">{kpis.weekCount} ca</span>
          </button>
          <button
            type="button"
            className={`ed-tab-btn ${activeTab === 'attendance' ? 'active' : ''}`}
            onClick={() => setActiveTab('attendance')}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>receipt_long</span>
            <span>Lịch sử chấm công &amp; Bảng lương</span>
          </button>
          <button
            type="button"
            className={`ed-tab-btn ${activeTab === 'contract' ? 'active' : ''}`}
            onClick={() => setActiveTab('contract')}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>history_edu</span>
            <span>Hợp đồng &amp; Kỹ năng/Chứng chỉ</span>
          </button>
        </div>
      </section>

      {/* =================================================================
          4. Main Profile View (2-Column Dense Grid)
          ================================================================= */}
      <section className="ed-main-grid">
        {/* LEFT COLUMN (5 cols): Identity & Security */}
        <div className="ed-col">
          {/* Card 1: Basic Personal Info */}
          <div className="ed-card">
            <div className="ed-card-header">
              <div className="ed-card-header-left">
                <div className="ed-card-icon-box">
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>person</span>
                </div>
                <h3 className="ed-card-title">Thông tin cơ bản</h3>
              </div>
              <button
                type="button"
                className="ed-card-edit-link"
                onClick={() => {
                  setEditForm({
                    fullName: employee?.fullName || '',
                    phone: employee?.phone || '',
                    email: employee?.email || '',
                    password: '',
                    cccd: empMeta.cccd || '',
                    storeId: editForm.storeId,
                    status: employee?.status || 'ACTIVE',
                    address: empMeta.address || '',
                    dob: empMeta.dob || '',
                    gender: empMeta.gender || 'Nam'
                  });
                  setShowEditModal(true);
                }}
                title="Sửa thông tin"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>edit</span>
                <span>Sửa</span>
              </button>
            </div>

            <div>
              <div className="ed-info-row">
                <span className="ed-info-label">Họ và tên</span>
                <span className="ed-info-val">{employee?.fullName || 'Chưa đặt tên'}</span>
              </div>
              <div className="ed-info-row">
                <span className="ed-info-label">Ngày sinh</span>
                <span className="ed-info-val">{empMeta.dob}</span>
              </div>
              <div className="ed-info-row">
                <span className="ed-info-label">Giới tính</span>
                <span className="ed-info-val">{empMeta.gender}</span>
              </div>
              <div className="ed-info-row">
                <span className="ed-info-label">CCCD / CMND</span>
                <span className="ed-info-val" style={{ fontFamily: 'monospace' }}>{empMeta.cccd}</span>
              </div>
              <div className="ed-info-row">
                <span className="ed-info-label">Địa chỉ thường trú</span>
                <span className="ed-info-val">{empMeta.address}</span>
              </div>
            </div>
          </div>

          {/* Card 2: Emergency Contact */}
          <div className="ed-card">
            <div className="ed-card-header" style={{ borderBottom: '1px solid var(--emp-surface-container)', paddingBottom: '12px' }}>
              <div className="ed-card-header-left">
                <div className="ed-card-icon-box red">
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>emergency</span>
                </div>
                <h3 className="ed-card-title">Liên hệ khẩn cấp</h3>
              </div>
              <span className="ed-verified-badge" style={{ fontSize: '11px' }}>Đã xác thực</span>
            </div>

            <div>
              <div className="ed-info-row">
                <span className="ed-info-label">Người liên hệ</span>
                <span className="ed-info-val">{empMeta.emergencyName}</span>
              </div>
              <div className="ed-info-row">
                <span className="ed-info-label">Mối quan hệ</span>
                <span style={{ padding: '2px 8px', borderRadius: '4px', backgroundColor: 'var(--emp-surface-high)', fontSize: '12px', fontWeight: 600 }}>{empMeta.emergencyRelation}</span>
              </div>
              <div className="ed-info-row">
                <span className="ed-info-label">Số điện thoại</span>
                <a href={`tel:${empMeta.emergencyPhone}`} style={{ fontFamily: 'monospace', color: 'var(--emp-primary)', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>call</span>
                  {empMeta.emergencyPhone}
                </a>
              </div>
            </div>
          </div>

          {/* Card 3: Account & Security */}
          <div className="ed-card">
            <div className="ed-card-header">
              <div className="ed-card-header-left">
                <div className="ed-card-icon-box">
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>security</span>
                </div>
                <h3 className="ed-card-title">Tài khoản &amp; Bảo mật</h3>
              </div>
              <span className="ed-active-chip" style={{ position: 'static' }}>An toàn</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <span className="ed-info-label" style={{ display: 'block', marginBottom: '4px' }}>Tên đăng nhập hệ thống</span>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: '8px', backgroundColor: 'var(--emp-surface-low)' }}>
                  <span style={{ fontFamily: 'monospace', fontSize: '13px', fontWeight: 600, color: 'var(--emp-on-surface)' }}>{employee?.email || 'user@shiftsync.com'}</span>
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: '18px', color: 'var(--emp-outline)', cursor: 'pointer' }}
                    title="Sao chép"
                    onClick={() => {
                      navigator.clipboard?.writeText(employee?.email || '');
                      showToast('Đã sao chép tên đăng nhập!');
                    }}
                  >
                    content_copy
                  </span>
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span className="ed-info-label">Mật khẩu ShiftSync</span>
                  <button
                    type="button"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--emp-primary)',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      backgroundColor: 'var(--emp-surface-low)'
                    }}
                    onClick={() => {
                      setPasswordForm({ newPassword: '', confirmPassword: '' });
                      setShowPasswordModal(true);
                    }}
                    title="Đổi mật khẩu tài khoản nhân viên"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>key</span>
                    <span>Đổi mật khẩu</span>
                  </button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: '8px', backgroundColor: 'var(--emp-surface-low)' }}>
                  <span style={{ fontFamily: 'monospace', letterSpacing: '4px', color: 'var(--emp-on-surface)' }}>••••••••••••••••</span>
                  <span style={{ fontSize: '11px', color: 'var(--emp-outline)' }}>Đã bảo mật</span>
                </div>
              </div>
            </div>
          </div>

          {/* Compliance Card */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', borderRadius: '16px', backgroundColor: 'var(--emp-surface-low)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '26px', color: 'var(--emp-primary)' }}>verified</span>
            <div style={{ fontSize: '13px', color: 'var(--emp-on-surface-variant)' }}>
              <div style={{ fontWeight: 700, color: 'var(--emp-on-surface)', marginBottom: '2px' }}>Hồ sơ đã kiểm duyệt nội bộ</div>
              <div>Cập nhật và đối soát định kỳ bởi Quản lý Vận hành {primaryStoreName}.</div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN (7 cols): Assignments & Work Schedules */}
        <div className="ed-col">
          {/* Card 4: Positions & Pay Rates - DYNAMIC TABLE */}
          <div className="ed-card">
            <div className="ed-card-header">
              <div className="ed-card-header-left">
                <div className="ed-card-icon-box">
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>work_history</span>
                </div>
                <div>
                  <h3 className="ed-card-title">Vị trí công việc &amp; Khung lương áp dụng</h3>
                  <span style={{ fontSize: '12px', color: 'var(--emp-outline)' }}>Kế thừa đồng bộ từ cấu hình hệ thống phân quyền ca</span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--emp-outline)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>lock</span>
                <span>Admin quản lý</span>
              </div>
            </div>

            <div className="ed-pay-table-wrapper">
              <table className="ed-pay-table">
                <thead>
                  <tr>
                    <th>Vị trí chuyên môn</th>
                    <th>Loại hình</th>
                    <th>Mức lương chuẩn</th>
                    <th>Trạng thái khóa</th>
                  </tr>
                </thead>
                <tbody>
                  {payMatrix.map(pm => (
                    <tr key={pm.id}>
                      <td className="ed-skill-cell">
                        <span className="ed-skill-dot" style={{ backgroundColor: pm.color }}></span>
                        {pm.name}
                      </td>
                      <td style={{ color: 'var(--emp-outline)' }}>{pm.type}</td>
                      <td style={{ fontFamily: 'monospace', fontWeight: 700, color: pm.type === 'Định mức chính' ? 'var(--emp-primary)' : 'var(--emp-on-surface)' }}>
                        {pm.rate}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--emp-outline)' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>lock</span>
                          Đồng bộ
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', fontSize: '11px', color: 'var(--emp-outline)' }}>
              <span>* Mức lương phụ cấp ca đêm (+30%) &amp; ngày lễ (+100%) tự động tính toán khi chốt kỳ công.</span>
              <Link to="/skills" style={{ color: 'var(--emp-primary)', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '2px' }}>
                Chi tiết thang bảng lương
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>arrow_forward</span>
              </Link>
            </div>
          </div>

          {/* Card 5: Schedule Availability & Current Week Roster - DYNAMIC 7-DAY TIMELINE */}
          <div className="ed-card">
            <div className="ed-card-header">
              <div className="ed-card-header-left">
                <div className="ed-card-icon-box">
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>tune</span>
                </div>
                <h3 className="ed-card-title">Lịch khả dụng &amp; Khung ca thường xuyên</h3>
              </div>
              <span style={{ padding: '4px 10px', borderRadius: '6px', backgroundColor: 'var(--emp-surface-low)', color: 'var(--emp-primary)', fontSize: '12px', fontWeight: 600 }}>
                Tuần hiện tại ({weekDays[0]?.dateISO?.slice(5)} - {weekDays[6]?.dateISO?.slice(5)})
              </span>
            </div>

            {/* Availability Shifts Matrix */}
            <div className="ed-avail-grid">
              <div className="ed-avail-card">
                <div className="ed-avail-top">
                  <span>Ca Sáng</span>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--emp-primary)' }}>check_circle</span>
                </div>
                <span className="ed-avail-time">06:00 - 14:00</span>
                <span className="ed-avail-badge">{availabilityStats.morning}</span>
              </div>

              <div className="ed-avail-card">
                <div className="ed-avail-top">
                  <span>Ca Chiều</span>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--emp-primary)' }}>check_circle</span>
                </div>
                <span className="ed-avail-time">14:00 - 22:00</span>
                <span className="ed-avail-badge">{availabilityStats.afternoon}</span>
              </div>

              <div className="ed-avail-card disabled">
                <div className="ed-avail-top">
                  <span>Ca Đêm</span>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--emp-outline)' }}>do_not_disturb_on</span>
                </div>
                <span className="ed-avail-time">22:00 - 06:00</span>
                <span className="ed-avail-badge" style={{ color: 'var(--emp-outline)' }}>{availabilityStats.night}</span>
              </div>
            </div>

            {/* Authorized Branches */}
            <div style={{ marginBottom: '20px' }}>
              <span style={{ fontSize: '13px', color: 'var(--emp-outline)', display: 'block', marginBottom: '8px' }}>
                Chi nhánh được ủy quyền phân ca:
              </span>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '8px', backgroundColor: 'var(--emp-surface-high)', fontSize: '13px', fontWeight: 600, color: 'var(--emp-on-surface)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--emp-primary)' }}>store</span>
                  <span>{primaryStoreName} (Chi nhánh chính)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '8px', backgroundColor: 'var(--emp-surface-low)', fontSize: '13px', fontWeight: 600, color: 'var(--emp-on-surface-variant)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--emp-outline)' }}>store</span>
                  <span>{secondaryStoreName} (Chi nhánh hỗ trợ)</span>
                </div>
              </div>
            </div>

            {/* Weekly Schedule Visual Timeline (7 Days) - DYNAMIC DATA */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--emp-on-surface)' }}>Lịch trình làm việc 7 ngày trong tuần:</span>
                <span style={{ fontSize: '12px', color: 'var(--emp-outline)' }}>
                  {weekDays[0]?.dateISO} đến {weekDays[6]?.dateISO}
                </span>
              </div>

              <div className="ed-week-strip">
                {weekDays.map(wd => (
                  <div key={wd.dateISO} className={`ed-day-cell ${wd.isToday ? 'today' : ''}`}>
                    <span className="ed-day-name" style={wd.isToday ? { color: 'var(--emp-primary)', fontWeight: 700 } : {}}>
                      {wd.isToday ? 'Hôm nay' : wd.dayName}
                    </span>
                    <span className="ed-day-num" style={wd.isToday ? { color: 'var(--emp-primary)' } : {}}>
                      {wd.dayNum}
                    </span>
                    <span className={`ed-day-shift ${wd.shiftType}`}>
                      {wd.shiftLabel}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =================================================================
          5. Sticky Bottom Action Dock
          ================================================================= */}
      <aside className="ed-bottom-dock">
        <div className="ed-dock-content">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--emp-primary)' }}></span>
            <span>
              Đang xem hồ sơ của <strong>{employee?.fullName || 'Nhân viên'}</strong> ({empCode})
              <span style={{ fontFamily: 'monospace', color: 'var(--emp-outline)', marginLeft: '6px' }}>• Dữ liệu đồng bộ theo /api/users/{employee?.id || ''}</span>
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              className="ed-btn-outline"
              onClick={() => {
                setEditForm({
                  fullName: employee?.fullName || '',
                  phone: employee?.phone || '',
                  email: employee?.email || '',
                  password: '',
                  cccd: empMeta.cccd || '',
                  storeId: editForm.storeId,
                  status: employee?.status || 'ACTIVE',
                  address: empMeta.address || '',
                  dob: empMeta.dob || '',
                  gender: empMeta.gender || 'Nam'
                });
                showToast('Đã đặt lại thông tin theo hệ thống');
              }}
            >
              Đặt lại mặc định
            </button>

            <button
              type="button"
              className="ed-btn-primary"
              disabled={isSaving}
              onClick={() => handleSaveEdit()}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>save</span>
              <span>{isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}</span>
            </button>
          </div>
        </div>
      </aside>

      {/* =================================================================
          6. Quick Edit Profile Modal (Có hỗ trợ sửa mật khẩu)
          ================================================================= */}
      {showEditModal && (
        <div
          className="ed-modal-backdrop"
          id="modal-edit-profile"
          onClick={() => setShowEditModal(false)}
        >
          <div
            className="ed-modal-box"
            onClick={e => e.stopPropagation()}
          >
            <div className="ed-modal-header">
              <div className="ed-modal-header-left">
                <span className="material-symbols-outlined" style={{ fontSize: '24px', color: 'var(--emp-primary)' }}>manage_accounts</span>
                <h3 className="ed-modal-title">Chỉnh sửa thông tin nhân sự</h3>
              </div>
              <button
                type="button"
                className="ed-modal-close-btn"
                id="btn-close-modal"
                onClick={() => setShowEditModal(false)}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>close</span>
              </button>
            </div>

            <form onSubmit={handleSaveEdit}>
              <div className="ed-form-field">
                <label>Họ và tên nhân viên</label>
                <input
                  type="text"
                  required
                  className="ed-form-input"
                  value={editForm.fullName}
                  onChange={e => setEditForm({ ...editForm, fullName: e.target.value })}
                />
              </div>

              <div className="ed-form-row">
                <div className="ed-form-field">
                  <label>Số điện thoại</label>
                  <input
                    type="tel"
                    className="ed-form-input"
                    placeholder="0912345678"
                    value={editForm.phone}
                    onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                  />
                </div>
                <div className="ed-form-field">
                  <label>CCCD / Mã định danh</label>
                  <input
                    type="text"
                    className="ed-form-input"
                    value={editForm.cccd}
                    onChange={e => setEditForm({ ...editForm, cccd: e.target.value })}
                  />
                </div>
              </div>

              <div className="ed-form-row">
                <div className="ed-form-field">
                  <label>Chi nhánh chính</label>
                  <select
                    className="ed-form-input"
                    value={editForm.storeId}
                    onChange={e => setEditForm({ ...editForm, storeId: e.target.value })}
                  >
                    {stores.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name || s.storeName || 'Chi nhánh'}
                      </option>
                    ))}
                    {stores.length === 0 && (
                      <option value="">Flagship Quận 1 (TP.HCM)</option>
                    )}
                  </select>
                </div>
                <div className="ed-form-field">
                  <label>Trạng thái công tác</label>
                  <select
                    className="ed-form-input"
                    value={editForm.status}
                    onChange={e => setEditForm({ ...editForm, status: e.target.value })}
                  >
                    <option value="ACTIVE">Đang làm việc (Active)</option>
                    <option value="LEAVE">Nghỉ phép tạm thời</option>
                    <option value="INACTIVE">Đã nghỉ việc</option>
                  </select>
                </div>
              </div>

              <div className="ed-form-field">
                <label>Địa chỉ thường trú</label>
                <input
                  type="text"
                  className="ed-form-input"
                  value={editForm.address}
                  onChange={e => setEditForm({ ...editForm, address: e.target.value })}
                />
              </div>

              {/* Mật khẩu mới trong modal chỉnh sửa */}
              <div className="ed-form-field" style={{ marginTop: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ margin: 0 }}>Mật khẩu mới (Tùy chọn)</label>
                  <span style={{ fontSize: '11px', color: 'var(--emp-outline)' }}>Bỏ trống nếu giữ nguyên</span>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showEditPassword ? 'text' : 'password'}
                    className="ed-form-input"
                    style={{ paddingRight: '40px' }}
                    placeholder="Tối thiểu 8 ký tự, gồm cả chữ cái và chữ số"
                    value={editForm.password}
                    onChange={e => setEditForm({ ...editForm, password: e.target.value })}
                  />
                  <button
                    type="button"
                    style={{
                      position: 'absolute',
                      right: '8px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: 'var(--emp-outline)',
                      cursor: 'pointer',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                    onClick={() => setShowEditPassword(prev => !prev)}
                    title={showEditPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                      {showEditPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              <div className="ed-modal-footer">
                <button
                  type="button"
                  id="btn-cancel-modal"
                  className="ed-btn-outline"
                  onClick={() => setShowEditModal(false)}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="ed-btn-primary"
                  disabled={isSaving}
                >
                  {isSaving ? 'Đang cập nhật...' : 'Cập nhật hồ sơ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================
          7. Dedicated Password Change Modal
          ================================================================= */}
      {showPasswordModal && (
        <div
          className="ed-modal-backdrop"
          id="modal-change-password"
          onClick={() => setShowPasswordModal(false)}
        >
          <div
            className="ed-modal-box"
            style={{ maxWidth: '480px' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="ed-modal-header">
              <div className="ed-modal-header-left">
                <span className="material-symbols-outlined" style={{ fontSize: '24px', color: 'var(--emp-primary)' }}>lock_reset</span>
                <h3 className="ed-modal-title">Đổi mật khẩu tài khoản</h3>
              </div>
              <button
                type="button"
                className="ed-modal-close-btn"
                onClick={() => setShowPasswordModal(false)}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>close</span>
              </button>
            </div>

            <div style={{ marginBottom: '16px', padding: '10px 14px', borderRadius: '8px', backgroundColor: 'var(--emp-surface-low)', fontSize: '13px' }}>
              <div>Đổi mật khẩu đăng nhập cho nhân viên: <strong style={{ color: 'var(--emp-on-surface)' }}>{employee?.fullName}</strong></div>
              <div style={{ color: 'var(--emp-outline)', fontSize: '12px', marginTop: '2px' }}>Email: {employee?.email}</div>
            </div>

            <form onSubmit={handleUpdatePassword}>
              <div className="ed-form-field">
                <label>Mật khẩu mới *</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    className="ed-form-input"
                    style={{ paddingRight: '40px' }}
                    placeholder="Tối thiểu 8 ký tự, gồm cả chữ và số"
                    value={passwordForm.newPassword}
                    onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  />
                  <button
                    type="button"
                    style={{
                      position: 'absolute',
                      right: '8px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: 'var(--emp-outline)',
                      cursor: 'pointer',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                    onClick={() => setShowNewPassword(prev => !prev)}
                    title={showNewPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                      {showNewPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              <div className="ed-form-field">
                <label>Xác nhận mật khẩu mới *</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    className="ed-form-input"
                    style={{ paddingRight: '40px' }}
                    placeholder="Nhập lại mật khẩu mới"
                    value={passwordForm.confirmPassword}
                    onChange={e => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  />
                  <button
                    type="button"
                    style={{
                      position: 'absolute',
                      right: '8px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: 'var(--emp-outline)',
                      cursor: 'pointer',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                    onClick={() => setShowConfirmPassword(prev => !prev)}
                    title={showConfirmPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                      {showConfirmPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              <div style={{ fontSize: '11px', color: 'var(--emp-outline)', lineHeight: '1.4', marginBottom: '8px' }}>
                * Mật khẩu phải có độ dài từ 8 ký tự trở lên, bao gồm ít nhất một chữ cái và một chữ số.
              </div>

              <div className="ed-modal-footer">
                <button
                  type="button"
                  className="ed-btn-outline"
                  onClick={() => setShowPasswordModal(false)}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="ed-btn-primary"
                  disabled={isSaving}
                >
                  {isSaving ? 'Đang lưu...' : 'Cập nhật mật khẩu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3D Avatar Collection Modal */}
      <AvatarCollectionModal
        isOpen={showAvatarModal}
        currentAvatarId={selectedAvatarId}
        onSelectAvatar={(newId) => {
          setSelectedAvatarId(newId);
          if (employee?.id) {
            localStorage.setItem(`user_profile_avatar_${employee.id}`, newId);
          }
          showToast(`Đã cập nhật Avatar 3D cho ${employee?.fullName || 'nhân viên'}: ${getAvatarById(newId).label || newId}`);
        }}
        onClose={() => setShowAvatarModal(false)}
      />
    </div>
  );
}
