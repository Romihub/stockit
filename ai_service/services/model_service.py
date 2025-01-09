import joblib
import numpy as np
from sklearn.linear_model import LinearRegression
from typing import List

class StockPredictionModel:
    def __init__(self):
        self.model = LinearRegression()
        self.model_file = "stock_model.pkl"
        
    def train(self, historical_data: List[float], window_size: int = 7):
        """Train the model on historical stock data"""
        self.window_size = window_size  # Store window size
        X, y = self._create_dataset(historical_data, window_size)
        self.model.fit(X, y)
        self._save_model()
        
    def predict(self, historical_data: List[float], prediction_days: int) -> List[float]:
        """Make predictions for the next N days"""
        if not historical_data:
            raise ValueError("Historical data cannot be empty")
            
        # Load model if not already loaded
        if not hasattr(self.model, "coef_"):
            self._load_model()
            
        # Store window size as instance variable during training
        if not hasattr(self, 'window_size'):
            self.window_size = 7  # Default window size if model not trained yet
            
        predictions = []
        current_window = np.array(historical_data[-self.window_size:]).reshape(1, -1)
        
        for _ in range(prediction_days):
            next_pred = self.model.predict(current_window)[0]
            predictions.append(next_pred)
            # Update window with new prediction
            current_window = np.roll(current_window, -1)
            current_window[0, -1] = next_pred
            
        return predictions
        
    def _create_dataset(self, data: List[float], window_size: int):
        """Create training dataset from time series data"""
        X, y = [], []
        for i in range(len(data) - window_size):
            X.append(data[i:i + window_size])
            y.append(data[i + window_size])
        return np.array(X), np.array(y)
        
    def _save_model(self):
        """Save trained model to file"""
        joblib.dump(self.model, self.model_file)
        
    def _load_model(self):
        """Load trained model from file"""
        self.model = joblib.load(self.model_file)