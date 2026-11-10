/* eslint-disable react-refresh/only-export-components -- provider and consumer hook share this local context. */
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import './ConfirmationContext.css';

const ConfirmationContext = createContext(null);

export function ConfirmationProvider({ children }) {
  const [dialog, setDialog] = useState(null);
  const resolverRef = useRef(null);

  const confirm = useCallback(({ title = 'Xác nhận thao tác', message, confirmLabel = 'Xác nhận', tone = 'danger' } = {}) => new Promise((resolve) => {
    resolverRef.current = resolve;
    setDialog({ title, message, confirmLabel, tone });
  }), []);

  const close = useCallback((accepted) => {
    const resolve = resolverRef.current;
    resolverRef.current = null;
    setDialog(null);
    resolve?.(accepted);
  }, []);

  useEffect(() => {
    if (!dialog) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') close(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [dialog, close]);

  return (
    <ConfirmationContext.Provider value={confirm}>
      {children}
      {dialog && (
        <div className="ss-confirm-backdrop" role="presentation" onMouseDown={() => close(false)}>
          <section className="ss-confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="ss-confirm-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="ss-confirm-icon"><AlertTriangle size={22} /></div>
            <div>
              <h2 id="ss-confirm-title">{dialog.title}</h2>
              <p>{dialog.message}</p>
            </div>
            <div className="ss-confirm-actions">
              <button type="button" className="ss-confirm-cancel" onClick={() => close(false)}>Hủy</button>
              <button type="button" className={`ss-confirm-accept ss-confirm-${dialog.tone}`} onClick={() => close(true)}>{dialog.confirmLabel}</button>
            </div>
          </section>
        </div>
      )}
    </ConfirmationContext.Provider>
  );
}

export function useConfirmation() {
  const confirm = useContext(ConfirmationContext);
  if (!confirm) throw new Error('useConfirmation must be used within ConfirmationProvider');
  return confirm;
}
