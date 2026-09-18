import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  User,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  Shield,
  X,
  Check,
  Plus,
  Search,
  AlertCircle,
  ChevronDown,
  Info,
} from 'lucide-react';
import { createEmployee } from '../services/employeeService';
import { getAllSkills } from '../services/skillService';
import './AddUserModal.css';

export default function AddUserModal({ isOpen, onClose, onSuccess, storeId }) {
  // 1. Current Authenticated User Context
  const currentRole = (localStorage.getItem('userRole') || 'STAFF').toUpperCase();
  const isAdmin = currentRole === 'ADMIN';
  const isManager = currentRole === 'MANAGER';

  // 2. ALL hooks MUST be called before any early return (Rules of Hooks)
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    role: 'STAFF',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [skillsList, setSkillsList] = useState([]);
  const [loadingSkills, setLoadingSkills] = useState(false);
  const [showSkillPicker, setShowSkillPicker] = useState(false);
  const [skillSearch, setSkillSearch] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [backendError, setBackendError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const popoverRef = useRef(null);

  // 3. Reset form and load skills from Backend Source of Truth
  useEffect(() => {
    if (isOpen && (isAdmin || isManager)) {
      setForm({
        fullName: '',
        email: '',
        phone: '',
        password: '',
        role: 'STAFF',
      });
      setShowPassword(false);
      setSelectedSkills([]);
      setFieldErrors({});
      setBackendError('');
      setSkillSearch('');
      setShowSkillPicker(false);

      // Fetch dynamic skills from backend
      const activeStoreId = storeId || localStorage.getItem('selectedStoreId') || '';
      setLoadingSkills(true);
      getAllSkills(activeStoreId)
        .then((res) => {
          const list = Array.isArray(res.data) ? res.data : (res.data?.content || []);
          setSkillsList(list);
        })
        .catch((err) => {
          console.warn('Loi tai ky nang:', err);
          setSkillsList([]);
        })
        .finally(() => {
          setLoadingSkills(false);
        });
    }
  }, [isOpen, storeId]);

  // Click outside to close skill picker
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        setShowSkillPicker(false);
      }
    };
    if (showSkillPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSkillPicker]);

  // Filter skills by search query
  const filteredSkills = useMemo(() => {
    if (!skillSearch.trim()) return skillsList;
    const q = skillSearch.toLowerCase().trim();
    return skillsList.filter(
      (s) =>
        (s.name && s.name.toLowerCase().includes(q)) ||
        (s.description && s.description.toLowerCase().includes(q))
    );
  }, [skillsList, skillSearch]);

  // 4. Early return AFTER all hooks
  if (!isOpen || (!isAdmin && !isManager)) {
    return null;
  }

  const toggleSkill = (skill) => {
    const exists = selectedSkills.some((s) => s.id === skill.id);
    if (exists) {
      setSelectedSkills(selectedSkills.filter((s) => s.id !== skill.id));
    } else {
      setSelectedSkills([...selectedSkills, skill]);
    }
  };

  const removeSkill = (skillId) => {
    setSelectedSkills(selectedSkills.filter((s) => s.id !== skillId));
  };

  // 5. Client-side Validation
  const validate = () => {
    const errors = {};
    if (!form.fullName.trim()) {
      errors.fullName = 'Vui long nhap ho va ten.';
    }

    if (!form.email.trim()) {
      errors.email = 'Vui long nhap email lien he.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      errors.email = 'Email khong hop le (VD: name@example.com).';
    }

    if (!form.phone.trim()) {
      errors.phone = 'Vui long nhap so dien thoai.';
    } else if (!/^[0-9+]{9,15}$/.test(form.phone.trim())) {
      errors.phone = 'So dien thoai khong hop le (it nhat 10 chu so).';
    }

    if (!form.password) {
      errors.password = 'Vui long nhap mat khau ban dau.';
    } else if (form.password.length < 8) {
      errors.password = 'Mat khau phai dai it nhat 8 ky tu.';
    } else if (!/^(?=.*[A-Za-z])(?=.*\d)/.test(form.password)) {
      errors.password = 'Mat khau phai chua it nhat mot chu cai va mot chu so.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // 6. Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setBackendError('');

    if (!validate()) return;

    // Determine target role strictly according to RBAC:
    // ADMIN can select MANAGER or STAFF. MANAGER can only create STAFF.
    const targetRole = isAdmin ? form.role : 'STAFF';

    const payload = {
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      password: form.password,
      systemRole: targetRole,
    };

    // If STAFF, include selected skill IDs for atomic assignment
    if (targetRole === 'STAFF' && selectedSkills.length > 0) {
      payload.skillIds = selectedSkills.map((s) => s.id);
    }

    setSubmitting(true);
    try {
      const res = await createEmployee(payload);
      onClose();
      if (onSuccess) {
        onSuccess(res.data);
      }
    } catch (err) {
      const status = err.response?.status;
      const data = err.response?.data;
      const msg = data?.message;

      if (status === 400) {
        if (data?.errors && typeof data.errors === 'object') {
          setFieldErrors(data.errors);
        } else {
          setBackendError(msg || 'Thong tin khong hop le. Vui long kiem tra lai cac truong.');
        }
      } else if (status === 401) {
        setBackendError('Phien dang nhap da het han. Vui long dang nhap lai.');
      } else if (status === 403) {
        setBackendError('Ban khong co quyen thuc hien thao tac nay.');
      } else if (status === 409) {
        setBackendError('Email hoac so dien thoai da duoc su dung trong he thong.');
      } else {
        setBackendError('Khong the tao nhan su luc nay. Vui long thu lai sau.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const isStaffRole = (isAdmin ? form.role : 'STAFF') === 'STAFF';

  return (
    <div
      className="aum-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="aum-modal-title"
    >
      <div className="aum-container" onClick={(e) => e.stopPropagation()}>
        {/* Close Button */}
        <button
          type="button"
          className="aum-close-btn"
          onClick={onClose}
          aria-label="Dong cua so"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <header className="aum-header">
          <div className="aum-badge">ShiftSync HR &bull; Thanh vien</div>
          <h2 id="aum-modal-title" className="aum-title">
            Them nhan su
          </h2>
          <p className="aum-subtitle">
            {isAdmin
              ? 'Ban co the tao tai khoan Manager hoac Staff cho he thong.'
              : 'Ban co the tao tai khoan Staff cho doi ngu trong pham vi quan ly cua minh.'}
          </p>
        </header>

        {/* Backend Alert Banner */}
        {backendError && (
          <div className="aum-error-banner" role="alert">
            <AlertCircle size={16} />
            <span>{backendError}</span>
          </div>
        )}

        {/* Form Body */}
        <form id="add-user-form" className="aum-body" onSubmit={handleSubmit}>
          {/* Row 1: Full Name | Email */}
          <div className="aum-grid-2">
            {/* Ho va ten */}
            <div className="aum-form-group">
              <label className="aum-label" htmlFor="aum-fullname">
                Ho va ten <span className="aum-req">*</span>
              </label>
              <div className="aum-input-wrap">
                <div className="aum-input-icon">
                  <User size={16} />
                </div>
                <input
                  id="aum-fullname"
                  type="text"
                  className={`aum-input ${fieldErrors.fullName ? 'error' : ''}`}
                  placeholder="VD: Nguyen Van A"
                  value={form.fullName}
                  onChange={(e) => {
                    setForm({ ...form, fullName: e.target.value });
                    if (fieldErrors.fullName) setFieldErrors({ ...fieldErrors, fullName: '' });
                  }}
                  required
                />
              </div>
              {fieldErrors.fullName && (
                <span className="aum-field-error">{fieldErrors.fullName}</span>
              )}
            </div>

            {/* Email */}
            <div className="aum-form-group">
              <label className="aum-label" htmlFor="aum-email">
                Email lien he <span className="aum-req">*</span>
              </label>
              <div className="aum-input-wrap">
                <div className="aum-input-icon">
                  <Mail size={16} />
                </div>
                <input
                  id="aum-email"
                  type="email"
                  className={`aum-input ${fieldErrors.email ? 'error' : ''}`}
                  placeholder="name@example.com"
                  value={form.email}
                  onChange={(e) => {
                    setForm({ ...form, email: e.target.value });
                    if (fieldErrors.email) setFieldErrors({ ...fieldErrors, email: '' });
                  }}
                  required
                />
              </div>
              {fieldErrors.email && (
                <span className="aum-field-error">{fieldErrors.email}</span>
              )}
            </div>
          </div>

          {/* Row 2: Phone | Role */}
          <div className="aum-grid-2">
            {/* Phone */}
            <div className="aum-form-group">
              <label className="aum-label" htmlFor="aum-phone">
                So dien thoai <span className="aum-req">*</span>
              </label>
              <div className="aum-input-wrap">
                <div className="aum-input-icon">
                  <Phone size={16} />
                </div>
                <input
                  id="aum-phone"
                  type="tel"
                  className={`aum-input ${fieldErrors.phone ? 'error' : ''}`}
                  placeholder="VD: 0912345678"
                  value={form.phone}
                  onChange={(e) => {
                    setForm({ ...form, phone: e.target.value });
                    if (fieldErrors.phone) setFieldErrors({ ...fieldErrors, phone: '' });
                  }}
                  required
                />
              </div>
              {fieldErrors.phone && (
                <span className="aum-field-error">{fieldErrors.phone}</span>
              )}
            </div>

            {/* Role Assignment */}
            <div className="aum-form-group">
              <label className="aum-label" htmlFor="aum-role">
                Vai tro <span className="aum-req">*</span>
              </label>

              {isAdmin ? (
                // ADMIN context: Select between MANAGER and STAFF (never ADMIN)
                <div className="aum-input-wrap">
                  <div className="aum-input-icon">
                    <Shield size={16} />
                  </div>
                  <select
                    id="aum-role"
                    className="aum-select"
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                  >
                    <option value="STAFF">STAFF &mdash; Nhan vien</option>
                    <option value="MANAGER">MANAGER &mdash; Quan ly</option>
                  </select>
                  <div className="aum-select-arrow">
                    <ChevronDown size={15} />
                  </div>
                </div>
              ) : (
                // MANAGER context: Compact badge fixed to STAFF
                <div className="aum-manager-role-card">
                  <div className="aum-role-pill">
                    <span className="aum-role-pill-dot" />
                    STAFF &bull; Nhan vien
                  </div>
                  <p className="aum-role-desc">
                    Nhan vien se duoc tao trong pham vi quan ly cua ban.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Role Info Box for MANAGER role */}
          {isAdmin && form.role === 'MANAGER' && (
            <div className="aum-role-info">
              <Info size={16} />
              <span>
                Manager co quyen quan ly nhan vien va cac nghiep vu van hanh thuoc pham vi duoc phan quyen.
              </span>
            </div>
          )}

          {/* Row 3: Initial Password */}
          <div className="aum-form-group">
            <label className="aum-label" htmlFor="aum-password">
              <span>
                Mat khau ban dau <span className="aum-req">*</span>
              </span>
              <span style={{ fontSize: 11, color: '#94a3b8', textTransform: 'none' }}>
                Toi thieu 8 ky tu, gom ca chu va so
              </span>
            </label>
            <div className="aum-input-wrap">
              <div className="aum-input-icon">
                <Lock size={16} />
              </div>
              <input
                id="aum-password"
                type={showPassword ? 'text' : 'password'}
                className={`aum-input ${fieldErrors.password ? 'error' : ''}`}
                placeholder="Toi thieu 8 ky tu (chu & so)"
                value={form.password}
                onChange={(e) => {
                  setForm({ ...form, password: e.target.value });
                  if (fieldErrors.password) setFieldErrors({ ...fieldErrors, password: '' });
                }}
                required
              />
              <button
                type="button"
                className="aum-pwd-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'An mat khau' : 'Hien mat khau'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {fieldErrors.password && (
              <span className="aum-field-error">{fieldErrors.password}</span>
            )}
          </div>

          {/* Row 4: Skill Assignment (Only shown for STAFF) */}
          {isStaffRole && (
            <div className="aum-skill-section">
              <div className="aum-section-header">
                <h4 className="aum-section-title">Ky nang</h4>
                <p className="aum-section-subtitle">
                  Gan cac ky nang ma nhan vien co the thuc hien trong ca lam viec.
                </p>
              </div>

              <div className="aum-chips-wrap">
                {selectedSkills.map((skill) => (
                  <span key={skill.id} className="aum-chip">
                    {skill.name}
                    <button
                      type="button"
                      className="aum-chip-remove"
                      onClick={() => removeSkill(skill.id)}
                      title={`Bo ky nang ${skill.name}`}
                    >
                      &times;
                    </button>
                  </span>
                ))}

                <button
                  type="button"
                  className="aum-add-skill-btn"
                  onClick={() => setShowSkillPicker(!showSkillPicker)}
                >
                  <Plus size={14} />
                  <span>Them ky nang</span>
                </button>
              </div>

              {/* Combobox Popover */}
              {showSkillPicker && (
                <div className="aum-combobox-popover" ref={popoverRef}>
                  <div className="aum-combobox-search">
                    <Search size={14} color="#94a3b8" />
                    <input
                      type="text"
                      className="aum-combobox-input"
                      placeholder="Tim kiem ky nang..."
                      value={skillSearch}
                      onChange={(e) => setSkillSearch(e.target.value)}
                      autoFocus
                    />
                  </div>

                  <ul className="aum-skill-list">
                    {loadingSkills && (
                      <li className="aum-empty-skills">Dang tai danh sach ky nang...</li>
                    )}
                    {!loadingSkills && filteredSkills.length === 0 && (
                      <li className="aum-empty-skills">Khong tim thay ky nang phu hop</li>
                    )}
                    {!loadingSkills &&
                      filteredSkills.map((skill) => {
                        const isSelected = selectedSkills.some((s) => s.id === skill.id);
                        return (
                          <li
                            key={skill.id}
                            className={`aum-skill-item ${isSelected ? 'selected' : ''}`}
                            onClick={() => toggleSkill(skill)}
                          >
                            <div className="aum-skill-item-info">
                              <span>{skill.name}</span>
                              {skill.description && (
                                <span className="aum-skill-item-desc">{skill.description}</span>
                              )}
                            </div>
                            {isSelected && <Check size={16} color="#059669" />}
                          </li>
                        );
                      })}
                  </ul>
                </div>
              )}
            </div>
          )}
        </form>

        {/* Footer */}
        <footer className="aum-footer">
          <button
            type="button"
            className="aum-btn-cancel"
            onClick={onClose}
            disabled={submitting}
          >
            Huy
          </button>
          <button
            type="submit"
            form="add-user-form"
            className="aum-btn-submit"
            disabled={submitting}
          >
            {submitting ? (
              <>
                <span className="aum-spinner" />
                <span>Dang tao...</span>
              </>
            ) : (
              <span>Tao nhan su</span>
            )}
          </button>
        </footer>
      </div>
    </div>
  );
}
