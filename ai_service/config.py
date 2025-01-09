import os
from pathlib import Path
from typing import List

class AIServiceConfig:
    def __init__(self):
        # Service Configuration
        self.HOST = os.getenv('AI_SERVICE_HOST', '0.0.0.0')
        self.PORT = int(os.getenv('AI_SERVICE_PORT', '8000'))
        self.WORKERS = int(os.getenv('AI_SERVICE_WORKERS', '1'))
        self.ENV = os.getenv('AI_SERVICE_ENV', 'development')
        
        # Model Configuration
        self.TF_INTER_OP_THREADS = int(os.getenv('TF_INTER_OP_THREADS', '2'))
        self.TF_INTRA_OP_THREADS = int(os.getenv('TF_INTRA_OP_THREADS', '4'))
        self.MODEL_CACHE_SIZE = int(os.getenv('MODEL_CACHE_SIZE', '10'))
        self.SEQUENCE_LENGTH = int(os.getenv('SEQUENCE_LENGTH', '60'))
        self.PREDICTION_WINDOW = int(os.getenv('PREDICTION_WINDOW', '7'))
        
        # Redis Configuration
        self.REDIS_HOST = os.getenv('REDIS_HOST', 'localhost')
        self.REDIS_PORT = int(os.getenv('REDIS_PORT', '6379'))
        self.REDIS_DB = int(os.getenv('REDIS_DB', '0'))
        self.REDIS_CACHE_TTL = int(os.getenv('REDIS_CACHE_TTL', '300'))
        
        # LSTM Model Configuration
        self.LSTM_LAYERS = int(os.getenv('LSTM_LAYERS', '2'))
        self.LSTM_UNITS = int(os.getenv('LSTM_UNITS', '50'))
        self.LSTM_DROPOUT = float(os.getenv('LSTM_DROPOUT', '0.2'))
        self.LEARNING_RATE = float(os.getenv('LEARNING_RATE', '0.001'))
        self.BATCH_SIZE = int(os.getenv('BATCH_SIZE', '32'))
        self.EPOCHS = int(os.getenv('EPOCHS', '50'))
        self.VALIDATION_SPLIT = float(os.getenv('VALIDATION_SPLIT', '0.2'))
        
        # Data Pipeline Configuration
        self.DATA_VALIDATION_ENABLED = os.getenv('DATA_VALIDATION_ENABLED', 'true').lower() == 'true'
        self.OUTLIER_THRESHOLD = float(os.getenv('OUTLIER_THRESHOLD', '3.0'))
        self.CACHE_ENABLED = os.getenv('CACHE_ENABLED', 'true').lower() == 'true'
        self.MAX_RETRIES = int(os.getenv('MAX_RETRIES', '3'))
        self.RETRY_DELAY = int(os.getenv('RETRY_DELAY', '1000'))
        
        # Monitoring Configuration
        self.ENABLE_PROMETHEUS = os.getenv('ENABLE_PROMETHEUS', 'true').lower() == 'true'
        self.PROMETHEUS_PORT = int(os.getenv('PROMETHEUS_PORT', '9090'))
        self.LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
        self.MAX_LOG_SIZE = int(os.getenv('MAX_LOG_SIZE', '10485760'))
        self.LOG_BACKUP_COUNT = int(os.getenv('LOG_BACKUP_COUNT', '5'))
        
        # Performance Optimization
        self.USE_GPU = os.getenv('USE_GPU', 'true').lower() == 'true'
        self.ENABLE_MIXED_PRECISION = os.getenv('ENABLE_MIXED_PRECISION', 'true').lower() == 'true'
        self.ENABLE_XLA = os.getenv('ENABLE_XLA', 'true').lower() == 'true'
        self.MEMORY_GROWTH = os.getenv('MEMORY_GROWTH', 'true').lower() == 'true'
        
        # Technical Analysis Features
        self.ENABLE_TECHNICAL_INDICATORS = os.getenv('ENABLE_TECHNICAL_INDICATORS', 'true').lower() == 'true'
        self.INCLUDE_SENTIMENT_ANALYSIS = os.getenv('INCLUDE_SENTIMENT_ANALYSIS', 'true').lower() == 'true'
        self.MARKET_CORRELATION_WINDOW = int(os.getenv('MARKET_CORRELATION_WINDOW', '30'))
        self.VOLATILITY_WINDOW = int(os.getenv('VOLATILITY_WINDOW', '22'))
        
        # API Rate Limiting
        self.RATE_LIMIT_ENABLED = os.getenv('RATE_LIMIT_ENABLED', 'true').lower() == 'true'
        self.RATE_LIMIT_REQUESTS = int(os.getenv('RATE_LIMIT_REQUESTS', '100'))
        self.RATE_LIMIT_WINDOW = int(os.getenv('RATE_LIMIT_WINDOW', '60'))
        
        # Security
        self.ENABLE_API_KEY_AUTH = os.getenv('ENABLE_API_KEY_AUTH', 'false').lower() == 'true'
        self.API_KEY_HEADER = os.getenv('API_KEY_HEADER', 'X-API-Key')
        
        # CORS Configuration
        allowed_origins = os.getenv('ALLOWED_ORIGINS')
        self.ALLOWED_ORIGINS: List[str] = allowed_origins.split(',') if allowed_origins else [
            'http://localhost:3000',
            'http://localhost:5000'
        ]
        
        # Paths
        self.BASE_DIR = Path(__file__).parent
        self.MODELS_DIR = self.BASE_DIR / 'models'
        self.LOGS_DIR = self.BASE_DIR / 'logs'
        
        # Initialize directories
        self.setup_directories()
    
    def setup_directories(self):
        """Create necessary directories if they don't exist"""
        self.MODELS_DIR.mkdir(exist_ok=True)
        self.LOGS_DIR.mkdir(exist_ok=True)
    
    def get_model_path(self, symbol: str) -> Path:
        """Get the path for a model's saved files"""
        return self.MODELS_DIR / symbol
    
    def get_log_path(self) -> Path:
        """Get the path for the log file"""
        return self.LOGS_DIR / 'ai_service.log'
    
    @property
    def is_development(self) -> bool:
        """Check if running in development mode"""
        return self.ENV.lower() == 'development'
    
    @property
    def redis_url(self) -> str:
        """Get Redis URL"""
        return f"redis://{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"
    
    def get_tensorflow_config(self) -> dict:
        """Get TensorFlow configuration"""
        return {
            'inter_op_parallelism_threads': self.TF_INTER_OP_THREADS,
            'intra_op_parallelism_threads': self.TF_INTRA_OP_THREADS,
            'use_gpu': self.USE_GPU,
            'enable_mixed_precision': self.ENABLE_MIXED_PRECISION,
            'enable_xla': self.ENABLE_XLA,
            'memory_growth': self.MEMORY_GROWTH
        }

# Create global config instance
config = AIServiceConfig()