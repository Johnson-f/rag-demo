/**
 * WebSocket client for streaming trade chat responses
 */

export type WsMessageType = 
  | { type: 'chat'; message: string; contextLimit?: number }
  | { type: 'textChunk'; content: string }
  | { type: 'complete'; totalChunks: number }
  | { type: 'error'; error: string }
  | { type: 'ping' }
  | { type: 'pong' };

export interface TradeStreamCallbacks {
  onChunk?: (content: string) => void;
  onComplete?: (totalChunks: number) => void;
  onError?: (error: string) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export class TradeStreamClient {
  private ws: WebSocket | null = null;
  private url: string;
  private callbacks: TradeStreamCallbacks;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor(url: string, callbacks: TradeStreamCallbacks = {}) {
    this.url = url;
    this.callbacks = callbacks;
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.warn('WebSocket already connected');
      return;
    }

    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
      this.callbacks.onConnect?.();
    };

    this.ws.onmessage = (event) => {
      try {
        const message: WsMessageType = JSON.parse(event.data);
        
        switch (message.type) {
          case 'textChunk':
            this.callbacks.onChunk?.(message.content);
            break;
          case 'complete':
            this.callbacks.onComplete?.(message.totalChunks);
            break;
          case 'error':
            this.callbacks.onError?.(message.error);
            break;
          case 'pong':
            // Handle pong if needed
            break;
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.callbacks.onError?.('WebSocket connection error');
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      this.callbacks.onDisconnect?.();
      this.ws = null;

      // Attempt to reconnect
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        console.log(`Reconnecting... (attempt ${this.reconnectAttempts})`);
        setTimeout(() => this.connect(), this.reconnectDelay * this.reconnectAttempts);
      }
    };
  }

  sendChat(message: string, contextLimit?: number): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('WebSocket not connected');
      this.callbacks.onError?.('Not connected to server');
      return;
    }

    const msg: WsMessageType = {
      type: 'chat',
      message,
      contextLimit,
    };

    this.ws.send(JSON.stringify(msg));
  }

  ping(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    const msg: WsMessageType = { type: 'ping' };
    this.ws.send(JSON.stringify(msg));
  }

  disconnect(): void {
    if (this.ws) {
      this.reconnectAttempts = this.maxReconnectAttempts; // Prevent reconnection
      this.ws.close();
      this.ws = null;
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

/**
 * Create a WebSocket client for trade chat streaming
 */
export function createTradeStreamClient(callbacks: TradeStreamCallbacks = {}): TradeStreamClient {
  const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080/api/ws/trades/chat';
  return new TradeStreamClient(wsUrl, callbacks);
}
