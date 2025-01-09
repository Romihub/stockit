import uvicorn
import os
import logging
from logging.handlers import RotatingFileHandler
import json
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Create logs directory if it doesn't exist
Path("logs").mkdir(exist_ok=True)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        RotatingFileHandler(
            'logs/ai_service.log',
            maxBytes=10485760,  # 10MB
            backupCount=5
        ),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger("ai_service")

def create_model_directory():
    """Create model directory if it doesn't exist"""
    model_dir = Path("models")
    model_dir.mkdir(exist_ok=True)
    logger.info(f"Model directory created/verified at {model_dir.absolute()}")

def check_requirements():
    """Check if all required packages are installed"""
    try:
        import tensorflow as tf
        import numpy as np
        import pandas as pd
        import sklearn
        logger.info(f"TensorFlow version: {tf.__version__}")
        logger.info(f"NumPy version: {np.__version__}")
        logger.info(f"Pandas version: {pd.__version__}")
        logger.info(f"Scikit-learn version: {sklearn.__version__}")
        
        # Check for GPU availability
        gpus = tf.config.list_physical_devices('GPU')
        if gpus:
            logger.info(f"GPU devices available: {len(gpus)}")
            for gpu in gpus:
                logger.info(f"GPU device: {gpu}")
        else:
            logger.warning("No GPU devices available, using CPU only")
            
    except ImportError as e:
        logger.error(f"Missing required package: {str(e)}")
        raise

def check_redis_connection():
    """Check Redis connection"""
    try:
        import redis
        redis_client = redis.Redis(
            host=os.getenv('REDIS_HOST', 'localhost'),
            port=int(os.getenv('REDIS_PORT', 6379)),
            db=0
        )
        redis_client.ping()
        logger.info("Redis connection successful")
    except Exception as e:
        logger.warning(f"Redis connection failed: {str(e)}")
        logger.warning("Continuing without Redis caching")

def setup_tensorflow():
    """Configure TensorFlow settings"""
    import tensorflow as tf
    
    # Memory growth configuration
    gpus = tf.config.list_physical_devices('GPU')
    if gpus:
        try:
            for gpu in gpus:
                tf.config.experimental.set_memory_growth(gpu, True)
            logger.info("GPU memory growth enabled")
        except RuntimeError as e:
            logger.error(f"Failed to set GPU memory growth: {str(e)}")
    
    # Set thread count
    tf.config.threading.set_inter_op_parallelism_threads(
        int(os.getenv('TF_INTER_OP_THREADS', 2))
    )
    tf.config.threading.set_intra_op_parallelism_threads(
        int(os.getenv('TF_INTRA_OP_THREADS', 4))
    )
    
    logger.info("TensorFlow configuration completed")

def main():
    """Main entry point"""
    try:
        logger.info("Starting AI service initialization")
        
        # Perform startup checks
        check_requirements()
        create_model_directory()
        check_redis_connection()
        setup_tensorflow()
        
        # Load configuration
        host = os.getenv('AI_SERVICE_HOST', '0.0.0.0')
        port = int(os.getenv('AI_SERVICE_PORT', 8000))
        workers = int(os.getenv('AI_SERVICE_WORKERS', 1))
        
        logger.info(f"Starting server on {host}:{port} with {workers} workers")
        
        # Start server
        uvicorn.run(
            "api.main:app",
            host=host,
            port=port,
            workers=workers,
            log_level="info",
            reload=os.getenv('AI_SERVICE_ENV') == 'development'
        )
        
    except Exception as e:
        logger.error(f"Failed to start AI service: {str(e)}")
        raise

if __name__ == "__main__":
    main()