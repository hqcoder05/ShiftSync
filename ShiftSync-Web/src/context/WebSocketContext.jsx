import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { Client } from '@stomp/stompjs';
import { toast } from './ToastContext';
import { getMyProfile } from '../services/employeeService';

const WebSocketContext = createContext(null);

export function WebSocketProvider({ children }) {
  const [connected, setConnected] = useState(false);
  const clientRef = useRef(null);
  const [currentUserId, setCurrentUserId] = useState(() => localStorage.getItem('userId') || '');
  const [currentStoreId, setCurrentStoreId] = useState(() => localStorage.getItem('selectedStoreId') || '');

  // 1. Fetch current user profile to ensure we have currentUserId for personal notifications
  useEffect(() => {
    const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
    if (!token) return;

    if (!currentUserId) {
      getMyProfile()
        .then((res) => {
          if (res.data?.id) {
            setCurrentUserId(res.data.id);
            localStorage.setItem('userId', res.data.id);
          }
        })
        .catch(() => {});
    }
  }, [currentUserId]);

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
    const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
    if (!token) {
      if (clientRef.current) {
        clientRef.current.deactivate();
        clientRef.current = null;
        setConnected(false);
      }
      return;
    }

    const host = window.location.hostname || 'localhost';
    const wsUrl = (window.location.protocol === 'https:' ? 'wss://' : 'ws://') + host + ':8080/ws/websocket';

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

        client.subscribe('/topic/notifications', (message) => {
          try {
            const data = JSON.parse(message.body);
            if (data?.notification && (!data.userId || data.userId === currentUserId)) {
              handleIncomingNotification(data.notification);
            }
          } catch (err) {
            console.warn('[WebSocket] Error parsing global notification:', err);
          }
        });

        if (currentStoreId) {
          subscribeToStoreTopics(client, currentStoreId);
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
  }, [currentUserId, currentStoreId]);

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

export function useWebSocket() {
  const ctx = useContext(WebSocketContext);
  if (!ctx) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return ctx;
}