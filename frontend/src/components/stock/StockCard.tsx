import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  IconButton,
  Tooltip,
  Skeleton,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Favorite,
  FavoriteBorder,
  ShowChart,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import BaseChart from './BaseChart';
import { StockOverview, ChartData } from '../../types/stock';
import stockService from '../../services/stock.service';

interface StockCardProps {
  stock: StockOverview;
  chartData?: ChartData[];
  isWatchlisted?: boolean;
  showChart?: boolean;
  isLoading?: boolean;
  className?: string;
}

const StockCard: React.FC<StockCardProps> = ({
  stock,
  chartData,
  isWatchlisted = false,
  showChart = true,
  isLoading = false,
  className,
}) => {
  const navigate = useNavigate();
  const [isFavorite, setIsFavorite] = React.useState(isWatchlisted);
  const [isUpdating, setIsUpdating] = React.useState(false);

  const handleWatchlistToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isUpdating) return;

    setIsUpdating(true);
    try {
      if (isFavorite) {
        await stockService.removeFromWatchlist(stock.symbol);
      } else {
        await stockService.addToWatchlist(stock.symbol);
      }
      setIsFavorite(!isFavorite);
    } catch (error) {
      console.error('Failed to update watchlist:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleClick = () => {
    navigate(`/stocks/${stock.symbol}`);
  };

  if (isLoading) {
    return (
      <Card className={`${className} cursor-pointer hover:shadow-lg transition-shadow`}>
        <CardContent>
          <div className="flex justify-between items-start">
            <div>
              <Skeleton width={100} height={24} />
              <Skeleton width={150} height={20} />
            </div>
            <Skeleton width={40} height={40} variant="circular" />
          </div>
          <Skeleton variant="rectangular" height={60} className="mt-4" />
        </CardContent>
      </Card>
    );
  }

  const isPositive = stock.change >= 0;
  const changeColor = isPositive ? 'text-success' : 'text-danger';
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;

  return (
    <Card
      className={`${className} cursor-pointer hover:shadow-lg transition-shadow`}
      onClick={handleClick}
    >
      <CardContent>
        <div className="flex justify-between items-start">
          <div>
            <Typography variant="h6" component="h3" className="font-medium">
              {stock.symbol}
            </Typography>
            <Typography variant="body2" color="textSecondary" noWrap>
              {stock.name}
            </Typography>
          </div>
          <div className="flex items-center space-x-2">
            <Tooltip title="View Chart">
              <IconButton size="small" onClick={(e) => {
                e.stopPropagation();
                navigate(`/stocks/${stock.symbol}`);
              }}>
                <ShowChart />
              </IconButton>
            </Tooltip>
            <Tooltip title={isFavorite ? 'Remove from Watchlist' : 'Add to Watchlist'}>
              <IconButton
                size="small"
                onClick={handleWatchlistToggle}
                disabled={isUpdating}
              >
                {isFavorite ? <Favorite color="error" /> : <FavoriteBorder />}
              </IconButton>
            </Tooltip>
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between">
          <Typography variant="h6">
            ${stock.price.toFixed(2)}
          </Typography>
          <div className={`flex items-center ${changeColor}`}>
            <TrendIcon fontSize="small" className="mr-1" />
            <Typography variant="body2">
              {stock.change.toFixed(2)} ({stock.changePercent.toFixed(2)}%)
            </Typography>
          </div>
        </div>

        {showChart && chartData && chartData.length > 0 && (
          <div className="mt-2 h-16">
            <BaseChart
              data={chartData}
              config={{
                type: 'line',
                dataKey: 'price',
                height: 60,
                showGrid: false,
                showTooltip: false,
                colors: {
                  positive: '#10B981',
                  negative: '#EF4444',
                  default: isPositive ? '#10B981' : '#EF4444',
                },
              }}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StockCard;