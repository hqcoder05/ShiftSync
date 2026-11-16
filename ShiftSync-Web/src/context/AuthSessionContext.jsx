import { useEffect, useState } from 'react';
import { restoreSession } from '../services/authService';
import { clearLegacyAuthStorage, hasSession } from '../services/authSession';
import { AuthSessionContext } from './authSessionContextValue';

export function AuthSessionProvider({ children }) {
  const [state, setState] = useState({ ready: false, authenticated: false });

  useEffect(() => {
    let active = true;
    clearLegacyAuthStorage();
    restoreSession()
      .catch(() => undefined)
      .finally(() => {
        if (active) setState({ ready: true, authenticated: hasSession() });
      });
    const onSessionChange = () => active && setState({ ready: true, authenticated: hasSession() });
    window.addEventListener('shiftsync:auth-session-changed', onSessionChange);
    return () => {
      active = false;
      window.removeEventListener('shiftsync:auth-session-changed', onSessionChange);
    };
  }, []);

  return <AuthSessionContext.Provider value={state}>{children}</AuthSessionContext.Provider>;
}
