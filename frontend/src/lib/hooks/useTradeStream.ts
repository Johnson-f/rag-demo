import { useEffect, useRef, useState, useCallback } from 'react';
import { TradeStreamClient, createTradeStreamClient } from '../client/websocket';

export interface UseTradeStreamOptions {
  autoConnect?: boolean;
  onError?: (error: string) => void;
}

export interface UseTradeStreamReturn {
  sendMessage: (message: string, contextLimit?: number) => void;
  response: string;
  isConnected: boolean;
  isStreaming: boolean;
  error: string | null;
  connect: () => void;
  disconnect: () => void;
  clearResponse: () => void;
}

export function useTradeStream(options: UseTradeStreamOptions = {}): UseTradeStreamReturn {
  const { autoConnect = true, onError } = options;
  
  const [response, setResponse] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const clientRef = useRef<TradeStreamClient | null>(null);

  const connect = useCallback(() => {
    if (clientRef.current?.isConnected()) {
      return;
    }

    const client = createTradeStreamClient({
      onConnect: () => {
        setIsConnected(true);
        setError(null);
      },
      onDisconnect: () => {
        setIsConnected(false);
        setIsStreaming(false);
      },
      onChunk: (content) => {
        setResponse((prev) => prev + content);
      },
      onComplete: () => {
        setIsStreaming(false);
      },
      onError: (err) => {
        setError(err);
        setIsStreaming(false);
        onError?.(err);
      },
    });

    client.connect();
    clientRef.current = client;
  }, [onError]);

  const disconnect = useCallback(() => {
    clientRef.current?.disconnect();
    clientRef.current = null;
    setIsConnected(false);
    setIsStreaming(false);
  }, []);

  const sendMessage = useCallback((message: string, contextLimit?: number) => {
    if (!clientRef.current?.isConnected()) {
      setError('Not connected to server');
      return;
    }

    setResponse('');
    setError(null);
    setIsStreaming(true);
    clientRef.current.sendChat(message, contextLimit);
  }, []);

  const clearResponse = useCallback(() => {
    setResponse('');
    setError(null);
  }, []);

  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  return {
    sendMessage,
    response,
    isConnected,
    isStreaming,
    error,
    connect,
    disconnect,
    clearResponse,
  };
}
