import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Typography,
  Grid,
  Card,
  CardContent,
  Skeleton,
  Tabs,
  Tab,
  Button,
  Chip,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Favorite,
  FavoriteBorder,
  Article,
} from '@mui/icons-material';
import StockChart from '../components/stock/StockChart';
import stockService from '../services/stock.service';
import { StockOverview, StockNews } from '../types/stock';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <div hidden={value !== index} className="py-4">
    {value === index && children}
  </div>
);

const StockDetails: React.FC = () => {
  const { symbol } = useParams<{ symbol: string }>();
  const [stock, setStock] = useState<StockOverview | null>(null);
  const [isWatchlisted, setIsWatchlisted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [news, setNews] = useState<StockNews[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!symbol) return;
      
      setIsLoading(true);
      setError(null);
      try {
        const [stockData, watchlist, newsData] = await Promise.all([
          stockService.getStockOverview(symbol),
          stockService.getWatchlist(),
          stockService.getStockNews(symbol),
        ]);
        setStock(stockData);
        setIsWatchlisted(watchlist.some(item => item.symbol === symbol));
        setNews(newsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch stock data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [symbol]);

  const handleWatchlistToggle = async () => {
    if (!symbol || !stock) return;

    try {
      if (isWatchlisted) {
        await stockService.removeFromWatchlist(symbol);
      } else {
        await stockService.addToWatchlist(symbol);
      }
      setIsWatchlisted(!isWatchlisted);
    } catch (error) {
      console.error('Failed to update watchlist:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton variant="rectangular" height={400} />
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Skeleton variant="rectangular" height={200} />
          </Grid>
          <Grid item xs={12} md={4}>
            <Skeleton variant="rectangular" height={200} />
          </Grid>
        </Grid>
      </div>
    );
  }

  if (error || !stock) {
    return (
      <Card className="p-6">
        <Typography color="error">{error || 'Stock not found'}</Typography>
      </Card>
    );
  }

  const isPositive = stock.change >= 0;
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <Typography variant="h4" component="h1">
            {stock.name} ({stock.symbol})
          </Typography>
          <div className="flex items-center space-x-4 mt-2">
            <Typography variant="h5">${stock.price.toFixed(2)}</Typography>
            <div className={`flex items-center ${isPositive ? 'text-success' : 'text-danger'}`}>
              <TrendIcon className="mr-1" />
              <Typography>
                {stock.change.toFixed(2)} ({stock.changePercent.toFixed(2)}%)
              </Typography>
            </div>
          </div>
        </div>
        <Button
          variant="outlined"
          color={isWatchlisted ? 'error' : 'primary'}
          startIcon={isWatchlisted ? <Favorite /> : <FavoriteBorder />}
          onClick={handleWatchlistToggle}
        >
          {isWatchlisted ? 'Remove from Watchlist' : 'Add to Watchlist'}
        </Button>
      </div>

      {/* Chart */}
      <StockChart symbol={symbol!} showPrediction />

      {/* Tabs */}
      <Card>
        <Tabs
          value={tabValue}
          onChange={(_, newValue) => setTabValue(newValue)}
          className="border-b border-gray-200"
        >
          <Tab label="Overview" />
          <Tab label="News" />
          <Tab label="Predictions" />
        </Tabs>

        {/* Overview Tab */}
        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" className="mb-4">Company Information</Typography>
              <div className="space-y-2">
                <div>
                  <Typography variant="subtitle2" color="textSecondary">Exchange</Typography>
                  <Typography>{stock.exchange}</Typography>
                </div>
                <div>
                  <Typography variant="subtitle2" color="textSecondary">Industry</Typography>
                  <Typography>{stock.industry}</Typography>
                </div>
                <div>
                  <Typography variant="subtitle2" color="textSecondary">Market Cap</Typography>
                  <Typography>${(stock.marketCap / 1e9).toFixed(2)}B</Typography>
                </div>
                <div>
                  <Typography variant="subtitle2" color="textSecondary">Volume</Typography>
                  <Typography>{stock.volume.toLocaleString()}</Typography>
                </div>
              </div>
            </Grid>
          </Grid>
        </TabPanel>

        {/* News Tab */}
        <TabPanel value={tabValue} index={1}>
          <div className="space-y-4">
            {news.map((item, index) => (
              <Card key={index} variant="outlined">
                <CardContent>
                  <div className="flex items-start space-x-4">
                    <Article className="text-gray-400" />
                    <div>
                      <Typography variant="h6">{item.title}</Typography>
                      <Typography variant="body2" color="textSecondary" className="mb-2">
                        {new Date(item.publishedAt).toLocaleDateString()}
                      </Typography>
                      <Typography variant="body2">{item.description}</Typography>
                      <div className="mt-2">
                        <Chip
                          label={item.source}
                          size="small"
                          className="mr-2"
                        />
                        <Button
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          size="small"
                        >
                          Read More
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabPanel>

        {/* Predictions Tab */}
        <TabPanel value={tabValue} index={2}>
          <Typography variant="h6" className="mb-4">Price Predictions</Typography>
          <Typography variant="body2" color="textSecondary">
            Our AI model predicts potential price movements based on historical data and market trends.
            These predictions are updated daily and should be used as part of a comprehensive
            investment strategy.
          </Typography>
        </TabPanel>
      </Card>
    </div>
  );
};

export default StockDetails;