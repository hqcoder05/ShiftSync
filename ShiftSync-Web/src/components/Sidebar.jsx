import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Sidebar.css';

const CardIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="2" y="6" width="20" height="12" rx="2" />
    <line x1="2" y1="10" x2="22" y2="10" />
  </svg>
);

const SearchIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <circle cx="11" cy="11" r="7" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const ChevronIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M7 10l5 5 5-5z" />
  </svg>
);

function Dropdown({ icon, value, options, onSelect, small }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const current = options.find(o => o.value === value);

  useEffect(() => {
    const onClickOutside = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  return (
    <div className={'ss-dropdown' + (small ? ' ss-dropdown-small' : '')} ref={ref}>
      <button type="button" className={'ss-box' + (open ? ' ss-box-open' : '')} onClick={() => setOpen(o => !o)}>
        <span className="ss-box-icon">{icon || <CardIcon />}</span>
        <span className="ss-box-value">{current?.label || ''}</span>
        <span className={'ss-box-arrow' + (open ? ' ss-box-arrow-open' : '')}><ChevronIcon /></span>
      </button>
      {open && (
        <div className="ss-dropdown-panel">
          {options.map(o => (
            <div
              key={o.value}
              className={'ss-dropdown-option' + (o.value === value ? ' selected' : '')}
              onClick={() => { onSelect(o.value); setOpen(false); }}
            >
              {o.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Sidebar({ search, pageNav, subSelect }) {
  const navigate = useNavigate();

  return (
    <aside className="ss-sidebar">
      {search && (
        <div className="ss-box">
          <span className="ss-box-icon"><SearchIcon /></span>
          <input
            className="ss-box-input"
            placeholder={search.placeholder || 'Tìm kiếm'}
            value={search.value}
            onChange={e => search.onChange(e.target.value)}
          />
        </div>
      )}

      {pageNav && (
        <Dropdown
          icon={<CardIcon />}
          value={pageNav.currentTo}
          options={pageNav.options.map(o => ({ value: o.to, label: o.label }))}
          onSelect={(to) => { if (to !== pageNav.currentTo) navigate(to); }}
        />
      )}

      {subSelect && (
        <Dropdown
          small
          icon={subSelect.icon || <CardIcon />}
          value={subSelect.value}
          options={subSelect.options}
          onSelect={subSelect.onChange}
        />
      )}
    </aside>
  );
}