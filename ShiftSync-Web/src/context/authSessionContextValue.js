import { createContext } from 'react';

export const AuthSessionContext = createContext({ ready: false, authenticated: false });
