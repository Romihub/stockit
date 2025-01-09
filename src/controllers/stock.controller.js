const Stock = require('../models/stock.model');
const dataService = require('../services/data.service');
const { errorResponse, validationError } = require('../utils/errorHandler');

const addFavorite = async (req, res) => {
  try {
    const { symbol } = req.body;
    const userId = req.user.id;

    if (!symbol) {
      return validationError(res, { symbol: 'Stock symbol is required' });
    }

    // Check if stock exists or create new
    let stock = await Stock.findBySymbol(symbol);
    if (!stock) {
      // Fetch stock details from APIs
      const stockData = await dataService.getStockData(symbol);
      stock = await Stock.create({
        symbol,
        name: stockData.name,
        exchange: stockData.exchange
      });
    }

    // Add to favorites
    await Stock.addToFavorites(userId, stock.id);

    res.status(201).json({
      success: true,
      data: stock
    });
  } catch (error) {
    errorResponse(res, 500, 'Failed to add favorite stock', error);
  }
};

const removeFavorite = async (req, res) => {
  try {
    const { stockId } = req.params;
    const userId = req.user.id;

    await Stock.removeFromFavorites(userId, stockId);

    res.status(200).json({
      success: true,
      data: { message: 'Stock removed from favorites' }
    });
  } catch (error) {
    errorResponse(res, 500, 'Failed to remove favorite stock', error);
  }
};

const getFavorites = async (req, res) => {
  try {
    const userId = req.user.id;
    const favorites = await Stock.getFavorites(userId);

    res.status(200).json({
      success: true,
      data: favorites
    });
  } catch (error) {
    errorResponse(res, 500, 'Failed to get favorite stocks', error);
  }
};

const recordPurchase = async (req, res) => {
  try {
    const userId = req.user.id;
    const { stockId, purchaseDate, quantity, price, notes } = req.body;

    // Validation
    if (!stockId || !purchaseDate || !quantity || !price) {
      return validationError(res, {
        stockId: 'Stock ID is required',
        purchaseDate: 'Purchase date is required',
        quantity: 'Quantity is required',
        price: 'Price is required'
      });
    }

    // Record purchase (implementation to be added)
    res.status(201).json({
      success: true,
      data: { message: 'Purchase recorded successfully' }
    });
  } catch (error) {
    errorResponse(res, 500, 'Failed to record purchase', error);
  }
};

const getStock = async (req, res) => {
  try {
    const { symbol } = req.params;
    const stock = await Stock.findBySymbol(symbol);
    
    if (!stock) {
      return errorResponse(res, 404, 'Stock not found');
    }

    const stockData = await dataService.getStockData(symbol);
    
    res.status(200).json({
      success: true,
      data: {
        ...stock,
        ...stockData
      }
    });
  } catch (error) {
    errorResponse(res, 500, 'Failed to get stock data', error);
  }
};

const getHistoricalData = async (req, res) => {
  try {
    const { symbol } = req.params;
    const { range = '1M', interval = '1day' } = req.query;

    const data = await dataService.getHistoricalData(symbol, range, interval);
    
    if (!data || data.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No historical data available for this symbol'
      });
    }
    
    res.status(200).json({
      success: true,
      data: data
    });
  } catch (error) {
    errorResponse(res, 500, 'Failed to fetch historical data', error);
  }
};

const getStockNews = async (req, res) => {
  try {
    const { symbol } = req.params;
    const news = await dataService.getStockNews(symbol);
    
    res.status(200).json({
      success: true,
      data: news
    });
  } catch (error) {
    errorResponse(res, 500, 'Failed to get stock news', error);
  }
};

const getInsiderTrades = async (req, res) => {
  try {
    const { symbol } = req.params;
    const trades = await dataService.getInsiderTrades(symbol);
    
    res.status(200).json({
      success: true,
      data: trades
    });
  } catch (error) {
    errorResponse(res, 500, 'Failed to get insider trades', error);
  }
};

const trainModel = async (req, res) => {
  try {
    const { symbol } = req.params;
    
    // Train the model
    const result = await dataService.trainModel(symbol);
    
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    errorResponse(res, 500, 'Failed to train prediction model', error);
  }
};

const getPrediction = async (req, res) => {
  try {
    const { symbol } = req.params;
    const { days } = req.query;
    
    // Get prediction for specified days (default 7)
    const prediction = await dataService.getPrediction(symbol, parseInt(days) || 7);
    
    res.status(200).json({
      success: true,
      data: prediction
    });
  } catch (error) {
    errorResponse(res, 500, 'Failed to get prediction', error);
  }
};

// Helper functions for calculations
const calculateVolatility = (prices) => {
  if (!prices.length) return 0;
  const returns = [];
  for (let i = 1; i < prices.length; i++) {
    returns.push((prices[i] - prices[i-1]) / prices[i-1]);
  }
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
  return Math.sqrt(variance);
};

const calculateMarketCorrelation = (stockPrices, marketPrices) => {
  if (stockPrices.length !== marketPrices.length || !stockPrices.length) return 0;
  
  const stockReturns = [];
  const marketReturns = [];
  for (let i = 1; i < stockPrices.length; i++) {
    stockReturns.push((stockPrices[i] - stockPrices[i-1]) / stockPrices[i-1]);
    marketReturns.push((marketPrices[i] - marketPrices[i-1]) / marketPrices[i-1]);
  }
  
  const stockMean = stockReturns.reduce((a, b) => a + b, 0) / stockReturns.length;
  const marketMean = marketReturns.reduce((a, b) => a + b, 0) / marketReturns.length;
  
  let numerator = 0;
  let stockDenom = 0;
  let marketDenom = 0;
  
  for (let i = 0; i < stockReturns.length; i++) {
    const stockDiff = stockReturns[i] - stockMean;
    const marketDiff = marketReturns[i] - marketMean;
    numerator += stockDiff * marketDiff;
    stockDenom += stockDiff * stockDiff;
    marketDenom += marketDiff * marketDiff;
  }
  
  return numerator / Math.sqrt(stockDenom * marketDenom);
};

const calculateConfidence = (volatility, correlation, prices) => {
  // Adjust confidence calculation to favor strong trends
  const volatilityScore = Math.max(0, 1 - volatility * 8); // Less penalty for volatility
  const correlationScore = Math.abs(correlation);
  const trendScore = calculateTrendStrength(prices);
  const consistencyScore = calculateConsistency(prices);
  
  // Weight trend and consistency more heavily
  return (volatilityScore * 0.2 + correlationScore * 0.2 + trendScore * 0.4 + consistencyScore * 0.2);
};

const calculateConsistency = (prices) => {
  if (prices.length < 3) return 0;
  
  let consistentMoves = 0;
  for (let i = 2; i < prices.length; i++) {
    const currentMove = prices[i] - prices[i-1];
    const previousMove = prices[i-1] - prices[i-2];
    if ((currentMove > 0 && previousMove > 0) || (currentMove < 0 && previousMove < 0)) {
      consistentMoves++;
    }
  }
  
  return consistentMoves / (prices.length - 2);
};

const calculateTrendStrength = (prices) => {
  if (prices.length < 2) return 0;
  
  // Calculate weighted moving average of price changes with higher weights
  const changes = [];
  const weights = [0.15, 0.2, 0.25, 0.35, 0.45]; // Increased weights for recent changes
  
  for (let i = 1; i < prices.length && i <= weights.length; i++) {
    const change = (prices[prices.length - i] - prices[prices.length - i - 1]) / prices[prices.length - i - 1];
    changes.push(change * weights[i - 1]);
  }
  
  // Add momentum factor based on last two changes
  let momentum = 0;
  if (prices.length >= 3) {
    const lastChange = (prices[prices.length - 1] - prices[prices.length - 2]) / prices[prices.length - 2];
    const prevChange = (prices[prices.length - 2] - prices[prices.length - 3]) / prices[prices.length - 3];
    momentum = lastChange > prevChange ? 0.02 : 0; // Bonus for accelerating growth
  }
  
  const weightedTrend = changes.reduce((sum, change) => sum + change, 0);
  return Math.max(weightedTrend * 5 + momentum, 0); // More aggressive trend amplification
};

const scanBlueChipStocks = async (req, res) => {
  try {
    const { symbols, historical_data, min_gain_potential = 5.0 } = req.body;

    if (!symbols || !Array.isArray(symbols) || !historical_data) {
      return validationError(res, {
        message: 'Invalid input parameters'
      });
    }

    const opportunities = await Promise.all(
      symbols.map(async (symbol) => {
        try {
          const historicalPrices = historical_data[symbol]?.prices || [];
          let currentPrice;
          
          // Use last known price from historical data since it's more reliable
          currentPrice = historicalPrices[historicalPrices.length - 1];
          const volatility = calculateVolatility(historicalPrices);
          const marketCorrelation = calculateMarketCorrelation(
            historicalPrices,
            historical_data[symbol]?.market_prices || []
          );
          
          // Calculate trend-based prediction with more aggressive multiplier
          const trendStrength = calculateTrendStrength(historicalPrices);
          const trendPrediction = historicalPrices.length >= 2 
            ? historicalPrices[historicalPrices.length - 1] * (1 + trendStrength * 0.15)  // Increased multiplier
            : currentPrice * 1.05;  // Default 5% increase if not enough data

          console.log(`
${symbol} Analysis:
  Current Price: $${currentPrice.toFixed(2)}
  Predicted Price: $${trendPrediction.toFixed(2)}
  Potential Gain: ${((trendPrediction - currentPrice) / currentPrice * 100).toFixed(2)}%
  Confidence Score: ${(calculateConfidence(volatility, marketCorrelation, historicalPrices) * 100).toFixed(1)}%
  Trend Strength: ${(trendStrength * 100).toFixed(1)}%
  Consistency Score: ${(calculateConsistency(historicalPrices) * 100).toFixed(1)}%
  Volatility: ${(volatility * 100).toFixed(2)}%
  Market Correlation: ${(marketCorrelation * 100).toFixed(1)}%
`);

          // Return opportunity if it meets criteria
          const potentialGain = ((trendPrediction - currentPrice) / currentPrice) * 100;
          const confidence = calculateConfidence(volatility, marketCorrelation, historicalPrices);
          
          if (potentialGain >= min_gain_potential && confidence > 0.5) {
            return {
              symbol,
              current_price: currentPrice,
              target_price: trendPrediction,
              potential_gain: Number(potentialGain.toFixed(2)),
              confidence: Number(confidence.toFixed(2)),
              volatility: Number(volatility.toFixed(3)),
              market_correlation: Number(marketCorrelation.toFixed(2))
            };
          }
          return null;
        } catch (error) {
          console.error(`Error processing ${symbol}:`, error);
          return null;
        }
      })
    );

    const validOpportunities = opportunities
      .filter(opp => opp !== null)
      .sort((a, b) => b.potential_gain - a.potential_gain);

    res.status(200).json({
      success: true,
      opportunities: validOpportunities
    });
  } catch (error) {
    errorResponse(res, 500, 'Failed to scan blue-chip stocks', error);
  }
};

const getBlueChipStocks = async (req, res) => {
  try {
    const stocks = await dataService.getBlueChipStocks();
    res.status(200).json({
      success: true,
      data: stocks
    });
  } catch (error) {
    errorResponse(res, 500, 'Failed to get blue chip stocks', error);
  }
};

module.exports = {
  addFavorite,
  removeFavorite,
  getFavorites,
  recordPurchase,
  getStock,
  getHistoricalData,
  getStockNews,
  getInsiderTrades,
  trainModel,
  getPrediction,
  scanBlueChipStocks,
  getBlueChipStocks
};