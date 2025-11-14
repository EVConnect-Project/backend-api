'use client';

import React, { createContext, useContext } from 'react';

interface WebSocketContextType {
  socket: null;
  isConnected: boolean;
  connectionStatus: 'disconnected';
}

const WebSocketContext = createContext<WebSocketContextType>({
  socket: null,
  isConnected: false,
  connectionStatus: 'disconnected',
});

export const useWebSocket = () => useContext(WebSocketContext);

interface WebSocketProviderProps {
  children: React.ReactNode;
}

// Placeholder WebSocket provider - WebSocket functionality removed
export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ children }) => {
  return (
    <WebSocketContext.Provider value={{ socket: null, isConnected: false, connectionStatus: 'disconnected' }}>
      {children}
    </WebSocketContext.Provider>
  );
};
