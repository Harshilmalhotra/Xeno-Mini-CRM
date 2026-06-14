import { useEffect, useRef, useCallback } from 'react';

export function useCampaignSocket(onMessage: (data: any) => void) {
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<ReturnType<typeof setTimeout>>();

  const connect = useCallback(() => {
    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:4000';
    const socket = new WebSocket(wsUrl + '/ws');
    
    socket.onmessage = (e) => onMessage(JSON.parse(e.data));
    socket.onclose = () => {
      reconnectTimeout.current = setTimeout(connect, 3000);
    };
    socket.onerror = (err) => {
      console.error('WebSocket encountered error:', err);
      socket.close();
    };
    ws.current = socket;
  }, [onMessage]);

  useEffect(() => {
    connect();
    return () => {
      ws.current?.close();
      clearTimeout(reconnectTimeout.current);
    };
  }, [connect]);
}
