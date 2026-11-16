import { useEffect, useRef, useState, useCallback } from 'react';
import { Client } from '@stomp/stompjs';
import { toast } from './toastApi.js';
import { WebSocketContext } from './webSocketContextValue.js';
import { getMyProfile } from '../services/employeeService';
import { getAllStores } from '../services/storeService';
import { getAccessToken } from '../services/authSession';
import { useAuthSession } from './authSessionHooks';

export function WebSocketProvider({ children }) {
  const { authenticated } = useAuthSession();
  const [connected, setConnected] = useState(false);
  const clientRef = useRef(null);
  const [currentUserId, setCurrentUserId] = useState('');
  const [currentStoreId, setCurrentStoreId] = useState('');
  const [identityReady, setIdentityReady] = useState(false);

  // Never subscribe with IDs left by a previous account in browser storage.
  // The server is the authority for both the current identity and accessible stores.
  useEffect(() => {
    const token = getAccessToken();
    if (!authenticated || !token) {
      // Defer local state cleanup so this synchronization effect does not
      // trigger a cascading render during React's commit phase.
      queueMicrotask(() => {
        setCurrentUserId('');
        setCurrentStoreId('');
        setIdentityReady(false);
      });
      return undefined;
    }

    let active = true;
    queueMicrotask(() => setIdentityReady(false));
    Promise.all([getMyProfile(), getAllStores(0, 500)])
      .then(([profileResponse, storesResponse]) => {
        if (!active || !profileResponse.data?.id) return;
        const userId = String(profileResponse.data.id);
        const stores = storesResponse.data?.content || storesResponse.data?.data ||
          (Array.isArray(storesResponse.data) ? storesResponse.data : []);
        const savedStoreId = localStorage.getItem('selectedStoreId');
        const selectedStore = stores.find((store) => String(store.id) === String(savedStoreId)) || stores[0];

        setCurrentUserId(userId);
        localStorage.setItem('userId', userId);
        if (selectedStore?.id) {
          const storeId = String(selectedStore.id);
          setCurrentStoreId(storeId);
          localStorage.setItem('selectedStoreId', storeId);
          window.dispatchEvent(new CustomEvent('storeChanged', { detail: { storeId } }));
        } else {
          setCurrentStoreId('');
          localStorage.removeItem('selectedStoreId');
        }
        setIdentityReady(true);
      })
      .catch((error) => {
        if (active) console.warn('[WebSocket] Không thể xác thực ngữ cảnh đăng ký:', error?.message);
      });

    return () => { active = false; };
  }, [authenticated]);

  // Listen to store switch events
  useEffect(() => {
    const handleStoreChange = (e) => {
      const storeId = e.detail?.storeId;
      if (storeId) {
        setCurrentStoreId(storeId);
      }
    };
    window.addEventListener('storeChanged', handleStoreChange);
    return () => window.removeEventListener('storeChanged', handleStoreChange);
  }, []);

  // 2. Initialize STOMP client
  useEffect(() => {
    const token = getAccessToken();
    if (!authenticated || !identityReady || !token) {
      if (clientRef.current) {
        clientRef.current.deactivate();
        clientRef.current = null;
        setConnected(false);
      }
      return;
    }

    const apiUrl = import.meta.env.VITE_API_URL || '/api';
    const apiOrigin = new URL(apiUrl, window.location.origin).origin;
    const wsUrl = apiOrigin.replace(/^http/, 'ws') + '/ws/websocket';

    const handleIncomingNotification = (notif) => {
      if (!notif) return;
      toast.info(notif.message, notif.title || 'Thông báo mới');
      window.dispatchEvent(new CustomEvent('notification_received', { detail: notif }));
    };

    const subscribeToStoreTopics = (cli, storeId) => {
      cli.subscribe(`/topic/store/${storeId}/shifts`, (msg) => {
        try {
          const ev = JSON.parse(msg.body);
          window.dispatchEvent(new CustomEvent('store_shifts_updated', { detail: ev }));
        } catch (e) {
          console.warn('[WebSocket] Shift event parse error:', e);
        }
      });

      cli.subscribe(`/topic/store/${storeId}/attendance`, (msg) => {
        try {
          const ev = JSON.parse(msg.body);
          window.dispatchEvent(new CustomEvent('store_attendance_updated', { detail: ev }));
        } catch (e) {
          console.warn('[WebSocket] Attendance event parse error:', e);
        }
      });

      cli.subscribe(`/topic/store/${storeId}/requests`, (msg) => {
        try {
          const ev = JSON.parse(msg.body);
          window.dispatchEvent(new CustomEvent('store_requests_updated', { detail: ev }));
        } catch (e) {
          console.warn('[WebSocket] Request event parse error:', e);
        }
      });

      cli.subscribe(`/topic/store/${storeId}/marketplace`, (msg) => {
        try {
          const ev = JSON.parse(msg.body);
          window.dispatchEvent(new CustomEvent('store_marketplace_updated', { detail: ev }));
        } catch (e) {
          console.warn('[WebSocket] Marketplace event parse error:', e);
        }
      });
    };

    const client = new Client({
      brokerURL: wsUrl,
      connectHeaders: {
        Authorization: `Bearer ${token}`,
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      onConnect: () => {
        console.info('⚡ [WebSocket] Connected to ShiftSync STOMP server');
        setConnected(true);

        if (currentUserId) {
          client.subscribe(`/topic/notifications/${currentUserId}`, (message) => {
            try {
              const notif = JSON.parse(message.body);
              handleIncomingNotification(notif);
            } catch (err) {
              console.warn('[WebSocket] Error parsing notification:', err);
            }
          });
        }

        if (currentStoreId) {
          subscribeToStoreTopics(client, currentStoreId);
          window.dispatchEvent(new CustomEvent('store_connection_restored', { detail: { storeId: currentStoreId } }));
        }

        client.subscribe('/topic/system', (message) => {
          try {
            const sysEvent = JSON.parse(message.body);
            window.dispatchEvent(new CustomEvent('system_event_received', { detail: sysEvent }));
          } catch (err) {
            console.warn('[WebSocket] Error parsing system event:', err);
          }
        });
      },
      onDisconnect: () => {
        console.info('🔌 [WebSocket] Disconnected from ShiftSync STOMP server');
        setConnected(false);
      },
      onStompError: (frame) => {
        setConnected(false);
        console.warn('⚠️ [WebSocket] STOMP error:', frame?.headers?.['message'], frame?.body);
      },
      onWebSocketClose: () => {
        setConnected(false);
      },
    });

    client.activate();
    clientRef.current = client;

    return () => {
      if (client.active) {
        client.deactivate();
      }
      setConnected(false);
    };
  }, [currentUserId, currentStoreId, authenticated, identityReady]);

  const send = useCallback((destination, body, headers = {}) => {
    if (clientRef.current && clientRef.current.connected) {
      clientRef.current.publish({
        destination,
        body: typeof body === 'string' ? body : JSON.stringify(body),
        headers,
      });
    } else {
      console.warn('[WebSocket] Cannot send message: client is not connected');
    }
  }, []);

  const value = {
    connected,
    currentUserId,
    currentStoreId,
    send,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}
