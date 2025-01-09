import React, { useState, useEffect } from 'react';
import {
  Card,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  Skeleton,
} from '@mui/material';
import BaseChart from './BaseChart';
import stockService from '../../services/stock.service';
import { StockPrice, StockPrediction, TimeRange, ChartData, HistoricalBar } from '../../types/stock';

interface StockChartProps {
  symbol: string;
  showPrediction?: boolean;
  className?: string;
}

const StockChart: React.FC<StockChartProps> = ({
  symbol,
  showPrediction = false,
  className = '',
}) => {
  const [timeRange, setTimeRange] = useState<TimeRange['value']>('1D');
  const [historicalData, setHistoricalData] = useState<StockPrice[]>([]);
  const [predictions, setPredictions] = useState<StockPrediction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const timeRanges = stockService.getTimeRanges();

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [historicalBars, predictionsData] = await Promise.all([
          stockService.getHistoricalData(symbol, timeRange),
          showPrediction ? stockService.getPredictions(symbol) : Promise.resolve([])
        ]) as [HistoricalBar[], StockPrediction[]];

        // Convert HistoricalBar[] to StockPrice[] by converting timestamp to string
        setHistoricalData(
          historicalBars.map(bar => ({
            timestamp: new Date(bar.timestamp).toISOString(),
            open: bar.open,
            high: bar.high,
            low: bar.low,
            close: bar.close,
            volume: bar.volume
          }))
        );
        setPredictions(predictionsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
      } finally {
        setIsLoading(false);
      }
    };

    void fetchData();
  }, [symbol, timeRange, showPrediction]);

  const formatChartData = (): ChartData[] => {
    const chartData: ChartData[] = historicalData.map((item) => ({
      date: new Date(item.timestamp).toLocaleDateString(),
      value: item.close,
      volume: item.volume,
      isPrediction: 0
    }));

    if (showPrediction && predictions.length > 0) {
      predictions.forEach((prediction) => {
        chartData.push({
          date: new Date(prediction.timestamp).toLocaleDateString(),
          value: prediction.predictedPrice,
          confidence: prediction.confidence,
          isPrediction: 1
        });
      });
    }

    return chartData;
  };

  const calculatePriceChange = (): { change: number; changePercent: number } => {
    if (historicalData.length < 2) return { change: 0, changePercent: 0 };
    
    const firstPrice = historicalData[0].close;
    const lastPrice = historicalData[historicalData.length - 1].close;
    const change = lastPrice - firstPrice;
    const changePercent = (change / firstPrice) * 100;
    
    return { change, changePercent };
  };

  const { change, changePercent } = calculatePriceChange();
  const isPositive = change >= 0;

  if (isLoading) {
    return (
      <Card className={`p-4 ${className}`}>
        <Skeleton variant="rectangular" height={300} />
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={`p-4 ${className}`}>
        <Typography color="error">{error}</Typography>
      </Card>
    );
  }

  return (
    <Card className={`p-4 ${className}`}>
      <div className="flex justify-between items-center mb-4">
        <div>
          <Typography variant="h6" component="h2">
            {symbol}
          </Typography>
          <Typography
            variant="body2"
            className={isPositive ? 'text-success' : 'text-danger'}
          >
            {change.toFixed(2)} ({changePercent.toFixed(2)}%)
          </Typography>
        </div>
        <ToggleButtonGroup
          value={timeRange}
          exclusive
          onChange={(_, value) => value && setTimeRange(value)}
          size="small"
        >
          {timeRanges.map((range) => (
            <ToggleButton key={range.value} value={range.value}>
              {range.label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </div>

      <BaseChart
        data={formatChartData()}
        config={{
          type: 'area',
          dataKey: 'value',
          height: 300,
          colors: {
            positive: '#10B981',
            negative: '#EF4444',
            default: isPositive ? '#10B981' : '#EF4444',
          },
        }}
      />

      {showPrediction && predictions.length > 0 && (
        <div className="mt-4">
          <Typography variant="subtitle2" className="mb-2">
            Predictions
          </Typography>
          <BaseChart
            data={formatChartData().filter(d => d.isPrediction === 1)}
            config={{
              type: 'line',
              dataKey: 'value',
              height: 100,
              showGrid: false,
              colors: {
                positive: '#6366F1',
                negative: '#6366F1',
                default: '#6366F1',
              },
            }}
          />
        </div>
      )}
    </Card>
  );
};

export default StockChart;