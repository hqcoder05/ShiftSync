import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';
import { getMyShifts } from './shiftService';
import { getNetworkSnapshot, subscribeNetwork } from './networkState';
import { createResumeCoordinator } from './resumeCoordinator';
const listeners = new Set();
export const subscribeResumeSync = (listener) => { listeners.add(listener); return () => listeners.delete(listener); };
export function startResumeSync() {
  const active = () => (!AppState.currentState || AppState.currentState === 'active') && (Platform.OS !== 'web' || typeof document === 'undefined' || document.visibilityState !== 'hidden');
  const coordinator = createResumeCoordinator({
    readSession: async () => { const values = new Map(await AsyncStorage.multiGet(['userEmail', 'accessToken'])); return { email: values.get('userEmail')?.trim().toLowerCase(), token: values.get('accessToken') }; },
    validate: (email) => api.get('/users/me', { expectedSessionEmail: email, timeout: 10000 }),
    syncShifts: (email) => getMyShifts({ expectedSessionEmail: email }),
    isOnline: () => getNetworkSnapshot().online, isActive: active,
    publish: (event) => listeners.forEach((listener) => { try { listener(event); } catch {} }),
  });
  let previous = AppState.currentState;
  const app = AppState.addEventListener('change', (state) => {
    const was = previous; previous = state;
    if (state !== 'active') coordinator.suspend();
    else if (was !== 'active') coordinator.request();
  });
  const network = subscribeNetwork(() => { if (getNetworkSnapshot().online) coordinator.request(); });
  // React Native Web maps visibility to AppState. The native event above also
  // covers iOS/Android; no polling timer or hidden-screen fetch loop is needed.
  return () => { app.remove(); network(); coordinator.stop(); };
}
