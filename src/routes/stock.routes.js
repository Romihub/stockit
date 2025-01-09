const express = require('express');
const router = express.Router();
const stockController = require('../controllers/stock.controller');
const auth = require('../middleware/auth');

// Favorite stocks routes
router.post('/favorites', auth, stockController.addFavorite);
router.delete('/favorites/:stockId', auth, stockController.removeFavorite);
router.get('/favorites', auth, stockController.getFavorites);

// Stock scanning routes
router.get('/blue-chip', auth, stockController.getBlueChipStocks);
router.post('/scan/blue-chip', auth, stockController.scanBlueChipStocks);

// Stock data routes
router.get('/:symbol', auth, stockController.getStock);
router.get('/:symbol/historical', auth, stockController.getHistoricalData);
router.get('/:symbol/news', auth, stockController.getStockNews);
router.get('/:symbol/insider-trades', auth, stockController.getInsiderTrades);

// Stock purchase routes
router.post('/purchases', auth, stockController.recordPurchase);

// Prediction routes
router.post('/:symbol/train', auth, stockController.trainModel);
router.get('/:symbol/predict', auth, stockController.getPrediction);

module.exports = router;