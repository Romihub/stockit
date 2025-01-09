#!/usr/bin/env python3
import sys
import os
from pathlib import Path
import logging
import asyncio
import json
import requests
import redis
from datetime import datetime
import tensorflow as tf

# Add parent directory to path for imports
parent_dir = str(Path(__file__).parent.parent)
sys.path.append(parent_dir)

from config import config
from services.monitoring import monitoring

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

async def verify_directories():
    """Verify required directories exist"""
    required_dirs = ['data', 'models', 'logs']
    for dir_name in required_dirs:
        dir_path = Path(parent_dir) / dir_name
        if not dir_path.exists():
            logger.error(f"Missing required directory: {dir_name}")
            return False
        logger.info(f"Found directory: {dir_name}")
    return True

def verify_gpu():
    """Check GPU availability"""
    gpus = tf.config.list_physical_devices('GPU')
    if gpus:
        logger.info(f"Found {len(gpus)} GPU(s)")
        for gpu in gpus:
            logger.info(f"GPU device: {gpu}")
        return True
    else:
        logger.warning("No GPU devices found. Using CPU only.")
        return True

def verify_redis():
    """Check Redis connection"""
    try:
        redis_client = redis.Redis(
            host=config.REDIS_HOST,
            port=config.REDIS_PORT,
            db=config.REDIS_DB
        )
        redis_client.ping()
        logger.info("Redis connection successful")
        return True
    except Exception as e:
        logger.warning(f"Redis connection failed: {str(e)}")
        return False

def verify_sample_data():
    """Check sample data exists"""
    data_file = Path(parent_dir) / 'data' / 'AAPL_historical.csv'
    if not data_file.exists():
        logger.error("Sample data file missing")
        return False
    logger.info("Found sample data file")
    return True

def verify_model_files():
    """Check model files exist"""
    model_files = list(Path(parent_dir).glob('models/*_model.h5'))
    if not model_files:
        logger.warning("No trained models found")
        return False
    logger.info(f"Found {len(model_files)} trained model(s)")
    return True

def verify_monitoring():
    """Check monitoring system"""
    try:
        # Record test metric
        monitoring.record_prediction_request("TEST")
        logger.info("Monitoring system functional")
        return True
    except Exception as e:
        logger.error(f"Monitoring system error: {str(e)}")
        return False

def verify_api(port=8000):
    """Check API endpoints"""
    base_url = f"http://localhost:{port}"
    endpoints = [
        "/health",
        "/dashboard",
        "/api/symbols"
    ]
    
    all_passed = True
    for endpoint in endpoints:
        try:
            response = requests.get(f"{base_url}{endpoint}")
            if response.status_code == 200:
                logger.info(f"Endpoint {endpoint} is accessible")
            else:
                logger.error(f"Endpoint {endpoint} returned status {response.status_code}")
                all_passed = False
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to access {endpoint}: {str(e)}")
            all_passed = False
    
    return all_passed

async def main():
    """Run all verification checks"""
    checks = {
        "Directories": await verify_directories(),
        "GPU Support": verify_gpu(),
        "Redis": verify_redis(),
        "Sample Data": verify_sample_data(),
        "Model Files": verify_model_files(),
        "Monitoring": verify_monitoring()
    }
    
    # Only check API if other components are working
    if all(checks.values()):
        checks["API"] = verify_api()
    
    # Print summary
    print("\nVerification Summary:")
    print("-" * 50)
    for check, passed in checks.items():
        status = "✓" if passed else "✗"
        print(f"{check:20} {status}")
    print("-" * 50)
    
    # Save verification results
    results = {
        "timestamp": datetime.now().isoformat(),
        "checks": checks,
        "environment": {
            "python_version": sys.version,
            "tensorflow_version": tf.__version__,
            "gpu_available": len(tf.config.list_physical_devices('GPU')) > 0
        }
    }
    
    results_file = Path(parent_dir) / 'logs' / 'verification_results.json'
    with open(results_file, 'w') as f:
        json.dump(results, f, indent=2)
    
    # Exit with appropriate status code
    if all(checks.values()):
        logger.info("All checks passed successfully")
        sys.exit(0)
    else:
        logger.error("Some checks failed")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())