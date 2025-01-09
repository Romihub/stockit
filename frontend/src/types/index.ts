export interface User {
  id: string;
  email: string;
  name: string;
}

export interface Stock {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  exchange: string;
  industry: string;
}

export interface StockPrediction {
  symbol: string;
  predictions: number[];
  timestamp: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface NavigationItem {
  label: string;
  path: string;
  icon: string;
  mobileIcon?: string;
}

export type DeviceType = 'mobile' | 'tablet' | 'desktop';