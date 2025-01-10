export interface HistoricalBar {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface StockPrice {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface StockOverview {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  marketCap: number;
  volume: number;
  exchange: string;
  industry: string;
}

export interface StockPrediction {
  timestamp: string;
  predictedPrice: number;
  confidence: number;
}

export interface StockNews {
  title: string;
  description: string;
  url: string;
  publishedAt: string;
  source: string;
  imageUrl?: string;
}

export interface ChartData {
  date: string;
  value: number;
  [key: string]: string | number; // For additional data points
}

export interface ChartConfig {
  type: 'line' | 'candlestick' | 'area' | 'bar';
  dataKey: string;
  height?: number;
  showGrid?: boolean;
  showTooltip?: boolean;
  showLegend?: boolean;
  colors?: {
    positive: string;
    negative: string;
    default: string;
  };
}

export interface TimeRange {
  label: string;
  value: '1D' | '1W' | '1M' | '3M' | '6M' | '1Y' | '5Y';
  interval: string;
}

export interface BlueChipStock {
  symbol: string;
  name: string;
  market_cap: number;
}
