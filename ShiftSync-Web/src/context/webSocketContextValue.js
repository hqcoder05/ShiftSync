import { createContext, useContext } from 'react';

export const WebSocketContext = createContext(null);

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (!context) throw new Error('useWebSocket must be used within a WebSocketProvider');
  return context;
}
