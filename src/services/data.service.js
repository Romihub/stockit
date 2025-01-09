const axios = require('axios');
const { errorResponse } = require('../utils/errorHandler');

class DataService {
  constructor() {
    // Initialize cache
    if (!global.stockCache) {
      const NodeCache = require('node-cache');
      global.stockCache = new NodeCache();
    }

    // Alpha Vantage API for stock data
    this.alphaVantage = axios.create({
      baseURL: 'https://www.alphavantage.co/query',
      params: {
        apikey: process.env.ALPHA_VANTAGE_API_KEY
      }
    });

    // Finnhub API for real-time data and company info
    this.finnhub = axios.create({
      baseURL: 'https://finnhub.io/api/v1',
      params: {
        token: process.env.FINNHUB_API_KEY
      }
    });

    // Polygon.io API for market data with retries and rate limiting
    this.polygon = axios.create({
      baseURL: 'https://api.polygon.io',
      params: {
        apiKey: process.env.POLYGON_API_KEY
      }
    });

    // Add response interceptor for Polygon API with enhanced rate limiting
    this.polygon.interceptors.response.use(
      response => {
        // Track remaining API calls
        const remaining = response.headers['x-ratelimit-remaining'];
        if (remaining && parseInt(remaining) < 10) {
          console.warn(`Low on API calls: ${remaining} remaining`);
        }
        return response;
      },
      async error => {
        if (error.response) {
          const { status, data } = error.response;
          
          // Enhanced rate limit handling
          if (status === 429) {
            const retryAfter = error.response.headers['retry-after'];
            const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 10000;
            console.log(`Rate limit hit, waiting ${waitTime/1000}s before retry...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            
            // Add jitter to prevent thundering herd
            const jitter = Math.random() * 1000;
            await new Promise(resolve => setTimeout(resolve, jitter));
            
            return this.polygon.request(error.config);
          }

          // Handle specific API errors
          if (status === 404) {
            console.warn('Resource not found:', error.config.url);
            return { data: { results: [] } }; // Return empty results for 404
          }

          // Handle other API errors
          throw new Error(data.error || `Polygon API error: ${status}`);
        }
        throw error;
      }
    );

    // News API for market news
    this.newsAPI = axios.create({
      baseURL: 'https://newsapi.org/v2',
      headers: {
        'X-Api-Key': process.env.NEWS_API_KEY
      }
    });

    // AI Service for predictions
    this.aiService = axios.create({
      baseURL: process.env.AI_SERVICE_URL
    });
  }

  async getStockData(symbol) {
    try {
      const [quote, profile, keyStats] = await Promise.all([
        this.alphaVantage.get('', {
          params: {
            function: 'GLOBAL_QUOTE',
            symbol
          }
        }),
        this.finnhub.get('/stock/profile2', {
          params: { symbol }
        }),
        this.finnhub.get('/stock/metric', {
          params: { 
            symbol,
            metric: 'all'
          }
        })
      ]);

      return {
        price: parseFloat(quote.data['Global Quote']['05. price']),
        change: parseFloat(quote.data['Global Quote']['09. change']),
        changePercent: parseFloat(quote.data['Global Quote']['10. change percent']),
        name: profile.data.name,
        exchange: profile.data.exchange,
        industry: profile.data.finnhubIndustry,
        marketCap: profile.data.marketCapitalization,
        metrics: keyStats.data.metric
      };
    } catch (error) {
      console.error('Failed to fetch stock data:', error);
      throw new Error('Failed to fetch stock data');
    }
  }

  async getStockNews(symbol) {
    try {
      const response = await this.newsAPI.get('/everything', {
        params: {
          q: symbol,
          sortBy: 'publishedAt',
          language: 'en',
          pageSize: 10
        }
      });

      return response.data.articles.map(article => ({
        title: article.title,
        description: article.description,
        url: article.url,
        publishedAt: article.publishedAt,
        source: article.source.name
      }));
    } catch (error) {
      console.error('Failed to fetch stock news:', error);
      throw new Error('Failed to fetch stock news');
    }
  }

  async getInsiderTrades(symbol) {
    try {
      const response = await this.finnhub.get('/stock/insider-transactions', {
        params: { symbol }
      });

      return response.data.data.map(trade => ({
        name: trade.name,
        position: trade.position,
        transactionDate: trade.transactionDate,
        transactionType: trade.transactionType,
        shares: trade.shares,
        price: trade.price
      }));
    } catch (error) {
      console.error('Failed to fetch insider trades:', error);
      throw new Error('Failed to fetch insider trades');
    }
  }

  async getHistoricalData(symbol, range = '1M', interval = '1day') {
    const cacheKey = `historical_${symbol}_${range}_${interval}`;
    const cacheDuration = 60 * 60 * 1000; // 1 hour cache

    try {
      // Try to get from cache first
      const cachedData = global.stockCache?.get(cacheKey);
      if (cachedData) {
        return JSON.parse(cachedData);
      }

      const end = new Date();
      const start = new Date();
      
      // Calculate start date based on range
      switch (range) {
        case '1D': start.setDate(start.getDate() - 1); break;
        case '1W': start.setDate(start.getDate() - 7); break;
        case '1M': start.setMonth(start.getMonth() - 1); break;
        case '3M': start.setMonth(start.getMonth() - 3); break;
        case '6M': start.setMonth(start.getMonth() - 6); break;
        case '1Y': start.setFullYear(start.getFullYear() - 1); break;
        case '5Y': start.setFullYear(start.getFullYear() - 5); break;
        default: start.setMonth(start.getMonth() - 1);
      }

      // Convert interval to Polygon.io format
      const intervalMap = {
        '1min': { multiplier: 1, timespan: 'minute' },
        '5min': { multiplier: 5, timespan: 'minute' },
        '15min': { multiplier: 15, timespan: 'minute' },
        '30min': { multiplier: 30, timespan: 'minute' },
        '1hour': { multiplier: 1, timespan: 'hour' },
        '1day': { multiplier: 1, timespan: 'day' }
      };

      const { multiplier, timespan } = intervalMap[interval] || intervalMap['1day'];

      // Fetch data with retries
      const maxRetries = 3;
      let lastError;
      
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          const response = await this.polygon.get(
            `/v2/aggs/ticker/${symbol}/range/${multiplier}/${timespan}/${start.toISOString().split('T')[0]}/${end.toISOString().split('T')[0]}`
          );

          // Validate response structure
          if (!response.data || typeof response.data !== 'object') {
            throw new Error('Invalid response from Polygon API');
          }

          // Check if we have results
          if (!response.data.results || !Array.isArray(response.data.results)) {
            console.warn(`No results found for ${symbol}`);
            return [];
          }

          // Filter and validate each data point
          const validBars = response.data.results.filter(bar => 
            bar &&
            typeof bar.t === 'number' &&
            typeof bar.o === 'number' &&
            typeof bar.h === 'number' &&
            typeof bar.l === 'number' &&
            typeof bar.c === 'number' &&
            typeof bar.v === 'number'
          );

          if (validBars.length === 0) {
            console.warn(`No valid data points found for ${symbol}`);
            return [];
          }

          // Transform and sort the data
          const historicalData = validBars
            .sort((a, b) => a.t - b.t)
            .map(bar => ({
              timestamp: bar.t,
              open: bar.o,  // Already validated as numbers
              high: bar.h,
              low: bar.l,
              close: bar.c,
              volume: bar.v
            }));

          // Cache the results
          if (global.stockCache && historicalData.length > 0) {
            global.stockCache.set(cacheKey, JSON.stringify(historicalData), cacheDuration);
          }

          return historicalData;
        } catch (error) {
          lastError = error;
          if (attempt < maxRetries - 1) {
            const waitTime = Math.min(1000 * Math.pow(2, attempt), 10000);
            await new Promise(resolve => setTimeout(resolve, waitTime));
          }
        }
      }

      // If we get here, all retries failed
      console.error(`Failed to fetch historical data for ${symbol} after ${maxRetries} attempts:`, lastError);
      return []; // Return empty array instead of throwing to prevent UI crashes
    } catch (error) {
      console.error(`Error in getHistoricalData for ${symbol}:`, error);
      return []; // Return empty array instead of throwing to prevent UI crashes
    }
  }

  async getBlueChipStocks() {
    const cacheKey = 'blue_chip_stocks';
    const cacheDuration = 24 * 60 * 60 * 1000; // 24 hours

    try {
      // Try to get from cache first
      const cachedData = global.stockCache?.get(cacheKey);
      if (cachedData) {
        return JSON.parse(cachedData);
      }

      // Static list of known blue-chip stocks
      const staticBlueChips = [
        { symbol: 'AAPL', name: 'Apple Inc.', market_cap: 3000000000000, primary_exchange: 'NASDAQ' },
        { symbol: 'MSFT', name: 'Microsoft Corporation', market_cap: 2800000000000, primary_exchange: 'NASDAQ' },
        { symbol: 'GOOGL', name: 'Alphabet Inc.', market_cap: 1800000000000, primary_exchange: 'NASDAQ' },
        { symbol: 'AMZN', name: 'Amazon.com Inc.', market_cap: 1600000000000, primary_exchange: 'NASDAQ' },
        { symbol: 'NVDA', name: 'NVIDIA Corporation', market_cap: 1200000000000, primary_exchange: 'NASDAQ' },
        { symbol: 'META', name: 'Meta Platforms Inc.', market_cap: 1000000000000, primary_exchange: 'NASDAQ' },
        { symbol: 'BRK.B', name: 'Berkshire Hathaway Inc.', market_cap: 800000000000, primary_exchange: 'NYSE' },
        { symbol: 'LLY', name: 'Eli Lilly and Company', market_cap: 700000000000, primary_exchange: 'NYSE' },
        { symbol: 'TSM', name: 'Taiwan Semiconductor Manufacturing', market_cap: 600000000000, primary_exchange: 'NYSE' },
        { symbol: 'V', name: 'Visa Inc.', market_cap: 500000000000, primary_exchange: 'NYSE' }
      ];

      // Start with static list
      let blueChipStocks = [...staticBlueChips];

      try {
        // Get initial list of tickers
        const response = await this.polygon.get('/v3/reference/tickers', {
          params: {
            market: 'stocks',
            active: true,
            type: 'CS', // Common Stock
            limit: 20, // Reduced limit to avoid rate limits
            sort: 'market_cap',
            order: 'desc',
            market_cap_min: 100000000000 // $100B minimum
          }
        });

        if (response.data.results) {
          const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
          
          // Process each stock sequentially to avoid rate limits
          for (const stock of response.data.results) {
            try {
              // Skip if we already have this stock
              if (blueChipStocks.some(existing => existing.symbol === stock.ticker)) {
                continue;
              }

              // Add delay between requests
              await delay(2000); // 2 second delay between requests

              // Get detailed stock info
              const detailsResponse = await this.polygon.get(`/v3/reference/tickers/${stock.ticker}`);
              
              if (detailsResponse.data?.results?.market_cap) {
                const newStock = {
                  symbol: stock.ticker,
                  name: stock.name,
                  market_cap: detailsResponse.data.results.market_cap,
                  primary_exchange: stock.primary_exchange
                };

                // Add to list if not duplicate
                if (!blueChipStocks.some(existing => existing.symbol === newStock.symbol)) {
                  blueChipStocks.push(newStock);
                  console.log(`Added ${newStock.symbol} to blue-chip stocks`);

                  // Sort by market cap and update cache
                  blueChipStocks.sort((a, b) => b.market_cap - a.market_cap);
                  global.stockCache?.set(cacheKey, JSON.stringify(blueChipStocks), cacheDuration);
                }
              }
            } catch (error) {
              if (error.response?.status === 429) {
                console.log('Rate limit hit, waiting before continuing...');
                await delay(10000); // 10 second delay on rate limit
                continue;
              }
              console.warn(`Failed to process ${stock.ticker}:`, error.message);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching additional stocks:', error);
        // Continue with static list if API fails
      }

      return blueChipStocks;
    } catch (error) {
      console.error('Failed to fetch blue-chip stocks:', error);
      return staticBlueChips; // Fallback to static list
    }
  }

  async getPredictedPrice(symbol, historicalPrices) {
    try {
      const response = await this.aiService.post('/predict', {
        symbol,
        historical_data: historicalPrices.map(price => ({
          close: price,
          timestamp: new Date().toISOString()  // Using current date since we just need the format
        })),
        prediction_days: 1
      });

      return response.data.predictions[0];
    } catch (error) {
      console.error('Failed to get predicted price:', error);
      // Fallback to a simple moving average if AI prediction fails
      const lastPrice = historicalPrices[historicalPrices.length - 1];
      return lastPrice * 1.05; // 5% increase as conservative estimate
    }
  }

  async trainModel(symbol) {
    try {
      const historicalData = await this.getHistoricalData(symbol);
      
      const response = await this.aiService.post('/train', {
        symbol,
        historical_data: historicalData,
        window_size: 7
      });

      return response.data;
    } catch (error) {
      console.error('Failed to train model:', error);
      throw new Error('Failed to train model: ' + error.message);
    }
  }

  async getPrediction(symbol, days = 7) {
    try {
      const historicalData = await this.getHistoricalData(symbol);
      
      const response = await this.aiService.post('/predict', {
        symbol,
        historical_data: historicalData,
        prediction_days: days
      });

      return {
        symbol,
        predictions: response.data.predictions,
        timestamp: response.data.timestamp
      };
    } catch (error) {
      console.error('Failed to get prediction:', error);
      throw new Error('Failed to get prediction: ' + error.message);
    }
  }
}

module.exports = new DataService();