import { useState, useEffect, useCallback } from 'react';
import { useToast } from '../context/ToastContext';
import websocketService, { WebSocketMessage } from '../services/websocket.service';

export interface StockUpdate {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: number;
}

interface UseStockUpdatesOptions {
  symbols: string[];
  onUpdate?: (update: StockUpdate) => void;
  batchUpdates?: boolean;
  updateInterval?: number;
}

export const useStockUpdates = ({
  symbols,
  onUpdate,
  batchUpdates = true,
  updateInterval = 1000
}: UseStockUpdatesOptions) => {
  const [updates, setUpdates] = useState<Map<string, StockUpdate>>(new Map());
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  const processMessage = useCallback((message: WebSocketMessage) => {
    try {
      if (message.type === 'error') {
        setError(`WebSocket error for ${message.symbol}`);
        showToast(`Failed to get updates for ${message.symbol}`, 'error');
        return;
      }

      const update: StockUpdate = {
        symbol: message.symbol,
        price: message.type === 'trade' ? message.data.p || message.data.price : message.data.c,
        change: message.data.change || 0,
        changePercent: message.data.changePercent || 0,
        volume: message.data.v || message.data.volume || 0,
        timestamp: message.timestamp
      };

      setUpdates(prev => {
        const newUpdates = new Map(prev);
        newUpdates.set(message.symbol, update);
        return newUpdates;
      });

      if (!batchUpdates && onUpdate) {
        onUpdate(update);
      }
    } catch (err) {
      console.error('Error processing WebSocket message:', err);
      setError('Failed to process stock update');
    }
  }, [batchUpdates, onUpdate, showToast]);

  // Subscribe to WebSocket updates
  useEffect(() => {
    const subscribeToSymbols = async () => {
      try {
        await Promise.all(symbols.map(symbol => websocketService.subscribe(symbol)));
        setIsConnected(true);
        setError(null);
      } catch (err) {
        console.error('Failed to subscribe to symbols:', err);
        setError('Failed to connect to real-time updates');
        setIsConnected(false);
      }
    };

    if (symbols.length > 0) {
      void subscribeToSymbols();
    }

    const subscription = websocketService.messages.subscribe({
      next: processMessage,
      error: (err: Error) => {
        console.error('WebSocket stream error:', err);
        setError('Connection error occurred');
        setIsConnected(false);
      }
    });

    return () => {
      subscription.unsubscribe();
      symbols.forEach(symbol => websocketService.unsubscribe(symbol));
    };
  }, [symbols, processMessage]);

  // Batch updates if enabled
  useEffect(() => {
    if (!batchUpdates || !onUpdate) return;

    const interval = setInterval(() => {
      if (updates.size > 0) {
        const batchedUpdates = Array.from(updates.values());
        batchedUpdates.forEach(update => onUpdate(update));
      }
    }, updateInterval);

    return () => clearInterval(interval);
  }, [batchUpdates, onUpdate, updateInterval, updates]);

  const getLatestUpdate = useCallback((symbol: string): StockUpdate | null => {
    return updates.get(symbol) || null;
  }, [updates]);

  const getAllUpdates = useCallback((): StockUpdate[] => {
    return Array.from(updates.values());
  }, [updates]);

  return {
    updates: getAllUpdates(),
    getLatestUpdate,
    isConnected,
    error,
    reconnect: async (symbol: string) => {
      try {
        await websocketService.subscribe(symbol);
        setError(null);
      } catch (err) {
        setError(`Failed to reconnect to ${symbol}`);
      }
    }
  };
};

export default useStockUpdates;