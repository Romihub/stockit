import { Subject } from 'rxjs';

export interface WebSocketMessage {
  type: 'trade' | 'quote' | 'error';
  symbol: string;
  data: any;
  timestamp: number;
}

export interface WebSocketConfig {
  reconnectAttempts?: number;
  reconnectInterval?: number;
  subscriptionBatchSize?: number;
  subscriptionBatchInterval?: number;
}

class WebSocketManager {
  private connections: Map<string, WebSocket>;
  private messageSubject: Subject<WebSocketMessage>;
  private reconnectAttempts: Map<string, number>;
  private config: Required<WebSocketConfig>;
  private subscriptionQueue: Set<string>;
  private processingQueue: boolean;

  constructor(config: WebSocketConfig = {}) {
    this.connections = new Map();
    this.messageSubject = new Subject();
    this.reconnectAttempts = new Map();
    this.subscriptionQueue = new Set();
    this.processingQueue = false;

    // Default configuration
    this.config = {
      reconnectAttempts: config.reconnectAttempts || 5,
      reconnectInterval: config.reconnectInterval || 5000,
      subscriptionBatchSize: config.subscriptionBatchSize || 10,
      subscriptionBatchInterval: config.subscriptionBatchInterval || 1000
    };
  }

  public get messages() {
    return this.messageSubject.asObservable();
  }

  private getWebSocketUrl(symbol: string): string {
    // Determine which provider to use based on the symbol
    if (process.env.REACT_APP_USE_POLYGON === 'true') {
      return `${process.env.REACT_APP_POLYGON_WS_URL}/${symbol}`;
    }
    return `${process.env.REACT_APP_FINNHUB_WS_URL}/${symbol}`;
  }

  public async subscribe(symbol: string): Promise<void> {
    this.subscriptionQueue.add(symbol);
    if (!this.processingQueue) {
      await this.processSubscriptionQueue();
    }
  }

  private async processSubscriptionQueue(): Promise<void> {
    this.processingQueue = true;
    const batchSize = this.config.subscriptionBatchSize;

    while (this.subscriptionQueue.size > 0) {
      const batch = Array.from(this.subscriptionQueue).slice(0, batchSize);
      const promises = batch.map(symbol => this.connectToSymbol(symbol));

      try {
        await Promise.all(promises);
        batch.forEach(symbol => this.subscriptionQueue.delete(symbol));
      } catch (error) {
        console.error('Failed to process subscription batch:', error);
      }

      if (this.subscriptionQueue.size > 0) {
        await new Promise(resolve => 
          setTimeout(resolve, this.config.subscriptionBatchInterval)
        );
      }
    }

    this.processingQueue = false;
  }

  private async connectToSymbol(symbol: string): Promise<void> {
    if (this.connections.has(symbol)) {
      return;
    }

    try {
      const ws = new WebSocket(this.getWebSocketUrl(symbol));
      this.setupWebSocketHandlers(ws, symbol);
      this.connections.set(symbol, ws);
      this.reconnectAttempts.set(symbol, 0);
    } catch (error) {
      console.error(`Failed to connect to WebSocket for ${symbol}:`, error);
      throw error;
    }
  }

  private setupWebSocketHandlers(ws: WebSocket, symbol: string): void {
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.messageSubject.next({
          type: this.determineMessageType(data),
          symbol,
          data,
          timestamp: Date.now()
        });
      } catch (error) {
        console.error(`Failed to parse WebSocket message for ${symbol}:`, error);
      }
    };

    ws.onclose = () => {
      this.handleDisconnection(symbol);
    };

    ws.onerror = (error) => {
      console.error(`WebSocket error for ${symbol}:`, error);
      this.messageSubject.next({
        type: 'error',
        symbol,
        data: error,
        timestamp: Date.now()
      });
    };
  }

  private determineMessageType(data: any): 'trade' | 'quote' | 'error' {
    if (data.type === 'error') return 'error';
    if (data.p || data.price) return 'trade';
    return 'quote';
  }

  private async handleDisconnection(symbol: string): Promise<void> {
    const attempts = this.reconnectAttempts.get(symbol) || 0;
    
    if (attempts < this.config.reconnectAttempts) {
      this.reconnectAttempts.set(symbol, attempts + 1);
      console.log(`Attempting to reconnect to ${symbol}, attempt ${attempts + 1}`);
      
      await new Promise(resolve => 
        setTimeout(resolve, this.config.reconnectInterval)
      );
      
      await this.connectToSymbol(symbol);
    } else {
      console.error(`Failed to reconnect to ${symbol} after ${attempts} attempts`);
      this.unsubscribe(symbol);
    }
  }

  public unsubscribe(symbol: string): void {
    const connection = this.connections.get(symbol);
    if (connection) {
      connection.close();
      this.connections.delete(symbol);
      this.reconnectAttempts.delete(symbol);
    }
  }

  public unsubscribeAll(): void {
    this.connections.forEach((ws, symbol) => {
      this.unsubscribe(symbol);
    });
  }

  public getActiveSubscriptions(): string[] {
    return Array.from(this.connections.keys());
  }

  public getConnectionStatus(symbol: string): 'connected' | 'connecting' | 'disconnected' {
    const connection = this.connections.get(symbol);
    if (!connection) return 'disconnected';
    return connection.readyState === WebSocket.OPEN ? 'connected' : 'connecting';
  }
}

// Singleton instance
const websocketService = new WebSocketManager();
export default websocketService;