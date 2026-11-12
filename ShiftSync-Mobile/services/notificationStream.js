import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { getBaseUrl } from './api';
import { getNetworkSnapshot, subscribeNetwork } from './networkState';

const messagingListeners = new Set();
export const subscribeMessagingEvents = (callback) => { messagingListeners.add(callback); return () => messagingListeners.delete(callback); };

export function parseNotificationFrames(buffer) {
  const frames = buffer.split(/\r?\n\r?\n/);
  const remaining = frames.pop();
  return { remaining, events: frames.map((frame) => {
    const lines = frame.split(/\r?\n/);
    return { event: lines.find((line) => line.startsWith('event:'))?.slice(6).trim() || 'message',
      data: lines.filter((line) => line.startsWith('data:')).map((line) => line.slice(5).trimStart()).join('\n') };
  }).filter((event) => event.data) };
}

// XMLHttpRequest streaming works in React Native and browsers, including Authorization headers.
// No token is placed in a URL and no public notification topic is subscribed to.
export function startNotificationStream(onNotification) {
  let stopped = false, xhr, retryTimer, rotateTimer, owner, connecting = false, failureCount = 0;
  const active = () => !stopped && getNetworkSnapshot().online && (!AppState.currentState || AppState.currentState === 'active');
  const session = async () => { const values = new Map(await AsyncStorage.multiGet(['userEmail', 'accessToken'])); return { email: values.get('userEmail')?.trim().toLowerCase(), token: values.get('accessToken') }; };
  const same = (a, b) => a?.email === b?.email && a?.token === b?.token;
  const close = () => { clearTimeout(retryTimer); clearTimeout(rotateTimer); retryTimer = null; rotateTimer = null; if (xhr) { const previous = xhr; xhr = null; previous.abort(); } owner = null; };
  const schedule = (delay = 1000) => { clearTimeout(retryTimer); if (!stopped) retryTimer = setTimeout(() => { retryTimer = null; connect(); }, delay); };
  const notify = async (expectedOwner) => { if (active() && same(expectedOwner, await session())) onNotification(); };
  async function connect() {
    if (!active() || connecting || xhr) return;
    connecting = true;
    try {
      const before = await session();
      if (!before.token || !before.email) return;
      // Uses the shared Axios refresh flow before opening the long-lived authenticated connection.
      await api.get('/users/me', { expectedSessionEmail: before.email, timeout: 5000 });
      const current = await session();
      if (!active() || before.email !== current.email || !current.token) return;
      owner = current;
      const request = new XMLHttpRequest(); xhr = request;
      let offset = 0, buffer = '';
      request.open('GET', `${getBaseUrl()}/users/me/notifications/stream`, true);
      request.setRequestHeader('Authorization', `Bearer ${current.token}`);
      request.setRequestHeader('Accept', 'text/event-stream');
      request.onprogress = () => {
        if (xhr !== request || !active() || request.status !== 200) return;
        failureCount = 0;
        const text = request.responseText || '';
        buffer += text.slice(offset); offset = text.length;
        const parsed = parseNotificationFrames(buffer); buffer = parsed.remaining;
        parsed.events.forEach((event) => {
          if (['notification', 'unread-count', 'connect'].includes(event.event)) notify(current).catch(() => {});
          if (event.event === 'messaging') session().then((latest) => {
            if (active() && same(current, latest)) messagingListeners.forEach((listener) => { try { listener(); } catch {} });
          }).catch(() => {});
        });
        // XMLHttpRequest retains its response; rotate long-lived streams to keep memory bounded.
        if (offset > 1024 * 1024) { close(); schedule(100); }
      };
      const disconnected = () => {
        if (xhr !== request) return;
        close(); failureCount += 1; schedule(Math.min(30000, 1000 * 2 ** Math.min(failureCount, 5)));
      };
      request.onerror = disconnected; request.onloadend = disconnected;
      request.send();
      rotateTimer = setTimeout(() => { close(); schedule(100); }, 5 * 60 * 1000);
    } catch { failureCount += 1; schedule(Math.min(30000, 1000 * 2 ** Math.min(failureCount, 5))); }
    finally { connecting = false; }
  }
  const resume = () => { if (!active()) close(); else connect(); };
  const network = subscribeNetwork(resume);
  const app = AppState.addEventListener('change', resume);
  // Also catches login, logout and token rotation while this root runtime stays mounted.
  let checking = false;
  const identityTimer = setInterval(async () => {
    if (checking || stopped) return;
    checking = true;
    try {
      const current = await session();
      if (owner && !same(owner, current)) close();
      if (!xhr && !retryTimer && active()) connect();
    } catch {} finally { checking = false; }
  }, 1000);
  connect();
  return () => { stopped = true; close(); clearInterval(identityTimer); network(); app.remove(); };
}
