import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import './ToastContext.css';

const ToastContext = createContext(null);

let globalToastHandler = null;

export const toast = {
  success: (message, title) => globalToastHandler?.({ type: 'success', message, title }),
  error: (message, title) => globalToastHandler?.({ type: 'error', message, title }),
  warning: (message, title) => globalToastHandler?.({ type: 'warning', message, title }),
  info: (message, title) => globalToastHandler?.({ type: 'info', message, title }),
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const toastIdRef = useRef(0);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(({ type = 'info', message, title, duration = 4000 }) => {
    const id = ++toastIdRef.current;
    const newToast = { id, type, message, title, duration };

    setToasts((prev) => [...prev, newToast]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  React.useEffect(() => {
    globalToastHandler = showToast;
    return () => {
      globalToastHandler = null;
    };
  }, [showToast]);

  const value = {
    showToast,
    removeToast,
    success: (msg, title) => showToast({ type: 'success', message: msg, title }),
    error: (msg, title) => showToast({ type: 'error', message: msg, title }),
    warning: (msg, title) => showToast({ type: 'warning', message: msg, title }),
    info: (msg, title) => showToast({ type: 'info', message: msg, title }),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="ss-toast-container" aria-live="polite">
        {toasts.map((t) => {
          let Icon = Info;
          let colorClass = 'ss-toast-info';
          if (t.type === 'success') {
            Icon = CheckCircle2;
            colorClass = 'ss-toast-success';
          } else if (t.type === 'error') {
            Icon = AlertCircle;
            colorClass = 'ss-toast-error';
          } else if (t.type === 'warning') {
            Icon = AlertTriangle;
            colorClass = 'ss-toast-warning';
          }

          return (
            <div key={t.id} className={`ss-toast-card ${colorClass}`}>
              <div className="ss-toast-icon-wrap">
                <Icon size={18} strokeWidth={2.4} />
              </div>
              <div className="ss-toast-content">
                {t.title && <div className="ss-toast-title">{t.title}</div>}
                <div className="ss-toast-message">{t.message}</div>
              </div>
              <button
                type="button"
                className="ss-toast-close-btn"
                onClick={() => removeToast(t.id)}
                aria-label="Đóng thông báo"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    return {
      showToast: toast.info,
      success: toast.success,
      error: toast.error,
      warning: toast.warning,
      info: toast.info,
    };
  }
  return context;
}
