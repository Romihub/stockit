#!/usr/bin/env python3
import sys
import os
from pathlib import Path
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
import json
import logging
import asyncio

# Add parent directory to path for imports
parent_dir = str(Path(__file__).parent.parent)
sys.path.append(parent_dir)

from services.lstm_model import LSTMStockPredictor
from services.data_pipeline import EnhancedDataPipeline
from services.monitoring import monitoring
from config import config

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

async def test_model_performance(symbol: str, data_path: str):
    """Test model performance and generate metrics"""
    try:
        logger.info(f"Testing model performance for {symbol}")
        
        # Load historical data
        df = pd.read_csv(data_path)
        df['Date'] = pd.to_datetime(df['Date'])
        df = df.sort_values('Date')
        
        # Prepare data
        data = [
            {
                "timestamp": int(row.Date.timestamp()),
                "open": row.Open,
                "high": row.High,
                "low": row.Low,
                "close": row.Close,
                "volume": row.Volume
            }
            for row in df.itertuples()
        ]
        
        # Initialize pipeline and model
        pipeline = EnhancedDataPipeline()
        model = LSTMStockPredictor(
            sequence_length=config.SEQUENCE_LENGTH,
            n_features=5,
            n_layers=config.LSTM_LAYERS,
            units=config.LSTM_UNITS,
            dropout=config.LSTM_DROPOUT
        )
        
        # Split data into training and testing sets
        train_size = int(len(data) * 0.8)
        train_data = data[:train_size]
        test_data = data[train_size:]
        
        # Process training data
        processed_train = await pipeline.process_stock_data(
            symbol,
            train_data,
            f"training:{symbol}"
        )
        
        # Train model
        logger.info(f"Training model for {symbol}...")
        start_time = datetime.now()
        training_history = model.train(
            processed_train,
            validation_split=config.VALIDATION_SPLIT,
            epochs=config.EPOCHS,
            batch_size=config.BATCH_SIZE
        )
        training_duration = (datetime.now() - start_time).total_seconds()
        
        # Record training metrics
        monitoring.record_training_metrics(symbol, training_duration, training_history)
        
        # Test predictions
        logger.info(f"Testing predictions for {symbol}...")
        prediction_results = []
        
        for i in range(0, len(test_data) - config.SEQUENCE_LENGTH - 7, 7):
            test_window = test_data[i:i + config.SEQUENCE_LENGTH]
            actual_values = [d["close"] for d in test_data[i + config.SEQUENCE_LENGTH:i + config.SEQUENCE_LENGTH + 7]]
            
            processed_test = await pipeline.process_stock_data(
                symbol,
                test_window,
                f"test:{symbol}"
            )
            
            with monitoring.time_prediction(symbol):
                predictions, confidence_scores = model.predict(processed_test, 7)
            
            prediction_results.append({
                "timestamp": test_window[-1]["timestamp"],
                "predictions": predictions.tolist(),
                "actual_values": actual_values,
                "confidence_scores": confidence_scores
            })
            
            # Update accuracy metrics
            monitoring.update_prediction_accuracy(
                symbol,
                np.array(predictions),
                np.array(actual_values),
                "7d"
            )
        
        # Save prediction results
        results_dir = Path(parent_dir) / "models"
        results_dir.mkdir(exist_ok=True)
        
        results_file = results_dir / f"{symbol}_prediction_results.json"
        with open(results_file, "w") as f:
            json.dump(prediction_results, f, indent=2)
        
        # Calculate and save overall metrics
        all_predictions = np.array([r["predictions"][0] for r in prediction_results])
        all_actuals = np.array([r["actual_values"][0] for r in prediction_results])
        all_confidence = np.array([r["confidence_scores"][0] for r in prediction_results])
        
        mape = np.mean(np.abs((all_actuals - all_predictions) / all_actuals)) * 100
        rmse = np.sqrt(np.mean((all_predictions - all_actuals) ** 2))
        
        metrics = {
            "symbol": symbol,
            "test_size": len(test_data),
            "mape": float(mape),
            "rmse": float(rmse),
            "avg_confidence": float(np.mean(all_confidence)),
            "training_duration": training_duration,
            "timestamp": datetime.now().isoformat()
        }
        
        metrics_file = results_dir / f"{symbol}_test_metrics.json"
        with open(metrics_file, "w") as f:
            json.dump(metrics, f, indent=2)
        
        logger.info(f"Test results for {symbol}:")
        logger.info(f"MAPE: {mape:.2f}%")
        logger.info(f"RMSE: {rmse:.2f}")
        logger.info(f"Average Confidence: {np.mean(all_confidence):.2f}")
        
        return metrics
        
    except Exception as e:
        logger.error(f"Error testing model for {symbol}: {str(e)}")
        raise

async def main():
    """Main test function"""
    # Test symbols and their data files
    data_dir = Path(parent_dir) / "data"
    test_cases = [
        ("AAPL", data_dir / "AAPL_historical.csv")
    ]
    
    results = []
    for symbol, data_path in test_cases:
        try:
            metrics = await test_model_performance(symbol, str(data_path))
            results.append(metrics)
        except Exception as e:
            logger.error(f"Failed to test {symbol}: {str(e)}")
    
    # Save summary results
    results_dir = Path(parent_dir) / "models"
    results_dir.mkdir(exist_ok=True)
    
    summary_file = results_dir / "test_summary.json"
    with open(summary_file, "w") as f:
        json.dump(results, f, indent=2)
    
    logger.info("Testing completed")

if __name__ == "__main__":
    asyncio.run(main())