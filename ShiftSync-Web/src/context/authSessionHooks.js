import { useContext } from 'react';
import { AuthSessionContext } from './authSessionContextValue';

export const useAuthSession = () => useContext(AuthSessionContext);
