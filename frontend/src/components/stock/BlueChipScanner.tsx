import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  CircularProgress,
  Button,
  TextField,
  Box,
  Tooltip,
  IconButton,
  Alert,
  Checkbox
} from '@mui/material';
import { TrendingUp, Info, Refresh, SignalWifi4Bar, SignalWifiOff } from '@mui/icons-material';
import stockService from '../../services/stock.service';
import { useToast } from '../../context/ToastContext';
import useStockUpdates from '../../hooks/useStockUpdates';

interface BlueChipStock {
  symbol: string;
  name: string;
  market_cap: number;
  primary_exchange: string;
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

interface HistoricalData {
  prices: number[];
  volume: number[];
  market_prices: number[];
}

interface StockHistoricalData {
  symbol: string;
  data: HistoricalData;
}

const BlueChipScanner: React.FC = (): JSX.Element => {
  const [opportunities, setOpportunities] = useState<StockOpportunity[]>([]);
  const [loading, setLoading] = useState(false);
  const [minGain, setMinGain] = useState(5);
  const [blueChipStocks, setBlueChipStocks] = useState<BlueChipStock[]>([]);
  const [selectedStocks, setSelectedStocks] = useState<string[]>([]);
  const { showToast } = useToast();

  // Format market cap to billions/trillions
  const formatMarketCap = (marketCap: number): string => {
    if (marketCap >= 1e12) {
      return `$${(marketCap / 1e12).toFixed(1)}T`;
    }
    return `$${(marketCap / 1e9).toFixed(1)}B`;
  };

  // Get real-time updates for scanned stocks
  const { updates, isConnected, error: wsError } = useStockUpdates({
    symbols: opportunities.map(opp => opp.symbol),
    onUpdate: (update) => {
      setOpportunities(prev => prev.map(opp => 
        opp.symbol === update.symbol
          ? {
              ...opp,
              current_price: update.price,
              potential_gain: ((opp.target_price - update.price) / update.price) * 100
            }
          : opp
      ));
    },
    batchUpdates: true,
    updateInterval: 1000
  });

  const fetchBlueChipStocks = useCallback(async () => {
    try {
      // Clear any existing error state
      setBlueChipStocks([]);
      
      const stocks = await stockService.getBlueChipStocks();
      if (stocks.length === 0) {
        showToast('No blue-chip stocks available', 'warning');
        return;
      }

      setBlueChipStocks(stocks);
      // Select first 10 stocks by default for better performance
      setSelectedStocks(stocks.slice(0, 10).map(stock => stock.symbol));
      
      if (stocks.length < 20) {
        showToast('Using available blue-chip stocks. More will be added as data is fetched.', 'info');
      }
    } catch (error) {
      console.error('Failed to fetch blue-chip stocks:', error);
      showToast('Failed to fetch stock list. Using fallback data.', 'warning');
    }
  }, [showToast]);

  const scanStocks = async (): Promise<void> => {
    if (selectedStocks.length === 0) {
      showToast('Please select at least one stock to scan', 'warning');
      return;
    }

    setLoading(true);
    setOpportunities([]); // Clear previous results

    // Track progress
    let processedCount = 0;
    const totalStocks = selectedStocks.length;
    
    try {
      const timeRange = stockService.getTimeRanges().find(r => r.value === '1M');
      const batchSize = 3; // Reduced batch size
      const batches = [];
      
      // Split selected stocks into smaller batches
      for (let i = 0; i < selectedStocks.length; i += batchSize) {
        batches.push(selectedStocks.slice(i, i + batchSize));
      }

      const validHistoricalData: Record<string, HistoricalData> = {};
      const failedStocks: string[] = [];

      // Process each batch sequentially
      for (const batch of batches) {
        showToast(`Processing ${processedCount + 1}-${Math.min(processedCount + batchSize, totalStocks)} of ${totalStocks} stocks...`, 'info');
        
        const batchPromises = batch.map(async (symbol) => {
          try {
            // Try to get from cache first (handled in service)
            const data = await stockService.getHistoricalData(symbol, '1M', timeRange?.interval);
            
            // Validate data structure
            if (!Array.isArray(data)) {
              console.error(`Invalid data structure for ${symbol}:`, data);
              throw new Error(`Invalid data structure for ${symbol}`);
            }

            if (data.length === 0) {
              throw new Error(`No historical data available for ${symbol}`);
            }

            // Validate each bar has required properties
            const validBars = data.filter(bar =>
              bar &&
              typeof bar.close === 'number' &&
              typeof bar.volume === 'number'
            );

            if (validBars.length === 0) {
              throw new Error(`No valid price data for ${symbol}`);
            }

            return {
              symbol,
              data: {
                prices: validBars.map(bar => bar.close),
                volume: validBars.map(bar => bar.volume),
                market_prices: validBars.map(bar => bar.close)
              }
            };
          } catch (error) {
            console.error(`Failed to fetch data for ${symbol}:`, error);
            throw error;
          }
        });

        const batchResults = await Promise.allSettled(batchPromises);
        
        batchResults.forEach((result, index) => {
          const symbol = batch[index];
          if (result.status === 'fulfilled') {
            validHistoricalData[result.value.symbol] = result.value.data;
          } else {
            failedStocks.push(symbol);
            console.error(`Failed to fetch data for ${symbol}:`, result.reason);
          }
        });

        processedCount += batch.length;

        // If we have enough valid data, start scanning
        if (Object.keys(validHistoricalData).length >= 5) {
          const scanResults = await stockService.scanBlueChipStocks(
            Object.keys(validHistoricalData),
            validHistoricalData,
            minGain
          );
          setOpportunities(prev => {
            const newOpps = [...prev];
            scanResults.forEach(opp => {
              if (!newOpps.some(existing => existing.symbol === opp.symbol)) {
                newOpps.push(opp);
              }
            });
            return newOpps.sort((a, b) => b.potential_gain - a.potential_gain);
          });
        }

        // Add delay between batches
        if (batches.indexOf(batch) < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000)); // Increased delay
        }
      }

      const validSymbols = Object.keys(validHistoricalData);
      if (validSymbols.length === 0) {
        showToast('No valid stock data available. Please try again later.', 'error');
        return;
      }

      // Show final results
      if (failedStocks.length > 0) {
        showToast(
          `Completed with ${failedStocks.length} failed stocks. Showing available opportunities.`,
          'warning'
        );
      } else {
        showToast(`Scan completed successfully`, 'success');
      }

      // Final scan with all valid data
      const finalScanResults = await stockService.scanBlueChipStocks(
        validSymbols,
        validHistoricalData,
        minGain
      );
      
      setOpportunities(finalScanResults);
    } catch (error) {
      console.error('Scan failed:', error);
      showToast('Failed to scan stocks. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchBlueChipStocks();
  }, [fetchBlueChipStocks]);

  const formatPercentage = (value: number): string => {
    return `${value.toFixed(1)}%`;
  };

  const formatPrice = (price: number): string => {
    return `$${price.toFixed(2)}`;
  };

  const getConfidenceColor = (confidence: number): 'success' | 'warning' | 'error' => {
    if (confidence >= 0.8) return 'success';
    if (confidence >= 0.6) return 'warning';
    return 'error';
  };

  return (
    <Card className="p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Typography variant="h5" component="h2" className="flex items-center whitespace-nowrap">
            <TrendingUp className="mr-2" />
            Blue-Chip Opportunities
          </Typography>
          <Tooltip title="Scans major blue-chip stocks for potential investment opportunities based on technical analysis, market trends, and AI predictions">
            <Info color="action" />
          </Tooltip>
          {isConnected ? (
            <Tooltip title="Real-time updates active">
              <SignalWifi4Bar color="success" />
            </Tooltip>
          ) : (
            <Tooltip title="Real-time updates inactive">
              <SignalWifiOff color="error" />
            </Tooltip>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <TextField
            label="Min. Gain %"
            type="number"
            size="small"
            value={minGain}
            onChange={(e) => setMinGain(Number(e.target.value))}
            InputProps={{ inputProps: { min: 1, max: 20 } }}
          />
          <Button
            variant="contained"
            color="primary"
            onClick={() => void scanStocks()}
            disabled={loading || selectedStocks.length === 0}
            startIcon={loading ? <CircularProgress size={20} /> : <TrendingUp />}
          >
            Scan Now
          </Button>
          <IconButton 
            onClick={() => void fetchBlueChipStocks()} 
            disabled={loading}
            color="primary"
          >
            <Refresh />
          </IconButton>
        </div>
      </div>

      {wsError && (
        <Alert severity="warning" className="mb-4">
          Real-time updates unavailable: {wsError}
        </Alert>
      )}

      <div className="mb-6">
        <Typography variant="h6" component="h3" className="mb-4">
          Available Blue Chip Stocks
        </Typography>
        <TableContainer component={Paper}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    indeterminate={selectedStocks.length > 0 && selectedStocks.length < blueChipStocks.length}
                    checked={selectedStocks.length === blueChipStocks.length}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      if (e.target.checked) {
                        setSelectedStocks(blueChipStocks.map(stock => stock.symbol));
                      } else {
                        setSelectedStocks([]);
                      }
                    }}
                  />
                </TableCell>
                <TableCell className="font-semibold">Symbol</TableCell>
                <TableCell className="font-semibold">Name</TableCell>
                <TableCell align="right" className="font-semibold">Market Cap</TableCell>
                <TableCell className="font-semibold">Exchange</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {blueChipStocks.map((stock) => (
                <TableRow key={stock.symbol} hover>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selectedStocks.includes(stock.symbol)}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        if (e.target.checked) {
                          setSelectedStocks([...selectedStocks, stock.symbol]);
                        } else {
                          setSelectedStocks(selectedStocks.filter(s => s !== stock.symbol));
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell component="th" scope="row">
                    <Typography variant="body2" className="font-semibold">
                      {stock.symbol}
                    </Typography>
                  </TableCell>
                  <TableCell>{stock.name}</TableCell>
                  <TableCell align="right">{formatMarketCap(stock.market_cap)}</TableCell>
                  <TableCell>{stock.primary_exchange}</TableCell>
                </TableRow>
              ))}
              {blueChipStocks.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center" className="py-4">
                    <Typography color="textSecondary">
                      Loading blue chip stocks...
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </div>

      {loading ? (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      ) : opportunities.length > 0 ? (
        <div className="overflow-x-auto">
          <Typography variant="h6" component="h3" className="mb-4">
            Investment Opportunities
          </Typography>
          <TableContainer component={Paper} className="min-w-[800px]">
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell className="font-semibold">Symbol</TableCell>
                  <TableCell align="right" className="font-semibold">Current Price</TableCell>
                  <TableCell align="right" className="font-semibold">Target Price</TableCell>
                  <TableCell align="right" className="font-semibold">Potential Gain</TableCell>
                  <TableCell align="right" className="font-semibold">Confidence</TableCell>
                  <TableCell align="right" className="font-semibold">Volatility</TableCell>
                  <TableCell align="right" className="font-semibold">Market Correlation</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {opportunities.map((stock) => (
                  <TableRow key={stock.symbol} hover>
                    <TableCell component="th" scope="row">
                      <Typography variant="body1" className="font-semibold">
                        {stock.symbol}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">{formatPrice(stock.current_price)}</TableCell>
                    <TableCell align="right">{formatPrice(stock.target_price)}</TableCell>
                    <TableCell align="right">
                      <Chip
                        label={formatPercentage(stock.potential_gain)}
                        color="success"
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Chip
                        label={formatPercentage(stock.confidence * 100)}
                        color={getConfidenceColor(stock.confidence)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">{formatPercentage(stock.volatility * 100)}</TableCell>
                    <TableCell align="right">{formatPercentage(stock.market_correlation * 100)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </div>
      ) : (
        <Alert severity="info" className="mt-4">
          Select stocks and click "Scan Now" to find investment opportunities
        </Alert>
      )}
    </Card>
  );
};

export default BlueChipScanner;