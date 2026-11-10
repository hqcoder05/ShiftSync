let globalToastHandler = null;

export const setGlobalToastHandler = (handler) => {
  globalToastHandler = handler;
};

export const toast = {
  success: (message, title) => globalToastHandler?.({ type: 'success', message, title }),
  error: (message, title) => globalToastHandler?.({ type: 'error', message, title }),
  warning: (message, title) => globalToastHandler?.({ type: 'warning', message, title }),
  info: (message, title) => globalToastHandler?.({ type: 'info', message, title }),
};
