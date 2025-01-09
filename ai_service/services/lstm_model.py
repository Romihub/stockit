import numpy as np
import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout
from tensorflow.keras.optimizers import Adam
from sklearn.preprocessing import MinMaxScaler
from typing import List, Tuple, Optional
import joblib
import os

class LSTMStockPredictor:
    def __init__(
        self,
        sequence_length: int = 60,
        n_features: int = 5,  # OHLCV
        n_layers: int = 2,
        units: int = 50,
        dropout: float = 0.2,
        learning_rate: float = 0.001
    ):
        self.sequence_length = sequence_length
        self.n_features = n_features
        self.n_layers = n_layers
        self.units = units
        self.dropout = dropout
        self.learning_rate = learning_rate
        self.model = self._build_model()
        self.scaler = MinMaxScaler()
        self.is_trained = False
        
    def _build_model(self) -> Sequential:
        """Build LSTM model architecture"""
        model = Sequential()
        
        # First LSTM layer
        model.add(LSTM(
            units=self.units,
            return_sequences=True if self.n_layers > 1 else False,
            input_shape=(self.sequence_length, self.n_features)
        ))
        model.add(Dropout(self.dropout))
        
        # Additional LSTM layers
        for i in range(self.n_layers - 1):
            model.add(LSTM(
                units=self.units,
                return_sequences=True if i < self.n_layers - 2 else False
            ))
            model.add(Dropout(self.dropout))
        
        # Output layer
        model.add(Dense(1))
        
        # Compile model
        model.compile(
            optimizer=Adam(learning_rate=self.learning_rate),
            loss='mse',
            metrics=['mae']
        )
        
        return model
    
    def _prepare_sequences(
        self,
        data: np.ndarray
    ) -> Tuple[np.ndarray, np.ndarray]:
        """Create sequences for LSTM input"""
        X, y = [], []
        
        for i in range(len(data) - self.sequence_length):
            X.append(data[i:(i + self.sequence_length)])
            y.append(data[i + self.sequence_length, 3])  # Predict close price
            
        return np.array(X), np.array(y)
    
    def _prepare_data(
        self,
        prices: List[dict]
    ) -> Tuple[np.ndarray, np.ndarray]:
        """Prepare and scale data for training"""
        # Extract OHLCV data
        data = np.array([[
            p['open'],
            p['high'],
            p['low'],
            p['close'],
            p['volume']
        ] for p in prices])
        
        # Scale data
        scaled_data = self.scaler.fit_transform(data)
        
        # Create sequences
        X, y = self._prepare_sequences(scaled_data)
        
        return X, y
    
    def train(
        self,
        prices: List[dict],
        validation_split: float = 0.2,
        epochs: int = 50,
        batch_size: int = 32,
        verbose: int = 1
    ) -> dict:
        """Train the LSTM model"""
        X, y = self._prepare_data(prices)
        
        # Train model
        history = self.model.fit(
            X, y,
            validation_split=validation_split,
            epochs=epochs,
            batch_size=batch_size,
            verbose=verbose
        )
        
        self.is_trained = True
        
        return {
            'loss': history.history['loss'],
            'val_loss': history.history['val_loss'],
            'mae': history.history['mae'],
            'val_mae': history.history['val_mae']
        }
    
    def predict(
        self,
        prices: List[dict],
        prediction_days: int
    ) -> Tuple[List[float], List[float]]:
        """Make price predictions and calculate confidence scores"""
        if not self.is_trained:
            raise ValueError("Model must be trained before making predictions")
            
        # Prepare data
        data = np.array([[
            p['open'],
            p['high'],
            p['low'],
            p['close'],
            p['volume']
        ] for p in prices])
        
        scaled_data = self.scaler.transform(data)
        
        # Make predictions
        predictions = []
        confidence_scores = []
        last_sequence = scaled_data[-self.sequence_length:]
        
        for _ in range(prediction_days):
            # Reshape sequence for prediction
            sequence = last_sequence.reshape(1, self.sequence_length, self.n_features)
            
            # Get prediction
            next_pred = self.model.predict(sequence, verbose=0)[0][0]
            
            # Calculate confidence score based on prediction variance
            pred_variance = np.var(last_sequence[:, 3])  # Variance of close prices
            confidence = 1 / (1 + pred_variance)  # Higher variance = lower confidence
            
            # Store prediction and confidence
            predictions.append(next_pred)
            confidence_scores.append(float(confidence))
            
            # Update sequence for next prediction
            new_row = np.copy(last_sequence[-1])
            new_row[3] = next_pred  # Update close price
            last_sequence = np.vstack([last_sequence[1:], new_row])
        
        # Inverse transform predictions to get actual prices
        dummy_data = np.zeros((len(predictions), self.n_features))
        dummy_data[:, 3] = predictions  # Set close prices
        actual_predictions = self.scaler.inverse_transform(dummy_data)[:, 3]
        
        return list(actual_predictions), confidence_scores
    
    def save(self, model_dir: str = 'models'):
        """Save the model and scaler"""
        if not os.path.exists(model_dir):
            os.makedirs(model_dir)
            
        # Save Keras model
        self.model.save(os.path.join(model_dir, 'lstm_model.h5'))
        
        # Save scaler
        joblib.dump(self.scaler, os.path.join(model_dir, 'scaler.pkl'))
        
        # Save configuration
        config = {
            'sequence_length': self.sequence_length,
            'n_features': self.n_features,
            'n_layers': self.n_layers,
            'units': self.units,
            'dropout': self.dropout,
            'learning_rate': self.learning_rate,
            'is_trained': self.is_trained
        }
        joblib.dump(config, os.path.join(model_dir, 'config.pkl'))
    
    @classmethod
    def load(cls, model_dir: str = 'models') -> 'LSTMStockPredictor':
        """Load a saved model"""
        # Load configuration
        config = joblib.load(os.path.join(model_dir, 'config.pkl'))
        
        # Create instance with saved configuration
        instance = cls(
            sequence_length=config['sequence_length'],
            n_features=config['n_features'],
            n_layers=config['n_layers'],
            units=config['units'],
            dropout=config['dropout'],
            learning_rate=config['learning_rate']
        )
        
        # Load Keras model
        instance.model = tf.keras.models.load_model(
            os.path.join(model_dir, 'lstm_model.h5')
        )
        
        # Load scaler
        instance.scaler = joblib.load(os.path.join(model_dir, 'scaler.pkl'))
        
        instance.is_trained = config['is_trained']
        
        return instance