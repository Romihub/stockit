from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel
from typing import List, Dict, Optional
import numpy as np
from datetime import datetime, timedelta
import logging
import json
import os
import sys
import time
from pathlib import Path

# Add the parent directory to Python path
sys.path.append(str(Path(__file__).parent.parent))

# Now use absolute imports
from services.lstm_model import LSTMStockPredictor
from services.data_pipeline import EnhancedDataPipeline
from services.monitoring import monitoring
from config import config

# Setup templates
templates = Jinja2Templates(directory=str(Path(__file__).parent.parent / "templates"))

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="StockIt AI Service")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
data_pipeline = EnhancedDataPipeline()
model_cache: Dict[str, LSTMStockPredictor] = {}

class HistoricalData(BaseModel):
    prices: List[float]
    volume: List[float]
    market_prices: List[float]

class ScanRequest(BaseModel):
    symbols: List[str]
    historical_data: Dict[str, HistoricalData]
    min_gain_potential: float = 5.0

class PredictionRequest(BaseModel):
    symbol: str
    historical_data: List[Dict[str, float]]
    prediction_days: int = 7

class TrainingRequest(BaseModel):
    symbol: str
    historical_data: List[Dict[str, float]]
    window_size: int = 60

def get_or_create_model(symbol: str) -> LSTMStockPredictor:
    """Get existing model or create new one for symbol"""
    if symbol not in model_cache:
        model_cache[symbol] = LSTMStockPredictor()
    return model_cache[symbol]

@app.post("/train")
async def train_model(request: TrainingRequest):
    """Train LSTM model for a specific stock"""
    try:
        logger.info(f"Training model for {request.symbol}")
        start_time = time.time()
        
        # Process data through pipeline
        processed_data = await data_pipeline.process_stock_data(
            request.symbol,
            request.historical_data,
            f"training:{request.symbol}"
        )
        
        # Get or create model
        model = get_or_create_model(request.symbol)
        
        # Train model with monitoring
        training_history = model.train(
            processed_data,
            validation_split=config.VALIDATION_SPLIT,
            epochs=config.EPOCHS,
            batch_size=config.BATCH_SIZE
        )
        
        # Record training metrics
        duration = time.time() - start_time
        monitoring.record_training_metrics(request.symbol, duration, training_history)
        
        # Save model and update size metrics
        model_path = config.MODELS_DIR / request.symbol
        model.save(str(model_path))
        monitoring.update_model_size(request.symbol, model_path)
        
        return {
            "status": "success",
            "symbol": request.symbol,
            "training_history": training_history,
            "duration": duration
        }
        
    except Exception as e:
        logger.error(f"Training failed for {request.symbol}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/predict")
async def predict(request: PredictionRequest):
    """Make predictions for a specific stock"""
    try:
        logger.info(f"Making predictions for {request.symbol}")
        monitoring.record_prediction_request(request.symbol)
        
        with monitoring.time_prediction(request.symbol):
            # Process data through pipeline
            processed_data = await data_pipeline.process_stock_data(
                request.symbol,
                request.historical_data,
                f"prediction:{request.symbol}"
            )
            
            # Get model
            model = get_or_create_model(request.symbol)
            
            # Make predictions
            predictions, confidence_scores = model.predict(
                processed_data,
                request.prediction_days
            )
            
            # Record performance metrics
            monitoring.record_performance_metrics(request.symbol, {
                "confidence_mean": np.mean(confidence_scores),
                "confidence_std": np.std(confidence_scores),
                "prediction_range": max(predictions) - min(predictions)
            })
            
            return {
                "symbol": request.symbol,
                "predictions": predictions,
                "confidence_scores": confidence_scores,
                "timestamp": datetime.now().isoformat()
            }
            
    except Exception as e:
        error_type = type(e).__name__
        monitoring.record_prediction_error(request.symbol, error_type)
        logger.error(f"Prediction failed for {request.symbol}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/scan/blue-chip")
async def scan_blue_chip_stocks(request: ScanRequest):
    """Scan blue-chip stocks for investment opportunities"""
    try:
        logger.info(f"Scanning {len(request.symbols)} blue-chip stocks")
        opportunities = []
        
        for symbol in request.symbols:
            try:
                # Get historical data
                hist_data = request.historical_data.get(symbol)
                if not hist_data:
                    continue
                    
                # Convert to required format
                formatted_data = [
                    {
                        "timestamp": i,
                        "close": price,
                        "volume": volume,
                        "market_price": market_price
                    }
                    for i, (price, volume, market_price) in enumerate(zip(
                        hist_data.prices,
                        hist_data.volume,
                        hist_data.market_prices
                    ))
                ]
                
                # Process data
                processed_data = await data_pipeline.process_stock_data(
                    symbol,
                    formatted_data,
                    f"scan:{symbol}"
                )
                
                # Get predictions
                model = get_or_create_model(symbol)
                predictions, confidence_scores = model.predict(processed_data, 7)
                
                # Calculate metrics
                current_price = hist_data.prices[-1]
                target_price = predictions[0]
                potential_gain = ((target_price - current_price) / current_price) * 100
                
                # Calculate volatility
                returns = np.diff(hist_data.prices) / hist_data.prices[:-1]
                volatility = np.std(returns) * np.sqrt(252)  # Annualized
                
                # Calculate market correlation
                stock_returns = np.diff(hist_data.prices) / hist_data.prices[:-1]
                market_returns = np.diff(hist_data.market_prices) / hist_data.market_prices[:-1]
                correlation = np.corrcoef(stock_returns, market_returns)[0, 1]
                
                # Check if meets minimum gain potential
                if potential_gain >= request.min_gain_potential:
                    opportunities.append({
                        "symbol": symbol,
                        "current_price": current_price,
                        "target_price": target_price,
                        "potential_gain": potential_gain,
                        "confidence": confidence_scores[0],
                        "volatility": volatility,
                        "market_correlation": correlation
                    })
                    
            except Exception as e:
                logger.error(f"Failed to process {symbol}: {str(e)}")
                continue
                
        # Sort opportunities by potential gain
        opportunities.sort(key=lambda x: x["potential_gain"], reverse=True)
        
        return {
            "opportunities": opportunities,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Scan failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/dashboard", response_class=HTMLResponse)
async def get_dashboard(request: Request):
    """Serve the monitoring dashboard"""
    return templates.TemplateResponse("dashboard.html", {"request": request})

@app.get("/api/metrics/{symbol}")
async def get_metrics(symbol: str, timeframe: str = "1d"):
    """Get metrics for a specific symbol"""
    try:
        # Get basic performance metrics
        performance = monitoring.get_model_performance_summary(symbol)
        
        # Get historical metrics
        metrics_file = config.MODELS_DIR / f"{symbol}_prediction_accuracy_{timeframe}.json"
        accuracy_history = []
        if metrics_file.exists():
            with open(metrics_file) as f:
                accuracy_history = json.load(f)
        
        # Get training history
        training_file = config.MODELS_DIR / f"{symbol}_training_metrics.json"
        loss_history = {"training": [], "validation": []}
        if training_file.exists():
            with open(training_file) as f:
                training_data = json.load(f)
                if isinstance(training_data, list) and training_data:
                    latest = training_data[-1]
                    loss_history = {
                        "training": latest["history"]["loss"],
                        "validation": latest["history"].get("val_loss", [])
                    }
        
        # Get resource usage
        resource_usage = {
            "memory": monitoring.memory_usage.get(),
            "gpu_memory": {
                device: usage.get()
                for device, usage in monitoring.gpu_memory_usage._metrics.items()
            }
        }
        
        # Get prediction distribution
        distribution_file = config.MODELS_DIR / f"{symbol}_prediction_distribution.json"
        prediction_distribution = []
        if distribution_file.exists():
            with open(distribution_file) as f:
                prediction_distribution = json.load(f)
        
        return {
            "accuracy": performance["accuracy"],
            "avg_latency": performance["avg_latency"],
            "error_rate": performance["error_rate"],
            "cache_hit_rate": performance["cache_hit_rate"],
            "accuracy_history": accuracy_history,
            "loss_history": loss_history,
            "resource_usage": resource_usage,
            "prediction_distribution": prediction_distribution
        }
    except Exception as e:
        logger.error(f"Failed to get metrics for {symbol}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/symbols")
async def get_symbols():
    """Get list of available symbols"""
    try:
        # Get symbols from model cache
        symbols = list(model_cache.keys())
        
        # Add symbols from saved models
        for model_file in config.MODELS_DIR.glob("*_model.h5"):
            symbol = model_file.name.split("_")[0]
            if symbol not in symbols:
                symbols.append(symbol)
        
        return sorted(symbols)
    except Exception as e:
        logger.error(f"Failed to get symbols: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "models_loaded": len(model_cache),
        "memory_usage": monitoring.memory_usage.get()
    }