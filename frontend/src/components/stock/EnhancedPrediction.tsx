import React from 'react';
import { Card, Typography, Chip, Box, Grid } from '@mui/material';
import { TrendingUp, TrendingDown, TrendingFlat } from '@mui/icons-material';

interface Analysis {
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
}

interface EnhancedPredictionProps {
  data: {
    symbol: string;
    predictions: number[];
    signal: string;
    confidence: number;
    analysis: Analysis;
  };
}

const EnhancedPrediction: React.FC<EnhancedPredictionProps> = ({ data }) => {
  const formatPercentage = (value: number): string => {
    return `${(value * 100).toFixed(1)}%`;
  };

  const formatPrice = (price: number): string => {
    return `$${price.toFixed(2)}`;
  };

  const formatShares = (shares: number): string => {
    return shares.toLocaleString();
  };

  const getSignalIcon = (signal: string) => {
    switch (signal) {
      case 'BUY':
        return <TrendingUp className="text-green-500" />;
      case 'SELL':
        return <TrendingDown className="text-red-500" />;
      default:
        return <TrendingFlat className="text-gray-500" />;
    }
  };

  const getSignalColor = (signal: string): "success" | "error" | "default" => {
    switch (signal) {
      case 'BUY':
        return 'success';
      case 'SELL':
        return 'error';
      default:
        return 'default';
    }
  };

  const getConfidenceColor = (confidence: number): "success" | "warning" | "error" => {
    if (confidence >= 0.8) return 'success';
    if (confidence >= 0.6) return 'warning';
    return 'error';
  };

  return (
    <Card className="p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <Typography variant="h5" component="h2" className="flex items-center">
          {data.symbol} Analysis
        </Typography>
        <Chip
          icon={getSignalIcon(data.signal)}
          label={`${data.signal} (${formatPercentage(data.confidence)} confidence)`}
          color={getSignalColor(data.signal)}
          className="font-semibold"
        />
      </div>

      <Grid container spacing={2} className="mb-4">
        {/* Wall Street Analysis */}
        <Grid item xs={12} sm={6} lg={4}>
          <Card variant="outlined" className="p-4 h-full">
            <Typography variant="h6" className="mb-4">Wall Street Analysis</Typography>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Typography variant="body2" color="textSecondary">Consensus</Typography>
                <Chip
                  label={data.analysis.wall_street.consensus}
                  color={getSignalColor(data.analysis.wall_street.consensus)}
                  size="small"
                />
              </div>
              {data.analysis.wall_street.average_target && (
                <div className="flex justify-between items-center">
                  <Typography variant="body2" color="textSecondary">Target Price</Typography>
                  <Typography>{formatPrice(data.analysis.wall_street.average_target)}</Typography>
                </div>
              )}
              <div className="flex justify-between items-center">
                <Typography variant="body2" color="textSecondary">Confidence</Typography>
                <Chip
                  label={formatPercentage(data.analysis.wall_street.confidence)}
                  color={getConfidenceColor(data.analysis.wall_street.confidence)}
                  size="small"
                />
              </div>
            </div>
          </Card>
        </Grid>

        {/* Insider Trading */}
        <Grid item xs={12} sm={6} lg={4}>
          <Card variant="outlined" className="p-4 h-full">
            <Typography variant="h6" className="mb-4">Insider Trading</Typography>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Typography variant="body2" color="textSecondary">Signal</Typography>
                <Chip
                  label={data.analysis.insider_trading.signal}
                  color={getSignalColor(data.analysis.insider_trading.signal)}
                  size="small"
                />
              </div>
              <div className="flex justify-between items-center">
                <Typography variant="body2" color="textSecondary">Net Shares</Typography>
                <Typography className={data.analysis.insider_trading.net_shares >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {formatShares(data.analysis.insider_trading.net_shares)}
                </Typography>
              </div>
              <div className="flex justify-between items-center">
                <Typography variant="body2" color="textSecondary">Confidence</Typography>
                <Chip
                  label={formatPercentage(data.analysis.insider_trading.confidence)}
                  color={getConfidenceColor(data.analysis.insider_trading.confidence)}
                  size="small"
                />
              </div>
            </div>
          </Card>
        </Grid>

        {/* Historical Analysis */}
        <Grid item xs={12} sm={6} lg={4}>
          <Card variant="outlined" className="p-4 h-full">
            <Typography variant="h6" className="mb-4">Historical Analysis</Typography>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Typography variant="body2" color="textSecondary">Trend</Typography>
                <Chip
                  label={data.analysis.historical.trend}
                  color={data.analysis.historical.trend === 'BULLISH' ? 'success' : 
                         data.analysis.historical.trend === 'BEARISH' ? 'error' : 'default'}
                  size="small"
                />
              </div>
              <div className="flex justify-between items-center">
                <Typography variant="body2" color="textSecondary">Strength</Typography>
                <Chip
                  label={formatPercentage(data.analysis.historical.strength)}
                  color={getConfidenceColor(data.analysis.historical.strength)}
                  size="small"
                />
              </div>
              <div className="flex justify-between items-center">
                <Typography variant="body2" color="textSecondary">Market Correlation</Typography>
                <Typography>{formatPercentage(data.analysis.historical.market_correlation)}</Typography>
              </div>
            </div>
          </Card>
        </Grid>
      </Grid>

      {/* Price Predictions */}
      <Box className="mt-6 overflow-x-auto">
        <Typography variant="h6" className="mb-4">7-Day Price Predictions</Typography>
        <div className="flex space-x-4 pb-2">
          {data.predictions.map((price, index) => (
            <Card variant="outlined" className="p-3 text-center min-w-[120px]" key={index}>
              <Typography variant="body2" color="textSecondary" className="mb-1">
                Day {index + 1}
              </Typography>
              <Typography variant="h6" className="font-semibold">
                {formatPrice(price)}
              </Typography>
            </Card>
          ))}
        </div>
      </Box>
    </Card>
  );
};

export default EnhancedPrediction;