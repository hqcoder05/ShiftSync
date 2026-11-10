import NetInfo from '@react-native-community/netinfo';
import { AppState } from 'react-native';

let snapshot = { online: true, known: false };
const listeners = new Set();
let stop;
export const getNetworkSnapshot = () => snapshot;
export const subscribeNetwork = (listener) => { listeners.add(listener); return () => listeners.delete(listener); };
export function startNetworkMonitor() {
  if (stop) return;
  const update = (state) => {
    const next = { online: state.isConnected !== false && state.isInternetReachable !== false, known: state.isConnected != null };
    if (snapshot.online === next.online && snapshot.known === next.known) return;
    snapshot = next;
    listeners.forEach((listener) => listener());
  };
  const unsubscribe = NetInfo.addEventListener(update);
  NetInfo.fetch().then(update).catch(() => {});
  const app = AppState.addEventListener('change', (state) => { if (state === 'active') NetInfo.refresh().then(update).catch(() => {}); });
  stop = () => { unsubscribe(); app.remove(); stop = null; };
}
export const isNetworkFailure = (error) => !error?.response || error.response.status >= 500 || error.response.status === 408;
