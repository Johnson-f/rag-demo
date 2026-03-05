// WebSocket client for streaming multi-step analysis

export interface AnalysisEvent {
  type: 'step_start' | 'step_complete' | 'query_classified' | 'trades_retrieving' | 
        'trades_retrieved' | 'analysis_generating' | 'analysis_chunk' | 'analysis_complete' | 
        'error' | 'complete';
  step?: string;
  description?: string;
  data?: any;
  query_type?: string;
  confidence?: string;
  strategy?: string;
  limit?: number;
  count?: number;
  trades?: any[];
  model?: string;
  context_size?: number;
  content?: string;
  analysis?: string;
  message?: string;
}

export interface MultiStepStreamCallbacks {
  onConnect?: () => void;
  onDisconnect?: () => void;
  onEvent?: (event: AnalysisEvent) => void;
  onError?: (error: string) => void;
}

export interface MultiStepStreamClient {
  connect: () => void;
  disconnect: () => void;
  analyze: (query: string) => void;
  isConnected: () => boolean;
}

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080';

export function createMultiStepStreamClient(
  callbacks: MultiStepStreamCallbacks
): MultiStepStreamClient {
  let ws: WebSocket | null = null;
  let reconnectAttempts = 0;
  const maxReconnectAttempts = 5;
  const reconnectDelay = 2000;

  const connect = () => {
    if (ws?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      ws = new WebSocket(`${WS_URL}/ws/trades/analyze`);

      ws.onopen = () => {
        console.log('Multi-step WebSocket connected');
        reconnectAttempts = 0;
        callbacks.onConnect?.();
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          if (message.type === 'event' && message.event) {
            callbacks.onEvent?.(message.event);
          } else if (message.type === 'error') {
            callbacks.onError?.(message.error);
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        callbacks.onError?.('WebSocket connection error');
      };

      ws.onclose = () => {
        console.log('Multi-step WebSocket disconnected');
        callbacks.onDisconnect?.();

        // Attempt to reconnect
        if (reconnectAttempts < maxReconnectAttempts) {
          reconnectAttempts++;
          console.log(`Reconnecting... (attempt ${reconnectAttempts}/${maxReconnectAttempts})`);
          setTimeout(connect, reconnectDelay);
        }
      };
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      callbacks.onError?.('Failed to establish connection');
    }
  };

  const disconnect = () => {
    if (ws) {
      ws.close();
      ws = null;
    }
  };

  const analyze = (query: string) => {
    if (ws?.readyState === WebSocket.OPEN) {
      const message = {
        type: 'analyze',
        query,
      };
      ws.send(JSON.stringify(message));
    } else {
      callbacks.onError?.('WebSocket not connected');
    }
  };

  const isConnected = () => {
    return ws?.readyState === WebSocket.OPEN;
  };

  return {
    connect,
    disconnect,
    analyze,
    isConnected,
  };
}
