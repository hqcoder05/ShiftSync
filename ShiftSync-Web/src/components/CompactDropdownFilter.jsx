import { useState, useRef, useEffect } from 'react';
import './CompactDropdownFilter.css';

/**
 * CompactDropdownFilter
 * Gom bộ lọc Vị trí và Người dùng thành 1 Box xổ xuống như mẫu thiết kế:
 * - Checkbox Tất cả (All)
 * - Nhóm Vị trí (Skill/Role) kèm nút Only & đóng/mở chevron
 * - Nhóm Người dùng (Staff) kèm nút Only & đóng/mở chevron
 * - Nút xanh dương "Go" ở góc phải bên dưới
 */
export default function CompactDropdownFilter({
  skills = [],
  selectedSkills = [], // array of skill ids, or ['ALL']
  onSkillsChange,
  employees = [],
  selectedEmployees = [], // array of emp names or ids, or ['ALL']
  onEmployeesChange,
  onApply,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandSkills, setExpandSkills] = useState(true);
  const [expandEmployees, setExpandEmployees] = useState(true);

  // Local draft state while popup is open
  const [tempSkills, setTempSkills] = useState(selectedSkills);
  const [tempEmployees, setTempEmployees] = useState(selectedEmployees);

  const containerRef = useRef(null);

  // Sync draft when opened (not on every prop change to avoid infinite loops)
  const prevSkillsRef = useRef(null);
  const prevEmpsRef = useRef(null);

  useEffect(() => {
    const incoming = JSON.stringify(selectedSkills);
    if (prevSkillsRef.current !== incoming) {
      prevSkillsRef.current = incoming;
      setTempSkills(selectedSkills);
    }
  }, [selectedSkills]); // eslint-disable-line

  useEffect(() => {
    const incoming = JSON.stringify(selectedEmployees);
    if (prevEmpsRef.current !== incoming) {
      prevEmpsRef.current = incoming;
      setTempEmployees(selectedEmployees);
    }
  }, [selectedEmployees]); // eslint-disable-line

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  const isAllSkillsSelected = tempSkills.length === 0 || tempSkills.includes('ALL') || (skills.length > 0 && tempSkills.length === skills.length);
  const isAllEmployeesSelected = tempEmployees.length === 0 || tempEmployees.includes('ALL') || (employees.length > 0 && tempEmployees.length === employees.length);
  const isMasterAll = isAllSkillsSelected && isAllEmployeesSelected;

  const handleToggleMasterAll = () => {
    if (isMasterAll) {
      setTempSkills([]);
      setTempEmployees([]);
    } else {
      setTempSkills(['ALL']);
      setTempEmployees(['ALL']);
    }
  };

  const handleToggleSkillGroup = () => {
    if (isAllSkillsSelected) {
      setTempSkills([]);
    } else {
      setTempSkills(['ALL']);
    }
  };

  const handleSkillOnly = (e, skillId) => {
    e.stopPropagation();
    setTempSkills([skillId]);
  };

  const handleToggleSkill = (skillId) => {
    let current = tempSkills.includes('ALL') ? skills.map(s => s.id) : [...tempSkills];
    if (current.includes(skillId)) {
      current = current.filter(id => id !== skillId);
    } else {
      current.push(skillId);
    }
    if (current.length === skills.length) {
      setTempSkills(['ALL']);
    } else {
      setTempSkills(current);
    }
  };

  const handleToggleEmployeeGroup = () => {
    if (isAllEmployeesSelected) {
      setTempEmployees([]);
    } else {
      setTempEmployees(['ALL']);
    }
  };

  const handleEmployeeOnly = (e, empKey) => {
    e.stopPropagation();
    setTempEmployees([empKey]);
  };

  const handleToggleEmployee = (empKey) => {
    let current = tempEmployees.includes('ALL')
      ? employees.map(e => e.staffFullName || e.fullName || e.staffId || e.id)
      : [...tempEmployees];

    if (current.includes(empKey)) {
      current = current.filter(k => k !== empKey);
    } else {
      current.push(empKey);
    }
    if (current.length === employees.length) {
      setTempEmployees(['ALL']);
    } else {
      setTempEmployees(current);
    }
  };

  const handleApply = () => {
    if (onSkillsChange) onSkillsChange(tempSkills);
    if (onEmployeesChange) onEmployeesChange(tempEmployees);
    if (onApply) onApply(tempSkills, tempEmployees);
    setIsOpen(false);
  };

  // Compute trigger button summary text
  const getTriggerText = () => {
    if (isMasterAll) return 'Tất cả vị trí & nhân viên';
    const skillCount = tempSkills.includes('ALL') ? skills.length : tempSkills.length;
    const empCount = tempEmployees.includes('ALL') ? employees.length : tempEmployees.length;

    if (skillCount > 0 && empCount > 0) {
      return `${skillCount} vị trí, ${empCount} nhân viên`;
    }
    if (skillCount > 0) return `${skillCount} vị trí`;
    if (empCount > 0) return `${empCount} nhân viên`;
    return 'Chưa chọn bộ lọc';
  };

  return (
    <div className="cdf-wrap" ref={containerRef}>
      {/* Dropdown Trigger Box */}
      <button
        type="button"
        className={`cdf-trigger ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="cdf-trigger-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="3" width="6" height="4" rx="1"></rect>
            <rect x="9" y="17" width="6" height="4" rx="1"></rect>
            <rect x="16" y="10" width="6" height="4" rx="1"></rect>
            <path d="M5 7v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7"></path>
            <path d="M12 13v4"></path>
          </svg>
        </span>
        <span className="cdf-trigger-label" title={getTriggerText()}>
          {getTriggerText()}
        </span>
        <span className={`cdf-trigger-arrow ${isOpen ? 'open' : ''}`}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </span>
      </button>

      {/* Popover Card */}
      {isOpen && (
        <div className="cdf-popover">
          {/* Top Master Checkbox: Tất cả */}
          <div className="cdf-master-row" onClick={handleToggleMasterAll}>
            <label className="cdf-checkbox-label">
              <input
                type="checkbox"
                checked={isMasterAll}
                onChange={handleToggleMasterAll}
                onClick={(e) => e.stopPropagation()}
              />
              <span className="cdf-checkbox-custom" />
              <span className="cdf-row-text cdf-bold">Tất cả (Vị trí & Người dùng)</span>
            </label>
          </div>

          <div className="cdf-divider" />

          {/* Group 1: Vị trí (Skills/Roles) */}
          <div className="cdf-group">
            <div className="cdf-group-header" onClick={handleToggleSkillGroup}>
              <label className="cdf-checkbox-label">
                <input
                  type="checkbox"
                  checked={isAllSkillsSelected}
                  onChange={handleToggleSkillGroup}
                  onClick={(e) => e.stopPropagation()}
                />
                <span className="cdf-checkbox-custom" />
                <span className="cdf-group-title">Vị trí công việc</span>
              </label>

              <div className="cdf-group-actions" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  className="cdf-action-only"
                  onClick={(e) => {
                    e.stopPropagation();
                    setTempSkills(['ALL']);
                    setTempEmployees([]);
                  }}
                  title="Chỉ chọn toàn bộ vị trí"
                >
                  Only
                </button>
                <button
                  type="button"
                  className="cdf-collapse-btn"
                  onClick={() => setExpandSkills(!expandSkills)}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    style={{ transform: expandSkills ? 'rotate(180deg)' : 'rotate(0deg)' }}
                  >
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </button>
              </div>
            </div>

            {expandSkills && (
              <div className="cdf-sub-list">
                {skills.map((sk) => {
                  const isChecked = tempSkills.includes('ALL') || tempSkills.includes(sk.id) || tempSkills.includes(sk.name);
                  const skColor = sk.description && sk.description.startsWith('#') ? sk.description : '#3d8a2d';

                  return (
                    <div
                      key={sk.id}
                      className="cdf-sub-item"
                      onClick={() => handleToggleSkill(sk.id)}
                    >
                      <label className="cdf-checkbox-label">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSkill(sk.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <span className="cdf-checkbox-custom" />
                        <span
                          className="cdf-color-dot"
                          style={{ backgroundColor: skColor }}
                        />
                        <span className="cdf-sub-text">{sk.name}</span>
                      </label>
                      <button
                        type="button"
                        className="cdf-action-sub-only"
                        onClick={(e) => handleSkillOnly(e, sk.id)}
                      >
                        Only
                      </button>
                    </div>
                  );
                })}
                {skills.length === 0 && (
                  <div className="cdf-empty-sub">Chưa có dữ liệu vị trí</div>
                )}
              </div>
            )}
          </div>

          <div className="cdf-divider" />

          {/* Group 2: Người dùng / Nhân viên (Employees) */}
          <div className="cdf-group">
            <div className="cdf-group-header" onClick={handleToggleEmployeeGroup}>
              <label className="cdf-checkbox-label">
                <input
                  type="checkbox"
                  checked={isAllEmployeesSelected}
                  onChange={handleToggleEmployeeGroup}
                  onClick={(e) => e.stopPropagation()}
                />
                <span className="cdf-checkbox-custom" />
                <span className="cdf-group-title">Người dùng</span>
              </label>

              <div className="cdf-group-actions" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  className="cdf-action-only"
                  onClick={(e) => {
                    e.stopPropagation();
                    setTempEmployees(['ALL']);
                    setTempSkills([]);
                  }}
                  title="Chỉ chọn toàn bộ nhân viên"
                >
                  Only
                </button>
                <button
                  type="button"
                  className="cdf-collapse-btn"
                  onClick={() => setExpandEmployees(!expandEmployees)}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    style={{ transform: expandEmployees ? 'rotate(180deg)' : 'rotate(0deg)' }}
                  >
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </button>
              </div>
            </div>

            {expandEmployees && (
              <div className="cdf-sub-list">
                {employees.map((emp) => {
                  const empKey = emp.staffFullName || emp.fullName || emp.staffId || emp.id;
                  const isChecked = tempEmployees.includes('ALL') || tempEmployees.includes(empKey);

                  return (
                    <div
                      key={emp.staffId || emp.id}
                      className="cdf-sub-item"
                      onClick={() => handleToggleEmployee(empKey)}
                    >
                      <label className="cdf-checkbox-label">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleEmployee(empKey)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <span className="cdf-checkbox-custom" />
                        <span className="cdf-sub-text">{empKey}</span>
                      </label>
                      <button
                        type="button"
                        className="cdf-action-sub-only"
                        onClick={(e) => handleEmployeeOnly(e, empKey)}
                      >
                        Only
                      </button>
                    </div>
                  );
                })}
                {employees.length === 0 && (
                  <div className="cdf-empty-sub">Chưa có nhân viên</div>
                )}
              </div>
            )}
          </div>

          {/* Bottom Action Footer */}
          <div className="cdf-footer">
            <button
              type="button"
              className="cdf-go-btn"
              onClick={handleApply}
            >
              Go
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
