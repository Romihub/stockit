import os
from typing import List, Tuple
from .lstm_model import LSTMStockPredictor

class StockPredictionModel:
    def __init__(self):
        self.model_dir = "models"
        self.model = LSTMStockPredictor()
        self._load_model()

    def train(self, prices: List[dict]):
        """Train the LSTM model with historical stock data"""
        self.model.train(prices)
        self.model.save(self.model_dir)

    def predict(self, prices: List[dict], prediction_days: int) -> Tuple[List[float], List[float]]:
        """Make predictions for the next N days"""
        if not self.model.is_trained:
            self._load_model()
        predictions, confidence_scores = self.model.predict(prices, prediction_days)
        return predictions, confidence_scores

    def _load_model(self):
        """Load the model if it has been previously saved"""
        if os.path.exists(self.model_dir):
            self.model = LSTMStockPredictor.load(self.model_dir)
