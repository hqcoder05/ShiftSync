import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export default function SpatialActionDialog({ open, title, onClose, children, className = '' }) {
  const root = useRef(null);
  const close = useRef(onClose);
  useEffect(() => { close.current = onClose; }, [onClose]);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    root.current?.querySelector('button')?.focus();
    const keyboard = event => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); close.current(); }
      if (event.key !== 'Tab') return;
      const elements = [...root.current.querySelectorAll('button,input,select,textarea,a[href],[tabindex="0"]')].filter(el => !el.disabled && el.getClientRects().length);
      const first = elements[0], last = elements.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', keyboard, true);
    return () => {
      document.removeEventListener('keydown', keyboard, true);
      document.body.style.overflow = previousOverflow;
      if (previous?.isConnected) previous.focus();
      else window.requestAnimationFrame(() => document.querySelector('[data-world-info] button')?.focus());
    };
  }, [open]);
  if (!open) return null;
  return <div className="se-action-backdrop" onPointerDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section ref={root} className={`se-action-dialog ${className}`} role="dialog" aria-modal="true" aria-labelledby="se-action-title">
      <header><h2 id="se-action-title">{title}</h2><button type="button" className="se-icon-button" aria-label="Đóng hộp thao tác" onClick={onClose}><X size={18}/></button></header>
      {children}
    </section>
  </div>;
}
