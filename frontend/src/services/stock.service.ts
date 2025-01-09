import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosRequestHeaders } from 'axios';
import authService from './auth.service';
import { StockPrice, StockOverview, StockPrediction, StockNews, TimeRange } from '../types/stock';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const timeRanges: TimeRange[] = [
  { label: '1 Day', value: '1D', interval: '5min' },
  { label: '1 Week', value: '1W', interval: '15min' },
  { label: '1 Month', value: '1M', interval: '1hour' },
  { label: '3 Months', value: '3M', interval: '1day' },
  { label: '6 Months', value: '6M', interval: '1day' },
  { label: '1 Year', value: '1Y', interval: '1day' },
  { label: '5 Years', value: '5Y', interval: '1week' },
];

interface HistoricalData {
  prices: number[];
  volume: number[];
  market_prices: number[];
}

interface AnalystRating {
  firm: string;
  rating: string;
  target_price: number;
  date: string;
}

interface InsiderTrade {
  type: string;
  shares: number;
  price: number;
  date: string;
}

interface EnhancedPredictionResult {
  symbol: string;
  predictions: number[];
  signal: string;
  confidence: number;
  analysis: {
    wall_street: {
      consensus: string;
      average_target: number | null;
      confidence: number;
    };
    insider_trading: {
      signal: string;
      confidence: number;
      net_shares: number;
    };
    historical: {
      trend: string;
      strength: number;
      volatility: number;
      market_correlation: number;
    };
  };
}

interface StockOpportunity {
  symbol: string;
  potential_gain: number;
  confidence: number;
  target_price: number;
  current_price: number;
  volatility: number;
  market_correlation: number;
}

interface BlueChipStock {
  symbol: string;
  name: string;
  market_cap: number;
  primary_exchange: string;
}

interface HistoricalBar {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

class StockService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_URL,
    });

    // Add auth token to requests
    this.api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
      const headers = authService.getAuthHeader();
      config.headers = {
        ...config.headers,
        ...headers,
      } as AxiosRequestHeaders;
      return config;
    });
  }

  async getStockOverview(symbol: string): Promise<StockOverview> {
    try {
      const response = await this.api.get<StockOverview>(`/api/stocks/${symbol}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch stock overview');
    }
  }

  async getHistoricalData(
    symbol: string,
    range: TimeRange['value'],
    interval?: string
  ): Promise<HistoricalBar[]> {
    try {
      const timeRange = timeRanges.find(r => r.value === range);
      const response = await this.api.get<HistoricalBar[]>(`/api/stocks/${symbol}/historical`, {
        params: {
          interval: timeRange?.interval,
          range,
        },
      });
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        // Return empty array for stocks with no data
        return [];
      }
      throw new Error(error.response?.data?.message || 'Failed to fetch historical data');
    }
  }

  async getPredictions(
    symbol: string,
    days: number = 7
  ): Promise<StockPrediction[]> {
    try {
      const response = await this.api.get<StockPrediction[]>(`/api/stocks/${symbol}/predictions`, {
        params: { days },
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch predictions');
    }
  }

  async getEnhancedPrediction(
    symbol: string,
    historicalData: HistoricalData,
    analystRatings: AnalystRating[],
    insiderTrades: InsiderTrade[],
    predictionDays: number = 7
  ): Promise<EnhancedPredictionResult> {
    try {
      const response = await this.api.post<EnhancedPredictionResult>('/api/enhanced-predict', {
        symbol,
        historical_data: historicalData,
        analyst_ratings: analystRatings,
        insider_trades: insiderTrades,
        prediction_days: predictionDays
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to get enhanced prediction');
    }
  }

  async scanBlueChipStocks(
    symbols: string[],
    historicalData: { [key: string]: HistoricalData },
    minGainPotential: number = 5.0
  ): Promise<StockOpportunity[]> {
    try {
      const response = await this.api.post<{ success: boolean, opportunities: StockOpportunity[] }>('/api/scan/blue-chip', {
        symbols,
        historical_data: historicalData,
        min_gain_potential: minGainPotential
      });
      return response.data.opportunities;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to scan blue-chip stocks');
    }
  }

  async getBlueChipStocks(): Promise<BlueChipStock[]> {
    try {
      const response = await this.api.get<{ success: boolean, data: BlueChipStock[] }>('/api/stocks/blue-chip');
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch blue-chip stocks');
    }
  }

  async getStockNews(symbol: string): Promise<StockNews[]> {
    try {
      const response = await this.api.get<StockNews[]>(`/api/stocks/${symbol}/news`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch news');
    }
  }

  async addToWatchlist(symbol: string): Promise<void> {
    try {
      await this.api.post('/api/watchlist', { symbol });
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to add to watchlist');
    }
  }

  async removeFromWatchlist(symbol: string): Promise<void> {
    try {
      await this.api.delete(`/api/watchlist/${symbol}`);
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to remove from watchlist');
    }
  }

  async getWatchlist(): Promise<StockOverview[]> {
    try {
      const response = await this.api.get<StockOverview[]>('/api/watchlist');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch watchlist');
    }
  }

  async searchStocks(query: string): Promise<StockOverview[]> {
    try {
      const response = await this.api.get<StockOverview[]>('/api/stocks/search', {
        params: { q: query },
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to search stocks');
    }
  }

  getTimeRanges(): TimeRange[] {
    return timeRanges;
  }
}

const stockService = new StockService();
export default stockService;