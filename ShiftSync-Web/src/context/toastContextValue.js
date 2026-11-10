import { createContext, useContext } from 'react';
import { toast } from './toastApi.js';

export const ToastContext = createContext(null);

export function useToast() {
  const context = useContext(ToastContext);
  return context || {
    showToast: toast.info,
    success: toast.success,
    error: toast.error,
    warning: toast.warning,
    info: toast.info,
  };
}
