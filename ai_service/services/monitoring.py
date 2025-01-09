import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent))

from prometheus_client import Counter, Gauge, Histogram, Summary
import logging
from typing import Dict, Any, Optional
import time
import numpy as np
from datetime import datetime
import json
from config import config

logger = logging.getLogger(__name__)

class ModelMonitoring:
    def __init__(self):
        # Prediction Metrics
        self.prediction_requests = Counter(
            'prediction_requests_total',
            'Total number of prediction requests',
            ['symbol']
        )
        
        self.prediction_errors = Counter(
            'prediction_errors_total',
            'Total number of prediction errors',
            ['symbol', 'error_type']
        )
        
        self.prediction_latency = Histogram(
            'prediction_latency_seconds',
            'Time spent processing prediction requests',
            ['symbol'],
            buckets=(0.1, 0.5, 1.0, 2.0, 5.0)
        )
        
        self.prediction_accuracy = Gauge(
            'prediction_accuracy_percent',
            'Model prediction accuracy',
            ['symbol', 'timeframe']
        )
        
        # Training Metrics
        self.training_duration = Histogram(
            'training_duration_seconds',
            'Time spent training models',
            ['symbol'],
            buckets=(10, 30, 60, 120, 300, 600)
        )
        
        self.training_loss = Gauge(
            'training_loss',
            'Model training loss',
            ['symbol', 'phase']  # phase: training or validation
        )
        
        self.model_size = Gauge(
            'model_size_bytes',
            'Size of saved model files',
            ['symbol']
        )
        
        # Resource Metrics
        self.memory_usage = Gauge(
            'memory_usage_bytes',
            'Current memory usage of the service'
        )
        
        self.gpu_memory_usage = Gauge(
            'gpu_memory_usage_bytes',
            'Current GPU memory usage',
            ['device']
        )
        
        # Cache Metrics
        self.cache_hits = Counter(
            'cache_hits_total',
            'Total number of cache hits',
            ['type']  # prediction or training data
        )
        
        self.cache_misses = Counter(
            'cache_misses_total',
            'Total number of cache misses',
            ['type']
        )
        
        # Performance Metrics
        self.prediction_performance = Summary(
            'prediction_performance',
            'Summary of prediction performance metrics',
            ['symbol', 'metric']
        )
        
        # Initialize metrics directory
        self.metrics_dir = Path('metrics')
        self.metrics_dir.mkdir(exist_ok=True)
    
    def record_prediction_request(self, symbol: str) -> None:
        """Record a prediction request"""
        self.prediction_requests.labels(symbol=symbol).inc()
    
    def record_prediction_error(self, symbol: str, error_type: str) -> None:
        """Record a prediction error"""
        self.prediction_errors.labels(symbol=symbol, error_type=error_type).inc()
        logger.error(f"Prediction error for {symbol}: {error_type}")
    
    def time_prediction(self, symbol: str) -> None:
        """Context manager to time prediction requests"""
        class Timer:
            def __init__(self, monitor, symbol):
                self.monitor = monitor
                self.symbol = symbol
                
            def __enter__(self):
                self.start = time.time()
                return self
                
            def __exit__(self, exc_type, exc_val, exc_tb):
                duration = time.time() - self.start
                self.monitor.prediction_latency.labels(symbol=self.symbol).observe(duration)
                
        return Timer(self, symbol)
    
    def update_prediction_accuracy(
        self,
        symbol: str,
        predictions: np.ndarray,
        actual_values: np.ndarray,
        timeframe: str
    ) -> None:
        """Update prediction accuracy metrics"""
        mape = np.mean(np.abs((actual_values - predictions) / actual_values)) * 100
        accuracy = 100 - mape
        self.prediction_accuracy.labels(symbol=symbol, timeframe=timeframe).set(accuracy)
        
        # Save detailed metrics
        metrics = {
            'timestamp': datetime.now().isoformat(),
            'symbol': symbol,
            'timeframe': timeframe,
            'mape': float(mape),
            'accuracy': float(accuracy),
            'rmse': float(np.sqrt(np.mean((predictions - actual_values) ** 2))),
            'mae': float(np.mean(np.abs(predictions - actual_values)))
        }
        
        self._save_metrics(symbol, 'prediction_accuracy', metrics)
    
    def record_training_metrics(
        self,
        symbol: str,
        duration: float,
        history: Dict[str, Any]
    ) -> None:
        """Record training metrics"""
        self.training_duration.labels(symbol=symbol).observe(duration)
        
        # Record final loss values
        self.training_loss.labels(symbol=symbol, phase='training').set(history['loss'][-1])
        if 'val_loss' in history:
            self.training_loss.labels(symbol=symbol, phase='validation').set(history['val_loss'][-1])
        
        # Save detailed metrics
        metrics = {
            'timestamp': datetime.now().isoformat(),
            'symbol': symbol,
            'duration': duration,
            'history': {k: [float(v) for v in vals] for k, vals in history.items()},
            'parameters': {
                'layers': config.LSTM_LAYERS,
                'units': config.LSTM_UNITS,
                'dropout': config.LSTM_DROPOUT,
                'learning_rate': config.LEARNING_RATE
            }
        }
        
        self._save_metrics(symbol, 'training_metrics', metrics)
    
    def update_model_size(self, symbol: str, model_path: Path) -> None:
        """Update model size metrics"""
        total_size = sum(f.stat().st_size for f in model_path.rglob('*') if f.is_file())
        self.model_size.labels(symbol=symbol).set(total_size)
    
    def record_cache_operation(self, cache_type: str, hit: bool) -> None:
        """Record cache hit/miss"""
        if hit:
            self.cache_hits.labels(type=cache_type).inc()
        else:
            self.cache_misses.labels(type=cache_type).inc()
    
    def update_resource_usage(self, memory_usage: int, gpu_memory: Dict[str, int]) -> None:
        """Update resource usage metrics"""
        self.memory_usage.set(memory_usage)
        for device, usage in gpu_memory.items():
            self.gpu_memory_usage.labels(device=device).set(usage)
    
    def record_performance_metrics(
        self,
        symbol: str,
        metrics: Dict[str, float]
    ) -> None:
        """Record various performance metrics"""
        for metric_name, value in metrics.items():
            self.prediction_performance.labels(
                symbol=symbol,
                metric=metric_name
            ).observe(value)
    
    def _save_metrics(self, symbol: str, metric_type: str, data: Dict) -> None:
        """Save detailed metrics to file"""
        timestamp = datetime.now().strftime('%Y%m%d')
        metrics_file = self.metrics_dir / f'{symbol}_{metric_type}_{timestamp}.json'
        
        # Load existing metrics if file exists
        if metrics_file.exists():
            with open(metrics_file, 'r') as f:
                existing_data = json.load(f)
                if isinstance(existing_data, list):
                    existing_data.append(data)
                else:
                    existing_data = [existing_data, data]
        else:
            existing_data = [data]
        
        # Save updated metrics
        with open(metrics_file, 'w') as f:
            json.dump(existing_data, f, indent=2)
    
    def get_model_performance_summary(self, symbol: str) -> Dict[str, Any]:
        """Get a summary of model performance metrics"""
        return {
            'accuracy': float(self.prediction_accuracy.labels(symbol=symbol, timeframe='1d').get()),
            'avg_latency': float(self.prediction_latency.labels(symbol=symbol).get_sample_sum() / 
                               max(1, self.prediction_latency.labels(symbol=symbol).get_sample_count())),
            'error_rate': float(self.prediction_errors.labels(symbol=symbol, error_type='total').get() /
                              max(1, self.prediction_requests.labels(symbol=symbol).get())),
            'cache_hit_rate': float(self.cache_hits.labels(type='prediction').get() /
                                  max(1, self.cache_hits.labels(type='prediction').get() + 
                                      self.cache_misses.labels(type='prediction').get()))
        }

# Create global monitoring instance
monitoring = ModelMonitoring()